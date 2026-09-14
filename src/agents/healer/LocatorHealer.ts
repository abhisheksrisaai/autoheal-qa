import {
  FailureEvent,
  HealingResult,
  SelectorType,
  ElementAttributes,
  AccessibilityNode,
  HealProvider,
} from '../../types';
import { ErrorAnalyzer } from './ErrorAnalyzer';
import { KnowledgeBase } from '../shared/KnowledgeBase';
import { AIModelRouter } from '../shared/AIModelRouter';
import { getOpenCodeClient } from '../shared/OpenCodeClient';
import { getOpenCodeConfig } from '../../config/ai.config';

// Re-exported so existing importers (HealerAgent, evals) keep working.
export type { HealProvider } from '../../types';

const HEAL_PROVIDER_CONFIG = {
  deepseek: { configKey: 'deepseek', label: 'DeepSeek V4 Pro' },
  kimi: { configKey: 'kimi', label: 'Kimi K3' },
  qwen: { configKey: 'qwen', label: 'Qwen3.7 Max' },
} as const;

export class LocatorHealer {
  private errorAnalyzer: ErrorAnalyzer;
  private knowledgeBase: KnowledgeBase;
  private aiRouter: AIModelRouter;

  constructor(knowledgeBase?: KnowledgeBase, aiRouter?: AIModelRouter) {
    this.errorAnalyzer = new ErrorAnalyzer();
    this.knowledgeBase = knowledgeBase || new KnowledgeBase();
    this.aiRouter = aiRouter || new AIModelRouter();
  }

  /**
   * Main healing method: tries KB first, then falls back to AI.
   */
  async heal(failure: FailureEvent, provider: HealProvider = 'deepseek'): Promise<HealingResult> {
    const selectorType = this.errorAnalyzer.getSelectorType(failure.oldSelector);

    // Step 1: Query knowledge base for known fix
    const kbEntry = await this.knowledgeBase.query(
      failure.oldSelector,
      failure.testContext.intent
    );

    if (kbEntry && kbEntry.healingConfidence >= 0.9) {
      return {
        success: true,
        newSelector: kbEntry.newSelector,
        confidence: kbEntry.healingConfidence,
        explanation: `Known fix from knowledge base (used ${kbEntry.timesUsed} times before): ${kbEntry.explanation}`,
        oldSelectorType: selectorType,
        newSelectorType: this.errorAnalyzer.getSelectorType(kbEntry.newSelector),
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    }

    // Step 2: AI-based healing using accessibility tree
    return this.aiHeal(failure, selectorType, provider);
  }

  /**
   * Uses AI to analyze the DOM and generate a new selector.
   */
  private async aiHeal(
    failure: FailureEvent,
    oldSelectorType: SelectorType,
    provider: HealProvider = 'deepseek'
  ): Promise<HealingResult> {
    const model = this.aiRouter.getModelForHealing();
    const accessibilityTree = failure.accessibilityTree;

    // Build the AI prompt
    const prompt = this.buildHealingPrompt(failure, accessibilityTree);

    try {
      // Call AI model for healing (we'll implement the actual API call)
      const aiResponse = await this.callAIForHealing(prompt, provider);

      if (aiResponse && aiResponse.confidence >= 0.7) {
        const newSelectorType = this.errorAnalyzer.getSelectorType(aiResponse.newSelector);
        const rawExplanation = aiResponse.explanation;

        // Store raw explanation in KB (not KB-wrapped)
        await this.knowledgeBase.store({
          id: '',
          oldSelector: failure.oldSelector,
          newSelector: aiResponse.newSelector,
          pageUrl: failure.currentUrl,
          intent: failure.testContext.intent,
          failureType: failure.type,
          healingConfidence: aiResponse.confidence,
          timestamp: new Date(),
          timesUsed: 1,
          lastUsed: new Date(),
          explanation: rawExplanation,
        });

        return {
          success: true,
          newSelector: aiResponse.newSelector,
          confidence: aiResponse.confidence,
          explanation: aiResponse.explanation,
          oldSelectorType,
          newSelectorType,
          elementAttributes: aiResponse.elementAttributes,
        };
      }

      return {
        success: false,
        newSelector: '',
        confidence: 0,
        explanation: aiResponse?.explanation || 'AI could not find a matching element.',
        oldSelectorType,
        newSelectorType: 'css',
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    } catch (error) {
      return {
        success: false,
        newSelector: '',
        confidence: 0,
        explanation: `AI healing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        oldSelectorType,
        newSelectorType: 'css',
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    }
  }

  /**
   * Builds the prompt for the Healer Agent (DeepSeek V4 Pro).
   */
  private buildHealingPrompt(
    failure: FailureEvent,
    accessibilityTree?: AccessibilityNode
  ): string {
    return `
You are the Healer Agent for an AI-powered test automation framework called AutoHeal QA.
Your job is to fix broken Playwright locators when a test step fails.

CONTEXT:
- Test Intent: "${failure.testContext.intent}"
- Failed Selector: "${failure.oldSelector}"
- Error Message: "${failure.errorMessage}"
- Current URL: "${failure.currentUrl}"
- Page Accessibility Tree: ${JSON.stringify(accessibilityTree, null, 2)}

TASK:
1. Analyze why the old selector failed based on the error and current DOM
2. Find the correct element that matches the test intent
3. Generate a new, robust Playwright locator
4. Return ONLY a JSON object in this exact format:
{
  "newSelector": "string (Playwright locator)",
  "confidence": number (0.0 to 1.0),
  "explanation": "string (why old failed, why new works)",
  "oldSelectorType": "string (css/xpath/role/text)",
  "newSelectorType": "string (css/xpath/role/text)",
  "elementAttributes": {
    "tag": "string",
    "role": "string",
    "ariaLabel": "string",
    "textContent": "string"
  }
}

RULES:
- Prefer role-based locators (getByRole) over CSS selectors
- Prefer user-facing text (getByText, getByLabel) over attributes
- If multiple matches, pick the most specific one
- Confidence must reflect certainty: >0.9 = very sure, 0.7-0.9 = likely, <0.7 = uncertain
- NEVER return CSS class selectors alone—always pair with tag or text
- If no matching element found, set confidence to 0 and explain why
`.trim();
  }

  /**
   * Calls the configured healing model via OpenCode Go API for AI-powered healing.
   */
  private async callAIForHealing(prompt: string, provider: HealProvider = 'deepseek'): Promise<HealingResult | null> {
    const client = getOpenCodeClient();
    const { configKey, label } = HEAL_PROVIDER_CONFIG[provider];

    // If no API key configured, fall back to heuristics
    if (!client.isConfigured()) {
      console.warn('[LocatorHealer] OpenCode API key not configured. Using heuristic fallback.');
      console.warn('[LocatorHealer] Set OPENCODE_API_KEY in .env to enable AI-powered healing.');
      console.log('[LocatorHealer] AI Healing Prompt:', prompt.substring(0, 200) + '...');
      return this.heuristicHeal(prompt);
    }

    try {
      console.log(`[LocatorHealer] Calling ${label} via OpenCode Go...`);
      const config = getOpenCodeConfig(configKey);
      const rawResponse = await client.generate(config, prompt, {
        jsonMode: true,
        temperature: 0.1,
      });

      // Parse the JSON response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[LocatorHealer] Could not parse JSON from AI response:', rawResponse.substring(0, 200));
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: parsed.confidence >= 0.7,
        newSelector: parsed.newSelector || '',
        confidence: parsed.confidence || 0,
        explanation: parsed.explanation || 'AI-generated selector',
        oldSelectorType: parsed.oldSelectorType || 'css',
        newSelectorType: parsed.newSelectorType || 'role',
        elementAttributes: {
          tag: parsed.elementAttributes?.tag || '',
          role: parsed.elementAttributes?.role || '',
          ariaLabel: parsed.elementAttributes?.ariaLabel || '',
          textContent: parsed.elementAttributes?.textContent || '',
        },
      };
    } catch (error: any) {
      console.error(`[LocatorHealer] ${label} API call failed:`, error.message);
      console.warn('[LocatorHealer] Falling back to heuristic healing.');
      return this.heuristicHeal(prompt);
    }
  }

  /**
   * Heuristic-based healing as fallback when AI API is unavailable.
   * This applies common selector transformation rules.
   */
  private heuristicHeal(prompt: string): HealingResult | null {
    // Extract intent from the prompt
    const intentMatch = prompt.match(/Test Intent: "([^"]+)"/);
    const intent = intentMatch ? intentMatch[1].toLowerCase() : '';
    const oldSelectorMatch = prompt.match(/Failed Selector: "([^"]+)"/);
    const oldSelector = oldSelectorMatch ? oldSelectorMatch[1] : '';

    // Parse potential element info from intent
    const elementHints = this.parseIntent(intent);

    return {
      success: elementHints.confidence > 0,
      newSelector: elementHints.selector,
      confidence: elementHints.confidence,
      explanation: elementHints.explanation,
      oldSelectorType: 'css',
      newSelectorType: elementHints.selectorType as SelectorType,
      elementAttributes: {
        tag: elementHints.tag,
        role: elementHints.role,
        ariaLabel: elementHints.ariaLabel || '',
        textContent: elementHints.text,
      },
    };
  }

  /**
   * Parses test intent to extract element information.
   */
  private parseIntent(intent: string): {
    selector: string;
    confidence: number;
    explanation: string;
    tag: string;
    role: string;
    text: string;
    selectorType: string;
    ariaLabel: string;
  } {
    // Common intent patterns and their mapped selectors
    const patterns: Array<{
      keywords: string[];
      role: string;
      tag: string;
      buildSelector: (intent: string) => string;
    }> = [
      {
        keywords: ['login', 'sign in', 'log in'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /login|sign in/i })',
      },
      {
        keywords: ['username', 'email', 'user'],
        role: 'textbox',
        tag: 'input',
        buildSelector: () => 'getByRole(\'textbox\', { name: /username|email/i })',
      },
      {
        keywords: ['password'],
        role: 'textbox',
        tag: 'input',
        buildSelector: () => 'getByLabel(/password/i)',
      },
      {
        keywords: ['submit', 'save', 'confirm', 'continue', 'next'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /submit|save|confirm|continue|next/i })',
      },
      {
        keywords: ['cart', 'basket', 'shopping'],
        role: 'link',
        tag: 'a',
        buildSelector: () => 'getByRole(\'link\', { name: /cart|basket/i })',
      },
      {
        keywords: ['checkout'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /checkout/i })',
      },
      {
        keywords: ['add to cart', 'add'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /add to cart/i })',
      },
      {
        keywords: ['remove', 'delete'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /remove|delete/i })',
      },
      {
        keywords: ['first name'],
        role: 'textbox',
        tag: 'input',
        buildSelector: () => 'getByRole(\'textbox\', { name: /first name/i })',
      },
      {
        keywords: ['last name'],
        role: 'textbox',
        tag: 'input',
        buildSelector: () => 'getByRole(\'textbox\', { name: /last name/i })',
      },
      {
        keywords: ['postal code', 'zip'],
        role: 'textbox',
        tag: 'input',
        buildSelector: () => 'getByRole(\'textbox\', { name: /postal code|zip/i })',
      },
      {
        keywords: ['menu', 'navigation', 'hamburger'],
        role: 'button',
        tag: 'button',
        buildSelector: () => 'getByRole(\'button\', { name: /menu/i })',
      },
      {
        keywords: ['filter', 'sort'],
        role: 'combobox',
        tag: 'select',
        buildSelector: () => 'getByRole(\'combobox\')',
      },
      {
        keywords: ['search'],
        role: 'searchbox',
        tag: 'input',
        buildSelector: () => 'getByRole(\'searchbox\')',
      },
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(kw => intent.includes(kw))) {
        return {
          selector: pattern.buildSelector(intent),
          confidence: 0.75,
          explanation: `Heuristic match: Intent "${intent}" maps to ${pattern.role} element. This is a best-guess — validate after healing.`,
          tag: pattern.tag,
          role: pattern.role,
          text: intent,
          selectorType: 'role',
          ariaLabel: '',
        };
      }
    }

    // Generic fallback: try to build a text-based selector from intent
    const words = intent.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0) {
      const textPattern = words.join('.*');
      return {
        selector: `getByText(/${textPattern}/i)`,
        confidence: 0.5,
        explanation: `Generic fallback: Using text pattern matching for "${intent}"`,
        tag: '*',
        role: 'generic',
        text: intent,
        selectorType: 'text',
        ariaLabel: '',
      };
    }

    return {
      selector: '',
      confidence: 0,
      explanation: `Could not determine element for intent: "${intent}"`,
      tag: '',
      role: '',
      text: '',
      selectorType: 'css',
      ariaLabel: '',
    };
  }

  /**
   * Converts a CSS selector to a role-based selector when possible.
   */
  convertCssToRole(cssSelector: string): string | null {
    // button.btn-primary -> getByRole('button', { name: '...' })
    if (cssSelector.includes('button')) {
      return "getByRole('button')";
    }
    // input[type="text"] -> getByRole('textbox')
    if (cssSelector.includes('input') || cssSelector.includes('textbox')) {
      return "getByRole('textbox')";
    }
    // a.nav-link -> getByRole('link')
    if (cssSelector.includes(' a.') || cssSelector.startsWith('a')) {
      return "getByRole('link')";
    }
    // select -> getByRole('combobox')
    if (cssSelector.includes('select')) {
      return "getByRole('combobox')";
    }
    return null;
  }

  /**
   * Validates that a generated selector is well-formed.
   */
  validateSelector(selector: string): boolean {
    if (!selector || selector.trim().length === 0) return false;

    // Must be a valid Playwright locator
    const validPatterns = [
      /^getByRole\(/,
      /^getByText\(/,
      /^getByLabel\(/,
      /^getByPlaceholder\(/,
      /^getByTestId\(/,
      /^getByAltText\(/,
      /^getByTitle\(/,
      /^locator\(/,
      /^page\./,
    ];

    return validPatterns.some(pattern => pattern.test(selector));
  }
}
