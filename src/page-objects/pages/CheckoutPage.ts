import { Page, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

/**
 * CheckoutPage - Page Object for the SauceDemo checkout flow.
 */
export class CheckoutPage extends BasePage {
  private readonly selectors = {
    // Cart page
    cartList: '.cart_list',
    cartItem: '.cart_item',
    checkoutButton: '[data-test="checkout"]',
    continueShoppingButton: '[data-test="continue-shopping"]',
    removeButton: '.cart_button', // remove from cart

    // Checkout step 1: Information
    firstNameInput: '[data-test="firstName"]',
    lastNameInput: '[data-test="lastName"]',
    postalCodeInput: '[data-test="postalCode"]',
    continueButton: '[data-test="continue"]',
    cancelButton: '[data-test="cancel"]',

    // Checkout step 2: Overview
    summaryInfo: '.summary_info',
    summarySubtotal: '.summary_subtotal_label',
    summaryTax: '.summary_tax_label',
    summaryTotal: '.summary_total_label',
    finishButton: '[data-test="finish"]',

    // Checkout complete
    completeHeader: '.complete-header',
    completeText: '.complete-text',
    backHomeButton: '[data-test="back-to-products"]',
    ponyExpress: '.pony_express',
  };

  constructor(page: Page) {
    super(page, '/cart.html');
  }

  // ---- Cart Page ----

  async gotoCart(): Promise<void> {
    await this.navigate();
  }

  async clickCheckout(): Promise<void> {
    await this.clickWithHealing(this.selectors.checkoutButton, 'Click checkout button');
    await this.page.waitForURL(/checkout-step-one\.html/);
  }

  async getCartItemCount(): Promise<number> {
    return this.page.locator(this.selectors.cartItem).count();
  }

  // ---- Checkout Step 1: Information ----

  async fillShippingInfo(
    firstName: string,
    lastName: string,
    postalCode: string
  ): Promise<void> {
    await this.fillWithHealing(
      this.selectors.firstNameInput,
      firstName,
      'Fill first name'
    );
    await this.fillWithHealing(
      this.selectors.lastNameInput,
      lastName,
      'Fill last name'
    );
    await this.fillWithHealing(
      this.selectors.postalCodeInput,
      postalCode,
      'Fill postal code'
    );
  }

  async clickContinue(): Promise<void> {
    await this.clickWithHealing(this.selectors.continueButton, 'Click continue');
    await this.page.waitForURL(/checkout-step-two\.html/);
  }

  async clickCancel(): Promise<void> {
    await this.clickWithHealing(this.selectors.cancelButton, 'Cancel checkout');
    await this.page.waitForURL(/cart\.html/);
  }

  // ---- Checkout Step 2: Overview ----

  async getOrderSummary(): Promise<{
    subtotal: number;
    tax: number;
    total: number;
  }> {
    const subtotalText = await this.page
      .locator(this.selectors.summarySubtotal)
      .textContent();
    const taxText = await this.page
      .locator(this.selectors.summaryTax)
      .textContent();
    const totalText = await this.page
      .locator(this.selectors.summaryTotal)
      .textContent();

    const parsePrice = (text: string | null) =>
      text ? parseFloat(text.replace(/[^0-9.]/g, '')) : 0;

    return {
      subtotal: parsePrice(subtotalText),
      tax: parsePrice(taxText),
      total: parsePrice(totalText),
    };
  }

  async getSummaryItemCount(): Promise<number> {
    return this.page.locator(this.selectors.cartItem).count();
  }

  async clickFinish(): Promise<void> {
    await this.clickWithHealing(this.selectors.finishButton, 'Click finish button');
    await this.page.waitForURL(/checkout-complete\.html/);
  }

  // ---- Checkout Complete ----

  async expectOrderComplete(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.completeHeader)
    ).toBeVisible();
    await expect(
      this.page.locator(this.selectors.completeHeader)
    ).toContainText(/thank you|complete/i);
  }

  async getConfirmationMessage(): Promise<string> {
    const header = await this.page.locator(this.selectors.completeHeader).textContent();
    const text = await this.page.locator(this.selectors.completeText).textContent();
    return `${header}: ${text}`;
  }

  async clickBackHome(): Promise<void> {
    await this.clickWithHealing(
      this.selectors.backHomeButton,
      'Click back to products'
    );
    await this.page.waitForURL(/inventory\.html/);
  }

  // ---- Assertions ----

  async expectOnCheckoutStepOne(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.firstNameInput)
    ).toBeVisible();
  }

  async expectOnCheckoutStepTwo(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.finishButton)
    ).toBeVisible();
  }

  async expectOnConfirmationPage(): Promise<void> {
    await expect(
      this.page.locator(this.selectors.completeHeader)
    ).toBeVisible();
  }

  async expectCartNotEmpty(): Promise<void> {
    const count = await this.getCartItemCount();
    expect(count).toBeGreaterThan(0);
  }
}
