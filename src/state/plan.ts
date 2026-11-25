import type { FirmAssumptions } from '../config/firm'
import type { MarketAssumptions } from '../sim/montecarlo'

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

/** A blank plan using the firm's planning assumptions. */
export function emptyPlan(a: FirmAssumptions): Plan {
  return {
    age: null,
    retireAge: null,
    balances: { workplace: null, ira: null, brokerage: null, other: null },
    workplaceContribution: null,
    takeHome: null,
    monthlySpending: null,
    market: a.market,
    withdrawalRate: a.withdrawalRate,
    taxRate: a.taxRate,
  }
}

/** A made-up profile for trying the app without entering anything. */
export function examplePlan(a: FirmAssumptions): Plan {
  return {
    ...emptyPlan(a),
    age: 22,
    retireAge: 50,
    balances: { workplace: 15_000, ira: 5_000, brokerage: 5_000, other: 0 },
    workplaceContribution: 30_000,
    takeHome: 190_000,
    // $10,000/mo spending leaves $70,000 to invest: $100,000/yr in total
    monthlySpending: 10_000,
  }
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

/** Each firm saves its own plan. The default firm keeps the original key so existing plans survive. */
export const storageKey = (firmId: string) => (firmId === 'default' ? KEY : `${KEY}:${firmId}`)

function sameAssumptions(a: FirmAssumptions | undefined, b: FirmAssumptions): boolean {
  if (!a || a.withdrawalRate !== b.withdrawalRate || a.taxRate !== b.taxRate) return false
  const keys = Object.keys(b.market) as (keyof MarketAssumptions)[]
  return keys.every((k) => a.market?.[k] === b.market[k])
}

/**
 * Load the firm's saved plan. If the firm has changed its config since the plan was saved
 * (or the plan predates firm configs), the firm's new assumptions replace the saved ones;
 * the client's own answers are kept.
 */
export function loadPlan(firmId: string, defaults: FirmAssumptions): Plan | null {
  try {
    const raw = localStorage.getItem(storageKey(firmId))
    if (!raw) return null
    const { basedOn, ...parsed } = JSON.parse(raw) as Partial<Plan> & { basedOn?: FirmAssumptions }
    const empty = emptyPlan(defaults)
    const plan: Plan = {
      ...empty,
      ...parsed,
      balances: { ...empty.balances, ...parsed.balances },
      market: { ...empty.market, ...parsed.market },
    }
    if (sameAssumptions(basedOn, defaults)) return plan
    return { ...plan, market: empty.market, withdrawalRate: empty.withdrawalRate, taxRate: empty.taxRate }
  } catch {
    return null
  }
}

/** Save the plan along with the firm assumptions it started from, so config changes can be detected. */
export function savePlan(firmId: string, p: Plan, basedOn: FirmAssumptions): void {
  try {
    localStorage.setItem(storageKey(firmId), JSON.stringify({ ...p, basedOn }))
  } catch {
    /* storage unavailable: the app still works for this visit */
  }
}

export function clearPlan(firmId: string): void {
  try {
    localStorage.removeItem(storageKey(firmId))
  } catch {
    /* ignore */
  }
}
