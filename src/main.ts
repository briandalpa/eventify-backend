import { configDotenv } from 'dotenv';
import { app } from './application/app';
import { logger } from './application/logging';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs';

configDotenv();

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Listening on Port: ${PORT}`);
  startBackgroundJobs();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  stopBackgroundJobs();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopBackgroundJobs();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
