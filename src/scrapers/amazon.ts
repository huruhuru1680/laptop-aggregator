import { chromium, Page } from 'playwright';
import { AmazonProductPage, AmazonListingProduct } from '../types/amazon';
import { getRandomUserAgent, amazonRateLimiter } from '../utils/rate-limiter';
import { detectAntiBot, calculateBackoffMs, AntiBotStatus } from '../utils/captcha-handler';
import { logger } from '../utils/logger';

const AMAZON_BASE_URL = 'https://www.amazon.in';

export class AmazonScraper {
  private browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  private isRunning: boolean = false;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  async launch(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    logger.info('Amazon scraper browser launched');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Amazon scraper browser closed');
    }
  }

  async scrapeSearchPage(keyword: string, pageNum: number = 1): Promise<AmazonListingProduct[]> {
    await this.ensureBrowser();
    const limiter = amazonRateLimiter;

    return limiter.schedule(async () => {
      const context = await this.browser!.newContext({
        userAgent: getRandomUserAgent(),
      });

      const searchPage = await context.newPage();
      try {
        const url = `${AMAZON_BASE_URL}/s?k=${encodeURIComponent(keyword)}&page=${pageNum}`;
        logger.info(`Scraping search page: ${url}`);

        await searchPage.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        const content = await searchPage.content();
        const antiBot = detectAntiBot(content);
        if (antiBot.shouldRetry) {
          throw new Error(`Anti-bot detected: ${antiBot.status}`);
        }

        const products = await this.extractListingProducts(searchPage);
        logger.info(`Extracted ${products.length} products from search page`);
        return products;
      } finally {
        await searchPage.close();
        await context.close();
      }
    });
  }

  async scrapeProductPage(asin: string): Promise<AmazonProductPage> {
    await this.ensureBrowser();
    const limiter = amazonRateLimiter;

    return limiter.schedule(async () => {
      const context = await this.browser!.newContext({
        userAgent: getRandomUserAgent(),
      });

      const page = await context.newPage();
      try {
        const url = `${AMAZON_BASE_URL}/dp/${asin}/`;
        logger.info(`Scraping product page: ${url}`);

        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

            const content = await page.content();
            const antiBot = detectAntiBot(content);

            if (antiBot.status === AntiBotStatus.RATE_LIMITED) {
              logger.warn(`Rate limited, attempt ${attempt + 1}, waiting ${antiBot.retryAfterMs}ms`);
              await page.waitForTimeout(antiBot.retryAfterMs);
              continue;
            }

            if (antiBot.status === AntiBotStatus.CAPTCHA || antiBot.status === AntiBotStatus.BLOCKED) {
              this.consecutiveErrors++;
              if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                throw new Error(`Anti-bot blocking after ${this.maxConsecutiveErrors} attempts`);
              }
              const backoff = calculateBackoffMs(attempt);
              logger.warn(`Anti-bot detected, backing off ${backoff}ms`);
              await page.waitForTimeout(backoff);
              continue;
            }

            this.consecutiveErrors = 0;
            const product = await this.extractProductPage(page, asin, url);
            logger.info(`Extracted product: ${product.title}`);
            return product;
          } catch (err) {
            lastError = err as Error;
            const backoff = calculateBackoffMs(attempt);
            logger.warn(`Attempt ${attempt + 1} failed: ${lastError.message}, backing off ${backoff}ms`);
            await page.waitForTimeout(backoff);
          }
        }

        throw lastError || new Error('Failed to scrape product page');
      } finally {
        await page.close();
        await context.close();
      }
    });
  }

  private async extractListingProducts(page: Page): Promise<AmazonListingProduct[]> {
    return page.evaluate(() => {
      const products: AmazonListingProduct[] = [];
      const items = document.querySelectorAll('[data-asin]');

      items.forEach((item: Element) => {
        const asin = (item as HTMLElement).dataset.asin;
        if (!asin || asin === '') return;

        const anchor = item.querySelector('a.a-link-normal') as HTMLAnchorElement | null;
        const url = anchor?.href || '';
        const titleEl = item.querySelector('h2 .a-text-normal');
        const title = titleEl?.textContent?.trim() || '';

        const priceEl = item.querySelector('.a-price .a-offscreen');
        const priceText = priceEl?.textContent || '';
        const price = priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) || null : null;

        const originalPriceEl = item.querySelector('.a-text-price .a-offscreen');
        const originalPriceText = originalPriceEl?.textContent || '';
        const originalPrice = originalPriceText ? parseInt(originalPriceText.replace(/[^\d]/g, ''), 10) || null : null;

        const ratingEl = item.querySelector('.a-icon-star-small');
        const ratingText = ratingEl?.textContent || '';
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) || null : null;

        const reviewCountEl = item.querySelector('.a-size-mini');
        const reviewCountText = reviewCountEl?.textContent || '';
        const reviewCountMatch = reviewCountText.match(/\(([\d,]+)\)/);
        const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ''), 10) || null : null;

        const imageEl = item.querySelector('.s-image');
        const imageUrl = imageEl?.getAttribute('src') || null;

        const isPrime = !!item.querySelector('.s-prime-icon');

        products.push({
          asin,
          url: url.startsWith('http') ? url : `${AMAZON_BASE_URL}${url}`,
          title,
          price,
          originalPrice,
          rating,
          reviewCount,
          imageUrl,
          isPrime,
        });
      });

      return products;
    });
  }

  private async extractProductPage(page: Page, asin: string, url: string): Promise<AmazonProductPage> {
    const title = await page.locator('#productTitle').textContent().catch(() => '');
    const titleText = title?.trim() || '';

    const brand = await page.locator('#bylineInfo').textContent().catch(() => '');
    const brandText = brand?.replace('Visit the ', '').replace(' Store', '').trim() || null;

    const priceEl = await page.locator('#priceblock_ourprice, .a-price .a-offscreen').first().textContent().catch(() => '');
    const price = priceEl ? parseInt(priceEl.replace(/[^\d]/g, ''), 10) || null : null;

    const originalPriceEl = await page.locator('#listPrice, .a-text-price .a-offscreen').first().textContent().catch(() => '');
    const originalPrice = originalPriceEl ? parseInt(originalPriceEl.replace(/[^\d]/g, ''), 10) || null : null;

    const discountEl = await page.locator('.a-color-price').first().textContent().catch(() => '');
    const discountMatch = discountEl?.match(/(\d+)%/);
    const discount = discountMatch ? parseInt(discountMatch[1], 10) || null : null;

    const ratingEl = await page.locator('#acrPopover .a-icon-alt').textContent().catch(() => '');
    const ratingMatch = ratingEl?.match(/([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) || null : null;

    const reviewCountEl = await page.locator('#acrCustomerReviewText').textContent().catch(() => '');
    const reviewCountMatch = reviewCountEl?.match(/([\d,]+)/);
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ''), 10) || null : null;

    const sellerEl = await page.locator('#soldByThirdParty, #merchant-string').textContent().catch(() => '');
    const seller = sellerEl?.trim() || null;

    const availabilityEl = await page.locator('#availability .a-color-state').textContent().catch(() => '');
    const availability = availabilityEl?.trim() || null;

    const imageEl = await page.locator('#landingImage').getAttribute('src').catch(() => null);
    const imageUrl = imageEl || null;

    const specs: Record<string, string> = {};
    const specRows = await page.locator('#poExpander table tr').all();
    for (const row of specRows) {
      const label = await row.locator('.a-span3 .a-size-base').textContent().catch(() => '');
      const value = await row.locator('.a-span9 .a-size-base').textContent().catch(() => '');
      if (label && value) {
        specs[label.trim()] = value.trim();
      }
    }

    return {
      asin,
      url,
      title: titleText,
      brand: brandText,
      price,
      originalPrice,
      discount,
      rating,
      reviewCount,
      seller,
      availability,
      imageUrl,
      specs,
      capturedAt: new Date().toISOString(),
    };
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      await this.launch();
    }
    if (!this.browser) {
      throw new Error('Failed to launch browser');
    }
  }
}