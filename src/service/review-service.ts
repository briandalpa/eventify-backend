import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { TransactionStatus, User } from '../generated/prisma/client';
import {
  CreateReviewRequest,
  ReviewResponse,
  toReviewResponse,
} from '../model/review-model';
import { ReviewValidation } from '../validations/review-validation';
import { Validation } from '../validations/validation';

export class ReviewService {
  // Create review
  static async createReview(
    user: User,
    request: CreateReviewRequest,
  ): Promise<ReviewResponse> {
    // Validate request
    const createRequest = Validation.validate<CreateReviewRequest>(
      ReviewValidation.CREATE,
      request,
    );

    // Verify transaction exists and belongs to user
    const transaction = await prisma.transaction.findUnique({
      where: { id: createRequest.transactionId },
      include: { event: true },
    });

    if (!transaction) {
      throw new ResponseError(404, 'Transaction not found');
    }

    if (transaction.userId !== user.id) {
      throw new ResponseError(403, 'You can only review your own transactions');
    }

    // Verify transaction is completed
    if (transaction.status !== TransactionStatus.DONE) {
      throw new ResponseError(
        400,
        'Only completed transactions can be reviewed',
      );
    }

    // Verify event date has passed
    const now = new Date();
    if (transaction.event.date > now) {
      throw new ResponseError(400, 'Event has not occurred yet');
    }

    // Create review and update event rating in transaction
    try {
      const review = await prisma.$transaction(async (tx) => {
        // Create review
        const newReview = await tx.review.create({
          data: {
            userId: user.id,
            eventId: transaction.eventId,
            transactionId: createRequest.transactionId,
            rating: createRequest.rating,
            comment: createRequest.comment,
          },
          include: { user: { select: { name: true } } },
        });

        // Get all reviews for this event
        const allReviews = await tx.review.findMany({
          where: { eventId: transaction.eventId },
          select: { rating: true },
        });

        // Calculate new average rating
        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / allReviews.length;

        // Update event with new rating
        await tx.event.update({
          where: { id: transaction.eventId },
          data: {
            averageRating,
            totalReviews: allReviews.length,
          },
        });

        return newReview;
      });

      return toReviewResponse(review);
    } catch (error) {
      throw new ResponseError(
        409,
        'Review already exists for this transaction',
      );
    }
  }
}
