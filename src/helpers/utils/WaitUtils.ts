import { Locator } from '@playwright/test';

/**
 * WaitUtils - Custom wait strategies beyond Playwright's built-in waits.
 */
export class WaitUtils {
  /**
   * Waits for a condition to be true, polling at intervals.
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    options?: { timeout?: number; interval?: number }
  ): Promise<void> {
    const timeout = options?.timeout || 10000;
    const interval = options?.interval || 500;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (await condition()) return;
      await new Promise(r => setTimeout(r, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Waits for a minimum amount of time (like page.waitForTimeout but less).
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Waits for network to be idle.
   */
  static async waitForNetworkIdle(page: any, timeout: number = 30000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Waits for a specific loading indicator to disappear.
   */
  static async waitForLoadingComplete(
    page: any,
    loadingIndicatorSelector: string = '.loading, .spinner, [aria-busy="true"]'
  ): Promise<void> {
    try {
      // Wait for loading to appear (may already be there)
      await page.locator(loadingIndicatorSelector).first().waitFor({
        state: 'attached',
        timeout: 2000,
      });
      // Wait for it to disappear
      await page.locator(loadingIndicatorSelector).first().waitFor({
        state: 'hidden',
        timeout: 15000,
      });
    } catch {
      // No loading indicator appeared, that's fine
    }
  }

  /**
   * Waits for an animation to complete.
   */
  static async waitForAnimation(
    locator: Locator,
    timeout: number = 5000
  ): Promise<void> {
    const initial = await locator.boundingBox();
    if (!initial) return;

    await this.waitForCondition(
      async () => {
        const current = await locator.boundingBox();
        if (!current) return true;
        return (
          current.x === initial.x &&
          current.y === initial.y &&
          current.width === initial.width &&
          current.height === initial.height
        );
      },
      { timeout, interval: 200 }
    );
  }

  /**
   * Retries a function with exponential backoff.
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: { maxRetries?: number; delayMs?: number }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const delayMs = options?.delayMs || 1000;
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (i < maxRetries) {
          await this.sleep(delayMs * Math.pow(2, i));
        }
      }
    }

    throw lastError!;
  }
}
