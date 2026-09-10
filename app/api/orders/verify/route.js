import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hashCheckoutAccessKey } from '@/lib/checkout-attempts';

const GUEST_ORDER_ACCESS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request) {
  const ip = getClientIP(request);
  const limiter = rateLimit(`verify:${ip}`, 20, 60000);
  if (!limiter.success) {
    return NextResponse.json({ valid: false }, { status: 429 });
  }

  try {
    const { orderId } = await request.json();
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
        userId: true,
        checkoutAttempt: { select: { keyHash: true, createdAt: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ valid: false });
    }

    const session = await getServerSession(authOptions);
    const accessKey = request.headers.get('x-order-access-key');
    let capabilityMatches = false;
    const capabilityIsCurrent = Boolean(
      order.userId === null &&
      order.checkoutAttempt?.createdAt &&
      Date.now() - order.checkoutAttempt.createdAt.getTime() <= GUEST_ORDER_ACCESS_MS
    );
    if (accessKey && capabilityIsCurrent && order.checkoutAttempt?.keyHash) {
      try {
        capabilityMatches = hashCheckoutAccessKey(accessKey) === order.checkoutAttempt.keyHash;
      } catch {
        capabilityMatches = false;
      }
    }
    const accountOwnsOrder = Boolean(session?.user?.id && session.user.id === order.userId);
    if (!accountOwnsOrder && !capabilityMatches) {
      return NextResponse.json({ valid: false }, { status: 403 });
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
