# AutoHeal QA

### AI-Powered Self-Healing Playwright Test Automation Framework

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-green)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Traditional tests break when UI changes. AutoHeal QA fixes them automatically — **100% success on 5 failure types**, 95% AI confidence, **1ms cached healing**, zero manual intervention.

---

## 🎯 Quick Demo

```
🔴 .login-submit-btn  → FAILED (no such element)
🤖 DeepSeek V4 Pro    → Analyzing DOM...
🔧 Healed             → getByRole('button', { name: 'Login' })
📊 Confidence: 95%    ⏱️ 1ms (from Knowledge Base)
✅ Retry              → Click succeeded. Logged in!
```

---

## 🏗️ Architecture

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PLANNER      │  │ EXECUTOR     │  │ HEALER       │
│ Kimi K3      │  │ Qwen3.7 Max  │  │ DeepSeek V4  │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ Test strategy│  │ Smart exec   │  │ Auto-healing │
│ Step gen     │  │ A11y capture │  │ DOM analysis │
│ Prioritize   │  │ Monitor      │  │ KB + AI fix  │
└──────────────┘  └──────────────┘  └──────────────┘
         │               │                │
         └───────────────┼────────────────┘
                         ▼
              ┌──────────────────┐
              │  OpenCode Go API  │
              │  (Single Key)     │
              └──────────────────┘
```

---

## 🧪 Results: 8/8 Self-Healing Tests

| # | Failure Type | Broken Selector | Healed To | Time |
|---|-------------|----------------|-----------|------|
| 1 | Locator Break | `.login-submit-btn` | `getByRole('button', { name: 'Login' })` | 1ms |
| 2 | Locator Break | `button.cart-add-btn` | `getByRole('button', { name: 'Add to cart' })` | 1ms |
| 3 | Ambiguous | 6 matching buttons | `.first()` resolution | instant |
| 4 | Assertion | `"Swag Labs 2.0"` | Adapted to actual text | instant |
| 5 | Placeholder | `getByPlaceholder(...)` | `getByRole('textbox', { name: 'Username' })` | 1ms |
| 6 | UI Refactor | `.button-wrapper > input` | `getByRole('button', { name: 'Login' })` | 1ms |
| 7 | ID Migration | `#user-name-old` | `getByRole('textbox', { name: 'Username' })` | 1ms |
| 8 | Timing Issue | Click @ 500ms timeout | Smart retry @ 10s | instant |

**80% KB cache hit rate. 95% avg AI confidence. Zero manual fixes.**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenCode Go API key ([get one](https://opencode.ai/go))

### Setup

```bash
git clone https://github.com/abhisheksrisaai/autoheal-qa.git
cd autoheal-qa
npm install
npx playwright install chromium
```

Add your API key:

```bash
echo "OPENCODE_API_KEY=sk-your-key-here" > .env
```

### Run Healing Demos

```bash
# All 8 healing tests (with browser visible + video)
npx playwright test tests/e2e/demo/ --headed

# View healing dashboard
open reports/healing-dashboard.html

# Standard login tests
npx playwright test tests/e2e/auth/login.spec.ts
```

---

## 📁 Project Structure

```
src/
├── agents/
│   ├── healer/          # HealerAgent, HealingEngine, LocatorHealer
│   ├── planner/         # PlannerAgent, TestOrchestrator
│   ├── executor/        # ExecutorAgent, RetryManager
│   └── shared/          # AIModelRouter, KnowledgeBase, OpenCodeClient
├── page-objects/        # BasePage (self-healing), Pages, Components
├── fixtures/            # auth, page, healing fixtures
├── helpers/             # API clients, data factories, validators
├── config/              # AI model config, healing thresholds
└── types/               # TypeScript type definitions

tests/
├── e2e/demo/            # ★ 8 self-healing demo tests
├── e2e/auth/            # Login/logout tests
├── e2e/checkout/        # Cart, payment, confirmation
├── e2e/dashboard/       # Overview, settings
├── api/                 # REST API tests
├── visual/              # Visual regression
└── performance/         # Load & performance
```

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Self-healing success rate | **100% (8/8)** |
| AI confidence (average) | **95%** |
| KB cache hit time | **1ms** |
| KB cache hit rate | **80%** |
| Failure types covered | **5** |
| Manual intervention | **0** |

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture & design |
| [AGENTS.md](docs/AGENTS.md) | AI agent design & capabilities |
| [SETUP.md](docs/SETUP.md) | Installation & configuration |
| [HEALING.md](docs/HEALING.md) | Self-healing mechanism deep dive |
| [TECHNICAL_REPORT.md](docs/TECHNICAL_REPORT.md) | Full academic report |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Automation | Playwright 1.62 |
| Language | TypeScript 5.5 |
| AI Models | DeepSeek V4 Pro, Kimi K3, Qwen3.7 Max |
| AI API | OpenCode Go |
| Reporting | Allure, Playwright HTML |
| CI/CD | GitHub Actions |
| Container | Docker + Docker Compose |

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*Built for Final Year Capstone Project. July 2026.*
