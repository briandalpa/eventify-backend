import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { publicRouter } from '../route/public-api';
import { errorMiddleware } from '../middleware/error-middleware';
import { apiRouter } from '../route/api';
import { auth } from '../utils/auth';
import customAuthRouter from '../controller/custom-auth-controller';

export const app = express();

// Configure CORS middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);

app.use(express.json());

// Custom registration endpoint
app.use(customAuthRouter);

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(publicRouter);
app.use(apiRouter);

app.use(errorMiddleware);
