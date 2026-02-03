import { Review } from '../generated/prisma/client';

export type CreateReviewRequest = {
  transactionId: string;
  rating: number;
  comment?: string;
};

export type ReviewResponse = {
  id: string;
  userId: string;
  eventId: string;
  transactionId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  userName?: string;
};

export type EventReviewsResponse = {
  reviews: ReviewResponse[];
  averageRating: number;
  totalReviews: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function toReviewResponse(
  review: Review & { user?: { name: string } },
): ReviewResponse {
  return {
    id: review.id,
    userId: review.userId,
    eventId: review.eventId,
    transactionId: review.transactionId,
    rating: review.rating,
    comment: review.comment || undefined,
    createdAt: review.createdAt,
    userName: review.user?.name,
  };
}
