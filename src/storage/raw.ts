import { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface RawListing {
  id?: number;
  source: 'amazon_in' | 'flipkart';
  source_sku: string;
  url: string;
  raw_data: Record<string, unknown>;
  page_type: 'listing' | 'product';
  scraped_at: string;
}

export class RawStorage {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.initTable();
  }

  private async initTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS raw_listings (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_sku TEXT NOT NULL,
        url TEXT NOT NULL,
        raw_data JSONB NOT NULL,
        page_type TEXT NOT NULL,
        scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_raw_listings_source_sku ON raw_listings(source, source_sku);
      CREATE INDEX IF NOT EXISTS idx_raw_listings_scraped_at ON raw_listings(scraped_at);
    `;
    await this.pool.query(query);
    logger.info('Raw listings table initialized');
  }

  async store(listing: RawListing): Promise<number> {
    const query = `
      INSERT INTO raw_listings (source, source_sku, url, raw_data, page_type, scraped_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await this.pool.query(query, [
      listing.source,
      listing.source_sku,
      listing.url,
      JSON.stringify(listing.raw_data),
      listing.page_type,
      listing.scraped_at,
    ]);
    return result.rows[0].id;
  }

  async getBySku(source: string, sourceSku: string): Promise<RawListing | null> {
    const query = `
      SELECT * FROM raw_listings
      WHERE source = $1 AND source_sku = $2
      ORDER BY scraped_at DESC
      LIMIT 1
    `;
    const result = await this.pool.query(query, [source, sourceSku]);
    if (result.rows.length === 0) return null;
    return this.mapRowToListing(result.rows[0]);
  }

  private mapRowToListing(row: Record<string, unknown>): RawListing {
    return {
      id: row.id as number,
      source: row.source as 'amazon_in' | 'flipkart',
      source_sku: row.source_sku as string,
      url: row.url as string,
      raw_data: row.raw_data as Record<string, unknown>,
      page_type: row.page_type as 'listing' | 'product',
      scraped_at: row.scraped_at as string,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}