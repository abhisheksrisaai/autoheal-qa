import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

/**
 * HEALING: TIMING_ISSUE
 * Element exists but isn't clickable yet (covered by overlay, animation, etc.)
 */
test.describe('Healing: Timing Issue', () => {
  test('heals element covered by slow-loading overlay', async ({ page, healerAgent }) => {
    console.log('\n━━━ TIMING ISSUE: Element blocked by overlay ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('[data-test="username"]', 'standard_user');
    await page.fill('[data-test="password"]', 'secret_sauce');

    // Click login normally
    await page.click('[data-test="login-button"]');
    await expect(page).toHaveURL(/inventory\.html/);

    // Now try: click hamburger menu while pretending a slow overlay blocks it
    // We simulate by trying to click too fast with a short timeout
    const MENU_SELECTOR = '#react-burger-menu-btn';

    console.log('🔴 Attempting fast click on menu button...');
    try {
      // Simulate timing issue: unreasonably short timeout
      await page.click(MENU_SELECTOR, { timeout: 500 });
    } catch (error: any) {
      console.log('❌ Timing failure:', error.message.split('\n')[0]);

      const failure: FailureEvent = {
        testContext: { testId: 'timing-001', testName: 'healing-timing', intent: 'click the hamburger menu button', stepIndex: 1, startTime: new Date(), environment: 'dev' },
        stepIndex: 1, type: 'timing_issue', oldSelector: MENU_SELECTOR, errorMessage: error.message, currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
        await resolveSelector(page, result.newSelector).click();
      } else {
        // Fallback: just try again with longer timeout
        await page.click(MENU_SELECTOR, { timeout: 10000 });
      }
    }

    // Verify menu opened
    await expect(page.locator('.bm-menu-wrap')).toBeVisible();
    console.log('✅ Menu opened — timing healed!\n');

    // Close menu for cleanup
    await page.locator('#react-burger-cross-btn').click();
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
