# NVIDIA Nemotron v1.5 - Chat with 8 free NVIDIA models via OpenRouter

A complete, static, GitHub Pages-ready chat application for NVIDIA's open
Nemotron model family. No frameworks, no build step, no backend server:
plain HTML, CSS, and vanilla JavaScript, from the landing page to the live
chat experience to offline support. Chat runs on real OpenRouter API calls
using your own free API key, with real streaming responses from any of the
eight free NVIDIA Nemotron models.

## What this is

- Bring your own free [OpenRouter](https://openrouter.ai/keys) API key.
- Chat with real-time streaming responses from any of 8 free NVIDIA
  Nemotron models, switchable per conversation from the model picker.
- Sign in with a local, on-device identity (name and email, no password,
  no server) or use guest mode, where nothing is saved at all.
- Conversation history persists in your browser for signed-in sessions and
  is never saved for guest sessions.
- Incognito Mode, toggled per conversation from the chat topbar: while
  it's on, that conversation is never written to localStorage, even for a
  signed-in session. It's an in-memory-only flag that resets on reload and
  is independent of guest vs. signed-in identity.
- Installable as a Progressive Web App, with offline support for the app
  shell.

There is no application server. Every request to OpenRouter is made
directly from your browser using your own API key, and everything the app
remembers (your identity, your API key, your model and theme choice, and
your chat history) is stored only in your browser's local storage.

## The 8 free models

| Model | ID | Best for |
|---|---|---|
| Nemotron 3 Ultra | `nvidia/nemotron-3-ultra-550b-a55b:free` | Frontier reasoning, long-running agents, 1M context |
| Nemotron 3 Super | `nvidia/nemotron-3-super-120b-a12b:free` | Balanced everyday reasoning, 1M context |
| Nemotron 3.5 Lightning | `nvidia/nemotron-3.5-lightning:free` | Fastest, high-throughput agentic workloads |
| Nemotron 3 Nano Omni (Reasoning) | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Compact multimodal reasoning, text and image input |
| Nemotron 3.5 Content Safety | `nvidia/nemotron-3.5-content-safety:free` | Prompt and response moderation, guardrails |
| Llama Nemotron Rerank VL 1B v2 | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` | Multimodal document reranking for RAG |
| Llama Nemotron Embed VL 1B v2 | `nvidia/llama-nemotron-embed-vl-1b-v2:free` | Multimodal embeddings |
| Nemotron 3 Embed 1B | `nvidia/nemotron-3-embed-1b:free` | High-throughput text embeddings |

All eight are free on OpenRouter and available directly from the model
picker in chat, or as the default model in Settings.

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
│   ├── chat.html                # Full chat experience (real OpenRouter streaming)
│   ├── settings.html            # API key, model, and theme settings
│   ├── profile.html             # Account overview and sign-out
│   ├── about.html                # About the project
│   ├── help.html                 # Help and FAQ
│   ├── privacy.html              # Privacy policy
│   └── terms.html                # Terms of service
│
├── css/
│   ├── design-system.css       # Tokens: color, type, spacing, radius, shadow, motion (dark + light)
│   ├── styles.css              # Reset, layout, and every reusable component
│   ├── chat.css                 # Chat-only styles: sidebar, composer, bubbles, code blocks
│   └── settings.css             # Settings-shell layout shared by Settings/Profile/About/Help/Privacy/Terms
│
├── js/
│   ├── app.js                  # Shared behavior: splash, drawer, modals, toasts, dropdowns,
│   │                            # offline detection, SW registration, install prompt,
│   │                            # guest-mode entry points
│   ├── router.js                # Base-path detection, active-nav marking, 404 recovery
│   ├── session.js               # Account/guest identity, theme application, session guard
│   ├── chat.js                   # Chat behavior: real OpenRouter streaming, history,
│   │                              # markdown/syntax rendering, composer, attachments, shortcuts
│   ├── settings.js               # Settings page: API key validation, persistence, live OpenRouter test call
│   └── settings-nav.js           # Shared mobile nav for the settings-shell pages, plus FAQ accordion
│
└── assets/
    ├── logo/                   # Nemotron logo exported at all required sizes
    ├── favicon/
    │   └── favicon.ico
    └── icons/
        └── sprite.svg          # Reference icon sprite (icons used on each page are
                                 # also inlined in that page's HTML for reliability
                                 # on static hosts, no cross-file SVG fetch)
```

## Dependencies

This is a no-build, vanilla HTML/CSS/JS project with exactly one external
dependency: [Font Awesome 6](https://fontawesome.com/) (free icon set),
loaded via the `cdnjs` CDN on every page for UI icons (nav, buttons,
status indicators, and so on). It's the only third-party script or
stylesheet the app loads; everything else — layout, theming, chat
streaming, storage — is hand-written with no framework and no package
manager. If you deploy somewhere that blocks third-party CDNs, icons will
silently fail to render but the app otherwise keeps working, since no
functionality depends on Font Awesome loading successfully.

## How chat works

`js/chat.js` calls OpenRouter's `/chat/completions` endpoint directly from
the browser, with `stream: true`, using the API key saved in Settings. The
response is a server-sent-events stream that's parsed and rendered token
by token as it arrives, with a blinking caret while generating and a Stop
button that aborts the request mid-stream. Errors from OpenRouter (an
invalid key, a rate limit, a model outage) are shown as plain-language
messages instead of raw API output.

Conversation history for signed-in sessions is saved to `localStorage` so
it survives a reload; guest sessions never write to `localStorage`, so
guest chat history disappears as soon as the tab closes.

Other chat features: a searchable, collapsible sidebar grouping
conversations by Today / Yesterday / Previous 7 days / Previous 30 days /
Older; per-message copy, edit (which resubmits and truncates the
conversation from that point), and regenerate; a dependency-free Markdown
renderer with syntax-highlighted code blocks and copy-to-clipboard; image
and file attachments with drag-and-drop; and keyboard shortcuts
(`Shift+?` for the full list).

## Accounts and guest mode

There is no backend, so "signing in" creates a local identity (name and
email you provide) stored in `localStorage` on your device, with no
password. Guest mode skips this entirely: `js/session.js` probes whether
`localStorage`/`sessionStorage` are actually writable (private/incognito
windows sometimes throw or silently no-op), and guest identity is held in
`sessionStorage` or in memory, never in `localStorage`, so it never
survives a closed tab, in any browser mode.

Pages that require an active session (chat, settings, profile) use a
`data-requires-session` guard on `<body>`: a visitor with no account and
no guest session is redirected to sign-in instead of seeing placeholder
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
2. Go to **Settings > Pages**.
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

## Getting an OpenRouter API key

1. Create a free account at [openrouter.ai](https://openrouter.ai).
2. Generate a key from the [Keys page](https://openrouter.ai/keys). Keys
   start with `sk-or-v1-`.
3. Paste it into Settings in this app and click Save. Optionally click
   "Send test message" to confirm the connection works.

Usage of the free `:free` model variants is subject to OpenRouter's own
rate limits and terms.

## Browser support notes

- Service worker registration and the install prompt both no-op safely on
  browsers that don't support them (for example, no `beforeinstallprompt`
  on Firefox/Safari); the site remains fully functional, just without the
  install affordance or offline caching on those browsers.
- Guest mode and normal sign-in both work with `localStorage` disabled
  entirely (private browsing, enterprise policy, or embedded webviews);
  the only difference is that a "signed-in" session in that situation also
  behaves like a guest session, since there is nowhere on-device to
  persist it. This is expected behavior: the app never loses data it
  never had permission to keep.
