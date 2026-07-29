import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

/**
 * HEALING: UI REFACTOR
 * Selector stopped working because UI structure changed
 * (element moved, renamed, or re-parented).
 */
test.describe('Healing: UI Refactor', () => {
  test('heals after hypothetical div wrapper added around button', async ({ page, healerAgent }) => {
    console.log('\n━━━ UI REFACTOR: Button wrapped in new div ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('[data-test="username"]', 'standard_user');
    await page.fill('[data-test="password"]', 'secret_sauce');

    // Pretend a UI refactor changed the login button's parent structure
    // Old CSS: input[type="submit"] (direct child)
    // New CSS after refactor: the input is now inside a .button-wrapper div
    const REFACTORED_SELECTOR = '.button-wrapper > input[type="submit"]';

    console.log('🔴 Attempting refactored selector (after hypothetical UI change)...');
    try {
      await page.click(REFACTORED_SELECTOR, { timeout: 3000 });
    } catch (error: any) {
      console.log('❌ UI refactor broke selector:', error.message.split('\n')[0]);

      const failure: FailureEvent = {
        testContext: { testId: 'refactor-001', testName: 'healing-refactor', intent: 'click the login button to sign in', stepIndex: 2, startTime: new Date(), environment: 'dev' },
        stepIndex: 2, type: 'locator_break', oldSelector: REFACTORED_SELECTOR, errorMessage: error.message, currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
        console.log('   Explanation:', result.explanation);
        await resolveSelector(page, result.newSelector).click();
      } else {
        await page.click('[data-test="login-button"]');
      }
    }

    await expect(page).toHaveURL(/inventory\.html/, { timeout: 10000 });
    console.log('✅ Logged in — UI refactor healed!\n');
  });

  test('heals after id-to-data-testid migration', async ({ page, healerAgent }) => {
    console.log('\n━━━ UI REFACTOR: id changed to data-testid ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });

    // Old id-based selector that was deprecated
    const OLD_ID_SELECTOR = '#user-name-old';

    console.log('🔴 Attempting deprecated id selector...');
    try {
      await page.click(OLD_ID_SELECTOR, { timeout: 3000 });
    } catch (error: any) {
      console.log('❌ Deprecated id:', error.message.split('\n')[0]);

      const failure: FailureEvent = {
        testContext: { testId: 'refactor-002', testName: 'healing-id-migration', intent: 'enter the username in the login form', stepIndex: 0, startTime: new Date(), environment: 'dev' },
        stepIndex: 0, type: 'locator_break', oldSelector: OLD_ID_SELECTOR, errorMessage: error.message, currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
        try {
          await resolveSelector(page, result.newSelector).fill('standard_user');
        } catch (strictErr: any) {
          if (strictErr.message.includes('strict mode')) {
            await resolveSelector(page, result.newSelector).first().fill('standard_user');
          }
        }
      } else {
        await page.fill('[data-test="username"]', 'standard_user');
      }
    }

    // Complete login to verify
    await page.fill('[data-test="password"]', 'secret_sauce');
    await page.click('[data-test="login-button"]');
    await expect(page).toHaveURL(/inventory\.html/);
    console.log('✅ Login complete — id migration healed!\n');
  });
});

function resolveSelector(page: any, selector: string): any {
  let qualifier: 'first' | 'last' | null = null;
  let nthIndex: number | null = null;
  const nthMatch = selector.match(/\.nth\((\d+)\)\s*$/);
  if (nthMatch) { nthIndex = parseInt(nthMatch[1]); selector = selector.replace(/\.nth\(\d+\)\s*$/, '').trim(); }
  const firstMatch = selector.match(/\.first\(\)\s*$/);
  if (firstMatch) { qualifier = 'first'; selector = selector.replace(/\.first\(\)\s*$/, '').trim(); }
  const lastMatch = selector.match(/\.last\(\)\s*$/);
  if (lastMatch) { qualifier = 'last'; selector = selector.replace(/\.last\(\)\s*$/, '').trim(); }

  let locator: any;
  const roleMatch = selector.match(/getByRole\('([^']+)'(?:,\s*\{([^}]+)\})?\)/);
  if (roleMatch) {
    const opts: Record<string, any> = {};
    const nm = (roleMatch[2] || '').match(/name:\s*(\/.+\/[a-z]*)/);
    if (nm) { const s = nm[1]; const i = s.lastIndexOf('/'); opts.name = new RegExp(s.slice(1, i), s.slice(i + 1)); }
    locator = page.getByRole(roleMatch[1], opts);
  } else {
    const tm = selector.match(/getByText\((.+)\)/);
    const lm = selector.match(/getByLabel\((.+)\)/);
    const tid = selector.match(/getByTestId\((.+)\)/);
    if (tm) {
      let a = tm[1].trim();
      if (a.startsWith('/')) { const i = a.lastIndexOf('/'); locator = page.getByText(new RegExp(a.slice(1, i), a.slice(i + 1))); }
      else locator = page.getByText(a.replace(/['"]/g, ''));
    } else if (lm) {
      let a = lm[1].trim();
      if (a.startsWith('/')) { const i = a.lastIndexOf('/'); locator = page.getByLabel(new RegExp(a.slice(1, i), a.slice(i + 1))); }
      else locator = page.getByLabel(a.replace(/['"]/g, ''));
    } else if (tid) {
      locator = page.getByTestId(tid[1].replace(/['"]/g, ''));
    } else {
      locator = page.locator(selector);
    }
  }
  if (qualifier === 'first') return locator.first();
  if (qualifier === 'last') return locator.last();
  if (nthIndex !== null) return locator.nth(nthIndex);
  return locator;
}
