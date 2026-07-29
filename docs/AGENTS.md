# AutoHeal QA — AI Agent Design

## Overview

AutoHeal QA uses a three-agent architecture, each powered by a different AI model optimized for its specific task.

## Planner Agent (Kimi K3)

**Role:** Test Strategy & Planning

### Capabilities
- Analyzes test requirements and user stories
- Generates test strategies and execution plans
- Determines optimal test execution paths
- Prioritizes tests by failure probability
- Generates test cases from natural language

### Implementation
```typescript
class PlannerAgent {
  async analyze(requirements: TestRequirement): Promise<TestPlan>
  async generateSteps(plan: TestPlan): Promise<AgentTestStep[]>
  async prioritizeTests(tests: TestMetadata[]): Promise<TestMetadata[]>
  async generateFromUserStory(userStory: string): Promise<TestRequirement[]>
}
```

### AI Features
- **AI Test Case Generation**: Converts user stories/requirements into test cases
- **Intelligent Test Prioritization**: Ranks tests by failure probability based on code changes
- **Auto-Generated Documentation**: Creates human-readable test docs from code

## Executor Agent (Qwen3.7 Max)

**Role:** Test Execution & Monitoring

### Capabilities
- Executes Playwright tests with intelligent wait strategies
- Captures accessibility snapshots in real-time
- Monitors for failures and exceptions
- Triggers the Healer Agent when failures occur
- Implements smart retry with exponential backoff

### Implementation
```typescript
class ExecutorAgent {
  async execute(step: AgentTestStep, context: ExecutionContext): Promise<ExecutionResult>
  async captureAccessibilityTree(): Promise<AccessibilityNode>
  async monitorExecution(context: ExecutionContext): Promise<void>
  async handleFailure(failure: FailureEvent): Promise<void>
}
```

### AI Features
- **Smart Test Data Generation**: Creates realistic, context-aware test data
- **Predictive Flakiness Detection**: Predicts flaky tests before they fail
- **Cross-Browser Smart Adaptation**: Adjusts selectors and waits per browser

## Healer Agent (DeepSeek V4 Pro)

**Role:** Failure Detection & Self-Healing

### Capabilities
- Detects and classifies test failures
- Queries knowledge base for known fixes
- Analyzes DOM using accessibility tree
- Generates corrected selectors
- Validates fixes and persists learning

### Implementation
```typescript
class HealerAgent {
  async handleFailure(failure: FailureEvent): Promise<HealingResult>
  async validateHealing(page, selector, intent): Promise<boolean>
}
```

### Healing Strategies

1. **Exact KB Match**: Known selector failure → apply stored fix instantly
2. **Fuzzy KB Match**: Similar selector pattern → adapt stored fix
3. **AI Heuristic**: Parse intent keywords → generate role/text selector
4. **Full AI Analysis**: DeepSeek analyzes A11y tree + intent → optimal selector

### Selector Generation Rules
- Prefer `getByRole()` over CSS selectors
- Prefer `getByText()`, `getByLabel()` over attributes  
- Never return CSS class-only selectors
- Confidence reflects certainty: >0.9 very sure, 0.7-0.9 likely, <0.7 uncertain

### AI Features
- **Failure Root Cause Analysis**: Analyzes stack traces, logs, and screenshots
- **Visual Regression AI**: Detects layout shifts, color changes beyond pixel-perfect
- **Performance Bottleneck Detection**: Identifies slow operations from metrics
- **Natural Language Test Writing**: Converts plain English to Playwright code

## Shared Infrastructure

### AIModelRouter
Routes tasks to optimal AI model:
- `heal` → DeepSeek V4 Pro
- `plan` → Kimi K3
- `execute` → Qwen3.7 Max
- `analyze` → DeepSeek V4 Pro
- `generate` → Kimi K3
- `validate` → Qwen3.7 Max

### ContextManager
Maintains session state across agent interactions:
- Test step history
- Failure records
- Healing history
- Current page URL
- Environment context

### KnowledgeBase
Persistent learning store:
- JSON-based storage
- Exact + fuzzy matching
- Auto-save on updates
- Export/import for CI sharing
- Statistics and analytics

## Error Classification

| Failure Type | Description | Healing Strategy |
|-------------|-------------|-----------------|
| `locator_break` | Selector no longer matches | Heal selector |
| `timing_issue` | Element not ready | Retry with backoff |
| `network_error` | API/connectivity issues | Retry |
| `assertion_failure` | Expected ≠ Actual | Flag for human review |
| `logic_error` | Test logic needs update | Flag for human review |
