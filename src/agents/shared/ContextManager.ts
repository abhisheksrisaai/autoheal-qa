import { v4 as uuidv4 } from 'uuid';
import {
  ContextManagerInterface,
  SessionState,
  AgentTestStep,
} from '../../types/agent.types';
import { FailureEvent, HealingResult, Environment, TestContext } from '../../types';

export class ContextManager implements ContextManagerInterface {
  private session: SessionState;

  constructor(environment: Environment = 'dev') {
    this.session = {
      sessionId: uuidv4(),
      startTime: new Date(),
      steps: [],
      failures: [],
      healings: [],
      currentUrl: '',
      environment,
    };
  }

  getSession(): SessionState {
    return { ...this.session };
  }

  updateSession(update: Partial<SessionState>): void {
    this.session = { ...this.session, ...update };
  }

  recordStep(step: AgentTestStep): void {
    this.session.steps.push(step);
  }

  recordFailure(failure: FailureEvent): void {
    this.session.failures.push(failure);
  }

  recordHealing(healing: HealingResult): void {
    this.session.healings.push(healing);
  }

  getHistory(): AgentTestStep[] {
    return [...this.session.steps];
  }

  getRecentFailures(limit: number = 10): FailureEvent[] {
    return this.session.failures.slice(-limit);
  }

  getHealingStats(): { total: number; successful: number; failed: number } {
    const total = this.session.healings.length;
    const successful = this.session.healings.filter(h => h.success).length;
    return { total, successful, failed: total - successful };
  }

  setCurrentUrl(url: string): void {
    this.session.currentUrl = url;
  }

  clearSteps(): void {
    this.session.steps = [];
  }

  reset(environment?: Environment): void {
    this.session = {
      sessionId: uuidv4(),
      startTime: new Date(),
      steps: [],
      failures: [],
      healings: [],
      currentUrl: '',
      environment: environment || this.session.environment,
    };
  }

  createTestContext(testName: string, intent: string): TestContext {
    return {
      testId: uuidv4(),
      testName,
      intent,
      stepIndex: this.session.steps.length,
      startTime: new Date(),
      environment: this.session.environment,
    };
  }
}
