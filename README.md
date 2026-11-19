# 10,000 Futures

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
```

## Develop

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # production build in dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions** once.

---

Educational tool, not financial advice.
