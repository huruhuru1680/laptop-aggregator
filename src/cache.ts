import Redis from 'ioredis';
import { logger } from './utils/logger';

const CACHE_TTL_SECONDS = 60;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  logger.warn('Cache connection error', { error: err.message });
});

redis.on('connect', () => {
  logger.info('Cache client connected');
});

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.warn('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  },

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, value);
    } catch (error) {
      logger.warn('Cache setex error', { key, error: (error as Error).message });
    }
  },

  async del(...keys: string[]): Promise<void> {
    try {
      await redis.del(...keys);
    } catch (error) {
      logger.warn('Cache del error', { key: keys, error: (error as Error).message });
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.warn('Cache keys error', { pattern, error: (error as Error).message });
      return [];
    }
  },

  async clearLaptopCache(): Promise<void> {
    try {
      const keys = await redis.keys('laptops:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Cleared ${keys.length} laptop cache entries`);
      }
    } catch (error) {
      logger.warn('Failed to clear laptop cache', { error: (error as Error).message });
    }
  },
};

export { CACHE_TTL_SECONDS, redis as redisClient };
