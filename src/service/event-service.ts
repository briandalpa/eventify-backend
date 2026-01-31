import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { EventStatus, User, UserRole } from '../generated/prisma/client';
import {
  CreateEventRequest,
  EventResponse,
  toEventResponse,
} from '../model/event-model';
import { EventValidation } from '../validations/event-validation';
import { Validation } from '../validations/validation';

export class EventService {
  // Create Event (ORGANIZER only)
  static async createEvent(
    user: User,
    request: CreateEventRequest,
  ): Promise<EventResponse> {
    // Check if user is organizer
    if (user.role !== UserRole.ORGANIZER) {
      throw new ResponseError(403, 'Only organizers can create events');
    }

    // Validate request
    const createRequest = Validation.validate<CreateEventRequest>(
      EventValidation.CREATE,
      request,
    );

    // Verifiy category exists
    const category = await prisma.category.findUnique({
      where: {
        id: createRequest.categoryId,
      },
    });
    if (!category) {
      throw new ResponseError(404, 'Category not found');
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: createRequest.locationId },
    });
    if (!location) {
      throw new ResponseError(404, 'Location not found');
    }

    // Create event with ticket tiers in transaction
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: createRequest.title,
          description: createRequest.description,
          shortDescription: createRequest.shortDescription,
          coverImage: createRequest.coverImage,
          images: createRequest.images || [],
          categoryId: createRequest.categoryId,
          locationId: createRequest.locationId,
          venue: createRequest.venue,
          date: createRequest.date,
          endDate: createRequest.endDate,
          organizerId: user.id,
          isFree: createRequest.isFree,
          status: EventStatus.PUBLISHED,
        },
      });

      // Create ticket tiers
      for (const tier of createRequest.ticketTiers) {
        await tx.ticketTier.create({
          data: {
            eventId: newEvent.id,
            name: tier.name,
            description: tier.description,
            price: tier.price,
            quantity: tier.quantity,
            benefits: tier.benefits || [],
          },
        });
      }

      return newEvent;
    });

    // Fetch event with ticket tiers
    const eventWithTiers = await prisma.event.findUnique({
      where: { id: event.id },
      include: { ticketTiers: true },
    });

    return toEventResponse(eventWithTiers!);
  }
}
