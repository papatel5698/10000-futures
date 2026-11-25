import { lognormalParams, portfolioMoments, type MarketAssumptions } from './sim/montecarlo'

/** z-score of the 90th percentile of a standard normal. */
const Z90 = 1.2815515655446004

export interface ReturnRange {
  /** Arithmetic mean yearly return of the blended portfolio. */
  mean: number
  /** Volatility (standard deviation) of the blended portfolio. */
  vol: number
  /** 1 year in 10 is worse than this. */
  p10: number
  /** The typical (median) year. */
  p50: number
  /** 1 year in 10 is better than this. */
  p90: number
}

/** What a single simulated year looks like for a mix: the same lognormal the engine draws from. */
export function yearlyReturnRange(market: MarketAssumptions): ReturnRange {
  const { mean, vol } = portfolioMoments(market)
  const { mu, sigma } = lognormalParams(mean, vol)
  const at = (z: number) => Math.exp(mu + sigma * z) - 1
  return { mean, vol, p10: at(-Z90), p50: at(0), p90: at(Z90) }
}

export type Route = 'plan' | 'methodology'

/** The app has two pages: the plan (default) and the methodology at #/methodology. */
export function routeFromHash(hash: string): Route {
  return /^#\/methodology\/?$/.test(hash) ? 'methodology' : 'plan'
}
