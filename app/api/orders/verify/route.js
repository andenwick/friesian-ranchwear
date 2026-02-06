import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request) {
  const ip = getClientIP(request);
  const limiter = rateLimit(`verify:${ip}`, 20, 60000);
  if (!limiter.success) {
    return NextResponse.json({ valid: false }, { status: 429 });
  }

  try {
    const { orderId, email } = await request.json();
    if (!orderId) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        guestEmail: true,
        user: { select: { email: true } },
      },
    });

    if (!order || !['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json({ valid: false });
    }

    // If email provided, verify it matches the order owner
    if (email) {
      const orderEmail = order.user?.email || order.guestEmail;
      if (orderEmail && email.toLowerCase() !== orderEmail.toLowerCase()) {
        return NextResponse.json({ valid: false });
      }
    }

    return NextResponse.json({
      valid: true,
      orderNumber: order.id,
      total: order.total,
      status: order.status,
    });
  } catch (error) {
    console.error('Order verify error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
