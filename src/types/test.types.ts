import { TestStep, StepStatus, TestAction, Environment } from './index';

export interface TestMetadata {
  id: string;
  name: string;
  description: string;
  suite: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  author?: string;
  created: Date;
  lastRun?: Date;
  lastStatus?: 'passed' | 'failed' | 'flaky' | 'skipped';
  failureCount: number;
  avgDuration: number; // ms
  environment: Environment[];
  dependencies: string[];
  steps: TestStep[];
}

export interface TestSuite {
  name: string;
  path: string;
  tests: TestMetadata[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestResult {
  test: TestMetadata;
  status: StepStatus;
  duration: number;
  steps: StepResult[];
  healingEvents: HealingEvent[];
  screenshot?: string;
  video?: string;
  trace?: string;
  error?: string;
  startedAt: Date;
  finishedAt: Date;
}

export interface StepResult {
  stepIndex: number;
  intent: string;
  action: TestAction;
  status: StepStatus;
  duration: number;
  selector?: string;
  healedSelector?: string;
  error?: string;
  screenshot?: string;
}

export interface HealingEvent {
  stepIndex: number;
  oldSelector: string;
  newSelector: string;
  confidence: number;
  explanation: string;
  fromCache: boolean;
  duration: number;
}

export interface TestRunReport {
  runId: string;
  startTime: Date;
  endTime: Date;
  totalTests: number;
  passed: number;
  failed: number;
  healed: number;
  skipped: number;
  flaky: number;
  duration: number;
  results: TestResult[];
  healingStats: HealingStats;
}

export interface HealingStats {
  totalHealings: number;
  successfulHealings: number;
  failedHealings: number;
  averageConfidence: number;
  fromCache: number;
  fromAI: number;
  byType: { type: string; count: number }[];
}
