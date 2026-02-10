import { Transaction, TransactionStatus } from '../generated/prisma/client';

export type CreateTransactionRequest = {
  eventId: string;
  ticketTierId: string;
  quantity: number;
  pointsUsed?: number;
  couponCode?: string;
};

export type TransactionFilterRequest = {
  status?: TransactionStatus;
  eventId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
};

export type PaymentProofRequest = {
  proofUrl: string;
};

export type TransactionResponse = {
  id: string;
  userId: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
  totalAmount: number;
  discountAmount: number;
  pointsUsed: number;
  status: TransactionStatus;
  paymentProofUrl?: string;
  couponId?: string;
  createdAt: Date;
  expiresAt?: Date;
};

export type PaginatedTransactionResponse = {
  data: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function toTransactionResponse(
  transaction: Transaction,
): TransactionResponse {
  return {
    id: transaction.id,
    userId: transaction.userId,
    eventId: transaction.eventId,
    ticketTierId: transaction.ticketTierId,
    quantity: transaction.quantity,
    totalAmount: transaction.totalAmount,
    discountAmount: transaction.discountAmount,
    pointsUsed: transaction.pointsUsed,
    status: transaction.status,
    couponId: transaction.couponId || undefined,
    createdAt: transaction.createdAt,
    expiresAt: transaction.expiresAt || undefined,
  };
}
