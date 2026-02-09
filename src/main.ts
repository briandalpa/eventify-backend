import { configDotenv } from 'dotenv';
import { app } from './application/app';
import { logger } from './application/logging';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs';
import { EmailService } from './service/email-service';

configDotenv();

const PORT = process.env.PORT;

(async () => {
  try {
    await EmailService.initialize();

    const server = app.listen(PORT, () => {
      logger.info(`Listening on Port: ${PORT}`);
      startBackgroundJobs();
    });

    const shutdown = () => {
      logger.info('Shutting down...');
      stopBackgroundJobs();
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
})();
