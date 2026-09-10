# Accelerate — Marketing Site

A clean, production-ready, frontend-only marketing site for **Accelerate**, a GPU inference infrastructure platform. Built as a static HTML/CSS/JS site with no build step, no framework, and no backend — ready to open directly in a browser or deploy to any static host.

The visual language (dark surface palette, lime-green accent, glassmorphism panels, monospace telemetry labels, glow accents) is adapted from a Stitch-generated dark-mode dashboard concept into a full multi-page marketing site: navigation, hero, feature grid, workflow, code showcase, pricing, docs, contact, and legal pages.

## Features

- **Zero dependencies** — vanilla HTML5, modern CSS (custom properties, `color-mix()`, container-aware layout), and vanilla JavaScript. No npm install, no bundler.
- **Dark / light theme** — toggle in the navbar, persisted in `localStorage`, respects the OS preference on first visit, and applies before first paint (no flash of the wrong theme).
- **Responsive** — mobile-first layout with a slide-in navigation drawer under 860px.
- **Accessible** — semantic landmarks, skip-to-content link, visible focus states, `aria-*` attributes on interactive controls, reduced-motion support.
- **SEO-ready** — per-page meta descriptions, canonical URLs, Open Graph and Twitter Card tags, `robots.txt`, `sitemap.xml`, and a generated OG share image.
- **Scroll-reveal animation** — sections animate in via `IntersectionObserver`, degrades gracefully (and respects `prefers-reduced-motion`).
- **Working contact form** — client-side validated; ships with no backend wired up (see note below).

## Folder structure

```
.
├── index.html              # Homepage: hero, features, workflow, code showcase, CTA
├── 404.html                 # Root-level 404 (required by GitHub Pages)
├── robots.txt
├── sitemap.xml
├── styles/
│   ├── main.css              # Imports every module below, in order
│   ├── tokens.css            # Design tokens: color, type scale, spacing, radii
│   ├── base.css               # Reset, scrollbars, focus states
│   ├── typography.css        # Type-scale utility classes
│   ├── navbar.css
│   ├── buttons.css
│   ├── hero.css
│   ├── features.css
│   ├── cta-footer.css
│   ├── pages.css              # Interior page layout (pricing, docs, contact, prose, 404)
│   └── animations.css
├── scripts/
│   ├── theme.js               # Dark/light toggle + persistence
│   ├── nav.js                  # Mobile nav drawer + sticky header
│   ├── reveal.js               # Scroll-reveal via IntersectionObserver
│   ├── main.js                 # Footer year, prompt-deck demo, copy-to-clipboard
│   └── contact-form.js         # Contact form validation + local submit
├── components/
│   ├── navbar.html             # Reference partial (see components/README.md)
│   ├── footer.html             # Reference partial
│   └── README.md
├── pages/
│   ├── about.html
│   ├── pricing.html
│   ├── docs.html
│   ├── contact.html
│   ├── privacy.html
│   ├── terms.html
│   └── 404.html
├── assets/
│   └── img/
│       ├── og-cover.svg
│       └── og-cover.png        # Used for Open Graph / Twitter Card previews
└── favicon/
    ├── favicon.ico
    ├── favicon.svg
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    └── site.webmanifest
```

## Local development

No build step is required. Any static file server works:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

Opening `index.html` directly via `file://` also works for a quick look, though a local server is recommended so root-relative paths (`/styles/main.css`, etc.) resolve exactly as they will in production.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the branch (e.g. `main`) and the `/ (root)` folder, then save.
5. GitHub Pages will publish the site at `https://<your-username>.github.io/<repo-name>/`.

Because every internal link in this project uses root-relative paths (`/styles/main.css`, `/pages/pricing.html`, etc.), the site works cleanly at a custom domain or at `https://<username>.github.io/` (root). If you deploy under a **project subpath** instead (`https://<username>.github.io/<repo-name>/`), update the root-relative paths to be relative to that subpath, or add a `<base href="/<repo-name>/">` tag in the `<head>` of each page.

The root-level `404.html` is picked up automatically by GitHub Pages for unmatched routes.

## Updating the canonical domain

Before going live, replace every occurrence of `https://accelerate.example.com` (used in canonical links and Open Graph tags) with your real production domain:

```bash
grep -rl "accelerate.example.com" . --include="*.html" --include="*.xml" --include="*.txt" \
  | xargs sed -i 's#accelerate.example.com#yourdomain.com#g'
```

## Wiring up the contact form

The contact form (`pages/contact.html` + `scripts/contact-form.js`) validates input and shows a success state entirely client-side — there is no backend in this project. Before launch, connect it to a real endpoint:

- A form service (Formspree, Netlify Forms, Getform, etc.), or
- Your own backend API via `fetch()`

Replace the `// Frontend-only demo` block in `scripts/contact-form.js` with your real submission logic.

## Customizing the design system

All colors, type sizes, spacing, and radii are defined once in `styles/tokens.css` as CSS custom properties. Changing the accent color, for example, means editing `--primary` and `--primary-bright` in one place — every button, chip, glow, and link updates automatically.

Light mode is defined as an override block under `[data-theme="light"]` in the same file.

## Browser support

Built against current evergreen browsers (Chrome, Firefox, Safari, Edge — last 2 versions). Uses `color-mix()`, which has been supported in all major browsers since 2023; no polyfill is included.

## License

This is a template project. Replace the placeholder legal copy in `pages/privacy.html` and `pages/terms.html` with real, counsel-reviewed policies before using this in production.
