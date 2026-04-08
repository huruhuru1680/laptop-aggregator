# Laptop Aggregator Scraper Service

Scraper service for aggregating laptop data from Amazon.in and Flipkart.

## Architecture

```
src/
├── scrapers/           # Playwright-based marketplace scrapers
│   ├── amazon.ts       # Amazon.in scraper
│   └── flipkart.ts     # Flipkart scraper (M3)
├── normalization/      # Data normalization pipeline
│   └── normalizer.ts   # Field extraction and schema mapping
├── queue/              # BullMQ job queue
│   └── jobs.ts         # Job definitions and workers
├── storage/            # Data persistence
│   ├── raw.ts          # Raw listings storage
│   └── catalog.ts      # Normalized catalog storage
├── types/              # TypeScript type definitions
│   ├── canonical.ts    # Canonical laptop schema
│   └── amazon.ts       # Amazon-specific types
└── utils/              # Utilities
    ├── rate-limiter.ts # Polite scraping rate limiting
    ├── captcha-handler.ts # Anti-bot detection
    └── logger.ts       # Winston logger
```

## Data Flow

1. **Search Listing** → Extract product URLs + metadata
2. **Job Queue** → BullMQ distributes work to workers
3. **Product Detail** → Playwright scrapes full spec page
4. **Raw Storage** → Raw HTML stored in `raw_listings` table
5. **Normalization** → Fields extracted to canonical schema
6. **Catalog Storage** → Normalized data in `normalized_laptops` table

## Environment Variables

- `REDIS_URL` - Redis connection for BullMQ (default: `redis://localhost:6379`)
- `POSTGRES_URL` - PostgreSQL connection (default: `postgresql://localhost:5432/laptop_aggregator`)
- `LOG_LEVEL` - Log verbosity (default: `info`)

## Scripts

- `npm run build` - Compile TypeScript
- `npm start` - Start production server
- `npm run dev` - Run with ts-node
- `npm test` - Run unit tests

## Anti-Bot Strategy

- Rate limit: 5-10 req/min with jitter
- User-agent rotation from real browser pool
- Exponential backoff on 429/503 responses
- CAPTCHA detection pauses queue for 10 min retry