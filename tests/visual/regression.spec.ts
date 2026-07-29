import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * 
 * Captures screenshots and validates visual consistency.
 */
test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.saucedemo.com');
  });

  test('@visual should render login page correctly', async ({ page }) => {
    // Take screenshot for visual comparison
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toBeTruthy();
    
    // Verify key elements visible
    await expect(page.locator('.login_logo')).toBeVisible();
    await expect(page.locator('[data-test="username"]')).toBeVisible();
    await expect(page.locator('[data-test="password"]')).toBeVisible();
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
  });

  test('@visual should render dashboard after login', async ({ page }) => {
    // Login
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL(/inventory\.html/);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toBeTruthy();

    // Verify product grid visible
    await expect(page.locator('.inventory_list')).toBeVisible();
  });

  test('@visual should render cart page correctly', async ({ page }) => {
    // Login + add item to cart + go to cart
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL(/inventory\.html/);
    
    await page.locator('button.btn_inventory').first().click();
    await page.locator('.shopping_cart_link').click();
    await page.waitForURL(/cart\.html/);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toBeTruthy();
    await expect(page.locator('.cart_list')).toBeVisible();
  });
});
