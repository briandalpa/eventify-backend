import { Response, NextFunction } from 'express';
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
}
