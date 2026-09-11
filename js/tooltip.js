/* =========================================================================
   NVIDIA Nemotron - Custom tooltip controller
   Replaces the native browser `title=` popup everywhere in the app with a
   themed, on-brand tooltip. Self-contained (no dependency on app.js) so it
   can be safely included on every page, including chat.html which manages
   its own toast/modal wiring separately.

   Works via event delegation reading [title] or [data-tooltip] live, which
   means it covers elements already in the page AND anything injected later
   (chat.js message action buttons, settings.js dropdown, history rows,
   etc.) with zero extra wiring required in those scripts. The native title
   attribute is neutralized the instant a hover/focus begins (moved to
   data-tooltip) so the browser's own gray tooltip never gets a chance to
   appear, even on the very first hover of a freshly-rendered element.
   ========================================================================= */
(function () {
  "use strict";

  let tooltipEl = null;
  let tooltipShowTimer = null;
  let tooltipTarget = null;

  function getTooltipEl() {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "nv-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function positionTooltip(target) {
    const el = getTooltipEl();
    const rect = target.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    let top = rect.top - tipRect.height - 8;
    if (top < 8) top = rect.bottom + 8; // flip below if there's no room above
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function neutralizeNativeTitle(target) {
    const native = target.getAttribute("title");
    if (native) {
      target.setAttribute("data-tooltip", native);
      target.removeAttribute("title");
    }
  }

  function showTooltip(target) {
    const text = target.getAttribute("data-tooltip") || "";
    if (!text) return;
    tooltipTarget = target;
    const el = getTooltipEl();
    el.textContent = text;
    el.classList.remove("is-visible");
    requestAnimationFrame(() => {
      if (tooltipTarget !== target) return;
      positionTooltip(target);
      el.classList.add("is-visible");
    });
  }

  function hideTooltip() {
    tooltipTarget = null;
    clearTimeout(tooltipShowTimer);
    if (tooltipEl) tooltipEl.classList.remove("is-visible");
  }

  function scheduleTooltip(target) {
    clearTimeout(tooltipShowTimer);
    tooltipShowTimer = setTimeout(() => showTooltip(target), 450);
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[title], [data-tooltip]");
    if (!target) return;
    neutralizeNativeTitle(target);
    scheduleTooltip(target);
  });
  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[title], [data-tooltip]");
    if (!target) return;
    if (e.relatedTarget && target.contains(e.relatedTarget)) return;
    hideTooltip();
  });
  document.addEventListener("focusin", (e) => {
    const target = e.target.closest("[title], [data-tooltip]");
    if (!target) return;
    neutralizeNativeTitle(target);
    showTooltip(target);
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.closest("[title], [data-tooltip]")) hideTooltip();
  });
  document.addEventListener("click", () => hideTooltip());
  window.addEventListener("scroll", hideTooltip, true);
})();
