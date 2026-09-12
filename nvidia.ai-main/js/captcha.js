/* =========================================================================
   NVIDIA Nemotron - Auth captcha + email validation
   Wires up every [data-nv-captcha] widget (Sign In modal, Sign Up modal,
   auth.html) and every email <input type="email"> inside an .auth-form.
   No backend: this is a client-side friction/anti-bot-style affordance,
   not real bot defense. It never blocks a legitimate signed-in flow beyond
   requiring the checkbox to reach a verified state.
   ========================================================================= */
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* -----------------------------------------------------------------------
     Email validation: standard format check on blur + on submit, shared by
     every auth form (sign-in modal, sign-up modal, auth.html).
     ----------------------------------------------------------------------- */
  function isValidEmail(value) {
    return EMAIL_RE.test(String(value || "").trim());
  }

  function wireEmailValidation(form) {
    var emailInput = form.querySelector('input[type="email"]');
    if (!emailInput) return;
    var errorEl = null;
    if (emailInput.id) errorEl = document.getElementById(emailInput.id + "Error");
    if (!errorEl) {
      var wrap = emailInput.closest(".field");
      errorEl = wrap && wrap.querySelector(".field__error");
    }

    function setInvalid(invalid) {
      emailInput.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (errorEl) errorEl.hidden = !invalid;
    }

    emailInput.addEventListener("blur", function () {
      if (!emailInput.value.trim()) { setInvalid(false); return; }
      setInvalid(!isValidEmail(emailInput.value));
    });
    emailInput.addEventListener("input", function () {
      if (emailInput.getAttribute("aria-invalid") === "true" && isValidEmail(emailInput.value)) {
        setInvalid(false);
      }
    });

    form.__nvValidateEmail = function () {
      if (!emailInput.value.trim()) return true; // optional field, matches existing non-required behavior
      var valid = isValidEmail(emailInput.value);
      setInvalid(!valid);
      if (!valid) emailInput.focus();
      return valid;
    };
  }

  /* -----------------------------------------------------------------------
     Captcha widget: checkbox -> spinner -> auto-verify, mirroring the
     familiar "I'm not a robot" pattern without pretending to talk to any
     real verification service.
     ----------------------------------------------------------------------- */
  function initCaptcha(root) {
    var checkbox = root.querySelector("[data-nv-captcha-checkbox]");
    var statusEl = root.querySelector("[data-nv-captcha-status]");
    if (!checkbox) return;

    function setStatus(text, visible) {
      if (!statusEl) return;
      statusEl.textContent = text || "";
      statusEl.hidden = !visible;
    }

    function markVerified() {
      root.setAttribute("data-state", "verified");
      root.setAttribute("data-verified", "true");
      checkbox.checked = true;
      checkbox.disabled = true;
      setStatus("Verification complete.", true);
    }

    checkbox.addEventListener("change", function () {
      if (!checkbox.checked) {
        root.setAttribute("data-state", "idle");
        root.removeAttribute("data-verified");
        setStatus("", false);
        return;
      }
      checkbox.checked = false; // stays visually unchecked until verification resolves
      root.setAttribute("data-state", "checking");
      setStatus("", false);
      var delay = 500 + Math.random() * 700;
      setTimeout(function () {
        markVerified();
      }, delay);
    });

    root.setAttribute("data-state", "idle");
  }

  function isCaptchaVerified(root) {
    return !root || root.getAttribute("data-verified") === "true";
  }

  /* -----------------------------------------------------------------------
     Gate every .auth-form submit on: valid email (if filled in) + a
     verified captcha (if the form has one). Runs in the capture phase so
     it executes before any page-specific submit handler (index.html /
     auth.html inline scripts) that performs the actual sign-in.
     ----------------------------------------------------------------------- */
  function wireFormGuard(form) {
    var captchaRoot = form.querySelector("[data-nv-captcha]") ||
      (form.closest(".modal, .auth-card") || document).querySelector("[data-nv-captcha]");

    form.addEventListener("submit", function (e) {
      var emailOk = form.__nvValidateEmail ? form.__nvValidateEmail() : true;
      if (!emailOk) { e.preventDefault(); e.stopImmediatePropagation(); return; }

      if (captchaRoot && !isCaptchaVerified(captchaRoot)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (window.NemotronToast) {
          window.NemotronToast("warning", "Verify you're human", "Please complete the checkbox before continuing.");
        }
        captchaRoot.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-nv-captcha]").forEach(initCaptcha);
    document.querySelectorAll("form.auth-form").forEach(function (form) {
      wireEmailValidation(form);
      wireFormGuard(form);
    });
  });

  window.NemotronCaptcha = { isValidEmail: isValidEmail };
})();
