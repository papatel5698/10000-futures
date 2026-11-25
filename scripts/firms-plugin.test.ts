import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { firmsPlugin, readFirms } from './firms-plugin'

const CLIENTS = resolve(__dirname, '../clients')

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'firms-'))
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
  return dir
}

const cfg = (name: string, extra: object = {}) => JSON.stringify({ name, colors: { accent: '#123456' }, ...extra })

describe('readFirms', () => {
  it('reads every config, sorted by id, with the default first', () => {
    const dir = fixture({ 'zeta.json': cfg('Zeta'), 'default.json': cfg('Default'), 'alpha.json': cfg('Alpha'), 'notes.txt': 'x' })
    const { firms, locked } = readFirms(dir, undefined)
    expect(firms.map((f) => f.id)).toEqual(['default', 'alpha', 'zeta'])
    expect(locked).toBe(false)
  })

  it('bundles only the FIRM firm and marks the build locked', () => {
    const dir = fixture({ 'default.json': cfg('Default'), 'alpha.json': cfg('Alpha') })
    const { firms, locked } = readFirms(dir, 'alpha')
    expect(firms.map((f) => f.id)).toEqual(['alpha'])
    expect(locked).toBe(true)
  })

  it('inlines the logo file as a data URI', () => {
    const dir = fixture({ 'alpha.json': cfg('Alpha', { logo: 'alpha.svg' }), 'alpha.svg': '<svg/>' })
    const [firm] = readFirms(dir, undefined).firms
    expect(firm.logo).toBe('data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'))
  })

  it.each([
    ['a path outside clients/', '../secret.svg'],
    ['a remote URL', 'https://example.com/logo.svg'],
    ['an unsupported type', 'alpha.gif'],
  ])('rejects a logo that is %s', (_label, logo) => {
    const dir = fixture({ 'alpha.json': cfg('Alpha', { logo }) })
    expect(() => readFirms(dir, undefined)).toThrow(/logo/)
  })

  it('fails on a missing logo file', () => {
    const dir = fixture({ 'alpha.json': cfg('Alpha', { logo: 'alpha.png' }) })
    expect(() => readFirms(dir, undefined)).toThrow(/alpha\.png/)
  })

  it('fails on invalid JSON, naming the file', () => {
    const dir = fixture({ 'alpha.json': '{nope' })
    expect(() => readFirms(dir, undefined)).toThrow(/clients\/alpha\.json/)
  })

  it('fails on an invalid config', () => {
    const dir = fixture({ 'alpha.json': JSON.stringify({ name: 'Alpha' }) })
    expect(() => readFirms(dir, undefined)).toThrow(/colors\.accent/)
  })

  it('fails when there are no configs', () => {
    expect(() => readFirms(fixture({}), undefined)).toThrow(/no firm configs/i)
  })
})

describe('the shipped client configs', () => {
  const { firms } = readFirms(CLIENTS, undefined)

  it('are all valid and include the default and two sample firms', () => {
    expect(firms.map((f) => f.id)).toEqual(['default', 'example-wealth', 'sample-company'])
    expect(firms.find((f) => f.id === 'sample-company')?.name).toBe('Sample Company Planning')
  })

  it('give each sample firm its own logo and assumptions', () => {
    const [def, ...samples] = firms
    for (const f of samples) {
      expect(f.logo).toMatch(/^data:image\/svg\+xml;base64,/)
      expect(f.assumptions).not.toEqual(def.assumptions)
    }
  })
})

describe('firmsPlugin', () => {
  it('serves the firms as the virtual:firms module', () => {
    const dir = fixture({ 'default.json': cfg('Default') })
    const plugin = firmsPlugin({ dir, envFirm: undefined })
    const id = plugin.resolveId('virtual:firms')
    expect(id).toBe('\0virtual:firms')
    expect(plugin.resolveId('other')).toBeUndefined()
    const code = plugin.load(id!)!
    expect(code).toMatch(/^export default /)
    const data = JSON.parse(code.replace(/^export default /, ''))
    expect(data.locked).toBe(false)
    expect(data.firms[0].name).toBe('Default')
    expect(plugin.load('other')).toBeUndefined()
  })
  const html = '<head><meta name="description" content="A Monte Carlo retirement planner." /><title>10,000 Futures</title></head>'

  it('puts the firm name in the page title and description of a locked build', () => {
    const dir = fixture({ 'alpha.json': cfg('Alpha & Co') })
    const out = firmsPlugin({ dir, envFirm: 'alpha' }).transformIndexHtml(html)
    expect(out).toContain('<title>Alpha &amp; Co · Retirement planner</title>')
    expect(out).toContain('content="Alpha &amp; Co retirement planner: see 10,000 possible futures for your savings."')
    expect(out).not.toContain('Monte Carlo retirement planner.')
  })

  it('leaves the page title alone when not locked', () => {
    const dir = fixture({ 'alpha.json': cfg('Alpha') })
    expect(firmsPlugin({ dir, envFirm: undefined }).transformIndexHtml(html)).toBe(html)
  })
})
