import { test, expect } from '@playwright/test';

const product = {
  id: 'test-product',
  name: 'Test Ranchwear Hat',
  price: '$45.00',
  category: 'Hats',
  imageUrl: null,
};

async function openHome(page) {
  await page.route('**/api/products?display=homepage', async (route) => {
    await route.fulfill({ json: [product] });
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: product.name })).toBeVisible();
}

test.describe('Homepage production behavior', () => {
  test('renders the current customer journey', async ({ page }) => {
    await openHome(page);

    await expect(page.getByRole('heading', { name: 'FRIESIAN FRIESIAN', exact: true })).toBeVisible();
    await expect(page.getByText('Nothing you wear is an accident.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'SHOP COLLECTION' })).toHaveAttribute('href', '/products');
    await expect(page.getByText('Built for this. Limited runs. No restocks.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'STAY POSTED.' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.locator('footer').getByText('FRIESIAN RANCHWEAR', { exact: true })).toBeVisible();
  });

  test('product card points to its detail page', async ({ page }) => {
    await openHome(page);
    await expect(page.getByRole('link', { name: product.name })).toHaveAttribute(
      'href',
      `/products/${product.id}`
    );
  });

  test('footer exposes store, policy, tracking, and social links', async ({ page }) => {
    await openHome(page);
    const footer = page.locator('footer');

    await expect(footer.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/products');
    await expect(footer.getByRole('link', { name: 'Track Order' })).toHaveAttribute('href', '/track-order');
    await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    await expect(page.getByLabel('Follow us on TikTok')).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByLabel('Follow us on Instagram')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('email signup validates empty submissions', async ({ page }) => {
    await openHome(page);
    await page.locator('form').getByRole('button').click();
    await expect(page.getByText('Please enter your email address.')).toBeVisible();
  });

  test('email signup shows success after a valid subscription', async ({ page }) => {
    await page.route('**/api/subscribe', async (route) => {
      await route.fulfill({ status: 200, json: { success: true } });
    });
    await openHome(page);

    await page.getByRole('textbox', { name: 'Email address' }).fill('customer@example.com');
    await page.locator('form').getByRole('button').click();
    await expect(page.getByText('You are on the list.')).toBeVisible();
  });

  test('keyboard navigation reaches a visible control', async ({ page }) => {
    await openHome(page);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});

test.describe('Responsive homepage', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`has no horizontal overflow on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openHome(page);

      const dimensions = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    });
  }
});

test.describe('Policy pages', () => {
  test('privacy policy is reachable', async ({ page }) => {
    const response = await page.goto('/privacy');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('terms are reachable', async ({ page }) => {
    const response = await page.goto('/terms');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'TERMS' })).toBeVisible();
  });
});
