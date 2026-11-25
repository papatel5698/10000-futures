# 10,000 Futures

## Client and problem

A white-label retirement planner for small financial-planning firms. The client (fictional, for this portfolio project) is a six-advisor firm whose advisors walk clients through retirement scenarios in a shared spreadsheet: one projected line instead of a range, slow what-ifs, assumptions that differ between advisors and balances retyped before every meeting. Today it shows a range of outcomes from 10,000 simulated markets. Coming next: a branded deployment per firm with firm-wide assumptions (M1), and an AI assistant that answers what-ifs by running the simulation.

The full engagement brief, with users, success metrics, constraints and what's out of scope, is in [docs/brief.md](docs/brief.md).

## What it does

A Monte Carlo retirement planner. It asks seven questions (age, target retirement age, savings, workplace contributions, take-home pay, spending and investment mix), then plays out 10,000 market histories and shows when you could reach financial independence in an average, below-average and very-below-average market.

Everything runs in the browser. Answers are saved only in the visitor's `localStorage`; nothing is sent to a server.

## How the model works

| Piece | What it does |
| --- | --- |
| Returns | Each year's portfolio return is drawn from a lognormal distribution whose arithmetic mean and volatility match a blended stock/bond portfolio (defaults: stocks 6.5% real, 17% vol; bonds 2% real, 6% vol; correlation 0.1). |
| Dollars | All values are real (inflation-adjusted). Contributions rise with inflation. |
| Contributions | Workplace contributions plus take-home pay left after spending, credited mid-year. Spending less raises contributions and lowers the target at the same time. |
| Percentiles | 50th / 25th / 10th of the 10,000 runs, labeled average / below average / very below average. |
| FI target | `yearly spending ÷ (1 − tax on withdrawals) ÷ withdrawal rate` |

Draws use a seeded PRNG (mulberry32 + Box–Muller), so results are stable while sliders move. Not modeled: Social Security, fees, taxes before retirement, glide-path allocation changes, early-withdrawal rules.

## Project layout

```
src/sim/montecarlo.ts       pure simulation engine (no React)
src/sim/montecarlo.test.ts  Vitest unit tests
src/state/plan.ts           plan model + localStorage persistence
src/components/             onboarding flow, results dashboard, fan chart
docs/brief.md               engagement brief: client, problem, success metrics
```

## Develop

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run coverage  # unit tests with coverage (report in coverage/)
npm run lint
npm run build   # production build in dist/
```

## CI and test-driven development

Every pull request and push to `main` runs `.github/workflows/ci.yml`: lint, tests with coverage, and a production build. Coverage floors live in `vite.config.ts`: the simulation engine (`src/sim/`) must stay at 95%+ and the whole app may not drop below today's level. Floors only go up.

Work is test-first: write a failing test, then the code that makes it pass. `.github/workflows/tests-required.yml` enforces the visible part: a PR that changes TypeScript under `src/` must also change a `*.test.ts(x)` file. For a change that truly needs no test, add the `no-tests-needed` label and explain why in the PR.

`main` is protected: changes land only through a pull request with green CI. Every PR also gets a Claude Code review (`.github/workflows/claude-code-review.yml`).

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions** once.

---

Educational tool, not financial advice.
