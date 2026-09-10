/* =========================================================================
   NVIDIA Nemotron — Router (Production Milestone 4)
   This is NOT a single-page-app router — every page here is a real static
   HTML file, which is deliberate: it keeps the project a zero-build,
   GitHub-Pages-native static site. This module instead solves the two
   real routing problems a static multi-page site hits on GitHub Pages:

   1. Project sites are served from a sub-path (https://user.github.io/repo/),
      so any code that assumes it's at the domain root breaks. Everything
      here resolves paths relative to a detected <base>, never a hardcoded
      leading slash.
   2. GitHub Pages has no server-side rewrites, so a hard refresh or a
      shared deep link to a path that doesn't exist as a literal file
      404s. 404.html captures the attempted path and hands it back here,
      and this module sends the visitor on to the closest real page
      instead of leaving them stranded.

   Also marks the correct nav link as aria-current="page" on every page
   automatically, so that never has to be hand-maintained per file.
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Resolve the site base path once. Works for:
       - user.github.io/repo/...      -> base = /repo/
       - user.github.io/               -> base = /
       - a custom domain at the root  -> base = /
       - local file:// or dev server  -> base = current directory of index
     ----------------------------------------------------------------------- */
  function detectBase() {
    var path = window.location.pathname;
    // Path up to and including the last "/" before either the file itself
    // or the "pages/" segment is treated as the project root.
    var pagesIdx = path.indexOf("/pages/");
    if (pagesIdx !== -1) return path.slice(0, pagesIdx + 1);
    // Otherwise strip the trailing filename (index.html, 404.html, etc.)
    var lastSlash = path.lastIndexOf("/");
    return lastSlash === -1 ? "/" : path.slice(0, lastSlash + 1);
  }

  var BASE = detectBase();

  /* Map of canonical route names -> real file paths, relative to BASE. */
  var ROUTES = {
    home: "index.html",
    chat: "pages/chat.html",
    auth: "pages/auth.html",
    onboarding: "pages/onboarding.html",
    settings: "pages/settings.html",
    profile: "pages/profile.html",
    about: "pages/about.html",
    help: "pages/help.html",
    privacy: "pages/privacy.html",
    terms: "pages/terms.html",
  };

  function resolve(routeName) {
    var file = ROUTES[routeName] || routeName;
    return BASE + file;
  }

  function goTo(routeName) {
    window.location.href = resolve(routeName);
  }

  /* -----------------------------------------------------------------------
     404 recovery. sessionStorage carries the mistyped/broken path from
     404.html (set just before its redirect) across the navigation so this
     page can show a one-time toast explaining what happened, rather than
     silently dropping the visitor on the homepage with no context.
     ----------------------------------------------------------------------- */
  var REDIRECT_FLAG_KEY = "nemotron.redirectedFrom";

  function consumeRedirectNotice() {
    var attempted = null;
    try {
      attempted = window.sessionStorage.getItem(REDIRECT_FLAG_KEY);
      if (attempted) window.sessionStorage.removeItem(REDIRECT_FLAG_KEY);
    } catch (e) {
      /* sessionStorage unavailable (locked-down/private context) — degrade
         silently, the visitor still landed on a working page. */
    }
    if (attempted && window.NemotronToast) {
      window.NemotronToast(
        "info",
        "Page not found",
        "\u201c" + attempted + "\u201d doesn't exist, so we brought you back here."
      );
    }
  }

  /* -----------------------------------------------------------------------
     Active nav-link marking. Compares each nav link's resolved pathname
     against the current page and sets aria-current="page" — works for the
     top navbar, the mobile drawer, and the settings-shell side nav without
     any per-page hardcoding.
     ----------------------------------------------------------------------- */
  function markActiveLinks() {
    var here = window.location.pathname.replace(/\/index\.html$/, "/");
    var links = document.querySelectorAll('a[href]:not([href^="http"]):not([href^="#"]):not([href^="mailto:"])');
    links.forEach(function (link) {
      try {
        var target = new URL(link.getAttribute("href"), window.location.href).pathname.replace(/\/index\.html$/, "/");
        if (target === here) {
          link.setAttribute("aria-current", "page");
        } else if (link.getAttribute("aria-current") === "page") {
          link.removeAttribute("aria-current");
        }
      } catch (e) { /* malformed href, skip */ }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    markActiveLinks();
    consumeRedirectNotice();
  });

  window.NemotronRouter = {
    base: BASE,
    resolve: resolve,
    goTo: goTo,
    markActiveLinks: markActiveLinks,
  };
})();
