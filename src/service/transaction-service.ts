import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { TransactionStatus, User, UserRole } from '../generated/prisma/client';
import {
  CreateTransactionRequest,
  PaymentProofRequest,
  toTransactionResponse,
  TransactionResponse,
} from '../model/transaction-model';
import { isPendingTransaction } from '../utils/transaction';
import { TransactionValidation } from '../validations/transaction-validation';
import { Validation } from '../validations/validation';

export class TransactionService {
  // Create transaction
  static async createTransaction(
    user: User,
    request: CreateTransactionRequest,
  ): Promise<TransactionResponse> {
    // Validate request
    const createRequest = Validation.validate<CreateTransactionRequest>(
      TransactionValidation.CREATE,
      request,
    );

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: createRequest.eventId },
    });

    if (!event) {
      throw new ResponseError(404, 'Event not found');
    }

    // Verify ticket tier exists and belongs to event
    const ticketTier = await prisma.ticketTier.findUnique({
      where: { id: createRequest.ticketTierId },
    });

    if (!ticketTier || ticketTier.eventId !== createRequest.eventId) {
      throw new ResponseError(404, 'Ticket tier not found');
    }

    // Check seat availability
    const availableSeats = ticketTier.quantity - ticketTier.sold;
    if (availableSeats < createRequest.quantity) {
      throw new ResponseError(409, `Only ${availableSeats} seats available`);
    }

    // Validate points balance
    if (createRequest.pointsUsed && createRequest.pointsUsed > 0) {
      if (user.points < createRequest.pointsUsed) {
        throw new ResponseError(400, 'Insufficient points balance');
      }
    }

    // Validate and apply coupon if provided
    let coupon = null;
    let discountAmount = 0;

    if (createRequest.couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: createRequest.couponCode },
      });

      if (!coupon) {
        throw new ResponseError(404, 'Coupon not found');
      }

      // Validate coupon
      const now = new Date();
      if (coupon.validUntil < now) {
        throw new ResponseError(400, 'Coupon has expired');
      }

      if (!coupon.isActive || coupon.usedCount >= coupon.usageLimit) {
        throw new ResponseError(400, 'Coupon is not available');
      }

      // Event-specific coupon validation
      if (coupon.eventId && coupon.eventId !== createRequest.eventId) {
        throw new ResponseError(400, 'This coupon is not valid for this event');
      }

      // Calculate discount
      const baseAmount = ticketTier.price * createRequest.quantity;
      discountAmount = this.calculateDiscount(coupon, baseAmount);
    }

    // Calculate total amount
    const baseAmount = ticketTier.price * createRequest.quantity;
    const pointsUsed = createRequest.pointsUsed || 0;
    const totalAmount = Math.max(0, baseAmount - discountAmount - pointsUsed);

    // Create transaction and update seat count in atomic operation
    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction
      const newTransaction = await tx.transaction.create({
        data: {
          userId: user.id,
          eventId: createRequest.eventId,
          ticketTierId: createRequest.ticketTierId,
          quantity: createRequest.quantity,
          totalAmount,
          discountAmount,
          pointsUsed,
          status: TransactionStatus.WAITING_PAYMENT,
          couponId: coupon?.id,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        },
      });

      // Update seat count
      await tx.ticketTier.update({
        where: { id: createRequest.ticketTierId },
        data: {
          sold: { increment: createRequest.quantity },
        },
      });

      // Deduct points from user
      if (pointsUsed > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            points: { decrement: pointsUsed },
          },
        });
      }

      // Increment coupon usage
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }

      return newTransaction;
    });

    return toTransactionResponse(transaction);
  }

  // Upload payment proof
  static async uploadPaymentProof(
    user: User,
    transactionId: string,
    request: PaymentProofRequest,
  ): Promise<TransactionResponse> {
    const validateRequest = Validation.validate<PaymentProofRequest>(
      TransactionValidation.PAYMENT_PROOF,
      request,
    );

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new ResponseError(404, 'Transaction not found');
    }

    if (transaction.userId !== user.id) {
      throw new ResponseError(
        403,
        'You can only upload proof for your own transactions',
      );
    }

    if (transaction.status !== TransactionStatus.WAITING_PAYMENT) {
      throw new ResponseError(
        409,
        'Payment proof can only be uploaded for transactions awaiting payment',
      );
    }

    // Update transaction status to waiting for confirmation
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.WAITING_CONFIRMATION,
        // Note: In a real app, you'd store the proofUrl somewhere
      },
    });

    return toTransactionResponse(updated);
  }

  // Accept transaction (ORGANIZER)
  static async acceptTransaction(
    user: User,
    transactionId: string,
  ): Promise<TransactionResponse> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ResponseError(403, 'Only organizers can accept transactions');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { event: true },
    });

    if (!transaction) {
      throw new ResponseError(404, 'Transaction not found');
    }

    if (transaction.event.organizerId !== user.id) {
      throw new ResponseError(
        403,
        'You can only accept transactions for your own events',
      );
    }

    if (transaction.status !== TransactionStatus.WAITING_CONFIRMATION) {
      throw new ResponseError(
        409,
        'Only transactions awaiting confirmation can be accepted',
      );
    }

    // Update transaction status
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.DONE,
        expiresAt: null,
      },
    });

    // TODO: Send email notification to user

    return toTransactionResponse(updated);
  }

  // Reject transaction (ORGANIZER)
  static async rejectTransaction(
    user: User,
    transactionId: string,
  ): Promise<TransactionResponse> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ResponseError(403, 'Only organizers can reject transactions');
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { event: true },
    });

    if (!transaction) {
      throw new ResponseError(404, 'Transaction not found');
    }

    if (transaction.event.organizerId !== user.id) {
      throw new ResponseError(
        403,
        'You can only reject transactions for your own events',
      );
    }

    if (!isPendingTransaction(transaction.status)) {
      throw new ResponseError(409, 'Only pending transactions can be rejected');
    }

    // Rollback in atomic operation
    const updated = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const result = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          expiresAt: null,
        },
      });

      // Restore seats
      await tx.ticketTier.update({
        where: { id: transaction.ticketTierId },
        data: {
          sold: { decrement: transaction.quantity },
        },
      });

      // Refund points
      if (transaction.pointsUsed > 0) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            points: { increment: transaction.pointsUsed },
          },
        });
      }

      // Refund coupon usage
      if (transaction.couponId) {
        await tx.coupon.update({
          where: { id: transaction.couponId },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      return result;
    });

    // TODO: Send email notification to user

    return toTransactionResponse(updated);
  }

  // Cancel transaction (CUSTOMER)
  static async cancelTransaction(
    user: User,
    transactionId: string,
  ): Promise<TransactionResponse> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new ResponseError(404, 'Transaction not found');
    }

    if (transaction.userId !== user.id) {
      throw new ResponseError(403, 'You can only cancel your own transactions');
    }

    if (!isPendingTransaction(transaction.status)) {
      throw new ResponseError(
        409,
        'Only pending transactions can be cancelled',
      );
    }

    // Rollback in atomic operation
    const updated = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const result = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.CANCELED,
          expiresAt: null,
        },
      });

      // Restore seats
      await tx.ticketTier.update({
        where: { id: transaction.ticketTierId },
        data: {
          sold: { decrement: transaction.quantity },
        },
      });

      // Refund points
      if (transaction.pointsUsed > 0) {
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            points: { increment: transaction.pointsUsed },
          },
        });
      }

      // Refund coupon usage
      if (transaction.couponId) {
        await tx.coupon.update({
          where: { id: transaction.couponId },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      return result;
    });

    return toTransactionResponse(updated);
  }

  // Helper: Calculate discount
  private static calculateDiscount(coupon: any, baseAmount: number): number {
    if (baseAmount < coupon.minPurchase) {
      return 0;
    }

    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (baseAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'FIXED') {
      discount = coupon.discountValue;
    }

    return Math.min(discount, baseAmount);
  }
}
