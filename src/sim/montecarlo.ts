/**
 * Monte Carlo retirement engine.
 *
 * Everything is in "real" (inflation-adjusted) terms, so every dollar figure
 * means today's buying power. Annual portfolio returns are drawn from a
 * lognormal distribution whose arithmetic mean and volatility match a blended
 * stock/bond portfolio.
 */

export interface MarketAssumptions {
  /** Share of the portfolio in stocks, 0–1. */
  stockShare: number
  /** Expected stock return after inflation (arithmetic), e.g. 0.065. */
  stockReturn: number
  /** Stock volatility (standard deviation), e.g. 0.17. */
  stockVol: number
  /** Expected bond return after inflation, e.g. 0.02. */
  bondReturn: number
  /** Bond volatility, e.g. 0.06. */
  bondVol: number
  /** Stock/bond correlation, e.g. 0.1. */
  correlation: number
}

export const DEFAULT_MARKET: MarketAssumptions = {
  stockShare: 0.9,
  stockReturn: 0.065,
  stockVol: 0.17,
  bondReturn: 0.02,
  bondVol: 0.06,
  correlation: 0.1,
}

export const PERCENTILES = [10, 25, 50, 75, 90] as const
export type Percentile = (typeof PERCENTILES)[number]

/** Percentile paths: paths[p][t] is the balance after t years. */
export type PercentilePaths = Record<Percentile, number[]>

/** Small, fast, seedable PRNG so results are stable between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal draws via Box–Muller. */
export function normals(count: number, seed: number): Float64Array {
  const rnd = mulberry32(seed)
  const z = new Float64Array(count)
  for (let i = 0; i < count; i += 2) {
    const u = rnd() || 1e-12
    const v = rnd()
    const r = Math.sqrt(-2 * Math.log(u))
    z[i] = r * Math.cos(2 * Math.PI * v)
    if (i + 1 < count) z[i + 1] = r * Math.sin(2 * Math.PI * v)
  }
  return z
}

/** Arithmetic mean and volatility of the blended portfolio. */
export function portfolioMoments(m: MarketAssumptions): { mean: number; vol: number } {
  const w = m.stockShare
  const mean = w * m.stockReturn + (1 - w) * m.bondReturn
  const variance =
    (w * m.stockVol) ** 2 +
    ((1 - w) * m.bondVol) ** 2 +
    2 * w * (1 - w) * m.correlation * m.stockVol * m.bondVol
  return { mean, vol: Math.sqrt(variance) }
}

/**
 * Lognormal parameters matching an arithmetic mean and volatility:
 * 1 + R = exp(mu + sigma * Z).
 */
export function lognormalParams(mean: number, vol: number): { mu: number; sigma: number } {
  const s2 = Math.log(1 + (vol * vol) / (1 + mean) ** 2)
  return { mu: Math.log(1 + mean) - s2 / 2, sigma: Math.sqrt(s2) }
}

export interface ReturnMatrix {
  runs: number
  years: number
  /** returns[run * years + year] */
  data: Float64Array
}

/** Each run's draws are laid out on a fixed stride of at least this many years. */
export const DRAW_STRIDE_YEARS = 60

/**
 * Yearly returns for `runs` futures of `years` years.
 * Draws sit on a fixed per-run stride, so year t of run i is the same whatever the horizon:
 * lengthening the chart extends each future instead of swapping in new ones.
 */
export function generateReturns(
  market: MarketAssumptions,
  runs: number,
  years: number,
  seed = 20261118,
): ReturnMatrix {
  const { mean, vol } = portfolioMoments(market)
  const { mu, sigma } = lognormalParams(mean, vol)
  const stride = Math.max(years, DRAW_STRIDE_YEARS)
  const z = normals(runs * stride, seed)
  const data = new Float64Array(runs * years)
  for (let i = 0; i < runs; i++) {
    for (let t = 0; t < years; t++) data[i * years + t] = Math.exp(mu + sigma * z[i * stride + t]) - 1
  }
  return { runs, years, data }
}

/**
 * Simulate balances with a fixed real contribution each year.
 * Contributions are treated as arriving mid-year (half a year of growth),
 * which approximates paycheck and weekly investing.
 */
export function simulate(
  returns: ReturnMatrix,
  startBalance: number,
  yearlyContribution: number,
): PercentilePaths {
  const { runs, years, data } = returns
  const balances = new Float64Array(runs).fill(startBalance)
  const sorted = new Float64Array(runs)
  const out = Object.fromEntries(PERCENTILES.map((p) => [p, [startBalance]])) as PercentilePaths
  for (let t = 0; t < years; t++) {
    for (let i = 0; i < runs; i++) {
      const r = data[i * years + t]
      balances[i] = balances[i] * (1 + r) + yearlyContribution * Math.sqrt(1 + r)
    }
    sorted.set(balances)
    sorted.sort()
    for (const p of PERCENTILES) {
      const idx = Math.min(runs - 1, Math.floor((p / 100) * runs))
      out[p].push(sorted[idx])
    }
  }
  return out
}

/**
 * Portfolio needed to fund a yearly spending level.
 * taxRate grosses spending up for taxes on withdrawals.
 */
export function fiTarget(yearlySpending: number, withdrawalRate: number, taxRate: number): number {
  return yearlySpending / (1 - taxRate) / withdrawalRate
}

/** First age at which a path reaches the target, or null if it never does. */
export function firstAgeReaching(path: number[], target: number, startAge: number): number | null {
  const t = path.findIndex((b) => b >= target)
  return t === -1 ? null : startAge + t
}

/**
 * Yearly amount invested when everything left after spending is saved:
 * workplace contributions plus whatever take-home pay is left over.
 */
export function contributionFromCashFlow(
  workplaceContribution: number,
  takeHome: number,
  yearlySpending: number,
): number {
  return workplaceContribution + Math.max(0, takeHome - yearlySpending)
}
