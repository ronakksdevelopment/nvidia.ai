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
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      scrim.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    scrim.addEventListener("click", function () {
      nav.classList.remove("is-open");
      scrim.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        nav.classList.remove("is-open");
        scrim.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
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
