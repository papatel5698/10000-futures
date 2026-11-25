/**
 * Turn a balances CSV into the planner's four balance types. Runs in the browser:
 * the file is never uploaded.
 *
 * Two formats:
 * - generic template: `account_type,balance[,name]`, one row per account
 * - brokerage positions export: one row per holding, with `Account Name` and `Current Value`
 */
import type { Plan } from '../state/plan'
import { parseCsv } from './csv'

export type BalanceKey = keyof Plan['balances']

export interface ImportedAccount {
  name: string
  type: BalanceKey
  value: number
}

export interface ImportIssue {
  /** 1-based line in the file (0 for the whole file). */
  line: number
  message: string
}

export interface ImportResult {
  format: 'generic' | 'positions' | null
  /** Whole-dollar totals for the types found in the file. Types not in the file are left out. */
  balances: Partial<Record<BalanceKey, number>>
  accounts: ImportedAccount[]
  errors: ImportIssue[]
}

export const MAX_IMPORT_CHARS = 1_000_000

/** How each balance type is labeled in the app. */
export const BALANCE_LABELS: Record<BalanceKey, string> = {
  workplace: '401(k) / 403(b)',
  ira: 'IRA / Roth IRA',
  brokerage: 'Brokerage',
  other: 'Other investments',
}

const UNRECOGNIZED =
  'Unrecognized file. Use the template (account_type,balance) or a brokerage positions export with Account Name and Current Value columns.'

const TYPE_ALIASES: Record<string, BalanceKey> = {
  workplace: 'workplace', '401k': 'workplace', '401(k)': 'workplace', '403b': 'workplace', '403(b)': 'workplace', '457': 'workplace', tsp: 'workplace',
  ira: 'ira', roth: 'ira', 'roth ira': 'ira', 'traditional ira': 'ira',
  brokerage: 'brokerage', taxable: 'brokerage',
  other: 'other', hsa: 'other',
}

/** Best guess at an account's type from its name. Workplace plans win, so "Roth 401(k)" is workplace. */
export function accountType(name: string): BalanceKey {
  const n = name.toLowerCase()
  if (/\b40[13]\s*\(?[kb]\)?|\b457\b|\btsp\b|thrift savings/.test(n)) return 'workplace'
  if (/\bira\b|\broth\b/.test(n)) return 'ira'
  if (/individual|joint|brokerage|taxable|\btrust\b/.test(n)) return 'brokerage'
  return 'other'
}

/** Parse "$1,234.56", "-$100.00" or "($100.00)". Returns null if it isn't an amount. */
function parseAmount(raw: string): number | null {
  const s = raw.trim()
  const negative = s.includes('-') || (s.startsWith('(') && s.endsWith(')'))
  const digits = s.replace(/[$,()\s-]/g, '')
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(digits)) return null
  return (negative ? -1 : 1) * parseFloat(digits)
}

const isBlank = (row: string[]) => row.every((c) => c.trim() === '')

function totals(accounts: ImportedAccount[]): ImportResult['balances'] {
  const out: ImportResult['balances'] = {}
  for (const a of accounts) out[a.type] = (out[a.type] ?? 0) + a.value
  for (const k of Object.keys(out) as BalanceKey[]) out[k] = Math.round(out[k]!)
  return out
}

function importGeneric(rows: string[][], header: string[], headerLine: number): ImportResult {
  const typeCol = header.indexOf('account_type')
  const balCol = header.indexOf('balance')
  const nameCol = header.indexOf('name')
  const accounts: ImportedAccount[] = []
  const errors: ImportIssue[] = []
  rows.slice(headerLine).forEach((row, i) => {
    const line = headerLine + i + 1
    if (isBlank(row)) return
    const rawType = (row[typeCol] ?? '').trim()
    const type = TYPE_ALIASES[rawType.toLowerCase()]
    if (!type) return void errors.push({ line, message: `Unknown account type "${rawType}". Use workplace, ira, brokerage or other.` })
    const rawBal = (row[balCol] ?? '').trim()
    if (!rawBal) return void errors.push({ line, message: 'Missing a balance.' })
    const value = parseAmount(rawBal)
    if (value == null) return void errors.push({ line, message: `Balance "${rawBal}" is not a dollar amount.` })
    if (value < 0) return void errors.push({ line, message: `Balance "${rawBal}" is negative.` })
    accounts.push({ name: (row[nameCol] ?? '').trim() || rawType, type, value })
  })
  return finish('generic', accounts, errors, headerLine)
}

function importPositions(rows: string[][], header: string[], headerLine: number): ImportResult {
  const nameCol = header.indexOf('account name')
  const valueCol = header.indexOf('current value')
  const byName = new Map<string, { value: number; line: number }>()
  const errors: ImportIssue[] = []
  rows.slice(headerLine).forEach((row, i) => {
    const line = headerLine + i + 1
    // Blank lines and the one-cell disclaimer/footer lines brokerages append.
    if (isBlank(row) || row.length === 1) return
    const name = (row[nameCol] ?? '').trim()
    const rawValue = (row[valueCol] ?? '').trim()
    if (!name || rawValue === '' || rawValue === '--') return
    const value = parseAmount(rawValue)
    if (value == null) return void errors.push({ line, message: `Current Value "${rawValue}" is not a dollar amount.` })
    const prev = byName.get(name)
    byName.set(name, { value: (prev?.value ?? 0) + value, line: prev?.line ?? line })
  })
  const accounts: ImportedAccount[] = []
  for (const [name, { value, line }] of byName) {
    if (value < 0) errors.push({ line, message: `Account "${name}" adds up to a negative value.` })
    else accounts.push({ name, type: accountType(name), value })
  }
  errors.sort((a, b) => a.line - b.line)
  return finish('positions', accounts, errors, headerLine)
}

function finish(format: 'generic' | 'positions', accounts: ImportedAccount[], errors: ImportIssue[], headerLine: number): ImportResult {
  if (accounts.length === 0 && errors.length === 0) errors.push({ line: headerLine, message: 'No balances found in the file.' })
  return { format, balances: totals(accounts), accounts, errors }
}

export function importBalances(text: string): ImportResult {
  const fail = (line: number, message: string): ImportResult => ({ format: null, balances: {}, accounts: [], errors: [{ line, message }] })
  if (text.length > MAX_IMPORT_CHARS) return fail(0, 'File is too large to be a balances export (over 1 MB).')
  const rows = parseCsv(text)
  const first = rows.findIndex((r) => !isBlank(r))
  if (first === -1) return fail(1, UNRECOGNIZED)
  const header = rows[first].map((h) => h.trim().toLowerCase())
  const headerLine = first + 1
  if (header.includes('account_type') && header.includes('balance')) return importGeneric(rows, header, headerLine)
  if (header.includes('account name') && header.includes('current value')) return importPositions(rows, header, headerLine)
  return fail(headerLine, UNRECOGNIZED)
}
