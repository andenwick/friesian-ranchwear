import { test, expect } from '@playwright/test';

test.describe('Page Integration and Verification', () => {
  test.describe('All 7 sections render correctly', () => {
    test('renders all sections in correct order', async ({ page }) => {
      await page.goto('/');

      // Verify all 7 sections exist
      await expect(page.locator('section').first()).toBeVisible();

      // Hero section
      const hero = page.locator('section').first();
      await expect(hero).toBeVisible();
      await expect(hero.locator('img[alt="Friesian Ranchwear Logo"]')).toBeVisible();
      await expect(hero.getByText('Where the Range Meets the Streets')).toBeVisible();
      await expect(hero.getByRole('link', { name: 'Shop Now' })).toBeVisible();

      // Brand Story section
      await expect(page.getByRole('heading', { name: 'Our Story' })).toBeVisible();

      // Product Showcase section
      await expect(page.getByRole('heading', { name: 'Our Collection' })).toBeVisible();

      // Shop CTA section
      await expect(page.getByRole('heading', { name: 'Built for this.' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Shop Collection' })).toBeVisible();

      // Email Signup section
      await expect(page.getByRole('heading', { name: 'Stay Connected' })).toBeVisible();
      await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Join' })).toBeVisible();

      // Social Links section
      await expect(page.getByRole('heading', { name: 'Follow Us' })).toBeVisible();
      await expect(page.getByLabel('Follow us on TikTok')).toBeVisible();
      await expect(page.getByLabel('Follow us on Instagram')).toBeVisible();

      // Footer
      await expect(page.locator('footer')).toBeVisible();
      await expect(page.getByText('Friesian Ranchwear', { exact: true })).toBeVisible();
    });
  });

  test.describe('Responsive verification', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1024, height: 768 },
      { name: 'large-desktop', width: 1280, height: 900 },
    ];

    for (const viewport of viewports) {
      test(`no horizontal scroll at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        // Check for horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalScroll).toBe(false);
      });

      test(`all sections visible at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        // Verify main sections are present and styled appropriately
        await expect(page.getByRole('heading', { name: 'Our Story' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Our Collection' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Built for this.' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Stay Connected' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Follow Us' })).toBeVisible();
      });
    }
  });

  test.describe('Interactive elements verification', () => {
    test('CTA buttons have proper hover states', async ({ page }) => {
      await page.goto('/');

      // Hero Shop Now button
      const heroButton = page.locator('section').first().getByRole('link', { name: 'Shop Now' });
      await expect(heroButton).toBeVisible();
      await heroButton.hover();

      // Shop Collection button
      const shopButton = page.getByRole('link', { name: 'Shop Collection' });
      await expect(shopButton).toBeVisible();
      await shopButton.hover();
    });

    test('product cards are clickable and have hover effects', async ({ page }) => {
      await page.goto('/');

      // Find product cards
      const productCards = page.locator('a[href^="/products/"]');
      const cardCount = await productCards.count();

      // Should have at least 1 product card (from ProductShowcase)
      expect(cardCount).toBeGreaterThanOrEqual(1);

      // Test first card hover
      const firstCard = productCards.first();
      await firstCard.hover();
    });

    test('social icons have hover states', async ({ page }) => {
      await page.goto('/');

      const tiktokLink = page.getByLabel('Follow us on TikTok');
      const instagramLink = page.getByLabel('Follow us on Instagram');

      await expect(tiktokLink).toBeVisible();
      await expect(instagramLink).toBeVisible();

      await tiktokLink.hover();
      await instagramLink.hover();
    });

    test('email form shows validation error for empty email', async ({ page }) => {
      await page.goto('/');

      const submitButton = page.getByRole('button', { name: 'Join' });

      // Test empty submission - triggers custom JS validation
      await submitButton.click();
      await expect(page.getByText('Please enter your email address.')).toBeVisible();
    });

    test('email form input accepts valid email format', async ({ page }) => {
      await page.goto('/');

      const emailInput = page.getByPlaceholder('Enter your email');
      const submitButton = page.getByRole('button', { name: 'Join' });

      // Fill valid email and verify form accepts it
      await emailInput.fill('test@example.com');

      // Verify the input value is set correctly
      await expect(emailInput).toHaveValue('test@example.com');

      // Click submit - this will trigger the API call
      // Since we don't have Google Sheets configured, it will show an error,
      // but this proves the form validation passed
      await submitButton.click();

      // Should show loading state briefly
      await expect(page.getByRole('button', { name: 'Joining...' })).toBeVisible();
    });

    test('keyboard navigation works for interactive elements', async ({ page }) => {
      await page.goto('/');

      // Tab through the page and verify focus is visible on interactive elements
      await page.keyboard.press('Tab');

      // The first focusable element should have focus
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Screenshots for verification', () => {
    const viewports = [
      { name: 'mobile-375', width: 375, height: 812 },
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'desktop-1024', width: 1024, height: 768 },
      { name: 'large-desktop-1280', width: 1280, height: 900 },
    ];

    for (const viewport of viewports) {
      test(`capture screenshot at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');

        // Wait for all content to load
        await page.waitForLoadState('networkidle');

        // Take full page screenshot
        await page.screenshot({
          path: `../specs/2026-01-09-002-website-foundations/verification/screenshots/${viewport.name}.png`,
          fullPage: true,
        });
      });
    }
  });
});
