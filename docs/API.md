# Laptop Aggregator API

REST API for querying the laptop catalog with filtering, search, and pagination.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently no authentication required. Rate limiting is applied per IP address.

## Endpoints

### Health Check

```
GET /health
```

Returns server status and timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-08T00:00:00.000Z"
}
```

---

### List Laptops

```
GET /api/laptops
```

Returns paginated laptop listings with optional filtering.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `brand` | string | Filter by brand (comma-separated for multiple) | `brand=ASUS,Dell` |
| `cpu` | string | Filter by CPU (comma-separated for multiple) | `cpu=Intel i7,AMD Ryzen 7` |
| `gpu` | string | Filter by GPU (comma-separated for multiple) | `gpu=NVIDIA RTX 4060` |
| `ramMin` | number | Minimum RAM in GB | `ramMin=16` |
| `ramMax` | number | Maximum RAM in GB | `ramMax=32` |
| `storageMin` | number | Minimum storage in GB | `storageMin=512` |
| `storageMax` | number | Maximum storage in GB | `storageMax=1024` |
| `displaySizeMin` | number | Minimum display size in inches | `displaySizeMin=14` |
| `displaySizeMax` | number | Maximum display size in inches | `displaySizeMax=17` |
| `priceMin` | number | Minimum price in INR | `priceMin=50000` |
| `priceMax` | number | Maximum price in INR | `priceMax=150000` |
| `availability` | string | Filter by availability (comma-separated) | `availability=In Stock` |
| `source` | string | Filter by source (comma-separated) | `source=amazon_in,flipkart` |
| `search` | string | Full-text search on model name/family/brand | `search=gaming laptop` |
| `page` | number | Page number (default: 1) | `page=2` |
| `pageSize` | number | Results per page (default: 20, max: 100) | `pageSize=50` |
| `sortField` | string | Sort field: `price`, `brand`, `rating`, `review_count`, `last_seen` | `sortField=price` |
| `sortOrder` | string | Sort order: `asc`, `desc` | `sortOrder=desc` |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand": "ASUS",
      "model_family": "ROG Strix",
      "model_name": "ROG Strix G16",
      "cpu": "Intel Core i7-13650HX",
      "gpu": "NVIDIA GeForce RTX 4060",
      "ram": 16,
      "ram_type": "DDR5",
      "storage": 512,
      "storage_type": "SSD",
      "display_size": 16.1,
      "display_resolution": "1920x1080",
      "refresh_rate": 165,
      "panel_type": "IPS",
      "weight": 2.5,
      "os": "Windows 11",
      "price": 129990,
      "original_price": 149990,
      "discount_percent": 13,
      "seller": "ASUS Official",
      "rating": 4.5,
      "review_count": 1250,
      "availability": "In Stock",
      "product_url": "https://amazon.in/dp/...",
      "image_url": "https://images.amazon.in/...",
      "source": "amazon_in",
      "source_sku": "B0ABC12345",
      "last_seen": "2026-04-08T00:00:00.000Z",
      "created_at": "2026-04-07T12:00:00.000Z",
      "updated_at": "2026-04-08T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  },
  "cached": false
}
```

**Caching:** Response is cached in Redis for 60 seconds. The `cached` field indicates if response was served from cache.

---

### List Brands

```
GET /api/laptops/brands
```

Returns list of available laptop brands.

**Response:**
```json
{
  "success": true,
  "data": ["ASUS", "Dell", "HP", "Lenovo", "Acer", "MSI", "Apple", "Samsung", "Toshiba", "Microsoft"],
  "cached": false
}
```

**Caching:** Response is cached for 1 hour (3600 seconds).

---

### List Sources

```
GET /api/laptops/sources
```

Returns list of data sources.

**Response:**
```json
{
  "success": true,
  "data": ["amazon_in", "flipkart"],
  "cached": false
}
```

**Caching:** Response is cached for 1 hour (3600 seconds).

---

## Rate Limiting

API requests are rate limited to 100 requests per minute per IP address.

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Remaining requests in current window

**When rate limited (429):**
```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfterMs": 30000
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid query parameters |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Data Model

See [Canonical Laptop Schema](../src/types/canonical.ts) for the complete data model.

---

## Example Usage

### Find gaming laptops under 100k INR

```bash
curl "http://localhost:3000/api/laptops?gpu=NVIDIA RTX&priceMax=100000&sortField=price&sortOrder=asc"
```

### Find ASUS laptops with 16GB RAM and 512GB storage

```bash
curl "http://localhost:3000/api/laptops?brand=ASUS&ramMin=16&storageMin=512"
```

### Search for "MacBook Pro"

```bash
curl "http://localhost:3000/api/laptops?search=MacBook Pro"
```

### Get page 2 with 50 results per page

```bash
curl "http://localhost:3000/api/laptops?page=2&pageSize=50"
```
