import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

// Middleware to check admin access
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

// GET /api/admin/products - List all products with variants and images
export async function GET() {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/admin/products - Create a new product
export async function POST(request) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { name, description, basePrice, category, features, active, variants, images } = data;

    if (!name || basePrice === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Convert features array to JSON string for storage
    const featuresJson = features && features.length > 0
      ? JSON.stringify(features.filter(f => f.trim()))
      : null;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        basePrice: parseFloat(basePrice),
        category: category || null,
        features: featuresJson,
        active: active !== false, // Default to true
        variants: {
          create: (variants || []).map((v, index) => ({
            size: v.size || null,
            color: v.color || null,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || null,
          })),
        },
        images: {
          create: (images || []).map((img, index) => ({
            url: img.url,
            alt: img.alt || name,
            position: index,
          })),
        },
      },
      include: {
        variants: true,
        images: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
