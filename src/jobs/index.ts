import cron from 'node-cron';
import { logger } from '../application/logging';
import { withLock } from './lock';
import {
  autoCancelTransactions,
  expireTransactions,
} from './transaction-expiry.job';
import { expireUserPoints } from './point-expiry.job';

const jobs: ReturnType<typeof cron.schedule>[] = [];

export function startBackgroundJobs(): void {
  logger.info('Initializing cron jobs...');

  // Transaction expiry: Every minute
  jobs.push(
    cron.schedule(
      '* * * * *',
      async () => {
        logger.info('[CRON] Running expireTransactions');
        await withLock('expireTransactions', expireTransactions);
      },
      { timezone: 'Asia/Jakarta' },
    ),
  );

  // Transaction auto cancel: Every hour
  jobs.push(
    cron.schedule(
      '0 * * * *',
      async () => {
        logger.info('[CRON] Running autoCancelTransactions');
        await withLock('autoCancelTransactions', autoCancelTransactions);
      },
      { timezone: 'Asia/Jakarta' },
    ),
  );

  // Point expiry: Daily at 2:00 AM
  jobs.push(
    cron.schedule(
      '0 2 * * *',
      async () => {
        logger.info('[CRON] Running expireUserPoints');
        await withLock('expireUserPoints', expireUserPoints);
      },
      { timezone: 'Asia/Jakarta' },
    ),
  );

  logger.info('Cron jobs initialized successfully');
}

export function stopBackgroundJobs(): void {
  logger.info('Stopping cron jobs...');
  jobs.forEach((job) => job.stop());
  logger.info('All cron jobs stopped');
}
