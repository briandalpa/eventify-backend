import { prisma } from '../application/database';
import { logger } from '../application/logging';

export async function expireUserPoints(): Promise<void> {
  try {
    const now = new Date();

    // Find expired points
    const expiredPoints = await prisma.userPoint.findMany({
      where: {
        expiresAt: { lt: now },
      },
      select: { id: true, userId: true, amount: true },
    });

    logger.info(`Found ${expiredPoints.length} expired user points`);

    if (expiredPoints.length === 0) {
      return;
    }

    // Group by userId for batch processing
    const expiredPointsByUser = expiredPoints.reduce(
      (acc, point) => {
        if (!acc[point.userId]) {
          acc[point.userId] = [];
        }
        acc[point.userId].push(point);
        return acc;
      },
      {} as Record<string, typeof expiredPoints>,
    );

    // Process each user's expired points
    for (const [userId, userPoints] of Object.entries(expiredPointsByUser)) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete all expired points for this user
          await tx.userPoint.deleteMany({
            where: {
              id: { in: userPoints.map((p) => p.id) },
            },
          });

          // Get remaining active points
          const activePoints = await tx.userPoint.findMany({
            where: {
              userId,
              expiresAt: { gte: now },
            },
            select: { amount: true },
          });

          const totalActivePoints = activePoints.reduce(
            (sum, p) => sum + p.amount,
            0,
          );

          // Update user points balance
          await tx.user.update({
            where: { id: userId },
            data: {
              points: totalActivePoints,
            },
          });
        });

        logger.info(`Expired ${userPoints.length} points for user: ${userId}`);
      } catch (error) {
        logger.error(`Failed to expire points for user ${userId}: ${error}`);
      }
    }

    logger.info('Point expiry job completed successfully');
  } catch (error) {
    logger.error(`Error in expireUserPoints job: ${error}`);
  }
}
