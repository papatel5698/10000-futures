# 10,000 Futures

## User and problem

Most retirement calculators project one average line ("you'll have $2.1M at 65"), make every what-if a chore, and want an account and your data on their servers. 10,000 Futures is for one person who wants a realistic look at their own future: it plays out 10,000 simulated markets and shows a range of outcomes, all in the browser. Coming next: an AI assistant that answers what-ifs by running the simulation, CSV import from brokerage exports, and a plan-link API for your own tools.

The product brief, with the problem, success metrics, constraints and what's out of scope, is in [docs/brief.md](docs/brief.md).

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

Draws use a seeded PRNG (mulberry32 + Box–Muller) laid out on a fixed 60-year stride per run, so the same 10,000 futures are reused while any slider moves, including a retirement age that lengthens the chart. Not modeled: Social Security, fees, taxes before retirement, glide-path allocation changes, early-withdrawal rules.

The app's **methodology page** ([`#/methodology`](https://papatel5698.github.io/10000-futures/#/methodology), linked from the top bar and the results) explains all of this in plain language. Its numbers (the blended return and volatility, what a typical, bad and good year look like, the FI target) are computed from the visitor's current plan, or the defaults, by the same code that draws the chart.

## Importing balances

On the "What do you have invested today?" step, **Import balances from a CSV** fills in the balance fields. The file is read in the browser and never uploaded. Account types found in the file replace those fields; fields for types not in the file keep what you typed. The app lists each imported account, which field it went to, and any rows it couldn't read (with line numbers).

Two formats are recognized from the header row:

| Format | Header must include | Rows |
| --- | --- | --- |
| Template ([download](public/samples/balances-template.csv)) | `account_type`, `balance` (optional `name`) | One per account. `account_type` is `workplace`, `ira`, `brokerage` or `other`; aliases like `401k`, `403b`, `roth`, `taxable` and `hsa` work. |
| Brokerage positions export | `Account Name`, `Current Value` | One per holding. Holdings are added up per account, and the account name decides the type: 401(k)/403(b)/457/TSP → workplace, IRA/Roth → IRA, Individual/Joint/Brokerage/Taxable/Trust → brokerage, anything else → other. Blank values and `--` are skipped, and one-cell disclaimer lines at the bottom are ignored. |

Amounts may include `$`, commas, a minus sign or parentheses. Files over 1 MB are refused. The positions format follows the common layout of brokerage "positions" downloads; the fixture in `src/import/fixtures/` is synthetic, so a real export with different column names needs a new mapping ([decision 003](docs/decisions/003-csv-import-formats.md)).

## Project layout

```
src/sim/montecarlo.ts       pure simulation engine (no React)
src/sim/montecarlo.test.ts  Vitest unit tests
src/state/plan.ts           plan model + localStorage persistence
src/state/plan.test.ts      plan persistence tests
src/format.ts               money, percent and input-parsing helpers
src/format.test.ts          formatting tests
src/components/             onboarding flow, results dashboard, fan chart, methodology page
src/components/*.test.tsx   component tests (React Testing Library in jsdom)
src/methodology.ts          methodology numbers (return range for a mix) and hash routing
src/import/                 balances CSV import: CSV parser, formats, fixtures
public/samples/             downloadable balances template
src/App.test.tsx            routing between the planner and #/methodology
docs/brief.md               product brief: user, problem, success metrics
docs/decisions/             decision records
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

Every pull request and push to `main` runs `.github/workflows/ci.yml`: lint, tests with coverage, and a production build. Coverage floors live in `vite.config.ts`: the simulation engine (`src/sim/`), plan state (`src/state/`) and formatting (`src/format.ts`) must stay at 95%+, and the whole app may not drop below today's level. Floors only go up.

Component tests run in jsdom with React Testing Library: add `// @vitest-environment jsdom` at the top of a `*.test.tsx` file. Unit tests for plain modules stay in the default Node environment.

Work is test-first: write a failing test, then the code that makes it pass. `.github/workflows/tests-required.yml` enforces the visible part: a PR that changes TypeScript under `src/` must also change a `*.test.ts(x)` file. For a change that truly needs no test, add the `no-tests-needed` label and explain why in the PR.

`main` is protected: changes land only through a pull request with green CI. Every PR also gets a Claude Code review (`.github/workflows/claude-code-review.yml`).

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions** once.

---

Educational tool, not financial advice.
