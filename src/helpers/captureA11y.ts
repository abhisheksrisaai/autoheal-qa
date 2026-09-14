/**
 * Captures an accessibility snapshot from a Playwright page.
 *
 * `page.accessibility.snapshot()` was removed in recent Playwright versions;
 * the supported API is now `locator('body').ariaSnapshot()` (YAML string).
 * This helper tries the modern API first, then the legacy one, then gives
 * up with null — so callers never crash and the healer never silently gets
 * a stub tree when a live one was available.
 */
export async function captureA11ySnapshot(page: any): Promise<any> {
  if (!page) return null;
  try {
    if (page.locator) {
      return await page.locator('body').ariaSnapshot();
    }
  } catch {
    // Fall through to legacy API.
  }
  try {
    const legacy = (page as any).accessibility?.snapshot;
    if (typeof legacy === 'function') {
      return await legacy.call((page as any).accessibility);
    }
  } catch {
    // Fall through to null.
  }
  return null;
}
