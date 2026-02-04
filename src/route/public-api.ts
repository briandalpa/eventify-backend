import express from 'express';
import { UserController } from '../controller/user-controller';
import { EventController } from '../controller/event-controller';
import { ReviewController } from '../controller/review-controller';
import { CouponController } from '../controller/coupon-controller';
import { CategoryController } from '../controller/category-controller';
import { LocationController } from '../controller/location-controller';

export const publicRouter = express.Router();

// User API (Public)
publicRouter.post('/api/users', UserController.register);
publicRouter.post('/api/users/login', UserController.login);

// Event API (Public)
publicRouter.get('/api/events', EventController.list);
publicRouter.get('/api/events/search', EventController.search);
publicRouter.get('/api/events/:id', EventController.getById);

// Review API (Public)
publicRouter.get(
  '/api/events/:eventId/reviews',
  ReviewController.getEventReviews,
);

// Coupon API (Public)
publicRouter.get('/api/coupons', CouponController.list);

// Category and Location API (Public)
publicRouter.get('/api/categories', CategoryController.list);
publicRouter.get('/api/locations', LocationController.list);
