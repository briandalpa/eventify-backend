import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { User } from '../generated/prisma/client';
import {
  EventStatus,
  TransactionStatus,
  UserRole,
} from '../generated/prisma/enums';
import {
  DashboardStatsResponse,
  RevenueByPeriodResponse,
} from '../model/dashboard-model';

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

  // Get revenue by period
  static async getRevenueByPeriod(
    user: User,
    period: 'day' | 'month' | 'year',
    date: Date,
  ): Promise<RevenueByPeriodResponse> {
    if (user.role !== UserRole.ORGANIZER) {
      throw new ResponseError(
        403,
        'Only organizers can view dashboard statistics',
      );
    }

    // Get transactions for the specified period
    let startDate: Date;
    let endDate: Date;
    let dateFormat: string;

    const year = date.getFullYear();
    const month = date.getMonth();

    if (period === 'day') {
      startDate = new Date(year, month, date.getDate());
      endDate = new Date(year, month, date.getDate() + 1);
      dateFormat = 'day';
    } else if (period === 'month') {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 1);
      dateFormat = 'month';
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
      dateFormat = 'year';
    }

    // Get all DONE transactions for the period
    const transactions = await prisma.transaction.findMany({
      where: {
        event: { organizerId: user.id },
        status: TransactionStatus.DONE,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        totalAmount: true,
        quantity: true,
        createdAt: true,
      },
    });

    // Group by date/month/year
    const grouped: Record<
      string,
      { revenue: number; ticketsSold: number; count: number }
    > = {};

    for (const transaction of transactions) {
      let key: string;

      if (dateFormat === 'day') {
        const hours = transaction.createdAt.getHours();
        key = `${hours}:00`;
      } else if (dateFormat === 'month') {
        const day = transaction.createdAt.getDate();
        key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        const transMonth = transaction.createdAt.getMonth();
        key = `${year}-${String(transMonth + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, ticketsSold: 0, count: 0 };
      }

      grouped[key].revenue += transaction.totalAmount;
      grouped[key].ticketsSold += transaction.quantity;
      grouped[key].count += 1;
    }

    const periods = Object.entries(grouped).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      ticketsSold: data.ticketsSold,
      transactionCount: data.count,
    }));

    return {
      periods: periods.sort((a, b) => a.period.localeCompare(b.period)),
    };
  }
}
