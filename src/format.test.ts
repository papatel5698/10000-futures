import { describe, expect, it } from 'vitest'
import { compact, money, parseMoney, pct } from './format'

describe('money', () => {
  it('rounds to whole dollars with thousands separators', () => {
    expect(money(1234.6)).toBe('$1,235')
    expect(money(0)).toBe('$0')
  })
})

describe('compact', () => {
  it('uses M for millions, k for thousands and dollars below that', () => {
    expect(compact(2_345_678)).toBe('$2.35M')
    expect(compact(85_400)).toBe('$85k')
    expect(compact(999)).toBe('$999')
  })
})

describe('pct', () => {
  it('formats fractions as percents, dropping an all-zero decimal', () => {
    expect(pct(0.04)).toBe('4%')
    expect(pct(0.065, 2)).toBe('6.50%')
    expect(pct(0.0325, 2)).toBe('3.25%')
    expect(pct(0.1, 0)).toBe('10%')
  })
})

describe('parseMoney', () => {
  it.each([
    ['$1,234', 1234],
    ['85k', 85_000],
    ['1.2m', 1_200_000],
    ['1.5K', 1500],
    [' 42 ', 42],
    ['0', 0],
  ])('parses %j', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '-5', 'k'])('returns null for %j', (input) => {
    expect(parseMoney(input)).toBeNull()
  })
})
