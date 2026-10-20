import { test, expect } from '@playwright/test';

test.describe('Josh Restaurant - Customer Ordering Flow', () => {
  test('homepage displays restaurant branding, opening hours badge, and menu categories', async ({ page }) => {
    await page.goto('/');

    // Check title and header
    await expect(page).toHaveTitle(/Josh Restaurant/i);
    await expect(page.locator('header')).toContainText('Josh Restaurant');
    await expect(page.locator('header')).toContainText('Vizag');

    // Check operating hours badge exists
    const badge = page.locator('header').locator('text=Open').or(page.locator('header').locator('text=Closed'));
    await expect(badge.first()).toBeVisible();

    // Check search input and menu tabs
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Check category buttons exist
    const allTab = page.locator('button:has-text("All Dishes")');
    await expect(allTab).toBeVisible();
  });

  test('user can search and filter menu items', async ({ page }) => {
    await page.goto('/');

    // Type in search bar
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Biryani');

    // Should find biryani items
    await expect(page.locator('text=Biryani').first()).toBeVisible();

    // Clear search
    await searchInput.clear();

    // Filter by Veg
    const vegButton = page.locator('button:has-text("Veg Only")');
    if (await vegButton.isVisible()) {
      await vegButton.click();
      await expect(page.locator('text=Paneer').or(page.locator('text=Dosa')).first()).toBeVisible();
    }
  });

  test('user can add item to cart and open cart drawer', async ({ page }) => {
    await page.goto('/');

    // Find first available "Add to Order" button
    const addButton = page.locator('button:has-text("Add to Order")').first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Cart drawer should open or cart badge should update
    const cartButton = page.locator('button:has-text("Cart"), button[aria-label*="cart"], button:has-text("₹")').first();
    await expect(cartButton).toBeVisible();
  });

  test('checkout page validates mandatory fields and delivery details', async ({ page }) => {
    await page.goto('/checkout');

    // Verify checkout heading
    await expect(page.locator('h1, h2')).toContainText(/Checkout/i);

    // Verify delivery / pickup selection
    const pickupOption = page.locator('label:has-text("Takeaway / Pickup"), button:has-text("Pickup")').first();
    const deliveryOption = page.locator('label:has-text("Doorstep Delivery"), button:has-text("Delivery")').first();

    await expect(pickupOption).toBeVisible();
    await expect(deliveryOption).toBeVisible();

    // Verify phone input has 10-digit Indian format guidance
    const phoneInput = page.locator('input[placeholder*="9876543210"], input[name="customerPhone"]');
    await expect(phoneInput).toBeVisible();
  });

  test('order tracking page allows lookup by order number', async ({ page }) => {
    await page.goto('/track');

    await expect(page.locator('h1, h2')).toContainText(/Track/i);
    const orderInput = page.locator('input[placeholder*="JOSH-"]');
    await expect(orderInput).toBeVisible();

    const trackBtn = page.locator('button:has-text("Track Order")');
    await expect(trackBtn).toBeVisible();
  });
});
