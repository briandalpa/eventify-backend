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
}
