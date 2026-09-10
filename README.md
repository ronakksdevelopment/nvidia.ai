# NVIDIA Nemotron v1.0 Beta — Production Release

Frontend-only, static, GitHub Pages-ready. No frameworks, no build step, no
backend — plain HTML, CSS, and vanilla JS, from the landing page to the
chat experience to offline support.

This release completes **Production Milestone 4**, the final milestone on
top of Foundation Milestone 1, Chat Milestone 2, and the Settings/Profile/
Legal-pages milestone that preceded it. Nothing from earlier milestones was
redesigned — this pass adds routing, PWA/offline support, guest mode, and
final polish on top of the existing design system and components.

## What's new in this release

- **Guest mode** — "Continue as guest" on the sign-in/sign-up modals and
  the sign-in page. Guest sessions never touch `localStorage`; identity is
  held in `sessionStorage` (or in memory if even that is blocked), so nothing
  survives a closed tab. This is the same outcome whether the browser is in
  a normal window or a private/incognito one — there's no separate code
  path for incognito, because guest mode never attempts persistent storage
  in the first place.
- **Progressive Web App support** — a real `manifest.json` (icons, maskable
  purpose, app shortcuts for New Chat / Continue as Guest / Settings), a
  versioned service worker (`sw.js`) that caches the app shell for offline
  use, and an install-prompt hook (`[data-install-app]`) any page can opt
  into.
- **GitHub Pages routing** — `js/router.js` resolves every internal path
  relative to a detected base, so the site works identically at a domain
  root or at a project sub-path (`https://user.github.io/repo/`). `404.html`
  catches broken/deep links (GitHub Pages has no server-side rewrites) and
  redirects to the homepage with a one-time explanatory toast.
- **Session-aware identity** — `js/session.js` is the single source of
  truth for "who's using this session right now." The chat sidebar,
  account menu, and profile page all read from it via `data-account-*`
  attributes instead of a hardcoded name, so guest sessions correctly show
  "Guest" everywhere the demo account used to be hardcoded.
- **Offline messaging** — the existing offline banner is joined by a
  one-shot toast on both the offline → online and online → offline
  transitions, so reconnecting after a longer stretch offline is actually
  noticed.
- **Accessibility & consistency pass** — active nav links now get
  `aria-current="page"` automatically (`router.js`) instead of being
  hand-maintained per file; a shared `[data-loading-on-submit]` hook keeps
  button loading states consistent across every form without duplicating
  the pattern per script.

Everything from earlier milestones — the design system, the full chat
experience, settings/profile/legal pages — is unchanged in behavior. See
below for what each milestone shipped.

## Folder structure

```
.
├── index.html                  # Landing page + component showcase (entry point)
├── 404.html                    # GitHub Pages fallback — redirects to index.html
├── manifest.json               # PWA manifest (icons, shortcuts, install metadata)
├── site.webmanifest            # Legacy manifest reference, kept for compatibility
├── sw.js                       # Service worker — offline app-shell caching
├── .nojekyll                   # Disables Jekyll processing on GitHub Pages
├── README.md
│
├── pages/                      # Secondary standalone pages
│   ├── onboarding.html         # 3-step welcome / onboarding flow
│   ├── auth.html                # Sign-in page (mock auth + guest option)
│   ├── chat.html                # Full chat experience (entry point for the app)
│   ├── settings.html            # API key, model, and theme settings
│   ├── profile.html             # Account/profile overview
│   ├── about.html                # About the project
│   ├── help.html                 # Help & FAQ
│   ├── privacy.html              # Privacy policy
│   └── terms.html                # Terms of service
│
├── css/
│   ├── design-system.css       # Tokens only — color, type, spacing, radius, shadow, motion
│   ├── styles.css              # Reset, layout, and every reusable component
│   ├── chat.css                 # Chat-only styles: sidebar, composer, bubbles, code blocks
│   └── settings.css             # Settings-shell layout shared by Settings/Profile/About/Help/Privacy/Terms
│
├── js/
│   ├── app.js                  # Shared behavior: splash, drawer, modals, toasts, dropdowns,
│   │                            # context menu, offline detection, SW registration, install
│   │                            # prompt, guest-mode entry points
│   ├── router.js                # Base-path detection, active-nav marking, 404 recovery
│   ├── session.js               # Guest/auth identity — storage-safe, incognito-safe
│   ├── chat.js                   # Chat-only behavior: history, streaming, markdown/syntax
│   │                              # rendering, composer, attachments, shortcuts
│   ├── settings.js               # Settings page: API key validation, persistence, OpenRouter test call
│   └── settings-nav.js           # Shared mobile nav for the settings-shell pages + FAQ accordion
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
offline banner, guest banner, navbar + mobile drawer, splash screen.

## Guest mode — how "nothing saves" is guaranteed

Guest mode is deliberately implemented as an absence of writes, not a
special-cased incognito detector:

1. `js/session.js` probes `localStorage` and `sessionStorage` once per page
   load. If either throws (private-mode quota restrictions, locked-down
   embeds, storage disabled by policy), it transparently falls back to an
   in-memory object that's scoped to that single page load.
2. `continueAsGuest()` sets a `sessionStorage` flag and explicitly clears
   any previously saved session — it never calls `localStorage.setItem`
   for anything related to guest identity.
3. Every page paints its account UI (`data-account-name`,
   `data-account-email`, `data-account-initials`, `data-account-plan`,
   `data-guest-only`, `data-authed-only`) from `NemotronSession.getAccount()`
   on load, so a guest always sees "Guest" and a visible reminder that the
   session isn't saved — never a stale cached identity.
4. Settings saved via `js/settings.js` (API key, model choice, theme) still
   use `localStorage` for signed-in sessions, exactly as before — guest
   mode doesn't change that path, it simply is never reached for a guest,
   since nothing in the guest flow calls `persistSettings()`.

The net effect: a guest in a normal window and a guest in a private/
incognito window behave identically — reload or close the tab, and the
session is gone either way.

## Chat experience (`pages/chat.html`, `css/chat.css`, `js/chat.js`)

A complete, self-contained chat experience built on top of the design
system — vanilla HTML/CSS/JS, no dependencies, no build step.

- Collapsible sidebar (desktop push-collapse, tablet/mobile overlay drawer)
  with a New Chat button, searchable/highlighted conversation history
  grouped by Today / Yesterday / Previous 7 days / Previous 30 days / Older,
  per-item delete with confirm modal.
- Account menu (avatar, name, email — driven by the active session, with a
  guest-only reminder banner when applicable), keyboard shortcuts, and a
  model-select badge/dropdown (Nano / Super / Ultra).
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

Conversation/message state remains in-memory for this release (reset on
reload) for both signed-in and guest sessions — this is intentional, not a
limitation of guest mode specifically: no chat backend exists yet.

## Settings, Profile & legal pages

- **Settings** (`pages/settings.html`, `js/settings.js`) — OpenRouter API
  key field with format validation and show/hide toggle, model picker with
  live metadata (context length, tags), theme selector (Dark/Light/System
  with `prefers-color-scheme` syncing), Save/Discard/Reset with a confirm
  modal, and a real fetch-based "Test connection" call to the OpenRouter
  chat-completions endpoint using the user's own key. All of it persists to
  `localStorage` on-device only — for signed-in sessions. A guest session
  never reaches this persistence path.
- **Profile** (`pages/profile.html`) — account summary driven by the active
  session, plus read-only stats sourced from saved settings (default model,
  key-set status, theme).
- **About / Help & FAQ / Privacy / Terms** — static content pages sharing
  the settings-shell side navigation (`css/settings.css`,
  `js/settings-nav.js`), including a self-contained FAQ accordion.

## Progressive Web App support

- `manifest.json` declares the app name, theme colors, a full icon set
  (including maskable variants for Android adaptive icons), and shortcuts
  to New Chat, Continue as Guest, and Settings.
- `sw.js` registers relative to wherever the page is served from (root or
  GitHub Pages sub-path) and caches the full app shell — every HTML page,
  every stylesheet, every script, and the icon set — on install.
  - **Navigations** use a network-first strategy with a cached fallback, so
    a flaky connection shows the last-known page instead of the browser's
    native offline screen.
  - **Static assets** use cache-first with a background revalidation
    (stale-while-revalidate), so repeat visits are instant and still stay
    fresh.
  - **Cross-origin requests** (Google Fonts, the OpenRouter API) always go
    straight to the network — the service worker never intercepts or
    caches them, so API keys and responses are never written to the cache.
- The cache is versioned (`CACHE_VERSION` in `sw.js`); bump it on any
  deploy that changes cached files so returning visitors converge on the
  latest shell within one reload.

## GitHub Pages routing & 404 handling

GitHub Pages serves this project as static files with no server-side
rewrites, so a hard refresh or a shared deep link to a non-literal path
would otherwise 404 with no way back. `404.html`:

1. Records the attempted path in `sessionStorage` (tab-scoped, never
   written to disk).
2. Redirects to `index.html`, resolved relative to the detected project
   base — so this also works correctly at a GitHub Pages project sub-path.
3. Uses a `<meta http-equiv="refresh">` fallback for visitors with
   JavaScript disabled.

`js/router.js` then reads that flag on the page it lands on and shows a
one-time toast explaining what happened, and marks the correct nav link as
`aria-current="page"` on every page automatically.

## Deploying to GitHub Pages

1. Push this repo (with this exact folder structure) to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to the `main` branch, root folder (`/`).
4. Save — your site will publish at `https://<username>.github.io/<repo>/`.

No build step, no dependencies to install, no environment variables.
`index.html` at the repo root is the entry point; every other page is
reached via relative links, so the exact same files also work unmodified
served from a custom domain at the root, or opened locally.

### Updating a deployed site

Because the service worker caches the app shell, a plain file overwrite on
GitHub Pages won't be picked up by returning visitors until:

1. You bump `CACHE_VERSION` at the top of `sw.js`.
2. The visitor's browser fetches the new `sw.js` (browsers check for SW
   updates on navigation), installs it, and activates it — which
   automatically deletes the old cache.

This is standard service-worker update behavior — no manual cache-busting
of individual files is required.

## Browser support notes

- Service worker registration and the install prompt both no-op safely on
  browsers that don't support them (e.g. no `beforeinstallprompt` on
  Firefox/Safari) — the site remains fully functional, just without the
  install affordance or offline caching on those browsers.
- Guest mode and normal sign-in both work with `localStorage` disabled
  entirely (private browsing, enterprise policy, or embedded webviews);
  the only difference is that a "signed-in" session in that situation also
  behaves like a guest session, since there's nowhere on-device to persist
  it. This is treated as correct behavior, not a bug — the app never
  loses data it never had permission to keep.
