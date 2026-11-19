export const money = (x: number) => '$' + Math.round(x).toLocaleString('en-US')

export const compact = (x: number) => {
  if (Math.abs(x) >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M'
  if (Math.abs(x) >= 1e3) return '$' + Math.round(x / 1e3).toLocaleString('en-US') + 'k'
  return money(x)
}

export const pct = (x: number, digits = 1) => (x * 100).toFixed(digits).replace(/\.0+$/, '') + '%'

/** Parse "$1,234", "85k" or "1.2m" into a number. Returns null if empty or invalid. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[$,\s]/g, '').toLowerCase()
  if (!s) return null
  const mult = s.endsWith('m') ? 1e6 : s.endsWith('k') ? 1e3 : 1
  const n = parseFloat(mult === 1 ? s : s.slice(0, -1))
  return Number.isFinite(n) && n >= 0 ? n * mult : null
}
