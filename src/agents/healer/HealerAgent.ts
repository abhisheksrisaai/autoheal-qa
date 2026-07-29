import { FailureEvent, HealingResult } from '../../types';
import { DiagnosisResult } from '../../types/agent.types';
import { HealingEngine } from './HealingEngine';
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
  async handleFailure(failure: FailureEvent): Promise<HealingResult> {
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
    const result = await this.healingEngine.heal(failure);

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
   */
  private resolveLocator(page: any, selector: string): any {
    // Handle getByRole, getByText, etc.
    if (selector.startsWith('getByRole(')) {
      const match = selector.match(/getByRole\('([^']+)'(?:,\s*\{([^}]+)\})?\)/);
      if (match) {
        const role = match[1];
        const options = match[2] ? this.parseOptions(match[2]) : {};
        return page.getByRole(role, options);
      }
    }
    if (selector.startsWith('getByText(')) {
      const match = selector.match(/getByText\(([^)]+)\)/);
      if (match) {
        const text = this.parseTextArg(match[1]);
        return page.getByText(text);
      }
    }
    if (selector.startsWith('getByLabel(')) {
      const match = selector.match(/getByLabel\(([^)]+)\)/);
      if (match) {
        const label = this.parseTextArg(match[1]);
        return page.getByLabel(label);
      }
    }
    if (selector.startsWith('getByPlaceholder(')) {
      const match = selector.match(/getByPlaceholder\(([^)]+)\)/);
      if (match) {
        const placeholder = this.parseTextArg(match[1]);
        return page.getByPlaceholder(placeholder);
      }
    }
    if (selector.startsWith('getByTestId(')) {
      const match = selector.match(/getByTestId\(([^)]+)\)/);
      if (match) {
        return page.getByTestId(match[1].replace(/['"]/g, ''));
      }
    }
    // Fallback to locator()
    if (selector.startsWith('locator(')) {
      const match = selector.match(/locator\(([^)]+)\)/);
      if (match) {
        return page.locator(match[1].replace(/['"]/g, ''));
      }
    }
    // Default: treat as CSS
    return page.locator(selector);
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
