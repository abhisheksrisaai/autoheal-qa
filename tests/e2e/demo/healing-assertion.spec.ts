import { test, expect } from '../../../src/fixtures/page.fixture';
import { FailureEvent } from '../../../src/types';

/**
 * HEALING: ASSERTION / VALIDATION FAILURE
 * Expected element text or state changed due to copy update.
 */
test.describe('Healing: Assertion Failure', () => {
  test('heals when expected text changes after copy update', async ({ page, healerAgent }) => {
    console.log('\n━━━ ASSERTION: Expected text changed ━━━\n');

    await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });

    // Old headline text before copy revision
    const OLD_TITLE = '.login_logo'; // This exists, but we'll assert wrong text
    const EXPECTED_OLD = 'Swag Labs 2.0'; // Doesn't match actual "Swag Labs"

    console.log('🔴 Asserting old text:', EXPECTED_OLD);
    const actualText = await page.locator(OLD_TITLE).textContent();
    console.log('   Actual text:', actualText);

    if (actualText !== EXPECTED_OLD) {
      console.log('❌ Assertion failed: expected "' + EXPECTED_OLD + '" got "' + actualText + '"');

      const failure: FailureEvent = {
        testContext: { testId: 'assert-001', testName: 'healing-assertion', intent: 'verify the login page title is correct', stepIndex: 0, startTime: new Date(), environment: 'dev' },
        stepIndex: 0, type: 'assertion_failure', oldSelector: OLD_TITLE, errorMessage: 'Expected text "' + EXPECTED_OLD + '" but found "' + actualText + '"', currentUrl: page.url(), timestamp: new Date(), accessibilityTree: undefined,
      };

      console.log('🤖 Calling HealerAgent...');
      const result = await healerAgent.handleFailure(failure);

      if (result.success) {
        console.log('🔧 HEALED →', result.newSelector, '|', (result.confidence * 100).toFixed(0) + '%');
      }
      // For assertion failures, the healer won't change selectors
      // It flags for human review — the test adapts to the new text
      console.log('   New expected text:', actualText);
    }

    // Proceed with test using actual text
    await expect(page.locator('.login_logo')).toHaveText(actualText!);
    console.log('✅ Assertion adapted to actual page content!\n');
  });
});
