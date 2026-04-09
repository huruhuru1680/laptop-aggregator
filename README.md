# Laptop Aggregator Platform

A production-ready web platform that aggregates laptop listings from Amazon.in and Flipkart, extracts and normalizes technical specifications into a unified catalog, and provides a PCPartPicker-like experience for filtering, searching, and comparing laptops.

## Architecture

```
├── src/                          # Backend (Node.js/TypeScript)
│   ├── scrapers/                 # Playwright-based marketplace scrapers
│   │   ├── amazon.ts            # Amazon.in scraper
│   │   └── flipkart.ts          # Flipkart scraper
│   ├── normalization/            # Data normalization pipeline
│   │   └── normalizer.ts       # Field extraction and schema mapping
│   ├── queue/                    # BullMQ job queue
│   │   └── jobs.ts              # Job definitions and workers
│   ├── storage/                  # Data persistence
│   │   ├── raw.ts               # Raw listings storage
│   │   └── catalog.ts           # Normalized catalog storage
│   ├── api/                      # Express API server
│   │   ├── server.ts            # Server setup and middleware
│   │   ├── laptops.ts           # Laptop listing/search endpoints
│   │   └── metrics.ts           # Prometheus metrics endpoint
│   ├── types/                    # TypeScript type definitions
│   │   ├── canonical.ts         # Canonical laptop schema (Zod)
│   │   ├── amazon.ts            # Amazon-specific types
│   │   └── flipkart.ts          # Flipkart-specific types
│   ├── utils/                    # Utilities
│   │   ├── rate-limiter.ts      # Polite scraping rate limiting
│   │   ├── captcha-handler.ts   # Anti-bot detection
│   │   ├── logger.ts            # Winston logger
│   │   └── metrics.ts           # Prometheus metrics
│   ├── cache.ts                  # Redis caching layer
│   └── index.ts                  # Scraper worker entry point
│
├── frontend/                      # Frontend (React/Vite/TypeScript)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Header.tsx
│   │   │   ├── FilterSidebar.tsx
│   │   │   └── LaptopCard.tsx
│   │   ├── pages/               # Page components
│   │   │   ├── LaptopListing.tsx
│   │   │   ├── LaptopDetail.tsx
│   │   │   └── Comparison.tsx
│   │   ├── api/                 # API client
│   │   │   └── laptopApi.ts
│   │   ├── context/             # React context for state
│   │   ├── types/               # Frontend type definitions
│   │   └── App.tsx              # Main app component
│   └── package.json
│
├── grafana/                       # Grafana dashboards
│   └── dashboards/
│
├── scripts/                       # Operational scripts
│   ├── backup.sh                 # Database backup
│   └── restore.sh                # Database restore
│
├── docker-compose.yml             # Production Docker setup
├── prometheus.yml                 # Prometheus configuration
└── prometheus_alerts.yml          # Alert rules
```

## Data Flow

1. **Search Listing** → Playwright scrapes product listings from Amazon.in/Flipkart
2. **Job Queue** → BullMQ distributes scraping work to concurrent workers
3. **Product Detail** → Full spec pages scraped with Playwright
4. **Raw Storage** → Raw data stored in `raw_listings` table for debugging
5. **Normalization** → Fields extracted to canonical schema with confidence scores
6. **Catalog Storage** → Normalized data in `normalized_laptops` table
7. **API** → Express API serves data with Redis caching
8. **Frontend** → React UI for filtering, search, and comparison

## Canonical Laptop Schema

The normalized schema uses Zod for validation with these core fields:

| Field | Type | Description |
|-------|------|-------------|
| `brand` | string | Manufacturer (ASUS, Dell, HP, etc.) |
| `model_name` | string | Full model identifier |
| `cpu` | string | Processor model and generation |
| `gpu` | string | Graphics card |
| `ram` | number | RAM in GB |
| `storage` | number | Storage in GB |
| `display_size` | number | Screen size in inches |
| `price` | number | Current price in INR |
| `source` | enum | `amazon_in` or `flipkart` |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for infrastructure)
- Ports: 3000 (API), 5432 (PostgreSQL), 6379 (Redis)

### 1. Start Infrastructure

```bash
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 3. Install Dependencies

```bash
npm install
cd frontend && npm install
```

### 4. Build and Start

```bash
# Build backend
npm run build

# Start API server (serves laptop catalog API)
npm run start:api

# In another terminal - start scraper worker (ingests data from marketplaces)
npm start

# Start frontend dev server
cd frontend && npm run dev
```

## Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm start` | Start scraper worker (ingests data) |
| `npm run start:api` | Start API server |
| `npm run dev` | Run scraper with ts-node |
| `npm run dev:api` | Run API with ts-node |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_URL` | `postgresql://localhost:5432/laptop_aggregator` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `LOG_LEVEL` | `info` | Log verbosity |
| `PORT` | `3000` | API server port |

## API Endpoints

### GET /api/laptops

Search and filter laptops with query parameters:

```
GET /api/laptops?brand=ASUS,Dell&ramMin=16&priceMax=100000&search=gaming&page=1&pageSize=20
```

Parameters:
- `brand`, `cpu`, `gpu` - Filter by exact values (comma-separated)
- `ramMin`, `ramMax` - RAM range in GB
- `storageMin`, `storageMax` - Storage range in GB
- `displaySizeMin`, `displaySizeMax` - Display size range in inches
- `priceMin`, `priceMax` - Price range in INR
- `source` - `amazon_in` or `flipkart`
- `search` - Full-text search on model name
- `sortField` - `price`, `brand`, `rating`, `review_count`
- `sortOrder` - `asc` or `desc`
- `page`, `pageSize` - Pagination

### GET /api/laptops/brands

Returns available laptop brands.

### GET /api/laptops/sources

Returns available sources (`amazon_in`, `flipkart`).

### GET /health

Health check endpoint.

### GET /ready

Readiness check (verifies Redis connectivity).

### GET /metrics

Prometheus metrics endpoint.

## Anti-Bot Strategy

The scrapers implement polite scraping practices:

- **Rate limiting**: 5-10 requests/minute with jitter
- **User-agent rotation**: Pool of real browser user agents
- **Exponential backoff**: On 429/503 responses, delays increase geometrically
- **CAPTCHA detection**: Automatically pauses and retries after 10 minutes
- **Session management**: Fresh browser contexts per request

## Monitoring

### Prometheus Metrics

The API exposes Prometheus metrics at `/metrics`:

- `http_requests_total` - Request count by endpoint and status
- `http_request_duration_seconds` - Request latency histogram
- `cache_hits_total` / `cache_misses_total` - Cache effectiveness
- `scraper_items_scraped_total` - Items scraped by source

### Grafana Dashboards

Pre-configured dashboards available in `grafana/dashboards/`.

### Alerting

Alert rules defined in `prometheus_alerts.yml`:

- High error rate alert
- Scraper queue depth alert
- Cache hit rate below threshold

## Database Backup

Automated backups run daily via the `backup` container. Manual backup:

```bash
./scripts/backup.sh
```

Restore from backup:

```bash
./scripts/restore.sh backup_file.sql
```

## Production Deployment

The `docker-compose.yml` includes a production-ready setup:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale scraper workers
docker-compose up -d --scale scrape-worker=3
```

## Troubleshooting

```bash
# View API logs
docker-compose logs -f api

# View scraper logs
docker-compose logs -f scrape-worker

# Reset database
docker-compose down -v
docker-compose up -d

# Check Redis connectivity
docker-compose exec api wget -qO- http://localhost:3000/ready
```
