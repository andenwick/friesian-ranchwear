import { SITE_NAME } from '@/lib/site';
import {
  getProductForSeo,
  productDescription,
  productJsonLd,
  serializeJsonLd,
  shareImageUrl,
} from '@/lib/product-seo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductForSeo(id);
  if (!product) return {};

  const description = productDescription(product);
  // Child openGraph replaces the root one, so fall back to the default card explicitly.
  const image = shareImageUrl(product.images[0]?.url) || '/og-default.jpg';
  const images = [{ url: image, width: 1200, height: 630, alt: product.name.trim() }];

  return {
    title: product.name.trim(),
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: `${product.name.trim()} | ${SITE_NAME}`,
      description,
      url: `/products/${product.id}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name.trim()} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ProductLayout({ children, params }) {
  const { id } = await params;
  const product = await getProductForSeo(id);

  return (
    <>
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product)) }}
        />
      )}
      {children}
    </>
  );
}
