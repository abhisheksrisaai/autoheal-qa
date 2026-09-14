'use strict';

/**
 * heal-bench runner.
 *
 * Real-browser eval: for each of the 8 scenarios it (1) reproduces the
 * failure with the broken selector (baseline, no healer), (2) runs the real
 * PlannerAgent + HealerAgent + ExecutorAgent pipeline against a live fixture
 * page, and (3) strictly verifies the healed selector on that page.
 *
 * Provider isolation: each (provider x repeat) runs in its OWN process with
 * its own KNOWLEDGE_BASE_PATH file and OPENCODE_SESSION_ID, so KB learning
 * and prompt caching never leak across providers or repeats:
 *
 *   node run.cjs --provider all --repeat 2     # forks 6 isolated children
 *   node run.cjs --provider kimi               # single run (child mode)
 *
 * Requires `npm run build` first (imports from ../../dist).
 */

const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const RESULTS_DIR = path.join(__dirname, 'results');

const PROVIDERS = ['deepseek', 'kimi', 'qwen'];

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--([^=]+)(=(.*))?$/);
    if (!m) continue;
    if (m[3] === undefined && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      out[m[1]] = argv[++i]; // support `--provider kimi` as well as `--provider=kimi`
    } else {
      out[m[1]] = m[3] === undefined ? true : m[3];
    }
  }
  return out;
}

// ---------------------------------------------------------------- parent ---
async function parentMain(a) {
  const repeat = parseInt(a.repeat || '2', 10);
  const providers = a.provider === 'all' ? PROVIDERS : [a.provider];
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  for (const provider of providers) {
    for (let rep = 0; rep < repeat; rep++) {
      console.log(`\n===== heal-bench: provider=${provider} repeat=${rep} =====`);
      const code = await new Promise((resolve) => {
        const child = fork(__filename, ['--child'], {
          env: {
            ...process.env,
            HEAL_BENCH_PROVIDER: provider,
            HEAL_BENCH_REP: String(rep),
            HEAL_BENCH_SCENARIO: a.scenario || '',
            KNOWLEDGE_BASE_PATH: path.join(RESULTS_DIR, `kb-${provider}-r${rep}.json`),
            OPENCODE_SESSION_ID: `autoheal-bench-${provider}-r${rep}`,
            // Bench budget is generous on purpose: shared-model latency
            // varies (10s typical, 30s+ observed), and the bench measures
            // provider timing rather than tripping the product's 10s default.
            HEALING_TIMEOUT_MS: '120000',
          },
          stdio: 'inherit',
        });
        child.on('exit', resolve);
      });
      if (code !== 0) console.error(`[heal-bench] child ${provider}/r${rep} exited with code ${code}`);
    }
  }
  console.log('\n===== heal-bench: aggregating =====');
  require('./report.cjs').main();
}

// ---------------------------------------------------------------- child ----
async function childMain() {
  // Env MUST be set before requiring dist (healing.config reads it at import).
  const provider = process.env.HEAL_BENCH_PROVIDER || 'deepseek';
  const rep = process.env.HEAL_BENCH_REP || '0';
  const onlyScenario = process.env.HEAL_BENCH_SCENARIO || '';
  require('dotenv').config({ path: path.join(ROOT, '.env') });

  const { chromium } = require('@playwright/test');
  const DIST = path.join(ROOT, 'dist', 'src');
  const { HealerAgent } = require(path.join(DIST, 'agents', 'healer', 'HealerAgent'));
  const { PlannerAgent } = require(path.join(DIST, 'agents', 'planner', 'PlannerAgent'));
  const { ExecutorAgent } = require(path.join(DIST, 'agents', 'executor', 'ExecutorAgent'));
  const { getOpenCodeClient } = require(path.join(DIST, 'agents', 'shared', 'OpenCodeClient'));
  const { captureA11ySnapshot } = require(path.join(DIST, 'helpers', 'captureA11y'));
  const { scenarios } = require('./scenarios.cjs');

  // --- AI call + token accounting (cost guardrail input) ---
  const client = getOpenCodeClient();
  const origGenerate = client.generate.bind(client);
  const usage = { calls: 0, promptChars: 0, respChars: 0, ms: 0 };
  client.generate = async (config, prompt, options) => {
    usage.calls++;
    usage.promptChars += (prompt || '').length;
    const t = Date.now();
    try {
      const text = await origGenerate(config, prompt, options);
      usage.respChars += (text || '').length;
      return text;
    } finally {
      usage.ms += Date.now() - t;
    }
  };
  const MAX_AI_CALLS = parseInt(process.env.HEAL_BENCH_MAX_AI_CALLS || '60', 10);

  const browser = await chromium.launch({ headless: true });
  const rows = [];

  for (const sc of scenarios) {
    if (onlyScenario && sc.id !== onlyScenario) continue;
    if (usage.calls >= MAX_AI_CALLS) {
      console.log(`[heal-bench] AI call budget (${MAX_AI_CALLS}) reached, stopping.`);
      break;
    }
    rows.push(await runScenario(browser, sc, provider, rep, usage, {
      HealerAgent, PlannerAgent, ExecutorAgent, captureA11ySnapshot,
    }));
  }

  await browser.close();
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outFile = path.join(RESULTS_DIR, `results-${provider}-r${rep}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ provider, rep: Number(rep), usage, rows }, null, 2));
  console.log(`[heal-bench] wrote ${outFile} (${usage.calls} AI calls)`);
}

async function withBackstop(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`harness backstop: ${label} exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Baseline: perform the broken action directly, no healer involved.
async function baselineAttempt(page, sc) {
  const shortTimeout = sc.id === 'timing' ? 500 : 3000;
  switch (sc.action) {
    case 'click':
      await page.locator(sc.brokenSelector).first().click({ timeout: shortTimeout });
      return;
    case 'click-first':
      // Strict locator click (no .first()): the ambiguity IS the failure.
      // NOTE: page.click() does NOT enforce strict mode in this Playwright
      // version (clicks first match), so the Locator API is required here.
      await page.locator(sc.brokenSelector).click({ timeout: shortTimeout });
      return;
    case 'fill':
      await page.locator(sc.brokenSelector).fill(sc.actionArg, { timeout: shortTimeout });
      return;
    case 'wait':
      await page.locator(sc.brokenSelector).first().waitFor({ state: 'visible', timeout: shortTimeout });
      return;
    case 'assert-text': {
      const actual = await page.locator(sc.brokenSelector).first().textContent();
      if ((actual || '').trim() !== sc.actionArg) {
        throw new Error(`Assertion failed: expected text "${sc.actionArg}" but found "${(actual || '').trim()}"`);
      }
      return;
    }
    default:
      throw new Error(`unknown action ${sc.action}`);
  }
}

// --- Healed-selector resolution -------------------------------------------
// Models emit getBy*-style strings, often chained and page.-prefixed, e.g.
//   page.getByRole('main').getByRole('button', { name: 'X' }).first()
// This evaluates such chains against the live page. Anything unparseable
// throws, which counts as a strict miss (fail loudly, don't guess).
function stripQuotes(s) {
  s = String(s).trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) return s.slice(1, -1);
  return s;
}
function toText(s) {
  s = String(s).trim();
  const rx = s.match(/^\/(.+)\/([a-z]*)$/);
  if (rx) return new RegExp(rx[1], rx[2]);
  return stripQuotes(s);
}
function parseChain(expr) {
  let s = String(expr || '').trim();
  if (s.startsWith('page.')) s = s.slice(5);
  else if (s === 'page') throw new Error('bare "page" is not a selector');
  const segs = [];
  let i = 0;
  while (i < s.length) {
    const m = s.slice(i).match(/^(getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|locator|first|last|nth)\s*/);
    if (!m) throw new Error(`unparseable selector segment at: ${s.slice(i, i + 40)}`);
    const name = m[1];
    i += m[0].length;
    let argStr = null;
    if (s[i] === '(') {
      let depth = 0;
      const j0 = i;
      let j = i;
      do {
        if (s[j] === '(') depth++;
        if (s[j] === ')') depth--;
        j++;
      } while (depth > 0 && j <= s.length);
      if (depth !== 0) throw new Error('unbalanced parens in healed selector');
      argStr = s.slice(j0 + 1, j - 1);
      i = j;
    }
    segs.push({ name, arg: argStr });
    if (s[i] === '.') i++;
    else if (i < s.length) throw new Error(`unexpected char in healed selector at: ${s.slice(i, i + 20)}`);
  }
  if (segs.length === 0) throw new Error('empty healed selector');
  return segs;
}
function parseRoleOpts(optStr) {
  const opts = {};
  const nm = (optStr || '').match(/name:\s*(\/[^/]+\/[a-z]*|'(?:[^']*)'|"(?:[^"]*)")/);
  if (nm) opts.name = toText(nm[1]);
  if (/exact:\s*true/.test(optStr || '')) opts.exact = true;
  return opts;
}
function evalSeg(base, seg) {
  switch (seg.name) {
    case 'locator': return base.locator(stripQuotes(seg.arg));
    case 'getByRole': {
      const m = seg.arg.match(/^'([^']+)'\s*(?:,\s*(\{[\s\S]*\}))?$/)
        || seg.arg.match(/^"([^"]+)"\s*(?:,\s*(\{[\s\S]*\}))?$/);
      if (!m) throw new Error(`cannot parse getByRole args: ${seg.arg}`);
      return base.getByRole(m[1], parseRoleOpts(m[2]));
    }
    case 'getByText': return base.getByText(toText(seg.arg));
    case 'getByLabel': return base.getByLabel(toText(seg.arg));
    case 'getByPlaceholder': return base.getByPlaceholder(toText(seg.arg));
    case 'getByTestId': return base.getByTestId(stripQuotes(seg.arg));
    case 'first': return base.first();
    case 'last': return base.last();
    case 'nth': return base.nth(Number(seg.arg));
    default: throw new Error(`unsupported segment ${seg.name}`);
  }
}
function resolveHealed(page, selector) {
  const segs = parseChain(selector);
  const last = segs[segs.length - 1];
  const isQualifier = last.name === 'first' || last.name === 'last' || last.name === 'nth';
  let base = page;
  const baseSegs = isQualifier ? segs.slice(0, -1) : segs;
  for (const seg of baseSegs) base = evalSeg(base, seg);
  let action = base;
  if (isQualifier) action = evalSeg(base, last);
  return { base, action };
}

async function healedAttempt(page, sc, healedSelector) {
  const { base, action } = resolveHealed(page, healedSelector);
  const baseCount = await base.count();
  const actionCount = await action.count();
  let visible = false;
  try {
    visible = actionCount > 0 && await action.isVisible();
  } catch { visible = false; }
  return { baseCount, actionCount, visible };
}

async function functionalAttempt(page, sc, healedSelector) {
  if (sc.resolveOnly) return; // assertion scenario: no action to perform
  const { action } = resolveHealed(page, healedSelector);
  switch (sc.action) {
    case 'click':
    case 'click-first':
      await action.click({ timeout: 10000 });
      return;
    case 'fill':
      await action.fill(sc.actionArg, { timeout: 10000 });
      return;
    case 'wait':
      await action.waitFor({ state: 'visible', timeout: 10000 });
      return;
    default:
      throw new Error(`unknown action ${sc.action}`);
  }
}

async function runScenario(browser, sc, provider, rep, usage, agents) {
  const row = { scenario: sc.id, app: sc.app, failureType: sc.failureType, provider, rep: Number(rep) };
  const callsBefore = usage.calls;
  const t0 = Date.now();
  try {
    await withBackstop((async () => {
      const page = await browser.newPage();
      try {
        // --- 1. baseline (no healer) ---
        await page.goto(sc.url, { waitUntil: 'domcontentloaded' });
        try {
          await baselineAttempt(page, sc);
          row.baseline = 'pass-unexpected';
        } catch (err) {
          row.baseline = 'fail';
          row.baselineError = String(err.message).split('\n')[0].slice(0, 200);
        }

        // --- 2. planner (rule-based: no LLM call; identical for all providers) ---
        const planner = new agents.PlannerAgent();
        const steps = await planner.generateSteps({
          name: `bench:${sc.id}`, description: `${sc.intent} on ${sc.app}`,
          priority: 'high', estimatedDuration: 0, dependencies: [],
        });
        row.plannerSteps = steps.length;
        row.plannerOk = steps.length > 0;

        // --- 3. healer (the real per-provider comparison) ---
        await page.goto(sc.url, { waitUntil: 'domcontentloaded' });
        const failure = {
          testContext: {
            testId: `${sc.id}-r${rep}`, testName: 'heal-bench', intent: sc.intent,
            stepIndex: 0, startTime: new Date(), environment: 'dev',
          },
          stepIndex: 0, type: 'locator_break', oldSelector: sc.brokenSelector,
          errorMessage: row.baselineError || `Selector "${sc.brokenSelector}" failed`,
          currentUrl: page.url(), timestamp: new Date(),
          accessibilityTree: await agents.captureA11ySnapshot(page),
        };
        const healer = new agents.HealerAgent();
        const healT0 = Date.now();
        const result = await healer.handleFailure(failure, { provider });
        row.healMs = Date.now() - healT0;
        row.aiCalls = usage.calls - callsBefore;
        row.healSuccess = result.success;
        row.healedSelector = result.newSelector || null;
        row.confidence = result.confidence;

        // Can the repo's OWN resolver run this healed selector? (product gap check)
        if (result.newSelector) {
          try {
            healer.resolveLocator(page, result.newSelector);
            row.productResolvable = true;
          } catch { row.productResolvable = false; }
        } else {
          row.productResolvable = null;
        }

        // --- 4. strict verification on the live page ---
        if (result.success && result.newSelector) {
          const { baseCount, actionCount, visible } = await healedAttempt(page, sc, result.newSelector);
          row.resolvedBaseCount = baseCount;
          row.resolvedActionCount = actionCount;
          row.resolvedVisible = visible;
          let functional = true;
          if (!sc.resolveOnly) {
            await page.goto(sc.url, { waitUntil: 'domcontentloaded' }); // fresh state
            await functionalAttempt(page, sc, result.newSelector);
            functional = await sc.verify(page);
          } else {
            functional = actionCount === 1 && visible;
          }
          row.functional = functional;
          row.strict = actionCount === 1 && visible && functional;
        } else {
          row.strict = false;
          row.functional = false;
        }

        // --- 5. executor runs the healed step on a FRESH page ---
        // Realistic config: executor WITH healer attached (product default).
        // execAiCalls tracks any fallback re-heal so provider purity is auditable.
        if (result.success && result.newSelector && row.resolvedVisible) {
          await page.goto(sc.url, { waitUntil: 'domcontentloaded' });
          const execHealer = new agents.HealerAgent();
          // Count fallback re-heals separately: they run on THIS row's
          // provider (via healProvider), so purity stays auditable.
          let execHealCalls = 0;
          const origExecHeal = execHealer.handleFailure.bind(execHealer);
          execHealer.handleFailure = async (failure, options) => {
            execHealCalls++;
            return origExecHeal(failure, options);
          };
          const executor = new agents.ExecutorAgent(execHealer);
          const execAction = sc.action === 'fill' ? 'fill'
            : (sc.action === 'wait' || sc.action === 'assert-text') ? 'assert' : 'click';
          const execCallsBefore = usage.calls;
          const execResult = await executor.execute(
            { index: 0, intent: sc.intent, action: execAction, selector: result.newSelector, value: sc.actionArg, timeout: 10000 },
            { page, browser: null, testContext: failure.testContext, session: {}, healProvider: provider }
          );
          row.execAiCalls = usage.calls - execCallsBefore;
          row.execHealCalls = execHealCalls;
          row.execError = execResult.error ? String(execResult.error.message || execResult.error).split('\n')[0].slice(0, 200) : null;
          row.executorOk = execResult.success && (sc.resolveOnly ? true : await sc.verify(page));
        } else {
          row.executorOk = false;
          row.executorSkipped = true;
        }

        // --- 6. retry recovery (timing scenario only): the demo's "smart retry"
        // path — wait long on the ORIGINAL selector, no healer involved.
        if (sc.retryCheck) {
          await page.goto(sc.url, { waitUntil: 'domcontentloaded' });
          try {
            await page.locator(sc.brokenSelector).first().waitFor({ state: 'visible', timeout: 10000 });
            row.retryRecovered = true;
          } catch { row.retryRecovered = false; }
        }
      } finally {
        await page.close().catch(() => {});
      }
    })(), 240000, `scenario ${sc.id}`);
  } catch (err) {
    row.error = String(err && err.message || err).slice(0, 200);
    row.strict = false;
  }
  row.wallMs = Date.now() - t0;
  if (row.aiCalls === undefined) row.aiCalls = usage.calls - callsBefore;
  console.log(`[${provider}/r${rep}] ${sc.id}: baseline=${row.baseline} heal=${row.healSuccess} ` +
    `strict=${row.strict} exec=${row.executorOk} conf=${row.confidence} ai=${row.aiCalls} ${row.healMs}ms`);
  return row;
}

// ---------------------------------------------------------------- entry ----
(async () => {
  const a = args();
  if (process.argv.includes('--child')) {
    await childMain();
  } else {
    if (!['all', ...PROVIDERS].includes(a.provider)) {
      console.error('usage: node run.cjs --provider all|deepseek|kimi|qwen [--repeat 2] [--scenario id]');
      process.exit(1);
    }
    await parentMain(a);
  }
})().catch((e) => { console.error('[heal-bench] FATAL', e); process.exit(1); });
