import { FailureEvent, HealingResult, FailureType, SelectorType, ElementAttributes } from '../../types';
import { DiagnosisResult } from '../../types/agent.types';

export class ErrorAnalyzer {
  /**
   * Classifies the failure type by analyzing the error message and patterns.
   */
  classifyFailure(failure: FailureEvent): FailureType {
    const message = failure.errorMessage || '';

    // Locator break patterns
    if (
      /no such element|element not found|selector.*not.*found|waiting for selector.*failed|cannot find.*element|Unable to locate element|element.*not visible|element.*not attached|ElementHandle.*disposed/i.test(message)
    ) {
      return 'locator_break';
    }

    // Timing issue patterns
    if (
      /timeout|waiting.*exceeded|Timed out|element.*not clickable|element.*not interactable|another element.*overlay|element.*not enabled/i.test(message)
    ) {
      return 'timing_issue';
    }

    // Network error patterns
    if (
      /net::err|network error|failed to fetch|ECONNREFUSED|ENOTFOUND|502|503|504|timeout.*request/i.test(message)
    ) {
      return 'network_error';
    }

    // Assertion failure patterns
    if (
      /expected|assert|to equal|to contain|to be|to have/i.test(message)
    ) {
      return 'assertion_failure';
    }

    return 'unknown';
  }

  /**
   * Performs root cause analysis on a failure.
   */
  async analyzeRootCause(failure: FailureEvent): Promise<DiagnosisResult> {
    // Respect pre-classified failure type from the event if set
    let failureType = failure.type;
    
    // Only re-classify if type is unknown or not set
    if (!failureType || failureType === 'unknown') {
      failureType = this.classifyFailure(failure);
    }
    let rootCause: string;
    let suggestedAction: 'heal' | 'retry' | 'wait' | 'skip' | 'abort';
    let confidence: number;

    switch (failureType) {
      case 'locator_break':
        rootCause = `Selector "${failure.oldSelector}" no longer matches any element on the page. This is likely due to a UI change (class/id renamed, DOM restructured, or element removed).`;
        suggestedAction = 'heal';
        confidence = 0.9;
        break;
      case 'timing_issue':
        rootCause = `Element was not ready when the test tried to interact. This could be due to slow rendering, animations, or async data loading.`;
        suggestedAction = 'retry';
        confidence = 0.85;
        break;
      case 'network_error':
        rootCause = `A network-level failure occurred. The application or API may be down, or there are connectivity issues.`;
        suggestedAction = 'retry';
        confidence = 0.7;
        break;
      case 'assertion_failure':
        rootCause = `The expected value did not match the actual page content. This may indicate an application bug or outdated test expectations.`;
        suggestedAction = 'skip';
        confidence = 0.6;
        break;
      default:
        rootCause = `Could not determine the specific cause of failure. Further investigation needed.`;
        suggestedAction = 'abort';
        confidence = 0.3;
    }

    return { failureType, rootCause, confidence, suggestedAction };
  }

  /**
   * Extracts the selector type (css, xpath, role, text, etc.) from a selector string.
   */
  getSelectorType(selector: string): SelectorType {
    if (!selector) return 'css';

    if (selector.startsWith('//') || selector.startsWith('(')) {
      return 'xpath';
    }
    if (selector.startsWith('role=') || selector.startsWith('getByRole')) {
      return 'role';
    }
    if (selector.startsWith('text=') || selector.startsWith('getByText')) {
      return 'text';
    }
    if (selector.startsWith('label=') || selector.startsWith('getByLabel')) {
      return 'label';
    }
    if (selector.startsWith('testid=') || selector.startsWith('getByTestId') || selector.startsWith('[data-testid')) {
      return 'testid';
    }
    return 'css';
  }

  /**
   * Normalizes a selector for storage/comparison.
   */
  normalizeSelector(selector: string): string {
    return selector.replace(/^['"]|['"]$/g, '').trim();
  }

  /**
   * Checks if a failure is healable.
   */
  isHealable(failureType: FailureType): boolean {
    return ['locator_break', 'timing_issue'].includes(failureType);
  }
}
