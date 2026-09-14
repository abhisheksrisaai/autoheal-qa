'use strict';

/**
 * Aggregates evals/heal-bench/results/results-*.json into the provider
 * comparison table. Run directly (`node report.cjs`) after a bench run.
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');
const PRICES = {
  deepseek: { in: 1.32, out: 3.96 },
  kimi: { in: 3.00, out: 15.00 },
  qwen: { in: 2.50, out: 7.50 },
};

function load() {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  return fs.readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith('results-') && f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8')));
}

function main() {
  const runs = load();
  if (runs.length === 0) {
    console.log('[heal-bench] no results found in', RESULTS_DIR);
    return;
  }
  const providers = [...new Set(runs.map((r) => r.provider))].sort();
  const scenarioIds = [...new Set(runs.flatMap((r) => r.rows.map((x) => x.scenario)))];

  // baseline: every scenario must FAIL without the healer
  const baselineFails = runs.flatMap((r) => r.rows).filter((x) => x.baseline === 'fail').length;
  const baselineTotal = runs.flatMap((r) => r.rows).length;

  const lines = [];
  lines.push('# heal-bench results');
  lines.push('');
  lines.push(`Baseline without healer: **${baselineFails}/${baselineTotal} scenario-runs fail** (broken selectors do not resolve on their own).`);
  lines.push('');
  lines.push('| Provider | Healer strict (functional) | Executor | Planner (rule-based) | Avg confidence | Avg heal time | Flaky scenarios | AI calls | Est. cost |');
  lines.push('|---|---|---|---|---|---|---|---|---|');

  const summary = {};
  for (const p of providers) {
    const pruns = runs.filter((r) => r.provider === p);
    const rows = pruns.flatMap((r) => r.rows);
    const n = rows.length;
    const strict = rows.filter((x) => x.strict).length;
    const exec = rows.filter((x) => x.executorOk).length;
    const plan = rows.filter((x) => x.plannerOk).length;
    const confs = rows.map((x) => x.confidence || 0);
    const avgConf = confs.reduce((a, b) => a + b, 0) / Math.max(1, n);
    const times = rows.map((x) => x.healMs || 0);
    const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, n));
    // flaky = scenario whose repeats disagree on the strict outcome
    let flaky = 0;
    for (const id of scenarioIds) {
      const outcomes = new Set(rows.filter((x) => x.scenario === id).map((x) => !!x.strict));
      if (outcomes.size > 1) flaky++;
    }
    const calls = pruns.reduce((a, r) => a + (r.usage.calls || 0), 0);
    const inTok = pruns.reduce((a, r) => a + (r.usage.promptChars || 0), 0) / 4;
    const outTok = pruns.reduce((a, r) => a + (r.usage.respChars || 0), 0) / 4;
    const cost = (inTok / 1e6) * PRICES[p].in + (outTok / 1e6) * PRICES[p].out;
    summary[p] = { strict, n, exec, plan, avgConf, avgMs, flaky, calls, cost };
    lines.push(`| ${p} | ${strict}/${n} | ${exec}/${n} | ${plan}/${n} | ${avgConf.toFixed(2)} | ${(avgMs / 1000).toFixed(1)}s | ${flaky} | ${calls} | $${cost.toFixed(4)}* |`);
  }
  lines.push('');
  lines.push('*Est. cost: measured prompt+response chars / 4 as tokens x OpenCode Go peak list prices. Approx, not a bill.');
  lines.push('');
  lines.push('## Per-scenario strict outcomes (healed selector drives the RIGHT element)');
  lines.push('');
  lines.push(`| Scenario | App | Type | ${providers.join(' | ')} |`);
  lines.push(`|---|---|---|${providers.map(() => '---').join('|')}|`);
  for (const id of scenarioIds) {
    const first = runs.flatMap((r) => r.rows).find((x) => x.scenario === id);
    const cells = providers.map((p) => {
      const rs = runs.filter((r) => r.provider === p).flatMap((r) => r.rows).filter((x) => x.scenario === id);
      return rs.map((x) => (x.strict ? 'pass' : 'FAIL')).join(', ');
    });
    lines.push(`| ${id} | ${first.app} | ${first.failureType} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Strict misses (healed but wrong element, or no heal)');
  lines.push('');
  let anyMiss = false;
  for (const r of runs) {
    for (const x of r.rows) {
      if (!x.strict) {
        anyMiss = true;
        lines.push(`- ${r.provider}/r${r.rep} ${x.scenario}: heal=${x.healSuccess} conf=${x.confidence} ` +
          `selector=${x.healedSelector || '(none)'} resolved=${x.resolvedCount}x visible=${x.resolvedVisible} ` +
          `functional=${x.functional} err=${x.error || '—'}`);
      }
    }
  }
  if (!anyMiss) lines.push('(none — every run strictly passed)');
  lines.push('');

  const md = lines.join('\n');
  fs.writeFileSync(path.join(__dirname, 'RESULTS.md'), md);
  console.log(md);
}

module.exports = { main };
if (require.main === module) main();
