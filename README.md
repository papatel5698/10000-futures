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
src/state/plan.ts           plan model + localStorage persistence (one saved plan per firm)
src/config/firm.ts          firm config validation, firm selection, theme colors
src/components/             onboarding flow, results dashboard, fan chart
clients/<firm>.json         one config per firm (plus an optional <firm>.svg/.png logo)
scripts/firms-plugin.ts     Vite plugin: validates clients/ and bundles it as virtual:firms
docs/brief.md               engagement brief: client, problem, success metrics
docs/decisions/             decision records
```

## Per-firm config

Each advisory firm gets its own name, logo, colors and planning assumptions from `clients/<firm>.json`. The repo ships three:

| Config | Firm | Assumptions |
| --- | --- | --- |
| `default` | 10,000 Futures (unbranded) | 90/10 mix, 6.5% stocks, 4% withdrawal rate, 10% tax |
| `sample-company` | Sample Company Planning (fictional) | 80/20 mix, 6% stocks, 3.5% withdrawal rate, 15% tax |
| `example-wealth` | Example Wealth Partners (fictional) | 60/40 mix, 5% stocks, 3.25% withdrawal rate, 20% tax |

**Choosing a firm.**

- On the demo site, add `?firm=<id>`, e.g. [`?firm=sample-company`](https://papatel5698.github.io/10000-futures/?firm=sample-company) or [`?firm=example-wealth`](https://papatel5698.github.io/10000-futures/?firm=example-wealth). An unknown id falls back to `default`.
- For a firm's own deployment, build with `FIRM=<id> npm run build`. Only that firm's config goes into the bundle and `?firm=` is ignored, so a client's site never ships another client's name or branding. An unknown `FIRM` fails the build.

Each firm's saved plan is kept separately in the browser, so switching firms never mixes plans or assumptions. When a firm changes its config, returning clients keep their answers but start from the new assumptions. Why it works this way: [docs/decisions/001-firm-selection.md](docs/decisions/001-firm-selection.md).

**Config format.** Only `name` and `colors.accent` are required. Any assumption left out uses the default. Rates are fractions (6.5% is `0.065`).

```json
{
  "name": "Sample Company Planning",
  "logo": "sample-company.svg",
  "colors": { "accent": "#1d4e89", "accentDark": "#7fb0e8" },
  "assumptions": {
    "stockShare": 0.8, "stockReturn": 0.06, "stockVol": 0.17,
    "bondReturn": 0.02, "bondVol": 0.06, "correlation": 0.1,
    "withdrawalRate": 0.035, "taxRate": 0.15
  }
}
```

| Field | Notes |
| --- | --- |
| `name` | Shown in the top bar and the page title. |
| `logo` | Optional. A `.svg` or `.png` file name in `clients/`. It's inlined into the build. Without one, the default mark is shown. |
| `colors.accent` / `accentDark` | Hex accent for light and dark mode (`accentDark` defaults to `accent`). Text on the accent is picked automatically for contrast. |
| `assumptions.*` | Starting values for the market sliders, withdrawal rate and tax on withdrawals. Each must fit its slider's range (`ASSUMPTION_RANGES` in `src/config/firm.ts`, e.g. stock return 3–9%, withdrawal rate 2.5–5%), so `6.5` instead of `0.065` fails the build. |

The config is checked when the app builds (and in `scripts/firms-plugin.test.ts`, which also validates every shipped config). A typo fails the build with the file and field named, instead of breaking the page. Advisors can still move the sliders during a meeting; the config sets where they start. A build with `FIRM` set also puts the firm's name in the static page title and description, for link previews.

The dev server reads `clients/` when it starts, so restart `npm run dev` after editing a config or logo.

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
