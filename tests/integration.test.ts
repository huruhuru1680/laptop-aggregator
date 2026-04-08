import { AmazonScraper } from '../src/scrapers/amazon';
import { FlipkartScraper } from '../src/scrapers/flipkart';
import { Normalizer } from '../src/normalization/normalizer';
import { CatalogStorage } from '../src/storage/catalog';
import { RawStorage, RawListing } from '../src/storage/raw';
import { ScrapeWorker } from '../src/queue/jobs';
import { CanonicalLaptop, NormalizationResult } from '../src/types/canonical';
import { AmazonProductPage } from '../src/types/amazon';
import { FlipkartProductPage } from '../src/types/flipkart';

const mockRawStorageStore = jest.fn().mockResolvedValue(1);
const mockCatalogStorageUpsert = jest.fn().mockResolvedValue(undefined);
const mockScraperClose = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/storage/raw', () => ({
  RawStorage: jest.fn().mockImplementation(() => ({
    store: mockRawStorageStore,
    getBySku: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../src/storage/catalog', () => ({
  CatalogStorage: jest.fn().mockImplementation(() => ({
    upsert: mockCatalogStorageUpsert,
    findBySourceSku: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Integration: Full Pipeline Flow', () => {
  let normalizer: Normalizer;
  let amazonScraper: AmazonScraper;
  let flipkartScraper: FlipkartScraper;

  beforeEach(() => {
    jest.clearAllMocks();
    normalizer = new Normalizer();
    amazonScraper = new AmazonScraper();
    flipkartScraper = new FlipkartScraper();
  });

  afterEach(async () => {
    await amazonScraper.close();
    await flipkartScraper.close();
  });

  describe('Normalizer integration', () => {
    it('should produce 80%+ confidence for complete Amazon product', () => {
      const amazonProduct: AmazonProductPage = {
        asin: 'B0CRKXDX83',
        url: 'https://www.amazon.in/dp/B0CRKXDX83/',
        title: 'Dell G15, 13th Gen Intel Core i5-13450HX, 16GB DDR5, 1TB SSD, RTX 3050, 15.6" FHD 120Hz, Windows 11',
        brand: 'Dell',
        price: 78490,
        originalPrice: 105398,
        discount: 26,
        rating: 4.0,
        reviewCount: 1459,
        seller: 'Clicktech Retail Private Ltd',
        availability: 'In Stock',
        imageUrl: 'https://m.media-amazon.com/images/I/41Kjoa5dLhL.jpg',
        specs: {
          'Brand': 'Dell',
          'CPU Model': 'Intel Core i5-13450HX',
          'RAM Memory Installed Size': '16 GB DDR5',
          'Hard Disk Size': '1 TB SSD',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '120 Hz',
          'Item Weight': '2600 Grams',
          'Operating System': 'Windows 11 Home',
          'Graphics Co Processor': 'NVIDIA GeForce RTX 3050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(amazonProduct);
      const overallConfidence = normalizer.calculateOverallConfidence(result.confidence);

      expect(overallConfidence).toBeGreaterThanOrEqual(80);
      expect(result.laptop.source).toBe('amazon_in');
      expect(result.laptop.source_sku).toBe('B0CRKXDX83');
      expect(result.laptop.price).toBe(78490);
      expect(result.laptop.brand).toBe('Dell');
    });

    it('should produce 80%+ confidence for complete Flipkart product', () => {
      const flipkartProduct: FlipkartProductPage = {
        pid: 'LAPTOP123ABC',
        url: 'https://www.flipkart.com/products/LAPTOP123ABC',
        title: 'HP Pavilion 15, 13th Gen Intel Core i5-13420H, 16GB DDR4, 512GB SSD, Intel Iris Xe, 15.6" FHD',
        brand: 'HP',
        price: 62990,
        originalPrice: 79990,
        discount: 21,
        rating: 4.2,
        reviewCount: 892,
        seller: 'HP Store',
        availability: 'In Stock',
        imageUrl: 'https://flipkart.com/image.jpg',
        specs: {
          'Brand': 'HP',
          'Processor': 'Intel Core i5-13420H',
          'RAM': '16 GB DDR4',
          'Storage': '512 GB SSD',
          'Display': '15.6 inch FHD',
          'Resolution': '1920x1080',
          'Refresh Rate': '60 Hz',
          'OS': 'Windows 11 Home',
          'Weight': '1.99 kg',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeFlipkartProduct(flipkartProduct);
      const overallConfidence = normalizer.calculateOverallConfidence(result.confidence);

      expect(overallConfidence).toBeGreaterThanOrEqual(80);
      expect(result.laptop.source).toBe('flipkart');
      expect(result.laptop.source_sku).toBe('LAPTOP123ABC');
      expect(result.laptop.price).toBe(62990);
    });

    it('should maintain source attribution through normalization', () => {
      const amazonProduct: AmazonProductPage = {
        asin: 'TEST123',
        url: 'https://www.amazon.in/dp/TEST123/',
        title: 'Test Laptop',
        brand: 'TestBrand',
        price: 50000,
        originalPrice: null,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {},
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(amazonProduct);

      expect(result.laptop.source).toBe('amazon_in');
      expect(result.laptop.source_sku).toBe('TEST123');
    });

    it('should flag low-confidence fields without guessing', () => {
      const minimalProduct: AmazonProductPage = {
        asin: 'MINIMAL1',
        url: 'https://www.amazon.in/dp/MINIMAL1/',
        title: 'Laptop',
        brand: null,
        price: null,
        originalPrice: null,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {},
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(minimalProduct);
      const overallConfidence = normalizer.calculateOverallConfidence(result.confidence);

      expect(overallConfidence).toBeLessThan(80);
      expect(result.confidence.brand).toBe(0);
      expect(result.confidence.cpu).toBe(0);
      expect(result.laptop.brand).toBe('Unknown');
    });
  });

  describe('Pipeline flow simulation', () => {
    it('should store raw data before normalization', async () => {
      const amazonProduct: AmazonProductPage = {
        asin: 'PIPELINE1',
        url: 'https://www.amazon.in/dp/PIPELINE1/',
        title: 'Pipeline Test Laptop',
        brand: 'TestBrand',
        price: 45000,
        originalPrice: 50000,
        discount: 10,
        rating: 4.5,
        reviewCount: 100,
        seller: 'Test Seller',
        availability: 'In Stock',
        imageUrl: 'https://example.com/image.jpg',
        specs: {
          'Brand': 'TestBrand',
          'CPU Model': 'Intel Core i5',
          'RAM Memory Installed Size': '8 GB',
          'Hard Disk Size': '512 GB SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const rawStorage = new RawStorage('mock-connection-string');
      const rawListing: RawListing = {
        source: 'amazon_in',
        source_sku: amazonProduct.asin,
        url: amazonProduct.url,
        raw_data: amazonProduct as unknown as Record<string, unknown>,
        page_type: 'product',
        scraped_at: new Date().toISOString(),
      };

      await rawStorage.store(rawListing);

      expect(mockRawStorageStore).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'amazon_in',
          source_sku: 'PIPELINE1',
          page_type: 'product',
        })
      );
    });

    it('should upsert to catalog after normalization', async () => {
      const amazonProduct: AmazonProductPage = {
        asin: 'UPSERT1',
        url: 'https://www.amazon.in/dp/UPSERT1/',
        title: 'Upsert Test Laptop',
        brand: 'UpsertBrand',
        price: 55000,
        originalPrice: 60000,
        discount: 8,
        rating: 4.1,
        reviewCount: 200,
        seller: 'Upsert Seller',
        availability: 'In Stock',
        imageUrl: 'https://example.com/image.jpg',
        specs: {
          'Brand': 'UpsertBrand',
          'CPU Model': 'AMD Ryzen 5',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '1 TB SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const normalizationResult = normalizer.normalizeAmazonProduct(amazonProduct);
      const catalogStorage = new CatalogStorage('mock-connection-string');

      await catalogStorage.upsert(normalizationResult.laptop);

      expect(mockCatalogStorageUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'amazon_in',
          source_sku: 'UPSERT1',
          brand: 'UpsertBrand',
        })
      );
    });
  });

  describe('Cross-source deduplication concept', () => {
    it('should detect potential duplicates by model similarity', () => {
      const dellG15Amazon: AmazonProductPage = {
        asin: 'AMZ123',
        url: 'https://www.amazon.in/dp/AMZ123/',
        title: 'Dell G15 5520 12th Gen Intel Core i5-12500H 16GB DDR5 1TB SSD RTX 3050 15.6" FHD',
        brand: 'Dell',
        price: 84990,
        originalPrice: 105398,
        discount: 19,
        rating: 4.3,
        reviewCount: 2450,
        seller: 'Amazon',
        availability: 'In Stock',
        imageUrl: null,
        specs: {
          'Brand': 'Dell',
          'CPU Model': 'Intel Core i5-12500H',
          'RAM Memory Installed Size': '16 GB DDR5',
          'Hard Disk Size': '1 TB SSD',
          'Graphics Co Processor': 'NVIDIA GeForce RTX 3050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const dellG15Flipkart: FlipkartProductPage = {
        pid: 'FLK456',
        url: 'https://www.flipkart.com/products/FLK456',
        title: 'Dell G15 5520 12th Gen Intel Core i5-12500H 16GB DDR5 1TB SSD RTX 3050 15.6" FHD',
        brand: 'Dell',
        price: 79990,
        originalPrice: 99990,
        discount: 20,
        rating: 4.1,
        reviewCount: 1800,
        seller: 'Flipkart',
        availability: 'In Stock',
        imageUrl: null,
        specs: {
          'Brand': 'Dell',
          'Processor': 'Intel Core i5-12500H',
          'RAM': '16 GB DDR5',
          'Storage': '1 TB SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const amazonResult = normalizer.normalizeAmazonProduct(dellG15Amazon);
      const flipkartResult = normalizer.normalizeFlipkartProduct(dellG15Flipkart);

      expect(amazonResult.laptop.brand).toBe(flipkartResult.laptop.brand);
      expect(amazonResult.laptop.cpu).toBe(flipkartResult.laptop.cpu);
      expect(amazonResult.laptop.ram).toBe(flipkartResult.laptop.ram);
      expect(amazonResult.laptop.storage).toBe(flipkartResult.laptop.storage);
      expect(amazonResult.laptop.source).not.toBe(flipkartResult.laptop.source);
    });

    it('should handle price differences between sources', () => {
      const amazonProduct: AmazonProductPage = {
        asin: 'PRICE1',
        url: 'https://www.amazon.in/dp/PRICE1/',
        title: 'Same Laptop',
        brand: 'Brand',
        price: 80000,
        originalPrice: 90000,
        discount: 11,
        rating: 4.5,
        reviewCount: 500,
        seller: 'Amazon',
        availability: 'In Stock',
        imageUrl: null,
        specs: {
          'Brand': 'Brand',
          'CPU Model': 'Intel Core i7',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '512 GB SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const flipkartProduct: FlipkartProductPage = {
        pid: 'PRICE2',
        url: 'https://www.flipkart.com/products/PRICE2',
        title: 'Same Laptop',
        brand: 'Brand',
        price: 75000,
        originalPrice: 85000,
        discount: 12,
        rating: 4.5,
        reviewCount: 500,
        seller: 'Flipkart',
        availability: 'In Stock',
        imageUrl: null,
        specs: {
          'Brand': 'Brand',
          'Processor': 'Intel Core i7',
          'RAM': '16 GB',
          'Storage': '512 GB SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const amazonResult = normalizer.normalizeAmazonProduct(amazonProduct);
      const flipkartResult = normalizer.normalizeFlipkartProduct(flipkartProduct);

      expect(amazonResult.laptop.price).toBe(80000);
      expect(flipkartResult.laptop.price).toBe(75000);
      expect(amazonResult.laptop.price).not.toBe(flipkartResult.laptop.price);
    });
  });
});
