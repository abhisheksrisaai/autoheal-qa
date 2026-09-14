import { FailureEvent, HealingResult } from '../../types';
import { DiagnosisResult } from '../../types/agent.types';
import { HealingEngine } from './HealingEngine';
import { HealProvider } from './LocatorHealer';
import { ContextManager } from '../shared/ContextManager';
import { KnowledgeBase } from '../shared/KnowledgeBase';

/**
 * HealerAgent - Main orchestrator for the self-healing process.
 * 
 * This agent is responsible for:
 * 1. Detecting test failures in real-time
 * 2. Diagnosing the root cause
 * 3. Healing broken selectors
 * 4. Validating fixes
 * 5. Learning from each failure for future improvements
 */
export class HealerAgent {
  private healingEngine: HealingEngine;
  private contextManager: ContextManager;
  private knowledgeBase: KnowledgeBase;

  constructor(contextManager?: ContextManager) {
    this.healingEngine = new HealingEngine();
    this.contextManager = contextManager || new ContextManager();
    this.knowledgeBase = new KnowledgeBase();
  }

  /**
   * Handles a test failure. This is the main entry point for the healing process.
   */
  async handleFailure(failure: FailureEvent, options?: { provider?: HealProvider }): Promise<HealingResult> {
    console.log(`[HealerAgent] Handling failure at step ${failure.stepIndex}: ${failure.testContext.intent}`);

    // Record failure in context
    this.contextManager.recordFailure(failure);

    // Step 1: Diagnose
    const diagnosis: DiagnosisResult = await this.healingEngine.diagnose(failure);

    // Step 2: If not healable, return immediately
    if (diagnosis.suggestedAction === 'skip' || diagnosis.suggestedAction === 'abort') {
      return {
        success: false,
        newSelector: '',
        confidence: 0,
        explanation: `Cannot heal: ${diagnosis.rootCause}`,
        oldSelectorType: 'css',
        newSelectorType: 'css',
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    }

    // Step 3: Heal
    const result = await this.healingEngine.heal(failure, options);

    // Step 4: Learn from the experience
    if (result.success) {
      await this.healingEngine.learn(result, failure);
      this.contextManager.recordHealing(result);
    }

    return result;
  }

  /**
   * Validates that a healed selector actually works on the page.
   */
  async validateHealing(
    page: any,
    selector: string,
    intent: string
  ): Promise<boolean> {
    try {
      const locator = this.resolveLocator(page, selector);
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      console.log(`[HealerAgent] Validation passed for: ${selector}`);
      return true;
    } catch (error) {
      console.warn(`[HealerAgent] Validation failed for: ${selector}`, error);
      return false;
    }
  }

  /**
   * Resolves a Playwright selector string to an actual locator.
   * Public so ExecutorAgent can run healed (getBy*-style) selectors: feeding
   * them to page.locator() raw misparses them as CSS and fails.
   */
  public resolveLocator(page: any, selector: string): any {
    // Models naturally emit page.-prefixed selectors; strip the prefix so
    // single-segment getBy* selectors resolve.
    const original = String(selector || '');
    let s = original.trim();
    if (s.startsWith('page.')) s = s.slice(5);

    // Split off a trailing .first()/.last()/.nth(n) qualifier, then require
    // exactly ONE getBy*/locator segment to remain. A second top-level link
    // (e.g. getByRole('main').getByRole('button', ...)) throws instead of
    // silently resolving to the wrong element — fail closed, never guess.
    let qualifier: 'first' | 'last' | null = null;
    let nthIndex: number | null = null;
    const nthMatch = s.match(/\.nth\((\d+)\)\s*$/);
    if (nthMatch) {
      nthIndex = parseInt(nthMatch[1], 10);
      s = s.slice(0, nthMatch.index).trim();
    } else if (/\.first\(\)\s*$/.test(s)) {
      qualifier = 'first';
      s = s.replace(/\.first\(\)\s*$/, '').trim();
    } else if (/\.last\(\)\s*$/.test(s)) {
      qualifier = 'last';
      s = s.replace(/\.last\(\)\s*$/, '').trim();
    }
    if (/^(getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|locator)\(/.test(s)) {
      this.assertSingleSegment(s, original);
    }

    let loc: any;
    // Handle getByRole, getByText, etc.
    if (s.startsWith('getByRole(')) {
      const match = s.match(/getByRole\('([^']+)'(?:,\s*\{([^}]+)\})?\)/);
      if (match) {
        const role = match[1];
        const options = match[2] ? this.parseOptions(match[2]) : {};
        loc = page.getByRole(role, options);
      }
    }
    if (!loc && s.startsWith('getByText(')) {
      const match = s.match(/getByText\(([^)]+)\)/);
      if (match) {
        const text = this.parseTextArg(match[1]);
        loc = page.getByText(text);
      }
    }
    if (!loc && s.startsWith('getByLabel(')) {
      const match = s.match(/getByLabel\(([^)]+)\)/);
      if (match) {
        const label = this.parseTextArg(match[1]);
        loc = page.getByLabel(label);
      }
    }
    if (!loc && s.startsWith('getByPlaceholder(')) {
      const match = s.match(/getByPlaceholder\(([^)]+)\)/);
      if (match) {
        const placeholder = this.parseTextArg(match[1]);
        loc = page.getByPlaceholder(placeholder);
      }
    }
    if (!loc && s.startsWith('getByTestId(')) {
      const match = s.match(/getByTestId\(([^)]+)\)/);
      if (match) {
        loc = page.getByTestId(match[1].replace(/['"]/g, ''));
      }
    }
    // Fallback to locator()
    if (!loc && s.startsWith('locator(')) {
      const match = s.match(/locator\(([^)]+)\)/);
      if (match) {
        loc = page.locator(match[1].replace(/['"]/g, ''));
      }
    }
    // Default: treat as CSS
    if (!loc) {
      loc = page.locator(s);
    }

    if (nthIndex !== null) return loc.nth(nthIndex);
    if (qualifier === 'first') return loc.first();
    if (qualifier === 'last') return loc.last();
    return loc;
  }

  /**
   * Throws unless s is a single getBy/locator call. Catches chains
   * like getByRole('main').getByRole('button', ...) that prefix-matching
   * would otherwise truncate into a wrong-element resolution.
   */
  private assertSingleSegment(s: string, original: string): void {
    const open = s.indexOf('(');
    let depth = 0;
    let end = -1;
    for (let i = open; i < s.length; i++) {
      if (s[i] === '(') depth++;
      if (s[i] === ')') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const rest = end === -1 ? s : s.slice(end + 1).trim();
    if (end === -1 || rest !== '') {
      throw new Error(`[resolveLocator] chained selectors not supported: ${original}`);
    }
  }

  private parseTextArg(arg: string): string | RegExp {
    arg = arg.trim();
    if (arg.startsWith('/') && arg.endsWith('/')) {
      return new RegExp(arg.slice(1, -1));
    }
    if (arg.startsWith('/') && arg.includes('/i')) {
      const lastSlash = arg.lastIndexOf('/');
      const pattern = arg.slice(1, lastSlash);
      const flags = arg.slice(lastSlash + 1);
      return new RegExp(pattern, flags);
    }
    return arg.replace(/['"]/g, '');
  }

  private parseOptions(optionsStr: string): Record<string, any> {
    const options: Record<string, any> = {};
    // Simple parser for { name: /pattern/i }
    const nameMatch = optionsStr.match(/name:\s*(\/.+\/[a-z]*)/);
    if (nameMatch) {
      const regexStr = nameMatch[1];
      const lastSlash = regexStr.lastIndexOf('/');
      const pattern = regexStr.slice(1, lastSlash);
      const flags = regexStr.slice(lastSlash + 1);
      options.name = new RegExp(pattern, flags);
    } else {
      // Models most often emit plain string names ({ name: 'Login' }); the
      // regex-only parser above dropped them, resolving to an unnamed role
      // that strict-violates on any page with two matching elements.
      const strNameMatch = optionsStr.match(/name:\s*['"]([^'"]+)['"]/);
      if (strNameMatch) {
        options.name = strNameMatch[1];
      }
    }
    const exactMatch = optionsStr.match(/exact:\s*(true|false)/);
    if (exactMatch) {
      options.exact = exactMatch[1] === 'true';
    }
    return options;
  }

  /**
   * Returns the knowledge base statistics.
   */
  async getKnowledgeBaseStats() {
    return this.knowledgeBase.getStats();
  }
}
