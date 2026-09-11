/* =========================================================================
   NVIDIA Nemotron - Session layer
   Shared, dependency-free identity/session state used across all pages:
   auth.html, onboarding.html, chat.html, profile.html, settings.html, index.html.

   Responsibilities:
   - Detect whether persistent storage (localStorage) is actually writable.
     Private/incognito windows in some browsers throw or silently no-op on
     localStorage, so every read/write here is guarded and falls back to an
     in-memory store that never survives a reload, which is exactly the
     guest-mode contract: nothing saves, incognito mode included.
   - Provide a single guest-mode entry point used by the "Continue as guest"
     actions on the sign-in/sign-up modals and the auth page.
   - Provide an in-memory-only Incognito Mode flag, independent of guest vs.
     signed-in identity, that chat.js reads to decide whether the active
     conversation is persisted. Nothing about incognito state ever touches
     localStorage or sessionStorage, so it cannot survive a refresh.
   - Persist only a non-sensitive display identity (name/email/avatar
     initials) for signed-in sessions, entirely on-device, and never
     persist anything at all for guest sessions.
   - Expose window.NemotronSession for other scripts (chat.js, app.js,
     settings.js, profile page inline script) to read/react to.
   ========================================================================= */
(function () {
  "use strict";

  var SESSION_KEY = "nemotron.session";
  var GUEST_FLAG_KEY = "nemotron.guestFlashSeen";

  /* -----------------------------------------------------------------------
     Storage capability probe: true persistent storage vs. in-memory shim.
     Incognito/private windows (older Safari, locked-down embeds, storage
     quota = 0) can have a localStorage object that exists but throws on
     write. We test once and cache the result.
     ----------------------------------------------------------------------- */
  var memoryStore = Object.create(null);
  var persistentStorageAvailable = (function probe() {
    try {
      var testKey = "__nemotron_probe__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function storageGet(key) {
    if (persistentStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }

  function storageSet(key, value) {
    if (persistentStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }
    memoryStore[key] = value;
    return true;
  }

  function storageRemove(key) {
    if (persistentStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) { /* no-op */ }
    }
    delete memoryStore[key];
  }

  /* -----------------------------------------------------------------------
     sessionStorage-backed guest state: tab/session scoped, always cleared
     when the browser or private window closes, and never written to disk.
     Falls back to an in-memory flag if sessionStorage is blocked too.
     ----------------------------------------------------------------------- */
  var memoryGuestFlag = false;
  function sessionStorageAvailable() {
    try {
      var k = "__nemotron_sprobe__";
      window.sessionStorage.setItem(k, "1");
      window.sessionStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }
  var canUseSessionStorage = sessionStorageAvailable();

  function setGuestActive(active) {
    if (canUseSessionStorage) {
      try {
        if (active) window.sessionStorage.setItem("nemotron.guest", "1");
        else window.sessionStorage.removeItem("nemotron.guest");
        return;
      } catch (e) { /* fall through to memory */ }
    }
    memoryGuestFlag = active;
  }
  function isGuestActive() {
    if (canUseSessionStorage) {
      try {
        return window.sessionStorage.getItem("nemotron.guest") === "1";
      } catch (e) { /* fall through */ }
    }
    return memoryGuestFlag;
  }

  /* -----------------------------------------------------------------------
     Incognito mode: deliberately held in a plain JS variable only, never
     sessionStorage or localStorage. Unlike guest mode (which is about
     identity), incognito is about a single conversation's persistence and
     can be toggled by a signed-in account too. Because it lives only in
     memory, it is automatically and unconditionally cleared on refresh,
     tab close, or navigation to another document, with no code needed to
     "exit" it beyond the toggle itself. Listeners let chat.js repaint the
     badge/toggle UI immediately when the flag flips.
     ----------------------------------------------------------------------- */
  var incognitoActive = false;
  var incognitoListeners = [];

  function isIncognitoActive() {
    return incognitoActive;
  }
  function setIncognitoActive(active) {
    active = !!active;
    if (active === incognitoActive) return;
    incognitoActive = active;
    incognitoListeners.forEach(function (fn) {
      try { fn(incognitoActive); } catch (e) { /* listener errors shouldn't break the toggle */ }
    });
  }
  function toggleIncognito() {
    setIncognitoActive(!incognitoActive);
    return incognitoActive;
  }
  function onIncognitoChange(fn) {
    if (typeof fn === "function") incognitoListeners.push(fn);
  }

  /* -----------------------------------------------------------------------
     Fallback field values used only to fill in blanks on a *real* signed-in
     account object that's missing a name/initials (e.g. an older saved
     session or a sign-in with no name entered). Never used to fabricate an
     identity for a visitor who hasn't actually signed in or gone guest.
     ----------------------------------------------------------------------- */
  var ACCOUNT_DEFAULTS = {
    name: "Account",
    email: "",
    initials: "?",
    plan: "Free",
  };

  function initialsFrom(name) {
    if (!name) return "?";
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAccount() {
    if (isGuestActive()) {
      return { name: "Guest", email: "", initials: "G", plan: "Guest session", guest: true };
    }
    var raw = storageGet(SESSION_KEY);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      var merged = Object.assign({}, ACCOUNT_DEFAULTS, parsed, { guest: false });
      if (!parsed.initials) merged.initials = initialsFrom(merged.name);
      return merged;
    } catch (e) {
      return null;
    }
  }

  /* Call after a sign-in / sign-up form submit. */
  function signIn(overrides) {
    setGuestActive(false);
    var account = Object.assign({}, ACCOUNT_DEFAULTS, overrides || {});
    if (!overrides || !overrides.initials) account.initials = initialsFrom(account.name);
    storageSet(SESSION_KEY, JSON.stringify(account));
    return account;
  }

  /* Call from any "Continue as guest" trigger. Deliberately never touches
     localStorage. Guest identity lives only for the current tab/session
     and disappears completely on reload in a fresh private window, and on
     browser close in a normal window. */
  function continueAsGuest() {
    storageRemove(SESSION_KEY); // guest mode always wins over a stale saved session
    setGuestActive(true);
    return getAccount();
  }

  function signOut() {
    setGuestActive(false);
    storageRemove(SESSION_KEY);
  }

  function isSignedIn() {
    return !!getAccount();
  }

  function isPersistent() {
    return persistentStorageAvailable;
  }

  /* -----------------------------------------------------------------------
     Guest banner helper: a one-time-per-tab notice, not persisted, so it
     reappears in every fresh private window / new tab, but not on every
     page navigation within one guest session.
     ----------------------------------------------------------------------- */
  function hasShownGuestNotice() {
    if (canUseSessionStorage) {
      try {
        return window.sessionStorage.getItem(GUEST_FLAG_KEY) === "1";
      } catch (e) { /* fall through */ }
    }
    return false;
  }
  function markGuestNoticeShown() {
    if (canUseSessionStorage) {
      try {
        window.sessionStorage.setItem(GUEST_FLAG_KEY, "1");
      } catch (e) { /* no-op */ }
    }
  }

  /* -----------------------------------------------------------------------
     Honor a ?guest=1 URL parameter (used by the "Continue as guest" PWA
     shortcut in manifest.json) by starting a guest session before the
     session guard below runs, so that shortcut lands directly in chat
     instead of bouncing through sign-in.
     ----------------------------------------------------------------------- */
  function applyGuestUrlParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("guest") === "1" && !isGuestActive() && !getAccount()) {
        continueAsGuest();
      }
    } catch (e) { /* URLSearchParams unsupported or blocked; ignore */ }
  }
  applyGuestUrlParam();

  /* -----------------------------------------------------------------------
     Apply the current identity to any account-menu markup present on the
     page (chat.html sidebar, profile.html header, etc.) via data hooks.
     Non-destructive no-op on pages without these elements.
     ----------------------------------------------------------------------- */
  function paintAccountUI() {
    var account = getAccount();
    var nodes = document.querySelectorAll("[data-account-name]");
    var emailNodes = document.querySelectorAll("[data-account-email]");
    var initialNodes = document.querySelectorAll("[data-account-initials]");
    var planNodes = document.querySelectorAll("[data-account-plan]");
    var guestOnly = document.querySelectorAll("[data-guest-only]");
    var authOnly = document.querySelectorAll("[data-authed-only]");

    var display = account || { name: "Not signed in", email: "", initials: "?", plan: "", guest: false };

    nodes.forEach(function (el) { el.textContent = display.name; });
    emailNodes.forEach(function (el) {
      el.textContent = display.email || "No email on file";
    });
    initialNodes.forEach(function (el) { el.textContent = display.initials; });
    planNodes.forEach(function (el) { el.textContent = display.plan; });
    guestOnly.forEach(function (el) { el.hidden = !(account && account.guest); });
    authOnly.forEach(function (el) { el.hidden = !!(account && account.guest); });

    document.documentElement.setAttribute("data-session", account ? (account.guest ? "guest" : "authed") : "signed-out");
  }

  document.addEventListener("DOMContentLoaded", paintAccountUI);

  /* -----------------------------------------------------------------------
     Access guard for pages that require an active session (signed in or
     guest). Add data-requires-session to the <body> of any such page; a
     visitor with no session is redirected to auth.html instead of seeing
     placeholder identity data. Runs before paint so there's no flash of
     someone else's account information.
     ----------------------------------------------------------------------- */
  function enforceSessionGuard() {
    if (!document.body || !document.body.hasAttribute("data-requires-session")) return;
    if (getAccount()) return;
    var inPagesDir = window.location.pathname.indexOf("/pages/") !== -1;
    window.location.replace(inPagesDir ? "../index.html" : "index.html");
  }
  enforceSessionGuard();

  /* -----------------------------------------------------------------------
     Theme application, run on every page as early as possible so there is
     no flash of the wrong theme. Reads the same nemotron.settings key that
     js/settings.js writes to, so a theme choice made in Settings applies
     everywhere immediately, including pages that never load settings.js.
     ----------------------------------------------------------------------- */
  function applyStoredTheme() {
    var theme = "dark";
    try {
      var raw = storageGet("nemotron.settings");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.theme) theme = parsed.theme;
      }
    } catch (e) { /* fall back to dark */ }

    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    var resolved = theme === "system" ? (prefersLight ? "light" : "dark") : theme;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-pref", theme);
  }
  applyStoredTheme();

  if (window.matchMedia) {
    var mql = window.matchMedia("(prefers-color-scheme: light)");
    if (mql.addEventListener) {
      mql.addEventListener("change", function () {
        if (document.documentElement.getAttribute("data-theme-pref") === "system") applyStoredTheme();
      });
    }
  }

  window.NemotronSession = {
    getAccount: getAccount,
    signIn: signIn,
    continueAsGuest: continueAsGuest,
    signOut: signOut,
    isSignedIn: isSignedIn,
    isGuestActive: isGuestActive,
    isPersistent: isPersistent,
    paintAccountUI: paintAccountUI,
    hasShownGuestNotice: hasShownGuestNotice,
    markGuestNoticeShown: markGuestNoticeShown,
    isIncognitoActive: isIncognitoActive,
    setIncognitoActive: setIncognitoActive,
    toggleIncognito: toggleIncognito,
    onIncognitoChange: onIncognitoChange,
  };
})();
