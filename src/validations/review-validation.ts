import { z, ZodType } from 'zod';
import { CreateReviewRequest } from '../model/review-model';

export class ReviewValidation {
  static readonly CREATE: ZodType<CreateReviewRequest> = z.object({
    transactionId: z.string().min(1, 'Transaction ID is required'),
    rating: z
      .number()
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    comment: z
      .string()
      .max(1000, 'Comment must be at most 1000 characters')
      .optional(),
  });
}
