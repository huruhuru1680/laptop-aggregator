export interface FlipkartListingProduct {
  pid: string;
  url: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string | null;
  isPrime: boolean;
}

export interface FlipkartProductPage {
  pid: string;
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