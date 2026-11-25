// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { compact, pct } from '../format'
import { yearlyReturnRange } from '../methodology'
import { EMPTY_PLAN, EXAMPLE_PLAN } from '../state/plan'
import { Methodology } from './Methodology'

afterEach(cleanup)

const row = (label: string) => screen.getByText(label).closest('tr')!

describe('Methodology with a finished plan', () => {
  it('explains the plan with numbers from the model', () => {
    render(<Methodology plan={EXAMPLE_PLAN} />)
    const r = yearlyReturnRange(EXAMPLE_PLAN.market)
    expect(screen.getByRole('heading', { level: 1, name: 'How 10,000 Futures works' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to your plan/i }).getAttribute('href')).toBe('#/')
    expect(screen.getByText(pct(r.mean, 2))).toBeTruthy()
    expect(screen.getByText(pct(r.p10))).toBeTruthy()
    expect(screen.getByText(pct(r.p90))).toBeTruthy()
    // Age 22 retiring at 50: runs to 70, so 48 years.
    expect(screen.getByText(/For your plan, the/).textContent).toContain('48 of those years')
  })

  it('works out the FI target from the plan spending', () => {
    render(<Methodology plan={EXAMPLE_PLAN} />)
    // $10,000/mo → $120,000 ÷ (1 − 10%) ÷ 4%
    expect(screen.getByText(compact(120_000 / 0.9 / 0.04))).toBeTruthy()
    expect(screen.getByText(/Using your spending of \$10,000 a month/)).toBeTruthy()
  })

  it('highlights assumptions that differ from the default', () => {
    render(<Methodology plan={{ ...EXAMPLE_PLAN, withdrawalRate: 0.035 }} />)
    expect(screen.getByRole('columnheader', { name: 'Your plan' })).toBeTruthy()
    const changed = row('Withdrawal rate')
    expect(changed.className).toBe('current')
    expect(within(changed).getByText('3.50%')).toBeTruthy()
    expect(row('Tax on withdrawals').className).toBe('')
  })

  it('keeps the disclaimer and the list of what is left out', () => {
    render(<Methodology plan={EXAMPLE_PLAN} />)
    expect(screen.getByRole('heading', { name: '8. What it leaves out' })).toBeTruthy()
    expect(screen.getByText(/not financial advice/)).toBeTruthy()
  })
})

describe('Methodology before a plan exists', () => {
  it('uses the defaults and an example spending level', () => {
    render(<Methodology plan={EMPTY_PLAN} />)
    expect(screen.getByRole('link', { name: /back to the planner/i })).toBeTruthy()
    expect(screen.getByText(/Example using \$5,000 a month/)).toBeTruthy()
    expect(screen.getByText(/For a 35-year-old planning to retire at 60/).textContent).toContain('35 of those years')
    expect(screen.getByRole('columnheader', { name: 'Used here' })).toBeTruthy()
    expect(document.querySelectorAll('tr.current')).toHaveLength(0)
  })
})
