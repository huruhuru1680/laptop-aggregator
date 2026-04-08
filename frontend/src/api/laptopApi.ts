import type { CanonicalLaptop, LaptopFilters, SearchResult, SortOption } from '../types';

const API_BASE = 'http://localhost:3000';

interface BackendLaptop {
  id: number;
  brand: string;
  model_family: string | null;
  model_name: string;
  cpu: string;
  gpu: string;
  ram: number;
  ram_type: string | null;
  storage: number;
  storage_type: string;
  display_size: string;
  display_resolution: string | null;
  refresh_rate: number | null;
  panel_type: string | null;
  weight: string | null;
  os: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  seller: string | null;
  rating: string | null;
  review_count: number | null;
  availability: string | null;
  product_url: string;
  image_url: string | null;
  source: 'amazon_in' | 'flipkart';
  source_sku: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

interface BackendResponse {
  success: boolean;
  data: BackendLaptop[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  cached?: boolean;
}

function transformLaptop(laptop: BackendLaptop): CanonicalLaptop {
  return {
    id: String(laptop.id),
    brand: laptop.brand,
    model_family: laptop.model_family,
    model_name: laptop.model_name,
    cpu: laptop.cpu,
    gpu: laptop.gpu,
    ram: laptop.ram,
    ram_type: laptop.ram_type,
    storage: laptop.storage,
    storage_type: laptop.storage_type,
    display_size: parseFloat(laptop.display_size) || 0,
    display_resolution: laptop.display_resolution,
    refresh_rate: laptop.refresh_rate,
    panel_type: laptop.panel_type,
    weight: laptop.weight ? parseFloat(laptop.weight) : null,
    os: laptop.os,
    price: laptop.price,
    original_price: laptop.original_price,
    discount_percent: laptop.discount_percent,
    seller: laptop.seller,
    rating: laptop.rating ? parseFloat(laptop.rating) : null,
    review_count: laptop.review_count,
    availability: laptop.availability,
    product_url: laptop.product_url,
    image_url: laptop.image_url,
    source: laptop.source,
    source_sku: laptop.source_sku,
    last_seen: laptop.last_seen,
  };
}

function transformSortOption(sort: SortOption): { sortField: string; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'price_asc':
      return { sortField: 'price', sortOrder: 'asc' };
    case 'price_desc':
      return { sortField: 'price', sortOrder: 'desc' };
    case 'rating_desc':
      return { sortField: 'rating', sortOrder: 'desc' };
    case 'review_count_desc':
      return { sortField: 'review_count', sortOrder: 'desc' };
    case 'name_asc':
      return { sortField: 'brand', sortOrder: 'asc' };
    default:
      return { sortField: 'price', sortOrder: 'asc' };
  }
}

function buildQueryParams(query: string, filters: Partial<LaptopFilters>, sort: SortOption, page: number, pageSize: number): URLSearchParams {
  const params = new URLSearchParams();

  if (query) {
    params.set('search', query);
  }

  if (filters.brands && filters.brands.length > 0) {
    params.set('brand', filters.brands.join(','));
  }

  if (filters.sources && filters.sources.length > 0) {
    params.set('source', filters.sources.join(','));
  }

  if (filters.priceRange) {
    params.set('priceMin', String(filters.priceRange[0]));
    params.set('priceMax', String(filters.priceRange[1]));
  }

  if (filters.ram && filters.ram.length > 0) {
    const minRam = Math.min(...filters.ram);
    const maxRam = Math.max(...filters.ram);
    params.set('ramMin', String(minRam));
    params.set('ramMax', String(maxRam));
  }

  if (filters.storage && filters.storage.length > 0) {
    const minStorage = Math.min(...filters.storage);
    const maxStorage = Math.max(...filters.storage) + 256;
    params.set('storageMin', String(minStorage));
    params.set('storageMax', String(maxStorage));
  }

  if (filters.displaySizes && filters.displaySizes.length > 0) {
    const minDisplay = Math.min(...filters.displaySizes);
    const maxDisplay = Math.max(...filters.displaySizes) + 1;
    params.set('displaySizeMin', String(minDisplay));
    params.set('displaySizeMax', String(maxDisplay));
  }

  const { sortField, sortOrder } = transformSortOption(sort);
  params.set('sortField', sortField);
  params.set('sortOrder', sortOrder);

  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return params;
}

export async function searchLaptops(
  query: string = '',
  filters: Partial<LaptopFilters> = {},
  sort: SortOption = 'price_asc',
  page: number = 1,
  pageSize: number = 12
): Promise<SearchResult> {
  const params = buildQueryParams(query, filters, sort, page, pageSize);
  const url = `${API_BASE}/api/laptops?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: BackendResponse = await response.json();

  return {
    laptops: result.data.map(transformLaptop),
    total: result.pagination.total,
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    facets: {
      brands: [],
      cpuBrands: [],
      gpuBrands: [],
      ram: [],
      storage: [],
      displaySizes: [],
      refreshRates: [],
      sources: [],
    },
  };
}

export async function getLaptopById(id: string): Promise<CanonicalLaptop | null> {
  const url = `${API_BASE}/api/laptops?page=1&pageSize=100`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: BackendResponse = await response.json();
  const laptop = result.data.find(l => String(l.id) === id);
  return laptop ? transformLaptop(laptop) : null;
}

export async function getLaptopsByIds(ids: string[]): Promise<CanonicalLaptop[]> {
  const url = `${API_BASE}/api/laptops?page=1&pageSize=100`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: BackendResponse = await response.json();
  return result.data
    .filter(l => ids.includes(String(l.id)))
    .map(transformLaptop);
}

function extractCpuBrand(cpu: string): string {
  if (cpu.includes('Intel Core i9')) return 'Intel Core i9';
  if (cpu.includes('Intel Core i7')) return 'Intel Core i7';
  if (cpu.includes('Intel Core i5')) return 'Intel Core i5';
  if (cpu.includes('Intel Core i3')) return 'Intel Core i3';
  if (cpu.includes('AMD Ryzen 9')) return 'AMD Ryzen 9';
  if (cpu.includes('AMD Ryzen 7')) return 'AMD Ryzen 7';
  if (cpu.includes('AMD Ryzen 5')) return 'AMD Ryzen 5';
  if (cpu.includes('AMD Ryzen 3')) return 'AMD Ryzen 3';
  if (cpu.includes('Apple M3 Pro')) return 'Apple M3 Pro';
  if (cpu.includes('Apple M3')) return 'Apple M3';
  if (cpu.includes('Apple M2')) return 'Apple M2';
  if (cpu.includes('Apple M1')) return 'Apple M1';
  return 'Other';
}

function extractGpuBrand(gpu: string): string {
  if (gpu.includes('NVIDIA GeForce RTX 40')) return 'NVIDIA RTX 40';
  if (gpu.includes('NVIDIA GeForce RTX 30')) return 'NVIDIA RTX 30';
  if (gpu.includes('NVIDIA GeForce RTX 20')) return 'NVIDIA RTX 20';
  if (gpu.includes('NVIDIA GeForce GTX 16')) return 'NVIDIA GTX 16';
  if (gpu.includes('NVIDIA GeForce GTX')) return 'NVIDIA GTX';
  if (gpu.includes('AMD Radeon RX')) return 'AMD Radeon RX';
  if (gpu.includes('Intel Iris')) return 'Intel Iris';
  if (gpu.includes('Apple M3')) return 'Apple M3';
  if (gpu.includes('Apple M2')) return 'Apple M2';
  return 'Other';
}

export { extractCpuBrand, extractGpuBrand };