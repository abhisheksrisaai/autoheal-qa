import { expect, Page, Locator } from '@playwright/test';

/**
 * AssertionHelper - Custom assertions and validation helpers.
 */
export class AssertionHelper {
  /**
   * Asserts element contains text (case-insensitive).
   */
  static async expectTextContains(
    locator: Locator,
    text: string,
    timeout?: number
  ): Promise<void> {
    await expect(locator).toContainText(text, {
      ignoreCase: true,
      timeout: timeout || 5000,
    });
  }

  /**
   * Asserts element is visible and enabled.
   */
  static async expectInteractive(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
  }

  /**
   * Asserts page URL contains a path.
   */
  static expectUrlContains(page: Page, path: string): void {
    expect(page.url()).toContain(path);
  }

  /**
   * Asserts element count matches expectation.
   */
  static async expectCount(
    locator: Locator,
    expected: number,
    timeout?: number
  ): Promise<void> {
    await expect(locator).toHaveCount(expected, {
      timeout: timeout || 5000,
    });
  }

  /**
   * Asserts element has a specific attribute value.
   */
  static async expectAttribute(
    locator: Locator,
    attribute: string,
    value: string | RegExp
  ): Promise<void> {
    await expect(locator).toHaveAttribute(attribute, value);
  }

  /**
   * Asserts element has a CSS class.
   */
  static async expectClass(locator: Locator, className: string): Promise<void> {
    const classAttr = await locator.getAttribute('class');
    expect(classAttr).toContain(className);
  }

  /**
   * Soft assertion that does not fail the test immediately.
   */
  static async softAssert(
    assertion: () => Promise<void>,
    message?: string
  ): Promise<boolean> {
    try {
      await assertion();
      return true;
    } catch (error: any) {
      console.warn(`[SoftAssert] ${message || 'Assertion failed'}: ${error.message}`);
      return false;
    }
  }

  /**
   * Waits for and asserts an element is hidden.
   */
  static async expectHidden(
    locator: Locator,
    timeout?: number
  ): Promise<void> {
    await expect(locator).toBeHidden({ timeout: timeout || 5000 });
  }

  /**
   * Asserts a value is within a numeric range.
   */
  static expectInRange(
    actual: number,
    min: number,
    max: number,
    message?: string
  ): void {
    expect(actual).toBeGreaterThanOrEqual(min);
    expect(actual).toBeLessThanOrEqual(max);
  }
}
