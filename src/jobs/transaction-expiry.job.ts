import { prisma } from '../application/database';
import { logger } from '../application/logging';
import { TransactionStatus } from '../generated/prisma/enums';

export async function expireTransactions(): Promise<void> {
  try {
    const now = new Date();

    // Find expired transactions
    const expiredTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.WAITING_PAYMENT,
        expiresAt: { lt: now },
      },
    });

    logger.info(`Found ${expiredTransactions.length} expired transactions`);

    // Process each transaction
    for (const transaction of expiredTransactions) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update status
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.EXPIRED,
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
        });

        logger.info(`Expired transaction: ${transaction.id}`);
      } catch (error) {
        logger.error(
          `Failed to expire transaction ${transaction.id}: ${error}`,
        );
      }
    }

    logger.info('Transaction expiry job completed successfully');
  } catch (error) {
    logger.error(`Error in expireTransactions job: ${error}`);
  }
}

export async function autoCancelTransactions(): Promise<void> {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Find old waiting transactions
    const oldTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.WAITING_CONFIRMATION,
        createdAt: { lt: threeDaysAgo },
      },
    });

    logger.info(
      `Found ${oldTransactions.length} old transactions for auto cancel`,
    );

    if (oldTransactions.length === 0) {
      return;
    }

    // Process each transaction
    for (const transaction of oldTransactions) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update status
          await tx.transaction.update({
            where: { id: transaction.id },
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
        });

        logger.info(`Auto cancelled transaction: ${transaction.id}`);
      } catch (error) {
        logger.error(
          `Failed to auto cancel transaction ${transaction.id}: ${error}`,
        );
      }
    }

    logger.info('Transaction auto cancel job completed successfully');
  } catch (error) {
    logger.error(`Error in autoCancelTransactions job: ${error}`);
  }
}
