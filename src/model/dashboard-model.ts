export type DashboardStatsResponse = {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  upcomingEvents: number;
  completedEvents: number;
  pendingTransactions: number;
};

export type RevenueByPeriodResponse = {
  periods: {
    period: string;
    revenue: number;
    ticketsSold: number;
    transactionCount: number;
  }[];
};

export type EventPerformanceResponse = {
  events: {
    eventId: string;
    eventName: string;
    totalRevenue: number;
    ticketsSold: number;
    capacity: number;
    attendanceRate: number;
    averageRating: number;
  }[];
};
