import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { HealingResult } from '../../types';

/**
 * LoginPage - Page Object for the SauceDemo login page.
 * 
 * Supports:
 * - Standard login
 * - Error handling for invalid credentials
 * - Self-healing locators
 */
export class LoginPage extends BasePage {
  // Selectors with fallback patterns for self-healing
  private readonly selectors = {
    usernameInput: '[data-test="username"]',
    passwordInput: '[data-test="password"]',
    loginButton: '[data-test="login-button"]',
    errorMessage: '[data-test="error"]',
    errorCloseButton: '.error-button',
    loginLogo: '.login_logo',
    loginCredentials: '.login_credentials',
    loginPassword: '.login_password',
  };

  constructor(page: Page) {
    super(page, '/');
  }

  // ---- Navigation ----

  async goto(): Promise<void> {
    await this.navigate();
    await this.waitForLoginPage();
  }

  // ---- Actions ----

  /**
   * Performs login with the given credentials.
   * Automatically heals if selectors break.
   */
  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; healingUsed: boolean }> {
    let healingUsed = false;

    // Fill username with healing
    const usernameHeal = await this.fillWithHealing(
      this.selectors.usernameInput,
      username,
      'Enter username'
    );
    if (usernameHeal) healingUsed = true;

    // Fill password with healing
    const passwordHeal = await this.fillWithHealing(
      this.selectors.passwordInput,
      password,
      'Enter password'
    );
    if (passwordHeal) healingUsed = true;

    // Click login with healing
    const clickHeal = await this.clickWithHealing(
      this.selectors.loginButton,
      'Click the login button'
    );
    if (clickHeal) healingUsed = true;

    return { success: true, healingUsed };
  }

  /**
   * Logs in with standard user credentials.
   */
  async loginAsStandardUser(): Promise<void> {
    await this.login('standard_user', 'secret_sauce');
    // Wait for redirect to inventory
    await this.page.waitForURL(/inventory\.html/, { timeout: 10000 }).catch(() => {
      // Maybe still on login page due to error
    });
  }

  /**
   * Logs in as locked out user (for negative testing).
   */
  async loginAsLockedOutUser(): Promise<void> {
    await this.login('locked_out_user', 'secret_sauce');
  }

  /**
   * Logs in as problem user.
   */
  async loginAsProblemUser(): Promise<void> {
    await this.login('problem_user', 'secret_sauce');
  }

  // ---- Assertions ----

  /**
   * Verifies the login page is displayed.
   */
  async expectLoginPageVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.loginLogo)).toBeVisible();
    await expect(this.page.locator(this.selectors.usernameInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.loginButton)).toBeVisible();
  }

  /**
   * Verifies an error message is displayed.
   */
  async expectErrorMessage(expectedText?: string | RegExp): Promise<void> {
    const errorLocator = this.page.locator(this.selectors.errorMessage);
    await expect(errorLocator).toBeVisible();

    if (expectedText) {
      await expect(errorLocator).toContainText(expectedText);
    }
  }

  /**
   * Verifies the error message is NOT displayed.
   */
  async expectNoErrorMessage(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.errorMessage)
    ).not.toBeVisible();
  }

  /**
   * Verifies login was successful (redirected away from login page).
   */
  async expectLoginSuccessful(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/$/);
    await expect(this.page.locator('.inventory_list')).toBeVisible();
  }

  // ---- Helpers ----

  private async waitForLoginPage(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clicks the error close button.
   */
  async closeErrorMessage(): Promise<void> {
    await this.clickWithHealing(
      this.selectors.errorCloseButton,
      'Close error message'
    );
  }

  /**
   * Gets the displayed credentials hint (on SauceDemo).
   */
  async getDisplayedCredentials(): Promise<string> {
    const credentialsText = await this.page
      .locator(this.selectors.loginCredentials)
      .textContent();
    return credentialsText || '';
  }
}
