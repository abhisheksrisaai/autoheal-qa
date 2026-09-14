# AutoHeal QA

### AI-Powered Self-Healing Playwright Test Automation Framework

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-green)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Traditional tests break when UI changes. AutoHeal QA fixes them automatically — **38/48 strict recoveries on the 48-run heal-bench matrix** (12/16 DeepSeek, 12/16 Kimi, 14/16 Qwen), **0/48 baseline without the healer**, zero manual intervention. Details in [Evaluation](#-evaluation-heal-bench-measured-not-demoed).

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

## 🧪 Demo Log: 8/8 Self-Healing Runs (saucedemo, single runs)

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

> These are demo runs. The measured numbers — same 8 failure shapes, strict
> verification, 3 providers × 2 repeats — are in
> [Evaluation](#-evaluation-heal-bench-measured-not-demoed) below.

## 📏 Evaluation: heal-bench (measured, not demoed)

`evals/heal-bench/` runs **N=8 broken-locator scenarios across M=3 fixture apps**
(shop-login, shop-inventory, shop-dashboard) against every provider, R=2 repeats
= 48 live runs. Each run uses a real Chromium page, a real accessibility snapshot,
and strict verification: the healed selector must resolve to exactly the RIGHT
element and drive the scenario's functional check. Resolving *something visible*
is not enough to pass.

| Provider | Healer strict | Executor | Planner* | Avg conf | Avg heal time | Flaky | AI calls | Est. cost |
|---|---|---|---|---|---|---|---|---|
| DeepSeek V4 Pro | 12/16 | 12/16 | 16/16 | 0.73 | 47.3s | 0/8 | 26 | ~$0.03 |
| Kimi K3 | 12/16 | 12/16 | 16/16 | 0.71 | 18.4s | 0/8 | 24 | ~$0.12 |
| Qwen3.7 Max | 14/16 | 14/16 | 16/16 | 0.83 | 23.4s | 0/8 | 20 | ~$0.05 |

Baseline without healer: **48/48 fail**. \*Planner is rule-based (no LLM call) —
16/16 is deterministic step generation, identical for every provider. Only the
Healer spends AI budget; the Executor runs the healed step on a fresh page.

Failure modes the bench confirmed (all reproduced, none invented):

- **Timing issues don't heal (0/6).** The banner doesn't exist at snapshot time,
  so every provider abstains (conf 0). A plain 10s retry recovers it — retry, not
  healing, is the fix. (The engine logs "would retry before healing" but doesn't;
  the retry lives in the executor path.)
- **Stale copy doesn't heal (assertion).** The element exists; only the expected
  text is wrong. DeepSeek/Kimi abstain (conf 0). Qwen re-resolves it at conf 0.95 —
  counted strict-pass (resolve-only), but the test would STILL fail on the text.
  Qwen emits flat 0.95 on all 13 of its successes, so the 0.7 floor can't
  discriminate it. The guardrail that catches this is functional re-verification
  (the bench does it; `validateHealing` exists in code but nothing calls it yet).
- **Chained selectors** (`page.getByRole('main').getByRole(...).first()`). Models
  emit them; the product resolver rejects them loudly (fail-closed), the bench
  evaluates them. The heal prompt doesn't constrain output shape — flagged follow-up.
- **Latency variance is the instability.** 0/8 outcome flips across repeats, but
  heal times span 5s→69s, and DeepSeek burns the full 120s budget on unhealable
  cases while Kimi fails fast (~46s). The product default 10s timeout would time
  out nearly every AI heal — the bench raises it to 120s and measures.

Run it: `npm run eval:heal` (needs `OPENCODE_API_KEY`, ~30–45 min, ~$0.20) ·
`npm run eval:heal-report` · `npm run eval:heal-guardrails` (no key, CI-safe loop
check). Full table + per-scenario outcomes:
[evals/heal-bench/RESULTS.md](evals/heal-bench/RESULTS.md).

## 🛡️ Guardrails (implemented, verified)

| Risk | Guardrail | Where | Proof |
|---|---|---|---|
| Heal → retry → heal forever | max 1 heal-retry per step (`healDepth`) | `ExecutorAgent` | `eval:heal-guardrails`: always-wrong stub healer → exactly 1 heal call, loud failure |
| Stalled AI call hangs the run | `timeoutMs` enforced around the attempt loop (was configured, never enforced) | `HealingEngine` | assertion/timing legs fail at exactly 120.0s, not never |
| Wrong-element silent pass | chains rejected loudly; `page.` prefix + string role names supported; strict functional verify in bench | `HealerAgent.resolveLocator` | bench strict column + per-row `productResolvable` audit |
| Runaway spend | per-process AI-call budget (`HEAL_BENCH_MAX_AI_CALLS` = 60) + per-scenario backstop + token accounting × list prices | `evals/heal-bench` | 70 AI calls, ~$0.20 total, measured |
| All live calls rejected | `x-opencode-session` + `User-Agent` headers (Go requires them; nothing sent them) | `OpenCodeClient` | probe: 3/3 providers OK after fix |
| Removed Playwright API | `ariaSnapshot()` helper with legacy fallback (repo called removed `page.accessibility`) | `helpers/captureA11y` | snapshots non-null on all 48 runs |
| Executor couldn't run heals | `getBy*` resolution in executor; provider threading for fallback heals | `ExecutorAgent` | executor column tracks healer 1:1 (12–14/16) |

CI: the PR workflow runs lint + build + `eval:heal-guardrails` (needs no key). The
full 48-run bench stays manual: it needs a key, ~45 min, and real spend, so it is
deliberately not in PR CI (same reason the nightly stays key-gated).

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
| Self-healing success rate (demo log, saucedemo) | **100% (8/8)** |
| Strict recovery, heal-bench (48 live runs) | **38/48** (Qwen 14/16, DeepSeek 12/16, Kimi 12/16) |
| Baseline without healer (same 48) | **48/48 fail** |
| AI confidence, bench avg (incl. abstentions) | **0.71–0.83 by provider** |
| Avg heal time, bench | **18–47s by provider** (Kimi fastest) |
| Flaky scenarios (R=2 repeats) | **0/8** |
| KB cache hit time | **1ms** |
| KB cache hit rate (demo) | **80%** |
| Failure types covered | **5** |
| Bench cost, measured | **~$0.20 (70 AI calls)** |
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
