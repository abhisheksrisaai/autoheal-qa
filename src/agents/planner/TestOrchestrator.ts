import {
  PlannerAgentInterface,
  TestRequirement,
  TestPlan,
  AgentTestStep,
  TestMetadata,
} from '../../types/agent.types';
import { PlannerAgent } from './PlannerAgent';

/**
 * TestOrchestrator - Coordinates test execution across the planner and executor.
 * 
 * This orchestrator:
 * 1. Takes high-level test requirements
 * 2. Generates a test plan with the Planner agent
 * 3. Coordinates execution with the Executor agent
 * 4. Monitors progress and handles exceptions
 */
export class TestOrchestrator {
  private planner: PlannerAgent;

  constructor() {
    this.planner = new PlannerAgent();
  }

  /**
   * Generates a complete test plan from requirements.
   */
  async planTests(requirements: TestRequirement[]): Promise<TestPlan[]> {
    console.log(`[TestOrchestrator] Planning ${requirements.length} test requirements`);
    const plans: TestPlan[] = [];

    for (const req of requirements) {
      const plan = await this.planner.analyze(req);
      plans.push(plan);
    }

    // Sort plans by priority (high first) and dependencies
    return this.resolveDependencies(plans);
  }

  /**
   * Generates test steps for a plan.
   */
  async generateSteps(plan: TestPlan): Promise<AgentTestStep[]> {
    return this.planner.generateSteps(plan);
  }

  /**
   * Prioritizes test execution order.
   */
  async prioritize(tests: TestMetadata[]): Promise<TestMetadata[]> {
    return this.planner.prioritizeTests(tests);
  }

  /**
   * Generates test requirements from user stories.
   */
  async generateFromUserStories(stories: string[]): Promise<TestRequirement[]> {
    const allRequirements: TestRequirement[] = [];
    for (const story of stories) {
      const reqs = await this.planner.generateFromUserStory(story);
      allRequirements.push(...reqs);
    }
    return allRequirements;
  }

  /**
   * Resolves dependencies between test plans.
   */
  private resolveDependencies(plans: TestPlan[]): TestPlan[] {
    const resolved: TestPlan[] = [];
    const inProgress = new Set<string>();
    const remaining = [...plans];

    while (remaining.length > 0) {
      const plan = remaining.shift()!;
      
      // Check if all dependencies are satisfied
      const depsSatisfied = plan.dependencies.every(dep =>
        resolved.some(r => r.name.includes(dep))
      );

      if (depsSatisfied) {
        resolved.push(plan);
        inProgress.delete(plan.name);
      } else {
        // Push to end, check for cycles
        remaining.push(plan);
        if (inProgress.has(plan.name)) {
          console.warn(`[TestOrchestrator] Circular dependency detected for: ${plan.name}`);
          resolved.push(plan); // Include anyway
          inProgress.delete(plan.name);
        } else {
          inProgress.add(plan.name);
        }
      }
    }

    return resolved;
  }

  /**
   * Estimates total test execution time.
   */
  estimateDuration(plans: TestPlan[]): number {
    return plans.reduce((total, plan) => total + plan.estimatedDuration, 0);
  }

  /**
   * Generates a test execution summary.
   */
  generateSummary(plans: TestPlan[]): string {
    const highPriority = plans.filter(p => p.priority === 'high').length;
    const mediumPriority = plans.filter(p => p.priority === 'medium').length;
    const lowPriority = plans.filter(p => p.priority === 'low').length;
    const totalDuration = this.estimateDuration(plans);

    return `
Test Execution Summary
----------------------
Total Plans: ${plans.length}
  High Priority: ${highPriority}
  Medium Priority: ${mediumPriority}
  Low Priority: ${lowPriority}
Estimated Duration: ${(totalDuration / 60000).toFixed(1)} minutes
    `.trim();
  }
}
