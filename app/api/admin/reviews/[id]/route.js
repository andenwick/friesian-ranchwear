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

// GET /api/admin/reviews/[id] - Get single review
export async function GET(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Failed to fetch review:', error);
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
  }
}

// PATCH /api/admin/reviews/[id] - Approve/reject review
export async function PATCH(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { approved } = await request.json();

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid approved value' }, { status: 400 });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { approved },
    });

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        approved: review.approved,
      }
    });
  } catch (error) {
    console.error('Failed to update review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE /api/admin/reviews/[id] - Delete review
export async function DELETE(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
