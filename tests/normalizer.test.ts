import { Normalizer } from '../src/normalization/normalizer';
import { AmazonProductPage } from '../src/types/amazon';
import { FlipkartProductPage } from '../src/types/flipkart';

describe('Normalizer', () => {
  let normalizer: Normalizer;

  beforeEach(() => {
    normalizer = new Normalizer();
  });

  describe('normalizeAmazonProduct', () => {
    it('should extract all fields from a valid Amazon product page', () => {
      const page: AmazonProductPage = {
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
          'CPU Model': 'Core i5',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '1 TB',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '120 hertz',
          'Item Weight': '2600 Grams',
          'Operating System': 'Windows 11 Home',
          'Graphics Co Processor': 'NVIDIA GeForce RTX 3050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.brand).toBe('Dell');
      expect(result.laptop.model_name).toContain('Dell G15');
      expect(result.laptop.cpu).toBe('Core i5');
      expect(result.laptop.gpu).toBe('NVIDIA GeForce RTX 3050');
      expect(result.laptop.ram).toBe(16);
      expect(result.laptop.storage).toBe(1024);
      expect(result.laptop.storage_type).toBe('SSD');
      expect(result.laptop.display_size).toBe(15.6);
      expect(result.laptop.display_resolution).toBe('1920x1080');
      expect(result.laptop.refresh_rate).toBe(120);
      expect(result.laptop.weight).toBe(2.6);
      expect(result.laptop.os).toBe('Windows 11 Home');
      expect(result.laptop.price).toBe(78490);
      expect(result.laptop.original_price).toBe(105398);
      expect(result.laptop.discount_percent).toBe(26);
      expect(result.laptop.source).toBe('amazon_in');
      expect(result.laptop.source_sku).toBe('B0CRKXDX83');
    });

    it('should handle missing fields gracefully', () => {
      const page: AmazonProductPage = {
        asin: 'TEST123',
        url: 'https://www.amazon.in/dp/TEST123/',
        title: 'Generic Laptop 15.6 inch',
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

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.brand).toBe('Unknown');
      expect(result.laptop.cpu).toBe('Unknown');
      expect(result.laptop.gpu).toBe('Unknown');
      expect(result.laptop.ram).toBe(0);
      expect(result.laptop.storage).toBe(0);
      expect(result.laptop.price).toBe(0);
      expect(result.laptop.discount_percent).toBeNull();
    });

    it('should calculate discount from price and original price', () => {
      const page: AmazonProductPage = {
        asin: 'TEST456',
        url: 'https://www.amazon.in/dp/TEST456/',
        title: 'Test Laptop',
        brand: 'TestBrand',
        price: 50000,
        originalPrice: 100000,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {},
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.discount_percent).toBe(50);
    });

    it('should not calculate discount when original price is lower', () => {
      const page: AmazonProductPage = {
        asin: 'TEST789',
        url: 'https://www.amazon.in/dp/TEST789/',
        title: 'Test Laptop',
        brand: 'TestBrand',
        price: 100000,
        originalPrice: 50000,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {},
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.discount_percent).toBeNull();
    });

    it('should normalize weight from grams to kg', () => {
      const page: AmazonProductPage = {
        asin: 'TESTWEIGHT',
        url: 'https://www.amazon.in/dp/TESTWEIGHT/',
        title: 'Heavy Laptop',
        brand: 'HeavyBrand',
        price: 99999,
        originalPrice: null,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {
          'Item Weight': '1500 Grams',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.weight).toBe(1.5);
    });

    it('should normalize storage from TB to GB', () => {
      const page: AmazonProductPage = {
        asin: 'TESTSTORAGE',
        url: 'https://www.amazon.in/dp/TESTSTORAGE/',
        title: 'Big Storage Laptop',
        brand: 'StorageBrand',
        price: 99999,
        originalPrice: null,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {
          'Hard Disk Size': '2 TB',
          'Hard Disk Description': 'SSD',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);

      expect(result.laptop.storage).toBe(2048);
    });
  });

  describe('normalizeFlipkartProduct', () => {
    it('should extract all fields from a valid Flipkart product page', () => {
      const page: FlipkartProductPage = {
        pid: 'LAPTOP123',
        url: 'https://www.flipkart.com/products/LAPTOP123',
        title: 'HP Pavilion 15, 13th Gen Intel Core i5, 16GB DDR4, 512GB SSD, RTX 2050, 15.6" FHD 144Hz',
        brand: 'HP',
        price: 72990,
        originalPrice: 94999,
        discount: 23,
        rating: 4.2,
        reviewCount: 892,
        seller: 'HP Store',
        availability: 'In Stock',
        imageUrl: 'https://rukmin.flixcart.com/image/312/312/xq0lqea0/computer/q/d/a/-original-imagqyqzp3krdm.jpeg',
        specs: {
          'Brand': 'HP',
          'CPU Model': 'Intel Core i5',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '512 GB',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '144 Hz',
          'Item Weight': '1750 Grams',
          'Operating System': 'Windows 11 Home',
          'Graphics Co Processor': 'NVIDIA RTX 2050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeFlipkartProduct(page);

      expect(result.laptop.brand).toBe('HP');
      expect(result.laptop.model_name).toContain('HP Pavilion');
      expect(result.laptop.cpu).toBe('Intel Core i5');
      expect(result.laptop.gpu).toBe('NVIDIA RTX 2050');
      expect(result.laptop.ram).toBe(16);
      expect(result.laptop.storage).toBe(512);
      expect(result.laptop.storage_type).toBe('SSD');
      expect(result.laptop.display_size).toBe(15.6);
      expect(result.laptop.price).toBe(72990);
      expect(result.laptop.original_price).toBe(94999);
      expect(result.laptop.discount_percent).toBe(23);
      expect(result.laptop.source).toBe('flipkart');
      expect(result.laptop.source_sku).toBe('LAPTOP123');
    });

    it('should handle missing fields gracefully', () => {
      const page: FlipkartProductPage = {
        pid: 'TESTFK',
        url: 'https://www.flipkart.com/products/TESTFK',
        title: 'Generic Laptop 14 inch',
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

      const result = normalizer.normalizeFlipkartProduct(page);

      expect(result.laptop.brand).toBe('Unknown');
      expect(result.laptop.cpu).toBe('Unknown');
      expect(result.laptop.gpu).toBe('Unknown');
      expect(result.laptop.ram).toBe(0);
      expect(result.laptop.storage).toBe(0);
      expect(result.laptop.price).toBe(0);
      expect(result.laptop.discount_percent).toBeNull();
      expect(result.laptop.source).toBe('flipkart');
      expect(result.laptop.source_sku).toBe('TESTFK');
    });

    it('should calculate discount correctly', () => {
      const page: FlipkartProductPage = {
        pid: 'TESTFK2',
        url: 'https://www.flipkart.com/products/TESTFK2',
        title: 'Test Laptop',
        brand: 'TestBrand',
        price: 40000,
        originalPrice: 80000,
        discount: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: null,
        imageUrl: null,
        specs: {},
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeFlipkartProduct(page);

      expect(result.laptop.discount_percent).toBe(50);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate average confidence for required fields', () => {
      const confidence = {
        brand: 1.0,
        model_name: 0.9,
        cpu: 1.0,
        gpu: 0.8,
        ram: 1.0,
        storage: 1.0,
        display_size: 0.8,
        price: 1.0,
      };

      const overall = normalizer.calculateOverallConfidence(confidence);

      expect(overall).toBe(94);
    });

    it('should return 0 for all missing fields', () => {
      const confidence = {
        brand: 0,
        model_name: 0,
        cpu: 0,
        gpu: 0,
        ram: 0,
        storage: 0,
        display_size: 0,
        price: 0,
      };

      const overall = normalizer.calculateOverallConfidence(confidence);

      expect(overall).toBe(0);
    });
  });

  describe('analyzeConfidence', () => {
    it('should identify fields below threshold', () => {
      const page: AmazonProductPage = {
        asin: 'B0CRKXDX83',
        url: 'https://www.amazon.in/dp/B0CRKXDX83/',
        title: 'Dell G15 Gaming Laptop',
        brand: 'Dell',
        price: 78490,
        originalPrice: 105398,
        discount: 26,
        rating: 4.0,
        reviewCount: 1459,
        seller: 'Clicktech',
        availability: 'In Stock',
        imageUrl: 'https://example.com/image.jpg',
        specs: {
          'Brand': 'Dell',
          'CPU Model': 'Core i5',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '1 TB',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '120 hertz',
          'Item Weight': '2600 Grams',
          'Operating System': 'Windows 11 Home',
          'Graphics Co Processor': 'NVIDIA GeForce RTX 3050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const result = normalizer.normalizeAmazonProduct(page);
      const analysis = normalizer.analyzeConfidence(result, 0.7);

      expect(analysis.overallConfidence).toBeGreaterThanOrEqual(80);
      expect(analysis.totalFields).toBeGreaterThan(0);
      expect(analysis.extractionNotes).toBeDefined();
    });

    it('should report low confidence fields when data is incomplete', () => {
      const page: AmazonProductPage = {
        asin: 'TEST123',
        url: 'https://www.amazon.in/dp/TEST123/',
        title: 'Generic Laptop',
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

      const result = normalizer.normalizeAmazonProduct(page);
      const analysis = normalizer.analyzeConfidence(result, 0.7);

      expect(analysis.overallConfidence).toBeLessThan(70);
      expect(analysis.lowConfidenceFields.length).toBeGreaterThan(0);
    });
  });

  describe('aggregateConfidenceAnalysis', () => {
    it('should aggregate confidence across multiple products', () => {
      const page1: AmazonProductPage = {
        asin: 'B0CRKXDX83',
        url: 'https://www.amazon.in/dp/B0CRKXDX83/',
        title: 'Dell G15, 13th Gen Intel Core i5, 16GB DDR5, 1TB SSD, RTX 3050, 15.6" FHD 120Hz',
        brand: 'Dell',
        price: 78490,
        originalPrice: 105398,
        discount: 26,
        rating: 4.0,
        reviewCount: 1459,
        seller: 'Clicktech',
        availability: 'In Stock',
        imageUrl: 'https://example.com/image1.jpg',
        specs: {
          'Brand': 'Dell',
          'CPU Model': 'Core i5',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '1 TB',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '120 hertz',
          'Item Weight': '2600 Grams',
          'Operating System': 'Windows 11 Home',
          'Graphics Co Processor': 'NVIDIA GeForce RTX 3050',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const page2: AmazonProductPage = {
        asin: 'B0ABC123',
        url: 'https://www.amazon.in/dp/B0ABC123/',
        title: 'HP Pavilion 15, Intel Core i7, 16GB DDR4, 512GB SSD, 15.6" FHD',
        brand: 'HP',
        price: 72990,
        originalPrice: 94999,
        discount: 23,
        rating: 4.2,
        reviewCount: 892,
        seller: 'HP Store',
        availability: 'In Stock',
        imageUrl: 'https://example.com/image2.jpg',
        specs: {
          'Brand': 'HP',
          'CPU Model': 'Intel Core i7',
          'RAM Memory Installed Size': '16 GB',
          'Hard Disk Size': '512 GB',
          'Hard Disk Description': 'SSD',
          'Screen Size': '15.6 Inches',
          'Native Resolution': '1920 x 1080 pixels',
          'Refresh Rate': '60 hertz',
          'Item Weight': '1750 Grams',
          'Operating System': 'Windows 11 Home',
        },
        capturedAt: '2026-04-08T00:00:00Z',
      };

      const results = [
        normalizer.normalizeAmazonProduct(page1),
        normalizer.normalizeAmazonProduct(page2),
      ];

      const aggregation = normalizer.aggregateConfidenceAnalysis(results);

      expect(aggregation.totalProducts).toBe(2);
      expect(aggregation.productsAbove80).toBeGreaterThanOrEqual(0);
      expect(aggregation.fieldAnalysis.length).toBeGreaterThan(0);
      expect(aggregation.averageConfidence).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const aggregation = normalizer.aggregateConfidenceAnalysis([]);

      expect(aggregation.totalProducts).toBe(0);
      expect(aggregation.averageConfidence).toBe(0);
      expect(aggregation.productsAbove80).toBe(0);
      expect(aggregation.fieldAnalysis.length).toBe(0);
    });
  });
});