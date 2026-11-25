import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ASSUMPTIONS, type FirmAssumptions } from '../config/firm'
import { DEFAULT_MARKET } from '../sim/montecarlo'
import { clearPlan, emptyPlan, examplePlan, isComplete, loadPlan, savePlan, storageKey, totalBalance } from './plan'

const cautious: FirmAssumptions = {
  market: { ...DEFAULT_MARKET, stockShare: 0.6, stockReturn: 0.05 },
  withdrawalRate: 0.035,
  taxRate: 0.2,
}

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

describe('emptyPlan and examplePlan', () => {
  it('start from the firm assumptions', () => {
    const p = emptyPlan(cautious)
    expect(p.market).toEqual(cautious.market)
    expect(p.withdrawalRate).toBe(0.035)
    expect(p.taxRate).toBe(0.2)
    expect(isComplete(p)).toBe(false)
  })

  it('example plan is complete and keeps firm assumptions', () => {
    const p = examplePlan(cautious)
    expect(isComplete(p)).toBe(true)
    expect(p.market).toEqual(cautious.market)
    expect(totalBalance(p)).toBe(25_000)
  })
})

describe('storageKey', () => {
  it('keeps the original key for the default firm so saved plans survive', () => {
    expect(storageKey('default')).toBe('ten-thousand-futures:plan:v1')
  })

  it('gives every other firm its own key', () => {
    expect(storageKey('sample-company')).toBe('ten-thousand-futures:plan:v1:sample-company')
  })
})

describe('persistence', () => {
  it('round-trips a plan per firm', () => {
    const p = { ...examplePlan(cautious), age: 40 }
    savePlan('sample-company', p, cautious)
    expect(loadPlan('sample-company', cautious)).toEqual(p)
    expect(loadPlan('default', DEFAULT_ASSUMPTIONS)).toBeNull()
  })

  it('fills fields missing from a saved plan with the firm defaults', () => {
    storage.setItem(storageKey('sample-company'), JSON.stringify({ age: 30, market: { stockShare: 1 }, basedOn: cautious }))
    const p = loadPlan('sample-company', cautious)!
    expect(p.age).toBe(30)
    expect(p.market).toEqual({ ...cautious.market, stockShare: 1 })
    expect(p.withdrawalRate).toBe(0.035)
  })

  it('resets assumptions to the firm config when the firm changes it, keeping the client answers', () => {
    const p = { ...examplePlan(cautious), age: 40, withdrawalRate: 0.04 }
    savePlan('sample-company', p, cautious)
    const updated = { ...cautious, withdrawalRate: 0.03, market: { ...cautious.market, stockReturn: 0.045 } }
    const loaded = loadPlan('sample-company', updated)!
    expect(loaded.age).toBe(40)
    expect(loaded.withdrawalRate).toBe(0.03)
    expect(loaded.market).toEqual(updated.market)
    expect(loaded.taxRate).toBe(updated.taxRate)
  })

  it('keeps slider changes while the firm config is unchanged', () => {
    const p = { ...examplePlan(cautious), withdrawalRate: 0.045 }
    savePlan('sample-company', p, cautious)
    expect(loadPlan('sample-company', cautious)!.withdrawalRate).toBe(0.045)
  })

  it('applies firm assumptions to a plan saved before firm configs existed', () => {
    storage.setItem(storageKey('default'), JSON.stringify({ ...examplePlan(DEFAULT_ASSUMPTIONS), withdrawalRate: 0.03 }))
    expect(loadPlan('default', DEFAULT_ASSUMPTIONS)!.withdrawalRate).toBe(0.04)
  })

  it('returns null for corrupt data', () => {
    storage.setItem(storageKey('default'), '{not json')
    expect(loadPlan('default', DEFAULT_ASSUMPTIONS)).toBeNull()
  })

  it('clears only that firm', () => {
    savePlan('default', examplePlan(DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS)
    savePlan('sample-company', examplePlan(cautious), cautious)
    clearPlan('sample-company')
    expect(storage.keys()).toEqual([storageKey('default')])
  })

  it('keeps working when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })
    expect(loadPlan('default', DEFAULT_ASSUMPTIONS)).toBeNull()
    expect(() => savePlan('default', examplePlan(DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS)).not.toThrow()
    expect(() => clearPlan('default')).not.toThrow()
  })
})
