/**
 * Contact form — client-side validation and a simulated local submit.
 * No backend is wired up (this is a frontend-only project); replace the
 * `handleSubmit` body with a real fetch() call to your endpoint or a form
 * service (Formspree, Netlify Forms, etc.) when you have one.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const successBanner = document.querySelector("[data-form-success]");

    function showError(fieldName, show) {
      const el = form.querySelector('[data-error-for="' + fieldName + '"]');
      if (el) el.style.display = show ? "block" : "none";
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validate() {
      let valid = true;

      const name = form.querySelector("#name");
      if (!name.value.trim()) {
        showError("name", true);
        valid = false;
      } else {
        showError("name", false);
      }

      const email = form.querySelector("#email");
      if (!isValidEmail(email.value.trim())) {
        showError("email", true);
        valid = false;
      } else {
        showError("email", false);
      }

      const message = form.querySelector("#message");
      if (!message.value.trim()) {
        showError("message", true);
        valid = false;
      } else {
        showError("message", false);
      }

      return valid;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validate()) return;

      // Frontend-only demo: simulate a successful send locally.
      // Replace this block with a real network request when a backend exists.
      form.reset();
      form.style.display = "none";
      if (successBanner) successBanner.classList.add("is-visible");
    });

    // Clear individual field errors as the user corrects them
    ["name", "email", "message"].forEach((id) => {
      const field = form.querySelector("#" + id);
      if (field) {
        field.addEventListener("input", () => showError(id, false));
      }
    });
  });
})();
