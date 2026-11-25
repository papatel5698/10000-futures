import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { accountType, importBalances, MAX_IMPORT_CHARS } from './balances'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('generic template', () => {
  it('sums balances by account type', () => {
    const r = importBalances(fixture('generic.csv'))
    expect(r.format).toBe('generic')
    expect(r.errors).toEqual([])
    expect(r.balances).toEqual({ workplace: 42_500, ira: 20_000, brokerage: 9_501, other: 0 })
    expect(r.accounts.map((a) => a.name)).toEqual(['Acme 401(k)', 'Roth IRA', 'Old Roth', 'Taxable', 'other'])
  })

  it('reports each bad row with its line number and keeps the good ones', () => {
    const r = importBalances(fixture('generic-errors.csv'))
    expect(r.balances).toEqual({ workplace: 11_000 })
    expect(r.errors).toEqual([
      { line: 3, message: 'Unknown account type "savings". Use workplace, ira, brokerage or other.' },
      { line: 4, message: 'Balance "abc" is not a dollar amount.' },
      { line: 5, message: 'Balance "-200" is negative.' },
      { line: 6, message: 'Missing a balance.' },
    ])
  })

  it('reads the downloadable template in public/samples', () => {
    const r = importBalances(readFileSync(join(__dirname, '../../public/samples/balances-template.csv'), 'utf8'))
    expect(r.errors).toEqual([])
    expect(r.balances).toEqual({ workplace: 0, ira: 0, brokerage: 0, other: 0 })
  })

  it('accepts headers in any case and order', () => {
    const r = importBalances('Balance,Account_Type\n100,IRA\n')
    expect(r.balances).toEqual({ ira: 100 })
  })
})

describe('brokerage positions export', () => {
  it('adds up positions per account and maps accounts to types', () => {
    const r = importBalances(fixture('positions.csv'))
    expect(r.format).toBe('positions')
    expect(r.errors).toEqual([])
    expect(r.balances).toEqual({ brokerage: 31_163, ira: 9_500, workplace: 61_250, other: 1_200 })
    expect(r.accounts).toEqual([
      { name: 'Individual', type: 'brokerage', value: 31_162.5 },
      { name: 'ROTH IRA', type: 'ira', value: 9_500 },
      { name: 'ACME CORP 401(K) PLAN', type: 'workplace', value: 61_250 },
      { name: 'Health Savings Account', type: 'other', value: 1_200 },
    ])
  })

  it('skips positions with no value and reports unreadable ones', () => {
    const r = importBalances(fixture('positions-odd.csv'))
    expect(r.balances).toEqual({ brokerage: 3_000 })
    expect(r.errors).toEqual([{ line: 3, message: 'Current Value "n/a" is not a dollar amount.' }])
  })

  it('rejects an account whose positions add up to less than zero', () => {
    const r = importBalances('Account Name,Current Value\nIndividual,"-$50.00"\n')
    expect(r.balances).toEqual({})
    expect(r.errors).toEqual([{ line: 2, message: 'Account "Individual" adds up to a negative value.' }])
  })
})

describe('unrecognized files', () => {
  it.each([
    ['an empty file', ''],
    ['an unknown header', 'date,amount\n2026-01-01,5\n'],
  ])('explains the expected formats for %s', (_label, text) => {
    const r = importBalances(text)
    expect(r.format).toBeNull()
    expect(r.errors[0].message).toMatch(/account_type,balance.*Account Name.*Current Value/)
  })

  it('reports a file with a header but no rows', () => {
    expect(importBalances('account_type,balance\n').errors).toEqual([{ line: 1, message: 'No balances found in the file.' }])
  })

  it('refuses very large files', () => {
    const r = importBalances('x'.repeat(MAX_IMPORT_CHARS + 1))
    expect(r.errors).toEqual([{ line: 0, message: 'File is too large to be a balances export (over 1 MB).' }])
  })
})

describe('accountType', () => {
  it.each([
    ['ACME CORP 401(K) PLAN', 'workplace'],
    ['Roth 401k', 'workplace'],
    ['403(b) Retirement', 'workplace'],
    ['Thrift Savings Plan', 'workplace'],
    ['ROTH IRA', 'ira'],
    ['Traditional IRA', 'ira'],
    ['SEP-IRA', 'ira'],
    ['Individual', 'brokerage'],
    ['Joint WROS', 'brokerage'],
    ['Taxable brokerage', 'brokerage'],
    ['Health Savings Account', 'other'],
    ['Pirate treasure', 'other'],
  ])('%s is %s', (name, type) => {
    expect(accountType(name)).toBe(type)
  })
})
