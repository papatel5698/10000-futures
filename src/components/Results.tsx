import { useMemo, useState } from 'react'
import {
  contributionFromCashFlow,
  fiTarget,
  firstAgeReaching,
  generateReturns,
  simulate,
  type MarketAssumptions,
} from '../sim/montecarlo'
import { type Plan, totalBalance } from '../state/plan'
import { compact, money, pct } from '../format'
import { FanChart } from './FanChart'

const RUNS = 10_000

interface Props {
  plan: Plan
  setPlan: (p: Plan) => void
  onEdit: () => void
  onReset: () => void
}

interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  show: (v: number) => string
  onChange: (v: number) => void
}

function Slider({ id, label, value, min, max, step, show, onChange }: SliderProps) {
  return (
    <div className="slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{show(value)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  )
}

export function Results({ plan, setPlan, onEdit, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const age = plan.age!
  const retireAge = plan.retireAge!
  const spend = plan.monthlySpending!
  const takeHome = plan.takeHome!
  const workplace = plan.workplaceContribution!
  const start = totalBalance(plan)
  const horizon = Math.min(60, Math.max(retireAge, 65) + 5 - age)
  const retireYears = retireAge - age

  const set = (patch: Partial<Plan>) => setPlan({ ...plan, ...patch })
  const setMarket = (patch: Partial<MarketAssumptions>) => set({ market: { ...plan.market, ...patch } })

  const returns = useMemo(() => generateReturns(plan.market, RUNS, horizon), [plan.market, horizon])

  const scenarios = useMemo(() => {
    const cuts = [0, 500, 1000, 1500, 2500].filter((c) => spend - c >= 1000)
    return cuts.map((cut) => {
      const monthly = spend - cut
      const contribution = contributionFromCashFlow(workplace, takeHome, monthly * 12)
      const target = fiTarget(monthly * 12, plan.withdrawalRate, plan.taxRate)
      const paths = simulate(returns, start, contribution)
      return {
        cut,
        monthly,
        contribution,
        target,
        paths,
        fi: {
          50: firstAgeReaching(paths[50], target, age),
          25: firstAgeReaching(paths[25], target, age),
          10: firstAgeReaching(paths[10], target, age),
        },
      }
    })
  }, [returns, spend, workplace, takeHome, start, age, plan.withdrawalRate, plan.taxRate])

  const base = scenarios[0]
  const atRetire = (p: 10 | 25 | 50) => base.paths[p][retireYears]
  const ageText = (a: number | null) => (a == null ? `after ${age + horizon}` : String(a))
  const onTrack = base.fi[50] != null && base.fi[50] <= retireAge

  return (
    <main className="results">
      <header className="results-head">
        <div>
          <p className="eyebrow">10,000 futures · today's dollars</p>
          <h1 className="verdict">
            {base.fi[50] != null ? (
              <>
                In a typical market you'd reach financial independence at <em>{base.fi[50]}</em>.
              </>
            ) : (
              <>In a typical market you wouldn't reach financial independence by {age + horizon}.</>
            )}
          </h1>
          <p className="lede">
            At {money(spend)} a month you need about {compact(base.target)} invested. In a below-average market that
            happens at {ageText(base.fi[25])}, and in a rough one (the worst 1 in 10) at {ageText(base.fi[10])}.{' '}
            {onTrack ? `Your target of ${retireAge} works in a typical market.` : `Your target of ${retireAge} would need lower spending or more saving.`}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={onEdit}>Edit answers</button>
          {confirmReset ? (
            <span className="confirm">
              Erase your answers from this browser?
              <button className="btn danger" onClick={onReset}>Erase</button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>Keep</button>
            </span>
          ) : (
            <button className="btn ghost" onClick={() => setConfirmReset(true)}>Start over</button>
          )}
        </div>
      </header>

      <section className="cards" aria-label={`Portfolio at age ${retireAge}`}>
        {([
          [50, 'Average market', '50th percentile'],
          [25, 'Below average', '25th percentile'],
          [10, 'Very below average', '10th percentile'],
        ] as const).map(([p, name, sub]) => (
          <div className={`card p${p}`} key={p}>
            <span className="card-name">{name} <span className="muted">· {sub}</span></span>
            <span className="card-value">{compact(atRetire(p))}</span>
            <span className="card-note">at age {retireAge} · {money(atRetire(p) * plan.withdrawalRate)}/yr at {pct(plan.withdrawalRate, 2)}</span>
          </div>
        ))}
      </section>

      <section className="workspace">
        <div className="panel chart-panel">
          <div className="panel-head">
            <h2>Your portfolio by age</h2>
            <div className="legend">
              <span><i style={{ background: 'var(--p50)' }} />Average</span>
              <span><i style={{ background: 'var(--p25)' }} />Below average</span>
              <span><i style={{ background: 'var(--p10)' }} />Very below average</span>
              <span><i style={{ background: 'var(--band)' }} />8 in 10 futures</span>
            </div>
          </div>
          <FanChart paths={base.paths} startAge={age} retireAge={retireAge} target={base.target} />
          <p className="fine">Contributions continue past your retirement age on this chart so you can see when each line crosses the target.</p>
        </div>

        <aside className="panel controls">
          <h2>Try changes</h2>
          <Slider id="spend" label="Monthly spending" value={spend} min={1000} max={Math.max(15000, spend)} step={100} show={money} onChange={(v) => set({ monthlySpending: v })} />
          <Slider id="retire" label="Retirement age" value={retireAge} min={age + 1} max={80} step={1} show={String} onChange={(v) => set({ retireAge: v })} />
          <Slider id="swr" label="Withdrawal rate" value={plan.withdrawalRate} min={0.025} max={0.05} step={0.0025} show={(v) => pct(v, 2)} onChange={(v) => set({ withdrawalRate: v })} />
          <Slider id="tax" label="Tax on withdrawals" value={plan.taxRate} min={0} max={0.3} step={0.01} show={(v) => pct(v, 0)} onChange={(v) => set({ taxRate: v })} />
          <p className="callout">
            Investing <strong>{money(base.contribution)}</strong>/yr: {money(workplace)} workplace plan
            {base.contribution > workplace ? ` + ${money(base.contribution - workplace)} left over from take-home pay` : ''}.
          </p>
          <details>
            <summary>Market assumptions</summary>
            <div className="stack">
              <Slider id="stk" label="Stocks share" value={plan.market.stockShare} min={0.3} max={1} step={0.05} show={(v) => pct(v, 0)} onChange={(v) => setMarket({ stockShare: v })} />
              <Slider id="sr" label="Stock return after inflation" value={plan.market.stockReturn} min={0.03} max={0.09} step={0.0025} show={(v) => pct(v, 2)} onChange={(v) => setMarket({ stockReturn: v })} />
              <Slider id="sv" label="Stock volatility" value={plan.market.stockVol} min={0.1} max={0.25} step={0.005} show={(v) => pct(v)} onChange={(v) => setMarket({ stockVol: v })} />
              <Slider id="br" label="Bond return after inflation" value={plan.market.bondReturn} min={0} max={0.04} step={0.0025} show={(v) => pct(v, 2)} onChange={(v) => setMarket({ bondReturn: v })} />
              <Slider id="bv" label="Bond volatility" value={plan.market.bondVol} min={0.03} max={0.1} step={0.005} show={(v) => pct(v)} onChange={(v) => setMarket({ bondVol: v })} />
            </div>
          </details>
        </aside>
      </section>

      <section className="panel">
        <h2>What if you spent less?</h2>
        <p className="muted">Each $1 you don't spend does two jobs: it gets invested, and it shrinks the amount you need.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Monthly spending</th>
                <th>Invested / yr</th>
                <th>FI target</th>
                <th>Value at {retireAge} (avg)</th>
                <th>FI age · avg</th>
                <th>· below avg</th>
                <th>· very below</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.cut} className={s.cut === 0 ? 'current' : ''}>
                  <td>{money(s.monthly)}{s.cut === 0 ? <span className="pill">you today</span> : <span className="muted"> (−{money(s.cut)})</span>}</td>
                  <td>{money(s.contribution)}</td>
                  <td>{compact(s.target)}</td>
                  <td>{compact(s.paths[50][retireYears])}</td>
                  <td>{ageText(s.fi[50])}</td>
                  <td>{ageText(s.fi[25])}</td>
                  <td>{ageText(s.fi[10])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel assumptions">
        <h2>How this works</h2>
        <dl>
          <div><dt>10,000 market histories</dt><dd>Each year's return is drawn at random from a lognormal distribution, so some futures get booms, some get long slumps. The "average", "below average" and "very below average" lines are the 50th, 25th and 10th percentiles: 1 in 10 futures does worse than the lowest line.</dd></div>
          <div><dt>Today's dollars</dt><dd>Returns are after inflation and contributions rise with inflation, so every number keeps today's buying power.</dd></div>
          <div><dt>Market returns</dt><dd>Stocks average {pct(plan.market.stockReturn, 2)} a year after inflation with {pct(plan.market.stockVol)} swings, near the long-run US record. Bonds average {pct(plan.market.bondReturn, 2)} with {pct(plan.market.bondVol)} swings. Your mix is held at {pct(plan.market.stockShare, 0)} stocks the whole time.</dd></div>
          <div><dt>What you invest</dt><dd>Your workplace contributions plus whatever take-home pay is left after spending, added through the year. Spend more and you invest less, and you need more.</dd></div>
          <div><dt>Financial independence</dt><dd>Yearly spending ÷ (1 − {pct(plan.taxRate, 0)} tax) ÷ {pct(plan.withdrawalRate, 2)} withdrawal rate. The 4% rule was tested on 30-year retirements; for 40+ years many planners use 3.25–3.5%.</dd></div>
          <div><dt>Not included</dt><dd>Social Security, pensions, fees, taxes on investments before retirement, raises, job changes, and early-withdrawal rules for retirement accounts before age 59½.</dd></div>
        </dl>
        <p className="fine">An educational projection, not financial advice. Real markets have fatter tails and longer slumps than a simple random model, so treat the low lines as plausible, not worst case.</p>
      </section>
    </main>
  )
}
