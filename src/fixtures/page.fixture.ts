import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/pages/LoginPage';
import { DashboardPage } from '../page-objects/pages/DashboardPage';
import { CheckoutPage } from '../page-objects/pages/CheckoutPage';
import { HeaderComponent } from '../page-objects/components/HeaderComponent';
import { ContextManager } from '../agents/shared/ContextManager';
import { HealerAgent } from '../agents/healer/HealerAgent';

/**
 * Extended test fixtures for AutoHeal QA.
 * Provides page objects and agents pre-configured for each test.
 */
export type AutoHealFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  checkoutPage: CheckoutPage;
  header: HeaderComponent;
  contextManager: ContextManager;
  healerAgent: HealerAgent;
  authenticatedPage: Page;
};

export const test = base.extend<AutoHealFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  checkoutPage: async ({ page }, use) => {
    const checkoutPage = new CheckoutPage(page);
    await use(checkoutPage);
  },

  header: async ({ page }, use) => {
    const header = new HeaderComponent(page);
    await use(header);
  },

  contextManager: async ({}, use) => {
    const cm = new ContextManager('dev');
    await use(cm);
  },

  healerAgent: async ({ contextManager }, use) => {
    const healer = new HealerAgent(contextManager);
    await use(healer);
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
    await use(page);
  },
});

export { expect } from '@playwright/test';
