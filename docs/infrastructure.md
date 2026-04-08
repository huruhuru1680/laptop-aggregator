# Production Infrastructure

## Overview

This document describes the production infrastructure for the Laptop Aggregator platform.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Nginx     │────▶│  Node.js    │
│  (Browser)  │     │   (HTTPS)   │     │   API       │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │  Grafana    │◀────│ Prometheus  │
                    │  Dashboard  │     │  (Metrics)  │
                    └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │  Alert      │◀────│  Redis      │
                    │  Manager    │     │  (Cache)    │
                    └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │  Backup     │────▶│ PostgreSQL  │
                    │  Script     │     │  Database  │
                    └─────────────┘     └─────────────┘
```

## Components

### API Service
- **Image**: Node.js 20 Alpine
- **Port**: 3000
- **Endpoints**:
  - `GET /health` - Liveness check
  - `GET /ready` - Readiness check (validates Redis)
  - `GET /metrics` - Prometheus metrics
  - `GET /api/laptops` - Laptop catalog with filtering
  - `GET /api/laptops/brands` - Available brands
  - `GET /api/laptops/sources` - Data sources

### Redis Cache
- **Image**: Redis 7 Alpine
- **Port**: 6379
- **Purpose**: API response caching, rate limiting
- **Persistence**: AOF enabled

### PostgreSQL Database
- **Image**: Postgres 16 Alpine
- **Port**: 5432
- **Purpose**: Normalized laptop catalog storage
- **Backups**: Daily automated backups via docker-compose

### Monitoring Stack
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards (port 3001)

## Security

### Implemented
- Helmet.js security headers
- CORS enabled for cross-origin requests
- Rate limiting: 100 requests/minute per IP via Redis
- Redis-based distributed rate limiting

### Production Requirements
- HTTPS via Nginx reverse proxy (not included in this repo)
- Environment variables for secrets (REDIS_URL, POSTGRES_URL)
- Regular security updates via Dependabot

## Monitoring

### Key Metrics
- Request rate by endpoint
- Request latency (p50, p95, p99)
- Error rate (5xx responses)
- Cache hit/miss ratio
- Active connections

### Alerts
- `HighErrorRate`: Error rate > 0.1/sec for 5 minutes
- `HighLatency`: p95 latency > 1000ms for 5 minutes
- `HighCacheMissRate`: Cache miss rate > 50%
- `ServiceDown`: API unreachable for 1 minute
- `RateLimitActive`: Rate limiting triggered

## Deployment

### Local Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
docker-compose -f docker-compose.yml up -d
```

### Database Backup
```bash
./scripts/backup.sh
```

### Database Restore
```bash
./scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

## Load Testing

```bash
k6 run k6/load-test.js
```

### Targets
- Support 100 concurrent users
- p95 latency < 500ms
- p99 latency < 1000ms
- Error rate < 10%