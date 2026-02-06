import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { convertImageUrl } from '@/lib/image-utils';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

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
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { guestEmail: normalizedEmail },
          { user: { email: normalizedEmail } }
        ]
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
      customerName: order.user?.name || order.guestName || 'Guest',
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total: Number(order.total),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      shippingAddress: {
        name: order.shippingName,
        street: order.shippingStreet,
        street2: order.shippingStreet2,
        city: order.shippingCity,
        state: order.shippingState,
        zip: order.shippingZip,
        country: order.shippingCountry,
      },
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
