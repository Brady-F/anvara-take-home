import { expect, test } from '@playwright/test';

// Hold browser requests so loading UI is observable without changing application records.
for (const width of [1440, 390, 320]) {
  test(`loading skeletons preserve layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/marketplace/ad-slots**', async (route) => {
      await gate;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/auth/get-session**', async (route) => {
      await gate;
      await route.fulfill({ contentType: 'application/json', body: 'null' });
    });
    try {
      await page.goto('/marketplace');
      const account = page.locator('.app-account .dashboard-skeleton').first();
      await expect(account).toBeVisible();
      await expect(page.locator('main .dashboard-card')).toHaveCount(3);
      const shimmer = page.locator('main .dashboard-card .dashboard-skeleton').first();
      await expect(shimmer).toHaveCSS('animation-name', 'skeleton-shimmer');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({
        path: testInfo.outputPath('marketplace-loading.png'),
        fullPage: true,
      });
      await page.goto('/marketplace/loading-preview');
      await expect(
        page.locator('.marketplace-detail-heading .dashboard-skeleton').first()
      ).toBeVisible();
      await expect(
        page.locator('.marketplace-detail-price .dashboard-skeleton').first()
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /Back to Marketplace/ })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({ path: testInfo.outputPath('detail-loading.png'), fullPage: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.marketplace-detail .dashboard-skeleton').first()).toHaveCSS(
        'animation-name',
        'none'
      );
      await expect(account).toHaveCSS('animation-name', 'none');
      release();
      await expect(page.locator('main').getByRole('alert')).toContainText(
        'Failed to load ad slot details'
      );
      await expect(page.locator('.marketplace-detail .dashboard-skeleton')).toHaveCount(0);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}

test('login uses a fixed-size shimmer button and recovers after rejection', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/sign-in/email', async (route) => {
    await gate;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Login failed' }),
    });
  });
  try {
    await page.goto('/login');
    const button = page.getByRole('button', { name: 'Login as Sponsor' });
    const before = await button.boundingBox();
    await button.click();
    const pending = page.getByRole('button', { name: 'Logging in...' });
    await expect(pending).toBeDisabled();
    await expect(pending.locator('.dashboard-skeleton')).toBeVisible();
    await expect(pending.locator('.invisible')).toHaveCSS('visibility', 'hidden');
    expect(await pending.boundingBox()).toEqual(before);
    expect(await pending.evaluate((node) => getComputedStyle(node, '::before').content)).toBe(
      'none'
    );
    release();
    await expect(page.locator('main').getByRole('alert')).toContainText('Login failed');
    await expect(button).toBeEnabled();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
