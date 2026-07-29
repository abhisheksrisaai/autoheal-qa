# AutoHeal QA — Architecture Documentation

## Overview

**AutoHeal QA** is an AI-powered self-healing test automation framework built on Playwright and a multi-agent architecture. The system automatically detects, diagnoses, and repairs test failures in real-time without human intervention.

## Key Innovation: Intent-Based Self-Healing

Instead of storing brittle CSS selectors, the framework stores the **semantic intent** of each test step (e.g., "click the login button", "fill the email field"). When a step fails, the AI Healer Agent analyzes the live DOM using the accessibility tree, matches it against the stored intent, generates a corrected selector, validates the fix, and persists the learning.

## System Architecture

### Three-Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      AutoHeal QA                        │
├───────────────┬───────────────┬─────────────────────────┤
│ Planner Agent │ Executor Agent│   Healer Agent          │
│   (Kimi K3)   │ (Qwen3.7 Max) │  (DeepSeek V4 Pro)     │
├───────────────┼───────────────┼─────────────────────────┤
│ - Analyzes    │ - Runs tests  │ - Detects failures      │
│   requirements│ - Captures    │ - Queries knowledge base│
│ - Generates   │   A11y tree   │ - Analyzes DOM          │
│   test plans  │ - Monitors    │ - Generates selectors    │
│ - Prioritizes │   failures    │ - Validates fixes        │
└───────────────┴───────────────┴─────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────┐   ┌──────────────┐   ┌──────────────┐
   │AI Model  │   │ContextManager│   │KnowledgeBase │
   │Router    │   │              │   │              │
   └──────────┘   └──────────────┘   └──────────────┘
```

### Agent Responsibilities

| Agent | AI Model | Role |
|-------|----------|------|
| **Planner Agent** | Kimi K3 | Analyzes test requirements, generates test strategies, determines optimal execution paths |
| **Executor Agent** | Qwen3.7 Max | Runs Playwright tests, captures accessibility snapshots, monitors for failures in real-time |
| **Healer Agent** | DeepSeek V4 Pro | Detects failures, queries knowledge base, analyzes DOM, generates corrected selectors, validates fixes |

### Shared Infrastructure

| Component | Purpose |
|-----------|---------|
| **AIModelRouter** | Routes tasks to optimal AI model based on task type |
| **ContextManager** | Maintains session state and test context across agent interactions |
| **KnowledgeBase** | Persistent JSON store of all failures and their resolutions |

## Self-Healing Workflow

```
Test Step Executes → Failure Detected → Error Classified
                                            ↓
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                   Locator Break       Timing Issue         Logic Error
                         │                   │                   │
                         ▼                   ▼                   ▼
                   Query Knowledge      Adjust Wait         Flag for Human
                   Base for Similar     Strategy            Review
                   Failure?
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Known Fix?           Unknown Failure
              │                     │
              ▼                     ▼
         Apply Fix         DeepSeek V4 Pro
         (instant)         Analyzes DOM + Intent
                                │
                                ▼
                         Generate New Selector
                                │
                                ▼
                           Validate Fix
                                │
                                ▼
                       Update Knowledge Base
                                │
                                ▼
                      Continue Test Execution
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Test Automation | Playwright (TypeScript) |
| AI Agent Framework | OpenCode + PI Agent |
| AI Models | DeepSeek V4 Pro, Kimi K3, Qwen3.7 Max |
| Test Reporting | Allure Reporter, HTML Reporter |
| CI/CD | GitHub Actions |
| Containerization | Docker, Docker Compose |
| Test Data | Faker.js, dynamic data factories |
| Version Control | Git |

## File Structure

```
autoheal-qa/
├── playwright.config.ts          # Main config with self-healing hooks
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── .env.example                  # Environment template
├── docker-compose.yml            # Container orchestration
│
├── .github/workflows/
│   ├── ci.yml                    # PR checks & smoke tests
│   └── nightly.yml               # Full regression suite
│
├── src/
│   ├── agents/
│   │   ├── healer/               # Healing agents
│   │   ├── planner/              # Planning agents
│   │   ├── executor/             # Execution agents
│   │   └── shared/               # Shared infrastructure
│   ├── page-objects/             # Page Object Models
│   ├── fixtures/                 # Test fixtures
│   ├── helpers/                  # Utilities
│   ├── config/                   # Configuration
│   └── types/                    # TypeScript types
│
├── tests/
│   ├── e2e/                      # End-to-end tests
│   ├── api/                      # API tests
│   ├── visual/                   # Visual regression
│   └── performance/              # Performance tests
│
├── reports/                      # Test reports & logs
└── docs/                         # Documentation
```

## Key Design Patterns

1. **Intent-Based Selectors**: Tests store intent ("click login") instead of selectors (`.btn-login`)
2. **SelfHealingLocator**: AI-augmented locator that auto-heals on failure
3. **KnowledgeBase Learning**: Every healing is stored and reused
4. **Multi-Model Routing**: Optimal AI model chosen per task type
5. **Accessibility Tree Analysis**: Robust element identification via A11y tree
