import type { Product } from '../types';

const FALLBACK_IMAGE = '/assets/images/product-images/01.webp';

/**
 * Parse product images from various formats (JSON string, array, URL string)
 * into a consistent string array.
 */
export function parseProductImages(images: Product['images'] | undefined): string[] {
  if (!images) return [FALLBACK_IMAGE];

  if (Array.isArray(images)) return images.length > 0 ? images : [FALLBACK_IMAGE];

  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    if (images.startsWith('http')) return [images];
  }

  return [FALLBACK_IMAGE];
}

/**
 * Calculate discount percentage between original and sale price.
 * Returns 0 if no discount applies.
 */
export function getDiscountPercentage(price: number, salePrice?: number): number {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
