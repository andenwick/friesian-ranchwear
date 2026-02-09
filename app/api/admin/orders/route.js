import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { cleanupExpiredPendingOrders } from '@/lib/order-reservations';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

// GET /api/admin/orders - List all orders
export async function GET(request) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    try {
      await cleanupExpiredPendingOrders({ limit: 50 });
    } catch (cleanupError) {
      console.error('Failed to cleanup stale pending orders:', cleanupError);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Default view excludes pre-payment checkout attempts (PENDING).
    // Admin can still explicitly request "all" or "PENDING".
    const where = status
      ? (status === 'all' ? {} : { status })
      : { status: { not: 'PENDING' } };

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { name: true, images: { take: 1 } }
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

    // Transform orders for the frontend
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      status: order.status,
      customerName: order.user?.name || order.guestName || 'Guest',
      customerEmail: order.user?.email || order.guestEmail,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total: Number(order.total),
      shippingAddress: order.shippingStreet ? {
        name: order.shippingName,
        street: order.shippingStreet,
        street2: order.shippingStreet2,
        city: order.shippingCity,
        state: order.shippingState,
        zip: order.shippingZip,
        country: order.shippingCountry,
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return NextResponse.json({ orders: transformedOrders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
