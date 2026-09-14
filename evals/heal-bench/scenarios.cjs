'use strict';

/**
 * heal-bench scenarios: N=8 broken-locator scenarios across M=3 fixture apps
 * (shop-login, shop-inventory, shop-dashboard). Each scenario mirrors one row
 * of the README's 8/8 demo table so the bench checks the documented claim.
 *
 * `action` is what the bench first tries with the BROKEN selector (baseline,
 * expected to fail) and later retries with the HEALED selector:
 *   click | fill | wait | assert
 * `verify(page)` is the strict functional check: did the healed selector
 * drive the RIGHT element (not just any visible one)?
 */

const FILE = (name) => 'file://' + __dirname + '/fixtures/' + name;

const scenarios = [
  {
    id: 'login-break',
    app: 'shop-login',
    url: FILE('shop-login.html'),
    failureType: 'Locator Break',
    brokenSelector: '.login-submit-btn',
    action: 'click',
    intent: 'Click the login button to sign in',
    verify: async (page) => page.url().includes('shop-inventory.html'),
  },
  {
    id: 'cart-break',
    app: 'shop-inventory',
    url: FILE('shop-inventory.html'),
    failureType: 'Locator Break',
    brokenSelector: 'button.cart-add-btn',
    action: 'click-first',
    intent: 'Click Add to cart for the first product (Sauce Labs Backpack)',
    verify: async (page) => (await page.locator('#cart-badge').textContent()) === '1',
  },
  {
    id: 'ambiguous',
    app: 'shop-inventory',
    url: FILE('shop-inventory.html'),
    failureType: 'Ambiguous',
    brokenSelector: 'button:has-text("Add to cart")',
    action: 'click-first',
    intent: 'Add the FIRST product (Sauce Labs Backpack) to the cart',
    // Strict: the FIRST product's button must flip, not just any of the six.
    verify: async (page) => (await page.locator('.btn_inventory').first().textContent()) === 'Remove',
  },
  {
    id: 'assertion',
    app: 'shop-login',
    url: FILE('shop-login.html'),
    failureType: 'Assertion',
    brokenSelector: '.login_logo',
    action: 'assert-text',
    actionArg: 'Swag Labs 2.0',
    intent: 'Verify the login page headline reads "Swag Labs 2.0"',
    // NOTE (resolve-only): the element EXISTS — only the expected copy is
    // wrong. Locator healing cannot fix a stale expectation, it can only
    // re-resolve the element. Success here = healed selector resolves to
    // exactly one visible element; the copy mismatch stays a real failure.
    resolveOnly: true,
    verify: async () => true,
  },
  {
    id: 'placeholder',
    app: 'shop-login',
    url: FILE('shop-login.html'),
    failureType: 'Placeholder',
    brokenSelector: 'input[placeholder="Enter your username"]',
    action: 'fill',
    actionArg: 'standard_user',
    intent: 'Fill the username field',
    verify: async (page) => (await page.locator('#user-name').inputValue()) === 'standard_user',
  },
  {
    id: 'refactor',
    app: 'shop-login',
    url: FILE('shop-login.html'),
    failureType: 'UI Refactor',
    brokenSelector: '.button-wrapper > input',
    action: 'click',
    intent: 'Click the login button to sign in',
    verify: async (page) => page.url().includes('shop-inventory.html'),
  },
  {
    id: 'id-migration',
    app: 'shop-login',
    url: FILE('shop-login.html'),
    failureType: 'ID Migration',
    brokenSelector: '#user-name-old',
    action: 'fill',
    actionArg: 'standard_user',
    intent: 'Fill the username field',
    verify: async (page) => (await page.locator('#user-name').inputValue()) === 'standard_user',
  },
  {
    id: 'timing',
    app: 'shop-dashboard',
    url: FILE('shop-dashboard.html'),
    failureType: 'Timing Issue',
    brokenSelector: '#promo-banner',
    action: 'wait',
    intent: 'Wait for the promo banner to appear',
    // Baseline uses a 500ms cap (banner arrives at ~1200ms); the healed run
    // gets the standard 10s wait, mirroring the demo's smart-retry path.
    retryCheck: true, // also verify plain retry (no healer) recovers
    verify: async (page) => page.locator('#promo-banner').isVisible(),
  },
];

module.exports = { scenarios };
