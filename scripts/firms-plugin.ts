/**
 * Vite plugin that bundles firm configs from clients/ as the `virtual:firms` module.
 *
 * - Every config is validated at build time, so a bad config fails the build, not the page.
 * - With FIRM=<id> set, only that firm is bundled and the app ignores ?firm= (a client's
 *   deployment never ships other clients' names or branding).
 * - Logos are inlined as data URIs, so a firm's config and logo stay together in clients/.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_FIRM_ID, firmsToBundle, parseFirmConfig, type FirmConfig } from '../src/config/firm'

export interface BundledFirms {
  firms: FirmConfig[]
  locked: boolean
}

const LOGO_TYPES: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png' }
const LOGO_NAME = /^[a-z0-9-]+\.(svg|png)$/

function inlineLogo(dir: string, id: string, logo: unknown): unknown {
  if (typeof logo !== 'string') return logo
  const m = LOGO_NAME.exec(logo)
  if (!m) throw new Error(`clients/${id}.json: "logo" must be a .svg or .png file name in clients/, like "${id}.svg"`)
  const path = join(dir, logo)
  if (!existsSync(path)) throw new Error(`clients/${id}.json: logo file clients/${logo} not found`)
  return `data:${LOGO_TYPES[m[1]]};base64,${readFileSync(path).toString('base64')}`
}

export function readFirms(dir: string, envFirm: string | undefined): BundledFirms {
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort((a, b) => (a === DEFAULT_FIRM_ID ? -1 : b === DEFAULT_FIRM_ID ? 1 : a.localeCompare(b)))
  if (ids.length === 0) throw new Error(`No firm configs found in ${dir}`)

  const firms = firmsToBundle(ids, envFirm).map((id) => {
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'))
    } catch (e) {
      throw new Error(`clients/${id}.json: invalid JSON (${(e as Error).message})`)
    }
    if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>
      raw = { ...r, logo: inlineLogo(dir, id, r.logo) }
    }
    return parseFirmConfig(raw, id)
  })
  return { firms, locked: Boolean(envFirm) }
}

const VIRTUAL = 'virtual:firms'
const RESOLVED = '\0' + VIRTUAL

export function firmsPlugin(opts: { dir: string; envFirm: string | undefined }) {
  return {
    name: 'firms',
    resolveId(id: string) {
      return id === VIRTUAL ? RESOLVED : undefined
    },
    load(id: string) {
      return id === RESOLVED ? `export default ${JSON.stringify(readFirms(opts.dir, opts.envFirm))}` : undefined
    },
  }
}
