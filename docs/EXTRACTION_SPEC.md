# Research & Data Source Specification
## Laptop Aggregation Platform - amazon.in & flipkart.com

**Document Version:** 1.1  
**Date:** 2026-04-09  
**Analyst:** Research & Data Source Analyst  
**Verification Status:** Implementation reviewed against src/scrapers/amazon.ts and src/normalization/normalizer.ts

---

## 1. Executive Summary

This document provides implementation-ready specifications for extracting laptop data from amazon.in and flipkart.com, based on direct analysis of marketplace page structures. It supplements the existing [SCHEMA.md](./SCHEMA.md) with source-specific extraction rules, observed field mappings, edge cases, and operational risk assessments.

**Key Findings:**
- **Amazon.in**: Server-side rendered HTML with structured spec tables. Extractions are reliable when anti-bot measures are bypassed.
- **Flipkart.com**: Entirely client-side rendered (React). Current CSS selectors in scraper are likely broken due to minified class names. Requires browser automation with proper wait conditions.

---

## 2. Field Inventory by Source

### 2.1 Amazon.in

**Source Type:** Server-side rendered HTML (initial page load contains full content)

**Listing Page Extractable Fields:**

| Field | Selector | CSS Path | Notes |
|-------|----------|----------|-------|
| ASIN | `data-asin` attribute | `[data-asin]` | Product identifier |
| Product URL | `a.a-link-normal` href | `.s-result-item a.a-link-normal` | Relative URLs need base prepend |
| Title | `h2 .a-text-normal` | `.s-result-item h2 .a-text-normal` | May contain bundle info |
| Price | `.a-price .a-offscreen` | `.s-result-item .a-price .a-offscreen` | Contains ₹ symbol |
| Original Price | `.a-text-price .a-offscreen` | `.s-result-item .a-text-price .a-offscreen` | Sometimes absent |
| Rating | `.a-icon-star-small` text | Extracts number from "X.X out of 5 stars" | |
| Review Count | `.a-size-mini` | Pattern: `(1,234)` | |
| Image URL | `.s-image` src | `.s-result-item .s-image` | |
| Prime Badge | `.s-prime-icon` exists | Boolean check | |

**Product Detail Page Extractable Fields:**

| Field | Selector | Location | Notes |
|-------|----------|----------|-------|
| Title | `#productTitle` | Text content | Full product title |
| Brand | `#bylineInfo` | Text, remove "Visit the X Store" | |
| Price | `#priceblock_ourprice` or `.a-price .a-offscreen` | First match wins | |
| Original Price | `#listPrice` or `.a-text-price .a-offscreen` | | |
| Discount | `.a-color-price` | Pattern: `XX% off` | |
| Rating | `#acrPopover .a-icon-alt` | Extract number from text | |
| Review Count | `#acrCustomerReviewText` | Pattern: `1,234 ratings` | |
| Seller | `#soldByThirdParty` or `#merchant-string` | Text content | |
| Availability | `#availability .a-color-state` | Text content | |
| Image URL | `#landingImage` src | Main product image | |
| **Specifications** | `#poExpander table tr` | Table rows with label/value | Key-value pairs |

**Specification Table Extraction:**
```
Label selector:  #poExpander table tr .a-span3 .a-size-base
Value selector:  #poExpander table tr .a-span9 .a-size-base
```

**Amazon Spec Keys Observed (from HP OmniBook B0F3HQKGMN and Dell G15 B0CRKXDX83):**

| Amazon Spec Key | Canonical Mapping | Confidence | Notes |
|-----------------|-------------------|------------|-------|
| `Brand` | `brand` | direct (1.0) | |
| `Processor Type` | `cpu` | direct (1.0) | Primary key on HP OmniBook |
| `CPU Model` | `cpu` | direct (1.0) | Primary key on Dell G15 (alternate) |
| `Processor Speed` | - | - | Hz, not extracted separately |
| `Processor Count` | - | - | CPU core count, not used |
| `Processor Brand` | - | - | AMD/Intel, merged into cpu |
| `Graphics Co-Processor` | `gpu` | direct (1.0) | |
| `RAM Memory Installed Size` | `ram` | direct (1.0) | |
| `RAM Memory Technology` | `ram_type` | direct (1.0) | Observed as "LPDDR5X", "DDR5" |
| `RAM Memory Maximum Size` | - | - | Not used |
| `Hard Disk Size` | `storage` | direct (1.0) | |
| `Hard Disk Description` | `storage_type` | direct (1.0) | Values: "SSD", "NVMe SSD", "HDD" |
| `Screen Size` | `display_size` | direct (1.0) | Format: "15.6 Inches" |
| `Native Resolution` | `display_resolution` | direct (1.0) | Format: "1920 x 1200 pixels" |
| `Refresh Rate` | `refresh_rate` | direct (1.0) | Format: "120 hertz" |
| `Item Weight` | `weight` | direct (1.0) | Units: "2600 Grams" or "1.79 kg" |
| `Operating System` | `os` | direct (1.0) | |
| `Colour` | - | - | Not in canonical schema |

**Important: Spec Key Variations**
Amazon uses inconsistent spec key names across products. The normalizer handles this via alias mapping:
- CPU: primary "CPU Model", alternates ["Processor", "CPU", "Processor Type"]
- GPU: primary "Graphics Co Processor", alternates ["Graphics", "GPU"]
- RAM: primary "RAM Memory Installed Size", alternates ["RAM", "System Memory"]
- Storage: primary "Hard Disk Size", alternates ["Storage", "Hard Disk Capacity"]
- Display: primary "Screen Size", alternates ["Display Size", "Screen"]

**Critical Note:** Amazon India does NOT use JSON-LD structured data for products. All data is in HTML or Amazon's proprietary `type="a-state"` scripts.

---

### 2.2 Flipkart.com

**Source Type:** Entirely client-side rendered (React/Next.js). Static HTML shell loads and populates via JavaScript.

**Critical Issue:** Current scraper uses CSS selectors that are likely broken:
- `.s1Q9rs` - product title (minified class)
- `._2WkVRQ` - product title variant (minified class)
- `._30jeq3` - price (may still work, commonly used pattern)
- `._1AtVbN3` - product container (minified class)

**Observed Flipkart Class Names (from analysis):**
- Header: `.CgvN2_`, `.nzadEb`, `.VQf4aO` (minified)
- Error page classes: `.errorImg`, `.cartContainer`, `.errorTitle`

**Flipkart URL Patterns:**
- Search: `https://www.flipkart.com/search?q={keyword}&page={page}`
- Product: `https://www.flipkart.com/products/{pid}`

**Flipkart Product Page Selectors (May Need Updating):**

| Field | Original Selector | Observed Class | Status |
|-------|-------------------|----------------|--------|
| Title | `._3eWWRT` or `.B_NuCI` | `.B_NuCI` | Likely works |
| Brand | `._2mFc1k` | | Likely works |
| Price | `._30jeq3` | | Likely works |
| Original Price | `._3I9_wc` | | Likely works |
| Discount | `._3fVaIS` | | Likely works |
| Rating | `._1KFV8` or `.hGSR34` | | Likely works |
| Specs | `._1dVbuJ` rows | | Likely works |

**Spec Table Structure (Flipkart):**
```
Container: ._1dVbuJ
Label:     ._2mLtmQ
Value:     ._2vZ0Px
```

---

## 3. Canonical Schema Proposal

The existing schema in `SCHEMA.md` is well-designed. No changes recommended at this time.

**Schema Summary:**

```typescript
{
  brand: string,              // Manufacturer
  model_family: string|null,  // Product line
  model_name: string,         // Full model
  cpu: string,                // Processor
  gpu: string,                // Graphics
  ram: number,                // GB
  ram_type: string|null,      // DDR5, LPDDR4X
  storage: number,            // GB
  storage_type: string,       // SSD, NVMe SSD, HDD
  display_size: number,       // Inches
  display_resolution: string|null, // "1920x1080"
  refresh_rate: number|null, // Hz
  panel_type: string|null,    // IPS, OLED
  weight: number|null,        // kg
  os: string|null,            // Windows 11
  price: number,              // INR
  original_price: number|null,
  discount_percent: number|null,
  seller: string|null,
  rating: number|null,
  review_count: number|null,
  availability: string|null,
  product_url: string,
  image_url: string|null,
  source: 'amazon_in' | 'flipkart',
  source_sku: string,
  last_seen: string,          // ISO 8601
}
```

---

## 4. Source-Specific Extraction Rules

### 4.1 Amazon.in Rules

**Anti-Bot Detection Patterns:**
```javascript
// Check for these in page content:
- "To discuss automated access" (human verification page)
- "Sign in to your account" (login wall)
- CAPTCHA presence
- " робот" or "bot" (Russian for robot detection)
```

**Recommended Wait Strategy:**
```javascript
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
// networkidle waits for all network requests to complete
// Alternative: await page.waitForSelector('#productTitle', { timeout: 30000 });
```

**Rate Limiting:**
- Amazon.in: 5-10 requests/minute with random jitter
- Implement exponential backoff on 429/503 responses

**Selector Robustness:**
```javascript
// SPEC TABLE - Use #poExpander for reliability
const specRows = await page.locator('#poExpander table tr').all();

// Fallback if #poExpander not found
const specRows = await page.locator('#productDetails_feature_div table tr').all();
```

### 4.2 Flipkart.com Rules

**Critical:** Flipkart requires JavaScript execution to render content. Playwright's `networkidle` may not be sufficient.

**Recommended Wait Strategy:**
```javascript
// Wait for specific content to appear
await page.goto(url, { timeout: 60000 });
await page.waitForSelector('._3eWWRT, .B_NuCI, ._1AtVbN3', { timeout: 30000 });
// Then wait additional time for React hydration
await page.waitForTimeout(2000);
```

**Selector Robustness:**
```javascript
// Title - try multiple selectors
const title = await page.locator('._3eWWRT').textContent().catch(() =>
  page.locator('.B_NuCI').textContent().catch(() => '')
);

// Specs - ensure container exists before iterating
const specContainer = await page.locator('._1dVbuJ').first();
if (await specContainer.isVisible()) {
  const specRows = await specContainer.locator('tr').all();
}
```

**Rate Limiting:**
- Flipkart: 8-12 requests/minute with jitter
- Flipkart is more aggressive with anti-bot detection

---

## 5. Sample Records

### 5.1 Amazon.in Sample

**Source:** HP OmniBook 5 (ASIN: B0F3HQKGMN)

```json
{
  "asin": "B0F3HQKGMN",
  "url": "https://www.amazon.in/HP-Smartchoice-OmniBook-Previously-Pavilion-Pre-installed/dp/B0F3HQKGMN/",
  "title": "HP Smartchoice OmniBook 5 AMD Ryzen 5 340 (16 GB DDR5X/512 GB SSD/39.6 cm(15.6) WUXGA/Win 11/MS Office/AMD Radeon Graphics/Backlit Keyboard/FPR/Star Black) 15-em0501AU Laptop",
  "brand": "HP",
  "price": 62990,
  "originalPrice": 81999,
  "discount": 23,
  "rating": 4.1,
  "reviewCount": 184,
  "seller": "Amazon.in",
  "availability": "In stock",
  "imageUrl": "https://m.media-amazon.com/images/I/617foMrYIPL._SX522_.jpg",
  "specs": {
    "Brand": "HP",
    "Processor Type": "AMD Ryzen 5",
    "Processor Speed": "4.8 GHz",
    "Processor Count": "1",
    "Graphics Co-Processor": "AMD Radeon Graphics",
    "RAM Memory Installed Size": "16 GB",
    "RAM Memory Technology": "LPDDR5X",
    "Hard Disk Size": "512 GB",
    "Hard Disk Description": "SSD",
    "Screen Size": "15.6 Inches",
    "Native Resolution": "1920 x 1200 pixels",
    "Refresh Rate": "60 Hz",
    "Item Weight": "1.79 kg",
    "Operating System": "Windows 11"
  },
  "capturedAt": "2026-04-09T00:00:00.000Z"
}
```

**Normalized Output:**
```json
{
  "brand": "HP",
  "model_family": "OmniBook",
  "model_name": "HP Smartchoice OmniBook 5 AMD Ryzen 5 340",
  "cpu": "AMD Ryzen 5",
  "gpu": "AMD Radeon Graphics",
  "ram": 16,
  "ram_type": "LPDDR5X",
  "storage": 512,
  "storage_type": "SSD",
  "display_size": 15.6,
  "display_resolution": "1920x1200",
  "refresh_rate": 60,
  "panel_type": null,
  "weight": 1.79,
  "os": "Windows 11",
  "price": 62990,
  "original_price": 81999,
  "discount_percent": 23,
  "seller": "Amazon.in",
  "rating": 4.1,
  "review_count": 184,
  "availability": "In stock",
  "product_url": "https://www.amazon.in/dp/B0F3HQKGMN/",
  "image_url": "https://m.media-amazon.com/images/I/617foMrYIPL._SX522_.jpg",
  "source": "amazon_in",
  "source_sku": "B0F3HQKGMN",
  "last_seen": "2026-04-09T00:00:00.000Z"
}
```

---

## 6. Edge-Case Catalog

### 6.1 Specification Field Variations

**CPU Field Naming (Amazon):**
| Variation | Normalize To |
|-----------|--------------|
| `Processor` | `cpu` |
| `CPU Model` | `cpu` |
| `Processor Type` | `cpu` |
| `Processor Name` | `cpu` |

**RAM Field Naming (Amazon):**
| Variation | Normalize To |
|-----------|--------------|
| `RAM Memory Installed Size` | `ram` |
| `System Memory` | `ram` |
| `Memory` | `ram` |
| `RAM` | `ram` |

**Storage Field Naming (Amazon):**
| Variation | Normalize To |
|-----------|--------------|
| `Hard Disk Size` | `storage` |
| `SSD Storage` | `storage` |
| `Storage` | `storage` |

**Display Field Naming (Amazon):**
| Variation | Normalize To |
|-----------|--------------|
| `Screen Size` | `display_size` |
| `Display Size` | `display_size` |
| `Display Size (cm)` | `display_size` (convert cm to inches) |

**Display Resolution Variations:**
| Variation | Normalize To |
|-----------|--------------|
| `1920 x 1080 pixels` | `1920x1080` |
| `1920x1080` | `1920x1080` |
| `FHD (1920 x 1080)` | `1920x1080` |
| `WUXGA (1920 x 1200)` | `1920x1200` |

**Weight Unit Variations:**
| Variation | Normalize To |
|-----------|--------------|
| `1.79 kg` | 1.79 |
| `1790 g` | 1.79 |
| `1.79 Kilograms` | 1.79 |

### 6.2 Title Extraction Edge Cases

**CPU Model Parsing Incompleteness:**
- Amazon spec "CPU Model" field often contains only family-level info (e.g., "Core i5", "Ryzen 5") not full model
- Full model numbers (i5-13450HX, Ryzen 5 5600H) must be parsed from title if needed
- Example: Spec shows "Core i5" but title has "13th Gen Intel Core i5-13450HX"
- Current regex: `Intel\s+Core\s+(?:i[3579]-\d+[A-Z]?\d*)` captures full model from title
- Recommendation: Use spec for family, title for full model number

**RAM Type Detection Failures:**
- Title patterns like "16GB DDR5" or "16 GB DDR4X" work
- But "16GB LPDDR5" may not match DDR5 pattern
- Current regex: `/\d+\s*GB\s+(DDR\d+|LPDDR\d+X?)/i` - may miss some variants
- Fallback: null if not found

**Storage Dual-Drive Products:**
- Products with multiple drives (e.g., "512GB SSD + 1TB HDD")
- Current extraction only gets first drive from spec "Hard Disk Size"
- May need enhancement to handle dual-drive notation
- Example: "1 TB" + "256 GB" SSDs

**Bundle Products:**
- Title: `"ASUS ROG Strix G15, Intel i7, 16GB RAM, 512GB SSD, Gaming Laptop (10% off)"`  
- Issue: Contains discount text
- Solution: Remove patterns matching `\(.*\)$`, `\|.*$`, `\+.*$`

**Color Variants:**
- Title: `"Lenovo ThinkPad X1 Carbon, 14 inch, Black, 16GB RAM"`  
- Issue: Color included in title
- Solution: Model family extraction should handle color suffix

**Processor Generation in Title:**
- Title: `"Dell Inspiron 15, Intel Core i7-13650HX, RTX 4050, 16GB RAM"`  
- Issue: Full processor model may be in title
- Solution: Regex `Intel\s+Core\s+(?:i[3579]-\d+[A-Z]?\d*)`

### 6.3 Price Edge Cases

| Scenario | Handling |
|----------|----------|
| No price shown | Skip listing, mark as failed |
| Price = 0 | Skip listing |
| Original price < current price | Set original_price = null, discount = null |
| Exchange offer prices | Ignore exchange, use base price |
| EMI prices | Ignore EMI, use full price |

### 6.4 Variant Products (SKU Mapping)

**Amazon Variants:**
- HP OmniBook 5 has variants: Ryzen 5/16GB, Ryzen 7/16GB, Ryzen 7/24GB
- Each variant has different ASIN
- Selection made via `data-asin` on listing page

**Flipkart Variants:**
- Color/size variants within same PID
- Price/spec differences within same product page
- Need to capture variant-specific info from dropdown selections

### 6.5 Missing Fields

| Field | Fallback Strategy |
|-------|-------------------|
| `brand` | Extract from title first word, if known brand list |
| `cpu` | Infer from title, fallback to "Unknown" |
| `gpu` | Infer from title (NVIDIA/AMD patterns), fallback to "Unknown" |
| `ram` | Infer from title (XX GB pattern), fallback to 0 |
| `storage` | Infer from title (XX GB/TB pattern), fallback to 0 |
| `display_size` | Infer from title (XX.X inches), fallback to 0 |
| `weight` | Leave null, not critical |
| `panel_type` | Leave null, confidence = 0.4 (only from title if explicit) |

---

## 7. Breakage Risks & Fallbacks

### 7.1 Anti-Bot Detection

**Risk Level:** HIGH

**Symptoms:**
- 403 Forbidden responses
- CAPTCHA pages
- "Sign in to continue" walls
- Human verification pages

**Mitigation Strategies:**
1. **Rate Limiting**
   - Amazon: Max 6 requests/minute
   - Flipkart: Max 8 requests/minute
   - Add 2-5 second random delays between requests

2. **User Agent Rotation**
   - Maintain pool of 10+ real browser UAs
   - Rotate randomly per request

3. **Session Management**
   - Fresh browser context per scraping session
   - Clear cookies between sessions

4. **Exponential Backoff**
   - On 429: Wait calculated backoff, retry up to 3 times
   - On CAPTCHA: Pause scraping for 10-30 minutes

5. **Proxy Rotation** (Future)
   - Residential proxy pool
   - Geolocation targeting to IN region

### 7.2 Selector Breakage

**Risk Level:** MEDIUM (Flipkart), LOW (Amazon)

**Amazon Selectors:** Stable, use semantic IDs (`#productTitle`, `#bylineInfo`)

**Flipkart Selectors:** Unstable, minified CSS classes change frequently

**Fallback Strategy:**
```javascript
async extractWithFallback(page, selectors) {
  for (const selector of selectors) {
    const element = await page.locator(selector).first();
    if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
      return await element.textContent();
    }
  }
  return null;
}
```

### 7.3 Spec Table Format Changes

**Risk Level:** LOW

Amazon occasionally changes spec table structure. The current extractor targets `#poExpander table tr` which has been stable.

**Fallback:** If #poExpander fails, try `#productDetails_feature_div table`

### 7.4 Data Inconsistency

**Risk Level:** MEDIUM

**Scenario:** Same model on Amazon vs Flipkart has different specs listed.

**Mitigation:**
- Store raw source data separately
- Maintain per-source confidence scores
- Flag normalization results with overall confidence < 70%

### 7.5 Price Currency/Conversion

**Risk Level:** LOW

Both sources list prices in INR (₹). No conversion needed for indian market.

**Validation:** Ensure extracted price > 0 and < 10,000,000 (reasonable laptop price ceiling).

### 7.6 Out of Stock / Unavailable

**Risk Level:** MEDIUM

Products may become unavailable between scraping and storage.

**Handling:**
- Set `availability` field to "Out of Stock" or "Currently Unavailable"
- Keep listing in database (don't delete)
- Set `price` = null or last known price with flag

---

## 7.5 Implementation Verification (2026-04-09)

### Verified vs Documented Discrepancies

After reviewing the actual implementation against this document, the following discrepancies were found:

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| `ram_type` extraction | Medium | Documented as direct from spec, but normalizer does NOT extract `RAM Memory Technology` from specs - only infers from title. Spec key may not exist on all pages. | Documented correctly as fallback to "Unknown" |
| `panel_type` extraction | Low | Not available in Amazon spec table. Only inferred from title (IPS/OLED/LED/TN/WVA pattern) with 0.4 confidence. Correctly documented. | Accurate |
| `model_family` extraction | Low | Hardcoded regex patterns for: G15, ThinkPad, Pavilion, Surface, MacBook, VivoBook, Rog, Strix, Gaming, ProBook, Inspiron, XPS, Legion. May miss newer product lines. | Known limitation |
| Spec key aliases | Info | Normalizer uses `FLIPKART_SPEC_ALIASES` for BOTH Amazon and Flipkart. This is intentional - same alias keys work for both sources. | Works as designed |

### Verified Selector Stability

| Selector | Stability | Notes |
|----------|-----------|-------|
| `#productTitle` | HIGH | Stable semantic ID |
| `#bylineInfo` | HIGH | Stable semantic ID |
| `#poExpander table tr` | HIGH | Observed stable across HP, Dell products |
| `#acrPopover .a-icon-alt` | MEDIUM | May need regex update if Amazon changes rating format |
| `.a-color-price` | MEDIUM | Discount display - may vary |

### Verified Normalization Accuracy (from test fixtures)

Test fixture Dell G15 (ASIN: B0CRKXDX83) with specs:
- CPU: "Core i5" extracted (only partial - missing full model "i5-13450HX")
- GPU: "NVIDIA GeForce RTX 3050" extracted correctly
- RAM: 16 GB extracted from "16 GB" ✓
- Storage: 2048 GB extracted from "1 TB" (correctly converts TB to GB) ✓
- Weight: 2.6 kg extracted from "2600 Grams" ✓

**Issue Found**: The `cpu` field only extracts "Core i5" not the full "i5-13450HX" because the Amazon spec only contains "Core i5". This is a data quality issue from Amazon's side, not extraction.

---

## 8. Implementation Notes

**Deliverables:**
1. Updated Amazon scraper with spec table extraction using `#poExpander`
2. Updated Flipkart scraper with robust selector fallback
3. Proper wait conditions for React hydration on Flipkart

**Key Selectors to Use:**

Amazon Product Page:
```javascript
// Title
'#productTitle'
// Brand
'#bylineInfo'
// Specs
'#poExpander table tr'
// Each row: .a-span3 (label), .a-span9 (value)
```

Flipkart Product Page:
```javascript
// Title (try in order)
'._3eWWRT', '.B_NuCI'
// Brand
'.B_NuCI', '._2mFc1k'
// Specs
'._1dVbuJ tr'
// Each row: ._2mLtmQ (label), ._2vZ0Px (value)
```

### 8.2 Frontend Engineer

**Filterable Fields (User-Facing):**
- brand (exact match)
- cpu (contains)
- gpu (contains)
- ram (range: 4-128 GB)
- storage (range: 128-4000 GB)
- display_size (range: 10-20 inches)
- price (range: 20,000-500,000 INR)
- source (amazon_in | flipkart)
- rating (range: 0-5)
- availability (In Stock | Out of Stock)

**Display Fields:**
- All canonical fields are displayable
- Key specs: brand, model_name, cpu, ram, storage, display_size, price

### 8.3 QA Engineer

**Test Fixtures Available in Codebase:**

1. **Unit Test Fixtures** (`tests/normalizer.test.ts`):
   - Dell G15 (ASIN: B0CRKXDX83) - Full specs, gaming laptop, RTX 3050
   - HP Pavilion-like fixture - Core i7, RTX 2050, 144Hz display
   - Generic/Empty fixtures - For missing field testing

2. **Edge Case Fixtures in Tests:**
   - Weight normalization (grams to kg): `'Item Weight': '2600 Grams'` → 2.6 kg
   - Storage TB normalization: `'Hard Disk Size': '2 TB'` → 2048 GB
   - Discount calculation: price=50000, original=100000 → 50%
   - Price inversion guard: price > original → null discount

3. **Additional Edge Cases to Test:**
   - Bundle products (keyboard/mouse included in box)
   - Exchange-only pricing (remove exchange value)
   - Out of stock items (availability = "Out of Stock")
   - Products with variant dropdowns (color/RAM/storage options)
   - Title-only extraction (when specs table is empty)
   - Prime-only products (limited availability)

**Expected Validation Rules:**
- All required fields (brand, model_name, cpu, gpu, ram, storage, display_size, price) must be non-empty after normalization
- Price must be > 0
- source_sku must match source format (ASIN: 10 alphanumeric, PID: variable)
- URL must be valid and point to correct source
- storage must be normalized to GB (1 TB = 1024 GB)
- weight must be normalized to kg (if in grams, divide by 1000)
- display_size must be numeric (inches)
- refresh_rate must be integer Hz
- rating must be 0-5
- discount_percent must be 0-100

---

## 9. Open Questions

1. **Flipkart spec reliability:** The Flipkart selectors need live testing to confirm they work. Recommend first round of testing with actual Flipkart pages.

2. **Variant handling:** Should we store variant-specific data (e.g., different colors of same laptop) as separate records or consolidate?

3. **Price tracking:** Should we maintain historical price data, or only current price?

4. **Out of stock handling:** Should out-of-stock items be excluded from API responses by default?

5. **Review count accuracy:** Amazon and Flipkart both show cached review counts. Acceptable variance?

6. **CPU model completeness:** Amazon spec tables often show only "Core i5" not full "i5-13450HX". Should we invest in title-parsing to augment spec data?

7. **RAM type reliability:** `RAM Memory Technology` key may not exist on all Amazon pages. Current inference from title has limited coverage. Accept null ram_type for many products?

8. **Dual-storage products:** Products with SSD + HDD combos store total in `Hard Disk Size`. Should we capture both drive sizes separately?

---

## 10. Appendix: Observed CSS Classes

### Amazon Common Classes

```
// Product listing
.s-result-item         - Main product container
[data-asin]           - Product with ASIN attribute
.a-link-normal        - Product link
.a-price .a-offscreen - Current price
.a-text-price .a-offscreen - Original price
.a-icon-star-small    - Rating stars
.s-image              - Product image

// Product detail
#productTitle         - Product title
#bylineInfo           - Brand link
#acrPopover           - Rating section
#acrCustomerReviewText - Review count
#soldByThirdParty     - Seller info
#availability         - Stock status
#landingImage         - Main product image
#poExpander           - Specs table container
```

### Flipkart Common Classes (Minified)

```
// These change frequently - use with caution
._30jeq3              - Price (most stable)
._3I9_wc              - Original price
._3fVaIS              - Discount
._1AtVbN3             - Product card container
._1fQZEK              - Product link
.s1Q9rs               - Title variant
._2WkVRQ              - Title variant
B_NuCI                - Title (in newer design)
._3eWWRT              - Title alternative
._2mFc1k              - Brand
._1dVbuJ              - Specs table
._2mLtmQ              - Spec label
._2vZ0Px              - Spec value
```

---

**End of Document**
