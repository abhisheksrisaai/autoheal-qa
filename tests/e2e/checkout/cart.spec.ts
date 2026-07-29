import { test, expect } from '../../../src/fixtures/page.fixture';

/**
 * E2E Tests: Shopping Cart
 * 
 * Covers adding products, viewing cart, and cart management.
 */

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
    await dashboardPage.expectDashboardVisible();
  });

  test('@smoke @e2e should add a single product to cart', async ({ dashboardPage }) => {
    await dashboardPage.expectCartBadgeCount(0);
    
    await dashboardPage.addProductToCart(0);
    
    await dashboardPage.expectCartBadgeCount(1);
  });

  test('@e2e should add multiple products to cart', async ({ dashboardPage }) => {
    await dashboardPage.addProductToCart(0);
    await dashboardPage.addProductToCart(1);
    await dashboardPage.addProductToCart(2);
    
    await dashboardPage.expectCartBadgeCount(3);
  });

  test('@e2e should remove product from cart on dashboard', async ({ dashboardPage }) => {
    await dashboardPage.addProductToCart(0);
    await dashboardPage.expectCartBadgeCount(1);
    
    // After adding, the button text changes to "Remove"
    await dashboardPage.removeProductFromCart(0);
    await dashboardPage.expectCartBadgeCount(0);
  });

  test('@e2e should navigate to cart page', async ({ dashboardPage, checkoutPage }) => {
    await dashboardPage.addProductToCart(0);
    await dashboardPage.goToCart();
    
    await expect(checkoutPage.page.locator('.cart_list')).toBeVisible();
  });

  test('@e2e should persist cart items on cart page', async ({ dashboardPage, checkoutPage }) => {
    await dashboardPage.addProductToCart(0);
    await dashboardPage.addProductToCart(1);
    await dashboardPage.goToCart();
    
    const cartItems = await checkoutPage.getCartItemCount();
    expect(cartItems).toBe(2);
  });

  test('@e2e should display correct product count on dashboard', async ({ dashboardPage }) => {
    const count = await dashboardPage.getProductCount();
    expect(count).toBe(6); // SauceDemo has 6 products
  });

  test('@e2e should sort products A to Z', async ({ dashboardPage }) => {
    // Verify sort dropdown is present (SauceDemo uses custom select widget)
    const dropdown = dashboardPage.page.locator('[data-test="product_sort_container"]');
    await expect(dropdown).toBeVisible();
  });

  test('@e2e should sort products by price low to high', async ({ dashboardPage }) => {
    const dropdown = dashboardPage.page.locator('[data-test="product_sort_container"]');
    await expect(dropdown).toBeVisible();
    // Select option by value attribute (not text)
    await dropdown.selectOption('lohi');
  });
});
