/**
 * Mobile navigation drawer + active link highlighting.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");

    if (toggle && links) {
      toggle.addEventListener("click", function () {
        const isOpen = links.classList.toggle("is-open");
        toggle.classList.toggle("is-active", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
        document.body.style.overflow = isOpen ? "hidden" : "";
      });

      links.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", function () {
          links.classList.remove("is-open");
          toggle.classList.remove("is-active");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });

      // Close on Escape
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && links.classList.contains("is-open")) {
          links.classList.remove("is-open");
          toggle.classList.remove("is-active");
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        }
      });
    }

    // Sticky header shadow-on-scroll
    const header = document.querySelector("[data-site-header]");
    if (header) {
      const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  });
})();
