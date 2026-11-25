# 001: How a deployment picks its firm config

**Status:** superseded by [002](002-single-user-product.md) (Nov 25, 2026). The per-firm config described here was built in #2 and removed in #20.

## Context

Each advisory firm gets its own branding and planning assumptions from `clients/<firm>.json`. The spec says the config is chosen "by URL param or build env var". We need both: the public demo has to show several firms side by side, and a real firm's deployment has to show only that firm. The site is static (GitHub Pages), so there's no server to pick a config per request.

## Options

1. **URL param only.** Bundle every config; `?firm=` picks one. Simple, but every firm's site would contain every other client's name and assumptions, and anyone could re-skin a firm's site as a competitor's by editing the URL.
2. **Build env var only.** One build per firm. Clean for clients, but the demo would need a separate deployment per sample firm.
3. **Both, with the env var winning.** `FIRM=<id>` bundles only that config and locks it. Without `FIRM`, all configs are bundled and `?firm=` picks one.
4. **Fetch the config at runtime** from `/clients/<id>.json`. Lets ops change assumptions without a rebuild, but a bad file breaks the live page instead of the build, and every firm's file still sits on the public host.

## Choice

Option 3. A Vite plugin (`scripts/firms-plugin.ts`) reads `clients/`, validates every config and serves the result as the `virtual:firms` module. With `FIRM` set, it bundles that one firm, marks the build locked, and fails the build if the id doesn't exist.

Why:

- **Client confidentiality.** A firm's build contains no other firm's name, logo or assumptions. This matters more than convenience; client lists are sensitive for advisory firms.
- **Fail at build time, not in a meeting.** Configs are checked (field types, hex colors, rate ranges like `6.5` vs `0.065`) before deploy. Runtime fetching (option 4) would surface the same errors in front of a client.
- **One demo site.** `?firm=sample-company` and `?firm=example-wealth` show white-labeling on the existing GitHub Pages deploy.
- **Logos travel with the config.** Logos are inlined as data URIs, so a firm is `clients/<id>.json` plus an optional logo file. There's no shared `public/` folder full of other firms' logos.

Trade-off: changing a firm's assumptions needs a rebuild and redeploy. At one deployment per firm with CI deploys on push, that's minutes, and the change gets a reviewed PR.

Saved plans are stored per firm (`ten-thousand-futures:plan:v1:<id>`; the default firm keeps the original key so existing visitors don't lose their plan). Otherwise switching `?firm=` would load one firm's saved assumptions into another firm's page.
