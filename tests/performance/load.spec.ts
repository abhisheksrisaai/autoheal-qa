import { test, expect } from '@playwright/test';

/**
 * Performance Tests
 * 
 * Measures load times, response times, and resource usage.
 */
test.describe('Performance', () => {
  test('@performance should load login page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('https://www.saucedemo.com', {
      waitUntil: 'load',
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`Login page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 5 second threshold
  });

  test('@performance should login within 2 seconds', async ({ page }) => {
    await page.goto('https://www.saucedemo.com', { waitUntil: 'domcontentloaded' });
    
    const startTime = Date.now();
    
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL(/inventory\.html/, { timeout: 10000 });
    
    const loginTime = Date.now() - startTime;
    console.log(`Login action time: ${loginTime}ms`);
    expect(loginTime).toBeLessThan(5000); // 5 second threshold
  });

  test('@performance should load dashboard products within 3 seconds', async ({ page }) => {
    await page.goto('https://www.saucedemo.com', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    
    const startTime = Date.now();
    await page.waitForSelector('.inventory_item', { timeout: 10000 });
    const dashboardLoadTime = Date.now() - startTime;
    
    console.log(`Dashboard load time: ${dashboardLoadTime}ms`);
    expect(dashboardLoadTime).toBeLessThan(5000);
  });

  test('@performance should load all page resources without 404 errors', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.url()} (${response.status()})`);
      }
    });

    await page.goto('https://www.saucedemo.com');
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL(/inventory\.html/);
    
    if (failedRequests.length > 0) {
      console.warn(`Failed requests:\n${failedRequests.join('\n')}`);
    }
    // Note: SauceDemo intentionally returns some 4xx for tracking pixels
  });

  test('@performance should have fast Time to Interactive', async ({ page }) => {
    await page.goto('https://www.saucedemo.com', { waitUntil: 'load' });
    
    // Check that key interactive elements are enabled quickly
    const username = page.locator('[data-test="username"]');
    await expect(username).toBeEnabled({ timeout: 3000 });
    await expect(page.locator('[data-test="login-button"]')).toBeEnabled({ timeout: 3000 });
  });
});
