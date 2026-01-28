import { Router } from 'express';

const router = Router();

// Placeholder for future route imports
// import eventRoutes from '../features/events/events.controller';
// import transactionRoutes from '../features/transactions/transactions.controller';
// import userRoutes from '../features/users/users.controller';

// API version prefix
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Eventify API v1',
    version: '1.0.0',
    endpoints: {
      events: '/api/events',
      transactions: '/api/transactions',
      users: '/api/users',
    },
  });
});

// Mount feature routes (will be uncommented as we build them)
// router.use('/events', eventRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/users', userRoutes);

export default router;
