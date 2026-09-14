'use strict';

/**
 * Guardrail check: proves ExecutorAgent cannot loop heal -> retry -> heal.
 * Uses a stub healer that ALWAYS returns a plausible-but-bogus selector, on
 * a real Chromium page. Pass = execute() fails the step after exactly ONE
 * heal-and-retry instead of recursing forever.
 *
 * Run: npm run eval:heal-guardrails
 */

const path = require('path');

async function main() {
  const { chromium } = require('@playwright/test');
  const ROOT = path.join(__dirname, '..', '..');
  const { ExecutorAgent } = require(path.join(ROOT, 'dist', 'src', 'agents', 'executor', 'ExecutorAgent'));

  let healCalls = 0;
  const stubHealer = {
    handleFailure: async () => {
      healCalls++;
      if (healCalls > 10) throw new Error('LOOP: healer called more than 10 times');
      return {
        success: true, newSelector: '#bogus-never-exists', confidence: 0.95,
        explanation: 'stub wrong guess', oldSelectorType: 'css', newSelectorType: 'css',
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    },
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'fixtures', 'shop-login.html'), { waitUntil: 'domcontentloaded' });

  const agent = new ExecutorAgent(stubHealer);
  const result = await agent.execute(
    { index: 0, intent: 'Click the login button', action: 'click', selector: '.login-submit-btn', timeout: 2000 },
    {
      page, browser: null,
      testContext: { testId: 'guard', testName: 'guardrail-check', intent: 'x', stepIndex: 0, startTime: new Date(), environment: 'dev' },
      session: {},
    }
  );
  await browser.close();

  console.log(`healCalls=${healCalls} success=${result.success}`);
  if (healCalls === 1 && result.success === false) {
    console.log('GUARDRAIL PASS: exactly one heal-and-retry, then loud failure (no loop).');
  } else {
    console.error('GUARDRAIL FAIL: expected 1 heal call + success=false.');
    process.exit(1);
  }
}

main().catch((e) => { console.error('GUARDRAIL FAIL', e); process.exit(1); });
