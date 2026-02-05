import { NextFunction, Response } from 'express';
import { UserRequest } from '../types/user-request';
import { DashboardService } from '../service/dashboard-service';

export class DashboardController {
  // Get overall stats (GET /api/dashboard/stats)
  static async getStats(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const response = await DashboardService.getOverallStats(req.user!);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get revenue by period (GET /api/dashboard/revenue)
  static async getRevenue(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const period = (req.query.period as 'day' | 'month' | 'year') || 'month';
      const dateStr = req.query.date as string | undefined;
      const date = dateStr ? new Date(dateStr) : new Date();

      const response = await DashboardService.getRevenueByPeriod(
        req.user!,
        period,
        date,
      );
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
