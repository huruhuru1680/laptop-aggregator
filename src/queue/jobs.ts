import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { AmazonScraper } from '../scrapers/amazon';
import { FlipkartScraper } from '../scrapers/flipkart';
import { Normalizer } from '../normalization/normalizer';
import { RawStorage, RawListing } from '../storage/raw';
import { CatalogStorage } from '../storage/catalog';
import { cache } from '../cache';
import { logger } from '../utils/logger';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const scrapeQueue = new Queue('scrape', { connection });

export interface ScrapeJob {
  type: 'listing' | 'product';
  source: 'amazon_in' | 'flipkart';
  identifier: string;
  url?: string;
  page?: number;
}

export class ScrapeWorker {
  private worker: Worker;
  private amazonScraper: AmazonScraper;
  private flipkartScraper: FlipkartScraper;
  private normalizer: Normalizer;
  private rawStorage: RawStorage;
  private catalogStorage: CatalogStorage;

  constructor(
    redisUrl: string,
    postgresUrl: string
  ) {
    this.amazonScraper = new AmazonScraper();
    this.flipkartScraper = new FlipkartScraper();
    this.normalizer = new Normalizer();
    this.rawStorage = new RawStorage(postgresUrl);
    this.catalogStorage = new CatalogStorage(postgresUrl, async () => {
      await cache.clearLaptopCache();
    });

    this.worker = new Worker(
      'scrape',
      async (job: Job) => this.processJob(job),
      {
        connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`, { type: job.data.type });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed`, { error: err.message });
    });

    logger.info('Scrape worker initialized');
  }

  private async processJob(job: Job<ScrapeJob>): Promise<void> {
    const { type, source, identifier, page } = job.data;

    if (source === 'amazon_in') {
      if (type === 'listing') {
        await this.processAmazonListing(page || 1);
      } else if (type === 'product') {
        await this.processAmazonProduct(identifier);
      }
    } else if (source === 'flipkart') {
      if (type === 'listing') {
        await this.processFlipkartListing(page || 1);
      } else if (type === 'product') {
        await this.processFlipkartProduct(identifier);
      }
    }
  }

  private async processAmazonListing(pageNum: number): Promise<void> {
    const products = await this.amazonScraper.scrapeSearchPage('laptops', pageNum);
    logger.info(`Scraped ${products.length} products from listing page ${pageNum}`);

    for (const product of products) {
      const rawListing: RawListing = {
        source: 'amazon_in',
        source_sku: product.asin,
        url: product.url,
        raw_data: product as unknown as Record<string, unknown>,
        page_type: 'listing',
        scraped_at: new Date().toISOString(),
      };

      await this.rawStorage.store(rawListing);

      await scrapeQueue.add('scrape', {
        type: 'product',
        source: 'amazon_in',
        identifier: product.asin,
        url: product.url,
      });
    }
  }

  private async processAmazonProduct(asin: string): Promise<void> {
    const product = await this.amazonScraper.scrapeProductPage(asin);

    const rawListing: RawListing = {
      source: 'amazon_in',
      source_sku: asin,
      url: product.url,
      raw_data: product as unknown as Record<string, unknown>,
      page_type: 'product',
      scraped_at: new Date().toISOString(),
    };

    await this.rawStorage.store(rawListing);

    const normalizationResult = this.normalizer.normalizeAmazonProduct(product);
    const overallConfidence = this.normalizer.calculateOverallConfidence(normalizationResult.confidence);

    logger.info(`Normalized product ${asin}, confidence: ${overallConfidence}%`);

    if (overallConfidence >= 50) {
      await this.catalogStorage.upsert(normalizationResult.laptop);
    } else {
      logger.warn(`Low confidence for ${asin}: ${overallConfidence}%, skipping catalog upsert`);
    }
  }

  private async processFlipkartListing(pageNum: number): Promise<void> {
    const products = await this.flipkartScraper.scrapeSearchPage('laptops', pageNum);
    logger.info(`Scraped ${products.length} products from Flipkart listing page ${pageNum}`);

    for (const product of products) {
      const rawListing: RawListing = {
        source: 'flipkart',
        source_sku: product.pid,
        url: product.url,
        raw_data: product as unknown as Record<string, unknown>,
        page_type: 'listing',
        scraped_at: new Date().toISOString(),
      };

      await this.rawStorage.store(rawListing);

      await scrapeQueue.add('scrape', {
        type: 'product',
        source: 'flipkart',
        identifier: product.pid,
        url: product.url,
      });
    }
  }

  private async processFlipkartProduct(pid: string): Promise<void> {
    const product = await this.flipkartScraper.scrapeProductPage(pid);

    const rawListing: RawListing = {
      source: 'flipkart',
      source_sku: pid,
      url: product.url,
      raw_data: product as unknown as Record<string, unknown>,
      page_type: 'product',
      scraped_at: new Date().toISOString(),
    };

    await this.rawStorage.store(rawListing);

    const normalizationResult = this.normalizer.normalizeFlipkartProduct(product);
    const overallConfidence = this.normalizer.calculateOverallConfidence(normalizationResult.confidence);

    logger.info(`Normalized Flipkart product ${pid}, confidence: ${overallConfidence}%`);

    if (overallConfidence >= 50) {
      await this.catalogStorage.upsert(normalizationResult.laptop);
    } else {
      logger.warn(`Low confidence for ${pid}: ${overallConfidence}%, skipping catalog upsert`);
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.amazonScraper.close();
    await this.flipkartScraper.close();
    await this.rawStorage.close();
    await this.catalogStorage.close();
  }
}

export async function enqueueScrapeJob(job: ScrapeJob): Promise<void> {
  await scrapeQueue.add('scrape', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
  });
}