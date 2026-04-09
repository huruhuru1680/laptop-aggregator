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
- Helmet.js security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
- CORS enabled for cross-origin requests
- Rate limiting: 100 requests/minute per IP via Redis
- Redis-based distributed rate limiting
- Non-root user in Docker containers (USER node directive)
- PostgreSQL password authentication
- Health check endpoints for monitoring

### Production Hardening Requirements
- **HTTPS**: Deploy behind Nginx/Traefik with TLS termination
- **Secrets Management**: Use environment variables or secrets manager
  - `POSTGRES_PASSWORD` - PostgreSQL password
  - `REDIS_URL` - Redis connection URL
  - `GRAFANA_PASSWORD` - Grafana admin password
- **Network Isolation**: Use Docker network segmentation
- **Container Security**:
  - Read-only root filesystems where possible
  - Resource limits on all services
  - No privileged containers
- **Dependency Updates**: Enable Dependabot for security patches
- **SSL/TLS**: Minimum TLS 1.2, disable older protocols
- **Database**:
  - max_connections=100
  - shared_buffers=256MB
  - wal_level=replica for point-in-time recovery
- **Redis**:
  - maxmemory=256mb with allkeys-lru eviction
  - AOF persistence enabled
  - Password authentication recommended for production

### Security Headers (via Helmet.js)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

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
- `DatabaseConnectionPoolExhausted`: PostgreSQL connection pool errors
- `ScraperJobBacklog`: >100 pending scrape jobs for 15 minutes
- `LowDataFreshness`: No laptops scraped in 24 hours
- `HighDuplicateLaptopRate`: >30% duplicate upserts in 1 hour
- `RedisMemoryHigh`: Redis memory usage >90% of max
- `RedisConnectionErrors`: Redis connection errors detected

### Dashboards
- **Grafana Dashboard**: `grafana/dashboards/api.json`
- **Panels**: Request Rate, Request Latency (p95), Error Rate, Active Connections, Cache Hit/Miss Ratio

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