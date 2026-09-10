/* =========================================================================
   NVIDIA Nemotron — Foundation behavior layer (vanilla JS, no dependencies)
   ========================================================================= */
(function () {
  "use strict";

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
     Offline / online banner
     ----------------------------------------------------------------------- */
  const offlineBanner = document.getElementById("offlineBanner");
  function updateOnlineStatus() {
    if (!offlineBanner) return;
    offlineBanner.classList.toggle("is-visible", !navigator.onLine);
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // Manual demo toggle (foundation showcase only)
  const offlineToggle = document.getElementById("offlineToggle");
  if (offlineToggle && offlineBanner) {
    offlineToggle.addEventListener("click", () => {
      offlineBanner.classList.toggle("is-visible");
    });
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
     Dropdown menu (single demo instance, generic pattern)
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
     Context menu (right-click + long-press-friendly click demo)
     ----------------------------------------------------------------------- */
  const contextTrigger = document.getElementById("contextMenuTrigger");
  const contextMenu = document.getElementById("demoContextMenu");

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

  // Expose for other pages / future milestones
  window.NemotronToast = showToast;

  // Demo triggers on landing page
  const DEMO_TOAST_MESSAGES = {
    success: "Your changes have been saved.",
    danger: "We couldn't complete that request.",
    warning: "You're approaching your usage limit.",
    info: "A new Nemotron model is available.",
  };
  document.querySelectorAll("[data-toast]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-toast");
      showToast(type, null, DEMO_TOAST_MESSAGES[type]);
    });
  });
})();
