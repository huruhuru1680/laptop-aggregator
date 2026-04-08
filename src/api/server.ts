import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { CatalogStorage } from '../storage/catalog';
import { createLaptopRouter } from './laptops';
import { redisClient } from '../cache';
import { logger } from '../utils/logger';

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || 'unknown';
  const key = `rate_limit:${ip}`;

  try {
    const multi = redisClient.multi();
    multi.incr(key);
    multi.pttl(key);

    const results = await multi.exec();
    if (!results) {
      next();
      return;
    }

    const count = results[0][1] as number;
    const ttl = results[1][1] as number;

    if (count === 1) {
      await redisClient.pexpire(key, RATE_LIMIT_WINDOW_MS);
    }

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX_REQUESTS - count));

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfterMs: ttl > 0 ? ttl : RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    next();
  } catch (error) {
    logger.warn('Rate limiting error, allowing request', { error: (error as Error).message });
    next();
  }
}

export function createServer(postgresUrl: string): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(rateLimitMiddleware);

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  const catalogStorage = new CatalogStorage(postgresUrl);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/laptops', createLaptopRouter(catalogStorage));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  return app;
}

export async function startServer(postgresUrl: string, port: number = 3000): Promise<void> {
  const app = createServer(postgresUrl);

  return new Promise((resolve) => {
    app.listen(port, () => {
      logger.info(`API server listening on port ${port}`);
      resolve();
    });
  });
}