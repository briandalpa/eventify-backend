import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { EventStatus, User, UserRole } from '../generated/prisma/client';
import {
  CreateEventRequest,
  EventResponse,
  UpdateEventRequest,
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

  // Update event (ORGANIZER, own events only)
  static async updateEvent(
    user: User,
    eventId: string,
    request: UpdateEventRequest,
  ): Promise<EventResponse> {
    // Validate request
    const updateRequest = Validation.validate<UpdateEventRequest>(
      EventValidation.UPDATE,
      request,
    );

    // Get event and verify ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTiers: true },
    });

    if (!event) {
      throw new ResponseError(404, 'Event not found');
    }

    if (event.organizerId !== user.id) {
      throw new ResponseError(403, 'You can only update your own events');
    }

    // Cannot update completed or cancelled events
    if (
      event.status === EventStatus.COMPLETED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new ResponseError(409, `Cannot update ${event.status} events`);
    }

    // Verify category if provided
    if (updateRequest.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updateRequest.categoryId },
      });
      if (!category) {
        throw new ResponseError(404, 'Category not found');
      }
    }

    // Verify location if provided
    if (updateRequest.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: updateRequest.locationId },
      });
      if (!location) {
        throw new ResponseError(404, 'Location not found');
      }
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: updateRequest.title || event.title,
        description: updateRequest.description || event.description,
        shortDescription:
          updateRequest.shortDescription !== undefined
            ? updateRequest.shortDescription
            : event.shortDescription,
        coverImage: updateRequest.coverImage || event.coverImage,
        images: updateRequest.images || event.images,
        categoryId: updateRequest.categoryId || event.categoryId,
        locationId: updateRequest.locationId || event.locationId,
        venue: updateRequest.venue || event.venue,
        date: updateRequest.date || event.date,
        endDate:
          updateRequest.endDate !== undefined
            ? updateRequest.endDate
            : event.endDate,
        isFree:
          updateRequest.isFree !== undefined
            ? updateRequest.isFree
            : event.isFree,
      },
      include: { ticketTiers: true },
    });

    return toEventResponse(updatedEvent);
  }
}
