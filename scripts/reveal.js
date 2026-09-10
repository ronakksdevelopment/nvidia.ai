/**
 * Scroll-reveal — reveals elements marked with [data-reveal] as they enter
 * the viewport. Staggers siblings inside the same container slightly for a
 * single orchestrated motion rather than scattered per-element animation.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const items = document.querySelectorAll("[data-reveal]");

    if (!items.length) return;

    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const groups = new Map();
    items.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });

    groups.forEach((siblings) => {
      siblings.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
      });
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach((el) => observer.observe(el));
  });
})();
