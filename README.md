# Nemotron — Chat with free NVIDIA models via OpenRouter

A complete, static, GitHub Pages-ready chat application for NVIDIA's open
Nemotron model family. No frameworks, no build step, no backend server —
plain HTML, CSS, and vanilla JavaScript, from the landing page to the live
chat experience to offline support. Chat runs on real OpenRouter API calls
using your own free API key, with real streaming responses from NVIDIA's
free Nemotron models.

**Live demo:** deploy to GitHub Pages (see below) — no build step required.

---

## Table of contents

- [What this is](#what-this-is)
- [Features](#features)
- [Model catalog](#model-catalog)
- [Getting an OpenRouter API key](#getting-an-openrouter-api-key)
- [Folder structure](#folder-structure)
- [How chat works](#how-chat-works)
- [Accounts and guest mode](#accounts-and-guest-mode)
- [Settings](#settings)
- [Progressive Web App support](#progressive-web-app-support)
- [GitHub Pages routing and 404 handling](#github-pages-routing-and-404-handling)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Dependencies](#dependencies)
- [Browser support notes](#browser-support-notes)
- [Credits & Attribution](#credits--attribution)

---

## What this is

- Bring your own free [OpenRouter](https://openrouter.ai/keys) API key.
- Chat with real-time streaming responses from NVIDIA's free Nemotron
  models, switchable per conversation from the model picker (grouped into
  Text, Embedding, and Rerank).
- Sign in with a local, on-device identity (name and email, no password,
  no server) or use guest mode, where nothing is saved at all.
- Conversation history persists in your browser for signed-in sessions and
  is never saved for guest sessions.
- Incognito Mode, toggled per conversation from the chat topbar: while
  it's on, that conversation is never written to `localStorage`, even for
  a signed-in session. It resets on reload and is independent of guest vs.
  signed-in identity.
- Installable as a Progressive Web App, with offline support for the app
  shell.

There is no application server. Every request to OpenRouter is made
directly from your browser using your own API key, and everything the app
remembers (your identity, your API key, your model and theme choice, and
your chat history) is stored only in your browser's local storage.

## Features

- **Real streaming chat** — token-by-token responses straight from
  OpenRouter, with a Stop button that aborts mid-stream and plain-language
  error messages instead of raw API output.
- **Sidebar conversation history** — searchable, collapsible, grouped by
  Today / Yesterday / Previous 7 days / Previous 30 days / Older.
- **Animated, renamable chat titles** — a short title is generated
  instantly from your first message (and later upgraded to a
  model-written summary), typing in with a brief animation. Hover any
  conversation to reveal a pen icon for inline rename.
- **Per-message actions** — copy, edit (resubmits and truncates from that
  point), and regenerate.
- **Markdown rendering** — dependency-free renderer with syntax-highlighted
  code blocks, copy-to-clipboard, and scrollable tables.
- **Attachments** — image and file attachments with drag-and-drop.
- **Keyboard shortcuts** — press `Shift+?` for the full list.
- **Model picker grouped by category** — Text / Embedding / Rerank section
  labels above the relevant models in the chat topbar dropdown.
- **Live usage tracking** — a ticking session/weekly usage bar with a real
  reset countdown, persisted across reloads.
- **Local accounts + guest mode** — no backend, no password; see
  [Accounts and guest mode](#accounts-and-guest-mode).
- **Incognito Mode** — per-conversation, never persisted.
- **Dark / Light / System theming**, synced with `prefers-color-scheme`.
- **Numbered FAQ accordion** — a terminal-style, rail-numbered help section
  on the Help page, searchable.
- **Progressive Web App** — installable, works offline for the app shell.
- **Fully responsive** — no horizontal scroll on any screen size, from
  small phones to wide desktop monitors.

## Model catalog

All models below are free on OpenRouter, organized the same way the app's
model picker and About page group them.

**Text (5)**

| Model | Notes |
|---|---|
| NVIDIA: Llama 3.1 Nemotron 70B Instruct | free |
| NVIDIA: Llama 3.3 Nemotron Super 49B V1 | free |
| NVIDIA: Llama 3.3 Nemotron Super 49B V1: Reasoning | free |
| NVIDIA: Nemotron Nano 9B V2 | free |
| NVIDIA: Nemotron 3 Nano Omni 4B V1 | free |

**Embedding (2)**

| Model | Notes |
|---|---|
| NVIDIA: NV-Embed-v2 | free |
| NVIDIA: NV-EmbedQA-E5-v5 | free |

**Rerank (1)**

| Model | Notes |
|---|---|
| NVIDIA: Llama Nemotron Rerank VL 1B V2 | free |

The chat model picker (`pages/chat.html`) and Settings (`pages/settings.html`)
ship with their own default Nemotron chat-model lineup, independent of this
catalog table — see `js/settings.js` if you want to point the app at a
different set of OpenRouter model IDs.

## Getting an OpenRouter API key

1. Create a free account at [openrouter.ai](https://openrouter.ai).
2. Generate a key from the [Keys page](https://openrouter.ai/keys). Keys
   start with `sk-or-v1-`.
3. Paste it into **Settings → General & OpenRouter** in this app and click
   Save. Optionally click "Send test message" to confirm the connection
   works.

Usage of the free `:free` model variants is subject to OpenRouter's own
rate limits and terms.

## Folder structure

```
.
├── index.html                  # Landing page (entry point)
├── 404.html                    # GitHub Pages fallback, redirects to index.html
├── manifest.json               # PWA manifest (icons, shortcuts, install metadata)
├── sw.js                       # Service worker: offline app-shell caching
├── .nojekyll                   # Disables Jekyll processing on GitHub Pages
├── README.md
│
├── pages/
│   ├── onboarding.html         # 3-step welcome / model-choice flow
│   ├── auth.html                # Sign-in page (local account + guest option)
│   ├── chat.html                 # Full chat experience (real OpenRouter streaming)
│   ├── settings.html             # API key, model, and theme settings
│   ├── profile.html              # Account overview and sign-out
│   ├── about.html                 # About the project + model catalog tabs
│   ├── help.html                  # Help and FAQ
│   ├── privacy.html               # Privacy policy
│   └── terms.html                 # Terms of service
│
├── css/
│   ├── design-system.css       # Tokens: color, type, spacing, radius, shadow, motion (dark + light)
│   ├── styles.css               # Reset, layout, and every reusable component
│   ├── chat.css                  # Chat-only styles: sidebar, composer, bubbles, code blocks
│   └── settings.css              # Settings-shell layout shared by Settings/Profile/About/Help/Privacy/Terms
│
├── js/
│   ├── app.js                  # Shared behavior: splash, drawer, modals, toasts, dropdowns,
│   │                            # offline detection, SW registration, install prompt, guest-mode entry
│   ├── router.js                # Base-path detection, active-nav marking, 404 recovery
│   ├── session.js               # Account/guest identity, theme application, session guard
│   ├── captcha.js                # "I'm not a robot" checkbox + email validation on auth forms
│   ├── chat.js                   # Chat behavior: real OpenRouter streaming, history, markdown/syntax
│   │                              # rendering, composer, attachments, shortcuts, title generation
│   ├── settings.js               # Settings page: API key validation, persistence, live OpenRouter test call
│   ├── tooltip.js                # Shared tooltip behavior
│   └── settings-nav.js           # Shared mobile nav for the settings-shell pages, plus FAQ accordion
│
└── assets/
    ├── logo/                   # Nemotron logo exported at all required sizes
    ├── favicon/
    │   └── favicon.ico
    └── icons/
        └── sprite.svg          # Reference icon sprite (icons used on each page are also
                                 # inlined in that page's HTML for reliability on static hosts)
```

## How chat works

`js/chat.js` calls OpenRouter's `/chat/completions` endpoint directly from
the browser, with `stream: true`, using the API key saved in Settings. The
response is a server-sent-events stream that's parsed and rendered token by
token as it arrives, with a blinking caret while generating and a Stop
button that aborts the request mid-stream. Errors from OpenRouter (an
invalid key, a rate limit, a model outage) are shown as plain-language
messages instead of raw API output.

Conversation history for signed-in sessions is saved to `localStorage` so
it survives a reload; guest sessions never write to `localStorage`, so
guest chat history disappears as soon as the tab closes.

A short conversation title is generated locally the moment you send your
first message (no network round-trip), then upgraded to a short
model-written summary once the first reply completes — both transitions
animate into the sidebar rather than popping in instantly.

## Accounts and guest mode

There is no backend, so "signing in" creates a local identity (name and
email you provide) stored in `localStorage` on your device, with no
password. Guest mode skips this entirely: `js/session.js` probes whether
`localStorage`/`sessionStorage` are actually writable (private/incognito
windows sometimes throw or silently no-op), and guest identity is held in
`sessionStorage` or in memory, never in `localStorage`, so it never
survives a closed tab, in any browser mode.

Pages that require an active session (chat, settings, profile) use a
`data-requires-session` guard on `<body>`: a visitor with no account and no
guest session is redirected to sign-in instead of seeing placeholder
account data.

## Settings

`pages/settings.html` and `js/settings.js` provide: an OpenRouter API key
field with format validation and a show/hide toggle; a model picker with
live metadata (parameters, context length, tags) for all 8 free models; a
Dark/Light/System theme selector that syncs with `prefers-color-scheme`;
Save/Discard/Reset with a confirmation modal; and a real "Test connection"
button that sends a live request to OpenRouter using your saved key and
prints the actual response.

## Progressive Web App support

- `manifest.json` declares the app name, theme colors, a full icon set,
  and shortcuts to New Chat, Continue as Guest, and Settings.
- `sw.js` registers relative to wherever the page is served from (root or
  a GitHub Pages project sub-path) and caches the app shell on install.
  Navigations use network-first with a cached fallback; static assets use
  cache-first with background revalidation. Cross-origin requests (Google
  Fonts, the OpenRouter API) always go straight to the network and are
  never cached, so API keys and responses are never written to the cache.
- The cache is versioned (`CACHE_VERSION` in `sw.js`); bump it on any
  deploy that changes cached files so returning visitors converge on the
  latest shell within one reload.

## GitHub Pages routing and 404 handling

GitHub Pages serves this project as static files with no server-side
rewrites, so a hard refresh or a shared deep link to a non-literal path
would otherwise 404 with no way back. `404.html` records the attempted
path in `sessionStorage`, then redirects to `index.html` resolved relative
to the detected project base (so this also works at a project sub-path),
with a `<meta http-equiv="refresh">` fallback for visitors with JavaScript
disabled. `js/router.js` reads that flag on the page it lands on and shows
a one-time toast explaining what happened, and marks the correct nav link
as `aria-current="page"` on every page automatically.

## Deploying to GitHub Pages

1. Push this repo (with this exact folder structure) to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to the `main` branch, root folder (`/`).
4. Save. Your site publishes at `https://<username>.github.io/<repo>/`.

No build step, no dependencies to install, no environment variables.
`index.html` at the repo root is the entry point; every other page is
reached via relative links, so the exact same files also work unmodified
served from a custom domain at the root, or opened locally.

### Updating a deployed site

Because the service worker caches the app shell, a plain file overwrite on
GitHub Pages won't be picked up by returning visitors until you bump
`CACHE_VERSION` at the top of `sw.js`. The visitor's browser then fetches
the new `sw.js`, installs it, and activates it, which automatically
deletes the old cache. This is standard service-worker update behavior; no
manual cache-busting of individual files is required.

## Dependencies

This is a no-build, vanilla HTML/CSS/JS project with two external
dependencies, both loaded via CDN on every page:

- [Font Awesome 6](https://fontawesome.com/) (free icon set) for UI icons
  (nav, buttons, status indicators, and so on).
- [Google Fonts](https://fonts.google.com/) for Barlow (the NVIDIA-style UI
  typeface) and JetBrains Mono (used for code, model IDs, and other
  monospace content).

These are the only third-party assets the app loads; everything else —
layout, theming, chat streaming, storage — is hand-written with no
framework and no package manager. If you deploy somewhere that blocks
third-party CDNs, icons and custom fonts will silently fall back to the
system default but the app otherwise keeps working, since no functionality
depends on either loading successfully.

## Browser support notes

- Service worker registration and the install prompt both no-op safely on
  browsers that don't support them (for example, no `beforeinstallprompt`
  on Firefox/Safari); the site remains fully functional, just without the
  install affordance or offline caching on those browsers.
- Guest mode and normal sign-in both work with `localStorage` disabled
  entirely (private browsing, enterprise policy, or embedded webviews);
  the only difference is that a "signed-in" session in that situation also
  behaves like a guest session, since there is nowhere on-device to
  persist it. This is expected behavior: the app never loses data it never
  had permission to keep.
- Layout is tested to avoid horizontal scroll across phone, tablet, and
  desktop widths, including the chat model dropdown and the About page's
  model category tabs.

## Credits & Attribution

This project uses **NVIDIA Nemotron models**, accessed through
**OpenRouter**, to generate every AI response in chat. Model access,
routing, and free-tier availability are provided by OpenRouter — credit to
OpenRouter for making these models reachable with a single API key. Model
availability, rate limits, and performance depend on OpenRouter and on the
specific NVIDIA model selected, and may change at any time. See About →
Credits & Attribution in the app for the same information with a direct
link to browse NVIDIA's models on OpenRouter.
