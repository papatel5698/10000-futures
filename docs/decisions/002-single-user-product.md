# 002: A single-user product, not a white-label tool for firms

**Status:** accepted (Nov 25, 2026, issue #20). Supersedes [001](001-firm-selection.md).

## Context

The portfolio plan reframed 10,000 Futures as a white-label planner for advisory firms, to make it read like a client engagement. M1 started down that path: a fictional advisory-firm brief (#1) and per-firm config with two sample firms (#2). In practice the sample firms added a lot of machinery (a build plugin, firm selection, per-firm saved plans) for a client that doesn't exist, and pulled the product away from what it is: a tool for one person to look at their own future.

## Options

1. **Keep the white-label framing.** Strongest "client engagement" story, but every feature carries firm config nobody uses, and the demo is about made-up firms.
2. **Single-user product, drop the integration work too.** Simplest, but loses the parts that show FDE skills (APIs, data import, grounded AI).
3. **Single-user product, keep the FDE extras.** One person, one set of default assumptions. Keep CSV import from brokerage exports, a documented plan-link API that the user's own tools can call, and the grounded AI assistant with evals.

## Choice

Option 3. The integration and AI work stands on its own without a fictional firm: importing a brokerage CSV, exposing an OpenAPI-documented endpoint, and having Claude answer by calling the simulation as a tool are the same skills either way. The per-firm config from #2 is removed in #20. The brief is rewritten for a single user.

Trade-off: there's no client-engagement story (discovery with a firm, per-client tailoring). The FDE case rests on integrations, privacy and grounded AI with an eval instead.
