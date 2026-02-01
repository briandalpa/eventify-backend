import express from 'express';
import { UserController } from '../controller/user-controller';
import { EventController } from '../controller/event-controller';

export const publicRouter = express.Router();

// User API (Public)
publicRouter.post('/api/users', UserController.register);
publicRouter.post('/api/users/login', UserController.login);

// Event API (Public)
publicRouter.get('/api/events', EventController.list);
publicRouter.get('/api/events/search', EventController.search);
publicRouter.get('/api/events/:id', EventController.getById);
