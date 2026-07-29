import { Page, Locator, expect } from '@playwright/test';

/**
 * ModalComponent - Reusable modal dialog component.
 */
export class ModalComponent {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for a modal dialog to appear and returns it.
   */
  async waitForModal(selector: string = '.modal'): Promise<Locator> {
    const modal = this.page.locator(selector);
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    return modal;
  }

  /**
   * Closes a modal by clicking the close button.
   */
  async close(closeButtonSelector: string = '.modal-close'): Promise<void> {
    await this.page.locator(closeButtonSelector).click();
  }

  /**
   * Clicks a button inside a modal.
   */
  async clickButton(buttonText: string): Promise<void> {
    const modal = this.page.locator('.modal');
    const button = modal.locator('button', { hasText: buttonText });
    await button.click();
  }

  /**
   * Assert modal is visible.
   */
  async expectVisible(selector?: string): Promise<void> {
    await expect(this.page.locator(selector || '.modal')).toBeVisible();
  }

  /**
   * Assert modal is hidden.
   */
  async expectHidden(selector?: string): Promise<void> {
    await expect(this.page.locator(selector || '.modal')).not.toBeVisible();
  }
}
