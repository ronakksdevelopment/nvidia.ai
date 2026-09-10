# NVIDIA Nemotron v1.0 Beta — Foundation Milestone 1 + Chat Milestone 2

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
│   ├── auth.html                # Sign-in mockup (frontend only, no backend)
│   └── chat.html                # Chat Milestone 2 — full chat experience (entry point)
│
├── css/
│   ├── design-system.css       # Tokens only — color, type, spacing, radius, shadow, motion
│   ├── styles.css              # Reset, layout, and every reusable component
│   └── chat.css                 # Chat-only styles: sidebar, composer, bubbles, code blocks
│
├── js/
│   ├── app.js                  # Vanilla JS: splash, drawer, modals, toasts, dropdown,
│   │                            # context menu, offline detection
│   └── chat.js                  # Chat-only behavior: history, streaming, markdown/syntax
│                                 # rendering, composer, attachments, shortcuts
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

## Chat Milestone 2 (`pages/chat.html`, `css/chat.css`, `js/chat.js`)

A complete, self-contained chat experience built on top of the Milestone 1
design system — vanilla HTML/CSS/JS, no dependencies, no build step.

- Collapsible sidebar (desktop push-collapse, tablet/mobile overlay drawer)
  with a New Chat button, searchable/highlighted conversation history
  grouped by Today / Yesterday / Previous 7 days / Previous 30 days / Older,
  per-item delete with confirm modal.
- Account menu (avatar, name, email, settings/profile stubbed as "Soon",
  keyboard shortcuts, log out) and a model-select badge/dropdown
  (Nano / Super / Ultra).
- Session token-usage indicator in both the sidebar footer and topbar,
  with a live progress bar that shifts to a warning color near the cap.
- Centered desktop composer and a bottom-docked, safe-area-aware composer
  on narrow/Android widths, with autosizing textarea, live char count,
  Enter-to-send / Shift+Enter-for-newline, attach button, file input, and
  full-surface drag-and-drop with an overlay dropzone.
- Image attachment previews (thumbnail chips in the composer, placeholder
  tiles in sent messages) and generic file chips for non-image uploads.
- Simulated token-by-token streaming with a blinking caret, an initial
  "thinking" typing indicator, and a Stop button that ends generation
  mid-stream.
- A small dependency-free Markdown renderer: headings, bold/italic, inline
  code, fenced code blocks with a lightweight regex syntax highlighter and
  a copy-to-clipboard button, ordered/unordered lists, blockquotes, links,
  horizontal rules, and GFM-style tables.
- Per-message actions: copy, edit-in-place (resubmits and truncates the
  conversation from that point), regenerate, and thumbs up/down feedback.
- Keyboard shortcuts modal (`Shift+?`) plus global bindings for new chat
  (`Ctrl/Cmd+Shift+O`), search (`Ctrl/Cmd+K`), sidebar toggle
  (`Ctrl/Cmd+B`), composer focus (`/`), and stop generation (`Esc`).
- Empty-state welcome screen with clickable prompt suggestions, a typing
  indicator for perceived-loading feedback, and consistent hover/focus
  states, reduced-motion handling, and ARIA labeling throughout.

All conversation/message state is in-memory for this milestone (reset on
reload) — no backend, no persistence layer, and no OpenRouter/model-routing
wiring yet; the model dropdown and token counter are UI-only simulations.

## Explicitly out of scope for this milestone

Settings pages, real model/OpenRouter integration, profile pages,
client-side routing, and PWA/offline persistence — these land in later
milestones.

## Deploying to GitHub Pages

1. Push this repo (with this exact folder structure) to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to the `main` branch, root folder (`/`).
4. Save — your site will publish at `https://<username>.github.io/<repo>/`.

No build step, no dependencies to install. `index.html` at the repo root
is the entry point; `pages/onboarding.html` and `pages/auth.html` are
reached via relative links from there in later milestones.
