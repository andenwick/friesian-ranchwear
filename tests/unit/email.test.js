import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '../../lib/email';
import {
  escapeHtml,
  orderConfirmationEmail,
  orderLookupEmail,
  orderShippedEmail,
  passwordResetEmail,
} from '../../lib/email-templates';

const ENV_KEYS = ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO'];
const saved = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  for (const key of ENV_KEYS) delete process.env[key];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

function okFetch(id = 'email_1') {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id }) });
}

describe('sendEmail', () => {
  it('does nothing until an API key is configured', async () => {
    const fetchImpl = okFetch();
    await expect(sendEmail({ to: 'a@b.co', subject: 's', html: 'h', text: 't' }, { fetchImpl }))
      .resolves.toEqual({ skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts to Resend with the default sender and an idempotency key', async () => {
    process.env.RESEND_API_KEY = 're_test_only';
    process.env.EMAIL_REPLY_TO = 'owner@example.com';
    const fetchImpl = okFetch('email_9');

    const result = await sendEmail(
      { to: 'buyer@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', idempotencyKey: 'order-confirmation-o1' },
      { fetchImpl }
    );

    expect(result).toEqual({ sent: true, id: 'email_9' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_only');
    expect(init.headers['Idempotency-Key']).toBe('order-confirmation-o1');
    expect(JSON.parse(init.body)).toEqual({
      from: 'Friesian Ranchwear <orders@friesianranchwear.com>',
      to: ['buyer@example.com'],
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
      reply_to: 'owner@example.com',
    });
  });

  it('reports provider and network failures without throwing or logging the recipient', async () => {
    process.env.RESEND_API_KEY = 're_test_only';
    const failing = vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({}) });
    await expect(sendEmail({ to: 'private@example.com', subject: 's' }, { fetchImpl: failing }))
      .resolves.toEqual({ sent: false, code: 'HTTP_422' });

    const offline = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(sendEmail({ to: 'private@example.com', subject: 's' }, { fetchImpl: offline }))
      .resolves.toEqual({ sent: false, code: 'NETWORK_ERROR' });

    const logged = console.error.mock.calls.flat().join(' ');
    expect(logged).not.toContain('private@example.com');
  });

  it('refuses a malformed recipient', async () => {
    process.env.RESEND_API_KEY = 're_test_only';
    const fetchImpl = okFetch();
    await expect(sendEmail({ to: 'nobody', subject: 's' }, { fetchImpl }))
      .resolves.toEqual({ sent: false, code: 'INVALID_RECIPIENT' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const order = {
  id: 'cmorder000000abcd1234',
  userId: null,
  subtotal: '89.98',
  shipping: '0.00',
  tax: '6.21',
  total: '96.19',
  shippingName: 'Jo <script>',
  shippingStreet: '1 Main St',
  shippingStreet2: null,
  shippingCity: 'Provo',
  shippingState: 'UT',
  shippingZip: '84601',
  items: [
    { productName: 'Blue <b>Bull</b>', size: 'L/XL', color: null, quantity: 2, unitPrice: '44.99' },
  ],
};

describe('email templates', () => {
  it('escapes customer and product text in HTML', () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
    const { html } = orderConfirmationEmail(order, { linkBase: 'https://shop.test' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Bull</b>');
    expect(html).toContain('Blue &lt;b&gt;Bull&lt;/b&gt; (L/XL)');
  });

  it('builds an order confirmation with number, lines and totals', () => {
    const message = orderConfirmationEmail(order, { linkBase: 'https://shop.test' });
    expect(message.subject).toBe('Order #ABCD1234 confirmed');
    expect(message.text).toContain('Blue <b>Bull</b> (L/XL) x2: $89.98');
    expect(message.text).toContain('Total: $96.19');
    expect(message.text).toContain('Keep this email as your receipt.');
    expect(message.text).not.toContain('/account/orders');
  });

  it('links account holders to their orders', () => {
    const message = orderShippedEmail({ ...order, userId: 'user_1' }, { linkBase: 'https://shop.test' });
    expect(message.subject).toBe('Order #ABCD1234 has shipped');
    expect(message.html).toContain('https://shop.test/account/orders');
  });

  it('puts the reset link and expiry in the password email', () => {
    const message = passwordResetEmail({ resetUrl: 'https://shop.test/auth/reset?token=t', minutes: 30 });
    expect(message.html).toContain('href="https://shop.test/auth/reset?token=t"');
    expect(message.text).toContain('expires in 30 minutes');
  });

  it('lists orders without addresses or names in the lookup email', () => {
    const message = orderLookupEmail(
      [{ id: order.id, status: 'SHIPPED', total: '96.19', createdAt: new Date('2026-10-01T12:00:00Z') }],
      { linkBase: 'https://shop.test', hasAccount: false }
    );
    expect(message.text).toContain('Order #ABCD1234 (2026-10-01, shipped): $96.19');
    expect(message.html).not.toContain('Provo');
    expect(message.html).not.toContain('Sign in to see details');
  });
});
