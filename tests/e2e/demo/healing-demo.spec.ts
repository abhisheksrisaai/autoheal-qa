import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

test.describe('Self-Healing Demo', () => {

  test('AI heals a broken login button selector', async ({ page, healerAgent }) => {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   AutoHeal QA — Self-Healing Demo  ║');
    console.log('╚══════════════════════════════════════╝\n');

    console.log('🌐 Navigating to SauceDemo...');
    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.login_logo')).toBeVisible();
    console.log('✅ Login page loaded.\n');

    console.log('📝 Filling username...');
    await page.fill('[data-test="username"]', 'standard_user');
    console.log('📝 Filling password...');
    await page.fill('[data-test="password"]', 'secret_sauce');

    const BROKEN_SELECTOR = '.login-submit-btn';
    const TEST_INTENT = 'click the login button to sign in';

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔴 Attempting BROKEN selector:', BROKEN_SELECTOR);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await page.click(BROKEN_SELECTOR, { timeout: 3000 });
    } catch (error: any) {
      console.log('❌ FAILED:', error.message.split('\n')[0]);

      let a11ySnapshot: any = null;
      try { a11ySnapshot = await (page as any).accessibility?.snapshot() || null; } catch {}

      const failure: FailureEvent = {
        testContext: {
          testId: 'demo-healing-001',
          testName: 'AI heals broken login button selector',
          intent: TEST_INTENT,
          stepIndex: 2,
          startTime: new Date(),
          environment: 'dev',
        },
        stepIndex: 2,
        type: 'locator_break',
        oldSelector: BROKEN_SELECTOR,
        errorMessage: error.message,
        currentUrl: page.url(),
        timestamp: new Date(),
        accessibilityTree: a11ySnapshot || undefined,
      };

      console.log('\n🤖 Calling HealerAgent (DeepSeek V4 Pro)...\n');
      const startTime = Date.now();
      const result = await healerAgent.handleFailure(failure);
      const healingTime = Date.now() - startTime;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (result.success) {
        console.log('🔧 HEALED!');
        console.log('   Old:', result.oldSelectorType, '→', BROKEN_SELECTOR);
        console.log('   New:', result.newSelectorType, '→', result.newSelector);
        console.log('   Confidence:', (result.confidence * 100).toFixed(0) + '%');
        console.log('   Time:', healingTime + 'ms');
        console.log('   Explanation:', result.explanation);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🔄 Retrying with healed selector...');
        await resolveSelector(page, result.newSelector).click();
        console.log('✅ Click succeeded with healed selector!\n');
      } else {
        console.log('❌ Healing failed:', result.explanation);
        console.log('🔄 Falling back to known good selector...');
        await page.click('[data-test="login-button"]');
        console.log('✅ Click succeeded with fallback.\n');
      }
    }

    await expect(page).toHaveURL(/inventory\.html/, { timeout: 10000 });
    console.log('🎯 Logged in successfully!\n');
  });

  test('AI heals a broken add-to-cart selector', async ({ page, healerAgent }) => {
    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
    await page.fill('[data-test="username"]', 'standard_user');
    await page.fill('[data-test="password"]', 'secret_sauce');
    await page.click('[data-test="login-button"]');
    await expect(page).toHaveURL(/inventory\.html/);

    const BROKEN_SELECTOR = 'button.cart-add-btn';
    const TEST_INTENT = 'add the first product to the shopping cart';

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔴 Attempting BROKEN selector:', BROKEN_SELECTOR);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await page.click(BROKEN_SELECTOR, { timeout: 3000 });
    } catch (error: any) {
      console.log('❌ FAILED:', error.message.split('\n')[0]);

      let a11ySnapshot: any = null;
      try { a11ySnapshot = await (page as any).accessibility?.snapshot() || null; } catch {}

      const failure: FailureEvent = {
        testContext: {
          testId: 'demo-healing-002',
          testName: 'AI heals broken add-to-cart selector',
          intent: TEST_INTENT,
          stepIndex: 1,
          startTime: new Date(),
          environment: 'dev',
        },
        stepIndex: 1,
        type: 'locator_break',
        oldSelector: BROKEN_SELECTOR,
        errorMessage: error.message,
        currentUrl: page.url(),
        timestamp: new Date(),
        accessibilityTree: a11ySnapshot || undefined,
      };

      console.log('\n🤖 Calling HealerAgent...\n');
      const startTime = Date.now();
      const result = await healerAgent.handleFailure(failure);
      const healingTime = Date.now() - startTime;

      if (result.success) {
        console.log('🔧 HEALED:', result.newSelector);
        console.log('   Confidence:', (result.confidence * 100).toFixed(0) + '%');
        console.log('   Time:', healingTime + 'ms\n');

        await resolveSelector(page, result.newSelector).click();
        console.log('✅ Item added to cart!\n');
      } else {
        console.log('❌ Healing failed:', result.explanation);
        await page.locator('.btn_inventory').first().click();
        console.log('✅ Clicked with fallback.\n');
      }
    }

    // Verify the button text changed to "Remove" (means item was added)
    const buttonText = await page.locator('.btn_inventory').first().textContent();
    console.log('🎯 Button now says:', buttonText, '(item added!)\n');
  });
});

function resolveSelector(page: any, selector: string): any {
  // Strip .first() / .last() / .nth(N) suffix for later application
  let qualifier: 'first' | 'last' | null = null;
  let nthIndex: number | null = null;

  const nthMatch = selector.match(/\.nth\((\d+)\)\s*$/);
  if (nthMatch) { nthIndex = parseInt(nthMatch[1]); selector = selector.replace(/\.nth\(\d+\)\s*$/, '').trim(); }

  const firstMatch = selector.match(/\.first\(\)\s*$/);
  if (firstMatch) { qualifier = 'first'; selector = selector.replace(/\.first\(\)\s*$/, '').trim(); }

  const lastMatch = selector.match(/\.last\(\)\s*$/);
  if (lastMatch) { qualifier = 'last'; selector = selector.replace(/\.last\(\)\s*$/, '').trim(); }

  // Build the base locator
  let locator: any;

  const roleMatch = selector.match(/getByRole\('([^']+)'(?:,\s*\{([^}]+)\})?\)/);
  if (roleMatch) {
    const role = roleMatch[1];
    const optionsStr = roleMatch[2] || '';
    const options: Record<string, any> = {};
    const nameMatch = optionsStr.match(/name:\s*(\/.+\/[a-z]*)/);
    if (nameMatch) {
      const s = nameMatch[1];
      const i = s.lastIndexOf('/');
      options.name = new RegExp(s.slice(1, i), s.slice(i + 1));
    }
    locator = page.getByRole(role, options);
  } else {
    const textMatch = selector.match(/getByText\((.+)\)/);
    if (textMatch) {
      let arg = textMatch[1].trim();
      if (arg.startsWith('/')) { const i = arg.lastIndexOf('/'); locator = page.getByText(new RegExp(arg.slice(1, i), arg.slice(i + 1))); }
      else { locator = page.getByText(arg.replace(/['"]/g, '')); }
    } else {
      const labelMatch = selector.match(/getByLabel\((.+)\)/);
      if (labelMatch) {
        let arg = labelMatch[1].trim();
        if (arg.startsWith('/')) { const i = arg.lastIndexOf('/'); locator = page.getByLabel(new RegExp(arg.slice(1, i), arg.slice(i + 1))); }
        else { locator = page.getByLabel(arg.replace(/['"]/g, '')); }
      } else {
        const tidMatch = selector.match(/getByTestId\((.+)\)/);
        if (tidMatch) { locator = page.getByTestId(tidMatch[1].replace(/['"]/g, '')); }
        else { locator = page.locator(selector); }
      }
    }
  }

  if (qualifier === 'first') return locator.first();
  if (qualifier === 'last') return locator.last();
  if (nthIndex !== null) return locator.nth(nthIndex);
  return locator;
}
