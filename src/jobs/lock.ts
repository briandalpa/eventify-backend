import { logger } from '../application/logging';

const locks = new Map<string, boolean>();

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  if (locks.get(key)) {
    logger.warn(`Job ${key} is already running, skipping...`);
    return null;
  }

  locks.set(key, true);
  try {
    return await fn();
  } finally {
    locks.delete(key);
  }
}
