import { HealingConfig } from '../types';

export const healingConfig: HealingConfig = {
  enabled: process.env.HEALING_ENABLED !== 'false',
  confidenceThreshold: parseFloat(process.env.HEALING_CONFIDENCE_THRESHOLD || '0.7'),
  maxAttempts: parseInt(process.env.MAX_HEALING_ATTEMPTS || '3', 10),
  timeoutMs: parseInt(process.env.HEALING_TIMEOUT_MS || '10000', 10),
  knowledgeBasePath: process.env.KNOWLEDGE_BASE_PATH || './reports/healing-logs/knowledge-base.json',
  preferRoleSelectors: true,
  preferTextSelectors: true,
  avoidClassOnlySelectors: true,
};

export const failureClassification = {
  locatorBreakPatterns: [
    /no such element/i,
    /element not found/i,
    /selector.*not.*found/i,
    /waiting for selector.*failed/i,
    /cannot find.*element/i,
    /Unable to locate element/i,
    /element.*not visible/i,
    /element.*not attached/i,
    /ElementHandle.*disposed/i,
  ],
  timingIssuePatterns: [
    /timeout/i,
    /waiting.*exceeded/i,
    /Timed out/i,
    /element.*not clickable/i,
    /element.*not interactable/i,
    /another element.*overlay/i,
    /element.*not enabled/i,
  ],
  networkErrorPatterns: [
    /net::err/i,
    /network error/i,
    /failed to fetch/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /502|503|504/,
    /timeout.*request/i,
  ],
  assertionFailurePatterns: [
    /expected/i,
    /assert/i,
    /to equal/i,
    /to contain/i,
    /to be/i,
    /to have/i,
  ],
};

export class HealingRules {
  static shouldAttemptHealing(failureType: string): boolean {
    const healableTypes = ['locator_break', 'timing_issue'];
    return healableTypes.includes(failureType);
  }

  static shouldRetryBeforeHealing(failureType: string): boolean {
    return failureType === 'timing_issue';
  }

  static shouldUseAIHealer(confidence: number): boolean {
    return confidence < healingConfig.confidenceThreshold;
  }

  static isValidHealingResult(confidence: number): boolean {
    return confidence >= healingConfig.confidenceThreshold;
  }
}
