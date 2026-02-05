import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { User } from '../generated/prisma/client';
import {
  EventStatus,
  TransactionStatus,
  UserRole,
} from '../generated/prisma/enums';
import { DashboardStatsResponse } from '../model/dashboard-model';

export class DashboardService {
  // Get overall stats
  static async getOverallStats(user: User): Promise<DashboardStatsResponse> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ResponseError(
        403,
        'Only organizers can view dashboard statistics',
      );
    }

    const now = new Date();

    // Get stats in parallel
    const [
      totalEvents,
      upcomingEvents,
      completedEvents,
      totalTransactions,
      doneTransactions,
    ] = await Promise.all([
      prisma.event.count({
        where: { organizerId: user.id },
      }),
      prisma.event.count({
        where: {
          organizerId: user.id,
          date: { gte: now },
        },
      }),
      prisma.event.count({
        where: {
          organizerId: user.id,
          date: { lt: now },
          status: EventStatus.COMPLETED,
        },
      }),
      prisma.transaction.count({
        where: {
          event: { organizerId: user.id },
          status: {
            in: [
              TransactionStatus.WAITING_PAYMENT,
              TransactionStatus.WAITING_CONFIRMATION,
            ],
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          event: { organizerId: user.id },
          status: TransactionStatus.DONE,
        },
        select: {
          totalAmount: true,
          quantity: true,
        },
      }),
    ]);

    const totalRevenue = doneTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );
    const totalTicketsSold = doneTransactions.reduce(
      (sum, t) => sum + t.quantity,
      0,
    );

    return {
      totalEvents,
      totalRevenue,
      totalTicketsSold,
      upcomingEvents,
      completedEvents,
      pendingTransactions: totalTransactions,
    };
  }
}
