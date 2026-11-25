import { compact, money, pct } from '../format'
import { yearlyReturnRange } from '../methodology'
import { DEFAULT_MARKET, fiTarget } from '../sim/montecarlo'
import { EMPTY_PLAN, chartHorizon, isComplete, type Plan } from '../state/plan'

interface Props {
  plan: Plan
}

/** How the planner works, with every number taken from the user's plan (or the defaults). */
export function Methodology({ plan }: Props) {
  const m = plan.market
  const r = yearlyReturnRange(m)
  const yours = isComplete(plan)
  const monthly = yours ? plan.monthlySpending! : 5_000
  const target = fiTarget(monthly * 12, plan.withdrawalRate, plan.taxRate)
  const exampleHorizon = yours ? chartHorizon(plan.age!, plan.retireAge!) : chartHorizon(35, 60)

  const rows: [string, string, string][] = [
    ['Stocks share', pct(m.stockShare, 0), pct(DEFAULT_MARKET.stockShare, 0)],
    ['Stock return after inflation (average)', pct(m.stockReturn, 2), pct(DEFAULT_MARKET.stockReturn, 2)],
    ['Stock volatility', pct(m.stockVol), pct(DEFAULT_MARKET.stockVol)],
    ['Bond return after inflation (average)', pct(m.bondReturn, 2), pct(DEFAULT_MARKET.bondReturn, 2)],
    ['Bond volatility', pct(m.bondVol), pct(DEFAULT_MARKET.bondVol)],
    ['Stock/bond correlation', m.correlation.toFixed(2), DEFAULT_MARKET.correlation.toFixed(2)],
    ['Withdrawal rate', pct(plan.withdrawalRate, 2), pct(EMPTY_PLAN.withdrawalRate, 2)],
    ['Tax on withdrawals', pct(plan.taxRate, 0), pct(EMPTY_PLAN.taxRate, 0)],
  ]

  return (
    <main className="method">
      <a className="back" href="#/">← Back to {yours ? 'your plan' : 'the planner'}</a>
      <header className="stack">
        <p className="eyebrow">Methodology</p>
        <h1 className="method-title">How 10,000 Futures works</h1>
        <p className="lede">
          The planner plays out 10,000 different market histories for your savings and shows the range of results, not
          a single average line. This page explains how, using {yours ? 'the numbers in your plan' : 'the default assumptions'}.
          Every number below comes from the same code that draws your chart.
        </p>
      </header>

      <section className="panel stack">
        <h2>1. A year in the market</h2>
        <p>
          Your mix is {pct(m.stockShare, 0)} stocks and {pct(1 - m.stockShare, 0)} bonds. Blended, that averages{' '}
          <strong>{pct(r.mean, 2)}</strong> a year after inflation, with swings (volatility) of{' '}
          <strong>{pct(r.vol)}</strong>.
        </p>
        <p>
          Each simulated year draws a return at random from a lognormal distribution with that average and swing. A
          lognormal can't lose more than 100% and has a long upside tail, which is roughly how yearly market returns
          behave. For your mix:
        </p>
        <ul className="figures">
          <li><span>A typical year</span><strong>{pct(r.p50)}</strong></li>
          <li><span>1 year in 10 is worse than</span><strong>{pct(r.p10)}</strong></li>
          <li><span>1 year in 10 is better than</span><strong>{pct(r.p90)}</strong></li>
        </ul>
        <p className="fine">
          The typical year is below the average because a few big up years pull the average up. Each year is drawn
          independently of the last.
        </p>
      </section>

      <section className="panel stack">
        <h2>2. 10,000 futures</h2>
        <p>
          {yours ? 'For your plan, the' : 'For a 35-year-old planning to retire at 60, the'} planner strings{' '}
          {exampleHorizon} of those years together, 10,000 times. Each string is one possible
          future for your money: some get booms early, some get long slumps. The same 10,000 futures are reused when you
          move a slider, so a change in the result comes from your change, not from new random draws.
        </p>
        <p>
          The chart runs to five years past 65 (or past your retirement age, if later), and never more than 60 years.
        </p>
      </section>

      <section className="panel stack">
        <h2>3. Today's dollars</h2>
        <p>
          Returns are after inflation, and your contributions rise with inflation. So every number keeps today's
          buying power: $1M on the chart buys what $1M buys today.
        </p>
      </section>

      <section className="panel stack">
        <h2>4. What you invest</h2>
        <p>
          Each year you invest your workplace contributions plus whatever take-home pay is left after spending.
          Money is added through the year, so on average it gets half a year of growth in the year it's invested.
        </p>
        <p>
          Spending matters twice: every dollar you don't spend gets invested, and it also lowers how much you need.
        </p>
      </section>

      <section className="panel stack">
        <h2>5. Reading the chart</h2>
        <p>
          For every year, the planner sorts the 10,000 futures from worst to best and picks three:
        </p>
        <ul>
          <li><strong>Average market:</strong> the middle one (50th percentile). Half of futures do better.</li>
          <li><strong>Below average:</strong> the 25th percentile. 1 in 4 futures does worse.</li>
          <li><strong>Very below average:</strong> the 10th percentile. 1 in 10 futures does worse.</li>
        </ul>
        <p>
          The shaded band covers the middle 8 in 10 futures (10th to 90th percentile). Each line is a percentile taken
          year by year, not one single history, so it's smoother than any real market path.
        </p>
      </section>

      <section className="panel stack">
        <h2>6. Financial independence</h2>
        <p>
          You're financially independent when your savings can pay for your spending. The target is your yearly
          spending, grossed up for tax on withdrawals, divided by a withdrawal rate:
        </p>
        <p className="formula">
          {money(monthly * 12)} ÷ (1 − {pct(plan.taxRate, 0)} tax) ÷ {pct(plan.withdrawalRate, 2)} ={' '}
          <strong>{compact(target)}</strong>
        </p>
        <p className="fine">
          {yours ? 'Using your spending of' : 'Example using'} {money(monthly)} a month. Your financial independence age
          on each line is the first year that line reaches the target.
        </p>
        <p>
          The withdrawal rate stands in for what happens after you stop working: the simulation doesn't play out
          retirement itself. The 4% rule was tested on 30-year retirements; for 40 or more years, many planners use
          3.25–3.5%. A lower rate means a bigger target and a later date.
        </p>
      </section>

      <section className="panel stack">
        <h2>7. The assumptions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assumption</th>
                <th>{yours ? 'Your plan' : 'Used here'}</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value, def]) => (
                <tr key={label} className={value !== def ? 'current' : ''}>
                  <td>{label}</td>
                  <td>{value}</td>
                  <td>{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">
          The default returns are close to long-run US history after inflation. They're assumptions, not forecasts. You
          can change them under "Market assumptions" on your results; highlighted rows differ from the default.
        </p>
      </section>

      <section className="panel stack">
        <h2>8. What it leaves out</h2>
        <ul>
          <li>Social Security, pensions and any other income.</li>
          <li>Investment fees and taxes on investments before retirement.</li>
          <li>Raises, job changes, time off work and changes to your spending over time.</li>
          <li>Early-withdrawal rules for retirement accounts before age 59½.</li>
          <li>Shifting to bonds as you age: your mix stays the same the whole time.</li>
          <li>Retirement itself: it doesn't simulate withdrawals or the order of good and bad years after you stop.</li>
          <li>
            Real markets' worst stretches: actual returns have fatter tails and longer slumps than independent random
            years, so treat the lowest line as plausible, not worst case.
          </li>
        </ul>
      </section>

      <p className="fine">
        An educational projection, not financial advice. Your answers stay in this browser; nothing is sent to a server.
      </p>
    </main>
  )
}
