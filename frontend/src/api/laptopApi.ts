import type { CanonicalLaptop, LaptopFilters, SearchResult, SortOption } from '../types';
import { mockLaptops } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

function normalizeFilter(filters: Partial<LaptopFilters>): LaptopFilters {
  return {
    brands: filters.brands || [],
    cpuBrands: filters.cpuBrands || [],
    cpuModels: filters.cpuModels || [],
    gpuBrands: filters.gpuBrands || [],
    gpuModels: filters.gpuModels || [],
    ram: filters.ram || [],
    storage: filters.storage || [],
    storageTypes: filters.storageTypes || [],
    displaySizes: filters.displaySizes || [],
    refreshRates: filters.refreshRates || [],
    priceRange: filters.priceRange || [0, 500000],
    weightRange: filters.weightRange || [0, 10],
    sources: filters.sources || [],
  };
}

function matchesFilters(laptop: CanonicalLaptop, filters: LaptopFilters): boolean {
  if (filters.brands.length > 0 && !filters.brands.includes(laptop.brand)) return false;

  const cpuBrand = extractCpuBrand(laptop.cpu);
  if (filters.cpuBrands.length > 0 && !filters.cpuBrands.includes(cpuBrand)) return false;

  const gpuBrand = extractGpuBrand(laptop.gpu);
  if (filters.gpuBrands.length > 0 && !filters.gpuBrands.includes(gpuBrand)) return false;

  if (filters.ram.length > 0 && !filters.ram.includes(laptop.ram)) return false;

  if (filters.storage.length > 0 && !filters.storage.some(s => laptop.storage >= s && laptop.storage < s + 256)) return false;

  if (filters.displaySizes.length > 0 && !filters.displaySizes.some(ds => Math.abs(laptop.display_size - ds) < 0.5)) return false;

  if (filters.refreshRates.length > 0 && laptop.refresh_rate !== null && !filters.refreshRates.includes(laptop.refresh_rate)) return false;

  if (filters.priceRange && (laptop.price < filters.priceRange[0] || laptop.price > filters.priceRange[1])) return false;

  if (filters.weightRange && (laptop.weight === null || laptop.weight < filters.weightRange[0] || laptop.weight > filters.weightRange[1])) return false;

  if (filters.sources.length > 0 && !filters.sources.includes(laptop.source)) return false;

  return true;
}

function sortLaptops(laptops: CanonicalLaptop[], sort: SortOption): CanonicalLaptop[] {
  const sorted = [...laptops];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating_desc':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'review_count_desc':
      return sorted.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    case 'name_asc':
      return sorted.sort((a, b) => a.model_name.localeCompare(b.model_name));
    default:
      return sorted;
  }
}

function computeFacets(laptops: CanonicalLaptop[]) {
  const brandCounts: Record<string, number> = {};
  const cpuBrandCounts: Record<string, number> = {};
  const gpuBrandCounts: Record<string, number> = {};
  const ramCounts: Record<number, number> = {};
  const storageCounts: Record<number, number> = {};
  const displaySizeCounts: Record<number, number> = {};
  const refreshRateCounts: Record<number, number> = {};
  const sourceCounts: Record<string, number> = {};

  laptops.forEach(laptop => {
    brandCounts[laptop.brand] = (brandCounts[laptop.brand] || 0) + 1;

    const cpuBrand = extractCpuBrand(laptop.cpu);
    cpuBrandCounts[cpuBrand] = (cpuBrandCounts[cpuBrand] || 0) + 1;

    const gpuBrand = extractGpuBrand(laptop.gpu);
    gpuBrandCounts[gpuBrand] = (gpuBrandCounts[gpuBrand] || 0) + 1;

    ramCounts[laptop.ram] = (ramCounts[laptop.ram] || 0) + 1;

    const storageBucket = Math.floor(laptop.storage / 256) * 256;
    storageCounts[storageBucket] = (storageCounts[storageBucket] || 0) + 1;

    const displayBucket = Math.round(laptop.display_size);
    displaySizeCounts[displayBucket] = (displaySizeCounts[displayBucket] || 0) + 1;

    if (laptop.refresh_rate) {
      refreshRateCounts[laptop.refresh_rate] = (refreshRateCounts[laptop.refresh_rate] || 0) + 1;
    }

    sourceCounts[laptop.source] = (sourceCounts[laptop.source] || 0) + 1;
  });

  return {
    brands: Object.entries(brandCounts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    cpuBrands: Object.entries(cpuBrandCounts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    gpuBrands: Object.entries(gpuBrandCounts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    ram: Object.entries(ramCounts).map(([value, count]) => ({ value: parseInt(value), count })).sort((a, b) => a.value - b.value),
    storage: Object.entries(storageCounts).map(([value, count]) => ({ value: parseInt(value), count })).sort((a, b) => a.value - b.value),
    displaySizes: Object.entries(displaySizeCounts).map(([value, count]) => ({ value: parseInt(value), count })).sort((a, b) => a.value - b.value),
    refreshRates: Object.entries(refreshRateCounts).map(([value, count]) => ({ value: parseInt(value), count })).sort((a, b) => a.value - b.value),
    sources: Object.entries(sourceCounts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
  };
}

export async function searchLaptops(
  query: string = '',
  filters: Partial<LaptopFilters> = {},
  sort: SortOption = 'price_asc',
  page: number = 1,
  pageSize: number = 12
): Promise<SearchResult> {
  await delay(300);

  let filtered = mockLaptops.filter(laptop => {
    if (query) {
      const q = query.toLowerCase();
      return (
        laptop.brand.toLowerCase().includes(q) ||
        laptop.model_name.toLowerCase().includes(q) ||
        laptop.cpu.toLowerCase().includes(q) ||
        laptop.gpu.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const normalizedFilters = normalizeFilter(filters);
  filtered = filtered.filter(laptop => matchesFilters(laptop, normalizedFilters));

  const facets = computeFacets(filtered);

  const sorted = sortLaptops(filtered, sort);

  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);

  return {
    laptops: paginated,
    total: filtered.length,
    page,
    pageSize,
    facets,
  };
}

export async function getLaptopById(id: string): Promise<CanonicalLaptop | null> {
  await delay(200);
  return mockLaptops.find(l => l.id === id) || null;
}

export async function getLaptopsByIds(ids: string[]): Promise<CanonicalLaptop[]> {
  await delay(200);
  return mockLaptops.filter(l => ids.includes(l.id));
}

export { extractCpuBrand, extractGpuBrand };
