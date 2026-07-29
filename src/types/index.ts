// Global Type Definitions for AutoHeal QA

export interface TestContext {
  testId: string;
  testName: string;
  intent: string;
  stepIndex: number;
  startTime: Date;
  environment: Environment;
}

export interface TestStep {
  index: number;
  intent: string;
  action: TestAction;
  selector?: string;
  value?: string;
  timeout?: number;
  status: StepStatus;
}

export type TestAction = 
  | 'click' | 'fill' | 'type' | 'select' | 'hover'
  | 'check' | 'uncheck' | 'drag' | 'drop'
  | 'navigate' | 'wait' | 'screenshot' | 'assert' | 'scroll';

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'healed' | 'skipped';

export type Environment = 'dev' | 'staging' | 'prod';

export type FailureType = 
  | 'locator_break'    // Selector no longer matches
  | 'timing_issue'     // Element not ready/visible
  | 'logic_error'      // Test logic needs update
  | 'assertion_failure' // Expected vs actual mismatch
  | 'network_error'    // API/network issues
  | 'unknown';

export interface FailureEvent {
  testContext: TestContext;
  stepIndex: number;
  type: FailureType;
  oldSelector: string;
  errorMessage: string;
  currentUrl: string;
  timestamp: Date;
  screenshot?: Buffer;
  accessibilityTree?: AccessibilityNode;
}

export interface HealingResult {
  success: boolean;
  newSelector: string;
  confidence: number;
  explanation: string;
  oldSelectorType: SelectorType;
  newSelectorType: SelectorType;
  elementAttributes: ElementAttributes;
}

export interface KnowledgeBaseEntry {
  id: string;
  oldSelector: string;
  newSelector: string;
  pageUrl: string;
  intent: string;
  failureType: FailureType;
  healingConfidence: number;
  timestamp: Date;
  timesUsed: number;
  lastUsed: Date;
  explanation: string;
}

export interface ElementAttributes {
  tag: string;
  role: string;
  ariaLabel: string;
  textContent: string;
  id?: string;
  name?: string;
  placeholder?: string;
}

export type SelectorType = 'css' | 'xpath' | 'role' | 'text' | 'label' | 'testid';

export interface AccessibilityNode {
  role: string;
  name: string;
  description?: string;
  value?: string;
  children?: AccessibilityNode[];
  attributes?: Record<string, string>;
}

export interface AIModelConfig {
  name: string;
  provider: 'deepseek' | 'kimi' | 'qwen';
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface HealingConfig {
  enabled: boolean;
  confidenceThreshold: number;
  maxAttempts: number;
  timeoutMs: number;
  knowledgeBasePath: string;
  preferRoleSelectors: boolean;
  preferTextSelectors: boolean;
  avoidClassOnlySelectors: boolean;
}
