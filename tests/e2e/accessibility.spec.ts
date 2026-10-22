import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility audits (WCAG 2.1 AA) for the main customer and staff surfaces.
 * Colour-contrast is excluded because the brand palette is owner-configurable.
 */
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'menu', path: '/menu' },
  { name: 'track', path: '/track' },
  { name: 'contact', path: '/contact' },
  { name: 'cart (empty checkout)', path: '/checkout' },
  { name: 'staff login', path: '/admin/login' },
];

test.describe('Accessibility audits', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page has no critical accessibility violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['color-contrast'])
        .analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

      expect(
        criticalViolations,
        criticalViolations.map((v) => `${v.id}: ${v.help}`).join('\n')
      ).toEqual([]);
    });
  }

  test('menu items are reachable by keyboard', async ({ page }) => {
    await page.goto('/menu');

    const firstAddButton = page.getByRole('button', { name: /^Add .+ to order$/i }).first();
    await firstAddButton.focus();
    await expect(firstAddButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Shopping cart with 1 items?/i })).toBeVisible();
  });
});
