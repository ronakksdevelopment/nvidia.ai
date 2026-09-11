/* =========================================================================
   NVIDIA Nemotron - Service Worker
   Cache-first app-shell strategy for a static, no-build, GitHub-Pages site.

   Scope-safe: every path below is registered relative to this file's own
   location (self.registration.scope), so this works identically whether
   the site is served from a domain root or a GitHub Pages project
   sub-path like /repo-name/.

   Versioning: bump CACHE_VERSION on any deploy that changes cached files.
   The old cache is deleted on activate, so visitors always converge on the
   latest shell within one reload cycle instead of being stuck on stale
   assets forever.
   ========================================================================= */

var CACHE_VERSION = "nemotron-v1.5.0";
var CACHE_NAME = "nemotron-shell-" + CACHE_VERSION;

// Resolved relative to the service worker's own scope at install time.
var SHELL_PATHS = [
  "./",
  "index.html",
  "404.html",
  "manifest.json",
  "css/design-system.css",
  "css/styles.css",
  "css/chat.css",
  "css/settings.css",
  "js/app.js",
  "js/router.js",
  "js/session.js",
  "js/chat.js",
  "js/settings.js",
  "js/settings-nav.js",
  "pages/onboarding.html",
  "pages/auth.html",
  "pages/chat.html",
  "pages/settings.html",
  "pages/profile.html",
  "pages/about.html",
  "pages/help.html",
  "pages/privacy.html",
  "pages/terms.html",
  "assets/logo/nemotron-16.png",
  "assets/logo/nemotron-32.png",
  "assets/logo/nemotron-48.png",
  "assets/logo/nemotron-180.png",
  "assets/logo/nemotron-192.png",
  "assets/logo/nemotron-512.png",
  "assets/logo/apple-touch-icon.png",
  "assets/favicon/favicon.ico",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      var scopeUrl = new URL(self.registration.scope);
      var urls = SHELL_PATHS.map(function (p) {
        return new URL(p, scopeUrl).toString();
      });
      // addAll rejects the whole install if any single asset 404s. Fall
      // back to best-effort per-file caching so one missing/renamed icon
      // (e.g. after folder cleanup) never blocks offline support entirely.
      return cache.addAll(urls).catch(function () {
        return Promise.all(
          urls.map(function (url) {
            return cache.add(url).catch(function () {
              /* skip files that fail individually */
            });
          })
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.indexOf("nemotron-shell-") === 0 && key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

/* -----------------------------------------------------------------------
   Fetch strategy:
   - Navigations (HTML documents): network-first, falling back to the
     cached shell page (or the cached offline page) so a flaky connection
     doesn't show the browser's native "no internet" screen.
   - Same-origin static assets (css/js/images/fonts-manifest): cache-first,
     with a background network fetch to refresh the cache for next time
     (stale-while-revalidate).
   - Cross-origin requests (Google Fonts, OpenRouter API calls): always
     pass straight through to the network: never cached, never
     intercepted, so API responses and auth headers are never stored.
   ----------------------------------------------------------------------- */
self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests pass through untouched

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match(new URL("index.html", self.registration.scope).toString());
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      var networkFetch = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          }
          return response;
        })
        .catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
