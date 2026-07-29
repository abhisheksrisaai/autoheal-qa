# AutoHeal QA — Setup Instructions

## Prerequisites

- **Node.js** v18+ (v20 recommended)
- **npm** v9+
- **Git**
- **Docker** (optional, for containerized execution)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd autoheal-qa
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

Key configuration:
```env
BASE_URL=https://www.saucedemo.com        # Target application URL
HEALING_ENABLED=true                       # Enable self-healing
HEALING_CONFIDENCE_THRESHOLD=0.7           # Min confidence for healing
DEEPSEEK_API_KEY=your_key_here             # For AI healing (optional)
```

### 3. Install Playwright Browsers

```bash
npx playwright install --with-deps chromium
```

### 4. Run Tests

```bash
# All tests
npm test

# E2E tests only
npm run test:e2e

# Specific test file
npx playwright test tests/e2e/auth/login.spec.ts

# Tests with @smoke tag
npm run test:smoke

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### 5. View Reports

```bash
# HTML Report
npm run report:html

# Allure Report (if installed)
npm run report
```

## Docker Setup

```bash
# Build image
docker build -t autoheal-qa .

# Run all tests
docker-compose up autoheal-qa

# Run E2E only
docker-compose --profile e2e up autoheal-qa-e2e

# Run API only
docker-compose --profile api up autoheal-qa-api
```

## CI/CD Setup

The project includes GitHub Actions workflows:

- **ci.yml**: Runs on PR/push → Lint + Build + Smoke Tests
- **nightly.yml**: Runs daily → Full regression suite across all browsers

## Project Configuration

### playwright.config.ts
- `projects`: chromium, firefox, webkit, Mobile Chrome
- `retries`: 2 in CI, 0 locally
- `reporter`: HTML + Allure + JSON
- `timeout`: 30s per test

### Healing Configuration (src/config/healing.config.ts)
- `enabled`: true
- `confidenceThreshold`: 0.7
- `maxAttempts`: 3
- `timeoutMs`: 10000

## Test Structure

```
tests/
├── e2e/
│   ├── auth/          # Login, logout, register
│   ├── checkout/      # Cart, payment, confirmation
│   └── dashboard/     # Overview, settings
├── api/               # REST API tests
├── visual/            # Visual regression
└── performance/       # Load & performance
```

## Writing Tests

### Basic Test (No Healing)
```typescript
import { test, expect } from '@playwright/test';

test('basic login', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-test="username"]', 'standard_user');
  await page.fill('[data-test="password"]', 'secret_sauce');
  await page.click('[data-test="login-button"]');
  await expect(page.locator('.inventory_list')).toBeVisible();
});
```

### Test with Self-Healing Page Objects
```typescript
import { test } from '../src/fixtures/page.fixture';

test('login with healing', async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await dashboardPage.expectDashboardVisible();
});
```

### Test with Healing Fixture
```typescript
import { test } from '../src/fixtures/healing.fixture';

test('validate healing', async ({ healingEngine, page }) => {
  // Simulate a failure and heal it
  const result = await healingEngine.heal({
    testContext: { /* ... */ },
    oldSelector: '.broken-selector',
    intent: 'click the login button',
    // ...
  });
  console.log(`Healed to: ${result.newSelector} (${result.confidence})`);
});
```

## Knowledge Base

The knowledge base persists all healing decisions:
- Location: `reports/healing-logs/knowledge-base.json`
- Auto-saves after each healing
- Export/Import for sharing across test runs
- Statistics API: `healingEngine.getStats()`
