# GRIDO1 Racing Systems — Kimi Antonelli Platform

Premium Formula 1 driver platform rebuilt from a single-file scrollytelling demo into a
production-ready, static-first **Astro 5** site with a typed data layer, self-hosted assets,
i18n (EN/AR + RTL), accessibility, tests, and a full route map.

## Quick start

```bash
npm install
npm run dev        # dev server → http://localhost:4321
npm run build      # static build → dist/
npm run preview    # preview the production build
npm run test       # vitest unit tests (springs, countdown, data integrity)
npm run check      # astro check (TypeScript strict)
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run assets:download` | Mirror the remote design assets into `public/assets` (self-hosting) |
| `npm run fonts:fetch` | Download Google Fonts as local woff2 + generate `src/styles/fonts.css` |
| `npm run images:optimize` | Generate AVIF/WebP variants of the hero portrait (`me.png` → `me.avif`/`me.webp`) |

## Architecture

```
src/
  types/        Typed data contracts (Driver, Season, Circuit, Journal, Product…)
  data/         JSON content — the single source of truth (no hard-coded numbers in markup)
  lib/          api.ts (typed access layer) + motion engines:
                  ticker.ts     unified rAF loop w/ per-subscriber throttling
                  spring.ts     damped-spring physics
                  reveal.ts     text split + spring reveal (reduced-motion aware)
                  canvasFx.ts   marching-squares contours, checker dissolve, halftone
                  scrollStack.ts pinned-panel recede effect
                  circuit.ts    SVG track draw-on + reticle
                  menu.ts       accessible mobile sheet (focus trap)
                  loader.ts     progress-driven loader (min 600ms, 4s watchdog)
                  assets.ts     preload tracking, error banner, local→CDN fallback
                  countdown.ts  timezone-aware race countdown
                  i18n.ts       EN/AR runtime swap + RTL
                  consent.ts    cookie consent → consent-gated GA4
  scripts/      home.ts (page orchestrator), helmet.ts (Three.js island)
  components/   SiteHeader, SiteFooter, MobileSheet, Loader
  layouts/      BaseLayout (SEO, JSON-LD, OG/Twitter, consent, i18n runtime)
  pages/        index, driver[/slug], season, journal[/slug], next-race,
                garage, store[/slug], legal, 404
  styles/       tokens.css (design tokens), global.css, home.css, fonts.css
```

### Routes

`/` · `/driver` · `/driver/kimi-antonelli` · `/season` · `/journal` · `/journal/[slug]` ·
`/next-race` · `/garage` · `/store` · `/store/[slug]` · `/legal` · `/404`

## Key engineering decisions

- **Data integrity is tested.** `tests/data.test.ts` proves the hero stats and season
  standings derive from one source and that points/wins/podiums match the race-by-race
  results — the original demo had contradictory numbers.
- **Nothing stays hidden without JS.** The `.no-js` class + `<noscript>`-equivalent CSS
  reveals all text if any script fails; the loader self-dismisses via a 4s watchdog.
- **Self-hosted everything**: fonts (woff2), Three.js & Lenis (npm bundles), all imagery
  and the GLB/HDRL models under `public/assets` — with a runtime fallback to the original
  asset origin if a file is missing.
- **Three.js is code-split**: dynamically imported only on the homepage hero; rendering
  pauses when the tab is hidden or the hero is scrolled past.
- **Reduced motion is honored everywhere** (instant reveals, static circuit, no Lenis).

## Configuration

Copy `.env.example` → `.env`:

- `SITE_URL` — canonical origin (SEO + sitemap)
- `STRIPE_PUBLISHABLE_KEY` + per-product `stripePaymentLink` in `src/data/products.json`
- `GA_MEASUREMENT_ID` — enables consent-gated analytics
- `ASSET_FALLBACK_ORIGIN` — fallback host for mirrored assets

## Content editing

All content lives in `src/data/*.json` (driver, season, calendar, circuits, timeline,
journal, products, garage). Update those files — every page and stat updates automatically.
