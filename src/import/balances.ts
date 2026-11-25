/**
 * Turn a balances CSV into the planner's four balance types. Runs in the browser:
 * the file is never uploaded.
 *
 * Two formats:
 * - generic template: `account_type,balance[,name]`, one row per account
 * - brokerage positions export: one row per holding, with `Account Name` and `Current Value`
 */
import type { Plan } from '../state/plan'
import { CsvError, parseCsv, type CsvRow } from './csv'

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
  if (/\bira\b|\broth\b|\bsep\b|individual retirement/.test(n)) return 'ira'
  if (/individual|joint|brokerage|taxable|\btrust\b/.test(n)) return 'brokerage'
  return 'other'
}

const AMOUNT = /^(-?)\$?(-?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/

/**
 * Parse "$1,234.56", "-$100.00", "$-100", "($100.00)" or "−100" (Unicode minus).
 * The sign may only lead (or wrap in parentheses), so "1-2" is rejected rather than read as -12.
 */
function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/−/g, '-')
  const paren = /^\((.*)\)$/.exec(s)
  if (paren) s = paren[1]
  const m = AMOUNT.exec(s)
  if (!m) return null
  const signs = (m[1] ? 1 : 0) + (m[2] ? 1 : 0) + (paren ? 1 : 0)
  if (signs > 1) return null
  return (signs ? -1 : 1) * parseFloat(m[3].replace(/,/g, ''))
}

const isBlank = (row: CsvRow) => row.cells.every((c) => c.trim() === '')

function totals(accounts: ImportedAccount[]): ImportResult['balances'] {
  const out: ImportResult['balances'] = {}
  for (const a of accounts) out[a.type] = (out[a.type] ?? 0) + a.value
  for (const k of Object.keys(out) as BalanceKey[]) out[k] = Math.round(out[k]!)
  return out
}

function importGeneric(rows: CsvRow[], header: string[], headerLine: number): ImportResult {
  const typeCol = header.indexOf('account_type')
  const balCol = header.indexOf('balance')
  const nameCol = header.indexOf('name')
  const accounts: ImportedAccount[] = []
  const errors: ImportIssue[] = []
  for (const { cells: row, line } of rows) {
    if (row.every((c) => c.trim() === '')) continue
    const rawType = (row[typeCol] ?? '').trim()
    const type = TYPE_ALIASES[rawType.toLowerCase()]
    if (!type) {
      errors.push({ line, message: `Unknown account type "${rawType}". Use workplace, ira, brokerage or other.` })
      continue
    }
    const rawBal = (row[balCol] ?? '').trim()
    const value = parseAmount(rawBal)
    if (!rawBal) errors.push({ line, message: 'Missing a balance.' })
    else if (value == null) errors.push({ line, message: `Balance "${rawBal}" is not a dollar amount.` })
    else if (value < 0) errors.push({ line, message: `Balance "${rawBal}" is negative.` })
    else accounts.push({ name: (row[nameCol] ?? '').trim() || rawType, type, value })
  }
  return finish('generic', accounts, errors, headerLine)
}

function importPositions(rows: CsvRow[], header: string[], headerLine: number): ImportResult {
  const nameCol = header.indexOf('account name')
  const numberCol = header.indexOf('account number')
  const valueCol = header.indexOf('current value')
  // Keyed by account number when the export has one, so two accounts with the same name stay apart.
  const byAccount = new Map<string, { name: string; value: number; line: number }>()
  const errors: ImportIssue[] = []
  for (const { cells: row, line } of rows) {
    // Blank lines and the one-cell disclaimer/footer lines brokerages append.
    if (row.length === 1 || row.every((c) => c.trim() === '')) continue
    const name = (row[nameCol] ?? '').trim()
    const rawValue = (row[valueCol] ?? '').trim()
    if (!name || rawValue === '' || rawValue === '--') continue
    const value = parseAmount(rawValue)
    if (value == null) {
      errors.push({ line, message: `Current Value "${rawValue}" is not a dollar amount.` })
      continue
    }
    const key = (numberCol >= 0 && row[numberCol]?.trim()) || name
    const prev = byAccount.get(key)
    byAccount.set(key, { name, value: (prev?.value ?? 0) + value, line: prev?.line ?? line })
  }
  const accounts: ImportedAccount[] = []
  for (const { name, value, line } of byAccount.values()) {
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
  let rows: CsvRow[]
  try {
    rows = parseCsv(text)
  } catch (e) {
    if (e instanceof CsvError) return fail(e.line, e.message)
    throw e
  }
  const first = rows.findIndex((r) => !isBlank(r))
  if (first === -1) return fail(1, UNRECOGNIZED)
  const header = rows[first].cells.map((h) => h.trim().toLowerCase())
  const headerLine = rows[first].line
  const body = rows.slice(first + 1)
  if (header.includes('account_type') && header.includes('balance')) return importGeneric(body, header, headerLine)
  if (header.includes('account name') && header.includes('current value')) return importPositions(body, header, headerLine)
  return fail(headerLine, UNRECOGNIZED)
}
