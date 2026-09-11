/* =========================================================================
   NVIDIA Nemotron - Shared mobile drawer behavior for settings-shell pages
   (Profile, About, Help/FAQ, Privacy, Terms). settings.html has its own
   inline wiring inside settings.js. This file is for the static pages.
   ========================================================================= */
(function () {
  "use strict";
  var toggle = document.getElementById("settingsNavToggle");
  var nav = document.getElementById("settingsNav");
  var scrim = document.getElementById("settingsNavScrim");

  if (toggle && nav && scrim) {
    // Plain overflow:hidden on body does not reliably stop iOS Safari's
    // rubber-band horizontal pan/swipe of the page behind an open drawer.
    // Pinning <html> with position:fixed (.nv-scroll-locked in
    // styles.css) removes the page from the scroll root while this
    // drawer is open, and the saved offset is restored on close.
    var savedScrollY = 0;
    function openNav() {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.classList.add("nv-scroll-locked");
      document.body.style.top = -savedScrollY + "px";
      nav.classList.add("is-open");
      scrim.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      if (!nav.classList.contains("is-open")) return;
      document.documentElement.classList.remove("nv-scroll-locked");
      document.body.style.top = "";
      window.scrollTo(0, savedScrollY);
      nav.classList.remove("is-open");
      scrim.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      nav.classList.contains("is-open") ? closeNav() : openNav();
    });
    scrim.addEventListener("click", closeNav);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  // FAQ accordion (only present on help.html, harmless no-op elsewhere)
  document.querySelectorAll(".faq-item__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".faq-item");
      var isOpen = item.getAttribute("data-open") === "true";
      document.querySelectorAll(".faq-item").forEach(function (i) {
        i.setAttribute("data-open", "false");
      });
      item.setAttribute("data-open", isOpen ? "false" : "true");
    });
  });

  // FAQ search (only present on help.html, harmless no-op elsewhere)
  var faqSearchInput = document.getElementById("faqSearchInput");
  var faqEmpty = document.getElementById("faqEmpty");
  if (faqSearchInput) {
    var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));
    faqSearchInput.addEventListener("input", function () {
      var q = faqSearchInput.value.trim().toLowerCase();
      var visibleCount = 0;
      faqItems.forEach(function (item) {
        var text = item.textContent.toLowerCase();
        var matches = !q || text.indexOf(q) !== -1;
        item.hidden = !matches;
        if (matches) visibleCount++;
      });
      if (faqEmpty) faqEmpty.hidden = visibleCount !== 0;
    });
  }
})();
