import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

// GET /api/admin/reviews - List reviews with optional filters
export async function GET(request) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'all'

    let where = {};
    if (status === 'pending') {
      where.approved = false;
    } else if (status === 'approved') {
      where.approved = true;
    }
    // 'all' = no filter

    const reviews = await prisma.review.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform for frontend
    const transformedReviews = reviews.map(review => ({
      id: review.id,
      productId: review.productId,
      productName: review.product.name,
      userId: review.userId,
      userName: review.user.name || review.user.email,
      rating: review.rating,
      title: review.title,
      body: review.body,
      approved: review.approved,
      createdAt: review.createdAt,
    }));

    // Count pending for stats
    const pendingCount = await prisma.review.count({
      where: { approved: false }
    });

    return NextResponse.json({
      reviews: transformedReviews,
      pendingCount
    });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
