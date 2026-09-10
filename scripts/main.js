/**
 * General page behaviour: footer year, prompt-deck micro interaction demo,
 * and copy-to-clipboard for the code showcase.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Footer year
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });

    // Prompt deck demo: live character counter + enter-to-"submit" pulse
    const textarea = document.querySelector("[data-prompt-input]");
    const counter = document.querySelector("[data-prompt-counter]");
    const submitBtn = document.querySelector("[data-prompt-submit]");
    const maxContext = 128000;

    function updateCounter() {
      if (!textarea || !counter) return;
      const len = textarea.value.length;
      const kTokens = Math.min(Math.round(len / 4), maxContext);
      counter.textContent = kTokens.toLocaleString() + " / 128k ctx";
    }

    if (textarea) {
      textarea.addEventListener("input", updateCounter);
      updateCounter();

      textarea.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          triggerSubmitPulse();
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", triggerSubmitPulse);
    }

    function triggerSubmitPulse() {
      if (!submitBtn) return;
      submitBtn.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.9)" },
          { transform: "scale(1)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.16,1,0.3,1)" }
      );
      if (textarea && textarea.value.trim().length) {
        textarea.value = "";
        updateCounter();
      }
    }

    // Copy-to-clipboard for code showcase
    document.querySelectorAll("[data-copy-target]").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const targetId = btn.getAttribute("data-copy-target");
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;
        const text = target.textContent || "";
        try {
          await navigator.clipboard.writeText(text);
          const original = btn.textContent;
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.textContent = original;
          }, 1600);
        } catch (err) {
          /* Clipboard API unavailable — fail silently, no console noise for users */
        }
      });
    });
  });
})();
