/* =========================================================================
   NVIDIA Nemotron — Session layer (Production Milestone 4)
   Shared, dependency-free identity/session state used across all pages:
   auth.html, onboarding.html, chat.html, profile.html, settings.html, index.html.

   Responsibilities:
   - Detect whether persistent storage (localStorage) is actually writable.
     Private/incognito windows in some browsers throw or silently no-op on
     localStorage, so every read/write here is guarded and falls back to an
     in-memory store that never survives a reload — which is exactly the
     guest-mode contract: "nothing saves, incognito mode also."
   - Provide a single guest-mode entry point used by the "Continue as guest"
     actions on the sign-in/sign-up modals and the auth page.
   - Persist only a *non-sensitive* display identity (name/email/avatar
     initials) for signed-in demo sessions, entirely on-device, and never
     persist anything at all for guest sessions.
   - Expose window.NemotronSession for other scripts (chat.js, app.js,
     settings.js, profile page inline script) to read/react to.
   ========================================================================= */
(function () {
  "use strict";

  var SESSION_KEY = "nemotron.session";
  var GUEST_FLAG_KEY = "nemotron.guestFlashSeen";

  /* -----------------------------------------------------------------------
     Storage capability probe — true persistent storage vs. in-memory shim.
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
     sessionStorage-backed guest state — tab/session scoped, always cleared
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
     Default demo identity used for the "signed in" mockup state — matches
     the identity already hardcoded across chat.html/profile.html so the
     UI stays visually identical when not in guest mode.
     ----------------------------------------------------------------------- */
  var DEMO_ACCOUNT = {
    name: "Dev Kumar",
    email: "dev.kumar@example.com",
    initials: "DK",
    plan: "Beta access",
  };

  function getAccount() {
    if (isGuestActive()) {
      return { name: "Guest", email: "", initials: "G", plan: "Guest session", guest: true };
    }
    var raw = storageGet(SESSION_KEY);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEMO_ACCOUNT, parsed, { guest: false });
    } catch (e) {
      return null;
    }
  }

  /* Call after any mock sign-in / sign-up form submit. */
  function signIn(overrides) {
    setGuestActive(false);
    var account = Object.assign({}, DEMO_ACCOUNT, overrides || {});
    storageSet(SESSION_KEY, JSON.stringify(account));
    return account;
  }

  /* Call from any "Continue as guest" trigger. Deliberately never touches
     localStorage — guest identity lives only for the current tab/session
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
     Guest banner helper — a one-time-per-tab notice, not persisted, so it
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

    var display = account || { name: "Dev Kumar", email: "dev.kumar@example.com", initials: "DK", plan: "Beta access", guest: false };

    nodes.forEach(function (el) { el.textContent = display.name; });
    emailNodes.forEach(function (el) {
      el.textContent = display.email || "No account data is stored";
    });
    initialNodes.forEach(function (el) { el.textContent = display.initials; });
    planNodes.forEach(function (el) { el.textContent = display.plan; });
    guestOnly.forEach(function (el) { el.hidden = !(account && account.guest); });
    authOnly.forEach(function (el) { el.hidden = !!(account && account.guest); });

    document.documentElement.setAttribute("data-session", account ? (account.guest ? "guest" : "authed") : "signed-out");
  }

  document.addEventListener("DOMContentLoaded", paintAccountUI);

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
  };
})();
