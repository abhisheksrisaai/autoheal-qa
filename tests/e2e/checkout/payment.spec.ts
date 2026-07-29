import { test, expect } from '../../../src/fixtures/page.fixture';

/**
 * E2E Tests: Checkout Flow
 * 
 * Covers full checkout: cart -> info -> overview -> confirmation.
 */

test.describe('Checkout', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
    await dashboardPage.addProductToCart(0);
    await dashboardPage.addProductToCart(1);
    await dashboardPage.goToCart();
  });

  test('@smoke @e2e should complete full checkout flow', async ({ checkoutPage }) => {
    // Cart page
    await expect(checkoutPage.page.locator('.cart_list')).toBeVisible();
    
    // Proceed to checkout step 1
    await checkoutPage.clickCheckout();
    await checkoutPage.expectOnCheckoutStepOne();
    
    // Fill shipping info
    await checkoutPage.fillShippingInfo('John', 'Doe', '12345');
    await checkoutPage.clickContinue();
    
    // Step 2: Overview
    await checkoutPage.expectOnCheckoutStepTwo();
    const summary = await checkoutPage.getOrderSummary();
    expect(summary.subtotal).toBeGreaterThan(0);
    expect(summary.total).toBeGreaterThan(0);
    
    // Finish
    await checkoutPage.clickFinish();
    await checkoutPage.expectOrderComplete();
    
    // Verify confirmation message
    const message = await checkoutPage.getConfirmationMessage();
    expect(message).toContain('Thank you');
  });

  test('@e2e should show order summary with correct items', async ({ checkoutPage }) => {
    await checkoutPage.clickCheckout();
    await checkoutPage.fillShippingInfo('Jane', 'Smith', '54321');
    await checkoutPage.clickContinue();
    
    const itemCount = await checkoutPage.getSummaryItemCount();
    expect(itemCount).toBe(2);
    
    const summary = await checkoutPage.getOrderSummary();
    // Total = subtotal + tax
    expect(summary.total).toBeCloseTo(summary.subtotal + summary.tax, 1);
  });

  test('@e2e should cancel checkout and return to cart', async ({ checkoutPage }) => {
    await checkoutPage.clickCheckout();
    await checkoutPage.expectOnCheckoutStepOne();
    await checkoutPage.clickCancel();
    
    // Back on cart page
    await expect(checkoutPage.page.locator('.cart_list')).toBeVisible();
  });

  test('@e2e should show error for missing first name', async ({ checkoutPage }) => {
    await checkoutPage.clickCheckout();
    await checkoutPage.fillShippingInfo('', 'Doe', '12345');
    await checkoutPage.clickContinue();
    
    // Should show error (first name required)
    const errorVisible = await checkoutPage.page
      .locator('[data-test="error"]')
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('@e2e should show error for missing postal code', async ({ checkoutPage }) => {
    await checkoutPage.clickCheckout();
    await checkoutPage.fillShippingInfo('John', 'Doe', '');
    await checkoutPage.clickContinue();
    
    const errorVisible = await checkoutPage.page
      .locator('[data-test="error"]')
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeTruthy();
  });

  test('@e2e should return to dashboard after completing order', async ({ checkoutPage, dashboardPage }) => {
    await checkoutPage.clickCheckout();
    await checkoutPage.fillShippingInfo('Alice', 'Johnson', '90210');
    await checkoutPage.clickContinue();
    await checkoutPage.clickFinish();
    await checkoutPage.clickBackHome();
    
    await dashboardPage.expectDashboardVisible();
  });
});
