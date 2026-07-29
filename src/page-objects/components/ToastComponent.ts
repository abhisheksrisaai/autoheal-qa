import { Page, expect } from '@playwright/test';

/**
 * ToastComponent - Reusable toast/notification component.
 */
export class ToastComponent {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForToast(): Promise<void> {
    await this.page.locator('.toast, .notification, [role="alert"]')
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  async getMessage(): Promise<string> {
    const toast = this.page.locator('.toast, .notification, [role="alert"]').first();
    return (await toast.textContent()) || '';
  }

  async dismiss(): Promise<void> {
    const closeButton = this.page.locator('.toast-close, .notification-close, [aria-label="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  async expectMessage(containsText: string): Promise<void> {
    await expect(
      this.page.locator('.toast, .notification, [role="alert"]').first()
    ).toContainText(containsText);
  }
}
