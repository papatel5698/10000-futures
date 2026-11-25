# Engagement brief

> **The client is made up.** It's a realistic composite used to frame this portfolio project as a client engagement. No real firm, advisor or client data is involved.

## The client

**Northbeam Planning** (fictional) is a fee-only financial-planning firm with six advisors and about 400 client households. Most clients are mid-career professionals planning for retirement in the next 10–30 years.

Today an advisor runs a retirement meeting from a shared Excel workbook. Before the meeting, a paraplanner copies the client's balances from the custodian portal and the CRM into the sheet. During the meeting, the advisor changes a cell ("what if you retire at 60?"), waits for the sheet to recalculate and talks the client through a single projected line.

## The problem

| Pain | What it costs the firm |
| --- | --- |
| **One line, not a range.** The workbook projects a single average return. Clients hear "you'll have $2.1M at 65" and take it as a promise. | Advisors spend meeting time walking back false precision, and compliance worries about it. |
| **What-ifs are slow.** Each scenario means editing cells while the client watches, and the sheet sometimes breaks. | Meetings cover two or three scenarios instead of the ones the client actually asks about. |
| **Assumptions drift.** Each advisor has their own copy with slightly different return, inflation and withdrawal assumptions. | Two advisors can give the same client different answers. |
| **Retyped data.** Balances are copied by hand from the custodian and CRM before every meeting. | About 20–30 minutes of prep per meeting, plus typos. |
| **Nothing to take home.** Clients leave with a screenshot or a PDF of the spreadsheet. | Follow-up questions come in by email and restart the cycle. |

## Users

- **Advisors** run the tool during meetings, usually on a laptop shared to a screen. They need speed, firm-approved assumptions they can't accidentally change, and a way to explain the model.
- **Clients** watch, ask questions and sometimes drive. They aren't finance experts. They need plain language, a range of outcomes rather than one number, and something to take home.
- **Operations / compliance** (one person at a firm this size) sets the firm's assumptions and branding, and needs to know where client data goes.

## What we're delivering

A white-labeled planning tool, deployed per firm, in four milestones:

1. **White-label per client (M1).** Firm name, logo, colors and planning assumptions come from one config file per firm. A methodology page advisors can show clients.
2. **AI what-if assistant (M2).** Clients and advisors ask questions in plain English. The assistant answers by running the simulation, cites the run and inputs behind every number, and gives no investment advice.
3. **Data in, report out (M3).** CSV import from custodian exports, an intake API the CRM can call to create a pre-filled plan link, and a shareable plan report.
4. **Polish and handoff (M4).** Accessibility and mobile pass, a guide for deploying to a new firm, and a demo framed as an advisor meeting.

## Success metrics

To be measured in a planned pilot with two advisors over a month of meetings. The "today" figures are fictional baselines for a firm this size, not measured data. Targets are what the firm would need to see to roll it out.

| Metric | Today (fictional baseline) | Target |
| --- | --- | --- |
| Meeting prep time per client | 20–30 min | Under 5 min (imported or CRM-linked, not retyped) |
| What-if scenarios covered per meeting | 2–3 | 5+ |
| Time to answer a what-if in the meeting | 1–3 min of cell edits | Under 15 seconds |
| Advisors using different assumptions | Every advisor's own copy | Zero: one firm config |
| Assistant numbers that match a real simulation run | n/a | 100% on the eval suite |
| Client personal financial data stored on a server | Spreadsheets on a shared drive | None |
| Running cost | n/a | Within a $50/month cap, with a graceful pause if it's hit |

## Constraints

- **Privacy.** No personal financial data is stored on a server or written to logs. Plans live in the browser, in a shareable URL or in an exported file. The intake API processes what the CRM sends in memory only, never logs it, and returns a signed, short-lived link without storing anything.
- **Not advice.** The tool is educational. It shows a disclaimer, explains its model, and the assistant never recommends specific investments or products.
- **Cost.** A $50/month hard cap on AI spend, with per-visitor daily limits. When the cap is hit, the assistant says it's paused rather than erroring.
- **Small-firm IT.** No servers to run. Static hosting plus one small serverless function, and onboarding a new firm means adding a config file and a deployment, not changing code.
- **Trust.** Every number the assistant gives comes from the simulation engine, never from the model guessing.

## Out of scope

- Tax planning, Social Security optimization, estate planning and insurance.
- Account aggregation or live custodian connections (we import exports and accept CRM pushes instead).
- Storing client records or acting as a CRM.
- Investment recommendations, product selection or rebalancing.
- Advisor logins, user accounts and multi-tenant admin. Each firm gets its own deployment and config.
- Regulatory filings or a compliance review of the firm's use of the tool. The firm owns that.

## Open questions for the client

- Which custodian's export format matters most for the CSV import? (We'll ship a generic format plus one brokerage format.)
- Which CRM would call the intake API, and can it make an authenticated HTTP request from a workflow?
- Does compliance need to approve the methodology page wording before advisors use it with clients?
