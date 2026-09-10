import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma, default: mocks.prisma }));
vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimit: mocks.rateLimit,
}));

import { POST as verifyOrder } from '@/app/api/orders/verify/route';
import { POST as lookupOrders } from '@/app/api/orders/lookup/route';
import { hashCheckoutAccessKey } from '@/lib/checkout-attempts';

const accessKey = '123e4567-e89b-42d3-a456-426614174020';

function post(url, body, headers = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockReturnValue({ success: true });
  mocks.getServerSession.mockResolvedValue(null);
  mocks.prisma.order.findUnique.mockResolvedValue({
    id: 'order_guest',
    status: 'PAID',
    total: 40.49,
    createdAt: new Date(),
    guestEmail: 'guest@example.com',
    userId: null,
    user: null,
    checkoutAttempt: { keyHash: hashCheckoutAccessKey(accessKey), createdAt: new Date() },
  });
  mocks.prisma.order.findMany.mockResolvedValue([]);
});

describe('single-order capability', () => {
  it('denies anonymous order details without the checkout capability', async () => {
    const response = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_guest' }
    ));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ valid: false });
  });

  it('allows only the matching checkout capability for a guest order', async () => {
    const response = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_guest' },
      { 'x-order-access-key': accessKey }
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      valid: true,
      status: 'PAID',
      total: 40.49,
    }));
  });

  it('denies the wrong capability and an expired guest capability', async () => {
    const wrongKey = '123e4567-e89b-42d3-a456-426614174021';
    const wrong = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_guest' },
      { 'x-order-access-key': wrongKey }
    ));
    expect(wrong.status).toBe(403);

    mocks.prisma.order.findUnique.mockResolvedValueOnce({
      id: 'order_guest',
      status: 'PAID',
      total: 40.49,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      userId: null,
      checkoutAttempt: {
        keyHash: hashCheckoutAccessKey(accessKey),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    });
    const expired = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_guest' },
      { 'x-order-access-key': accessKey }
    ));
    expect(expired.status).toBe(403);
  });

  it('never uses a checkout capability as fallback for an account order', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue({
      id: 'order_account',
      status: 'PAID',
      total: 40.49,
      createdAt: new Date(),
      userId: 'owner_1',
      checkoutAttempt: { keyHash: hashCheckoutAccessKey(accessKey), createdAt: new Date() },
    });

    const response = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_account' },
      { 'x-order-access-key': accessKey }
    ));
    expect(response.status).toBe(403);
  });

  it('allows the signed-in owner and denies a different account', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue({
      id: 'order_account',
      status: 'PAID',
      total: 40.49,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      guestEmail: null,
      userId: 'owner_1',
      user: { email: 'owner@example.com' },
      checkoutAttempt: null,
    });
    mocks.getServerSession.mockResolvedValueOnce({ user: { id: 'other_1' } });
    const denied = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_account' }
    ));
    expect(denied.status).toBe(403);

    mocks.getServerSession.mockResolvedValueOnce({ user: { id: 'owner_1' } });
    const allowed = await verifyOrder(post(
      'http://localhost/api/orders/verify',
      { orderId: 'order_account' }
    ));
    expect(allowed.status).toBe(200);
  });
});

describe('order history ownership', () => {
  it('disables anonymous email-only history lookup', async () => {
    const response = await lookupOrders(post(
      'http://localhost/api/orders/lookup',
      { email: 'victim@example.com' }
    ));

    expect(response.status).toBe(401);
    expect(mocks.prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('scopes history to the authenticated user id', async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: 'owner_1' } });

    const response = await lookupOrders(post(
      'http://localhost/api/orders/lookup',
      { email: 'ignored@example.com' }
    ));

    expect(response.status).toBe(200);
    expect(mocks.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner_1' } })
    );
  });
});
