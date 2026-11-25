# Product brief

## The user

One person who wants a realistic look at their own financial future: when they could stop working, and how their choices (spending, saving, investment mix, retirement age) change that. They aren't finance experts. They have a rough idea of their balances and pay, and their account data lives in brokerage exports and budgeting tools, not in their head.

## The problem

| Pain | What it costs the user |
| --- | --- |
| **One line, not a range.** Most retirement calculators project a single average return: "you'll have $2.1M at 65". | People read it as a promise and plan around a number that only happens in a typical market. |
| **What-ifs are slow.** Spreadsheets and calculators make you re-enter everything to try "retire at 60" or "spend $500 less a month". | People try two or three scenarios instead of the ones they actually wonder about. |
| **Retyped data.** Balances and contributions get copied by hand from brokerage sites and budgeting apps. | Setup takes long enough that many people never finish, and typos skew the result. |
| **Nothing to keep or share.** Results disappear when the tab closes, or need an account to save. | Hard to revisit a plan or show it to a partner. |
| **Privacy.** Many planners want an account and store your finances on their servers. | People who care about privacy don't use them. |

## What we're delivering

A retirement planner that runs in the browser, in four milestones:

1. **Single-user foundation (M1).** One set of sensible default assumptions, a fan chart of 10,000 simulated futures, and a methodology page that explains the model and what it leaves out.
2. **AI what-if assistant (M2).** The user asks questions in plain English. The assistant answers by running the simulation, cites the run and inputs behind every number, and gives no investment advice.
3. **Data in, report out (M3).** CSV import from brokerage exports, a documented plan-link API that the user's own tools (a budgeting app, a spreadsheet script) can call to get a pre-filled plan link, and a shareable plan export.
4. **Polish and handoff (M4).** Accessibility and mobile pass, architecture and privacy docs, a self-host guide, and a short demo.

## Success metrics

| Metric | Target |
| --- | --- |
| Time from landing to a first result | Under 3 minutes typing, or under 1 minute with a CSV import |
| Time to answer a what-if | Under 15 seconds, with the assistant or the sliders |
| Assistant numbers that match a real simulation run | 100% on the eval suite |
| Personal financial data stored on a server | None |
| Running cost | Within a $50/month cap, with a graceful pause if it's hit |

## Constraints

- **Privacy.** No personal financial data is stored on a server or written to logs. Plans live in the browser, in a shareable URL or in an exported file. The plan-link API processes what it's sent in memory only, never logs it, and returns a signed, short-lived link without storing anything.
- **Not advice.** The tool is educational. It shows a disclaimer, explains its model, and the assistant never recommends specific investments or products.
- **Cost.** A $50/month hard cap on AI spend, with per-visitor daily limits. When the cap is hit, the assistant says it's paused rather than erroring.
- **No accounts.** Nothing to sign up for. Static hosting plus one small serverless function for the assistant and the plan-link API.
- **Trust.** Every number the assistant gives comes from the simulation engine, never from the model guessing.

## Out of scope

- Tax planning, Social Security optimization, estate planning and insurance.
- Live account aggregation (logging in to brokerages). We import exports instead.
- User accounts or storing plans on a server.
- Investment recommendations, product selection or rebalancing.
- White-labeling or multi-firm deployments. See [decision 002](decisions/002-single-user-product.md).
