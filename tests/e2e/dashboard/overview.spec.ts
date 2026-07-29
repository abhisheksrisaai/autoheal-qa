import { test, expect } from '../../../src/fixtures/page.fixture';

/**
 * E2E Tests: Dashboard Overview
 */
test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
  });

  test('@e2e should display products page header', async ({ dashboardPage }) => {
    await dashboardPage.expectDashboardVisible();
  });

  test('@e2e should have six inventory items', async ({ dashboardPage }) => {
    await dashboardPage.expectProductCount(6);
  });

  test('@e2e should navigate to product detail', async ({ dashboardPage }) => {
    const firstProduct = dashboardPage.page.locator('.inventory_item_name').first();
    const productName = await firstProduct.textContent();
    await firstProduct.click();
    
    // Verify detail page has product name
    await expect(dashboardPage.page.locator('.inventory_details_name')).toContainText(productName || '');
  });
});

test.describe('Dashboard Settings & Navigation', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
  });

  test('@e2e should reset app state from menu', async ({ dashboardPage }) => {
    await dashboardPage.addProductToCart(0);
    await dashboardPage.openMenu();
    
    const resetLink = dashboardPage.page.locator('#reset_sidebar_link');
    await resetLink.click();
    
    await dashboardPage.expectCartBadgeCount(0);
  });

  test.skip('@e2e should navigate to about page', async ({ dashboardPage }) => {
    await dashboardPage.openMenu();
    const aboutLink = dashboardPage.page.locator('#about_sidebar_link');
    
    // About link opens Sauce Labs website
    // Just verify the link exists
    await expect(aboutLink).toBeVisible();
  });
});
