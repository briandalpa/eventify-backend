import express from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { UserController } from '../controller/user-controller';
import { EventController } from '../controller/event-controller';
import { ReviewController } from '../controller/review-controller';
import { CouponController } from '../controller/coupon-controller';
import { TransactionController } from '../controller/transaction-controller';

export const apiRouter = express.Router();
apiRouter.use(authMiddleware);

// User API
apiRouter.get('/api/users/current', UserController.get);
apiRouter.patch('/api/users/current', UserController.update);
apiRouter.delete('/api/users/current', UserController.logout);

// Event API
apiRouter.post('/api/events', EventController.create);
apiRouter.patch('/api/events/:id', EventController.update);
apiRouter.delete('/api/events/:id', EventController.delete);
apiRouter.get('/api/organizer/events', EventController.getOrganizerEvents);

// Transaction API
apiRouter.post('/api/transactions', TransactionController.create);

// Review API
apiRouter.post('/api/reviews', ReviewController.create);
apiRouter.delete('/api/reviews/:id', ReviewController.delete);
apiRouter.get('/api/organizer/reviews', ReviewController.getOrganizerReviews);

// Coupon API
apiRouter.post('/api/coupons', CouponController.create);
apiRouter.post('/api/coupons/validate', CouponController.validate);
apiRouter.patch('/api/coupons/:id', CouponController.update);
apiRouter.delete('/api/coupons/:id', CouponController.delete);
