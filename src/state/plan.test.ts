import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MARKET } from '../sim/montecarlo'
import { EMPTY_PLAN, EXAMPLE_PLAN, chartHorizon, clearPlan, isComplete, loadPlan, savePlan, totalBalance } from './plan'

const KEY = 'ten-thousand-futures:plan:v1'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    keys: () => [...m.keys()],
  }
}

let storage: ReturnType<typeof fakeStorage>
beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
})

describe('EMPTY_PLAN and EXAMPLE_PLAN', () => {
  it('start from the default assumptions', () => {
    expect(EMPTY_PLAN.market).toEqual(DEFAULT_MARKET)
    expect(EMPTY_PLAN.withdrawalRate).toBe(0.04)
    expect(EMPTY_PLAN.taxRate).toBe(0.1)
    expect(isComplete(EMPTY_PLAN)).toBe(false)
  })

  it('example plan is complete', () => {
    expect(isComplete(EXAMPLE_PLAN)).toBe(true)
    expect(totalBalance(EXAMPLE_PLAN)).toBe(25_000)
  })
})

describe('chartHorizon', () => {
  it('runs five years past 65, or past the retirement age if later', () => {
    expect(chartHorizon(30, 55)).toBe(40)
    expect(chartHorizon(30, 68)).toBe(43)
  })

  it('never runs more than 60 years', () => {
    expect(chartHorizon(20, 65)).toBe(50)
    expect(chartHorizon(18, 80)).toBe(60)
  })
})

describe('totalBalance', () => {
  it('counts blank balances as zero', () => {
    expect(totalBalance(EMPTY_PLAN)).toBe(0)
    expect(totalBalance({ ...EMPTY_PLAN, balances: { ...EMPTY_PLAN.balances, ira: 5_000 } })).toBe(5_000)
  })
})

describe('isComplete', () => {
  it('needs a retirement age after the current age', () => {
    expect(isComplete({ ...EXAMPLE_PLAN, retireAge: EXAMPLE_PLAN.age })).toBe(false)
  })

  it.each(['age', 'retireAge', 'workplaceContribution', 'takeHome', 'monthlySpending'] as const)(
    'needs %s',
    (field) => {
      expect(isComplete({ ...EXAMPLE_PLAN, [field]: null })).toBe(false)
    },
  )

  it('fills in balances missing from a saved plan', () => {
    localStorage.setItem(KEY, JSON.stringify({ age: 30 }))
    expect(loadPlan()!.balances).toEqual(EMPTY_PLAN.balances)
  })
})

describe('persistence', () => {
  it('round-trips a plan', () => {
    const p = { ...EXAMPLE_PLAN, age: 40 }
    savePlan(p)
    expect(storage.keys()).toEqual([KEY])
    expect(loadPlan()).toEqual(p)
  })

  it('returns null when nothing is saved', () => {
    expect(loadPlan()).toBeNull()
  })

  it('fills fields missing from an older saved plan with the defaults', () => {
    storage.setItem(KEY, JSON.stringify({ age: 30, market: { stockShare: 1 } }))
    const p = loadPlan()!
    expect(p.age).toBe(30)
    expect(p.market).toEqual({ ...DEFAULT_MARKET, stockShare: 1 })
    expect(p.balances).toEqual(EMPTY_PLAN.balances)
  })

  it('returns null for corrupt data', () => {
    storage.setItem(KEY, '{not json')
    expect(loadPlan()).toBeNull()
  })

  it('clears the saved plan', () => {
    savePlan(EXAMPLE_PLAN)
    clearPlan()
    expect(storage.keys()).toEqual([])
  })

  it('keeps working when storage is unavailable', () => {
    const fail = () => {
      throw new Error('denied')
    }
    vi.stubGlobal('localStorage', { getItem: fail, setItem: fail, removeItem: fail })
    expect(loadPlan()).toBeNull()
    expect(() => savePlan(EXAMPLE_PLAN)).not.toThrow()
    expect(() => clearPlan()).not.toThrow()
  })
})
