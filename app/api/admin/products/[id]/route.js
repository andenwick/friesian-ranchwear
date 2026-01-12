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

// GET /api/admin/products/[id] - Get single product
export async function GET(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await request.json();
    const { name, description, basePrice, category, features, active, variants, images } = data;

    if (!name || basePrice === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Convert features array to JSON string for storage
    const featuresJson = features && features.length > 0
      ? JSON.stringify(features.filter(f => f.trim()))
      : null;

    // Update product in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Update main product
      await tx.product.update({
        where: { id },
        data: {
          name,
          description: description || '',
          basePrice: parseFloat(basePrice),
          category: category || null,
          features: featuresJson,
          active: active !== false,
        },
      });

      // Handle variants: delete removed, update existing, create new
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
      });
      const existingVariantIds = existingVariants.map(v => v.id);
      const incomingVariantIds = (variants || []).filter(v => v.id).map(v => v.id);

      // Delete variants not in incoming list
      const variantsToDelete = existingVariantIds.filter(vid => !incomingVariantIds.includes(vid));
      if (variantsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: variantsToDelete } },
        });
      }

      // Update or create variants
      for (const v of variants || []) {
        if (v.id && existingVariantIds.includes(v.id)) {
          // Update existing
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              size: v.size || null,
              color: v.color || null,
              price: v.price ? parseFloat(v.price) : null,
              stock: parseInt(v.stock) || 0,
              sku: v.sku || null,
            },
          });
        } else if (!v.id) {
          // Create new
          await tx.productVariant.create({
            data: {
              productId: id,
              size: v.size || null,
              color: v.color || null,
              price: v.price ? parseFloat(v.price) : null,
              stock: parseInt(v.stock) || 0,
              sku: v.sku || null,
            },
          });
        }
      }

      // Handle images: delete removed, update existing, create new
      const existingImages = await tx.productImage.findMany({
        where: { productId: id },
      });
      const existingImageIds = existingImages.map(i => i.id);
      const incomingImageIds = (images || []).filter(i => i.id).map(i => i.id);

      // Delete images not in incoming list
      const imagesToDelete = existingImageIds.filter(iid => !incomingImageIds.includes(iid));
      if (imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: imagesToDelete } },
        });
      }

      // Update or create images
      for (let index = 0; index < (images || []).length; index++) {
        const img = images[index];
        if (img.id && existingImageIds.includes(img.id)) {
          // Update existing
          await tx.productImage.update({
            where: { id: img.id },
            data: {
              url: img.url,
              alt: img.alt || name,
              position: index,
            },
          });
        } else if (!img.id && img.url) {
          // Create new
          await tx.productImage.create({
            data: {
              productId: id,
              url: img.url,
              alt: img.alt || name,
              position: index,
            },
          });
        }
      }

      // Return updated product
      return tx.product.findUnique({
        where: { id },
        include: {
          variants: true,
          images: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Delete product (cascade will handle variants and images)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
