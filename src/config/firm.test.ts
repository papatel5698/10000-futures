import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKET } from '../sim/montecarlo'
import { firmsToBundle, parseFirmConfig, readableInk, selectFirm, themeCss, type FirmConfig } from './firm'

const minimal = { name: 'Test Firm', colors: { accent: '#112233' } }

describe('parseFirmConfig', () => {
  it('fills in default assumptions and colors for a minimal config', () => {
    const f = parseFirmConfig(minimal, 'test')
    expect(f).toEqual({
      id: 'test',
      name: 'Test Firm',
      logo: null,
      colors: { accent: '#112233', accentDark: '#112233' },
      assumptions: { market: DEFAULT_MARKET, withdrawalRate: 0.04, taxRate: 0.1 },
    })
  })

  it('overrides only the assumptions a firm sets', () => {
    const f = parseFirmConfig(
      { ...minimal, assumptions: { stockShare: 0.6, stockReturn: 0.05, withdrawalRate: 0.035, taxRate: 0.2 } },
      'test',
    )
    expect(f.assumptions.market).toEqual({ ...DEFAULT_MARKET, stockShare: 0.6, stockReturn: 0.05 })
    expect(f.assumptions.withdrawalRate).toBe(0.035)
    expect(f.assumptions.taxRate).toBe(0.2)
  })

  it('keeps a logo and a dark-mode accent', () => {
    const f = parseFirmConfig({ ...minimal, logo: 'data:image/svg+xml;base64,AAA', colors: { accent: '#112233', accentDark: '#aabbcc' } }, 'test')
    expect(f.logo).toBe('data:image/svg+xml;base64,AAA')
    expect(f.colors.accentDark).toBe('#aabbcc')
  })

  it.each([
    ['not an object', 'nope', /must be a JSON object/],
    ['a missing name', { colors: { accent: '#112233' } }, /name/],
    ['an empty name', { ...minimal, name: '  ' }, /name/],
    ['missing colors', { name: 'X' }, /colors\.accent/],
    ['a non-hex accent', { name: 'X', colors: { accent: 'red' } }, /colors\.accent/],
    ['a non-hex dark accent', { name: 'X', colors: { accent: '#112233', accentDark: 'blue' } }, /colors\.accentDark/],
    ['a non-string logo', { ...minimal, logo: 5 }, /logo/],
    ['an unknown assumption', { ...minimal, assumptions: { stockReturns: 0.06 } }, /unknown assumption "stockReturns"/],
    ['a non-number assumption', { ...minimal, assumptions: { stockReturn: '6%' } }, /stockReturn/],
    ['a percent written as a whole number', { ...minimal, assumptions: { stockReturn: 6.5 } }, /stockReturn/],
    ['a stock share above 1', { ...minimal, assumptions: { stockShare: 1.2 } }, /stockShare/],
    ['a negative volatility', { ...minimal, assumptions: { stockVol: -0.1 } }, /stockVol/],
    ['a correlation outside -1..1', { ...minimal, assumptions: { correlation: 1.5 } }, /correlation/],
    ['a zero withdrawal rate', { ...minimal, assumptions: { withdrawalRate: 0 } }, /withdrawalRate/],
    ['a 100% tax rate', { ...minimal, assumptions: { taxRate: 1 } }, /taxRate/],
    ['assumptions that are not an object', { ...minimal, assumptions: [] }, /assumptions/],
  ])('rejects %s', (_label, raw, message) => {
    expect(() => parseFirmConfig(raw, 'bad')).toThrow(message)
  })

  it('names the firm in the error', () => {
    expect(() => parseFirmConfig({}, 'acme')).toThrow(/clients\/acme\.json/)
  })

  it('rejects ids that are not lowercase slugs', () => {
    expect(() => parseFirmConfig(minimal, 'Acme Co')).toThrow(/id/)
  })
})

const firm = (id: string): FirmConfig => parseFirmConfig({ ...minimal, name: id }, id)
const firms = [firm('default'), firm('sample-company'), firm('example-wealth')]

describe('selectFirm', () => {
  it('uses the default firm when nothing is chosen', () => {
    expect(selectFirm(firms, { search: '', locked: false }).id).toBe('default')
  })

  it('picks a firm from the ?firm= URL param', () => {
    expect(selectFirm(firms, { search: '?firm=sample-company', locked: false }).id).toBe('sample-company')
    expect(selectFirm(firms, { search: '?a=1&firm=example-wealth', locked: false }).id).toBe('example-wealth')
  })

  it('falls back to the default for an unknown firm', () => {
    expect(selectFirm(firms, { search: '?firm=nobody', locked: false }).id).toBe('default')
  })

  it('ignores the URL param in a build locked to one firm', () => {
    const only = [firm('sample-company')]
    expect(selectFirm(only, { search: '?firm=example-wealth', locked: true }).id).toBe('sample-company')
  })

  it('uses the first firm when there is no default', () => {
    expect(selectFirm([firm('a'), firm('b')], { search: '', locked: false }).id).toBe('a')
  })

  it('throws when there are no firms at all', () => {
    expect(() => selectFirm([], { search: '', locked: false })).toThrow(/no firm configs/i)
  })
})

describe('firmsToBundle', () => {
  const ids = ['default', 'example-wealth', 'sample-company']

  it('bundles every firm when FIRM is not set', () => {
    expect(firmsToBundle(ids, undefined)).toEqual(ids)
    expect(firmsToBundle(ids, '')).toEqual(ids)
  })

  it('bundles only the chosen firm when FIRM is set', () => {
    expect(firmsToBundle(ids, 'sample-company')).toEqual(['sample-company'])
  })

  it('fails the build when FIRM names a firm that does not exist', () => {
    expect(() => firmsToBundle(ids, 'acme')).toThrow(/FIRM=acme.*default, example-wealth, sample-company/)
  })
})

describe('readableInk', () => {
  it('uses white text on dark accents and dark text on light ones', () => {
    expect(readableInk('#1f6f62')).toBe('#ffffff')
    expect(readableInk('#000000')).toBe('#ffffff')
    expect(readableInk('#5cc2ac')).toBe('#0f1614')
    expect(readableInk('#ffffff')).toBe('#0f1614')
  })

  it('accepts 3-digit hex', () => {
    expect(readableInk('#fff')).toBe('#0f1614')
  })
})

describe('themeCss', () => {
  it('sets the accent variables for light and dark mode', () => {
    const css = themeCss({ accent: '#1f6f62', accentDark: '#5cc2ac' })
    expect(css).toContain(':root{--accent:#1f6f62;--accent-ink:#ffffff;--p50:#1f6f62;--band:rgba(31, 111, 98, 0.12);}')
    expect(css).toContain(
      '@media (prefers-color-scheme: dark){:root{--accent:#5cc2ac;--accent-ink:#0f1614;--p50:#5cc2ac;--band:rgba(92, 194, 172, 0.14);}}',
    )
  })
})
