import {
  ExecutorAgentInterface,
  AgentTestStep,
  ExecutionContext,
  ExecutionResult,
} from '../../types/agent.types';
import { FailureEvent, AccessibilityNode } from '../../types';
import { HealerAgent } from '../healer/HealerAgent';

/**
 * ExecutorAgent - Runs Playwright tests and captures accessibility snapshots.
 * Uses Qwen3.7 Max for smart execution strategies.
 */
export class ExecutorAgent implements ExecutorAgentInterface {
  private healer?: HealerAgent;

  constructor(healer?: HealerAgent) {
    this.healer = healer;
  }

  async execute(
    step: AgentTestStep,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { page } = context;

    try {
      console.log(`[ExecutorAgent] Executing step ${step.index}: ${step.intent}`);

      switch (step.action) {
        case 'navigate':
          await page.goto(step.selector || '/', {
            waitUntil: 'domcontentloaded',
            timeout: step.timeout || 30000,
          });
          break;

        case 'click':
          if (step.selector) {
            await page.locator(step.selector).first().click({
              timeout: step.timeout || 15000,
            });
          }
          break;

        case 'fill':
          if (step.selector && step.value) {
            await page.locator(step.selector).fill(step.value);
          }
          break;

        case 'type':
          if (step.selector && step.value) {
            await page.locator(step.selector).type(step.value);
          }
          break;

        case 'select':
          if (step.selector && step.value) {
            await page.locator(step.selector).selectOption(step.value);
          }
          break;

        case 'hover':
          if (step.selector) {
            await page.locator(step.selector).hover();
          }
          break;

        case 'check':
          if (step.selector) {
            await page.locator(step.selector).check();
          }
          break;

        case 'uncheck':
          if (step.selector) {
            await page.locator(step.selector).uncheck();
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
            await page.locator(step.selector).scrollIntoViewIfNeeded();
          }
          break;

        case 'assert':
          if (step.selector) {
            await page.locator(step.selector).first().waitFor({
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

      // Attempt self-healing if healer is available
      if (this.healer && step.selector) {
        try {
          const accessibilityTree = await this.captureAccessibilityTree();
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

          const healingResult = await this.healer.handleFailure(failure);

          if (healingResult.success) {
            console.log(`[ExecutorAgent] Healed selector: ${step.selector} -> ${healingResult.newSelector}`);

            // Retry with healed selector
            try {
              const healedResult = await this.execute(
                { ...step, selector: healingResult.newSelector },
                context
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

  async captureAccessibilityTree(): Promise<AccessibilityNode> {
    // In production, this would use page.accessibility.snapshot()
    // For now, return a minimal structure
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
