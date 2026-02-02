import { z, ZodType } from 'zod';
import {
  CreateEventRequest,
  EventFilterRequest,
  TicketTierRequest,
  UpdateEventRequest,
} from '../model/event-model';
import { EventStatus } from '../generated/prisma/enums';

export class EventValidation {
  static readonly TICKET_TIER: ZodType<TicketTierRequest> = z.object({
    name: z.string().min(1, 'Tier name is required').max(100),
    description: z.string().min(1, 'Description is required').max(500),
    price: z.number().min(0, 'Price must be >= 0').int(),
    quantity: z.number().min(1, 'Quantity must be at least 1').int(),
    benefits: z.array(z.string()).optional(),
  });

  static readonly CREATE: ZodType<CreateEventRequest> = z
    .object({
      title: z.string().min(3, 'Title must be at least 3 characters').max(200),
      description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(5000),
      shortDescription: z.string().max(200).optional(),
      coverImage: z.url(),
      images: z.array(z.url('Invalid cover URL')).optional(),
      categoryId: z.string().min(1, 'Category is required'),
      locationId: z.string().min(1, 'Location is required'),
      venue: z.string().min(1, 'Venue is required').max(300),
      date: z.coerce
        .date()
        .refine((d) => d > new Date(), 'Event date must be in the future'),
      endDate: z.coerce.date().optional(),
      isFree: z.boolean(),
      ticketTiers: z
        .array(EventValidation.TICKET_TIER)
        .min(1, 'At least one ticket tier is required'),
    })
    .refine(
      (data) => {
        if (data.endDate) {
          return data.endDate > data.date;
        }
        return true;
      },
      { message: 'End date must be after start date', path: ['endDate'] },
    )
    .refine(
      (data) => {
        if (data.isFree) {
          return data.ticketTiers.every((tier) => tier.price === 0);
        }
        return true;
      },
      {
        message: 'Free events must have price 0 for all tiers',
        path: ['ticketTiers'],
      },
    );

  static readonly UPDATE: ZodType<UpdateEventRequest> = z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200)
      .optional(),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(5000)
      .optional(),
    shortDescription: z.string().max(200).optional(),
    coverImage: z.url().optional(),
    images: z.array(z.url('Invalid cover URL')).optional(),
    categoryId: z.string().min(1, 'Category is required').optional(),
    locationId: z.string().min(1, 'Location is required').optional(),
    venue: z.string().min(1, 'Venue is required').max(300).optional(),
    date: z.coerce
      .date()
      .refine((d) => d > new Date(), 'Event date must be in the future')
      .optional(),
    endDate: z.coerce.date().optional(),
    isFree: z.boolean().optional(),
  });

  static readonly FILTER: ZodType<EventFilterRequest> = z.object({
    category: z.string().optional(),
    location: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    isFree: z.boolean().optional(),
    status: z.enum(EventStatus).optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });
}
