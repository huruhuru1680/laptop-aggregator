export interface CanonicalLaptop {
  id: string;
  brand: string;
  model_family: string | null;
  model_name: string;
  cpu: string;
  gpu: string;
  ram: number;
  ram_type: string | null;
  storage: number;
  storage_type: string;
  display_size: number;
  display_resolution: string | null;
  refresh_rate: number | null;
  panel_type: string | null;
  weight: number | null;
  os: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  seller: string | null;
  rating: number | null;
  review_count: number | null;
  availability: string | null;
  product_url: string;
  image_url: string | null;
  source: 'amazon_in' | 'flipkart';
  source_sku: string;
  last_seen: string;
}

export interface LaptopFilters {
  brands: string[];
  cpuBrands: string[];
  cpuModels: string[];
  gpuBrands: string[];
  gpuModels: string[];
  ram: number[];
  storage: number[];
  storageTypes: string[];
  displaySizes: number[];
  refreshRates: number[];
  priceRange: [number, number];
  weightRange: [number, number];
  sources: ('amazon_in' | 'flipkart')[];
}

export interface SearchResult {
  laptops: CanonicalLaptop[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    brands: { value: string; count: number }[];
    cpuBrands: { value: string; count: number }[];
    gpuBrands: { value: string; count: number }[];
    ram: { value: number; count: number }[];
    storage: { value: number; count: number }[];
    displaySizes: { value: number; count: number }[];
    refreshRates: { value: number; count: number }[];
    sources: { value: string; count: number }[];
  };
}

export type SortOption = 'price_asc' | 'price_desc' | 'rating_desc' | 'review_count_desc' | 'name_asc';
