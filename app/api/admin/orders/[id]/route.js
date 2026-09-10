import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { canAdminTransitionOrder, getAllowedAdminOrderTransitions } from '@/lib/order-status';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const admin = await prisma.user.findFirst({
    where: { id: session.user.id, isAdmin: true },
    select: { id: true },
  });

  return admin ? session : null;
}

// GET /api/admin/orders/[id] - Get single order with full details
export async function GET(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
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
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Transform order for frontend
    const transformedOrder = {
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      allowedStatusTransitions: getAllowedAdminOrderTransitions(order.status, order.paymentStatus),
      customerName: order.user?.name || order.guestName || 'Guest',
      customerEmail: order.user?.email || order.guestEmail,
      customerPhone: order.guestPhone,
      stripePaymentId: order.stripePaymentId,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total: Number(order.total),
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
        imageUrl: item.variant?.product?.images?.[0]?.url || null,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT /api/admin/orders/[id] - Update order status
export async function PUT(request, { params }) {
  const session = await checkAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status, reason } = await request.json();

    if (typeof status !== 'string') {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 500) {
      return NextResponse.json(
        { error: 'A reason between 3 and 500 characters is required' },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true, paymentStatus: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!canAdminTransitionOrder(existingOrder.status, status, existingOrder.paymentStatus)) {
      return NextResponse.json(
        { error: `Order cannot transition from ${existingOrder.status} to ${status}` },
        { status: 409 }
      );
    }

    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id, status: existingOrder.status, paymentStatus: 'PAID' },
        data: { status },
      });
      if (result.count > 0) {
        await tx.adminOrderEvent.create({
          data: {
            orderId: id,
            actorUserId: session.user.id,
            fromStatus: existingOrder.status,
            toStatus: status,
            reason: reason.trim(),
          },
        });
      }
      return result;
    });

    if (changed.count === 0) {
      return NextResponse.json(
        { error: 'Order changed while this update was in progress. Refresh and try again.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id,
        status,
      }
    });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
