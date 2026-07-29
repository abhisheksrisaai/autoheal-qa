import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/pages/LoginPage';

/**
 * Authentication fixture - provides pre-authenticated tests.
 * 
 * Usage:
 * ```
 * test.use({ storageState: 'auth.json' });
 * test('authenticated test', async ({ page }) => { ... });
 * ```
 */
export interface AuthFixtures {
  authenticatedPage: Page;
  loginAndSaveState: (username: string, password: string) => Promise<void>;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsStandardUser();
    
    // Save auth state for reuse
    await page.context().storageState({ path: 'auth.json' });
    
    await use(page);
  },

  loginAndSaveState: async ({ page }, use) => {
    const fn = async (username: string, password: string) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(username, password);
      await page.context().storageState({ path: 'auth.json' });
    };
    await use(fn);
  },
});

export { expect } from '@playwright/test';
