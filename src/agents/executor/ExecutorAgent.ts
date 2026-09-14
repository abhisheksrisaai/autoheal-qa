import {
  ExecutorAgentInterface,
  AgentTestStep,
  ExecutionContext,
  ExecutionResult,
} from '../../types/agent.types';
import { FailureEvent, AccessibilityNode } from '../../types';
import { HealerAgent } from '../healer/HealerAgent';
import { captureA11ySnapshot } from '../../helpers/captureA11y';

/**
 * ExecutorAgent - Runs Playwright tests and captures accessibility snapshots.
 * Uses Qwen3.7 Max for smart execution strategies.
 */
export class ExecutorAgent implements ExecutorAgentInterface {
  private healer?: HealerAgent;

  constructor(healer?: HealerAgent) {
    this.healer = healer;
  }

  /**
   * Resolves a selector string to a Locator. Healed selectors are often
   * getBy*-style (e.g. getByRole('button', ...)), which page.locator() would
   * misparse as CSS — so resolve through the healer when one is attached.
   */
  private locate(page: any, selector: string): any {
    if (this.healer) {
      return this.healer.resolveLocator(page, selector);
    }
    return page.locator(selector);
  }

  async execute(
    step: AgentTestStep,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { page } = context;
    try {
      console.log(`[ExecutorAgent] Executing step ${step.index}: ${step.intent}`);

      // NOTE: locate() (not page.locator() raw) so healed getBy*-style
      // selectors resolve instead of misparsing as CSS.
      switch (step.action) {
        case 'navigate':
          await page.goto(step.selector || '/', {
            waitUntil: 'domcontentloaded',
            timeout: step.timeout || 30000,
          });
          break;

        case 'click':
          if (step.selector) {
            await this.locate(page, step.selector).first().click({
              timeout: step.timeout || 15000,
            });
          }
          break;

        case 'fill':
          if (step.selector && step.value) {
            await this.locate(page, step.selector).fill(step.value);
          }
          break;

        case 'type':
          if (step.selector && step.value) {
            await this.locate(page, step.selector).type(step.value);
          }
          break;

        case 'select':
          if (step.selector && step.value) {
            await this.locate(page, step.selector).selectOption(step.value);
          }
          break;

        case 'hover':
          if (step.selector) {
            await this.locate(page, step.selector).hover();
          }
          break;

        case 'check':
          if (step.selector) {
            await this.locate(page, step.selector).check();
          }
          break;

        case 'uncheck':
          if (step.selector) {
            await this.locate(page, step.selector).uncheck();
          }
          break;

        case 'wait':
          await page.waitForTimeout(step.timeout || 2000);
          break;

        case 'screenshot':
          await page.screenshot({ fullPage: true });
          break;

        case 'scroll':
          if (step.selector) {
            await this.locate(page, step.selector).scrollIntoViewIfNeeded();
          }
          break;

        case 'assert':
          if (step.selector) {
            await this.locate(page, step.selector).first().waitFor({
              state: 'visible',
              timeout: step.timeout || 10000,
            });
          }
          break;
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        step,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Attempt self-healing if healer is available.
      // healDepth caps this at ONE heal-and-retry per step: without the cap,
      // the recursive execute() below re-enters this same catch block on a
      // wrong-but-plausible healed selector, producing an unbounded
      // heal → retry → heal loop (and unbounded AI spend). A step whose
      // healed selector still fails is a wrong guess — fail it loudly.
      const healDepth = context.healDepth ?? 0;
      if (this.healer && step.selector && healDepth < 1) {
        try {
          const accessibilityTree = await this.captureAccessibilityTree(page);
          const currentUrl = page.url();

          const failure: FailureEvent = {
            testContext: {
              testId: context.testContext?.testId || 'unknown',
              testName: context.testContext?.testName || 'unknown',
              intent: step.intent,
              stepIndex: step.index,
              startTime: new Date(),
              environment: 'dev',
            },
            stepIndex: step.index,
            type: 'locator_break',
            oldSelector: step.selector,
            errorMessage: error.message,
            currentUrl,
            timestamp: new Date(),
            accessibilityTree,
          };

          const healingResult = await this.healer.handleFailure(failure, { provider: context.healProvider });

          if (healingResult.success) {
            console.log(`[ExecutorAgent] Healed selector: ${step.selector} -> ${healingResult.newSelector}`);

            // Retry with healed selector
            try {
              const healedResult = await this.execute(
                { ...step, selector: healingResult.newSelector },
                { ...context, healDepth: healDepth + 1 }
              );
              if (healedResult.success) {
                return {
                  success: true,
                  step: { ...step, selector: healingResult.newSelector },
                  duration: healedResult.duration + duration,
                };
              }
            } catch {
              // Healed selector also failed
            }
          }
        } catch {
          // Healing itself failed
        }
      }

      return {
        success: false,
        step,
        duration,
        error,
      };
    }
  }

  async captureAccessibilityTree(page?: any): Promise<AccessibilityNode> {
    // Prefer the live accessibility snapshot when a page is available; the
    // healer reasons over this tree, so a stub here silently degrades every
    // executor-triggered heal to error-message-only guessing.
    const snapshot = await captureA11ySnapshot(page);
    if (snapshot) return snapshot as AccessibilityNode;
    return {
      role: 'WebArea',
      name: 'Page',
      children: [],
    };
  }

  async monitorExecution(context: ExecutionContext): Promise<void> {
    const { page } = context;

    // Monitor for console errors
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        console.error(`[ExecutorAgent] Console error: ${msg.text()}`);
      }
    });

    // Monitor for page errors
    page.on('pageerror', (error: Error) => {
      console.error(`[ExecutorAgent] Page error: ${error.message}`);
    });

    // Monitor for request failures
    page.on('requestfailed', (request: any) => {
      console.warn(`[ExecutorAgent] Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  async handleFailure(failure: FailureEvent): Promise<void> {
    console.log(`[ExecutorAgent] Handling failure: ${failure.errorMessage}`);
    if (this.healer) {
      const result = await this.healer.handleFailure(failure);
      if (result.success) {
        console.log(`[ExecutorAgent] Failure healed: ${result.newSelector}`);
      }
    }
  }
}
