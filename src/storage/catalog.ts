import { Pool } from 'pg';
import { CanonicalLaptop, CanonicalLaptopSchema } from '../types/canonical';
import { logger } from '../utils/logger';

export interface LaptopFilter {
  brand?: string[];
  cpu?: string[];
  gpu?: string[];
  ramMin?: number;
  ramMax?: number;
  storageMin?: number;
  storageMax?: number;
  displaySizeMin?: number;
  displaySizeMax?: number;
  priceMin?: number;
  priceMax?: number;
  availability?: string[];
  source?: string[];
  search?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export type SortField = 'price' | 'brand' | 'rating' | 'review_count' | 'last_seen';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class CatalogStorage {
  private pool: Pool;
  private onUpsertCallback?: () => Promise<void>;

  constructor(connectionString: string, onUpsertCallback?: () => Promise<void>) {
    if (!connectionString || typeof connectionString !== 'string') {
      throw new Error('PostgreSQL connection string is required and must be a string');
    }
    try {
      new URL(connectionString);
    } catch {
      throw new Error(`Invalid PostgreSQL connection string format: ${connectionString}`);
    }
    this.pool = new Pool({ connectionString });
    this.onUpsertCallback = onUpsertCallback;
    this.initTable();
  }

  private async initTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS normalized_laptops (
        id SERIAL PRIMARY KEY,
        brand TEXT NOT NULL,
        model_family TEXT,
        model_name TEXT NOT NULL,
        cpu TEXT NOT NULL,
        gpu TEXT NOT NULL,
        ram INTEGER NOT NULL,
        ram_type TEXT,
        storage INTEGER NOT NULL,
        storage_type TEXT NOT NULL,
        display_size NUMERIC NOT NULL,
        display_resolution TEXT,
        refresh_rate INTEGER,
        panel_type TEXT,
        weight NUMERIC,
        os TEXT,
        price INTEGER NOT NULL,
        original_price INTEGER,
        discount_percent INTEGER,
        seller TEXT,
        rating NUMERIC,
        review_count INTEGER,
        availability TEXT,
        product_url TEXT NOT NULL,
        image_url TEXT,
        source TEXT NOT NULL,
        source_sku TEXT NOT NULL,
        last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_source_sku UNIQUE(source, source_sku)
      );
      
      CREATE INDEX IF NOT EXISTS idx_catalog_brand ON normalized_laptops(brand);
      CREATE INDEX IF NOT EXISTS idx_catalog_cpu ON normalized_laptops(cpu);
      CREATE INDEX IF NOT EXISTS idx_catalog_price ON normalized_laptops(price);
      CREATE INDEX IF NOT EXISTS idx_catalog_source ON normalized_laptops(source);
    `;
    await this.pool.query(query);
    logger.info('Normalized laptops table initialized');
  }

  async upsert(laptop: CanonicalLaptop): Promise<number> {
    const validation = CanonicalLaptopSchema.safeParse(laptop);
    if (!validation.success) {
      logger.error('Invalid laptop data', { errors: validation.error.issues });
      throw new Error('Invalid laptop data');
    }

    const query = `
      INSERT INTO normalized_laptops (
        brand, model_family, model_name, cpu, gpu, ram, ram_type,
        storage, storage_type, display_size, display_resolution,
        refresh_rate, panel_type, weight, os, price, original_price,
        discount_percent, seller, rating, review_count, availability,
        product_url, image_url, source, source_sku, last_seen
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      ON CONFLICT (source, source_sku) DO UPDATE SET
        brand = EXCLUDED.brand,
        model_family = EXCLUDED.model_family,
        model_name = EXCLUDED.model_name,
        cpu = EXCLUDED.cpu,
        gpu = EXCLUDED.gpu,
        ram = EXCLUDED.ram,
        ram_type = EXCLUDED.ram_type,
        storage = EXCLUDED.storage,
        storage_type = EXCLUDED.storage_type,
        display_size = EXCLUDED.display_size,
        display_resolution = EXCLUDED.display_resolution,
        refresh_rate = EXCLUDED.refresh_rate,
        panel_type = EXCLUDED.panel_type,
        weight = EXCLUDED.weight,
        os = EXCLUDED.os,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        discount_percent = EXCLUDED.discount_percent,
        seller = EXCLUDED.seller,
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        availability = EXCLUDED.availability,
        product_url = EXCLUDED.product_url,
        image_url = EXCLUDED.image_url,
        last_seen = EXCLUDED.last_seen,
        updated_at = NOW()
      RETURNING id
    `;

    const values = [
      laptop.brand, laptop.model_family, laptop.model_name, laptop.cpu, laptop.gpu,
      laptop.ram, laptop.ram_type, laptop.storage, laptop.storage_type,
      laptop.display_size, laptop.display_resolution, laptop.refresh_rate,
      laptop.panel_type, laptop.weight, laptop.os, laptop.price, laptop.original_price,
      laptop.discount_percent, laptop.seller, laptop.rating, laptop.review_count,
      laptop.availability, laptop.product_url, laptop.image_url, laptop.source,
      laptop.source_sku, laptop.last_seen,
    ];

    const result = await this.pool.query(query, values);

    if (this.onUpsertCallback) {
      await this.onUpsertCallback();
    }

    return result.rows[0].id;
  }

  async findBySku(source: string, sourceSku: string): Promise<CanonicalLaptop | null> {
    const query = `SELECT * FROM normalized_laptops WHERE source = $1 AND source_sku = $2`;
    const result = await this.pool.query(query, [source, sourceSku]);
    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as CanonicalLaptop;
  }

  async findFiltered(
    filter: LaptopFilter,
    pagination: PaginationOptions,
    sort: SortOptions
  ): Promise<PaginatedResult<CanonicalLaptop>> {
    const conditions: string[] = [];
    const values: (string | number | string[])[] = [];
    let paramIndex = 1;

    if (filter.brand && filter.brand.length > 0) {
      conditions.push(`brand = ANY($${paramIndex}::text[])`);
      values.push(filter.brand);
      paramIndex++;
    }

    if (filter.cpu && filter.cpu.length > 0) {
      conditions.push(`cpu = ANY($${paramIndex}::text[])`);
      values.push(filter.cpu);
      paramIndex++;
    }

    if (filter.gpu && filter.gpu.length > 0) {
      conditions.push(`gpu = ANY($${paramIndex}::text[])`);
      values.push(filter.gpu);
      paramIndex++;
    }

    if (filter.ramMin !== undefined) {
      conditions.push(`ram >= $${paramIndex}`);
      values.push(filter.ramMin);
      paramIndex++;
    }

    if (filter.ramMax !== undefined) {
      conditions.push(`ram <= $${paramIndex}`);
      values.push(filter.ramMax);
      paramIndex++;
    }

    if (filter.storageMin !== undefined) {
      conditions.push(`storage >= $${paramIndex}`);
      values.push(filter.storageMin);
      paramIndex++;
    }

    if (filter.storageMax !== undefined) {
      conditions.push(`storage <= $${paramIndex}`);
      values.push(filter.storageMax);
      paramIndex++;
    }

    if (filter.displaySizeMin !== undefined) {
      conditions.push(`display_size >= $${paramIndex}`);
      values.push(filter.displaySizeMin);
      paramIndex++;
    }

    if (filter.displaySizeMax !== undefined) {
      conditions.push(`display_size <= $${paramIndex}`);
      values.push(filter.displaySizeMax);
      paramIndex++;
    }

    if (filter.priceMin !== undefined) {
      conditions.push(`price >= $${paramIndex}`);
      values.push(filter.priceMin);
      paramIndex++;
    }

    if (filter.priceMax !== undefined) {
      conditions.push(`price <= $${paramIndex}`);
      values.push(filter.priceMax);
      paramIndex++;
    }

    if (filter.availability && filter.availability.length > 0) {
      conditions.push(`availability = ANY($${paramIndex}::text[])`);
      values.push(filter.availability);
      paramIndex++;
    }

    if (filter.source && filter.source.length > 0) {
      conditions.push(`source = ANY($${paramIndex}::text[])`);
      values.push(filter.source);
      paramIndex++;
    }

    if (filter.search) {
      conditions.push(`(model_name ILIKE $${paramIndex} OR model_family ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`);
      values.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = {
      price: 'price',
      brand: 'brand',
      rating: 'rating',
      review_count: 'review_count',
      last_seen: 'last_seen',
    }[sort.field];

    const orderClause = `ORDER BY ${sortColumn} ${sort.order.toUpperCase()}`;
    const offset = (pagination.page - 1) * pagination.pageSize;

    const countQuery = `SELECT COUNT(*) as total FROM normalized_laptops ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataQuery = `
      SELECT * FROM normalized_laptops
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(pagination.pageSize, offset);

    const dataResult = await this.pool.query(dataQuery, values);
    const data = dataResult.rows as unknown as CanonicalLaptop[];

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}