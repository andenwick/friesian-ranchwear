import { describe, expect, it } from 'vitest';
import { scrubTelemetryEvent } from '@/lib/sentry-privacy';

describe('telemetry privacy', () => {
  it('removes checkout secrets, capability headers, cookies, and request bodies', () => {
    const event = scrubTelemetryEvent({
      request: {
        url: 'https://shop.test/checkout?client_secret=secret&safe=yes',
        headers: {
          'Idempotency-Key': 'checkout-key',
          'X-Order-Access-Key': 'capability',
          Cookie: 'session=secret',
          Accept: 'application/json',
          Referer: 'https://shop.test/success?client_secret=referrer-secret',
        },
        cookies: { session: 'secret' },
        data: { customer: { email: 'private@example.com' } },
      },
      breadcrumbs: [{
        category: 'navigation',
        message: 'from /pay?client_secret=breadcrumb-secret',
        data: {
          from: 'https://shop.test/pay?payment_intent_client_secret=from-secret',
          client_secret: 'structured-secret',
          'x-order-access-key': 'capability',
        },
      }],
    });

    expect(event.request.url).toBe('https://shop.test/checkout?safe=yes');
    expect(event.request.headers).toEqual({
      Accept: 'application/json',
      Referer: 'https://shop.test/success?client_secret=[Filtered]',
    });
    expect(event.request).not.toHaveProperty('cookies');
    expect(event.request).not.toHaveProperty('data');
    const breadcrumbs = JSON.stringify(event.breadcrumbs);
    expect(breadcrumbs).not.toContain('breadcrumb-secret');
    expect(breadcrumbs).not.toContain('from-secret');
    expect(breadcrumbs).not.toContain('structured-secret');
    expect(breadcrumbs).not.toContain('capability');
  });
});
