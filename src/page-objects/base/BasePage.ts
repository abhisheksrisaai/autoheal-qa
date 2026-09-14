import { Page, Locator, expect } from '@playwright/test';
import { HealerAgent } from '../../agents/healer/HealerAgent';
import { ContextManager } from '../../agents/shared/ContextManager';
import { HealingResult, FailureEvent } from '../../types';
import { captureA11ySnapshot } from '../../helpers/captureA11y';

/**
 * BasePage - Abstract base class for all page objects with built-in self-healing.
 * 
 * Every page object extends this class to inherit:
 * - Automatic locator resolution with healing
 * - Screenshot on failure
 * - Accessibility tree capture
 * - Integration with HealerAgent
 */
export abstract class BasePage {
  public page: Page;
  protected healer: HealerAgent;
  protected contextManager: ContextManager;
  protected url: string;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
    this.healer = new HealerAgent();
    this.contextManager = new ContextManager();
  }

  /**
   * Navigation with automatic retry.
   */
  async navigate(path: string = ''): Promise<void> {
    const targetUrl = path || this.url;
    console.log(`[BasePage] Navigating to: ${targetUrl}`);
    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    this.contextManager.setCurrentUrl(this.page.url());
  }

  /**
   * Gets a locator with self-healing capability.
   */
  protected getLocator(selector: string): SelfHealingLocator {
    return new SelfHealingLocator(this.page, selector, this.healer, this.contextManager);
  }

  /**
   * Clicks an element with automatic healing.
   */
  async clickWithHealing(
    selector: string,
    intent: string,
    options?: { timeout?: number }
  ): Promise<HealingResult | null> {
    try {
      await this.page.locator(selector).first().click({
        timeout: options?.timeout || 15000,
      });
      return null; // No healing needed
    } catch (error: any) {
      console.warn(`[BasePage] Click failed for "${intent}", attempting heal...`);
      return this.attemptHeal(selector, intent, error, 'click');
    }
  }

  /**
   * Fills an input with automatic healing.
   */
  async fillWithHealing(
    selector: string,
    value: string,
    intent: string,
    options?: { timeout?: number }
  ): Promise<HealingResult | null> {
    try {
      await this.page.locator(selector).fill(value, {
        timeout: options?.timeout || 15000,
      });
      return null;
    } catch (error: any) {
      console.warn(`[BasePage] Fill failed for "${intent}", attempting heal...`);
      return this.attemptHeal(selector, intent, error, 'fill');
    }
  }

  /**
   * Waits for element with automatic healing.
   */
  async waitForWithHealing(
    selector: string,
    intent: string,
    state: 'visible' | 'attached' | 'hidden' = 'visible',
    options?: { timeout?: number }
  ): Promise<HealingResult | null> {
    try {
      await this.page.locator(selector).first().waitFor({
        state,
        timeout: options?.timeout || 10000,
      });
      return null;
    } catch (error: any) {
      console.warn(`[BasePage] Wait failed for "${intent}", attempting heal...`);
      return this.attemptHeal(selector, intent, error, 'wait');
    }
  }

  /**
   * Asserts element visibility with healing.
   */
  async expectVisibleWithHealing(
    selector: string,
    intent: string,
    options?: { timeout?: number }
  ): Promise<void> {
    try {
      await expect(this.page.locator(selector).first()).toBeVisible({
        timeout: options?.timeout || 10000,
      });
    } catch (error: any) {
      console.warn(`[BasePage] Assertion failed for "${intent}", attempting heal...`);
      const result = await this.attemptHeal(selector, intent, error, 'assert');

      if (result && result.success) {
        // Retry with healed selector
        await expect(this.page.locator(result.newSelector).first()).toBeVisible({
          timeout: options?.timeout || 10000,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Attempts to heal a failed selector.
   */
  private async attemptHeal(
    selector: string,
    intent: string,
    error: Error,
    action: string
  ): Promise<HealingResult> {
    const accessibilityTree = await this.captureAccessibilityTree();
    const currentUrl = this.page.url();

    const failure: FailureEvent = {
      testContext: this.contextManager.createTestContext(
        this.constructor.name,
        intent
      ),
      stepIndex: 0,
      type: 'locator_break',
      oldSelector: selector,
      errorMessage: error.message,
      currentUrl,
      timestamp: new Date(),
      accessibilityTree,
    };

    const result = await this.healer.handleFailure(failure);

    if (result.success) {
      console.log(
        `[BasePage] Healed "${intent}": ${selector} -> ${result.newSelector} ` +
        `(confidence: ${result.confidence})`
      );
    }

    return result;
  }

  /**
   * Captures the accessibility tree from the current page.
   */
  async captureAccessibilityTree(): Promise<any> {
    return (await captureA11ySnapshot(this.page)) ?? { role: 'WebArea', name: 'Unknown' };
  }

  /**
   * Takes a screenshot with timestamp.
   */
  async screenshot(label: string): Promise<string> {
    const path = `./reports/screenshots/${label}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Gets current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Gets current URL.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}

/**
 * SelfHealingLocator - An AI-augmented locator class.
 * 
 * Wraps Playwright's Locator with automatic self-healing capability.
 * When a locator fails, it automatically triggers the HealerAgent.
 */
export class SelfHealingLocator {
  private page: Page;
  private selector: string;
  private healer: HealerAgent;
  private contextManager: ContextManager;

  constructor(
    page: Page,
    selector: string,
    healer: HealerAgent,
    contextManager: ContextManager
  ) {
    this.page = page;
    this.selector = selector;
    this.healer = healer;
    this.contextManager = contextManager;
  }

  /**
   * Attempts to locate the element, healing if it fails.
   */
  private async resolve(intent: string): Promise<Locator> {
    try {
      const locator = this.page.locator(this.selector);
      // Verify the locator actually finds something
      await locator.first().waitFor({ state: 'attached', timeout: 3000 });
      return locator;
    } catch {
      // Trigger healing
      const accessibilityTree = await captureA11ySnapshot(this.page);
      const currentUrl = this.page.url();

      const failure: FailureEvent = {
        testContext: this.contextManager.createTestContext('SelfHealingLocator', intent),
        stepIndex: 0,
        type: 'locator_break',
        oldSelector: this.selector,
        errorMessage: `Selector "${this.selector}" not found`,
        currentUrl,
        timestamp: new Date(),
        accessibilityTree: accessibilityTree as any,
      };

      const result = await this.healer.handleFailure(failure);

      if (result.success) {
        console.log(`[SelfHealingLocator] Healed: ${this.selector} -> ${result.newSelector}`);
        this.selector = result.newSelector; // Update selector for future use
        return this.page.locator(this.selector);
      }

      // Fall back to original selector (will likely fail, but consistent behavior)
      return this.page.locator(this.selector);
    }
  }

  async click(intent: string = 'click'): Promise<void> {
    const locator = await this.resolve(intent);
    await locator.click();
  }

  async fill(value: string, intent: string = 'fill'): Promise<void> {
    const locator = await this.resolve(intent);
    await locator.fill(value);
  }

  async textContent(intent: string = 'get text'): Promise<string | null> {
    const locator = await this.resolve(intent);
    return locator.textContent();
  }

  async isVisible(intent: string = 'check visibility'): Promise<boolean> {
    try {
      const locator = await this.resolve(intent);
      return locator.isVisible();
    } catch {
      return false;
    }
  }

  getCurrentSelector(): string {
    return this.selector;
  }
}
