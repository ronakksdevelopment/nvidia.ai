# NVIDIA Nemotron v1.0 Beta — Foundation Milestone 1

Frontend-only, static, GitHub Pages-ready. No frameworks, no build step —
plain HTML, CSS, and vanilla JS.

## Folder structure

```
.
├── index.html                  # Landing page + component showcase (entry point)
├── site.webmanifest            # PWA-style manifest
├── .nojekyll                   # Disables Jekyll processing on GitHub Pages
├── README.md
│
├── pages/                      # Secondary standalone pages
│   ├── onboarding.html         # 3-step welcome / onboarding flow
│   └── auth.html               # Sign-in mockup (frontend only, no backend)
│
├── css/
│   ├── design-system.css       # Tokens only — color, type, spacing, radius, shadow, motion
│   └── styles.css              # Reset, layout, and every reusable component
│
├── js/
│   └── app.js                  # Vanilla JS: splash, drawer, modals, toasts, dropdown,
│                                # context menu, offline detection
│
└── assets/
    ├── logo/                   # Nemotron logo exported at all required sizes
    │   ├── nemotron-logo-source.png
    │   ├── nemotron-16.png … nemotron-512.png
    │   └── apple-touch-icon.png
    ├── favicon/
    │   └── favicon.ico         # Multi-size favicon (16/32/48)
    └── icons/
        └── sprite.svg          # Standalone reference icon sprite
                                 # (icons actually used on each page are also
                                 # inlined in that page's HTML for reliability
                                 # on static hosts — no cross-file SVG fetch)
```

## Design tokens

- **Color:** black `#0A0A0A`, graphite scale `#121212`→`#8A8A8A`, white, NVIDIA Green `#76B900` as the only accent.
- **Type:** Inter (UI/body), JetBrains Mono (data/spec labels), 8px baseline spacing scale.
- **Radius:** 24px on cards (`--radius-card`), 12–16px on modals/menus, full-round on chips/switches.
- **Surfaces:** glassmorphism (`.glass`, `.card--glass`, navbar, modal scrim) via `backdrop-filter` + low-opacity white borders.
- **Motion:** one page-load moment (splash pulse, hero mark fade-in) + purposeful hover/open transitions; all durations collapse under `prefers-reduced-motion`.

## Components (all in `css/styles.css`)

Buttons (primary/secondary/ghost/danger, sizes, loading, disabled), inputs
(with icons, error state, password toggle), switches, dropdowns, chips,
badges, cards (static/interactive/glass), modals (info, confirmation,
auth), tooltips, context menus, toasts, skeleton loaders, empty states,
offline banner, navbar + mobile drawer, splash screen.

## Explicitly out of scope for this milestone

Chat interface, settings, profile pages, and client-side routing — these
land in later milestones.

## Deploying to GitHub Pages

1. Push this repo (with this exact folder structure) to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to the `main` branch, root folder (`/`).
4. Save — your site will publish at `https://<username>.github.io/<repo>/`.

No build step, no dependencies to install. `index.html` at the repo root
is the entry point; `pages/onboarding.html` and `pages/auth.html` are
reached via relative links from there in later milestones.
