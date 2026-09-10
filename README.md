# NVIDIA Nemotron v1.0 Beta — Foundation Milestone 1

Frontend-only, static, GitHub Pages-ready. No frameworks, no build step —
plain HTML, CSS, and vanilla JS.

## What's included

| File | Purpose |
|---|---|
| `index.html` | Landing page (hero, features, model highlights, CTA) + component showcase |
| `onboarding.html` | Welcome / onboarding flow (3-step) |
| `auth.html` | Standalone sign-in mockup (frontend only, no backend) |
| `design-system.css` | Design tokens only — color, type, spacing, radius, shadow, motion |
| `styles.css` | Reset, layout, and every reusable component |
| `app.js` | Vanilla JS behavior: splash, drawer, modals, toasts, dropdown, context menu, offline detection |
| `assets/logo/` | Nemotron logo exported at all required sizes + Apple touch icon |
| `assets/favicon.ico` | Multi-size favicon (16/32/48) |
| `assets/icons/sprite.svg` | Standalone icon sprite (also inlined in each HTML page for static-host reliability) |
| `site.webmanifest` | PWA-style manifest referencing the Nemotron icon set |
| `.nojekyll` | Disables Jekyll processing on GitHub Pages |

## Design tokens

- **Color:** black `#0A0A0A`, graphite scale `#121212`→`#8A8A8A`, white, NVIDIA Green `#76B900` as the only accent.
- **Type:** Inter (UI/body), JetBrains Mono (data/spec labels), 8px baseline spacing scale.
- **Radius:** 24px on cards (`--radius-card`), 12–16px on modals/menus, full-round on chips/switches.
- **Surfaces:** glassmorphism (`.glass`, `.card--glass`, navbar, modal scrim) via `backdrop-filter` + low-opacity white borders.
- **Motion:** one page-load moment (splash pulse, hero mark fade-in) + purposeful hover/open transitions; all durations collapse under `prefers-reduced-motion`.

## Components (all in `styles.css`)

Buttons (primary/secondary/ghost/danger, sizes, loading, disabled), inputs
(with icons, error state, password toggle), switches, dropdowns, chips,
badges, cards (static/interactive/glass), modals (info, confirmation,
auth), tooltips, context menus, toasts, skeleton loaders, empty states,
offline banner, navbar + mobile drawer, splash screen.

## Explicitly out of scope for this milestone

Chat interface, settings, profile pages, and client-side routing — these
land in later milestones.

## Deploying

Push this folder to a GitHub repo and enable Pages on the root (or `/docs`).
No build step required.
