import { test, expect } from '@playwright/test';

test.describe('Subscribe API', () => {
  test('returns error for missing email', async ({ request }) => {
    const response = await request.post('/api/subscribe', {
      data: { name: 'Test User' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Email is required');
  });

  test('returns error for invalid email format', async ({ request }) => {
    const response = await request.post('/api/subscribe', {
      data: { email: 'invalid-email' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid email format');
  });

  // Note: This test requires Google Sheets credentials to be configured
  // Skip in CI unless credentials are available
  test.skip('successfully subscribes with valid email', async ({ request }) => {
    const response = await request.post('/api/subscribe', {
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
