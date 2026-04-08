import { z } from 'zod';

export const CanonicalLaptopSchema = z.object({
  brand: z.string(),
  model_family: z.string().nullable(),
  model_name: z.string(),
  cpu: z.string(),
  gpu: z.string(),
  ram: z.number().int().positive(),
  ram_type: z.string().nullable(),
  storage: z.number().int().positive(),
  storage_type: z.string(),
  display_size: z.number().positive(),
  display_resolution: z.string().nullable(),
  refresh_rate: z.number().int().positive().nullable(),
  panel_type: z.string().nullable(),
  weight: z.number().positive().nullable(),
  os: z.string().nullable(),
  price: z.number().int().nonnegative(),
  original_price: z.number().int().nonnegative().nullable(),
  discount_percent: z.number().int().min(0).max(100).nullable(),
  seller: z.string().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  review_count: z.number().int().nonnegative().nullable(),
  availability: z.string().nullable(),
  product_url: z.string().url(),
  image_url: z.string().url().nullable(),
  source: z.enum(['amazon_in', 'flipkart']),
  source_sku: z.string(),
  last_seen: z.string().datetime(),
});

export type CanonicalLaptop = z.infer<typeof CanonicalLaptopSchema>;

export interface NormalizationResult {
  laptop: CanonicalLaptop;
  confidence: Record<keyof CanonicalLaptop, number>;
  extraction_notes: string[];
}

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  source: 'direct' | 'inferred' | 'missing';
}