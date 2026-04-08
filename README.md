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

Copy `.env.example` to `.env` and configure for your environment.

## Docker Setup (Local Development)

### Prerequisites

- Docker and Docker Compose installed
- Ports 5432 (PostgreSQL) and 6379 (Redis) available

### Quick Start

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Verify containers are running
docker-compose ps

# Run database migrations (auto-created on first connection)
npm run build
npm start

# Stop containers
docker-compose down
```

### Container Details

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 5432 | user: `laptop_user`, password: `laptop_password`, db: `laptop_aggregator` |
| Redis | 6379 | No authentication required |

### Troubleshooting

```bash
# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reset data
docker-compose down -v  # Removes volumes
docker-compose up -d     # Fresh start
```

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