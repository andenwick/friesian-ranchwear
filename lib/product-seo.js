import { cache } from 'react';
import { prisma } from '@/lib/db';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/** Loads an active product for metadata and structured data. Cached per request. */
export const getProductForSeo = cache(async (id) => {
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
  try {
    return await prisma.product.findFirst({
      where: { id, active: true },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { select: { price: true, stock: true, sku: true } },
      },
    });
  } catch {
    // Metadata must never take the page down; fall back to site defaults.
    return null;
  }
});

/**
 * Cloudinary can crop and pad on the fly. Share cards want 1200x630, so ask for
 * that size; other hosts are returned unchanged.
 */
export function shareImageUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return null;
  const marker = '/image/upload/';
  if (url.includes('res.cloudinary.com') && url.includes(marker)) {
    return url.replace(marker, `${marker}c_pad,b_rgb:0c0c0c,w_1200,h_630,f_jpg,q_auto/`);
  }
  return url;
}

export function productDescription(product) {
  const text = (product.description || '').replace(/\s+/g, ' ').trim();
  if (!text) return `${product.name} by ${SITE_NAME}.`;
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

function lowestPrice(product) {
  const prices = [Number(product.basePrice)];
  for (const variant of product.variants) {
    if (variant.price != null) prices.push(Number(variant.price));
  }
  return Math.min(...prices.filter((price) => Number.isFinite(price)));
}

/** schema.org Product markup so search engines can show price and stock. */
export function productJsonLd(product) {
  const url = `${SITE_URL}/products/${product.id}`;
  const images = product.images
    .map((image) => image.url)
    .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.startsWith('https://'));
  const inStock = product.variants.some((variant) => variant.stock > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.trim(),
    description: productDescription(product),
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.category ? { category: product.category } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: lowestPrice(product).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

/** JSON for a <script> tag; escapes "<" so product text can't close the tag. */
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
