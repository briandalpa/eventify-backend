import { Review } from '../generated/prisma/client';

export type CreateReviewRequest = {
  transactionId: string;
  rating: number;
  comment?: string;
};

export type ReviewResponse = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  eventId: string;
  userId: string;
  transactionId: string;
  user?: {
    name: string | null;
  };
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
  review: Review & { user?: { name: string | null } },
): ReviewResponse {
  return {
    id: review.id,
    userId: review.userId,
    eventId: review.eventId,
    transactionId: review.transactionId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    user: review.user ? { name: review.user.name } : undefined,
  };
}
