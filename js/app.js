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
     Scroll lock (shared by the mobile nav drawer and modals)
     Plain `body.style.overflow = "hidden"` does not reliably stop iOS
     Safari from rubber-band-panning the page horizontally behind an open
     overlay - that gesture scrolls the visual viewport, not an
     overflow-able box. Pinning <html> with position:fixed (see the
     .nv-scroll-locked rule in styles.css) actually removes the page from
     the scroll root while an overlay is open. Scroll position is saved
     and restored so closing the drawer/modal doesn't jump the page back
     to the top. A simple counter lets the drawer and a modal both be
     "open" (e.g. drawer open, then a link inside it opens a modal)
     without the first close call re-enabling scroll too early.
     ----------------------------------------------------------------------- */
  let scrollLockCount = 0;
  let savedScrollY = 0;
  function lockPageScroll() {
    if (scrollLockCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.classList.add("nv-scroll-locked");
      document.body.style.top = -savedScrollY + "px";
    }
    scrollLockCount++;
  }
  function unlockPageScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.documentElement.classList.remove("nv-scroll-locked");
      document.body.style.top = "";
      window.scrollTo(0, savedScrollY);
    }
  }

  /* -----------------------------------------------------------------------
     Mobile nav drawer
     ----------------------------------------------------------------------- */
  const menuToggle = document.getElementById("menuToggle");
  const navDrawer = document.getElementById("navDrawer");

  function openDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.add("is-open");
    menuToggle && menuToggle.setAttribute("aria-expanded", "true");
    lockPageScroll();
    const firstLink = navDrawer.querySelector("a");
    firstLink && firstLink.focus();
  }
  function closeDrawer() {
    if (!navDrawer) return;
    if (!navDrawer.classList.contains("is-open")) return;
    navDrawer.classList.remove("is-open");
    menuToggle && menuToggle.setAttribute("aria-expanded", "false");
    unlockPageScroll();
    menuToggle && menuToggle.focus();
  }
  menuToggle && menuToggle.addEventListener("click", openDrawer);
  document.querySelectorAll("[data-close-drawer]").forEach((el) =>
    el.addEventListener("click", closeDrawer)
  );

  // In-page anchor links inside the mobile drawer (Home / Features / Models)
  // need to close the drawer AND scroll to the target section. The page is
  // pinned with position:fixed while the drawer is open (see
  // .nv-scroll-locked), so the browser's native anchor jump can't do
  // anything - it silently no-ops, which looked like the links "did
  // nothing". unlockPageScroll() also restores the pre-drawer scroll
  // position, which would immediately undo a native jump anyway. Instead,
  // close the drawer first, then scroll to the target on the next frame
  // once the page is unlocked.
  if (navDrawer) {
    navDrawer.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        closeDrawer();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
      });
    });
  }
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
    // Close any other modal that's already open first. Without this, a
    // trigger button that lives outside the currently-open modal (e.g. a
    // header "Get started" button while "Sign in" is open) opens a second
    // overlay on top of the first, stacking two full-screen backdrops at
    // the same z-index. Only trigger buttons with data-close-modal handled
    // this before; this guard makes it unconditional for every open call.
    document.querySelectorAll(".modal-overlay.is-open").forEach((openOverlay) => {
      if (openOverlay !== overlay) closeModal(openOverlay);
    });
    lastFocusedEl = document.activeElement;
    overlay.classList.add("is-open");
    lockPageScroll();
    const focusable = overlay.querySelector(
      "input, button, [href], select, textarea"
    );
    focusable && focusable.focus();
  }

  function closeModal(overlay) {
    if (!overlay) return;
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    unlockPageScroll();
    lastFocusedEl && lastFocusedEl.focus();
  }

  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // If this trigger also closes a modal (e.g. switching sign in <-> sign up)
      const currentOverlay = btn.closest(".modal-overlay");
      if (currentOverlay && btn.hasAttribute("data-close-modal")) {
        closeModal(currentOverlay);
      }
      // The mobile Sign in / Get started buttons live inside the nav
      // drawer. Opening a modal from there must close the drawer first,
      // or two full-screen fixed overlays stack on top of each other and
      // the drawer visually blocks/darkens the modal behind it.
      if (navDrawer && navDrawer.classList.contains("is-open")) {
        closeDrawer();
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

  // Exposed so pages with modals opened programmatically from their own
  // script (e.g. settings.js's reset-confirm modal) go through the same
  // scroll-lock counter as every other modal, instead of re-implementing
  // a separate, easily-mismatched open/close pair.
  window.NemotronModal = {
    open: openModal,
    close: (id) => closeModal(typeof id === "string" ? document.getElementById(id) : id),
  };

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
        ? '<i class="fa-solid fa-eye-slash nv-icon" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-eye nv-icon" aria-hidden="true"></i>';
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
    success: "fa-circle-check",
    danger: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
  };
  const TOAST_TITLES = {
    success: "Success",
    danger: "Something went wrong",
    warning: "Heads up",
    info: "Note",
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(type, title, message) {
    if (!toastRegion) return;
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toastTitle = title || TOAST_TITLES[type] || TOAST_TITLES.info;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <i class="fa-solid ${icon} toast__icon nv-icon" aria-hidden="true"></i>
      <div class="toast__content">
        <div class="toast__title">${escapeHtml(toastTitle)}</div>
        ${message ? `<div class="toast__message">${escapeHtml(message)}</div>` : ""}
      </div>
      <button class="toast__close" type="button" aria-label="Dismiss notification">
        <i class="fa-solid fa-xmark nv-icon" aria-hidden="true"></i>
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
