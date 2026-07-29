import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * HeaderComponent - Reusable header/navigation component.
 */
export class HeaderComponent {
  private page: Page;

  private readonly selectors = {
    header: '.primary_header',
    logo: '.app_logo',
    cartLink: '.shopping_cart_link',
    cartBadge: '.shopping_cart_badge',
    menuButton: '#react-burger-menu-btn',
    sortDropdown: '[data-test="product_sort_container"]',
  };

  constructor(page: Page) {
    this.page = page;
  }

  async goToCart(): Promise<void> {
    await this.page.locator(this.selectors.cartLink).click();
  }

  async getCartItemCount(): Promise<number> {
    try {
      const badge = this.page.locator(this.selectors.cartBadge);
      if (await badge.isVisible()) {
        const text = await badge.textContent();
        return text ? parseInt(text, 10) : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async openMenu(): Promise<void> {
    await this.page.locator(this.selectors.menuButton).click();
  }

  async sortProducts(option: string): Promise<void> {
    await this.page.locator(this.selectors.sortDropdown).selectOption(option);
  }

  async expectLogoVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.logo)).toBeVisible();
  }
}
