import {
  PlannerAgentInterface,
  TestRequirement,
  TestPlan,
  AgentTestStep,
  TestMetadata,
} from '../../types/agent.types';
import { AIModelRouter } from '../shared/AIModelRouter';

/**
 * PlannerAgent - Analyzes test requirements and generates test strategies.
 * Uses Kimi K3 for planning and test case generation.
 */
export class PlannerAgent implements PlannerAgentInterface {
  private aiRouter: AIModelRouter;

  constructor() {
    this.aiRouter = new AIModelRouter();
  }

  async analyze(requirements: TestRequirement): Promise<TestPlan> {
    const model = this.aiRouter.getModelForPlanning();
    console.log(`[PlannerAgent] Analyzing requirements using ${model.name}`);

    // Estimate based on acceptance criteria count
    const estimatedDuration = requirements.acceptanceCriteria.length * 5000; // ~5s per criteria
    const dependencies: string[] = [];

    // Determine dependencies based on feature analysis
    if (requirements.feature.includes('checkout')) {
      dependencies.push('auth');
      dependencies.push('cart');
    }
    if (requirements.feature.includes('dashboard')) {
      dependencies.push('auth');
    }
    if (requirements.feature.includes('payment')) {
      dependencies.push('auth');
      dependencies.push('checkout');
    }

    return {
      name: `Test Plan: ${requirements.feature}`,
      description: requirements.userStory,
      priority: requirements.priority,
      estimatedDuration,
      dependencies,
    };
  }

  async generateSteps(plan: TestPlan): Promise<AgentTestStep[]> {
    console.log(`[PlannerAgent] Generating steps for: ${plan.name}`);

    // Generate steps based on plan description
    const description = plan.description.toLowerCase();
    const steps: AgentTestStep[] = [];

    // Auth-related steps
    if (
      description.includes('login') ||
      description.includes('sign in') ||
      description.includes('authentication')
    ) {
      steps.push(
        { index: 0, intent: 'Navigate to login page', action: 'navigate', selector: '/login' },
        { index: 1, intent: 'Enter username', action: 'fill', selector: '[data-test="username"]', value: '{{username}}' },
        { index: 2, intent: 'Enter password', action: 'fill', selector: '[data-test="password"]', value: '{{password}}' },
        { index: 3, intent: 'Click the login button', action: 'click', selector: '[data-test="login-button"]' },
        { index: 4, intent: 'Verify successful login', action: 'assert', selector: '.inventory_list' }
      );
    }

    // Cart-related steps
    if (description.includes('cart') || description.includes('add to cart')) {
      steps.push(
        { index: 0, intent: 'Browse product listing', action: 'navigate', selector: '/inventory.html' },
        { index: 1, intent: 'Click add to cart for first product', action: 'click', selector: 'button.btn_inventory:first-of-type' },
        { index: 2, intent: 'Navigate to cart', action: 'click', selector: '.shopping_cart_link' },
        { index: 3, intent: 'Verify product in cart', action: 'assert', selector: '.cart_item' }
      );
    }

    // Checkout-related steps
    if (description.includes('checkout')) {
      steps.push(
        { index: 0, intent: 'Click checkout button', action: 'click', selector: '[data-test="checkout"]' },
        { index: 1, intent: 'Fill first name', action: 'fill', selector: '[data-test="firstName"]', value: 'John' },
        { index: 2, intent: 'Fill last name', action: 'fill', selector: '[data-test="lastName"]', value: 'Doe' },
        { index: 3, intent: 'Fill postal code', action: 'fill', selector: '[data-test="postalCode"]', value: '12345' },
        { index: 4, intent: 'Click continue', action: 'click', selector: '[data-test="continue"]' },
        { index: 5, intent: 'Click finish', action: 'click', selector: '[data-test="finish"]' },
        { index: 6, intent: 'Verify order confirmation', action: 'assert', selector: '.complete-header' }
      );
    }

    // Dashboard steps
    if (description.includes('dashboard') || description.includes('overview')) {
      steps.push(
        { index: 0, intent: 'Navigate to dashboard', action: 'navigate', selector: '/inventory.html' },
        { index: 1, intent: 'Verify page title', action: 'assert', selector: '.title' },
        { index: 2, intent: 'Verify product items visible', action: 'assert', selector: '.inventory_item' }
      );
    }

    return steps;
  }

  async prioritizeTests(tests: TestMetadata[]): Promise<TestMetadata[]> {
    console.log(`[PlannerAgent] Prioritizing ${tests.length} tests`);

    // Priority order: high > medium > low
    // Within same priority: higher failure count first
    // Also consider last status (failed tests get higher priority)
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return tests.sort((a, b) => {
      // Primary sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary: tests that were flaky or failed come first
      const statusOrder: Record<string, number> = {
        flaky: 0,
        failed: 0,
        undefined: 1,
        passed: 2,
      };
      const aStatus = statusOrder[a.lastStatus || 'undefined'] ?? 1;
      const bStatus = statusOrder[b.lastStatus || 'undefined'] ?? 1;
      const statusDiff = aStatus - bStatus;
      if (statusDiff !== 0) return statusDiff;

      // Tertiary: higher failure count first
      return b.failureCount - a.failureCount;
    });
  }

  /**
   * Generates test cases from a natural language user story.
   */
  async generateFromUserStory(userStory: string): Promise<TestRequirement[]> {
    const model = this.aiRouter.getModelForPlanning();
    console.log(`[PlannerAgent] Generating tests from user story using ${model.name}`);

    // Extract key terms from user story
    const terms = userStory.toLowerCase();
    const requirements: TestRequirement[] = [];

    // Parse common patterns
    if (terms.includes('login') || terms.includes('sign in')) {
      requirements.push({
        feature: 'Authentication',
        userStory: 'As a user, I want to log in with valid credentials',
        acceptanceCriteria: [
          'User can enter username and password',
          'User sees error for invalid credentials',
          'User is redirected to dashboard on success',
        ],
        priority: 'high',
      });
    }

    if (terms.includes('cart') || terms.includes('purchase')) {
      requirements.push({
        feature: 'Shopping Cart',
        userStory: 'As a customer, I want to add items to my cart',
        acceptanceCriteria: [
          'User can add items from product listing',
          'User can view items in cart',
          'User can remove items from cart',
          'Cart updates total correctly',
        ],
        priority: 'high',
      });
    }

    if (terms.includes('checkout') || terms.includes('payment')) {
      requirements.push({
        feature: 'Checkout',
        userStory: 'As a customer, I want to complete my purchase',
        acceptanceCriteria: [
          'User can enter shipping information',
          'User sees order summary before confirming',
          'User receives order confirmation',
        ],
        priority: 'high',
      });
    }

    return requirements;
  }
}
