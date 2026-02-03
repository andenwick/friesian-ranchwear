import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/products/[id]/reviews - Get approved reviews for a product
export async function GET(request, { params }) {
  try {
    const { id: productId } = await params;

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        approved: true,
      },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Transform for frontend
    const transformedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      authorName: review.user.name || 'Customer',
      createdAt: review.createdAt,
      verified: !!review.orderId, // Has linked order = verified purchaser
    }));

    return NextResponse.json({
      reviews: transformedReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
    });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/products/[id]/reviews - Submit a new review
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Must be logged in to submit a review' }, { status: 401 });
  }

  try {
    const { id: productId } = await params;
    const { rating, title, body } = await request.json();

    // Validate rating (0.5 to 5 in 0.5 increments)
    if (typeof rating !== 'number' || rating < 0.5 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 0.5 and 5' }, { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: session.user.id,
        }
      }
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 });
    }

    // Check if user has purchased this product (verified purchaser)
    const userOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        items: {
          some: {
            variant: {
              productId: productId
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!userOrder) {
      return NextResponse.json({
        error: 'Only verified purchasers can review this product'
      }, { status: 403 });
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        productId,
        userId: session.user.id,
        orderId: userOrder.id,
        rating: Math.round(rating * 2) / 2, // Ensure 0.5 increments
        title: title?.trim() || null,
        body: body?.trim() || null,
        approved: false, // Requires admin approval
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted and pending approval',
      review: {
        id: review.id,
        rating: review.rating,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
