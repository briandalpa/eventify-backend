import { Request, Response, NextFunction } from 'express';
import { UserRequest } from '../types/user-request';
import { Validation } from '../validations/validation';
import { CreateEventRequest, UpdateEventRequest } from '../model/event-model';
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
}
