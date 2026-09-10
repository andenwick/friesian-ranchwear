import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { convertImageUrl } from '@/lib/image-utils';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/orders/lookup - Look up orders by email
export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const limiter = rateLimit(`order-lookup:${ip}`, 10, 60000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign in to view order history' },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { take: 1 }
                  }
                }
              }
            }
          }
        },
        user: {
          select: { email: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform orders for frontend
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      status: order.status,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total: Number(order.total),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.unitPrice) * item.quantity,
        imageUrl: convertImageUrl(item.variant?.product?.images?.[0]?.url),
      })),
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ orders: transformedOrders });
  } catch (error) {
    console.error('Failed to lookup orders:', error);
    return NextResponse.json({ error: 'Failed to lookup orders' }, { status: 500 });
  }
}
