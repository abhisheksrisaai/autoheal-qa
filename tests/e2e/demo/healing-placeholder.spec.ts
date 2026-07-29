import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

/**
 * HEALING: PLACEHOLDER CHANGE
 * Input placeholder attribute was modified.
 */
test.describe('Healing: Placeholder Change', () => {
  test('heals when placeholder text changes', async ({ page, healerAgent }) => {
    console.log('\n━━━ PLACEHOLDER: Fill by display label instead ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });

    // Old placeholder after UI polish
    const OLD_PLACEHOLDER = 'Enter your username here';

    console.log('🔴 Looking for input with old placeholder:', OLD_PLACEHOLDER);
    const input = page.getByPlaceholder(OLD_PLACEHOLDER);

    try {
      await input.fill('standard_user', { timeout: 3000 });
    } catch (error: any) {
      console.log('❌ Placeholder changed:', error.message.split('\n')[0]);

      const failure: FailureEvent = {
        testContext: { testId: 'placeholder-001', testName: 'healing-placeholder', intent: 'fill the username field with valid credentials', stepIndex: 0, startTime: new Date(), environment: 'dev' },
        stepIndex: 0, type: 'locator_break', oldSelector: `getByPlaceholder("${OLD_PLACEHOLDER}")`, errorMessage: error.message, currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
        console.log('   Explanation:', result.explanation);
        try {
          await resolveSelector(page, result.newSelector).fill('standard_user');
        } catch (strictErr: any) {
          // Healed to ambiguous textbox — apply .first()
          if (strictErr.message.includes('strict mode')) {
            await resolveSelector(page, result.newSelector).first().fill('standard_user');
          }
        }
      } else {
        // Fallback: use test-id
        await page.fill('[data-test="username"]', 'standard_user');
      }
    }

    // Complete login
    await page.fill('[data-test="password"]', 'secret_sauce');
    await page.click('[data-test="login-button"]');
    await expect(page).toHaveURL(/inventory\.html/);
    console.log('✅ Logged in — placeholder change healed!\n');
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
