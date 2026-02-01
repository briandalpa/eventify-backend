import { Request, Response, NextFunction } from 'express';
import { UserRequest } from '../types/user-request';
import { Validation } from '../validations/validation';
import {
  CreateEventRequest,
  EventFilterRequest,
  UpdateEventRequest,
} from '../model/event-model';
import { EventValidation } from '../validations/event-validation';
import { EventService } from '../service/event-service';

export class EventController {
  // Create event (POST /api/events)
  static async create(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request = Validation.validate<CreateEventRequest>(
        EventValidation.CREATE,
        req.body,
      );
      const response = await EventService.createEvent(req.user!, request);
      res.status(201).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  //  Get event by ID (GET /api/events/:id)
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const response = await EventService.getEventById(id);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // List events (GET /api/events)
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = Validation.validate<EventFilterRequest>(
        EventValidation.FILTER,
        req.query,
      );
      const response = await EventService.listEvents(filters);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Search events (GET /api/events/search)
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          errors: 'Search query is required',
        });
      }

      const filters = req.query as EventFilterRequest;
      const response = await EventService.searchEvents(q, filters);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update event (PATCH /api/events/:id)
  static async update(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = Validation.validate<UpdateEventRequest>(
        EventValidation.UPDATE,
        req.body,
      );
      const response = await EventService.updateEvent(req.user!, id, request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get organizer's events (GET /api/organizer/events)
  static async getOrganizerEvents(
    req: UserRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const response = await EventService.getOrganizerEvents(req.user!);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
