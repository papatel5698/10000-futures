import { useState, type ReactNode } from 'react'
import { type Plan, EXAMPLE_PLAN, totalBalance } from '../state/plan'
import { MoneyInput, NumberInput } from './MoneyInput'
import { BalancesImport } from './BalancesImport'
import { BALANCE_LABELS } from '../import/balances'
import { compact, money } from '../format'

interface Props {
  plan: Plan
  setPlan: (p: Plan) => void
  onFinish: () => void
  startAt?: number
}

interface Step {
  title: string
  why: string
  body: ReactNode
  valid: boolean
  error?: string
}

const MIXES = [
  { label: 'All stocks', share: 1, note: 'Index funds like an S&P 500 or total market fund' },
  { label: '90 / 10', share: 0.9, note: 'Typical target-date fund for someone 25+ years out' },
  { label: '80 / 20', share: 0.8, note: 'A bit steadier, a bit less growth' },
  { label: '60 / 40', share: 0.6, note: 'Classic balanced portfolio' },
]

export function Onboarding({ plan, setPlan, onFinish, startAt = 0 }: Props) {
  const [step, setStep] = useState(startAt)
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<Plan>) => setPlan({ ...plan, ...patch })
  const setBal = (k: keyof Plan['balances'], v: number | null) => set({ balances: { ...plan.balances, [k]: v } })
  const yearlySpend = (plan.monthlySpending ?? 0) * 12
  const leftover = (plan.takeHome ?? 0) - yearlySpend

  if (step === 0) {
    return (
      <main className="welcome">
        <p className="eyebrow">Retirement Monte Carlo</p>
        <h1 className="welcome-title">
          See <em>10,000</em> possible futures for your savings.
        </h1>
        <p className="lede">
          Markets don't return the same amount every year. This planner plays out 10,000 different market
          histories for your money and shows you the good, typical and rough ones, so you can see when you could
          reach financial independence and how much your spending changes that.
        </p>
        <ul className="promises">
          <li>
            <strong>Seven quick questions.</strong> Age, savings, pay and spending. Round numbers are fine.
          </li>
          <li>
            <strong>Everything in today's dollars.</strong> Inflation is already taken out, so $1M means $1M of
            today's buying power.
          </li>
          <li>
            <strong>Your numbers stay on this device.</strong> Nothing is sent anywhere; answers are saved only in
            this browser.
          </li>
        </ul>
        <div className="actions">
          <button className="btn primary" onClick={() => setStep(1)}>
            Start
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setPlan(EXAMPLE_PLAN)
              onFinish()
            }}
          >
            Try it with an example person
          </button>
        </div>
      </main>
    )
  }

  const steps: Step[] = [
    {
      title: 'How old are you?',
      why: 'Your age sets how many years your money has to grow.',
      body: <NumberInput id="age" label="Current age" min={16} max={80} value={plan.age} onChange={(v) => set({ age: v })} autoFocus />,
      valid: plan.age != null && plan.age >= 16 && plan.age <= 80,
      error: 'Enter an age between 16 and 80.',
    },
    {
      title: 'When would you like to retire?',
      why: "This is the age you'd like to stop needing a paycheck. You can change it later and watch the results move.",
      body: (
        <NumberInput
          id="retireAge"
          label="Target retirement age"
          min={(plan.age ?? 16) + 1}
          max={80}
          value={plan.retireAge}
          onChange={(v) => set({ retireAge: v })}
          autoFocus
        />
      ),
      valid: plan.retireAge != null && plan.age != null && plan.retireAge > plan.age && plan.retireAge <= 80,
      error: `Pick an age after ${plan.age ?? 'your current age'} and no later than 80.`,
    },
    {
      title: 'What do you have invested today?',
      why: 'Count retirement and investment accounts. Leave out checking, savings and emergency cash. Blank means $0.',
      body: (
        <div className="field-grid">
          <BalancesImport onImport={(b) => set({ balances: { ...plan.balances, ...b } })} />
          <MoneyInput id="b-work" label={BALANCE_LABELS.workplace} value={plan.balances.workplace} onChange={(v) => setBal('workplace', v)} autoFocus />
          <MoneyInput id="b-ira" label={BALANCE_LABELS.ira} value={plan.balances.ira} onChange={(v) => setBal('ira', v)} />
          <MoneyInput id="b-brk" label={BALANCE_LABELS.brokerage} value={plan.balances.brokerage} onChange={(v) => setBal('brokerage', v)} />
          <MoneyInput id="b-oth" label={BALANCE_LABELS.other} value={plan.balances.other} onChange={(v) => setBal('other', v)} />
          <p className="tally">Total invested: <strong>{money(totalBalance(plan))}</strong></p>
        </div>
      ),
      valid: true,
    },
    {
      title: 'How much goes into your workplace plan each year?',
      why: 'Include your own 401(k) or 403(b) contributions plus any employer match. Enter $0 if you have none.',
      body: (
        <MoneyInput
          id="wc"
          label="Yearly contributions, including match"
          hint="Example: $24,000 of your own plus a $6,000 match = $30,000"
          suffix="/ yr"
          value={plan.workplaceContribution}
          onChange={(v) => set({ workplaceContribution: v })}
          autoFocus
        />
      ),
      valid: plan.workplaceContribution != null,
      error: 'Enter a yearly amount, or $0.',
    },
    {
      title: 'What do you take home in a year?',
      why: 'Pay that reaches your bank account after taxes and the workplace contributions above. Include bonuses and stock you sell. A rough number is fine.',
      body: (
        <MoneyInput
          id="th"
          label="Yearly take-home pay"
          hint="Tip: a typical monthly deposit × 12, plus bonuses and stock sales after tax"
          suffix="/ yr"
          value={plan.takeHome}
          onChange={(v) => set({ takeHome: v })}
          autoFocus
        />
      ),
      valid: plan.takeHome != null && plan.takeHome > 0,
      error: 'Enter your yearly take-home pay.',
    },
    {
      title: 'What do you spend in a typical month?',
      why: "Everything: rent, bills, food, travel, fun. Whatever's left from your take-home pay is what this planner assumes you invest.",
      body: (
        <div className="stack">
          <MoneyInput
            id="sp"
            label="Monthly spending"
            suffix="/ mo"
            value={plan.monthlySpending}
            onChange={(v) => set({ monthlySpending: v })}
            autoFocus
          />
          {plan.monthlySpending != null && plan.takeHome != null && (
            <p className={'callout ' + (leftover < 0 ? 'warn' : '')}>
              {leftover >= 0
                ? `That leaves about ${money(leftover)} a year to invest on top of your workplace plan.`
                : `That's ${money(-leftover)} a year more than you take home, so only your workplace plan would be invested.`}
            </p>
          )}
        </div>
      ),
      valid: plan.monthlySpending != null && plan.monthlySpending > 0,
      error: 'Enter your monthly spending.',
    },
    {
      title: 'How is your money invested?',
      why: 'Roughly what share is in stocks versus bonds. More stocks means more growth on average and bigger swings.',
      body: (
        <div className="choice-grid" role="radiogroup" aria-label="Investment mix">
          {MIXES.map((m) => (
            <button
              key={m.label}
              type="button"
              role="radio"
              aria-checked={plan.market.stockShare === m.share}
              className="choice"
              onClick={() => set({ market: { ...plan.market, stockShare: m.share } })}
            >
              <span className="choice-title">{m.label}</span>
              <span className="choice-note">{m.note}</span>
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
  ]

  const current = steps[step - 1]
  const last = step === steps.length
  const next = () => {
    if (!current.valid) return setTouched(true)
    setTouched(false)
    if (last) onFinish()
    else setStep(step + 1)
  }

  return (
    <main className="question">
      <div className="progress" aria-label={`Question ${step} of ${steps.length}`}>
        {steps.map((_, i) => (
          <span key={i} className={i < step ? 'done' : ''} />
        ))}
      </div>
      <form
        className="q-card"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <p className="eyebrow">
          Question {step} of {steps.length}
        </p>
        <h2 className="q-title">{current.title}</h2>
        <p className="q-why">{current.why}</p>
        <div className="q-body">{current.body}</div>
        {touched && !current.valid && <p className="error" role="alert">{current.error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
          <button type="submit" className="btn primary">
            {last ? 'Run 10,000 futures' : 'Next'}
          </button>
        </div>
        {last && (
          <p className="fine">
            Starting from {compact(totalBalance(plan))}, investing about{' '}
            {money((plan.workplaceContribution ?? 0) + Math.max(0, leftover))} a year.
          </p>
        )}
      </form>
    </main>
  )
}
