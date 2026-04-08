export interface AmazonListingPage {
  products: AmazonListingProduct[];
  nextPageToken: string | null;
  capturedAt: string;
}

export interface AmazonListingProduct {
  asin: string;
  url: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  isPrime: boolean;
}

export interface AmazonProductPage {
  asin: string;
  url: string;
  title: string;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  discount: number | null;
  rating: number | null;
  reviewCount: number | null;
  seller: string | null;
  availability: string | null;
  imageUrl: string | null;
  specs: Record<string, string>;
  capturedAt: string;
}

export interface AmazonSearchParams {
  k: string;
  page?: number;
  rh?: string;
}