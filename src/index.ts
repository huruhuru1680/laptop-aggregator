import 'dotenv/config';
import { ScrapeWorker, enqueueScrapeJob, scrapeQueue } from './queue/jobs';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const postgresUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/laptop_aggregator';

  const worker = new ScrapeWorker(redisUrl, postgresUrl);

  await enqueueScrapeJob({
    type: 'listing',
    source: 'amazon_in',
    identifier: 'laptops',
    page: 1,
  });

  await enqueueScrapeJob({
    type: 'listing',
    source: 'amazon_in',
    identifier: 'laptops',
    page: 2,
  });

  await enqueueScrapeJob({
    type: 'listing',
    source: 'flipkart',
    identifier: 'laptops',
    page: 1,
  });

  await enqueueScrapeJob({
    type: 'listing',
    source: 'flipkart',
    identifier: 'laptops',
    page: 2,
  });

  logger.info('Dual-source scraper service started');

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Fatal error', { error: err.message });
  process.exit(1);
});