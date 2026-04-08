import { startServer } from './api/server';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10);
  const postgresUrl = process.env.POSTGRES_URL || 'postgresql://localhost:5432/laptop_aggregator';

  logger.info('Starting API server', { port, postgresUrl });

  await startServer(postgresUrl, port);

  process.on('SIGTERM', () => {
    logger.info('Shutting down API server...');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Fatal error', { error: err.message });
  process.exit(1);
});