/**
 * Theme toggle — persists the user's dark/light preference in localStorage
 * and falls back to the OS-level preference on first visit.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "accelerate-theme";
  const root = document.documentElement;

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    root.style.colorScheme = theme;
    document
      .querySelectorAll("[data-theme-toggle]")
      .forEach((btn) => btn.setAttribute("aria-pressed", String(theme === "light")));
  }

  // Apply immediately (also mirrored by the inline blocking script in <head>)
  applyTheme(getPreferredTheme());

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", function () {
        const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
        const next = current === "light" ? "dark" : "light";
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
      });
    });
  });
})();
