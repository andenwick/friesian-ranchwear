import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getProductsFromSheet } from '@/lib/sheets';

/**
 * Get products - uses database if available, falls back to Google Sheets
 */
export async function GET() {
  try {
    // Try database first if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      try {
        const products = await getProductsFromDatabase();
        if (products.length > 0) {
          return NextResponse.json(products, { status: 200 });
        }
        // If database is empty, fall through to sheets
      } catch (dbError) {
        console.warn('Database fetch failed, falling back to sheets:', dbError.message);
      }
    }

    // Fallback to Google Sheets
    const products = await getProductsFromSheet();
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * Get products from database with variants and images
 */
async function getProductsFromDatabase() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
      },
      images: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to match the current API response format
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: `$${product.basePrice}`,
    imageUrl: product.images[0]?.url || null,
    images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      stock: v.stock,
      price: v.price ? `$${v.price}` : null,
      sku: v.sku,
    })),
    hasVariants: product.variants.length > 0,
    inStock: product.variants.some((v) => v.stock > 0),
  }));
}
