import { FailureEvent, HealingResult } from '../../types';
import { DiagnosisResult } from '../../types/agent.types';
import { ErrorAnalyzer } from './ErrorAnalyzer';
import { LocatorHealer } from './LocatorHealer';
import { KnowledgeBase } from '../shared/KnowledgeBase';
import { AIModelRouter } from '../shared/AIModelRouter';
import { healingConfig, HealingRules } from '../../config/healing.config';

export class HealingEngine {
  private errorAnalyzer: ErrorAnalyzer;
  private locatorHealer: LocatorHealer;
  private knowledgeBase: KnowledgeBase;
  private aiRouter: AIModelRouter;

  constructor() {
    this.errorAnalyzer = new ErrorAnalyzer();
    this.knowledgeBase = new KnowledgeBase();
    this.aiRouter = new AIModelRouter();
    this.locatorHealer = new LocatorHealer(this.knowledgeBase, this.aiRouter);
  }

  /**
   * Executes the full healing workflow for a test failure.
   */
  async heal(failure: FailureEvent): Promise<HealingResult> {
    console.log(`[HealingEngine] Starting healing for: ${failure.testContext.intent}`);

    // Step 1: Diagnose the failure
    const diagnosis = await this.diagnose(failure);
    console.log(`[HealingEngine] Diagnosis: ${diagnosis.failureType} - ${diagnosis.rootCause}`);

    // Step 2: Check if healing should be attempted
    if (!HealingRules.shouldAttemptHealing(diagnosis.failureType)) {
      return {
        success: false,
        newSelector: '',
        confidence: 0,
        explanation: `Healing not applicable for failure type: ${diagnosis.failureType}. Action: ${diagnosis.suggestedAction}`,
        oldSelectorType: this.errorAnalyzer.getSelectorType(failure.oldSelector),
        newSelectorType: 'css',
        elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
      };
    }

    // Step 3: If it's a timing issue, try retry first
    if (HealingRules.shouldRetryBeforeHealing(diagnosis.failureType)) {
      console.log('[HealingEngine] Timing issue detected — would retry before healing');
    }

    // Step 4: Perform the healing
    let healingResult: HealingResult | null = null;
    let attempts = 0;

    while (attempts < healingConfig.maxAttempts) {
      attempts++;
      console.log(`[HealingEngine] Healing attempt ${attempts}/${healingConfig.maxAttempts}`);

      healingResult = await this.locatorHealer.heal(failure);

      if (healingResult.confidence >= healingConfig.confidenceThreshold) {
        break;
      }

      // If confidence is low, try once more with different strategy
      if (attempts < healingConfig.maxAttempts) {
        console.log(`[HealingEngine] Low confidence (${healingResult.confidence}), retrying...`);
      }
    }

    // Step 5: Validate the result
    if (healingResult && HealingRules.isValidHealingResult(healingResult.confidence)) {
      console.log(`[HealingEngine] Healing successful: ${healingResult.newSelector} (confidence: ${healingResult.confidence})`);
      return healingResult;
    }

    return {
      success: false,
      newSelector: '',
      confidence: healingResult?.confidence || 0,
      explanation: healingResult?.explanation || 'Healing failed after all attempts.',
      oldSelectorType: this.errorAnalyzer.getSelectorType(failure.oldSelector),
      newSelectorType: 'css',
      elementAttributes: { tag: '', role: '', ariaLabel: '', textContent: '' },
    };
  }

  /**
   * Diagnoses a failure to determine its type and root cause.
   */
  async diagnose(failure: FailureEvent): Promise<DiagnosisResult> {
    return this.errorAnalyzer.analyzeRootCause(failure);
  }

  /**
   * Validates a healed selector by checking it against basic rules.
   */
  async validate(selector: string): Promise<boolean> {
    return this.locatorHealer.validateSelector(selector);
  }

  /**
   * Stores a successful healing in the knowledge base for future use.
   */
  async learn(result: HealingResult, failure: FailureEvent): Promise<void> {
    if (result.success) {
      await this.knowledgeBase.store({
        id: '',
        oldSelector: failure.oldSelector,
        newSelector: result.newSelector,
        pageUrl: failure.currentUrl,
        intent: failure.testContext.intent,
        failureType: failure.type,
        healingConfidence: result.confidence,
        timestamp: new Date(),
        timesUsed: 1,
        lastUsed: new Date(),
        explanation: result.explanation,
      });
    }
  }

  /**
   * Gets knowledge base statistics.
   */
  async getStats() {
    return this.knowledgeBase.getStats();
  }

  /**
   * Exports the knowledge base for sharing across test runs.
   */
  async exportKnowledgeBase(filePath: string): Promise<void> {
    return this.knowledgeBase.export(filePath);
  }

  /**
   * Imports a knowledge base for cross-session learning.
   */
  async importKnowledgeBase(filePath: string): Promise<void> {
    return this.knowledgeBase.import(filePath);
  }
}
