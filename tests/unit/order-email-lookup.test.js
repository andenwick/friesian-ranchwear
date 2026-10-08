import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: { order: { findMany: vi.fn() }, user: { findUnique: vi.fn() } },
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/email', () => ({
  sendEmail: mocks.sendEmail,
  emailLinkBase: () => 'https://shop.test',
}));

const { POST } = await import('@/app/api/orders/email-lookup/route');

let ipCounter = 0;
function post(body) {
  ipCounter += 1;
  return new Request('http://localhost/api/orders/email-lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${ipCounter}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.sendEmail.mockResolvedValue({ sent: true });
  mocks.prisma.user.findUnique.mockResolvedValue(null);
});

describe('POST /api/orders/email-lookup', () => {
  it('emails paid orders to the address that placed them', async () => {
    mocks.prisma.order.findMany.mockResolvedValue([
      { id: 'cmorder00000000aaaa1111', status: 'PAID', total: '50.00', createdAt: new Date('2026-10-01') },
    ]);

    const response = await POST(post({ email: 'Guest@Example.com' }));

    expect(response.status).toBe(200);
    const query = mocks.prisma.order.findMany.mock.calls[0][0];
    expect(query.where.paymentStatus).toEqual({ in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] });
    expect(query.where.OR[0]).toEqual({ guestEmail: { equals: 'guest@example.com', mode: 'insensitive' } });
    expect(query.select).toEqual({ id: true, status: true, total: true, createdAt: true });
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe('guest@example.com');
  });

  it('gives the same answer and sends nothing when there are no orders', async () => {
    mocks.prisma.order.findMany.mockResolvedValue([{ id: 'x', status: 'PAID', total: '1', createdAt: new Date() }]);
    const withOrders = await (await POST(post({ email: 'a1@example.com' }))).json();
    mocks.sendEmail.mockClear();
    mocks.prisma.order.findMany.mockResolvedValue([]);
    const without = await (await POST(post({ email: 'a2@example.com' }))).json();

    expect(without).toEqual(withOrders);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('limits repeat requests for one address', async () => {
    mocks.prisma.order.findMany.mockResolvedValue([{ id: 'x', status: 'PAID', total: '1', createdAt: new Date() }]);
    for (let i = 0; i < 4; i += 1) await POST(post({ email: 'flood@example.com' }));
    expect(mocks.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('rejects malformed email', async () => {
    expect((await POST(post({ email: 'nope' }))).status).toBe(400);
  });
});
