import { Request, Response, NextFunction } from 'express';
import { LocationService } from '../service/location-service';

export class LocationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await LocationService.listLocations();
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
