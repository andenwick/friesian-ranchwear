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

    await expect(page.getByRole('heading', { name: 'Friesian Ranchwear', exact: true })).toBeVisible();
    await expect(page.getByText('Nothing you wear is an accident.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'SHOP COLLECTION' })).toHaveAttribute('href', '/products');
    await expect(page.getByText('Built for this. Limited runs. No restocks.')).toBeVisible();
    await expect(page.locator('#shop')).toHaveCSS(
      'background-image',
      /friesian-washed-material-texture-v1\.webp/
    );
    await expect(page.getByRole('heading', { name: 'STAY POSTED.' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.locator('footer').getByText('FRIESIAN RANCHWEAR', { exact: true })).toBeVisible();
  });

  test('hero plays the whip drop once and holds on the landed frame', async ({ page }) => {
    await openHome(page);
    const video = page.locator('section video');

    await expect(video).toHaveAttribute('poster', '/hero/whip-hero-start.jpg');
    await expect(video.locator('source')).toHaveCount(2);
    await expect.poll(() => video.evaluate((v) => v.ended), { timeout: 10_000 }).toBe(true);
    await expect(page.getByRole('link', { name: 'SHOP COLLECTION' })).toBeVisible();
  });

  test('hero shows the landed frame when autoplay is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    });
    await openHome(page);

    await expect(page.locator('section video')).toHaveAttribute('poster', '/hero/whip-hero-poster.jpg');
  });

  test('hero shows the landed frame when the video never decodes', async ({ page }) => {
    // Requests that never answer leave the video without a frame, as Safari does when it cannot decode a source
    await page.route('**/hero/whip-hero.{mp4,webm}', () => {});
    await openHome(page);

    await expect(page.locator('section video')).toHaveAttribute('poster', '/hero/whip-hero-poster.jpg', {
      timeout: 8_000,
    });
  });

  test('hero does not play with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page);
    const video = page.locator('section video');

    await expect(video).toHaveAttribute('poster', '/hero/whip-hero-poster.jpg');
    expect(await video.evaluate((v) => v.paused && v.currentTime === 0)).toBe(true);
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

test.describe('Header and site chrome', () => {
  test('cart and menu work on mobile before scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openHome(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.locator('#site-menu');
    await expect(menu.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/products');
    await expect(menu.getByRole('link', { name: 'Track Order' })).toHaveAttribute('href', '/track-order');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    await page.getByRole('button', { name: /Shopping cart/ }).click();
    await expect(page.getByText('Your cart is empty', { exact: false }).first()).toBeVisible();
  });

  test('renders brand fonts', async ({ page }) => {
    await openHome(page);
    const heading = page.getByRole('heading', { name: 'STAY POSTED.' });
    const fonts = {
      body: await page.evaluate(() => getComputedStyle(document.body).fontFamily),
      heading: await heading.evaluate((element) => getComputedStyle(element).fontFamily),
    };
    expect(fonts.body).toContain('Barlow');
    expect(fonts.heading).toContain('Barlow Condensed');
  });

  test('cookie choice closes the banner without reloading the page', async ({ page }) => {
    await openHome(page);
    await page.evaluate(() => { window.__noReload = true; });
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toHaveCount(0);
    expect(await page.evaluate(() => window.__noReload)).toBe(true);
  });

  test('shares a branded preview card', async ({ page }) => {
    await openHome(page);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-default\.jpg$/);
    const image = await page.request.get('/og-default.jpg');
    expect(image.status()).toBe(200);
  });
});

test.describe('Account recovery', () => {
  test('sign-in links to password reset, which answers generically', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot$/);
    await page.getByLabel('Email').fill('someone@example.test');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByRole('status')).toContainText('If that email has an account');
  });

  test('a reset page without a token offers a new link', async ({ page }) => {
    await page.goto('/auth/reset');
    await expect(page.getByRole('link', { name: 'Request a new one' })).toHaveAttribute('href', '/auth/forgot');
  });

  test('guests can ask for their order history by email', async ({ page }) => {
    await page.goto('/track-order');
    await page.getByLabel(/Checked out as a guest/).fill('guest@example.test');
    await page.getByRole('button', { name: 'Email Me' }).click();
    await expect(page.getByRole('status')).toContainText('If we have orders for that email');
  });
});
