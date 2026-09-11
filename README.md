# NVIDIA Nemotron v2.5 - Chat with free NVIDIA models via OpenRouter

A complete, static, GitHub Pages-ready chat application for NVIDIA's open
Nemotron model family. No frameworks, no build step, no backend server:
plain HTML, CSS, and vanilla JavaScript, from the landing page to the live
chat experience to offline support. Chat runs on real OpenRouter API calls
using your own free API key, with real streaming responses from NVIDIA's
free Nemotron models.

## What's new (latest session)

- **Home page model rows** — the "Eight free models, one API key" spec
  columns (active params / context) now line up in fixed-width, evenly
  aligned columns across all 8 cards instead of drifting with text length.
- **Captcha simplified** — the "I'm not a robot" checkbox on Sign In / Sign
  Up now always auto-verifies after a short spinner; the random math
  challenge was removed.
- **Selected text color fixed** — global `::selection` now uses white text
  on the green highlight everywhere (previously black, unreadable in the
  name field and elsewhere).
- **Animated, renamable chat titles** — sidebar conversation titles now
  type in with a brief animation both when the instant local title is set
  and when the model-generated title replaces it. Hovering a chat row
  reveals a pen icon for inline rename (Enter/blur to save, Esc to
  cancel), alongside the existing "..." options menu.
- **New-chat suggestion cards fixed** — the two longer suggestions
  ("Compare Nemotron Nano vs Super vs Ultra", "Draft a beta-tester
  onboarding email") now truncate to one line like the other two instead
  of wrapping and forcing the empty-chat screen to scroll.
- **Model picker grouped by category** — the chat topbar's model dropdown
  now shows Text / Embedding / Rerank section labels above the relevant
  models.
- **About → Models redesigned as tabs** — replaced the three tall category
  cards with a wide, short tab switcher (Text / Embedding / Rerank) above
  a single compact list panel.
- **FAQ redesigned** — replaced the boxed FAQ cards with a numbered,
  terminal-style accordion: a connecting rail down the left with
  mono-numbered nodes per question (turning green when open) and a `+`/`−`
  marker instead of a chevron.
- **Settings pages widened** — the shared content container used by
  General, Profile, About, FAQ, Privacy, and Terms grew from 720px to
  960px max-width, removing the oversized empty side margins on wide
  screens.
- **Mobile overflow fixes** — the chat topbar's model dropdown now clamps
  to the viewport width and right-aligns on small screens instead of
  risking clipping off-screen; the new About page model tabs shrink text
  and stack to full width below 400px. No known horizontal-scroll issues
  remain across mobile/tablet/desktop.

## What's new in v2.5

- **Redesigned FAQ cards** — bold 2.5px borders, thicker accent bars,
  larger rounded corners (`--radius-lg`), and a cleaner grid-based layout,
  fully responsive down to mobile widths.
- **Renamed Settings sidebar** — the six sections are now simply General,
  Profile, About, FAQ, Privacy, and Terms.
- **Fixed the invisible suggestion icon** — the "Draft a friendly
  onboarding email" chat suggestion now shows a visible envelope icon
  (it previously used an invalid Font Awesome icon name and rendered
  blank).
- **Live session & weekly usage tracking** — the sidebar's token usage bar
  now shows a real, ticking reset countdown (`resets in Hh Mm`), and the
  chat topbar shows two live pills: `Session X% · resets Hh Mm` and
  `Weekly Y% · resets Dd`. Both windows persist across reloads and roll
  over automatically once elapsed. (Previously the topbar pills were
  wired to DOM IDs that didn't exist and were hard-hidden by CSS.)
- **Fast character-by-character reply animation** — assistant replies now
  visibly "type" onto the screen at a fast, smooth pace. Network chunks
  are buffered and revealed a few characters per frame, so the animation
  stays smooth and sentence-coherent even when the underlying stream
  arrives in bursts.
- **Live generation timer** — a `Generating... X.Xs` readout appears
  under each in-progress assistant reply and is swapped for the final
  `Generated in X.Xs` once the response completes.
- **Barlow as the default typeface** — replaces Inter as the NVIDIA-style
  UI font across every page. JetBrains Mono is unchanged and still used
  for all code, model IDs, and other monospace content.
- **Consistent icon states everywhere** — every normal icon (nav, footer,
  settings, profile, about, help, onboarding) is white by default and
  turns NVIDIA green on hover, keyboard focus, and click. Icons that
  carry deliberate semantic color (success/selected/brand states) are
  unaffected and unchanged. Icon color is now theme-aware, so it also
  stays legible if Light theme is selected.
- **Credits & Attribution section** (About page) — credits OpenRouter for
  model access and NVIDIA Nemotron models for generating responses, with
  a prominent **Browse NVIDIA Models on OpenRouter** button linking to
  `openrouter.ai/models?q=nvidia&variant=free`, and a short disclaimer
  that availability, rate limits, and performance depend on OpenRouter
  and the selected model.
- **Models section** (About page) — the free NVIDIA model catalog is now
  organized into three category cards: Text Models (5), Embedding Models
  (2), and Rerank Models (1). See the table below for the full list.

## What this is

- Bring your own free [OpenRouter](https://openrouter.ai/keys) API key.
- Chat with real-time streaming responses from NVIDIA's free Nemotron
  models, switchable per conversation from the model picker.
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

## Credits & Attribution

This project uses **NVIDIA Nemotron models**, accessed through
**OpenRouter**, to generate every AI response in chat. Model access,
routing, and free-tier availability are provided by OpenRouter — credit
to OpenRouter for making these models reachable with a single API key.
Model availability, rate limits, and performance depend on OpenRouter and
on the specific NVIDIA model selected, and may change at any time. See
About → Credits & Attribution in the app for the same information with a
direct link to browse NVIDIA's models on OpenRouter.

## Model categories

**Text Models (5)**

| Model | Notes |
|---|---|
| NVIDIA: Llama 3.1 Nemotron 70B Instruct | free |
| NVIDIA: Llama 3.3 Nemotron Super 49B V1 | free |
| NVIDIA: Llama 3.3 Nemotron Super 49B V1: Reasoning | free |
| NVIDIA: Nemotron Nano 9B V2 | free |
| NVIDIA: Nemotron 3 Nano Omni 4B V1 | free |

**Embedding Models (2)**

| Model | Notes |
|---|---|
| NVIDIA: NV-Embed-v2 | free |
| NVIDIA: NV-EmbedQA-E5-v5 | free |

**Rerank Models (1)**

| Model | Notes |
|---|---|
| NVIDIA: Llama Nemotron Rerank VL 1B V2 | free |

All of the above are free on OpenRouter. The chat model picker in
`pages/chat.html` and `pages/settings.html` ships with its own default
Nemotron chat-model lineup independent of this catalog; see
`js/settings.js` for that list if you want to point it at a different set
of OpenRouter model IDs.

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

This is a no-build, vanilla HTML/CSS/JS project with two external
dependencies, both loaded via CDN on every page: [Font Awesome 6](https://fontawesome.com/)
(free icon set) for UI icons (nav, buttons, status indicators, and so on),
and [Google Fonts](https://fonts.google.com/) for Barlow (the NVIDIA-style
UI typeface) and JetBrains Mono (used for code, model IDs, and other
monospace content). These are the only third-party assets the app loads;
everything else — layout, theming, chat streaming, storage — is
hand-written with no framework and no package manager. If you deploy
somewhere that blocks third-party CDNs, icons and custom fonts will
silently fall back to the system default but the app otherwise keeps
working, since no functionality depends on either loading successfully.

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
