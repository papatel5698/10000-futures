import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MARKET,
  contributionFromCashFlow,
  fiTarget,
  firstAgeReaching,
  generateReturns,
  lognormalParams,
  normals,
  portfolioMoments,
  simulate,
} from './montecarlo'

describe('random draws', () => {
  it('are reproducible for a given seed', () => {
    expect(normals(10, 42)).toEqual(normals(10, 42))
  })
  it('look standard normal', () => {
    const z = normals(200_000, 7)
    const mean = z.reduce((a, b) => a + b, 0) / z.length
    const variance = z.reduce((a, b) => a + (b - mean) ** 2, 0) / z.length
    expect(mean).toBeCloseTo(0, 2)
    expect(variance).toBeCloseTo(1, 1)
  })
})

describe('portfolio math', () => {
  it('blends stock and bond returns by weight', () => {
    const { mean } = portfolioMoments({ ...DEFAULT_MARKET, stockShare: 0.5 })
    expect(mean).toBeCloseTo(0.0425, 6)
  })
  it('lognormal draws match the target arithmetic mean', () => {
    const { mu, sigma } = lognormalParams(0.06, 0.15)
    const z = normals(400_000, 3)
    let sum = 0
    for (const x of z) sum += Math.exp(mu + sigma * x) - 1
    expect(sum / z.length).toBeCloseTo(0.06, 2)
  })
})

describe('simulate', () => {
  it('grows by contributions alone when returns are zero', () => {
    const returns = { runs: 3, years: 5, data: new Float64Array(15) }
    const paths = simulate(returns, 1000, 100)
    expect(paths[50]).toEqual([1000, 1100, 1200, 1300, 1400, 1500])
  })
  it('keeps percentiles ordered', () => {
    const paths = simulate(generateReturns(DEFAULT_MARKET, 2000, 20), 100_000, 10_000)
    for (let t = 0; t <= 20; t++) {
      expect(paths[10][t]).toBeLessThanOrEqual(paths[25][t])
      expect(paths[25][t]).toBeLessThanOrEqual(paths[50][t])
      expect(paths[50][t]).toBeLessThanOrEqual(paths[90][t])
    }
  })
  it('matches a reference median within a few percent', () => {
    // $25,000 start, $100,000/yr, 28 years, default market.
    // Reference median ≈ $6.20M from an independent NumPy run (40,000 paths).
    const paths = simulate(generateReturns(DEFAULT_MARKET, 10_000, 28), 25_000, 100_000)
    expect(paths[50][28] / 6_202_000).toBeGreaterThan(0.96)
    expect(paths[50][28] / 6_202_000).toBeLessThan(1.04)
  })
})

describe('FI helpers', () => {
  it('computes the FI target with a tax allowance', () => {
    expect(fiTarget(120_000, 0.04, 0.1)).toBeCloseTo(3_333_333, 0)
  })
  it('finds the first age a path reaches the target', () => {
    expect(firstAgeReaching([1, 5, 10, 20], 10, 30)).toBe(32)
    expect(firstAgeReaching([1, 2], 10, 30)).toBeNull()
  })
  it('never counts negative leftover cash as a contribution', () => {
    expect(contributionFromCashFlow(30_000, 100_000, 120_000)).toBe(30_000)
    expect(contributionFromCashFlow(30_000, 100_000, 80_000)).toBe(50_000)
  })
})

describe('non-default assumptions', () => {
  // A cautious 60/40 mix with lower return assumptions than the defaults.
  const cautious = { ...DEFAULT_MARKET, stockShare: 0.6, stockReturn: 0.05, stockVol: 0.16, bondReturn: 0.015, bondVol: 0.05 }

  it('uses the given market assumptions for the blended portfolio', () => {
    const { mean, vol } = portfolioMoments(cautious)
    expect(mean).toBeCloseTo(0.6 * 0.05 + 0.4 * 0.015, 10)
    expect(vol).toBeLessThan(portfolioMoments(DEFAULT_MARKET).vol)
  })

  it('projects a lower median and a narrower range than the default', () => {
    const years = 30
    const def = simulate(generateReturns(DEFAULT_MARKET, 4000, years, 1), 100_000, 20_000)
    const low = simulate(generateReturns(cautious, 4000, years, 1), 100_000, 20_000)
    expect(low[50][years]).toBeLessThan(def[50][years])
    expect(low[90][years] / low[10][years]).toBeLessThan(def[90][years] / def[10][years])
  })

  it('needs a bigger portfolio with a lower withdrawal rate and higher tax', () => {
    expect(fiTarget(60_000, 0.0325, 0.2)).toBeGreaterThan(fiTarget(60_000, 0.04, 0.1))
    expect(fiTarget(60_000, 0.0325, 0.2)).toBeCloseTo(60_000 / 0.8 / 0.0325, 6)
  })
})
