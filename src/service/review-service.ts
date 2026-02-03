import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { TransactionStatus, User } from '../generated/prisma/client';
import {
  CreateReviewRequest,
  EventReviewsResponse,
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

  // Get event reviews
  static async getEventReviews(
    eventId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<EventReviewsResponse> {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new ResponseError(404, 'Event not found');
    }

    const skip = (page - 1) * limit;

    // Get reviews and total count
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { eventId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: { eventId },
      }),
    ]);

    return {
      reviews: reviews.map((r) => toReviewResponse(r)),
      averageRating: event.averageRating,
      totalReviews: event.totalReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get organizer's reviews (reviews for their events)
  static async getOrganizerReviews(
    user: User,
    page: number = 1,
    limit: number = 10,
  ): Promise<EventReviewsResponse> {
    const skip = (page - 1) * limit;

    // Get reviews for organizer's events
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          event: {
            organizerId: user.id,
          },
        },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          event: {
            organizerId: user.id,
          },
        },
      }),
    ]);

    return {
      reviews: reviews.map((r) => toReviewResponse(r)),
      averageRating: 0,
      totalReviews: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
