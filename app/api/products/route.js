import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getProductsFromSheet } from '@/lib/sheets';

/**
 * Get products - uses database if available, falls back to Google Sheets
 *
 * Query params:
 * - display: "homepage" | "products" - filter by where product should display
 * - id: product ID - get a single product
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const displayFilter = searchParams.get('display');
    const productId = searchParams.get('id');

    let products;

    // Try database first if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      try {
        products = await getProductsFromDatabase();
        if (products.length === 0) {
          // If database is empty, fall through to sheets
          products = null;
        }
      } catch (dbError) {
        console.warn('Database fetch failed, falling back to sheets:', dbError.message);
        products = null;
      }
    }

    // Fallback to Google Sheets
    if (!products) {
      products = await getProductsFromSheet();
    }

    // Filter by product ID if specified
    if (productId) {
      const product = products.find(p => String(p.id) === productId);
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product, { status: 200 });
    }

    // Filter by display location if specified
    if (displayFilter) {
      products = products.filter(product => {
        const display = (product.display || 'Both').toLowerCase();
        if (displayFilter === 'homepage') {
          return display === 'homepage' || display === 'both';
        }
        if (displayFilter === 'products') {
          return display === 'products' || display === 'both';
        }
        return true;
      });
    }

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
  return products.map((product) => {
    // Parse features from JSON string
    let features = [];
    if (product.features) {
      try {
        features = JSON.parse(product.features);
      } catch {
        features = [];
      }
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: `$${product.basePrice}`,
      imageUrl: product.images[0]?.url || null,
      images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
      // Category for filtering
      category: product.category || null,
      // Features / bullet points
      features,
      // Aggregate sizes from variants for filtering
      sizes: [...new Set(product.variants.map((v) => v.size).filter(Boolean))],
      // Display setting (default to Both for database products)
      display: 'Both',
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
    };
  });
}
