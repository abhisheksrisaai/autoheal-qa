import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * DashboardPage - Page Object for the SauceDemo inventory/products page.
 */
export class DashboardPage extends BasePage {
  private readonly selectors = {
    title: '.title',
    inventoryList: '.inventory_list',
    inventoryItem: '.inventory_item',
    inventoryItemName: '.inventory_item_name',
    inventoryItemPrice: '.inventory_item_price',
    inventoryItemDesc: '.inventory_item_desc',
    addToCartButton: 'button.btn_inventory',
    removeButton: 'button.btn_inventory', // Same button toggles
    shoppingCartLink: '.shopping_cart_link',
    shoppingCartBadge: '.shopping_cart_badge',
    sortDropdown: '[data-test="product_sort_container"]',
    burgerMenu: '#react-burger-menu-btn',
    logoutLink: '#logout_sidebar_link',
  };

  constructor(page: Page) {
    super(page, '/inventory.html');
  }

  async goto(): Promise<void> {
    await this.navigate();
  }

  // ---- Actions ----

  /**
   * Adds a product to the cart by its index.
   */
  async addProductToCart(index: number = 0): Promise<void> {
    const buttons = this.page.locator(this.selectors.addToCartButton);
    const count = await buttons.count();

    if (index >= count) {
      throw new Error(`Product index ${index} out of range (max: ${count - 1})`);
    }

    await buttons.nth(index).click();
  }

  /**
   * Adds a product to the cart by its name.
   */
  async addProductToCartByName(productName: string): Promise<void> {
    const item = this.page.locator(this.selectors.inventoryItem, {
      hasText: productName,
    });
    const button = item.locator('button');
    await button.click();
  }

  /**
   * Removes a product from the cart by index.
   */
  async removeProductFromCart(index: number = 0): Promise<void> {
    const buttons = this.page.locator(this.selectors.removeButton);
    await buttons.nth(index).click();
  }

  /**
   * Navigates to the shopping cart.
   */
  async goToCart(): Promise<void> {
    await this.clickWithHealing(
      this.selectors.shoppingCartLink,
      'Navigate to shopping cart'
    );
    await this.page.waitForURL(/cart\.html/);
  }

  /**
   * Opens the side menu.
   */
  async openMenu(): Promise<void> {
    await this.clickWithHealing(this.selectors.burgerMenu, 'Open menu');
  }

  /**
   * Logs out from the side menu.
   */
  async logout(): Promise<void> {
    await this.openMenu();
    await this.clickWithHealing(this.selectors.logoutLink, 'Logout');
    await this.page.waitForURL(/\//);
  }

  /**
   * Sorts products by the given option.
   */
  async sortProducts(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    const sortMap = { az: 'az', za: 'za', lohi: 'lohi', hilo: 'hilo' };
    const value = sortMap[option];
    await this.page.locator(this.selectors.sortDropdown).selectOption({ value });
  }

  // ---- Queries ----

  /**
   * Gets the number of products displayed.
   */
  async getProductCount(): Promise<number> {
    return this.page.locator(this.selectors.inventoryItem).count();
  }

  /**
   * Gets all product names.
   */
  async getProductNames(): Promise<string[]> {
    const names = await this.page.locator(this.selectors.inventoryItemName).allTextContents();
    return names;
  }

  /**
   * Gets all product prices as numbers.
   */
  async getProductPrices(): Promise<number[]> {
    const prices = await this.page.locator(this.selectors.inventoryItemPrice).allTextContents();
    return prices.map(p => parseFloat(p.replace('$', '')));
  }

  /**
   * Gets the cart badge count.
   */
  async getCartItemCount(): Promise<number> {
    try {
      const badge = this.page.locator(this.selectors.shoppingCartBadge);
      const text = await badge.textContent();
      return text ? parseInt(text, 10) : 0;
    } catch {
      return 0;
    }
  }

  // ---- Assertions ----

  async expectDashboardVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.inventoryList)).toBeVisible();
    await expect(this.page.locator(this.selectors.title)).toHaveText('Products');
  }

  async expectProductCount(expected: number): Promise<void> {
    await expect(this.page.locator(this.selectors.inventoryItem)).toHaveCount(expected);
  }

  async expectCartBadgeCount(expected: number): Promise<void> {
    if (expected === 0) {
      await expect(
        this.page.locator(this.selectors.shoppingCartBadge)
      ).not.toBeVisible();
    } else {
      await expect(
        this.page.locator(this.selectors.shoppingCartBadge)
      ).toHaveText(String(expected));
    }
  }
}
