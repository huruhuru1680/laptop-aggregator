# Canonical Laptop Schema

This document defines the normalized laptop schema used across all data sources. All laptop listings from Amazon.in and Flipkart are transformed into this schema before storage.

## Schema Definition

```typescript
{
  brand: string,              // Manufacturer (e.g., "ASUS", "Dell", "Apple")
  model_family: string|null,  // Product line (e.g., "ROG Strix", "ThinkPad", "MacBook")
  model_name: string,         // Full model identifier
  cpu: string,                // Processor model and generation
  gpu: string,                // Graphics processor
  ram: number,                // RAM in GB (positive integer)
  ram_type: string|null,      // Memory type (e.g., "DDR5", "LPDDR4X")
  storage: number,            // Storage in GB (positive integer)
  storage_type: string,        // Storage type (e.g., "SSD", "NVMe SSD", "HDD")
  display_size: number,        // Screen diagonal in inches
  display_resolution: string|null, // Resolution (e.g., "1920x1080")
  refresh_rate: number|null,   // Hz (e.g., 144, 165)
  panel_type: string|null,     // Panel tech (e.g., "IPS", "OLED", "TN")
  weight: number|null,        // Weight in kg
  os: string|null,            // Operating system
  price: number,              // Current price in INR (non-negative)
  original_price: number|null, // Original/list price in INR
  discount_percent: number|null, // Discount percentage 0-100
  seller: string|null,         // Seller name
  rating: number|null,         // Average rating 0-5
  review_count: number|null,   // Total review count
  availability: string|null,   // Stock status
  product_url: string,         // Source product page URL
  image_url: string|null,      // Product image URL
  source: 'amazon_in'|'flipkart', // Data source
  source_sku: string,          // Source-specific product ID (ASIN/PID)
  last_seen: string,           // ISO 8601 timestamp of last scrape
}
```

## Field Documentation

### Identity Fields

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `brand` | string | Manufacturer name | Required. Extracted from specs or inferred from title. |
| `model_family` | string\|null | Product line/series | Optional. e.g., "ROG", "ThinkPad", "MacBook Pro" |
| `model_name` | string | Full model identifier | Required. Derived from title after removing bundle/OS info. |

### Hardware Specifications

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `cpu` | string | Processor full model | e.g., "Intel Core i7-13650HX", "AMD Ryzen 7 7840HS" |
| `gpu` | string | Graphics processor | e.g., "NVIDIA GeForce RTX 4060", "Intel Iris Xe" |
| `ram` | number | RAM capacity in GB | Positive integer |
| `ram_type` | string\|null | Memory technology | e.g., "DDR5", "LPDDR4X", "DDR4" |
| `storage` | number | Storage capacity in GB | Positive integer. SSDs normalized to GB (1TB = 1024GB) |
| `storage_type` | string | Storage type | "SSD", "NVMe SSD", "HDD", or "eMMC" |

### Display

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `display_size` | number | Screen diagonal in inches | e.g., 14, 15.6, 17.3 |
| `display_resolution` | string\|null | Pixel dimensions | Format: "1920x1080" |
| `refresh_rate` | number\|null | Maximum refresh rate in Hz | e.g., 60, 144, 165 |
| `panel_type` | string\|null | Display technology | "IPS", "OLED", "LED", "TN", "WVA" |

### Physical

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `weight` | number\|null | Weight in kilograms | May be unavailable for some products |
| `os` | string\|null | Operating system | e.g., "Windows 11", "macOS Sonoma", "Linux" |

### Pricing and Availability

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `price` | number | Current price in INR | Required. Always non-negative. |
| `original_price` | number\|null | Original/list price in INR | May be null if no discount |
| `discount_percent` | number\|null | Discount percentage 0-100 | Calculated from price and original_price |
| `seller` | string\|null | Seller name | Platform-specific seller |
| `availability` | string\|null | Stock status | "In Stock", "Out of Stock", etc. |
| `rating` | number\|null | Average rating 0-5 | May be null if no ratings |
| `review_count` | number\|null | Total number of reviews | May be null if no reviews |

### Attribution

| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `product_url` | string | URL to source product page | Must be valid URL |
| `image_url` | string\|null | Product image URL | May be null if image unavailable |
| `source` | enum | Data source identifier | Either "amazon_in" or "flipkart" |
| `source_sku` | string | Source-specific product ID | Amazon ASIN or Flipkart PID |
| `last_seen` | string | ISO 8601 timestamp | When the listing was last scraped |

---

## Field Mapping: Amazon.in

### Listing Page Fields

Amazon listing pages provide limited data. Most specification fields come from product detail pages.

| Amazon Field | Canonical Field | Extraction Method |
|--------------|-----------------|-------------------|
| `asin` | `source_sku` | Direct mapping |
| URL | `product_url` | Direct mapping |
| `title` | `model_name`, `brand`, `cpu`, `gpu`, `ram`, `display_size` | Regex extraction from title |
| `price` | `price` | Direct mapping |
| `originalPrice` | `original_price` | Direct mapping |
| `rating` | `rating` | Direct mapping |
| `reviewCount` | `review_count` | Direct mapping |
| `imageUrl` | `image_url` | Direct mapping |

### Product Detail Page Fields

| Amazon Spec Key | Canonical Field | Confidence |
|-----------------|-----------------|------------|
| `Brand` | `brand` | direct (1.0) |
| `CPU Model` | `cpu` | direct (1.0) |
| `Graphics Co-Processor` | `gpu` | direct (1.0) |
| `RAM Memory Installed Size` | `ram` | direct (1.0) |
| `Hard Disk Size` | `storage` | direct (1.0) |
| `Hard Disk Description` | `storage_type` | direct (1.0) |
| `Screen Size` | `display_size` | direct (1.0) |
| `Native Resolution` | `display_resolution` | direct (1.0) |
| `Refresh Rate` | `refresh_rate` | direct (1.0) |
| `Item Weight` | `weight` | direct (1.0) |
| `Operating System` | `os` | direct (1.0) |

### Title-Based Inference

When specs are unavailable, these fields are inferred from the product title:

| Field | Title Pattern | Confidence |
|-------|---------------|------------|
| `brand` | First word matching known brands | inferred (0.8) |
| `cpu` | Intel Core iX-XXXX, AMD Ryzen X XXXX, Apple Mx | inferred (0.9) |
| `gpu` | NVIDIA GeForce RTX Xxxx, AMD Radeon RX xxx | inferred (0.8) |
| `ram` | XX GB DDRx | inferred (0.9) |
| `display_size` | XX.X inches | inferred (0.8) |

### Amazon-specific Notes

- **ASIN**: Amazon Standard Identification Number (10 alphanumeric characters)
- **Seller**: Extracted from `#soldByThirdParty` or `#merchant-string`
- **Availability**: Extracted from `#availability .a-color-state`
- **Discount**: Amazon shows discount as percentage directly on page

---

## Field Mapping: Flipkart

### Listing Page Fields

Flipkart listing pages have similar limitations to Amazon. Specification fields come from product detail pages.

| Flipkart Field | Canonical Field | Extraction Method |
|----------------|-----------------|-------------------|
| `pid` | `source_sku` | Direct mapping |
| URL | `product_url` | Direct mapping |
| `title` | `model_name`, `brand`, `cpu`, `gpu`, `ram`, `display_size` | Regex extraction from title |
| `price` | `price` | Direct mapping |
| `originalPrice` | `original_price` | Direct mapping |
| `rating` | `rating` | Direct mapping |
| `reviewCount` | `review_count` | Direct mapping |
| `imageUrl` | `image_url` | Direct mapping |

### Product Detail Page Fields

| Flipkart Spec Key | Canonical Field | Confidence |
|-------------------|-----------------|------------|
| `Brand` | `brand` | direct (1.0) |
| `Processor` | `cpu` | direct (1.0) |
| `Graphics Processor` | `gpu` | direct (1.0) |
| `RAM` | `ram` | direct (1.0) |
| `Storage` | `storage`, `storage_type` | direct (1.0) |
| `Display Size` | `display_size` | direct (1.0) |
| `Resolution` | `display_resolution` | direct (1.0) |
| `Refresh Rate` | `refresh_rate` | direct (1.0) |
| `Weight` | `weight` | direct (1.0) |
| `Operating System` | `os` | direct (1.0) |

### Flipkart-specific Notes

- **PID**: Flipkart Product ID (alphanumeric, variable length)
- **Seller**: Extracted from `._1QZ6pC`
- **Availability**: Extracted from `._38sBBC`
- **Discount**: Calculated from price comparison, Flipkart shows discount percentage

---

## Confidence Scoring

Every normalized laptop includes per-field confidence scores indicating extraction reliability.

### Confidence Levels

| Source | Score | Meaning |
|--------|-------|---------|
| `direct` | 1.0 | Value extracted from structured spec field |
| `inferred` | 0.5-0.9 | Value extracted from title or derived |
| `missing` | 0.0 | Value could not be extracted |

### Per-Field Default Confidence

| Field | Direct | Inferred | Missing |
|-------|--------|----------|---------|
| `brand` | 1.0 | 0.7-0.8 | 0.0 |
| `model_name` | 0.9 | - | 0.0 |
| `model_family` | 0.7 | - | 0.0 |
| `cpu` | 1.0 | 0.7-0.9 | 0.0 |
| `gpu` | 1.0 | 0.7-0.8 | 0.0 |
| `ram` | 1.0 | 0.8-0.9 | 0.0 |
| `ram_type` | 1.0 | 0.6-0.7 | 0.0 |
| `storage` | 1.0 | - | 0.0 |
| `storage_type` | 1.0 | 0.3 (default SSD) | 0.0 |
| `display_size` | 1.0 | 0.8 | 0.0 |
| `display_resolution` | 1.0 | - | 0.0 |
| `refresh_rate` | 1.0 | 0.5 | 0.0 |
| `panel_type` | - | 0.4 | 0.0 |
| `weight` | 1.0 | - | 0.0 |
| `os` | 1.0 | 0.7 | 0.0 |
| `price` | 1.0 | - | 0.0 |
| `original_price` | 1.0 | - | 0.0 |
| `discount_percent` | 0.9 | - | 0.0 |

### Overall Confidence

The overall confidence of a normalized laptop is calculated as the average of critical field confidences:

```typescript
const requiredFields = ['brand', 'model_name', 'cpu', 'gpu', 'ram', 'storage', 'display_size', 'price'];
const overallConfidence = avg(requiredFields.map(f => confidence[f]));
```

**Target**: 80%+ overall confidence for production readiness (M2 milestone).

---

## Data Quality Rules

1. **Price always required**: If price extraction fails, the listing is marked as failed
2. **Brand required**: If brand is missing, falls back to "Unknown" but confidence is 0
3. **Source attribution**: Every record must have valid `source` and `source_sku`
4. **URL validity**: `product_url` must be a valid URL
5. **Timestamp required**: `last_seen` is auto-set to scrape time in ISO 8601 format
6. **Storage normalization**: All storage values normalized to GB (1TB = 1024GB)
7. **Weight in kg**: Weight extracted from specs is converted to kg if in grams

---

## Schema Evolution

This schema is versioned. When making changes:

1. Update `src/types/canonical.ts` with new Zod schema
2. Update this document with new field definitions
3. Update `Normalizer` class with new extraction logic
4. Run migration for existing data
5. Update API documentation

Current schema version: 1.0