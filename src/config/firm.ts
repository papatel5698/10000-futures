/**
 * Per-firm configuration: branding and planning assumptions.
 *
 * Each firm has a `clients/<id>.json` file. The build reads and validates them
 * (see scripts/firms-plugin.ts), and the app picks one at load time. This module
 * is plain logic with no DOM access, so the build and the tests can use it.
 */
import { DEFAULT_MARKET, type MarketAssumptions } from '../sim/montecarlo'

export interface FirmColors {
  /** Brand accent for light mode, as #rrggbb or #rgb. */
  accent: string
  /** Accent for dark mode. Defaults to `accent`. */
  accentDark: string
}

export interface FirmAssumptions {
  market: MarketAssumptions
  withdrawalRate: number
  taxRate: number
}

export interface FirmConfig {
  id: string
  name: string
  /** Logo as a URL or data URI, or null to show the default mark. */
  logo: string | null
  colors: FirmColors
  assumptions: FirmAssumptions
}

export const DEFAULT_FIRM_ID = 'default'

export const DEFAULT_ASSUMPTIONS: FirmAssumptions = {
  market: DEFAULT_MARKET,
  withdrawalRate: 0.04,
  taxRate: 0.1,
}

type Range = { min: number; max: number; minExclusive?: boolean; maxExclusive?: boolean }

/** Allowed range per assumption. Rates are fractions: 6.5% is 0.065. */
const RANGES: Record<keyof MarketAssumptions | 'withdrawalRate' | 'taxRate', Range> = {
  stockShare: { min: 0, max: 1 },
  stockReturn: { min: -0.1, max: 0.2 },
  stockVol: { min: 0, max: 1 },
  bondReturn: { min: -0.1, max: 0.2 },
  bondVol: { min: 0, max: 1 },
  correlation: { min: -1, max: 1 },
  withdrawalRate: { min: 0, max: 0.2, minExclusive: true },
  taxRate: { min: 0, max: 1, maxExclusive: true },
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function inRange(v: number, r: Range): boolean {
  if (r.minExclusive ? v <= r.min : v < r.min) return false
  if (r.maxExclusive ? v >= r.max : v > r.max) return false
  return true
}

/** Validate a raw config object and fill in defaults. Throws with a message naming the file and field. */
export function parseFirmConfig(raw: unknown, id: string): FirmConfig {
  const fail = (msg: string): never => {
    throw new Error(`clients/${id}.json: ${msg}`)
  }
  if (!SLUG.test(id)) fail(`id "${id}" must be lowercase letters, numbers and dashes`)
  if (!isObject(raw)) return fail('must be a JSON object')

  if (typeof raw.name !== 'string' || !raw.name.trim()) fail('"name" must be a non-empty string')
  const name = (raw.name as string).trim()

  if (raw.logo !== undefined && raw.logo !== null && typeof raw.logo !== 'string') fail('"logo" must be a string')
  const logo = (raw.logo as string | null | undefined) ?? null

  const colors = isObject(raw.colors) ? raw.colors : {}
  if (typeof colors.accent !== 'string' || !HEX.test(colors.accent)) fail('"colors.accent" must be a hex color like "#1f6f62"')
  if (colors.accentDark !== undefined && (typeof colors.accentDark !== 'string' || !HEX.test(colors.accentDark)))
    fail('"colors.accentDark" must be a hex color like "#5cc2ac"')
  const accent = colors.accent as string

  if (raw.assumptions !== undefined && !isObject(raw.assumptions)) fail('"assumptions" must be an object')
  const given = (raw.assumptions ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(given)) {
    const range = RANGES[key as keyof typeof RANGES]
    if (!range) fail(`unknown assumption "${key}"`)
    if (typeof value !== 'number' || !Number.isFinite(value) || !inRange(value, range))
      fail(`assumption "${key}" must be a number from ${range.min} to ${range.max} (rates are fractions: 6.5% is 0.065)`)
  }
  const { withdrawalRate, taxRate, ...market } = given as Partial<MarketAssumptions & { withdrawalRate: number; taxRate: number }>

  return {
    id,
    name,
    logo,
    colors: { accent, accentDark: (colors.accentDark as string | undefined) ?? accent },
    assumptions: {
      market: { ...DEFAULT_ASSUMPTIONS.market, ...market },
      withdrawalRate: withdrawalRate ?? DEFAULT_ASSUMPTIONS.withdrawalRate,
      taxRate: taxRate ?? DEFAULT_ASSUMPTIONS.taxRate,
    },
  }
}

/**
 * Choose the firm for this page load. A build locked to one firm (FIRM set)
 * ignores the URL. Otherwise `?firm=<id>` picks one, falling back to the default.
 */
export function selectFirm(firms: FirmConfig[], opts: { search: string; locked: boolean }): FirmConfig {
  if (firms.length === 0) throw new Error('No firm configs were bundled')
  const fallback = firms.find((f) => f.id === DEFAULT_FIRM_ID) ?? firms[0]
  if (opts.locked) return firms[0]
  const wanted = new URLSearchParams(opts.search).get('firm')
  return firms.find((f) => f.id === wanted) ?? fallback
}

/** Which firm ids go into the build. Throws if FIRM names a firm that doesn't exist. */
export function firmsToBundle(ids: string[], envFirm: string | undefined): string[] {
  if (!envFirm) return ids
  if (!ids.includes(envFirm)) throw new Error(`FIRM=${envFirm} has no clients/${envFirm}.json. Available: ${ids.join(', ')}`)
  return [envFirm]
}

function rgb(hex: string): [number, number, number] {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

/** White or near-black text, whichever reads better on the given background (WCAG relative luminance). */
export function readableInk(hex: string): string {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // Contrast against white vs. against #0f1614 (luminance ~0.0075).
  return (1.05) / (lum + 0.05) >= (lum + 0.05) / 0.0575 ? '#ffffff' : '#0f1614'
}

function vars(accent: string, bandAlpha: number): string {
  const [r, g, b] = rgb(accent)
  return `--accent:${accent};--accent-ink:${readableInk(accent)};--p50:${accent};--band:rgba(${r}, ${g}, ${b}, ${bandAlpha});`
}

/** CSS that overrides the theme's accent variables with the firm's colors. */
export function themeCss(colors: FirmColors): string {
  return `:root{${vars(colors.accent, 0.12)}}@media (prefers-color-scheme: dark){:root{${vars(colors.accentDark, 0.14)}}}`
}
