import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendOrderConfirmation: vi.fn(),
  sendOrderShipped: vi.fn(),
  drainOrderFinancialOperations: vi.fn(),
  projectStripeEvent: vi.fn(),
  constructEvent: vi.fn(),
  getServerSession: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    user: { findFirst: vi.fn() },
    adminOrderEvent: { create: vi.fn() },
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma, default: mocks.prisma }));
vi.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: mocks.constructEvent } } }));
vi.mock('@/lib/financial-operations', () => ({
  drainOrderFinancialOperations: mocks.drainOrderFinancialOperations,
}));
vi.mock('@/lib/stripe-event-ledger', () => ({
  projectStripeEvent: mocks.projectStripeEvent,
  recordStripeEventFailure: vi.fn(),
}));
vi.mock('next-auth', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const realOrderEmails = await vi.importActual('@/lib/order-emails');
vi.mock('@/lib/order-emails', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
  sendOrderShipped: mocks.sendOrderShipped,
}));

const { POST: webhook } = await import('@/app/api/webhooks/stripe/route');
const { PUT: updateOrder } = await import('@/app/api/admin/orders/[id]/route');

function webhookRequest() {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: '{}',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only';
  mocks.constructEvent.mockReturnValue({
    id: 'evt_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_1' } },
  });
  mocks.drainOrderFinancialOperations.mockResolvedValue();
  mocks.sendOrderConfirmation.mockResolvedValue({ sent: true });
  mocks.sendOrderShipped.mockResolvedValue({ sent: true });
  mocks.getServerSession.mockResolvedValue({ user: { id: 'admin_1', isAdmin: true } });
  mocks.prisma.user.findFirst.mockResolvedValue({ id: 'admin_1' });
  mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.adminOrderEvent.create.mockResolvedValue({});
  mocks.prisma.$transaction.mockImplementation((operation) => operation(mocks.prisma));
});

describe('order confirmation from the Stripe webhook', () => {
  it('sends once when a payment is first projected, before draining', async () => {
    mocks.projectStripeEvent.mockResolvedValue({ duplicate: false, orderId: 'order_1' });
    const calls = [];
    mocks.sendOrderConfirmation.mockImplementation(async () => { calls.push('email'); return { sent: true }; });
    mocks.drainOrderFinancialOperations.mockImplementation(async () => { calls.push('drain'); });

    const response = await webhook(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(mocks.prisma, 'order_1');
    expect(calls).toEqual(['email', 'drain']);
  });

  it('does not send for duplicate deliveries', async () => {
    mocks.projectStripeEvent.mockResolvedValue({ duplicate: true, orderId: 'order_1' });
    await webhook(webhookRequest());
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('does not send for other event types', async () => {
    mocks.constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'payment_intent.canceled',
      data: { object: { id: 'pi_1' } },
    });
    mocks.projectStripeEvent.mockResolvedValue({ duplicate: false, orderId: 'order_1' });
    await webhook(webhookRequest());
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });
});

describe('shipping email from the admin status update', () => {
  function put(status) {
    return updateOrder(
      new Request('http://localhost/api/admin/orders/order_1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reason: 'Packed and shipped' }),
      }),
      { params: Promise.resolve({ id: 'order_1' }) }
    );
  }

  it('emails the customer when an order moves to SHIPPED', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue({ status: 'PROCESSING', paymentStatus: 'PAID' });
    const response = await put('SHIPPED');
    expect(response.status).toBe(200);
    expect(mocks.sendOrderShipped).toHaveBeenCalledWith(mocks.prisma, 'order_1');
  });

  it('stays quiet for other transitions and lost races', async () => {
    mocks.prisma.order.findUnique.mockResolvedValue({ status: 'PAID', paymentStatus: 'PAID' });
    await put('PROCESSING');
    expect(mocks.sendOrderShipped).not.toHaveBeenCalled();

    mocks.prisma.order.findUnique.mockResolvedValue({ status: 'PROCESSING', paymentStatus: 'PAID' });
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 });
    const response = await put('SHIPPED');
    expect(response.status).toBe(409);
    expect(mocks.sendOrderShipped).not.toHaveBeenCalled();
  });
});

describe('sendOrderConfirmation', () => {
  const order = {
    id: 'order_1',
    userId: null,
    guestEmail: 'guest@example.com',
    user: null,
    subtotal: '10.00',
    shipping: '0.00',
    tax: '0.00',
    total: '10.00',
    items: [{ productName: 'Hat', size: null, color: null, quantity: 1, unitPrice: '10.00' }],
  };

  it('sends to the account email first, then the guest email, with a stable idempotency key', async () => {
    const send = vi.fn().mockResolvedValue({ sent: true });
    const db = { order: { findUnique: vi.fn().mockResolvedValue({ ...order, user: { email: 'member@example.com' } }) } };

    await realOrderEmails.sendOrderConfirmation(db, 'order_1', { send });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'member@example.com',
      subject: 'Order #ORDER_1 confirmed',
      idempotencyKey: 'order-confirmation-order_1',
    }));
  });

  it('never throws when the order lookup fails', async () => {
    const send = vi.fn();
    const db = { order: { findUnique: vi.fn().mockRejectedValue(new Error('db down')) } };
    await expect(realOrderEmails.sendOrderConfirmation(db, 'order_1', { send }))
      .resolves.toEqual({ sent: false, code: 'ORDER_EMAIL_FAILED' });
    expect(send).not.toHaveBeenCalled();
  });

  it('skips orders with no recipient', async () => {
    const send = vi.fn();
    const db = { order: { findUnique: vi.fn().mockResolvedValue({ ...order, guestEmail: null }) } };
    await expect(realOrderEmails.sendOrderShipped(db, 'order_1', { send }))
      .resolves.toEqual({ sent: false, code: 'NO_RECIPIENT' });
    expect(send).not.toHaveBeenCalled();
  });
});
