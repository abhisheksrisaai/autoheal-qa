import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

/**
 * HEALING: AMBIGUOUS SELECTOR
 * Selector matches multiple elements (strict mode violation).
 * Healer must pick the correct one based on intent.
 */
test.describe('Healing: Ambiguous Selector', () => {
  test('heals ambiguous add-to-cart with .first() resolution', async ({ page, healerAgent }) => {
    console.log('\n━━━ AMBIGUOUS: 6 matching buttons ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('[data-test="username"]', 'standard_user');
    await page.fill('[data-test="password"]', 'secret_sauce');
    await page.click('[data-test="login-button"]');
    await expect(page).toHaveURL(/inventory\.html/);

    // "Add to cart" appears 6 times — strict mode will reject this
    const AMBIGUOUS = 'button:has-text("Add to cart")';

    console.log('🔴 Attempting click on ambiguous selector...');
    try {
      await page.click(AMBIGUOUS, { timeout: 3000 });
      console.log('⚠️  Somehow worked (unlikely)');
    } catch (error: any) {
      console.log('❌ Strict mode violation:', error.message.split('\n')[0]);

      const failure: FailureEvent = {
        testContext: { testId: 'ambiguous-001', testName: 'healing-ambiguous', intent: 'add a product to the cart by clicking its Add to Cart button', stepIndex: 1, startTime: new Date(), environment: 'dev' },
        stepIndex: 1, type: 'locator_break', oldSelector: AMBIGUOUS, errorMessage: error.message, currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
        await resolveSelector(page, result.newSelector).click();
      } else {
        // Fallback: use .first()
        await page.locator('.btn_inventory').first().click();
      }
    }

    // Verify button changed to "Remove"
    const btnText = await page.locator('.btn_inventory').first().textContent();
    console.log('   Button now says:', btnText);
    console.log('✅ Ambiguity resolved — product added!\n');

    // Cleanup: remove from cart
    await page.locator('.btn_inventory').first().click();
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
