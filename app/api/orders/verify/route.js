import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, total: true, createdAt: true },
    });

    if (!order || !['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json({ valid: false });
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
