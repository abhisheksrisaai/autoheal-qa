import { test, expect } from '../../../src/fixtures/page.fixture';
import { TestDataFactory } from '../../../src/helpers/data/TestDataFactory';

/**
 * E2E Tests: Authentication
 * 
 * Covers login, logout, and error handling flows.
 */

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('@smoke @e2e should login with valid standard user credentials', async ({ loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.expectLoginPageVisible();
      
      await loginPage.login('standard_user', 'secret_sauce');
      
      await dashboardPage.expectDashboardVisible();
    });

    test('@e2e should login with performance_glitch_user', async ({ loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.login('performance_glitch_user', 'secret_sauce');
      await dashboardPage.expectDashboardVisible();
    });

    test('@e2e should login with problem_user', async ({ loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.login('problem_user', 'secret_sauce');
      await dashboardPage.expectDashboardVisible();
    });

    test('@e2e should show error for locked out user', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('locked_out_user', 'secret_sauce');
      await loginPage.expectErrorMessage(/locked out/i);
    });

    test('@e2e should show error for invalid credentials', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('invalid_user', 'wrong_password');
      await loginPage.expectErrorMessage();
    });

    test('@e2e should show error for empty username', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('', 'secret_sauce');
      await loginPage.expectErrorMessage(/username is required/i);
    });

    test('@e2e should show error for empty password', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('standard_user', '');
      await loginPage.expectErrorMessage(/password is required/i);
    });

    test('@e2e should close error message', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('invalid_user', 'wrong_password');
      await loginPage.closeErrorMessage();
      await loginPage.expectNoErrorMessage();
    });
  });

  test.describe('Logout', () => {
    test('@e2e should logout successfully', async ({ loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.loginAsStandardUser();
      await dashboardPage.expectDashboardVisible();
      
      await dashboardPage.logout();
      await loginPage.expectLoginPageVisible();
    });
  });
});
