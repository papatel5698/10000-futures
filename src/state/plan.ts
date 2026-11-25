import { DEFAULT_MARKET, type MarketAssumptions } from '../sim/montecarlo'

export interface Plan {
  age: number | null
  retireAge: number | null
  balances: { workplace: number | null; ira: number | null; brokerage: number | null; other: number | null }
  /** Yearly 401(k)/403(b) contributions including employer match. */
  workplaceContribution: number | null
  /** Yearly take-home pay after taxes and workplace retirement deductions. */
  takeHome: number | null
  monthlySpending: number | null
  market: MarketAssumptions
  withdrawalRate: number
  taxRate: number
}

export const EMPTY_PLAN: Plan = {
  age: null,
  retireAge: null,
  balances: { workplace: null, ira: null, brokerage: null, other: null },
  workplaceContribution: null,
  takeHome: null,
  monthlySpending: null,
  market: DEFAULT_MARKET,
  withdrawalRate: 0.04,
  taxRate: 0.1,
}

/** A made-up profile for trying the app without entering anything. */
export const EXAMPLE_PLAN: Plan = {
  ...EMPTY_PLAN,
  age: 22,
  retireAge: 50,
  balances: { workplace: 15_000, ira: 5_000, brokerage: 5_000, other: 0 },
  workplaceContribution: 30_000,
  takeHome: 190_000,
  // $10,000/mo spending leaves $70,000 to invest: $100,000/yr in total
  monthlySpending: 10_000,
}

export const totalBalance = (p: Plan) =>
  Object.values(p.balances).reduce<number>((a, b) => a + (b ?? 0), 0)

export function isComplete(p: Plan): boolean {
  return (
    p.age != null &&
    p.retireAge != null &&
    p.retireAge > p.age &&
    p.workplaceContribution != null &&
    p.takeHome != null &&
    p.monthlySpending != null
  )
}

const KEY = 'ten-thousand-futures:plan:v1'

export function loadPlan(): Plan | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Plan>
    return {
      ...EMPTY_PLAN,
      ...parsed,
      balances: { ...EMPTY_PLAN.balances, ...parsed.balances },
      market: { ...DEFAULT_MARKET, ...parsed.market },
    }
  } catch {
    return null
  }
}

export function savePlan(p: Plan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable: the app still works for this visit */
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
