/* =========================================================================
   NVIDIA Nemotron - Settings and OpenRouter integration (vanilla JS)
   Handles: API key validation, Save/Reset, localStorage persistence,
   model dropdown metadata, theme selection, and a live OpenRouter
   chat-completions test call using the user-supplied key.
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Storage keys
     ----------------------------------------------------------------------- */
  const STORAGE_KEY = "nemotron.settings";
  const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

  const DEFAULT_CUSTOM_INSTRUCTIONS =
    "Be concise and direct. Skip filler like \u201cGreat question!\u201d and get straight to the answer. " +
    "Prefer plain language over jargon, and explain technical terms the first time you use them. " +
    "When giving code, include brief comments only where the logic isn't obvious. " +
    "If a request is ambiguous, make a reasonable assumption and say what you assumed rather than stopping to ask.";

  const DEFAULT_SETTINGS = {
    apiKey: "",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    theme: "dark",
    customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
  };

  /* -----------------------------------------------------------------------
     The exact 8 free NVIDIA models exposed on OpenRouter
     ----------------------------------------------------------------------- */
  const MODELS = {
    "nvidia/nemotron-3-ultra-550b-a55b:free": {
      name: "Nemotron 3 Ultra",
      desc: "Frontier reasoning & orchestration model. 55B active / 550B total params (MoE), 1M token context. Built for long-running agentic workflows.",
      tags: ["Free", "1M context", "Reasoning"],
    },
    "nvidia/nemotron-3.5-lightning:free": {
      name: "Nemotron 3.5 Lightning",
      desc: "High-throughput mixture-of-experts model with 3B active / 30B total params. Tuned for fast agentic workloads.",
      tags: ["Free", "Fast", "Agentic"],
    },
    "nvidia/nemotron-3-super-120b-a12b:free": {
      name: "Nemotron 3 Super",
      desc: "120B-parameter hybrid MoE model activating 12B parameters, tuned for complex multi-agent applications with a 1M token context window.",
      tags: ["Free", "1M context", "Multi-agent"],
    },
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
      name: "Nemotron 3 Nano Omni (Reasoning)",
      desc: "Compact omni-modal reasoning model, 3B active / 30B total params. Good balance of speed and step-by-step reasoning.",
      tags: ["Free", "Reasoning", "Omni"],
    },
    "nvidia/llama-nemotron-rerank-vl-1b-v2:free": {
      name: "Llama Nemotron Rerank VL 1B v2",
      desc: "1.7B-parameter multimodal cross-encoder reranker for ordering retrieved text and document-image candidates by relevance.",
      tags: ["Free", "Rerank", "Multimodal"],
    },
    "nvidia/nemotron-3.5-content-safety:free": {
      name: "Nemotron 3.5 Content Safety",
      desc: "Compact multimodal guardrail model for prompt & response moderation, safety classification, and policy enforcement.",
      tags: ["Free", "Guardrail", "Multimodal"],
    },
    "nvidia/llama-nemotron-embed-vl-1b-v2:free": {
      name: "Llama Nemotron Embed VL 1B v2",
      desc: "Multimodal bi-encoder embedding model for text and document-image retrieval pipelines.",
      tags: ["Free", "Embedding", "Multimodal"],
    },
    "nvidia/nemotron-3-embed-1b:free": {
      name: "Nemotron 3 Embed 1B",
      desc: "Open text embedding model optimized for high-throughput, low-latency retrieval.",
      tags: ["Free", "Embedding", "Text"],
    },
  };

  const API_KEY_PATTERN = /^sk-or-v1-[A-Za-z0-9]{20,}$/;

  /* -----------------------------------------------------------------------
     Storage helpers (needed by every page, not just the settings form)
     ----------------------------------------------------------------------- */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function persistSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSettings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function friendlyModelName(modelId) {
    return (MODELS[modelId] && MODELS[modelId].name) || modelId.replace("nvidia/", "").replace(":free", "");
  }

  /* -----------------------------------------------------------------------
     Theme application (Dark / Light / System) — runs on every page that
     includes this script, since the chosen theme has to apply everywhere,
     not only on the settings form itself.
     ----------------------------------------------------------------------- */
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");

  function applyTheme(theme) {
    const resolved = theme === "system"
      ? (prefersLight && prefersLight.matches ? "light" : "dark")
      : theme;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-pref", theme);
  }

  if (prefersLight) {
    prefersLight.addEventListener
      ? prefersLight.addEventListener("change", () => {
          const current = loadSettings();
          if (current.theme === "system") applyTheme("system");
        })
      : null;
  }

  /* Always expose shared data/helpers, even on pages without the full
     settings form (e.g. profile.html needs MODELS to show a friendly
     model name instead of the raw OpenRouter id). */
  window.NemotronSettings = {
    load: loadSettings,
    save: persistSettings,
    clear: clearSettings,
    applyTheme: applyTheme,
    friendlyModelName: friendlyModelName,
    MODELS: MODELS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    DEFAULT_CUSTOM_INSTRUCTIONS: DEFAULT_CUSTOM_INSTRUCTIONS,
  };

  /* The rest of this file wires up the settings FORM itself. Pages that
     only need the shared data/theme helpers above (like profile.html)
     don't include #settingsForm, so bail out here rather than throwing
     on null element lookups. */
  const form = document.getElementById("settingsForm");
  if (!form) return;

  /* -----------------------------------------------------------------------
     Elements
     ----------------------------------------------------------------------- */
  const apiKeyInput = document.getElementById("apiKeyInput");
  const apiKeyError = document.getElementById("apiKeyError");
  const apiKeyErrorText = document.getElementById("apiKeyErrorText");
  const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
  const pasteKeyBtn = document.getElementById("pasteKeyBtn");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const keyStatus = document.getElementById("keyStatus");
  const keyStatusText = document.getElementById("keyStatusText");

  const modelSelect = document.getElementById("modelSelect");
  const modelMetaName = document.getElementById("modelMetaName");
  const modelMetaId = document.getElementById("modelMetaId");
  const modelMetaDesc = document.getElementById("modelMetaDesc");
  const modelMetaTags = document.getElementById("modelMetaTags");

  const themeInputs = document.querySelectorAll('input[name="theme"]');

  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const testStatus = document.getElementById("testStatus");
  const testOutput = document.getElementById("testOutput");

  const resetSettingsBtn = document.getElementById("resetSettingsBtn");
  const confirmResetBtn = document.getElementById("confirmResetBtn");
  const discardBtn = document.getElementById("discardBtn");
  const saveStatus = document.getElementById("saveStatus");

  const settingsNavToggle = document.getElementById("settingsNavToggle");
  const settingsNav = document.getElementById("settingsNav");
  const settingsNavScrim = document.getElementById("settingsNavScrim");

  const customInstructionsInput = document.getElementById("customInstructionsInput");
  const customInstructionsCount = document.getElementById("customInstructionsCount");
  const restoreDefaultInstructionsBtn = document.getElementById("restoreDefaultInstructionsBtn");

  function toast(type, title, message) {
    if (window.NemotronToast) window.NemotronToast(type, title, message);
  }

  /* -----------------------------------------------------------------------
     Validation
     ----------------------------------------------------------------------- */
  function validateApiKey(value) {
    if (!value) {
      return { valid: true, empty: true }; // empty is allowed (key is optional until sending)
    }
    if (value.length < 20) {
      return { valid: false, message: "That key looks too short to be a real OpenRouter key." };
    }
    if (!API_KEY_PATTERN.test(value)) {
      return { valid: false, message: "OpenRouter keys start with \u201csk-or-v1-\u201d. Double-check you copied the full key." };
    }
    return { valid: true, empty: false };
  }

  function setFieldError(message) {
    if (message) {
      apiKeyInput.setAttribute("aria-invalid", "true");
      apiKeyErrorText.textContent = message;
      apiKeyError.hidden = false;
    } else {
      apiKeyInput.removeAttribute("aria-invalid");
      apiKeyError.hidden = true;
    }
  }

  function setKeyStatus(state, message) {
    keyStatus.className = "key-status key-status--" + state;
    keyStatusText.textContent = message;
    const iconMap = {
      idle: "fa-circle-info",
      checking: "fa-rotate-right",
      valid: "fa-circle-check",
      invalid: "fa-circle-xmark",
    };
    const icon = keyStatus.querySelector(".nv-icon");
    if (icon) {
      icon.className = "fa-solid " + (iconMap[state] || iconMap.idle) + " nv-icon nv-icon--sm";
      icon.classList.toggle("fa-spin", state === "checking");
    }
  }

  /* -----------------------------------------------------------------------
     Model metadata rendering
     ----------------------------------------------------------------------- */
  function renderModelMeta(modelId) {
    const meta = MODELS[modelId];
    if (!meta) return;
    modelMetaName.textContent = meta.name;
    modelMetaId.textContent = modelId;
    modelMetaDesc.textContent = meta.desc;
    modelMetaTags.innerHTML = meta.tags
      .map((t, i) => `<span class="badge ${i === 0 ? "badge--brand" : "badge--neutral"}">${t}</span>`)
      .join("");
  }

  /* -----------------------------------------------------------------------
     Custom model dropdown (.nv-dropdown)
     Replaces the native <select> popup — which can't be themed and shows
     as a plain OS list — with a fully CSS-controlled listbox so the open
     menu carries the same green brand highlight as the rest of the UI.
     The real <select id="modelSelect"> stays in the DOM (visually hidden)
     as the single source of truth: this controller only reflects it and
     writes back to it, dispatching a real "change" event so every other
     place in the app that reads modelSelect.value keeps working untouched.
     ----------------------------------------------------------------------- */
  const modelDropdown = document.getElementById("modelDropdown");
  const modelSelectTrigger = document.getElementById("modelSelectTrigger");
  const modelSelectTriggerText = document.getElementById("modelSelectTriggerText");
  const modelSelectListbox = document.getElementById("modelSelectListbox");
  const modelDropdownOptions = modelSelectListbox
    ? Array.from(modelSelectListbox.querySelectorAll(".nv-dropdown__option"))
    : [];

  function syncDropdownUI(value) {
    if (!modelSelectTriggerText || !modelDropdownOptions.length) return;
    const meta = MODELS[value];
    modelSelectTriggerText.textContent = meta ? meta.name : friendlyModelName(value);
    modelDropdownOptions.forEach((opt) => {
      const isSelected = opt.getAttribute("data-value") === value;
      opt.classList.toggle("is-selected", isSelected);
      opt.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function openDropdown() {
    if (!modelSelectListbox) return;
    modelSelectListbox.hidden = false;
    modelSelectTrigger.setAttribute("aria-expanded", "true");
    const active = modelSelectListbox.querySelector(".nv-dropdown__option.is-selected") || modelDropdownOptions[0];
    modelDropdownOptions.forEach((o) => o.classList.remove("is-active"));
    if (active) {
      active.classList.add("is-active");
      active.scrollIntoView({ block: "nearest" });
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDropdownKeydown);
  }

  function closeDropdown() {
    if (!modelSelectListbox) return;
    modelSelectListbox.hidden = true;
    modelSelectTrigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onDropdownKeydown);
  }

  function isDropdownOpen() {
    return modelSelectListbox && !modelSelectListbox.hidden;
  }

  function chooseOption(optionEl) {
    if (!optionEl) return;
    const value = optionEl.getAttribute("data-value");
    if (modelSelect.value !== value) {
      modelSelect.value = value;
      modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    syncDropdownUI(value);
    closeDropdown();
    modelSelectTrigger.focus();
  }

  function onDocClick(e) {
    if (modelDropdown && !modelDropdown.contains(e.target)) closeDropdown();
  }

  function onDropdownKeydown(e) {
    if (!isDropdownOpen()) return;
    const activeIndex = modelDropdownOptions.findIndex((o) => o.classList.contains("is-active"));
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      modelSelectTrigger.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = modelDropdownOptions[Math.min(activeIndex + 1, modelDropdownOptions.length - 1)];
      modelDropdownOptions.forEach((o) => o.classList.remove("is-active"));
      next.classList.add("is-active");
      next.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = modelDropdownOptions[Math.max(activeIndex - 1, 0)];
      modelDropdownOptions.forEach((o) => o.classList.remove("is-active"));
      prev.classList.add("is-active");
      prev.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chooseOption(modelDropdownOptions[activeIndex] || modelDropdownOptions[0]);
    }
  }

  if (modelSelectTrigger && modelSelectListbox) {
    modelSelectTrigger.addEventListener("click", () => {
      if (isDropdownOpen()) closeDropdown();
      else openDropdown();
    });
    modelDropdownOptions.forEach((opt) => {
      opt.addEventListener("mouseenter", () => {
        modelDropdownOptions.forEach((o) => o.classList.remove("is-active"));
        opt.classList.add("is-active");
      });
      opt.addEventListener("click", () => chooseOption(opt));
    });
  }

  /* -----------------------------------------------------------------------
     Populate form from storage
     ----------------------------------------------------------------------- */
  function populateForm(settings) {
    apiKeyInput.value = settings.apiKey || "";
    if (MODELS[settings.model]) {
      modelSelect.value = settings.model;
    }
    renderModelMeta(modelSelect.value);
    syncDropdownUI(modelSelect.value);

    themeInputs.forEach((input) => {
      input.checked = input.value === settings.theme;
    });
    applyTheme(settings.theme);

    if (customInstructionsInput) {
      customInstructionsInput.value = settings.customInstructions || "";
      updateInstructionsCount();
    }

    if (settings.apiKey) {
      const result = validateApiKey(settings.apiKey);
      if (result.valid) {
        setKeyStatus("valid", "Key saved on this device.");
      } else {
        setKeyStatus("invalid", "Saved key doesn't look valid. You may want to update it.");
      }
      testStatus.querySelector("span").textContent = "Ready to test your saved key.";
      testStatus.className = "key-status key-status--idle";
    } else {
      setKeyStatus("idle", "No key saved yet.");
      testStatus.querySelector("span").textContent = "Save a key first to run a test.";
    }
  }

  /* -----------------------------------------------------------------------
     Custom instructions: character counter + restore default
     ----------------------------------------------------------------------- */
  const INSTRUCTIONS_MAX = 1500;
  function updateInstructionsCount() {
    if (!customInstructionsInput || !customInstructionsCount) return;
    const len = customInstructionsInput.value.length;
    customInstructionsCount.textContent = len + " / " + INSTRUCTIONS_MAX;
    customInstructionsCount.classList.toggle("is-over", len > INSTRUCTIONS_MAX);
  }
  if (customInstructionsInput) {
    customInstructionsInput.setAttribute("maxlength", String(INSTRUCTIONS_MAX));
    customInstructionsInput.addEventListener("input", updateInstructionsCount);
  }
  if (restoreDefaultInstructionsBtn) {
    restoreDefaultInstructionsBtn.addEventListener("click", () => {
      customInstructionsInput.value = DEFAULT_CUSTOM_INSTRUCTIONS;
      updateInstructionsCount();
      customInstructionsInput.focus();
      toast("info", "Default restored", "Custom instructions reset to the suggested default. Save to apply.");
    });
  }

  /* -----------------------------------------------------------------------
     Init
     ----------------------------------------------------------------------- */
  let currentSettings = loadSettings();
  populateForm(currentSettings);

  /* -----------------------------------------------------------------------
     Live validation as user types
     ----------------------------------------------------------------------- */
  apiKeyInput.addEventListener("input", () => {
    const result = validateApiKey(apiKeyInput.value.trim());
    if (result.empty) {
      setFieldError(null);
      setKeyStatus("idle", "No key entered.");
      return;
    }
    if (!result.valid) {
      setFieldError(result.message);
      setKeyStatus("invalid", "Key format looks incorrect.");
    } else {
      setFieldError(null);
      setKeyStatus("idle", "Key looks valid. Remember to save.");
    }
  });

  /* -----------------------------------------------------------------------
     Show / hide key
     ----------------------------------------------------------------------- */
  toggleKeyVisibility.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKeyVisibility.setAttribute("aria-label", isPassword ? "Hide API key" : "Show API key");
    toggleKeyVisibility.innerHTML = isPassword
      ? '<i class="fa-solid fa-eye-slash nv-icon" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-eye nv-icon" aria-hidden="true"></i>';
  });

  /* -----------------------------------------------------------------------
     Paste from clipboard
     ----------------------------------------------------------------------- */
  pasteKeyBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        apiKeyInput.value = text.trim();
        apiKeyInput.dispatchEvent(new Event("input"));
        toast("info", "Pasted", "API key pasted from clipboard.");
      }
    } catch (e) {
      toast("warning", "Clipboard unavailable", "Paste the key manually instead.");
    }
  });

  /* -----------------------------------------------------------------------
     Model change
     ----------------------------------------------------------------------- */
  modelSelect.addEventListener("change", () => {
    renderModelMeta(modelSelect.value);
    syncDropdownUI(modelSelect.value);
  });

  /* -----------------------------------------------------------------------
     Theme change (applies live, saved on Save)
     ----------------------------------------------------------------------- */
  themeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      applyTheme(input.value);
    });
  });

  /* -----------------------------------------------------------------------
     Save (shared by the form submit and the inline API-key Save button)
     ----------------------------------------------------------------------- */
  function saveAllSettings(options) {
    const opts = options || {};
    const rawKey = apiKeyInput.value.trim();
    const result = validateApiKey(rawKey);

    if (!result.valid) {
      setFieldError(result.message);
      apiKeyInput.focus();
      toast("danger", "Couldn't save", "Fix the API key field before saving.");
      return false;
    }
    setFieldError(null);

    const selectedTheme = document.querySelector('input[name="theme"]:checked');

    const newSettings = {
      apiKey: rawKey,
      model: modelSelect.value,
      theme: selectedTheme ? selectedTheme.value : "dark",
      customInstructions: customInstructionsInput ? customInstructionsInput.value.slice(0, INSTRUCTIONS_MAX) : "",
    };

    const ok = persistSettings(newSettings);
    currentSettings = newSettings;

    if (ok) {
      if (rawKey) {
        setKeyStatus("valid", "Key saved on this device.");
        testStatus.querySelector("span").textContent = "Ready to test your saved key.";
        testStatus.className = "key-status key-status--idle";
      } else {
        setKeyStatus("idle", "No key saved yet.");
      }
      applyTheme(newSettings.theme);
      if (opts.scope === "key") {
        toast("success", "API key saved", "Your OpenRouter key is stored on this device.");
      } else {
        toast("success", "Settings saved", "Your OpenRouter key, model, and theme are stored on this device.");
      }
      flashSaveStatus();
      return true;
    }
    toast("danger", "Couldn't save", "Local storage may be full or disabled in this browser.");
    return false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveAllSettings({ scope: "all" });
  });

  if (saveKeyBtn) {
    saveKeyBtn.addEventListener("click", () => {
      saveAllSettings({ scope: "key" });
    });
  }

  function flashSaveStatus() {
    saveStatus.hidden = false;
    clearTimeout(flashSaveStatus._t);
    flashSaveStatus._t = setTimeout(() => {
      saveStatus.hidden = true;
    }, 2500);
  }

  /* -----------------------------------------------------------------------
     Discard changes: reload form from last saved state
     ----------------------------------------------------------------------- */
  discardBtn.addEventListener("click", () => {
    currentSettings = loadSettings();
    populateForm(currentSettings);
    setFieldError(null);
    toast("info", "Changes discarded", "Reverted to your last saved settings.");
  });

  /* -----------------------------------------------------------------------
     Reset (with confirm modal; open/close handled by app.js)
     ----------------------------------------------------------------------- */
  resetSettingsBtn.addEventListener("click", () => {
    const overlay = document.getElementById("resetConfirmModal");
    if (overlay) {
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      const focusable = overlay.querySelector("button");
      focusable && focusable.focus();
    }
  });

  confirmResetBtn.addEventListener("click", () => {
    clearSettings();
    currentSettings = { ...DEFAULT_SETTINGS };
    populateForm(currentSettings);
    setFieldError(null);
    testOutput.textContent = "";
    testOutput.className = "test-panel__output";

    const overlay = document.getElementById("resetConfirmModal");
    if (overlay) {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    toast("success", "Settings reset", "All saved settings were cleared from this browser.");
  });

  /* -----------------------------------------------------------------------
     OpenRouter test connection: real frontend fetch integration
     ----------------------------------------------------------------------- */
  async function runConnectionTest() {
    const saved = loadSettings();
    const key = saved.apiKey;
    const model = modelSelect.value;

    if (!key) {
      setTestStatus("invalid", "Save a valid API key first.");
      toast("warning", "No key saved", "Enter and save an OpenRouter API key before testing.");
      return;
    }

    setTestStatus("checking", "Sending test message...");
    testOutput.textContent = "";
    testOutput.className = "test-panel__output";
    testConnectionBtn.classList.add("btn--loading");
    testConnectionBtn.disabled = true;

    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key,
          "HTTP-Referer": window.location.origin || "https://nemotron.local",
          "X-Title": "NVIDIA Nemotron v2.0",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "user", content: "Reply with a short one-sentence greeting to confirm the connection works." },
          ],
          max_tokens: 60,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errMsg = (data && data.error && data.error.message) || `Request failed with status ${response.status}.`;
        setTestStatus("invalid", "Connection failed.");
        testOutput.className = "test-panel__output test-panel__output--error";
        testOutput.textContent = errMsg;
        toast("danger", "Test failed", errMsg);
        return;
      }

      const reply =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      setTestStatus("valid", "Connection successful.");
      testOutput.textContent = reply ? reply.trim() : JSON.stringify(data, null, 2);
      toast("success", "Connection successful", "OpenRouter responded using " + model + ".");
    } catch (err) {
      setTestStatus("invalid", "Network error. The request could not be sent.");
      testOutput.className = "test-panel__output test-panel__output--error";
      testOutput.textContent = (err && err.message) || "Unknown network error.";
      toast("danger", "Network error", "Couldn't reach OpenRouter. Check your connection and try again.");
    } finally {
      testConnectionBtn.classList.remove("btn--loading");
      testConnectionBtn.disabled = false;
    }
  }

  function setTestStatus(state, message) {
    testStatus.className = "key-status key-status--" + state;
    testStatus.querySelector("span").textContent = message;
    const iconMap = {
      idle: "fa-circle-info",
      checking: "fa-rotate-right",
      valid: "fa-circle-check",
      invalid: "fa-circle-xmark",
    };
    const icon = testStatus.querySelector(".nv-icon");
    if (icon) {
      icon.className = "fa-solid " + (iconMap[state] || iconMap.idle) + " nv-icon nv-icon--sm";
      icon.classList.toggle("fa-spin", state === "checking");
    }
  }

  testConnectionBtn.addEventListener("click", runConnectionTest);

  /* -----------------------------------------------------------------------
     Mobile settings nav drawer
     ----------------------------------------------------------------------- */
  if (settingsNavToggle && settingsNav && settingsNavScrim) {
    function openNav() {
      settingsNav.classList.add("is-open");
      settingsNavScrim.classList.add("is-open");
      settingsNavToggle.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      settingsNav.classList.remove("is-open");
      settingsNavScrim.classList.remove("is-open");
      settingsNavToggle.setAttribute("aria-expanded", "false");
    }
    settingsNavToggle.addEventListener("click", () => {
      settingsNav.classList.contains("is-open") ? closeNav() : openNav();
    });
    settingsNavScrim.addEventListener("click", closeNav);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* Expose for other pages that may want to read the saved model/key */
  window.NemotronSettings = {
    load: loadSettings,
    MODELS: MODELS,
  };
})();
