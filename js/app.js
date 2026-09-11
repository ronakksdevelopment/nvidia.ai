/* =========================================================================
   NVIDIA Nemotron - Shared behavior layer (vanilla JS, no dependencies)
   Service worker registration, install-prompt handling, guest-mode wiring,
   modals, toasts, and navigation shared across every page.
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Service worker registration (PWA / offline support)
     Registered relative to the current document so it works from both the
     site root and a GitHub Pages project sub-path, and skipped entirely on
     file:// or unsupported browsers rather than throwing.
     ----------------------------------------------------------------------- */
  if ("serviceWorker" in navigator && window.location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", () => {
      const here = window.location.pathname;
      const pagesIdx = here.indexOf("/pages/");
      const base = pagesIdx !== -1 ? here.slice(0, pagesIdx + 1) : here.slice(0, here.lastIndexOf("/") + 1);
      navigator.serviceWorker.register(base + "sw.js").catch(() => {
        /* Offline support degrades gracefully: the site still works fully online. */
      });
    });
  }

  /* -----------------------------------------------------------------------
     "Add to Home Screen" / install prompt
     Chromium fires beforeinstallprompt instead of showing its own mini-
     infobar when we call preventDefault(); we stash the event and surface
     our own install affordance wherever [data-install-app] exists on the
     current page (wired up per-page, so pages without the button are
     unaffected).
     ----------------------------------------------------------------------- */
  let deferredInstallPrompt = null;
  const installButtons = () => document.querySelectorAll("[data-install-app]");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installButtons().forEach((btn) => { btn.hidden = false; });
  });

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-install-app]");
    if (!trigger || !deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => {
      deferredInstallPrompt = null;
      installButtons().forEach((btn) => { btn.hidden = true; });
    });
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButtons().forEach((btn) => { btn.hidden = true; });
    if (window.NemotronToast) {
      window.NemotronToast("success", "Installed", "Nemotron was added to this device.");
    }
  });

  /* -----------------------------------------------------------------------
     Splash screen
     ----------------------------------------------------------------------- */
  const splash = document.getElementById("splash");
  if (splash) {
    const hide = () => splash.classList.add("is-hidden");
    // Respect a minimum perceived-load time, but never block interaction.
    window.addEventListener("load", () => setTimeout(hide, 550));
    setTimeout(hide, 2200); // hard fallback
  }

  /* -----------------------------------------------------------------------
     Offline / online banner + toast messaging
     The banner reflects live state at all times; the toast fires once per
     transition so reconnecting after a longer offline stretch is actually
     noticed instead of only shown in a banner that's easy to miss.
     ----------------------------------------------------------------------- */
  const offlineBanner = document.getElementById("offlineBanner");
  let wasOffline = !navigator.onLine;

  function updateOnlineStatus(announce) {
    if (offlineBanner) offlineBanner.classList.toggle("is-visible", !navigator.onLine);
    if (announce && window.NemotronToast) {
      if (!navigator.onLine) {
        window.NemotronToast("warning", "You're offline", "Nemotron will keep working with cached pages until you're back online.");
      } else if (wasOffline) {
        window.NemotronToast("success", "Back online", "Your connection has been restored.");
      }
    }
    wasOffline = !navigator.onLine;
  }
  window.addEventListener("online", () => updateOnlineStatus(true));
  window.addEventListener("offline", () => updateOnlineStatus(true));
  updateOnlineStatus(false);

  /* -----------------------------------------------------------------------
     Mobile nav drawer
     ----------------------------------------------------------------------- */
  const menuToggle = document.getElementById("menuToggle");
  const navDrawer = document.getElementById("navDrawer");

  function openDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.add("is-open");
    menuToggle && menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    const firstLink = navDrawer.querySelector("a");
    firstLink && firstLink.focus();
  }
  function closeDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.remove("is-open");
    menuToggle && menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    menuToggle && menuToggle.focus();
  }
  menuToggle && menuToggle.addEventListener("click", openDrawer);
  document.querySelectorAll("[data-close-drawer]").forEach((el) =>
    el.addEventListener("click", closeDrawer)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navDrawer && navDrawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  /* -----------------------------------------------------------------------
     Modals (generic open/close by data attributes)
     ----------------------------------------------------------------------- */
  let lastFocusedEl = null;

  function openModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    lastFocusedEl = document.activeElement;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const focusable = overlay.querySelector(
      "input, button, [href], select, textarea"
    );
    focusable && focusable.focus();
  }

  function closeModal(overlay) {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    lastFocusedEl && lastFocusedEl.focus();
  }

  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // If this trigger also closes a modal (e.g. switching sign in <-> sign up)
      const currentOverlay = btn.closest(".modal-overlay");
      if (currentOverlay && btn.hasAttribute("data-close-modal")) {
        closeModal(currentOverlay);
      }
      openModal(btn.getAttribute("data-open-modal"));
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const overlay = btn.closest(".modal-overlay");
      closeModal(overlay);
    });
  });

  document.querySelectorAll("[data-modal-overlay]").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach((overlay) => closeModal(overlay));
    }
  });

  // Basic focus trap for open modals
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const overlay = document.querySelector(".modal-overlay.is-open");
    if (!overlay) return;
    const focusables = overlay.querySelectorAll(
      'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* -----------------------------------------------------------------------
     Password visibility toggle
     ----------------------------------------------------------------------- */
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inputId = btn.getAttribute("data-toggle-password");
      const input = document.getElementById(inputId);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
      btn.innerHTML = isPassword
        ? '<svg width="18" height="18"><use href="#icon-eye-off"/></svg>'
        : '<svg width="18" height="18"><use href="#icon-eye"/></svg>';
    });
  });

  /* -----------------------------------------------------------------------
     Dropdown menu (generic open/close + selection pattern)
     ----------------------------------------------------------------------- */
  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    const trigger = dropdown.querySelector(".dropdown__trigger");
    const items = dropdown.querySelectorAll(".dropdown__item");
    if (!trigger) return;

    function toggle(open) {
      const isOpen = open !== undefined ? open : dropdown.getAttribute("data-open") !== "true";
      dropdown.setAttribute("data-open", String(isOpen));
      trigger.setAttribute("aria-expanded", String(isOpen));
    }

    trigger.addEventListener("click", () => toggle());

    items.forEach((item) => {
      item.addEventListener("click", () => {
        items.forEach((i) => i.setAttribute("aria-selected", "false"));
        item.setAttribute("aria-selected", "true");
        trigger.querySelector("span").textContent = item.textContent.trim();
        toggle(false);
      });
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) toggle(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggle(false);
    });
  });

  /* -----------------------------------------------------------------------
     Context menu (right-click + long-press-friendly click pattern)
     Wires up automatically if a page includes #contextMenuTrigger and a
     matching menu; currently unused on any shipped page, kept generic so
     future context-menu UI can opt in without new wiring.
     ----------------------------------------------------------------------- */
  const contextTrigger = document.getElementById("contextMenuTrigger");
  const contextMenu = document.getElementById("contextMenu");

  function openContextMenu(x, y) {
    if (!contextMenu) return;
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.classList.add("is-open");
  }
  function closeContextMenu() {
    contextMenu && contextMenu.classList.remove("is-open");
  }

  if (contextTrigger && contextMenu) {
    contextTrigger.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY);
    });
    contextTrigger.addEventListener("click", (e) => {
      const rect = contextTrigger.getBoundingClientRect();
      openContextMenu(rect.left, rect.bottom + 8);
    });
    document.addEventListener("click", (e) => {
      if (!contextMenu.contains(e.target) && e.target !== contextTrigger) {
        closeContextMenu();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeContextMenu();
    });
  }

  /* -----------------------------------------------------------------------
     Toast notifications
     ----------------------------------------------------------------------- */
  const toastRegion = document.getElementById("toastRegion");

  const TOAST_ICONS = {
    success: "icon-check-circle",
    danger: "icon-x-circle",
    warning: "icon-alert-triangle",
    info: "icon-info",
  };
  const TOAST_TITLES = {
    success: "Success",
    danger: "Something went wrong",
    warning: "Heads up",
    info: "Note",
  };

  function showToast(type, title, message) {
    if (!toastRegion) return;
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toastTitle = title || TOAST_TITLES[type] || TOAST_TITLES.info;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <svg class="toast__icon" width="20" height="20"><use href="#${icon}"/></svg>
      <div class="toast__content">
        <div class="toast__title">${toastTitle}</div>
        ${message ? `<div class="toast__message">${message}</div>` : ""}
      </div>
      <button class="toast__close" type="button" aria-label="Dismiss notification">
        <svg width="16" height="16"><use href="#icon-x"/></svg>
      </button>
    `;
    toastRegion.appendChild(toast);

    const remove = () => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 200);
    };
    toast.querySelector(".toast__close").addEventListener("click", remove);
    setTimeout(remove, 5000);
  }

  // Expose for other pages
  window.NemotronToast = showToast;

  /* -----------------------------------------------------------------------
     Guest mode entry points
     Any element with [data-continue-guest] anywhere in the app (sign-in
     modal, sign-up modal, auth.html page, onboarding) starts a guest
     session and routes to chat. Guest sessions never touch localStorage,
     see js/session.js, which also makes this the correct behavior in
     private/incognito windows without any extra branching here.
     ----------------------------------------------------------------------- */
  document.querySelectorAll("[data-continue-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.NemotronSession) window.NemotronSession.continueAsGuest();
      const inPagesDir = window.location.pathname.indexOf("/pages/") !== -1;
      window.location.href = inPagesDir ? "chat.html" : "pages/chat.html";
    });
  });

  /* -----------------------------------------------------------------------
     Reusable button loading-state helper (micro-interaction consistency)
     Any [data-loading-on-submit] form shows its submit button in the same
     spinner state chat.js/settings.js already use, for a consistent feel
     across every form in the product without duplicating the CSS class
     name in five different scripts.
     ----------------------------------------------------------------------- */
  document.querySelectorAll("[data-loading-on-submit]").forEach((form) => {
    form.addEventListener("submit", () => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.classList.add("btn--loading");
        submitBtn.disabled = true;
      }
    });
  });
})();
