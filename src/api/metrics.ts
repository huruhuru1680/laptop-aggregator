import express, { Request, Response } from 'express';
import { getMetrics } from '../utils/metrics';

export function createMetricsRouter(): express.Router {
  const router = express.Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const metricsOutput = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(metricsOutput);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  return router;
}