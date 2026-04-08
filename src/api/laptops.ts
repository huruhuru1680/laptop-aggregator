import { Router, Request, Response } from 'express';
import { cache, CACHE_TTL_SECONDS } from '../cache';
import { CatalogStorage, LaptopFilter, PaginationOptions, SortOptions } from '../storage/catalog';
import { logger } from '../utils/logger';

function generateCacheKey(filter: LaptopFilter, pagination: PaginationOptions, sort: SortOptions): string {
  const keyParts = [
    'laptops',
    JSON.stringify(filter),
    `${pagination.page}:${pagination.pageSize}`,
    `${sort.field}:${sort.order}`,
  ];
  return keyParts.join(':');
}

export function createLaptopRouter(catalogStorage: CatalogStorage): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const filter = parseFilterParams(req.query);
      const pagination = parsePaginationParams(req.query);
      const sort = parseSortParams(req.query);

      const cacheKey = generateCacheKey(filter, pagination, sort);
      const cached = await cache.get(cacheKey);

      if (cached) {
        logger.debug('Cache hit', { cacheKey });
        const parsed = JSON.parse(cached);
        res.json({
          success: true,
          data: parsed.data,
          pagination: parsed.pagination,
          cached: true,
        });
        return;
      }

      logger.debug('Cache miss', { cacheKey });
      const result = await catalogStorage.findFiltered(filter, pagination, sort);

      await cache.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify({
        data: result.data,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      }));

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
        cached: false,
      });
    } catch (error) {
      logger.error('Error fetching laptops', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  router.get('/brands', async (_req: Request, res: Response) => {
    try {
      const cached = await cache.get('laptops:brands');
      if (cached) {
        res.json({ success: true, data: JSON.parse(cached), cached: true });
        return;
      }

      const brands = ['ASUS', 'Dell', 'HP', 'Lenovo', 'Acer', 'MSI', 'Apple', 'Samsung', 'Toshiba', 'Microsoft'];
      await cache.setex('laptops:brands', 3600, JSON.stringify(brands));
      res.json({ success: true, data: brands, cached: false });
    } catch (error) {
      logger.error('Error fetching brands', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  router.get('/sources', async (_req: Request, res: Response) => {
    try {
      const cached = await cache.get('laptops:sources');
      if (cached) {
        res.json({ success: true, data: JSON.parse(cached), cached: true });
        return;
      }

      const sources = ['amazon_in', 'flipkart'];
      await cache.setex('laptops:sources', 3600, JSON.stringify(sources));
      res.json({ success: true, data: sources, cached: false });
    } catch (error) {
      logger.error('Error fetching sources', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  return router;
}

export { cache };

function parseFilterParams(query: Record<string, unknown>): LaptopFilter {
  const filter: LaptopFilter = {};

  if (query.brand) {
    filter.brand = String(query.brand).split(',');
  }

  if (query.cpu) {
    filter.cpu = String(query.cpu).split(',');
  }

  if (query.gpu) {
    filter.gpu = String(query.gpu).split(',');
  }

  if (query.ramMin) {
    filter.ramMin = parseInt(String(query.ramMin), 10);
  }

  if (query.ramMax) {
    filter.ramMax = parseInt(String(query.ramMax), 10);
  }

  if (query.storageMin) {
    filter.storageMin = parseInt(String(query.storageMin), 10);
  }

  if (query.storageMax) {
    filter.storageMax = parseInt(String(query.storageMax), 10);
  }

  if (query.displaySizeMin) {
    filter.displaySizeMin = parseFloat(String(query.displaySizeMin));
  }

  if (query.displaySizeMax) {
    filter.displaySizeMax = parseFloat(String(query.displaySizeMax));
  }

  if (query.priceMin) {
    filter.priceMin = parseInt(String(query.priceMin), 10);
  }

  if (query.priceMax) {
    filter.priceMax = parseInt(String(query.priceMax), 10);
  }

  if (query.availability) {
    filter.availability = String(query.availability).split(',');
  }

  if (query.source) {
    filter.source = String(query.source).split(',');
  }

  if (query.search) {
    filter.search = String(query.search);
  }

  return filter;
}

function parsePaginationParams(query: Record<string, unknown>): PaginationOptions {
  const page = query.page ? parseInt(String(query.page), 10) : 1;
  const pageSize = query.pageSize ? parseInt(String(query.pageSize), 10) : 20;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  };
}

function parseSortParams(query: Record<string, unknown>): SortOptions {
  const field = String(query.sortField || 'price');
  const order = String(query.sortOrder || 'asc');

  const validFields: SortOptions['field'][] = ['price', 'brand', 'rating', 'review_count', 'last_seen'];
  const validOrders: SortOptions['order'][] = ['asc', 'desc'];

  return {
    field: validFields.includes(field as SortOptions['field']) ? field as SortOptions['field'] : 'price',
    order: validOrders.includes(order as SortOptions['order']) ? order as SortOptions['order'] : 'asc',
  };
}