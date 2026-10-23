import { expect, test, type Page } from '@playwright/test';

// Run against the existing seeded local stack (pnpm dev); never reset or seed from a test.
const api = 'http://localhost:4291/api';

async function login(page: Page, role: 'sponsor' | 'publisher') {
  await page.goto('/login');
  await page.getByLabel('Account type').selectOption(role);
  const button = page.getByRole('button', {
    name: `Login as ${role === 'sponsor' ? 'Sponsor' : 'Publisher'}`,
  });
  const response = page.waitForResponse((result) =>
    result.url().endsWith('/api/auth/sign-in/email')
  );
  await button.click();
  const result = await response;
  if (result.status() === 429) {
    // Respect the production auth throttle; do not disable it for browser tests.
    const seconds = Number(result.headers()['x-retry-after']);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(60);
    await page.waitForTimeout(seconds * 1000);
    await button.click();
  }
  await expect(page).toHaveURL(`/dashboard/${role}`);
}

test('shared controls, loading, navigation, and live reduced-motion changes', async ({ page }) => {
  await login(page, 'publisher');
  try {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/ad-slots', async (route) => {
      await gate;
      await route.continue();
    });
    await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
    try {
      const skeleton = page.locator('.dashboard-skeleton').first();
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveCSS('animation-name', 'dashboard-pulse');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(skeleton).toHaveCSS('animation-name', 'none');
    } finally {
      release();
    }
    await page.unrouteAll({ behavior: 'wait' });
    const placement = page.locator('.marketplace-card').first();
    await placement.hover();
    await expect(placement).toHaveCSS('transform', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(placement).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
    await placement.click();
    await expect(page.locator('.marketplace-detail-panel')).toBeVisible();
    await page.getByRole('link', { name: 'My Ad Slots', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Create Ad Slot' }).click();
    await expect(page.getByRole('dialog')).toHaveCSS('transform', 'none');
    await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Description')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create Ad Slot' })).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Create Ad Slot' }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to Anvara' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(
      (
        await page.request.post('/api/auth/sign-out', {
          data: {},
          headers: { Origin: 'http://localhost:3847' },
        })
      ).ok()
    ).toBe(true);
  }
});

async function applyFilters(page: Page, query: string, sort = 'name') {
  await page.getByRole('searchbox', { name: 'Search' }).fill(query);
  await page.getByLabel('Sort by').selectOption(sort);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeEnabled();
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === query);
}

async function fillNewItem(page: Page, role: string, name: string) {
  await page.getByLabel('Name', { exact: true }).fill(name);
  if (role === 'sponsor') {
    await page.getByLabel('Budget ($)', { exact: true }).fill('40');
    await page.getByLabel('Start date').fill('2027-01-01');
    await page.getByLabel('End date').fill('2027-02-01');
  } else {
    await page.getByLabel('Base price ($/mo)').fill('40');
  }
}

for (const role of ['sponsor', 'publisher'] as const) {
  for (const reduced of [false, true]) {
    test(`${role}: ${reduced ? 'reduced motion on mobile' : 'animated CRUD and filtering'}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.setViewportSize(
        reduced ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
      );
      const prefix = `motion-${Date.now()}-${testInfo.workerIndex}`;
      const resource = role === 'sponsor' ? 'campaigns' : 'ad-slots';
      const noun = role === 'sponsor' ? 'Campaign' : 'Ad Slot';
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await login(page, role);

      try {
        for (const [index, suffix] of ['A', 'B', 'C'].entries()) {
          const response = await page.request.post(`${api}/${resource}`, {
            data:
              role === 'sponsor'
                ? {
                    name: `${prefix} ${suffix}`,
                    budget: (index + 1) * 10,
                    startDate: '2027-01-01',
                    endDate: '2027-02-01',
                  }
                : {
                    name: `${prefix} ${suffix}`,
                    basePrice: (index + 1) * 10,
                    type: 'DISPLAY',
                    isAvailable: true,
                  },
          });
          expect(response.ok()).toBe(true);
        }
        await page.goto(`/dashboard/${role}?q=${prefix}&sort=name`);
        const grid = page.locator('.dashboard-animated-grid');
        const cards = grid.locator('article');
        await expect(cards).toHaveCount(3);
        await expect(grid.locator('[inert]')).toHaveCount(0);

        // Observe real layout transforms during a reorder, rather than asserting animation props.
        const movement = grid.evaluate(
          (element) =>
            new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => {
                observer.disconnect();
                resolve(false);
              }, 3000);
              const observer = new MutationObserver(() => {
                const moving = [...element.children].some((child) => {
                  const transform = getComputedStyle(child).transform;
                  return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
                });
                if (moving) {
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(true);
                }
              });
              observer.observe(element, {
                attributes: true,
                subtree: true,
                attributeFilter: ['style'],
              });
            })
        );
        await applyFilters(page, prefix, role === 'sponsor' ? 'budget-desc' : 'price-desc');
        await expect(cards.first().getByRole('heading')).toHaveText(`${prefix} C`);
        expect(await movement).toBe(!reduced);

        const create = page.getByRole('button', { name: `Create ${noun}` });
        await create.click();
        const dialog = page.getByRole('dialog');
        await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
        await fillNewItem(page, role, `${prefix} D`);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await expect(cards).toHaveCount(4);
        await expect(create).toBeFocused();
        await page.getByRole('button', { name: 'Dismiss notification' }).click();
        await expect(page.locator('.dashboard-notice')).toHaveCount(0);
        await expect(create).toBeFocused();

        const created = cards.filter({
          has: page.getByRole('heading', { name: `${prefix} D`, exact: true }),
        });
        await created.getByRole('button', { name: `Edit ${noun}` }).click();
        // Hold and then reject the browser's Server Action request to verify pending/error recovery.
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(`**/dashboard/${role}*`, async (route) => {
          if (route.request().method() === 'POST') {
            await gate;
            await route.abort();
          } else await route.continue();
        });
        await page.getByLabel('Name', { exact: true }).fill(`${prefix} Retained`);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        try {
          await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
          await expect(page.getByLabel('Name', { exact: true })).toBeDisabled();
          await page.keyboard.press('Escape');
          await expect(dialog).toBeVisible();
        } finally {
          release();
        }
        await expect(dialog.getByRole('alert')).toContainText('Unable to save');
        await expect(page.getByLabel('Name', { exact: true })).toHaveValue(`${prefix} Retained`);
        await page.unroute(`**/dashboard/${role}*`);
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await expect(created.getByRole('button', { name: `Edit ${noun}` })).toBeFocused();

        // A confirmed edit can remove its own card from the current filter.
        await applyFilters(page, `${prefix} D`);
        await expect(cards).toHaveCount(1);
        await cards.getByRole('button', { name: `Edit ${noun}` }).click();
        await page.getByLabel('Name', { exact: true }).fill(`${prefix} Renamed`);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await expect(cards).toHaveCount(0);
        await expect(grid).toContainText('No matching');
        await expect(create).toBeFocused();
        await applyFilters(page, prefix);
        await expect(cards).toHaveCount(4);

        const renamed = cards.filter({
          has: page.getByRole('heading', { name: `${prefix} Renamed`, exact: true }),
        });
        await renamed.getByRole('button', { name: 'Delete', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(renamed).toHaveCount(1);
        await renamed.getByRole('button', { name: 'Delete', exact: true }).click();
        await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await expect(cards).toHaveCount(3);
        await expect(create).toBeFocused();

        // Rapid filters must settle on the final result, without duplicate or inert survivors.
        await applyFilters(page, `${prefix} A`);
        await applyFilters(page, prefix);
        await expect(cards).toHaveCount(3);
        await expect(grid.locator('[inert]')).toHaveCount(0);
        await page.setViewportSize({ width: 320, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
        await create.click();
        await expect(dialog).toBeVisible();
        expect(await dialog.evaluate((node) => node.getBoundingClientRect().width)).toBe(320);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(create).toBeFocused();
        expect(errors).toEqual([]);
      } finally {
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        const response = await page.request.get(`${api}/${resource}`);
        expect(response.ok()).toBe(true);
        const records: { id: string; name: string }[] = await response.json();
        for (const record of records.filter((item) => item.name.startsWith(prefix))) {
          expect((await page.request.delete(`${api}/${resource}/${record.id}`)).ok()).toBe(true);
        }
        expect(
          (
            await page.request.post('/api/auth/sign-out', {
              data: {},
              headers: { Origin: 'http://localhost:3847' },
            })
          ).ok()
        ).toBe(true);
      }
    });
  }
}
