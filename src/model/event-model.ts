import { Event, TicketTier } from '../generated/prisma/client';
import { EventStatus } from '../generated/prisma/enums';

export type TicketTierRequest = {
  name: string;
  description: string;
  price: number;
  quantity: number;
  benefits?: string[];
};

export type TicketTierResponse = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sold: number;
  benefits: string[];
};

export type CreateEventRequest = {
  title: string;
  description: string;
  shortDescription?: string;
  coverImage: string;
  images?: string[];
  categoryId: string;
  locationId: string;
  venue: string;
  date: Date | string;
  endDate?: Date | string;
  isFree: boolean;
  ticketTiers: TicketTierRequest[];
};

export type UpdateEventRequest = {
  title?: string;
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  images?: string[];
  categoryId?: string;
  locationId?: string;
  venue?: string;
  date?: Date | string;
  endDate?: Date | string;
  isFree?: boolean;
};

export type EventFilterRequest = {
  category?: string;
  location?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  isFree?: boolean;
  status?: EventStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type EventResponse = {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  coverImage: string;
  images: string[];
  categoryId: string;
  locationId: string;
  venue: string;
  date: Date;
  endDate?: Date;
  organizerId: string;
  isFree: boolean;
  status: EventStatus;
  averageRating: number;
  totalReviews: number;
  ticketTiers: TicketTierResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedEventResponse = {
  data: EventResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function toTicketTierResponse(tier: TicketTier): TicketTierResponse {
  return {
    id: tier.id,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    quantity: tier.quantity,
    sold: tier.sold,
    benefits: tier.benefits,
  };
}

export function toEventResponse(
  event: Event & { ticketTiers?: TicketTier[] },
): EventResponse {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    shortDescription: event.shortDescription || undefined,
    coverImage: event.coverImage,
    images: event.images,
    categoryId: event.categoryId,
    locationId: event.locationId,
    venue: event.venue,
    date: event.date,
    endDate: event.endDate || undefined,
    organizerId: event.organizerId,
    isFree: event.isFree,
    status: event.status,
    averageRating: event.averageRating,
    totalReviews: event.totalReviews,
    ticketTiers: event.ticketTiers
      ? event.ticketTiers.map((tier) => toTicketTierResponse(tier))
      : [],
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}
