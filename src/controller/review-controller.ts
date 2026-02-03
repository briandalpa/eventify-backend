import { Request, Response, NextFunction } from 'express';
import { UserRequest } from '../types/user-request';
import { Validation } from '../validations/validation';
import { CreateReviewRequest } from '../model/review-model';
import { ReviewValidation } from '../validations/review-validation';
import { ReviewService } from '../service/review-service';

export class ReviewController {
  // Create review ('POST /api/reviews)
  static async create(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request = Validation.validate<CreateReviewRequest>(
        ReviewValidation.CREATE,
        req.body,
      );
      const response = await ReviewService.createReview(req.user!, request);
      res.status(201).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get event reviews ('GET /api/events/:eventId/reviews)
  static async getEventReviews(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { eventId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const response = await ReviewService.getEventReviews(
        eventId,
        page,
        limit,
      );
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get organizer's reviews (GET /api/organizer/reviews)
  static async getOrganizerReviews(
    req: UserRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const response = await ReviewService.getOrganizerReviews(
        req.user!,
        page,
        limit,
      );
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete review (DELETE /api/reviews/:id)
  static async delete(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ReviewService.deleteReview(req.user!, id);
      res.status(200).json({
        data: 'OK',
      });
    } catch (error) {
      next(error);
    }
  }
}
