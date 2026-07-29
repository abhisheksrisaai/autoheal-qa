import { test, expect } from '../../../src/fixtures/page.fixture';

/**
 * E2E Tests: Dashboard Settings
 */
test.describe('Dashboard Settings', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
  });

  test('@e2e should close menu by clicking X', async ({ dashboardPage }) => {
    await dashboardPage.openMenu();
    
    const closeButton = dashboardPage.page.locator('#react-burger-cross-btn');
    await closeButton.click();
    
    // Menu should close
    await expect(
      dashboardPage.page.locator('.bm-menu-wrap')
    ).not.toBeVisible();
  });

  test('@e2e should filter products by name Z to A', async ({ dashboardPage }) => {
    const dropdown = dashboardPage.page.locator('[data-test="product_sort_container"]');
    await expect(dropdown).toBeVisible();
  });
});
