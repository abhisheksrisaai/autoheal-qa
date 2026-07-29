import { test, expect } from '../../../src/fixtures/page.fixture';

/**
 * E2E Tests: Order Confirmation & Dashboard
 */
test.describe('Order Confirmation', () => {
  test.beforeEach(async ({ loginPage, dashboardPage, checkoutPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
    await dashboardPage.addProductToCart(0);
    await dashboardPage.goToCart();
    await checkoutPage.clickCheckout();
    await checkoutPage.fillShippingInfo('Bob', 'Wilson', '10001');
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();
  });

  test('@e2e should display order confirmation header', async ({ checkoutPage }) => {
    await checkoutPage.expectOnConfirmationPage();
  });

  test('@e2e should display pony express image on confirmation', async ({ checkoutPage }) => {
    await expect(checkoutPage.page.locator('.pony_express')).toBeVisible();
  });

  test('@e2e should navigate back to products from confirmation', async ({ checkoutPage, dashboardPage }) => {
    await checkoutPage.clickBackHome();
    await dashboardPage.expectDashboardVisible();
  });

  test('@e2e should have empty cart after completing order', async ({ header }) => {
    const cartCount = await header.getCartItemCount();
    expect(cartCount).toBe(0);
  });
});

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
  });

  test('@e2e should display all product details', async ({ dashboardPage }) => {
    const names = await dashboardPage.getProductNames();
    expect(names.length).toBeGreaterThan(0);
    
    names.forEach(name => {
      expect(name.length).toBeGreaterThan(0);
    });
  });

  test('@e2e should display prices for all products', async ({ dashboardPage }) => {
    const prices = await dashboardPage.getProductPrices();
    expect(prices.length).toBe(6);
    
    prices.forEach(price => {
      expect(price).toBeGreaterThan(0);
    });
  });

  test('@e2e should open and find menu items', async ({ dashboardPage }) => {
    await dashboardPage.openMenu();
    
    // Verify menu items exist
    const menuItems = dashboardPage.page.locator('.bm-item-list a');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('@e2e should have correct page title', async ({ dashboardPage }) => {
    const title = await dashboardPage.getTitle();
    expect(title).toContain('Swag Labs');
  });
});
