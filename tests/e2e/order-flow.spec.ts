import { test, expect, type Page } from '@playwright/test';

/**
 * Josh Restaurant - customer ordering journey + access-control E2E suite.
 *
 * These specs are deliberately read-only against the database: they browse,
 * filter, add to cart and trigger client-side validation, but never complete a
 * real order (that would pollute the kitchen dashboard during a test run).
 */

/** Adds one in-stock dish from the menu page to the cart. */
async function addFirstDishToCart(page: Page) {
  const addButton = page.getByRole('button', { name: /^Add .+ to order$/i }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
}

test.describe('Customer storefront', () => {
  test('home page shows branding, live status and the ordering CTA', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Josh Restaurant/i);
    await expect(page.locator('header')).toContainText('Josh');
    await expect(page.locator('header')).toContainText('Vizag');

    // Open/closed badge (text depends on the time of day)
    await expect(
      page.locator('header').getByText(/Open|Closed|Checking store hours/i).first()
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { level: 1, name: /Tiffins & Fragrant Dum Biryanis/i })
    ).toBeVisible();

    const orderCta = page.getByRole('link', { name: /Order Online Now/i });
    await expect(orderCta).toBeVisible();
    await orderCta.click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('menu supports search and dietary filtering', async ({ page }) => {
    await page.goto('/menu');

    await expect(page.getByRole('heading', { level: 1, name: /Our Online Menu/i })).toBeVisible();

    const search = page.getByRole('searchbox', { name: /Search dishes/i });
    await expect(search).toBeVisible();

    await search.fill('Biryani');
    await expect(page.getByRole('heading', { name: /Biryanis/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Tiffins$/i })).toHaveCount(0);

    await search.clear();
    await page.getByRole('button', { name: /^Veg$/i }).click();
    // The non-veg dish is filtered out of the grid.
    await expect(
      page.getByRole('button', { name: /Add Josh Special Chicken Biryani to order/i })
    ).toHaveCount(0);
  });

  test('adding a dish updates the cart counter', async ({ page }) => {
    await page.goto('/menu');

    await expect(
      page.getByRole('button', { name: /Shopping cart with/i }).first()
    ).toBeVisible();

    await addFirstDishToCart(page);

    await expect(
      page.getByRole('button', { name: /Shopping cart with 1 items?/i })
    ).toBeVisible();
  });

  test('cart drawer lists the dish and proceeds to checkout', async ({ page }) => {
    await page.goto('/menu');
    await addFirstDishToCart(page);

    await page.getByRole('button', { name: /Shopping cart with/i }).click();

    const drawer = page.getByRole('dialog', { name: /Shopping Cart/i });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/Your Order \(1\)/i);
    await expect(drawer.getByText(/Subtotal/i)).toBeVisible();

    await drawer.getByRole('link', { name: /Proceed to Checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('checkout validates required customer details before submitting', async ({ page }) => {
    await page.goto('/menu');
    await addFirstDishToCart(page);
    await page.goto('/checkout');

    await expect(page.getByText(/1\. Choose Fulfillment/i)).toBeVisible();
    await expect(page.getByText(/2\. Contact Information/i)).toBeVisible();

    // Pickup removes the minimum-order gate so the submit button is enabled.
    await page.getByRole('button', { name: /Counter Pickup/i }).click();

    await page.getByRole('button', { name: /Confirm Order/i }).click();

    // Client-side validation must block submission.
    await expect(page.getByText(/Please fill in your Name, 10-digit Phone Number, and Address above\./i)).toBeVisible();
    await expect(page.getByText(/Name must be at least 2 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test('empty cart checkout offers a way back to the menu', async ({ page }) => {
    await page.goto('/checkout');

    await expect(page.getByRole('heading', { name: /Your cart is empty/i })).toBeVisible();
    await page.getByRole('link', { name: /Browse Menu/i }).click();
    await expect(page).toHaveURL(/\/menu$/);
  });
});

test.describe('Order tracking privacy', () => {
  test('track page requires both order number and phone number', async ({ page }) => {
    await page.goto('/track');

    await expect(page.getByRole('heading', { name: /Track Your Live Order/i })).toBeVisible();
    await expect(page.getByLabel(/Order Number/i)).toBeVisible();
    await expect(page.getByLabel(/Mobile Number Used at Checkout/i)).toBeVisible();
    await expect(page.getByText(/only you can view your order/i)).toBeVisible();
  });

  test('unknown order number and phone return a generic error', async ({ page }) => {
    await page.goto('/track');

    await page.getByLabel(/Order Number/i).fill('JOSH-20260101-0000');
    await page.getByLabel(/Mobile Number Used at Checkout/i).fill('9876543210');
    await page.getByRole('button', { name: /Track Order/i }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: /could not find an order/i })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/track$/);
  });

  test('legacy order-number-only URL no longer exposes a receipt', async ({ page }) => {
    await page.goto('/order-confirmation/JOSH-20260101-0000');

    await expect(page.getByRole('heading', { name: /One quick check/i })).toBeVisible();
    await expect(page.getByText(/Order Receipt & Snapshot/i)).toHaveCount(0);
    await expect(page.getByText(/Total to Pay/i)).toHaveCount(0);
  });

  test('a forged tracking token is rejected', async ({ page }) => {
    await page.goto('/order-confirmation/JOSH-20260101-0000/AAAAAAAAAAAAAAAAAAAAAAAA');

    await expect(page.getByRole('heading', { name: /tracking link is not valid/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Find My Order/i })).toBeVisible();
  });
});

test.describe('Staff portal access control', () => {
  test('signed-out visitors are redirected away from every staff screen', async ({ page }) => {
    for (const path of ['/admin/orders', '/admin/menu', '/admin/settings']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole('heading', { name: /Staff & Owner Portal/i })).toBeVisible();
    }
  });

  test('staff sign-in form is rendered and reachable', async ({ page }) => {
    await page.goto('/admin/login');

    await expect(page.getByLabel(/Staff Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In to Dashboard/i })).toBeVisible();
  });

  test('customer pages never expose staff navigation', async ({ page }) => {
    for (const path of ['/', '/menu', '/track']) {
      await page.goto(path);
      await expect(page.getByText(/Josh Kitchen Portal/i)).toHaveCount(0);
    }
  });
});
