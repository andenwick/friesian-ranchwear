import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    user: { findFirst: vi.fn() },
    adminOrderEvent: { create: vi.fn() },
    order: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ default: mocks.prisma }));

import { PUT } from '@/app/api/admin/orders/[id]/route';

function request(status, reason = 'Packed and ready') {
  return new Request('http://localhost/api/admin/orders/order_1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status, reason }),
  });
}

const context = { params: Promise.resolve({ id: 'order_1' }) };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue({ user: { id: 'admin_1', isAdmin: true } });
  mocks.prisma.user.findFirst.mockResolvedValue({ id: 'admin_1' });
  mocks.prisma.order.findUnique.mockResolvedValue({ status: 'PAID', paymentStatus: 'PAID' });
  mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.adminOrderEvent.create.mockResolvedValue({ id: 'audit_1' });
  mocks.prisma.$transaction.mockImplementation((operation) => operation(mocks.prisma));
});

describe('PUT /api/admin/orders/[id]', () => {
  it('rechecks current admin access in the database', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue(null);

    const response = await PUT(request('PROCESSING'), context);

    expect(response.status).toBe(401);
    expect(mocks.prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it.each(['PAID', 'CANCELLED', 'REFUNDED'])('denies admin financial transition to %s', async (status) => {
    const response = await PUT(request(status), context);

    expect(response.status).toBe(409);
    expect(mocks.prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('advances only verified-paid fulfillment with a conditional write', async () => {
    const response = await PUT(request('PROCESSING'), context);

    expect(response.status).toBe(200);
    expect(mocks.prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order_1', status: 'PAID', paymentStatus: 'PAID' },
      data: { status: 'PROCESSING' },
    });
    expect(mocks.prisma.adminOrderEvent.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order_1',
        actorUserId: 'admin_1',
        fromStatus: 'PAID',
        toStatus: 'PROCESSING',
        reason: 'Packed and ready',
      },
    });
  });

  it('returns a conflict when a financial event wins the race', async () => {
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 });

    const response = await PUT(request('PROCESSING'), context);

    expect(response.status).toBe(409);
  });
});
