import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import {
  deleteProductImage,
  getProductImagePublicId,
  getSafeImageErrorDetails,
} from '@/lib/product-image-storage';
import { inventoryRevision } from '@/lib/product-edit-version';

async function cleanupStoredProductImages(urls) {
  for (const url of urls) {
    const publicId = getProductImagePublicId(url);
    if (!publicId) continue;

    try {
      await deleteProductImage({ publicId, cloudinaryClient: cloudinary });
    } catch (error) {
      console.error('Stored product image cleanup failed:', getSafeImageErrorDetails(error));
    }
  }
}

// Middleware to check admin access
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin ? session : null;
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

    return NextResponse.json({
      ...product,
      editVersion: {
        productUpdatedAt: product.updatedAt.toISOString(),
        inventoryRevision: inventoryRevision(product.variants),
      },
    });
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
    const {
      name,
      description,
      basePrice,
      category,
      features,
      active,
      variants,
      images,
      editVersion,
    } = data;

    if (!name || basePrice === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }
    const expectedProductUpdatedAt = new Date(editVersion?.productUpdatedAt || '');
    if (
      Number.isNaN(expectedProductUpdatedAt.getTime()) ||
      !/^[a-f0-9]{64}$/.test(editVersion?.inventoryRevision || '')
    ) {
      return NextResponse.json(
        { error: 'This edit is missing its concurrency version. Reload and try again.' },
        { status: 409 }
      );
    }

    // Convert features array to JSON string for storage
    const featuresJson = features && features.length > 0
      ? JSON.stringify(features.filter(f => f.trim()))
      : null;

    // Update product in a transaction
    let removedImageUrls = [];
    const product = await prisma.$transaction(async (tx) => {
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
      });
      if (inventoryRevision(existingVariants) !== editVersion.inventoryRevision) {
        const error = new Error('Product inventory changed while this page was open. Reload before saving.');
        error.code = 'STALE_PRODUCT_EDIT';
        throw error;
      }

      // Compare-and-set the product so a second admin cannot silently overwrite
      // edits made after this page loaded.
      const updatedProduct = await tx.product.updateMany({
        where: { id, updatedAt: expectedProductUpdatedAt },
        data: {
          name,
          description: description || '',
          basePrice: parseFloat(basePrice),
          category: category || null,
          features: featuresJson,
          active: active !== false,
        },
      });
      if (updatedProduct.count === 0) {
        const error = new Error('Product changed while this page was open. Reload before saving.');
        error.code = 'STALE_PRODUCT_EDIT';
        throw error;
      }

      // Handle variants: delete removed, update existing, create new
      const existingVariantIds = existingVariants.map(v => v.id);
      const existingVariantMap = new Map(existingVariants.map(v => [v.id, v]));
      const incomingVariantIds = (variants || []).filter(v => v.id).map(v => v.id);
      if (incomingVariantIds.some(variantId => !existingVariantMap.has(variantId))) {
        const error = new Error('The edit contains a variant that does not belong to this product. Reload and try again.');
        error.code = 'INVALID_PRODUCT_EDIT';
        throw error;
      }

      // Delete variants not in incoming list
      const variantsToDelete = existingVariantIds.filter(vid => !incomingVariantIds.includes(vid));
      if (variantsToDelete.length > 0) {
        const usedVariantCount = await tx.orderItem.count({
          where: { variantId: { in: variantsToDelete } },
        });
        if (usedVariantCount > 0) {
          const error = new Error('A sold variant cannot be removed. Set its stock to 0 instead.');
          error.code = 'VARIANT_HAS_ORDER_HISTORY';
          throw error;
        }
        for (const variantId of variantsToDelete) {
          const deleted = await tx.productVariant.deleteMany({
            where: {
              id: variantId,
              productId: id,
              updatedAt: existingVariantMap.get(variantId).updatedAt,
              stock: existingVariantMap.get(variantId).stock,
            },
          });
          if (deleted.count === 0) {
            const error = new Error('Product inventory changed while this page was open. Reload before saving.');
            error.code = 'STALE_PRODUCT_EDIT';
            throw error;
          }
        }
      }

      // Update or create variants
      for (const v of variants || []) {
        if (v.id && existingVariantIds.includes(v.id)) {
          // Update existing
          const updatedVariant = await tx.productVariant.updateMany({
            where: {
              id: v.id,
              productId: id,
              updatedAt: existingVariantMap.get(v.id).updatedAt,
              stock: existingVariantMap.get(v.id).stock,
            },
            data: {
              size: v.size || null,
              color: v.color || null,
              price: v.price ? parseFloat(v.price) : null,
              stock: parseInt(v.stock) || 0,
              sku: v.sku || null,
            },
          });
          if (updatedVariant.count === 0) {
            const error = new Error('Product inventory changed while this page was open. Reload before saving.');
            error.code = 'STALE_PRODUCT_EDIT';
            throw error;
          }
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
      if (incomingImageIds.some(imageId => !existingImageIds.includes(imageId))) {
        const error = new Error('The edit contains an image that does not belong to this product. Reload and try again.');
        error.code = 'INVALID_PRODUCT_EDIT';
        throw error;
      }

      // Delete images not in incoming list
      const imagesToDelete = existingImageIds.filter(iid => !incomingImageIds.includes(iid));
      if (imagesToDelete.length > 0) {
        removedImageUrls = existingImages
          .filter(image => imagesToDelete.includes(image.id))
          .map(image => image.url);
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

    await cleanupStoredProductImages(removedImageUrls);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to update product:', error);
    if (error?.code === 'VARIANT_HAS_ORDER_HISTORY') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.code === 'STALE_PRODUCT_EDIT') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.code === 'INVALID_PRODUCT_EDIT') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A SKU is already in use or this size and color variant already exists.' },
        { status: 409 }
      );
    }
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

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        images: { select: { url: true } },
        variants: {
          select: {
            _count: { select: { orderItems: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.variants.some(variant => variant._count.orderItems > 0)) {
      return NextResponse.json(
        { error: 'This product has order history and cannot be deleted. Set it inactive instead.' },
        { status: 409 }
      );
    }

    // Delete product (cascade will handle variants and images)
    await prisma.product.delete({
      where: { id },
    });

    await cleanupStoredProductImages(product.images.map(image => image.url));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
