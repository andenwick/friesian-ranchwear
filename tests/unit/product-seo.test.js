import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

const {
  productDescription,
  productJsonLd,
  serializeJsonLd,
  shareImageUrl,
} = await import('../../lib/product-seo');

const product = {
  id: 'prod_1',
  name: 'FRW Blue Bull ',
  description: 'Structured   six-panel\nhat.',
  basePrice: '44.99',
  category: 'Hats',
  images: [
    { url: 'https://res.cloudinary.com/demo/image/upload/v1/friesian/hat.jpg' },
    { url: '/api/image?id=legacy' },
  ],
  variants: [
    { price: null, stock: 0, sku: 'A' },
    { price: '39.99', stock: 3, sku: 'B' },
  ],
};

describe('shareImageUrl', () => {
  it('asks Cloudinary for a 1200x630 card', () => {
    expect(shareImageUrl(product.images[0].url)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:0c0c0c,w_1200,h_630,f_jpg,q_auto/v1/friesian/hat.jpg'
    );
  });

  it('passes other https hosts through and rejects relative or missing urls', () => {
    expect(shareImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(shareImageUrl('/api/image?id=x')).toBeNull();
    expect(shareImageUrl(undefined)).toBeNull();
  });
});

describe('productDescription', () => {
  it('collapses whitespace and caps the length', () => {
    expect(productDescription(product)).toBe('Structured six-panel hat.');
    const long = productDescription({ ...product, description: 'x'.repeat(300) });
    expect(long.length).toBe(160);
    expect(long.endsWith('...')).toBe(true);
  });

  it('falls back to the product name', () => {
    expect(productDescription({ ...product, description: null })).toBe('FRW Blue Bull  by Friesian Ranchwear.');
  });
});

describe('productJsonLd', () => {
  it('uses the lowest price, real stock and only absolute images', () => {
    const data = productJsonLd(product);
    expect(data['@type']).toBe('Product');
    expect(data.offers.price).toBe('39.99');
    expect(data.offers.priceCurrency).toBe('USD');
    expect(data.offers.availability).toBe('https://schema.org/InStock');
    expect(data.image).toEqual([product.images[0].url]);
    expect(data.url).toBe('https://friesianranchwear.com/products/prod_1');
  });

  it('reports out of stock when no variant has stock', () => {
    const data = productJsonLd({ ...product, variants: [{ price: null, stock: 0 }] });
    expect(data.offers.availability).toBe('https://schema.org/OutOfStock');
    expect(data.offers.price).toBe('44.99');
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the surrounding script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
