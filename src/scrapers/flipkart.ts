import { chromium, Page } from 'playwright';
import { FlipkartProductPage, FlipkartListingProduct } from '../types/flipkart';
import { getRandomUserAgent, flipkartRateLimiter } from '../utils/rate-limiter';
import { detectAntiBot, calculateBackoffMs, AntiBotStatus } from '../utils/captcha-handler';
import { logger } from '../utils/logger';

const FLIPKART_BASE_URL = 'https://www.flipkart.com';

export class FlipkartScraper {
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

    logger.info('Flipkart scraper browser launched');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Flipkart scraper browser closed');
    }
  }

  async scrapeSearchPage(keyword: string, pageNum: number = 1): Promise<FlipkartListingProduct[]> {
    await this.ensureBrowser();
    const limiter = flipkartRateLimiter;

    return limiter.schedule(async () => {
      const context = await this.browser!.newContext({
        userAgent: getRandomUserAgent(),
      });

      const searchPage = await context.newPage();
      try {
        const url = `${FLIPKART_BASE_URL}/search?q=${encodeURIComponent(keyword)}&page=${pageNum}`;
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

  async scrapeProductPage(pid: string): Promise<FlipkartProductPage> {
    await this.ensureBrowser();
    const limiter = flipkartRateLimiter;

    return limiter.schedule(async () => {
      const context = await this.browser!.newContext({
        userAgent: getRandomUserAgent(),
      });

      const page = await context.newPage();
      try {
        const url = `${FLIPKART_BASE_URL}/products/${pid}`;
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
            const product = await this.extractProductPage(page, pid, url);
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

  private async extractListingProducts(page: Page): Promise<FlipkartListingProduct[]> {
    return page.evaluate(() => {
      const products: FlipkartListingProduct[] = [];
      const items = document.querySelectorAll('._1AtVbN3');

      items.forEach((item: Element) => {
        const anchor = item.querySelector('a._1fQZEK') as HTMLAnchorElement | null;
        const url = anchor?.href || '';
        const pidMatch = url.match(/\/products\/([a-zA-Z0-9]+)/);
        const pid = pidMatch ? pidMatch[1] : '';

        if (!pid) return;

        const titleEl = item.querySelector('._2WkVRQ, .s1Q9rs');
        const title = titleEl?.textContent?.trim() || '';

        const priceEl = item.querySelector('._30jeq3');
        const priceText = priceEl?.textContent || '';
        const price = priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) || null : null;

        const originalPriceEl = item.querySelector('._3I9_wc, ._2iAkX4');
        const originalPriceText = originalPriceEl?.textContent || '';
        const originalPrice = originalPriceText ? parseInt(originalPriceText.replace(/[^\d]/g, ''), 10) || null : null;

        const ratingEl = item.querySelector('._3Ay6Sb span');
        const ratingText = ratingEl?.textContent || '';
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) || null : null;

        const reviewCountEl = item.querySelector('._2_RaDZ');
        const reviewCountText = reviewCountEl?.textContent || '';
        const reviewCountMatch = reviewCountText.match(/([\d,]+)/);
        const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ''), 10) || null : null;

        const imageEl = item.querySelector('._2QcAgL img, ._3BTv9R img') as HTMLImageElement | null;
        const imageUrl = imageEl?.src || null;

        const isPrimeEl = item.querySelector('.pOBcik');
        const isPrime = !!isPrimeEl;

        products.push({
          pid,
          url: url.startsWith('http') ? url : `${FLIPKART_BASE_URL}${url}`,
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

  private async extractProductPage(page: Page, pid: string, url: string): Promise<FlipkartProductPage> {
    const title = await page.locator('._3eWWRT').textContent().catch(() =>
      page.locator('.B_NuCI').textContent().catch(() => '')
    );
    const titleText = title?.trim() || '';

    const brand = await page.locator('._2mFc1k').textContent().catch(() => '');
    const brandText = brand?.trim() || null;

    const priceEl = await page.locator('._30jeq3').first().textContent().catch(() => '');
    const price = priceEl ? parseInt(priceEl.replace(/[^\d]/g, ''), 10) || null : null;

    const originalPriceEl = await page.locator('._3I9_wc').textContent().catch(() => '');
    const originalPrice = originalPriceEl ? parseInt(originalPriceEl.replace(/[^\d]/g, ''), 10) || null : null;

    const discountEl = await page.locator('._3fVaIS').textContent().catch(() => '');
    const discountMatch = discountEl?.match(/(\d+)%/);
    const discount = discountMatch ? parseInt(discountMatch[1], 10) || null : null;

    const ratingEl = await page.locator('._1KFV8').textContent().catch(() =>
      page.locator('.hGSR34').textContent().catch(() => '')
    );
    const ratingMatch = ratingEl?.match(/([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) || null : null;

    const reviewCountEl = await page.locator('._1KFV8 span span').first().textContent().catch(() =>
      page.locator('._2_RaDZ').textContent().catch(() => '')
    );
    const reviewCountMatch = reviewCountEl?.match(/([\d,]+)/);
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ''), 10) || null : null;

    const sellerEl = await page.locator('._1QZ6pC').textContent().catch(() => '');
    const seller = sellerEl?.trim() || null;

    const availabilityEl = await page.locator('._38sBBC').textContent().catch(() => '');
    const availability = availabilityEl?.trim() || null;

    const imageEl = await page.locator('._3E8aLU img').first().getAttribute('src').catch(() => null);
    const imageUrl = imageEl || null;

    const specs: Record<string, string> = {};
    const specRows = await page.locator('._1dVbuJ').all();
    for (const row of specRows) {
      const label = await row.locator('._2mLtmQ').textContent().catch(() => '');
      const value = await row.locator('._2vZ0Px').textContent().catch(() => '');
      if (label && value) {
        specs[label.trim()] = value.trim();
      }
    }

    return {
      pid,
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