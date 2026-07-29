# AutoHeal QA — Self-Healing Mechanism

## Overview

The self-healing mechanism is the core innovation of AutoHeal QA. It enables tests to automatically recover from selector failures caused by UI changes, without human intervention.

## How It Works

### 1. Failure Detection

When a Playwright test step fails (element not found, timeout, etc.), the framework captures:
- The failed selector
- The error message
- The current page URL
- The accessibility tree snapshot
- The test intent (what the test was trying to do)

### 2. Error Classification

The `ErrorAnalyzer` classifies failures into:

| Type | Pattern | Healing? |
|------|---------|----------|
| `locator_break` | "no such element", "selector not found" | ✅ Yes |
| `timing_issue` | "timeout", "element not clickable" | ✅ Retry |
| `network_error` | "net::err", "ECONNREFUSED" | ⚠️ Retry |
| `assertion_failure` | "expected", "assert" | ❌ Human review |
| `logic_error` | Other | ❌ Human review |

### 3. Healing Strategies

#### Strategy 1: Knowledge Base Lookup (Fastest)
- Query KB for exact selector + intent match
- If found with confidence ≥ 0.9, apply immediately
- 0ms overhead — instant healing

#### Strategy 2: Fuzzy KB Match
- Match same intent with similar selector pattern
- Strip dynamic IDs/hashes for fuzzy matching
- Apply closest match

#### Strategy 3: Intent-Based Heuristics
- Parse intent keywords (e.g., "click the login button")
- Map to role-based selectors:
  - "login" → `getByRole('button', { name: /login/i })`
  - "username" → `getByRole('textbox', { name: /username/i })`
  - "add to cart" → `getByRole('button', { name: /add to cart/i })`
- Confidence: 0.5 - 0.75

#### Strategy 4: AI Analysis (DeepSeek V4 Pro)
- Send accessibility tree + intent to DeepSeek
- AI analyzes DOM structure
- Generates optimal selector based on:
  - Semantic role
  - Visible text
  - ARIA labels
  - Contextual relationships
- Returns confidence score + explanation

### 4. Selector Conversion Rules

The healer prioritizes selectors in this order:

1. **Role-based**: `getByRole('button', { name: /login/i })`
2. **Text-based**: `getByText(/login/i)`
3. **Label-based**: `getByLabel(/username/i)`
4. **Test ID**: `getByTestId('login-button')`
5. **CSS (last resort)**: `button[type="submit"]`

Rules:
- ❌ NEVER return CSS class-only selectors
- ✅ Always pair CSS class with tag or text
- ✅ Prefer accessibility attributes (aria-label, role)
- ✅ Use user-facing text over implementation details

### 5. Validation

After generating a new selector:
1. The framework resolves the selector against the actual page
2. Waits for the element to be visible/attached
3. If visible, marks healing as successful
4. If not found, returns to healing with lower confidence threshold

### 6. Learning & Persistence

Every healing is stored in the Knowledge Base:

```json
{
  "id": "heal-001",
  "oldSelector": ".btn-login-primary",
  "newSelector": "getByRole('button', { name: /login/i })",
  "pageUrl": "/login",
  "intent": "click the login button",
  "failureType": "locator_break",
  "healingConfidence": 0.92,
  "timestamp": "2024-07-25T10:30:00Z",
  "timesUsed": 3,
  "explanation": "CSS class was renamed. Role-based locator is more stable."
}
```

### 7. Cross-Context Persistence

Knowledge bases can be:
- Exported/imported between test runs
- Shared via CI artifacts
- Accumulated over time
- Analyzed for patterns

## Example Healing Flow

```
1. Test executes: click '.btn-green'
2. Error: "no such element: .btn-green"
3. Classified: locator_break
4. KB Query: '.btn-green' + "click add to cart" → Not found
5. Heuristic: "add to cart" → getByRole('button', { name: /add to cart/i })
6. Validate: Selector resolves to matching button ✅
7. Apply: Test continues with healed selector
8. Learn: Entry stored in KB for future
9. Total healing time: ~200ms
```

## Configuration

```typescript
// healing.config.ts
{
  enabled: true,                     // Enable/disable healing
  confidenceThreshold: 0.7,           // Min confidence for auto-apply
  maxAttempts: 3,                     // Max healing attempts per failure
  timeoutMs: 10000,                   // Max time per healing attempt
  preferRoleSelectors: true,          // Prefer getByRole over CSS
  preferTextSelectors: true,          // Prefer getByText over attributes
  avoidClassOnlySelectors: true,      // Never use class-only selectors
}
```

## Statistics

Track healing effectiveness:
```typescript
const stats = await healingEngine.getStats();
// {
//   totalEntries: 150,
//   averageConfidence: 0.87,
//   topFailureTypes: [...],
//   recentHealings: [...]
// }
```
