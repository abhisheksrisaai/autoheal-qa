import { FailureEvent, HealingResult, KnowledgeBaseEntry, FailureType, AccessibilityNode, TestContext, Environment } from './index';

export interface HealerAgentInterface {
  diagnose(failure: FailureEvent): Promise<DiagnosisResult>;
  heal(failure: FailureEvent, diagnosis: DiagnosisResult): Promise<HealingResult>;
  validate(selector: string, intent: string): Promise<boolean>;
  learn(result: HealingResult, failure: FailureEvent): Promise<void>;
}

export interface PlannerAgentInterface {
  analyze(testRequirements: TestRequirement): Promise<TestPlan>;
  generateSteps(plan: TestPlan): Promise<AgentTestStep[]>;
  prioritizeTests(tests: TestMetadata[]): Promise<TestMetadata[]>;
}

export interface ExecutorAgentInterface {
  execute(step: AgentTestStep, context: ExecutionContext): Promise<ExecutionResult>;
  captureAccessibilityTree(): Promise<AccessibilityNode>;
  monitorExecution(context: ExecutionContext): Promise<void>;
  handleFailure(failure: FailureEvent): Promise<void>;
}

export interface AIModelRouterInterface {
  route(task: AgentTask): Promise<AIModel>;
  selectModel(taskType: TaskType): AIModel;
}

export interface ContextManagerInterface {
  getSession(): SessionState;
  updateSession(update: Partial<SessionState>): void;
  recordStep(step: AgentTestStep): void;
  recordFailure(failure: FailureEvent): void;
  getHistory(): AgentTestStep[];
}

export interface KnowledgeBaseInterface {
  query(selector: string, intent: string): Promise<KnowledgeBaseEntry | null>;
  store(entry: KnowledgeBaseEntry): Promise<void>;
  update(id: string, update: Partial<KnowledgeBaseEntry>): Promise<void>;
  getStats(): Promise<KnowledgeBaseStats>;
  search(filters: KnowledgeBaseFilters): Promise<KnowledgeBaseEntry[]>;
}

// Supporting types
export interface DiagnosisResult {
  failureType: FailureType;
  rootCause: string;
  confidence: number;
  suggestedAction: 'heal' | 'retry' | 'wait' | 'skip' | 'abort';
}

export interface TestRequirement {
  feature: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface TestPlan {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
  dependencies: string[];
}

export interface AgentTestStep {
  index: number;
  intent: string;
  action: AgentTestAction;
  selector?: string;
  value?: string;
  timeout?: number;
}

export type AgentTestAction = 
  | 'click' | 'fill' | 'type' | 'select' | 'hover'
  | 'check' | 'uncheck' | 'navigate' | 'wait'
  | 'screenshot' | 'assert' | 'scroll';

export interface ExecutionContext {
  page: any;
  browser: any;
  testContext: TestContext;
  session: SessionState;
}

export interface ExecutionResult {
  success: boolean;
  step: AgentTestStep;
  duration: number;
  error?: Error;
  screenshot?: Buffer;
  accessibilityTree?: AccessibilityNode;
}

export interface SessionState {
  sessionId: string;
  startTime: Date;
  steps: AgentTestStep[];
  failures: FailureEvent[];
  healings: HealingResult[];
  currentUrl: string;
  environment: Environment;
}

export interface AIModel {
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export type AgentTask = 
  | { type: 'heal'; failure: FailureEvent }
  | { type: 'plan'; requirements: TestRequirement }
  | { type: 'execute'; step: AgentTestStep }
  | { type: 'analyze'; context: string };

export type TaskType = 'heal' | 'plan' | 'execute' | 'analyze' | 'generate' | 'validate';

export interface KnowledgeBaseStats {
  totalEntries: number;
  averageConfidence: number;
  topFailureTypes: { type: FailureType; count: number }[];
  recentHealings: KnowledgeBaseEntry[];
}

export interface KnowledgeBaseFilters {
  failureType?: FailureType;
  minConfidence?: number;
  pageUrl?: string;
  intent?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TestMetadata {
  name: string;
  path: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  lastRun?: Date;
  lastStatus?: 'passed' | 'failed' | 'flaky';
  failureCount: number;
  avgDuration: number;
}
