import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKET, generateReturns, lognormalParams, portfolioMoments } from './sim/montecarlo'
import { routeFromHash, yearlyReturnRange } from './methodology'

describe('yearlyReturnRange', () => {
  const r = yearlyReturnRange(DEFAULT_MARKET)

  it('reports the blended mean and volatility of the mix', () => {
    const m = portfolioMoments(DEFAULT_MARKET)
    expect(r.mean).toBe(m.mean)
    expect(r.vol).toBe(m.vol)
  })

  it('puts the typical (median) year below the average, as a lognormal does', () => {
    expect(r.p50).toBeLessThan(r.mean)
    expect(r.p10).toBeLessThan(0)
    expect(r.p90).toBeGreaterThan(r.mean)
  })

  it('is symmetric in log space around mu', () => {
    const { mu } = lognormalParams(r.mean, r.vol)
    expect(Math.log(1 + r.p10) + Math.log(1 + r.p90)).toBeCloseTo(2 * mu, 10)
    expect(Math.log(1 + r.p50)).toBeCloseTo(mu, 10)
  })

  it('matches the years the simulation actually draws', () => {
    const { data } = generateReturns(DEFAULT_MARKET, 20_000, 10)
    const sorted = Float64Array.from(data).sort()
    const at = (p: number) => sorted[Math.floor(p * sorted.length)]
    expect(at(0.1)).toBeCloseTo(r.p10, 2)
    expect(at(0.5)).toBeCloseTo(r.p50, 2)
    expect(at(0.9)).toBeCloseTo(r.p90, 2)
  })

  it('narrows for a steadier mix', () => {
    const steady = yearlyReturnRange({ ...DEFAULT_MARKET, stockShare: 0.6 })
    expect(steady.p90 - steady.p10).toBeLessThan(r.p90 - r.p10)
  })
})

describe('routeFromHash', () => {
  it.each([
    ['#/methodology', 'methodology'],
    ['#/methodology/', 'methodology'],
    ['', 'plan'],
    ['#/', 'plan'],
    ['#/anything-else', 'plan'],
    ['#methodology', 'plan'],
  ] as const)('%j is %s', (hash, route) => {
    expect(routeFromHash(hash)).toBe(route)
  })
})
