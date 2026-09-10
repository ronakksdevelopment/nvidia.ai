# Components

This folder holds the canonical markup for shared UI pieces: `navbar.html` and `footer.html`.

The site itself has **no backend and no build step**, so each page inlines this exact markup directly rather than fetching it at runtime — that keeps every page fast, crawlable by search engines on first paint, and fully functional even with JavaScript disabled.

Use these files as the source of truth: if you update the navbar or footer, copy the change into every page listed below.

**Pages that include the navbar/footer markup:**
- `/index.html`
- `/pages/about.html`
- `/pages/pricing.html`
- `/pages/docs.html`
- `/pages/contact.html`
- `/pages/privacy.html`
- `/pages/terms.html`
- `/pages/404.html`

If you later introduce a build step (e.g. a static site generator or an 11ty/Vite include system), these two files can be wired in directly with no markup changes required.
