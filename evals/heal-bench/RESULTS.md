# heal-bench results

Baseline without healer: **48/48 scenario-runs fail** (broken selectors do not resolve on their own).

| Provider | Healer strict (functional) | Executor | Planner (rule-based) | Avg confidence | Avg heal time | Flaky scenarios | AI calls | Est. cost |
|---|---|---|---|---|---|---|---|---|
| deepseek | 12/16 | 12/16 | 16/16 | 0.73 | 47.3s | 0 | 26 | $0.0258* |
| kimi | 12/16 | 12/16 | 16/16 | 0.71 | 18.4s | 0 | 24 | $0.1243* |
| qwen | 14/16 | 14/16 | 16/16 | 0.83 | 23.4s | 0 | 20 | $0.0453* |

*Est. cost: measured prompt+response chars / 4 as tokens x OpenCode Go peak list prices. Approx, not a bill.

## Per-scenario strict outcomes (healed selector drives the RIGHT element)

| Scenario | App | Type | deepseek | kimi | qwen |
|---|---|---|---|---|---|
| login-break | shop-login | Locator Break | pass, pass | pass, pass | pass, pass |
| cart-break | shop-inventory | Locator Break | pass, pass | pass, pass | pass, pass |
| ambiguous | shop-inventory | Ambiguous | pass, pass | pass, pass | pass, pass |
| assertion | shop-login | Assertion | FAIL, FAIL | FAIL, FAIL | pass, pass |
| placeholder | shop-login | Placeholder | pass, pass | pass, pass | pass, pass |
| refactor | shop-login | UI Refactor | pass, pass | pass, pass | pass, pass |
| id-migration | shop-login | ID Migration | pass, pass | pass, pass | pass, pass |
| timing | shop-dashboard | Timing Issue | FAIL, FAIL | FAIL, FAIL | FAIL, FAIL |

## Strict misses (healed but wrong element, or no heal)

- deepseek/r0 assertion: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- deepseek/r0 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- deepseek/r1 assertion: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- deepseek/r1 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- kimi/r0 assertion: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- kimi/r0 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- kimi/r1 assertion: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- kimi/r1 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- qwen/r0 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
- qwen/r1 timing: heal=false conf=0 selector=(none) resolved=undefinedx visible=undefined functional=false err=—
