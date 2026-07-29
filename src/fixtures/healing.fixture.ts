import { test as base } from '@playwright/test';
import { HealerAgent } from '../agents/healer/HealerAgent';
import { ContextManager } from '../agents/shared/ContextManager';
import { KnowledgeBase } from '../agents/shared/KnowledgeBase';
import { HealingEngine } from '../agents/healer/HealingEngine';

/**
 * Self-healing fixture - provides healing context for tests.
 * 
 * Automatically records and heals failures during test execution.
 */
export interface HealingFixtures {
  healerAgent: HealerAgent;
  healingEngine: HealingEngine;
  knowledgeBase: KnowledgeBase;
  contextManager: ContextManager;
}

export const test = base.extend<HealingFixtures>({
  contextManager: async ({}, use) => {
    const cm = new ContextManager('dev');
    await use(cm);
  },

  knowledgeBase: async ({}, use) => {
    const kb = new KnowledgeBase();
    await use(kb);
  },

  healerAgent: async ({ contextManager }, use) => {
    const healer = new HealerAgent(contextManager);
    await use(healer);
  },

  healingEngine: async ({}, use) => {
    const engine = new HealingEngine();
    await use(engine);
  },
});

export { expect } from '@playwright/test';
