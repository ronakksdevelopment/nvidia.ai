/* =========================================================================
   NVIDIA Nemotron - Chat Experience Behavior Layer
   Real OpenRouter API integration (vanilla JS, no dependencies, GitHub Pages compatible)
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     0. Tiny helpers
     ======================================================================= */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 10);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatClock(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* =======================================================================
     1. Toast (reuses foundation pattern, self-contained here for chat.html)
     ======================================================================= */
  const toastRegion = $("#toastRegion");
  const TOAST_ICONS = { success: "fa-circle-check", danger: "fa-circle-xmark", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
  const TOAST_TITLES = { success: "Success", danger: "Something went wrong", warning: "Heads up", info: "Note" };
  function showToast(type, title, message) {
    if (!toastRegion) return;
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toastTitle = title || TOAST_TITLES[type] || TOAST_TITLES.info;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <i class="fa-solid ${icon} toast__icon nv-icon" aria-hidden="true"></i>
      <div class="toast__content">
        <div class="toast__title">${escapeHtml(toastTitle)}</div>
        ${message ? `<div class="toast__message">${escapeHtml(message)}</div>` : ""}
      </div>
      <button class="toast__close" type="button" aria-label="Dismiss notification">
        <i class="fa-solid fa-xmark nv-icon" aria-hidden="true"></i>
      </button>`;
    toastRegion.appendChild(toast);
    const remove = () => { toast.classList.add("is-leaving"); setTimeout(() => toast.remove(), 200); };
    toast.querySelector(".toast__close").addEventListener("click", remove);
    setTimeout(remove, 4000);
  }
  window.NemotronToast = showToast;

  /* =======================================================================
     2. Offline banner
     ======================================================================= */
  const offlineBanner = $("#offlineBanner");
  function updateOnlineStatus() {
    if (!offlineBanner) return;
    offlineBanner.classList.toggle("is-visible", !navigator.onLine);
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  /* =======================================================================
     3. Minimal Markdown renderer (no dependencies)
     Supports: headings, bold/italic, inline code, code fences (+lang),
     unordered/ordered lists, blockquotes, links, tables, hr, paragraphs.
     ======================================================================= */
  function renderMarkdown(src) {
    if (!src) return "";
    const codeBlocks = [];
    // 1. Extract fenced code blocks first so nothing inside is touched.
    let text = src.replace(/```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: (lang || "text").trim(), code: code.replace(/\n$/, "") });
      return `\u0000CODEBLOCK${idx}\u0000`;
    });

    text = escapeHtml(text);

    // Restore placeholders after escaping (they contain no special chars, safe)
    text = text.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_, i) => `\u0000CODEBLOCK${i}\u0000`);

    // 2. Tables (simple GFM-style)
    text = text.replace(
      /((?:^\|.*\|[ \t]*\n)+)/gm,
      (block) => {
        const lines = block.trim().split("\n").filter(Boolean);
        if (lines.length < 2) return block;
        const sepLine = lines[1];
        if (!/^\|?[\s:|-]+\|?$/.test(sepLine)) return block;
        const parseRow = (line) =>
          line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        const header = parseRow(lines[0]);
        const rows = lines.slice(2).map(parseRow);
        let html = '<div class="table-wrap"><table><thead><tr>';
        header.forEach((h) => (html += `<th>${inlineMd(h)}</th>`));
        html += "</tr></thead><tbody>";
        rows.forEach((r) => {
          html += "<tr>";
          r.forEach((c) => (html += `<td>${inlineMd(c)}</td>`));
          html += "</tr>";
        });
        html += "</tbody></table></div>";
        return html + "\n";
      }
    );

    // 3. Block-level: headings, hr, blockquote
    const lines = text.split("\n");
    const out = [];
    let listBuffer = [];
    let listType = null;
    let quoteBuffer = [];

    function flushList() {
      if (!listBuffer.length) return;
      const tag = listType === "ol" ? "ol" : "ul";
      out.push(`<${tag}>${listBuffer.map((li) => `<li>${inlineMd(li)}</li>`).join("")}</${tag}>`);
      listBuffer = [];
      listType = null;
    }
    function flushQuote() {
      if (!quoteBuffer.length) return;
      out.push(`<blockquote>${quoteBuffer.map(inlineMd).join("<br>")}</blockquote>`);
      quoteBuffer = [];
    }

    for (let raw of lines) {
      const line = raw;
      if (/^\u0000CODEBLOCK\d+\u0000$/.test(line.trim())) {
        flushList(); flushQuote();
        out.push(line.trim());
        continue;
      }
      if (/^<div class="table-wrap">/.test(line)) {
        flushList(); flushQuote();
        out.push(line);
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushList(); flushQuote();
        const level = h[1].length;
        out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
        continue;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushList(); flushQuote();
        out.push("<hr>");
        continue;
      }
      const uMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      const oMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (uMatch) {
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        listBuffer.push(uMatch[1]);
        continue;
      }
      if (oMatch) {
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        listBuffer.push(oMatch[1]);
        continue;
      }
      const qMatch = line.match(/^\s*&gt;\s?(.*)$/);
      if (qMatch) {
        flushList();
        quoteBuffer.push(qMatch[1]);
        continue;
      }
      flushList(); flushQuote();
      if (line.trim() === "") {
        out.push("");
      } else {
        out.push(`<p>${inlineMd(line)}</p>`);
      }
    }
    flushList();
    flushQuote();

    let html = out.join("\n");

    // 4. Restore code blocks with syntax highlighting + copy button
    html = html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_, i) => {
      const block = codeBlocks[parseInt(i, 10)];
      return renderCodeBlock(block.lang, block.code);
    });

    return html;
  }

  // Recognized file extensions for inline filename highlighting (kept to
  // common, unambiguous ones so we don't false-positive on things like
  // "v1.5" or "e.g." in ordinary sentences).
  const FILE_EXT_PATTERN =
    "html?|css|scss|sass|less|js|jsx|mjs|cjs|ts|tsx|json|jsonc|yaml|yml|xml|md|mdx|txt|csv|tsv|" +
    "py|rb|php|java|kt|swift|go|rs|c|h|cpp|hpp|cs|sh|bash|zsh|ps1|sql|" +
    "png|jpe?g|gif|svg|webp|ico|bmp|tiff?|" +
    "pdf|docx?|xlsx?|pptx?|zip|rar|7z|tar|gz|" +
    "mp3|wav|mp4|mov|avi|webm|" +
    "env|gitignore|lock|toml|ini|cfg|conf|log";
  const FILENAME_RE = new RegExp(
    "\\b([\\w.\\-]+\\.(?:" + FILE_EXT_PATTERN + "))\\b",
    "gi"
  );

  // Highlight bare filename mentions (report.pdf, index.html, styles.css) in
  // plain prose, the way Claude renders file/path mentions in green — but
  // only outside of code spans/links, so code samples keep their normal
  // monospace styling instead of getting double-wrapped.
  function highlightFileMentions(str) {
    return str.replace(FILENAME_RE, (match) => `<span class="file-mention">${match}</span>`);
  }

  function inlineMd(str) {
    let s = str;
    // Pull out inline code spans first so filename highlighting never runs
    // inside `` `code` `` — code already gets its own monospace treatment.
    const inlineCodeSpans = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => {
      const idx = inlineCodeSpans.length;
      inlineCodeSpans.push(c);
      return `\u0000INLINECODE${idx}\u0000`;
    });

    // filename mentions (e.g. index.html, report.pdf) — before bold/italic/
    // links so a filename containing an underscore isn't mangled by *_* rules.
    s = highlightFileMentions(s);

    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // italic
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // restore inline code spans
    s = s.replace(/\u0000INLINECODE(\d+)\u0000/g, (_, i) => `<code>${inlineCodeSpans[parseInt(i, 10)]}</code>`);
    return s;
  }

  /* -----------------------------------------------------------------------
     Minimal syntax highlighter (single-pass tokenizer, language-agnostic-ish)

     This used to be five cascading `String.replace()` passes (comments,
     then strings, then numbers, then function calls, then keywords), each
     re-scanning the *entire* string left behind by the previous pass. That
     meant later passes could match text sitting inside the HTML those
     earlier passes had already emitted — e.g. the keyword pass matching
     the literal word "class" inside a `<span class="tok-comment">` tag
     the comment pass had just inserted, corrupting the markup. A
     single left-to-right tokenizer sidesteps this entirely: each
     character of the *original* source is consumed exactly once, classified
     into exactly one token, escaped, and (if needed) wrapped — so nothing
     already-emitted is ever re-matched by a later rule.
     ----------------------------------------------------------------------- */
  const KEYWORD_SET = new Set([
    "function", "const", "let", "var", "return", "if", "else", "for", "while",
    "class", "import", "from", "export", "default", "new", "this", "try",
    "catch", "finally", "await", "async", "def", "self", "elif", "None",
    "True", "False", "end", "do", "then", "public", "private", "static",
    "void", "int", "string", "bool", "struct", "impl", "fn", "match",
    "switch", "case", "break", "continue", "null", "undefined", "lambda",
    "yield", "with", "as", "in", "is", "not", "and", "or", "pass", "raise",
    "except",
  ]);

  function highlightCode(code, lang) {
    const src = String(code);
    let out = "";
    let i = 0;
    const n = src.length;

    while (i < n) {
      const ch = src[i];
      const two = src.slice(i, i + 2);

      // Line comments: // ... and # ... (but not a #! shebang at line start)
      if (two === "//") {
        let j = i;
        while (j < n && src[j] !== "\n") j++;
        out += `<span class="tok-comment">${escapeHtml(src.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      if (ch === "#") {
        const atLineStart = i === 0 || src[i - 1] === "\n";
        const isShebang = atLineStart && src[i + 1] === "!";
        if (!isShebang) {
          let j = i;
          while (j < n && src[j] !== "\n") j++;
          out += `<span class="tok-comment">${escapeHtml(src.slice(i, j))}</span>`;
          i = j;
          continue;
        }
      }

      // Strings: "...", '...', `...` (stop at closing quote or end of line)
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        let j = i + 1;
        while (j < n && src[j] !== quote && src[j] !== "\n") {
          if (src[j] === "\\" && j + 1 < n) j++; // skip escaped char
          j++;
        }
        if (j < n && src[j] === quote) j++; // include closing quote
        out += `<span class="tok-string">${escapeHtml(src.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) && !/[a-zA-Z_]/.test(src[i - 1] || "")) {
        let j = i;
        while (j < n && /[0-9.]/.test(src[j])) j++;
        out += `<span class="tok-number">${escapeHtml(src.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Identifiers: word, keyword, or function call (word immediately
      // followed by an opening paren)
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i;
        while (j < n && /[a-zA-Z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        const escaped = escapeHtml(word);
        if (src[j] === "(") {
          out += `<span class="tok-function">${escaped}</span>`;
        } else if (KEYWORD_SET.has(word)) {
          out += `<span class="tok-keyword">${escaped}</span>`;
        } else {
          out += escaped;
        }
        i = j;
        continue;
      }

      // Everything else: copy through escaped, one char at a time
      out += escapeHtml(ch);
      i++;
    }

    return out;
  }

  function renderCodeBlock(lang, code) {
    const id = "code-" + uid();
    const highlighted = highlightCode(code, lang);
    return `
<div class="code-block">
  <div class="code-block__head">
    <span class="code-block__lang">${escapeHtml(lang || "text")}</span>
    <button class="code-block__copy-btn" type="button" data-copy-target="${id}">
      <i class="fa-regular fa-copy nv-icon code-block__copy-icon code-block__copy-icon--default" aria-hidden="true"></i>
      <i class="fa-solid fa-check nv-icon code-block__copy-icon code-block__copy-icon--copied" aria-hidden="true"></i>
      <span>Copy</span>
    </button>
  </div>
  <pre><code id="${id}" data-raw="${escapeHtml(code)}">${highlighted}</code></pre>
</div>`;
  }

  /* Wire up copy buttons for code blocks (event delegation) */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".code-block__copy-btn");
    if (!btn) return;
    const targetId = btn.getAttribute("data-copy-target");
    const codeEl = document.getElementById(targetId);
    if (!codeEl) return;
    const raw = codeEl.getAttribute("data-raw") || codeEl.textContent;
    copyToClipboard(raw).then(() => {
      const span = btn.querySelector("span");
      const original = span.textContent;
      btn.classList.add("is-copied");
      span.textContent = "Copied";
      setTimeout(() => { btn.classList.remove("is-copied"); span.textContent = original; }, 1600);
    });
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  /* =======================================================================
     4. State: conversations + messages
     Persisted to localStorage for signed-in sessions; guest sessions never
     write to localStorage, matching the guest-mode contract in session.js.
     ======================================================================= */
  const MAX_TOKENS = 32000;
  const HISTORY_KEY = "nemotron.chatHistory";
  const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

  /* -----------------------------------------------------------------------
     Usage windows (session token bar + topbar pills)
     Session usage resets hourly; weekly usage resets every 7 days. Both
     windows persist their token counts and reset timestamps in
     localStorage so the countdown and percentage survive a reload and
     roll over automatically once their window has elapsed.
     ----------------------------------------------------------------------- */
  const SESSION_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const WEEKLY_TOKEN_LIMIT = MAX_TOKENS * 40; // generous free-tier-style weekly ceiling
  const USAGE_WINDOWS_KEY = "nemotron.usageWindows";

  function loadUsageWindows() {
    const now = Date.now();
    let parsed = null;
    try {
      const raw = localStorage.getItem(USAGE_WINDOWS_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== "object") parsed = {};

    if (!parsed.sessionResetAt || parsed.sessionResetAt <= now) {
      parsed.sessionTokens = 0;
      parsed.sessionResetAt = now + SESSION_WINDOW_MS;
    }
    if (!parsed.weeklyResetAt || parsed.weeklyResetAt <= now) {
      parsed.weeklyTokens = 0;
      parsed.weeklyResetAt = now + WEEKLY_WINDOW_MS;
    }
    parsed.sessionTokens = parsed.sessionTokens || 0;
    parsed.weeklyTokens = parsed.weeklyTokens || 0;
    return parsed;
  }

  function saveUsageWindows() {
    try {
      localStorage.setItem(USAGE_WINDOWS_KEY, JSON.stringify(usageWindows));
    } catch (e) { /* storage unavailable: countdown still works in-memory */ }
  }

  const usageWindows = loadUsageWindows();

  function addUsageTokens(n) {
    // Re-check for rollover first, in case a window elapsed while idle.
    const now = Date.now();
    if (usageWindows.sessionResetAt <= now) {
      usageWindows.sessionTokens = 0;
      usageWindows.sessionResetAt = now + SESSION_WINDOW_MS;
    }
    if (usageWindows.weeklyResetAt <= now) {
      usageWindows.weeklyTokens = 0;
      usageWindows.weeklyResetAt = now + WEEKLY_WINDOW_MS;
    }
    usageWindows.sessionTokens = Math.min(MAX_TOKENS, usageWindows.sessionTokens + n);
    usageWindows.weeklyTokens = Math.min(WEEKLY_TOKEN_LIMIT, usageWindows.weeklyTokens + n);
    saveUsageWindows();
  }

  function formatCountdown(msRemaining, unit) {
    const remaining = Math.max(0, msRemaining);
    if (unit === "days") {
      const d = Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
      return `${d}d`;
    }
    const totalMinutes = Math.max(0, Math.round(remaining / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  const isGuestSession = () => !!(window.NemotronSession && window.NemotronSession.isGuestActive());
  const isIncognitoSession = () => !!(window.NemotronSession && window.NemotronSession.isIncognitoActive());

  /* Settings (API key + model) are stored under nemotron.settings by
     js/settings.js. chat.html doesn't load settings.js, so chat.js reads
     the same localStorage key directly, keeping both pages in sync. */
  const SETTINGS_KEY = "nemotron.settings";
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { apiKey: "", model: DEFAULT_MODEL, theme: "dark" };
      const parsed = JSON.parse(raw);
      return Object.assign({ apiKey: "", model: DEFAULT_MODEL, theme: "dark" }, parsed);
    } catch (e) {
      return { apiKey: "", model: DEFAULT_MODEL, theme: "dark" };
    }
  }

  function loadPersistedHistory() {
    // Guest-only guard (see persistHistory() above for why incognito must
    // NOT gate this): at the point this runs during page init, Incognito
    // is always false anyway, since it lives only in memory and is reset
    // on every navigation/refresh (js/session.js). Checking guest alone
    // here keeps that invariant explicit instead of implying incognito
    // could ever suppress loading a signed-in user's real history.
    if (isGuestSession()) return null;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.conversations)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function persistHistory() {
    // Guest sessions never touch storage at all, matching the guest-mode
    // contract in session.js. Incognito is handled below by filtering, not
    // by an early return here: a signed-in user's REAL conversations must
    // keep saving even while Incognito is active for a separate, unsaved
    // conversation. An early `if (isEphemeralSession()) return;` here would
    // incorrectly no-op persistence for real data too, since guest-or-
    // incognito would be true whenever EITHER guest or incognito is
    // active. See discardIncognitoConversations() / setIncognito() for how
    // the incognito-flagged conversation itself gets cleared on toggle-off.
    if (isGuestSession()) return;
    try {
      // Defense in depth: even outside a fully-ephemeral (guest/incognito)
      // session, never let an incognito-flagged conversation reach disk.
      // This matters for a signed-in user who toggles Incognito mid-session:
      // their real conversations still save, the incognito one never does.
      const persistableConvos = state.conversations.filter((c) => !c.incognito);
      const persistableMessages = {};
      persistableConvos.forEach((c) => { persistableMessages[c.id] = state.messagesByConvo[c.id] || []; });
      localStorage.setItem(HISTORY_KEY, JSON.stringify({
        conversations: persistableConvos,
        messagesByConvo: persistableMessages,
      }));
    } catch (e) { /* storage full or unavailable: state simply won't survive reload */ }
  }

  const persistedHistory = loadPersistedHistory();

  const state = {
    conversations: (persistedHistory && persistedHistory.conversations) || [],
    messagesByConvo: (persistedHistory && persistedHistory.messagesByConvo) || {},
    activeConvoId: null,
    tokensUsed: 0,
    isGenerating: false,
    model: loadSettings().model || DEFAULT_MODEL,
  };

  function getMessages(convoId) {
    if (!state.messagesByConvo[convoId]) state.messagesByConvo[convoId] = [];
    return state.messagesByConvo[convoId];
  }

  /* =======================================================================
     5. DOM refs
     ======================================================================= */
  const chatShell = $("#chatShell");
  const sidebar = $("#sidebar");
  const sidebarScrim = $("#sidebarScrim");
  const sidebarCollapseBtn = $("#sidebarCollapseBtn");
  const reopenSidebarBtn = $("#reopenSidebarBtn");
  const mobileSidebarBtn = $("#mobileSidebarBtn");
  const newChatBtn = $("#newChatBtn");
  const newChatIconBtn = $("#newChatIconBtn");
  const sidebarHistory = $("#sidebarHistory");
  const historySearch = $("#historySearch");
  const searchIconBtn = $("#searchIconBtn");

  const chatScroll = $("#chatScroll");
  const chatScrollInner = $("#chatScrollInner");
  const chatEmpty = $("#chatEmpty");
  const chatMessages = $("#chatMessages");
  const chatSuggestions = $("#chatSuggestions");

  const composerForm = $("#composerForm");
  const composerInput = $("#composerInput");
  const composerCharCount = $("#composerCharCount");
  const sendBtn = $("#sendBtn");
  const stopBtn = $("#stopBtn");
  const attachBtn = $("#attachBtn");
  const fileInput = $("#fileInput");
  const composerAttachments = $("#composerAttachments");

  const dropzoneOverlay = $("#dropzoneOverlay");

  const usageBarFill = $("#usageBarFill");
  const usageValueText = $("#usageValueText");
  const sidebarUsagePercent = $("#sidebarUsagePercent");
  const sidebarUsageReset = $("#sidebarUsageReset");
  const topbarSessionUsageChip = $("#topbarSessionUsageChip");
  const topbarSessionUsageText = $("#topbarSessionUsageText");
  const topbarSessionResetText = $("#topbarSessionResetText");
  const topbarWeeklyUsageChip = $("#topbarWeeklyUsageChip");
  const topbarWeeklyUsageText = $("#topbarWeeklyUsageText");
  const topbarWeeklyResetText = $("#topbarWeeklyResetText");

  const incognitoBadge = $("#incognitoBadge");
  const incognitoToggleBtn = $("#incognitoToggleBtn");
  const incognitoStrip = $("#incognitoStrip");
  const incognitoExitBtn = $("#incognitoExitBtn");

  const accountMenuTrigger = $("#accountMenuTrigger");
  const accountMenu = $("#accountMenu");
  const logoutBtn = $("#logoutBtn");

  const modelDropdown = $("#modelDropdown");
  const modelDropdownTrigger = $("#modelDropdownTrigger");
  const modelBadgeName = $(".model-badge__name");

  const shortcutsMenuBtn = $("#shortcutsMenuBtn");
  const shortcutsTopbarBtn = $("#shortcutsTopbarBtn");

  const deleteConvoModal = $("#deleteConvoModal");
  const deleteConvoName = $("#deleteConvoName");
  const confirmDeleteBtn = $("#confirmDeleteBtn");
  let pendingDeleteId = null;

  let pendingAttachments = []; // { id, file, kind: 'image'|'file', previewUrl }

  /* =======================================================================
     6. Sidebar: collapse / mobile drawer
     ======================================================================= */
  const isMobile = () => window.matchMedia("(max-width: 1024px)").matches;

  function setSidebarState(open) {
    if (isMobile()) {
      chatShell.setAttribute("data-sidebar", open ? "expanded" : "collapsed");
      mobileSidebarBtn && mobileSidebarBtn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    } else {
      chatShell.setAttribute("data-sidebar", open ? "expanded" : "collapsed");
      sidebarCollapseBtn && sidebarCollapseBtn.setAttribute("aria-expanded", String(open));
      sidebarCollapseBtn && sidebarCollapseBtn.setAttribute("aria-label", open ? "Collapse sidebar" : "Expand sidebar");
    }
    try { localStorage.setItem("nemotron.sidebarOpen", open ? "1" : "0"); } catch (e) {}
  }

  function isSidebarOpen() {
    return chatShell.getAttribute("data-sidebar") === "expanded";
  }

  sidebarCollapseBtn && sidebarCollapseBtn.addEventListener("click", () => setSidebarState(!isSidebarOpen()));
  reopenSidebarBtn && reopenSidebarBtn.addEventListener("click", () => setSidebarState(true));
  mobileSidebarBtn && mobileSidebarBtn.addEventListener("click", () => setSidebarState(!isSidebarOpen()));
  sidebarScrim && sidebarScrim.addEventListener("click", () => setSidebarState(false));

  // Initialize based on viewport + saved preference
  (function initSidebar() {
    let saved = null;
    try { saved = localStorage.getItem("nemotron.sidebarOpen"); } catch (e) {}
    if (isMobile()) {
      setSidebarState(false);
    } else {
      setSidebarState(saved === null ? true : saved === "1");
    }
  })();

  window.addEventListener("resize", debounce(() => {
    if (isMobile()) {
      if (isSidebarOpen()) setSidebarState(false);
    } else {
      let saved = null;
      try { saved = localStorage.getItem("nemotron.sidebarOpen"); } catch (e) {}
      setSidebarState(saved === null ? true : saved === "1");
    }
  }, 150));

  /* =======================================================================
     7. Conversation history rendering + search
     ======================================================================= */
  function groupLabel(ts) {
    const now = new Date();
    const d = new Date(ts);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7 = startOfToday - 86400000 * 7;
    const startOf30 = startOfToday - 86400000 * 30;
    if (ts >= startOfToday) return "Today";
    if (ts >= startOfYesterday) return "Yesterday";
    if (ts >= startOf7) return "Previous 7 days";
    if (ts >= startOf30) return "Previous 30 days";
    return "Older";
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      "<mark>" + escapeHtml(text.slice(idx, idx + query.length)) + "</mark>" +
      escapeHtml(text.slice(idx + query.length))
    );
  }

  function renderHistory(query) {
    query = (query || "").trim();
    sidebarHistory.innerHTML = "";

    let list = state.conversations.filter((c) => !c.incognito).slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (query) {
      list = list.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
    }

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "sidebar__history-empty";
      empty.textContent = query ? `No conversations matching "${query}"` : "No conversations yet";
      sidebarHistory.appendChild(empty);
      return;
    }

    const groups = new Map();
    list.forEach((c) => {
      const label = query ? "Results" : groupLabel(c.updatedAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(c);
    });

    groups.forEach((items, label) => {
      const labelEl = document.createElement("div");
      labelEl.className = "history-group__label";
      labelEl.textContent = label;
      sidebarHistory.appendChild(labelEl);

      items.forEach((c) => {
        const btn = document.createElement("button");
        btn.className = "history-item" + (c.id === state.activeConvoId ? " is-active" : "");
        btn.type = "button";
        btn.setAttribute("data-convo-id", c.id);
        btn.innerHTML = `
          <span class="history-item__title">${highlightMatch(c.title, query)}</span>
          <button class="history-item__menu-btn" type="button" data-menu-convo-id="${c.id}" aria-label="Conversation options" aria-expanded="false">
            <i class="fa-solid fa-ellipsis-vertical nv-icon" aria-hidden="true"></i>
          </button>`;
        btn.addEventListener("click", (e) => {
          if (e.target.closest(".history-item__menu-btn")) return;
          switchConversation(c.id);
        });
        sidebarHistory.appendChild(btn);
      });
    });
  }

  // Delete via the (single, shared) context affordance: click the "..." to open a tiny inline confirm
  sidebarHistory.addEventListener("click", (e) => {
    const menuBtn = e.target.closest(".history-item__menu-btn");
    if (!menuBtn) return;
    e.stopPropagation();
    const convoId = menuBtn.getAttribute("data-menu-convo-id");
    const convo = state.conversations.find((c) => c.id === convoId);
    pendingDeleteId = convoId;
    deleteConvoName.textContent = convo ? `"${convo.title}"` : "this chat";
    openModalById("deleteConvoModal");
  });

  confirmDeleteBtn.addEventListener("click", () => {
    if (!pendingDeleteId) return;
    const idx = state.conversations.findIndex((c) => c.id === pendingDeleteId);
    if (idx !== -1) state.conversations.splice(idx, 1);
    delete state.messagesByConvo[pendingDeleteId];
    const wasActive = pendingDeleteId === state.activeConvoId;
    pendingDeleteId = null;
    closeModalById("deleteConvoModal");
    persistHistory();
    if (wasActive) {
      if (state.conversations.length) {
        switchConversation(state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      } else {
        startNewConversation();
      }
    } else {
      renderHistory(historySearch.value);
    }
    showToast("success", null, "Conversation deleted.");
  });

  historySearch.addEventListener("input", debounce((e) => renderHistory(e.target.value), 120));
  searchIconBtn && searchIconBtn.addEventListener("click", () => {
    setSidebarState(true);
    setTimeout(() => historySearch.focus(), isMobile() ? 260 : 0);
  });

  /* =======================================================================
     8. Conversation switching / creation
     ======================================================================= */
  function switchConversation(id) {
    if (state.isGenerating) stopGeneration();
    state.activeConvoId = id;
    renderHistory(historySearch.value);
    renderMessages();
    if (isMobile()) setSidebarState(false);
  }

  function startNewConversation() {
    if (state.isGenerating) stopGeneration();
    const id = "c" + uid();
    const incognito = isIncognitoSession();
    state.conversations.unshift({ id, title: "New chat", updatedAt: Date.now(), pinned: false, incognito });
    state.messagesByConvo[id] = [];
    state.activeConvoId = id;
    renderHistory(historySearch.value);
    renderMessages();
    clearComposer();
    persistHistory();
    if (isMobile()) setSidebarState(false);
    composerInput.focus();
  }

  newChatBtn.addEventListener("click", startNewConversation);
  newChatIconBtn.addEventListener("click", startNewConversation);

  /* =======================================================================
     8b. Incognito Mode
     Toggling on starts a fresh, unsaved conversation so the user is never
     left assuming an already-saved conversation just became private.
     Toggling off (or the explicit "Turn off" exit action) discards every
     incognito-flagged conversation from in-memory state immediately and
     returns to the most recent real conversation, matching the "clears
     when exited" requirement without waiting for a refresh. A refresh or
     tab close clears it automatically too, since none of this ever
     touches storage (see js/session.js).
     ======================================================================= */
  function paintIncognitoUI(active) {
    if (incognitoBadge) incognitoBadge.hidden = !active;
    if (incognitoStrip) incognitoStrip.hidden = !active;
    if (incognitoToggleBtn) {
      incognitoToggleBtn.classList.toggle("is-active", active);
      incognitoToggleBtn.setAttribute("aria-pressed", active ? "true" : "false");
      incognitoToggleBtn.setAttribute("aria-label", active ? "Turn off Incognito Mode" : "Turn on Incognito Mode");
      incognitoToggleBtn.title = active
        ? "Incognito Mode is on: this chat isn't being saved"
        : "Incognito Mode: this chat won't be saved";
    }
    document.documentElement.setAttribute("data-incognito", active ? "true" : "false");
  }

  function discardIncognitoConversations() {
    const remaining = [];
    state.conversations.forEach((c) => {
      if (c.incognito) {
        delete state.messagesByConvo[c.id];
      } else {
        remaining.push(c);
      }
    });
    const activeWasIncognito = state.activeConvoId && !remaining.some((c) => c.id === state.activeConvoId);
    state.conversations = remaining;
    if (activeWasIncognito) {
      if (remaining.length) {
        switchConversation(remaining.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      } else {
        startNewConversation();
      }
    } else {
      renderHistory(historySearch.value);
    }
  }

  function setIncognito(active) {
    if (!window.NemotronSession) return;
    window.NemotronSession.setIncognitoActive(active);
  }

  if (window.NemotronSession) {
    paintIncognitoUI(isIncognitoSession());
    window.NemotronSession.onIncognitoChange((active) => {
      paintIncognitoUI(active);
      if (active) {
        startNewConversation();
        showToast("info", "Incognito Mode on", "This conversation won't be saved.");
      } else {
        discardIncognitoConversations();
        showToast("info", "Incognito Mode off", "The temporary conversation was cleared.");
      }
    });
  }

  incognitoToggleBtn && incognitoToggleBtn.addEventListener("click", () => {
    setIncognito(!isIncognitoSession());
  });
  incognitoExitBtn && incognitoExitBtn.addEventListener("click", () => {
    setIncognito(false);
  });

  // Belt and suspenders: if a conversation somehow ends up incognito-flagged
  // (e.g. state restored oddly) but the app is no longer in an ephemeral
  // session, never let it silently persist on the next save.
  window.addEventListener("beforeunload", () => {
    if (!isIncognitoSession()) return;
    // Nothing to write: incognito state and its conversations live only in
    // this tab's memory and are simply discarded as the page unloads.
  });

  /* =======================================================================
     9. Message rendering
     ======================================================================= */
  function scrollToBottom(smooth) {
    chatScroll.scrollTo({ top: chatScroll.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function isNearBottom() {
    return chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 120;
  }

  function attachmentHtml(att) {
    if (att.kind === "image") {
      return `
        <div class="msg-attachment msg-attachment--image">
          <img src="${att.previewUrl}" alt="${escapeHtml(att.name)}" />
        </div>`;
    }
    return `
      <div class="msg-attachment">
        <i class="fa-regular fa-file nv-icon" aria-hidden="true"></i>
        <span class="msg-attachment__name file-mention">${escapeHtml(att.name)}</span>
      </div>`;
  }

  function buildMessageEl(msg) {
    const wrap = document.createElement("div");
    wrap.className = `msg msg--${msg.role}`;
    wrap.setAttribute("data-msg-id", msg.id);

    const avatar = document.createElement("div");
    avatar.className = "msg__avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (msg.role === "user") {
      avatar.textContent = (window.NemotronSession && window.NemotronSession.getAccount() && window.NemotronSession.getAccount().initials) || "DK";
    } else {
      avatar.innerHTML = `<svg width="16" height="16"><use href="#icon-nemotron-mark"/></svg>`;
    }

    const col = document.createElement("div");
    col.className = "msg__col";

    const roleRow = document.createElement("div");
    roleRow.className = "msg__role-row";
    roleRow.innerHTML = `
      <span class="msg__role-name">${msg.role === "user" ? "You" : "Nemotron"}</span>
      <span class="msg__timestamp">${formatClock(new Date(msg.ts))}</span>`;

    const bubble = document.createElement("div");
    bubble.className = "msg__bubble";

    let attachmentsHtml = "";
    if (msg.attachments && msg.attachments.length) {
      attachmentsHtml = `<div class="msg__attachments">${msg.attachments.map(attachmentHtml).join("")}</div>`;
    }

    if (msg.role === "user") {
      bubble.innerHTML = attachmentsHtml + `<span class="msg__text">${escapeHtml(msg.text)}</span>`;
    } else {
      bubble.innerHTML = attachmentsHtml + renderMarkdown(msg.text || "");
      if (msg.streaming) {
        bubble.innerHTML += '<span class="streaming-caret"></span>';
      }
    }

    let genTimerEl = null;
    if (msg.role === "assistant" && (msg.streaming || typeof msg.genElapsedSec === "number")) {
      genTimerEl = document.createElement("div");
      genTimerEl.className = "msg__gen-timer";
      if (msg.streaming) {
        const secs = typeof msg.genElapsedSec === "number" ? msg.genElapsedSec : 0;
        genTimerEl.textContent = `Generating... ${secs.toFixed(1)}s`;
      } else {
        genTimerEl.classList.add("msg__gen-timer--done");
        genTimerEl.textContent = `Generated in ${msg.genElapsedSec.toFixed(1)}s`;
      }
    }

    const actions = document.createElement("div");
    actions.className = "msg__actions";
    if (msg.role === "user") {
      actions.innerHTML = `
        <button class="msg__action-btn" type="button" data-action="edit" aria-label="Edit message" title="Edit">
          <i class="fa-solid fa-pen nv-icon" aria-hidden="true"></i>
        </button>
        <button class="msg__action-btn" type="button" data-action="copy" aria-label="Copy message" title="Copy">
          <i class="fa-regular fa-copy nv-icon" aria-hidden="true"></i>
        </button>`;
    } else if (!msg.streaming) {
      actions.innerHTML = `
        <button class="msg__action-btn" type="button" data-action="copy" aria-label="Copy response" title="Copy">
          <i class="fa-regular fa-copy nv-icon" aria-hidden="true"></i>
        </button>
        <button class="msg__action-btn" type="button" data-action="regenerate" aria-label="Regenerate response" title="Regenerate">
          <i class="fa-solid fa-rotate-right nv-icon" aria-hidden="true"></i>
        </button>
        <button class="msg__action-btn ${msg.feedback === "up" ? "is-active" : ""}" type="button" data-action="thumb-up" aria-label="Good response" title="Good response">
          <i class="fa-${msg.feedback === "up" ? "solid" : "regular"} fa-thumbs-up nv-icon" aria-hidden="true"></i>
        </button>
        <button class="msg__action-btn ${msg.feedback === "down" ? "is-active" : ""}" type="button" data-action="thumb-down" aria-label="Bad response" title="Bad response">
          <i class="fa-${msg.feedback === "down" ? "solid" : "regular"} fa-thumbs-down nv-icon" aria-hidden="true"></i>
        </button>`;
    }

    col.appendChild(roleRow);
    col.appendChild(bubble);
    if (genTimerEl) col.appendChild(genTimerEl);
    if (actions.innerHTML) col.appendChild(actions);

    wrap.appendChild(avatar);
    wrap.appendChild(col);
    return wrap;
  }

  function renderMessages() {
    const msgs = getMessages(state.activeConvoId);
    chatMessages.innerHTML = "";
    if (!msgs.length) {
      chatEmpty.hidden = false;
      chatEmpty.style.display = "";
    } else {
      chatEmpty.hidden = true;
      chatEmpty.style.display = "none";
      msgs.forEach((m) => chatMessages.appendChild(buildMessageEl(m)));
    }
    requestAnimationFrame(() => scrollToBottom(false));
  }

  /* Message action delegation (copy / edit / regenerate / feedback) */
  chatMessages.addEventListener("click", (e) => {
    const btn = e.target.closest(".msg__action-btn");
    if (!btn) return;
    const msgEl = btn.closest(".msg");
    const msgId = msgEl.getAttribute("data-msg-id");
    const action = btn.getAttribute("data-action");
    const msgs = getMessages(state.activeConvoId);
    const msg = msgs.find((m) => m.id === msgId);
    if (!msg) return;

    if (action === "copy") {
      copyToClipboard(msg.text).then(() => showToast("success", null, "Copied to clipboard."));
    } else if (action === "edit") {
      beginEditMessage(msgEl, msg);
    } else if (action === "regenerate") {
      regenerateResponse(msg);
    } else if (action === "thumb-up" || action === "thumb-down") {
      const val = action === "thumb-up" ? "up" : "down";
      msg.feedback = msg.feedback === val ? null : val;
      renderMessages();
      if (msg.feedback) showToast("info", null, "Thanks for the feedback.");
    }
  });

  function beginEditMessage(msgEl, msg) {
    const bubble = msgEl.querySelector(".msg__bubble");
    const actions = msgEl.querySelector(".msg__actions");
    bubble.classList.add("is-editing");
    actions && (actions.style.display = "none");
    bubble.innerHTML = `
      <div class="msg__edit-box">
        <textarea class="msg__edit-textarea" rows="3">${escapeHtml(msg.text)}</textarea>
        <div class="msg__edit-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-edit-cancel>Cancel</button>
          <button class="btn btn--primary btn--sm" type="button" data-edit-save>Save &amp; submit</button>
        </div>
      </div>`;
    const ta = bubble.querySelector("textarea");
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    autoResize(ta);
    ta.addEventListener("input", () => autoResize(ta));

    bubble.querySelector("[data-edit-cancel]").addEventListener("click", () => renderMessages());
    bubble.querySelector("[data-edit-save]").addEventListener("click", () => {
      const newText = ta.value.trim();
      if (!newText) return;
      const msgs = getMessages(state.activeConvoId);
      const idx = msgs.findIndex((m) => m.id === msg.id);
      if (idx === -1) return;
      // Truncate everything after this user message (classic "edit & resubmit" behavior)
      msgs.splice(idx, msgs.length - idx);
      msg.text = newText;
      msgs.push(msg);
      renderMessages();
      persistHistory();
      generateAssistantReply();
    });
  }

  function regenerateResponse(assistantMsg) {
    if (state.isGenerating) return;
    const msgs = getMessages(state.activeConvoId);
    const idx = msgs.findIndex((m) => m.id === assistantMsg.id);
    if (idx === -1) return;
    msgs.splice(idx, 1); // remove old assistant message so it isn't sent as context
    renderMessages();
    persistHistory();
    generateAssistantReply();
  }

  /* =======================================================================
     10. Composer: autosize, char count, attachments, drag & drop
     ======================================================================= */
  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  function updateSendState() {
    const hasText = composerInput.value.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    sendBtn.disabled = !(hasText || hasAttachments) || state.isGenerating;
  }

  composerInput.addEventListener("input", () => {
    autoResize(composerInput);
    const len = composerInput.value.length;
    composerCharCount.textContent = `${len} / 8000`;
    composerCharCount.classList.toggle("is-near-limit", len > 7000 && len <= 7900);
    composerCharCount.classList.toggle("is-at-limit", len > 7900);
    updateSendState();
  });

  composerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      composerForm.requestSubmit();
    }
  });

  composerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitComposer();
  });

  function clearComposer() {
    composerInput.value = "";
    autoResize(composerInput);
    composerCharCount.textContent = "0 / 8000";
    composerCharCount.classList.remove("is-near-limit", "is-at-limit");
    pendingAttachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    pendingAttachments = [];
    renderComposerAttachments();
    updateSendState();
  }

  function renderComposerAttachments() {
    if (!pendingAttachments.length) {
      composerAttachments.hidden = true;
      composerAttachments.innerHTML = "";
      return;
    }
    composerAttachments.hidden = false;
    composerAttachments.innerHTML = pendingAttachments.map((a) => {
      if (a.kind === "image") {
        return `
          <div class="attachment-chip attachment-chip--image" data-attachment-id="${a.id}">
            <div class="attachment-chip__thumb">
              <img src="${a.previewUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <button class="attachment-chip__remove" type="button" data-remove-attachment="${a.id}" aria-label="Remove attachment">
              <i class="fa-solid fa-xmark nv-icon" aria-hidden="true"></i>
            </button>
          </div>`;
      }
      return `
        <div class="attachment-chip" data-attachment-id="${a.id}">
          <i class="fa-regular fa-file nv-icon" aria-hidden="true"></i>
          <span class="attachment-chip__name file-mention">${escapeHtml(a.name)}</span>
          <button class="attachment-chip__remove" type="button" data-remove-attachment="${a.id}" aria-label="Remove attachment">
            <i class="fa-solid fa-xmark nv-icon" aria-hidden="true"></i>
          </button>
        </div>`;
    }).join("");
  }

  composerAttachments.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-attachment]");
    if (!btn) return;
    const id = btn.getAttribute("data-remove-attachment");
    const idx = pendingAttachments.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const a = pendingAttachments[idx];
      a.previewUrl && URL.revokeObjectURL(a.previewUrl);
      pendingAttachments.splice(idx, 1);
    }
    renderComposerAttachments();
    updateSendState();
  });

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const att = {
        id: uid(),
        name: file.name,
        kind: isImage ? "image" : "file",
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      };
      pendingAttachments.push(att);
    });
    renderComposerAttachments();
    updateSendState();
  }

  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  /* Drag & drop onto the whole chat main area */
  const chatMainEl = $(".chat-main");
  let dragCounter = 0;
  ["dragenter", "dragover"].forEach((evt) => {
    chatMainEl.addEventListener(evt, (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) return;
      e.preventDefault();
      dragCounter++;
      dropzoneOverlay.classList.add("is-active");
    });
  });
  ["dragleave"].forEach((evt) => {
    chatMainEl.addEventListener(evt, (e) => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) dropzoneOverlay.classList.remove("is-active");
    });
  });
  chatMainEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzoneOverlay.classList.remove("is-active");
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  /* Suggestion chips */
  chatSuggestions.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-suggestion");
    if (!btn) return;
    composerInput.value = btn.getAttribute("data-prompt") || btn.textContent.trim();
    autoResize(composerInput);
    updateSendState();
    submitComposer();
  });

  /* =======================================================================
     11. Submit + real OpenRouter streaming generation
     ======================================================================= */
  const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
  let currentStreamController = null;

  function getApiKey() {
    const settings = loadSettings();
    return settings.apiKey || "";
  }

  function getActiveModel() {
    const settings = loadSettings();
    return settings.model || state.model || DEFAULT_MODEL;
  }

  function submitComposer() {
    const text = composerInput.value.trim();
    if (!text && !pendingAttachments.length) return;
    if (state.isGenerating) return;

    if (!getApiKey()) {
      showToast("warning", "No API key set", "Add your OpenRouter API key in Settings to start chatting.");
      window.location.href = "settings.html";
      return;
    }

    if (!state.activeConvoId) {
      const id = "c" + uid();
      state.conversations.unshift({ id, title: "New chat", updatedAt: Date.now(), pinned: false });
      state.messagesByConvo[id] = [];
      state.activeConvoId = id;
    }

    const msgs = getMessages(state.activeConvoId);
    const userMsg = {
      id: uid(),
      role: "user",
      text,
      ts: Date.now(),
      attachments: pendingAttachments.map((a) => ({ name: a.name, kind: a.kind, previewUrl: a.previewUrl })),
    };
    msgs.push(userMsg);

    // Immediate short title (2-5 words, local/offline, no network round-trip)
    // so a conversation is never left titled "New chat". generateChatTitle()
    // below still tries to replace it with a model-generated summary once
    // the assistant replies, the same way Claude and ChatGPT title chats.
    const convo = state.conversations.find((c) => c.id === state.activeConvoId);
    const isFirstMessage = convo && (convo.title === "New chat" || !convo.title);
    if (isFirstMessage) {
      convo.title = quickLocalTitle(text);
      convo.titleGenerated = false;
    }
    if (convo) convo.updatedAt = Date.now();

    clearComposer();
    renderHistory(historySearch.value);
    renderMessages();
    persistHistory();

    generateAssistantReply();
  }

  function estimateTokens(str) {
    return Math.max(1, Math.round(String(str || "").split(/\s+/).filter(Boolean).length * 1.3));
  }

  /* -----------------------------------------------------------------------
     Instant local title: 2-5 meaningful words pulled from the first
     message, stripped of filler/stopwords and sentence punctuation, title
     cased. Used the moment a chat starts, before any network round-trip;
     generateChatTitle() may later upgrade it to a model-written summary.
     ----------------------------------------------------------------------- */
  const TITLE_STOPWORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "at", "for", "with", "and", "or", "but",
    "please", "can", "you", "i", "me", "my", "we", "our", "your",
    "it", "this", "that", "do", "does", "did", "how", "what", "why",
    "help", "just", "would", "could", "should", "like", "want", "need",
  ]);
  function quickLocalTitle(text) {
    const clean = String(text || "").replace(/[`*_#>\-]/g, " ").trim();
    if (!clean) return "New chat";
    const words = clean.split(/\s+/).filter(Boolean);
    const meaningful = words.filter((w) => {
      const bare = w.replace(/[^\w'-]/g, "").toLowerCase();
      return bare.length > 1 && !TITLE_STOPWORDS.has(bare);
    });
    let picked = (meaningful.length >= 2 ? meaningful : words).slice(0, 5);
    if (picked.length < 2) picked = words.slice(0, Math.max(2, Math.min(5, words.length)));
    if (!picked.length) return "New chat";
    const titled = picked.map((w) => {
      const bare = w.replace(/[^\w'-]/g, "");
      if (!bare) return w;
      return bare.length <= 3 && bare === bare.toLowerCase()
        ? bare.charAt(0).toUpperCase() + bare.slice(1)
        : bare.charAt(0).toUpperCase() + bare.slice(1);
    });
    return titled.join(" ").slice(0, 60);
  }

  function updateUsageUI() {
    const kLabel = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K" : String(n));

    // Sidebar session token bar (per-conversation-session estimate)
    const pct = Math.min(100, (state.tokensUsed / MAX_TOKENS) * 100);
    usageBarFill.style.width = pct + "%";
    usageBarFill.classList.toggle("is-high", pct > 75);
    usageValueText.textContent = `${kLabel(state.tokensUsed)} / ${kLabel(MAX_TOKENS)}`;

    // Rolling session/weekly usage windows (topbar pills + sidebar reset line)
    const now = Date.now();
    if (usageWindows.sessionResetAt <= now) {
      usageWindows.sessionTokens = 0;
      usageWindows.sessionResetAt = now + SESSION_WINDOW_MS;
      saveUsageWindows();
    }
    if (usageWindows.weeklyResetAt <= now) {
      usageWindows.weeklyTokens = 0;
      usageWindows.weeklyResetAt = now + WEEKLY_WINDOW_MS;
      saveUsageWindows();
    }

    const sessionPct = Math.round(Math.min(100, (usageWindows.sessionTokens / MAX_TOKENS) * 100));
    const weeklyPct = Math.round(Math.min(100, (usageWindows.weeklyTokens / WEEKLY_TOKEN_LIMIT) * 100));

    if (sidebarUsagePercent) sidebarUsagePercent.textContent = `${sessionPct}% used`;
    if (sidebarUsageReset) sidebarUsageReset.textContent = `resets in ${formatCountdown(usageWindows.sessionResetAt - now, "hours")}`;

    if (topbarSessionUsageText) topbarSessionUsageText.textContent = `Session ${sessionPct}%`;
    if (topbarSessionResetText) topbarSessionResetText.textContent = `resets ${formatCountdown(usageWindows.sessionResetAt - now, "hours")}`;
    if (topbarSessionUsageChip) topbarSessionUsageChip.classList.toggle("is-near-limit", sessionPct >= 90);

    if (topbarWeeklyUsageText) topbarWeeklyUsageText.textContent = `Weekly ${weeklyPct}%`;
    if (topbarWeeklyResetText) topbarWeeklyResetText.textContent = `resets ${formatCountdown(usageWindows.weeklyResetAt - now, "days")}`;
  }

  // Keep both countdowns ticking live even when no tokens are being added.
  setInterval(updateUsageUI, 30000);

  function setGeneratingUI(isGenerating) {
    state.isGenerating = isGenerating;
    sendBtn.hidden = isGenerating;
    stopBtn.hidden = !isGenerating;
    updateSendState();
  }

  /* Build the OpenRouter message list from the conversation so far,
     excluding the in-progress placeholder. */
  function buildApiMessages(convoId) {
    const msgs = getMessages(convoId).filter((m) => !m.streaming);
    const apiMessages = msgs.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text || "",
    }));

    // Prepend the user's custom instructions (Settings → Custom instructions)
    // as a system message, when set, so every conversation actually respects
    // the tone/format preferences saved there rather than just displaying
    // them back on the settings page.
    const settings = (window.NemotronSettings && window.NemotronSettings.load) ? window.NemotronSettings.load() : null;
    const customInstructions = settings && settings.customInstructions ? settings.customInstructions.trim() : "";
    if (customInstructions) {
      apiMessages.unshift({ role: "system", content: customInstructions });
    }
    return apiMessages;
  }

  function friendlyErrorMessage(status, apiMessage) {
    if (status === 401 || status === 403) {
      return "Your OpenRouter API key was rejected. Check it in Settings and save it again.";
    }
    if (status === 429) {
      return "This model is rate-limited right now. Wait a moment and try again, or switch to a different free model in Settings.";
    }
    if (status >= 500) {
      return "OpenRouter is having trouble reaching this model right now. Try again in a moment.";
    }
    return apiMessage || "The request failed. Check your connection and try again.";
  }

  function generateAssistantReply() {
    const convoId = state.activeConvoId;
    const msgs = getMessages(convoId);
    const apiKey = getApiKey();
    const model = getActiveModel();

    // Add thinking placeholder message
    const placeholder = { id: uid(), role: "assistant", text: "", ts: Date.now(), streaming: true, thinking: true, attachments: [] };
    msgs.push(placeholder);
    renderMessages();
    setGeneratingUI(true);

    const placeholderEl = () => chatMessages.querySelector(`[data-msg-id="${placeholder.id}"] .msg__bubble`);
    const timerEl = () => chatMessages.querySelector(`[data-msg-id="${placeholder.id}"] .msg__gen-timer`);
    const bubbleEl = placeholderEl();
    if (bubbleEl) {
      bubbleEl.innerHTML = `<div class="typing-indicator" role="status" aria-label="Nemotron is thinking"><span></span><span></span><span></span></div>`;
    }

    /* -----------------------------------------------------------------------
       Live "Generating... X.Xs" timer
       Ticks every 100ms from the moment the request starts until the stream
       finalizes, then is replaced in-place with the final elapsed time.
       ----------------------------------------------------------------------- */
    const genStartedAt = performance.now();
    placeholder.genElapsedSec = 0;
    placeholder.genDone = false;
    const timerInterval = setInterval(() => {
      const el = timerEl();
      if (!el) return;
      const secs = (performance.now() - genStartedAt) / 1000;
      el.textContent = `Generating... ${secs.toFixed(1)}s`;
    }, 100);

    /* -----------------------------------------------------------------------
       Fast character-by-character reveal
       Network chunks arrive in bursts, not evenly, so we don't render them
       straight to the DOM. Instead each chunk extends a `targetText` buffer,
       and a fast reveal loop chases that buffer a few characters at a time
       on every animation frame. This keeps the on-screen text advancing at a
       smooth, fast, readable pace and keeps sentence/word boundaries intact
       (never mid-tag) regardless of how bursty the underlying network is.
       ----------------------------------------------------------------------- */
    let targetText = "";
    let revealedLength = 0;
    let revealRafId = null;
    const CHARS_PER_FRAME = 3; // fast, but still visibly "typing"

    function renderRevealed() {
      placeholder.text = targetText.slice(0, revealedLength);
      const el = placeholderEl();
      if (el) {
        el.innerHTML = renderMarkdown(placeholder.text) + (placeholder.streaming ? '<span class="streaming-caret"></span>' : "");
      }
      if (isNearBottom()) scrollToBottom(false);
    }

    function revealTick() {
      if (revealedLength < targetText.length) {
        revealedLength = Math.min(targetText.length, revealedLength + CHARS_PER_FRAME);
        renderRevealed();
        revealRafId = requestAnimationFrame(revealTick);
      } else {
        revealRafId = null;
        // All buffered text has been shown; if the stream already finished
        // and there's nothing left to catch up on, wrap up now.
        if (placeholder.genDone) finishAfterReveal();
      }
    }

    function ensureRevealing() {
      if (revealRafId === null) revealRafId = requestAnimationFrame(revealTick);
    }

    const abortController = new AbortController();
    let stoppedByUser = false;
    currentStreamController = {
      cancel: () => { stoppedByUser = true; abortController.abort(); },
    };

    function finishAfterReveal() {
      clearInterval(timerInterval);
      const finalSecs = (performance.now() - genStartedAt) / 1000;
      placeholder.genElapsedSec = finalSecs;
      finalizeMessage(placeholder.errored === true);
    }

    function finalizeMessage(errored) {
      placeholder.streaming = false;
      placeholder.thinking = false;
      if (!errored) {
        const tokensAdded = estimateTokens(placeholder.text);
        state.tokensUsed = Math.min(MAX_TOKENS, state.tokensUsed + tokensAdded);
        addUsageTokens(tokensAdded);
        updateUsageUI();
      }
      const convo = state.conversations.find((c) => c.id === convoId);
      if (convo) convo.updatedAt = Date.now();
      setGeneratingUI(false);
      currentStreamController = null;
      renderMessages();
      renderHistory(historySearch.value);
      persistHistory();

      // Auto-title: once the first exchange in a chat completes successfully,
      // ask the model for a short conversation title (like Claude/ChatGPT do)
      // instead of leaving the raw truncated first message as the title.
      if (!errored && convo && !convo.titleGenerated && placeholder.text.trim()) {
        generateChatTitle(convoId);
      }
    }

    fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": window.location.origin || "https://nemotron.local",
        "X-Title": "NVIDIA Nemotron",
      },
      body: JSON.stringify({
        model: model,
        messages: buildApiMessages(convoId),
        stream: true,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().catch(() => null).then((data) => {
            const apiMsg = data && data.error && data.error.message;
            throw new Error(friendlyErrorMessage(response.status, apiMsg));
          });
        }
        placeholder.thinking = false;
        const el = placeholderEl();
        if (el) {
          el.innerHTML = '<span class="streaming-caret"></span>';
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function readChunk() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              placeholder.genDone = true;
              if (revealRafId === null && revealedLength >= targetText.length) {
                finishAfterReveal();
              }
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              let json;
              try {
                json = JSON.parse(payload);
              } catch (e) {
                continue;
              }
              const delta = json && json.choices && json.choices[0] && json.choices[0].delta;
              const deltaText = delta && (delta.content || delta.reasoning_content || "");
              if (deltaText) {
                targetText += deltaText;
                ensureRevealing();
              }
            }
            return readChunk();
          });
        }
        return readChunk();
      })
      .catch((err) => {
        clearInterval(timerInterval);
        if (revealRafId !== null) { cancelAnimationFrame(revealRafId); revealRafId = null; }
        if (stoppedByUser) {
          targetText = targetText || "_Generation stopped._";
          if (placeholder.text) targetText = placeholder.text + "\n\n_(Generation stopped by user.)_";
          revealedLength = targetText.length;
          renderRevealed();
          const finalSecs = (performance.now() - genStartedAt) / 1000;
          placeholder.genElapsedSec = finalSecs;
          finalizeMessage(false);
          return;
        }
        const message = (err && err.message) || "Something went wrong reaching OpenRouter.";
        targetText = targetText || `_${message}_`;
        revealedLength = targetText.length;
        renderRevealed();
        placeholder.errored = true;
        showToast("danger", "Generation failed", message);
        const finalSecs = (performance.now() - genStartedAt) / 1000;
        placeholder.genElapsedSec = finalSecs;
        finalizeMessage(true);
      });
  }

  /* -----------------------------------------------------------------------
     Auto-generated chat titles
     After the first assistant reply in a conversation, ask the model for a
     short (3-6 word) title summarizing what the chat is about, and use it
     to replace the provisional "first 60 chars of the prompt" title. Best
     effort: on any failure the provisional title just stays as-is.
     ----------------------------------------------------------------------- */
  function generateChatTitle(convoId) {
    const convo = state.conversations.find((c) => c.id === convoId);
    if (!convo) return;
    convo.titleGenerated = true; // mark attempted so we only ever try once

    const apiKey = getApiKey();
    if (!apiKey) return;

    const msgs = getMessages(convoId).filter((m) => !m.streaming && m.text);
    const firstUser = msgs.find((m) => m.role === "user");
    const firstAssistant = msgs.find((m) => m.role === "assistant");
    if (!firstUser) return;

    const titlePrompt =
      "Summarize the topic of this conversation in a short title of 3 to 6 words. " +
      "Do not use quotation marks, a trailing period, or the words \"title\" or \"conversation\". " +
      "Reply with only the title text and nothing else.\n\n" +
      "User: " + firstUser.text.slice(0, 600) +
      (firstAssistant ? "\nAssistant: " + firstAssistant.text.slice(0, 600) : "");

    fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": window.location.origin || "https://nemotron.local",
        "X-Title": "NVIDIA Nemotron",
      },
      body: JSON.stringify({
        model: getActiveModel(),
        messages: [{ role: "user", content: titlePrompt }],
        stream: false,
        max_tokens: 24,
        temperature: 0.3,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const raw = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!raw) return;
        const cleaned = sanitizeGeneratedTitle(raw);
        if (!cleaned) return;
        const current = state.conversations.find((c) => c.id === convoId);
        if (!current) return;
        current.title = cleaned;
        renderHistory(historySearch.value);
        persistHistory();
      })
      .catch(() => {
        // Silent failure: the provisional title (first message excerpt) stands.
      })
      .finally(() => {
        // Persist the titleGenerated=true flag set above regardless of
        // outcome, so a failed attempt doesn't silently revert to "never
        // tried" on the next reload (persistHistory() earlier in
        // finalizeMessage() ran before this attempt started, so without
        // this the in-memory-only flag would be lost the moment the page
        // reloads, and a reload between messages would trigger a second,
        // possibly redundant, title-generation request).
        persistHistory();
      });
  }

  function sanitizeGeneratedTitle(raw) {
    let t = String(raw || "").trim();
    // Strip wrapping quotes/backticks and any stray markdown emphasis.
    t = t.replace(/^["'`*_\s]+|["'`*_\s]+$/g, "");
    // Keep it to a single line.
    t = t.split("\n")[0].trim();
    // Drop a trailing period some models add despite instructions.
    t = t.replace(/[.]+$/, "").trim();
    if (!t) return "";
    return t.length > 60 ? t.slice(0, 60).trim() : t;
  }

  function stopGeneration() {
    if (currentStreamController && currentStreamController.cancel) {
      currentStreamController.cancel();
    }
  }
  stopBtn.addEventListener("click", stopGeneration);

  /* =======================================================================
     12. Account menu dropdown
     ======================================================================= */
  function closeAccountMenu() {
    accountMenu.classList.remove("is-open");
    accountMenuTrigger.setAttribute("aria-expanded", "false");
  }
  function toggleAccountMenu() {
    const isOpen = accountMenu.classList.toggle("is-open");
    accountMenuTrigger.setAttribute("aria-expanded", String(isOpen));
  }
  accountMenuTrigger.addEventListener("click", (e) => { e.stopPropagation(); toggleAccountMenu(); });
  document.addEventListener("click", (e) => {
    if (!accountMenu.contains(e.target) && e.target !== accountMenuTrigger) closeAccountMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAccountMenu(); });
  logoutBtn.addEventListener("click", () => {
    closeAccountMenu();
    if (window.NemotronSession) window.NemotronSession.signOut();
    showToast("info", "Signed out", "Your session has been cleared on this device.");
    setTimeout(() => { window.location.href = "../index.html"; }, 700);
  });

  /* =======================================================================
     13. Model dropdown
     ======================================================================= */
  function toggleModelDropdown(open) {
    const isOpen = open !== undefined ? open : modelDropdown.getAttribute("data-open") !== "true";
    modelDropdown.setAttribute("data-open", String(isOpen));
    modelDropdownTrigger.setAttribute("aria-expanded", String(isOpen));
  }
  modelDropdownTrigger.addEventListener("click", (e) => { e.stopPropagation(); toggleModelDropdown(); });
  document.addEventListener("click", (e) => { if (!modelDropdown.contains(e.target)) toggleModelDropdown(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleModelDropdown(false); });

  function setActiveModelOption(modelId) {
    $$(".model-option").forEach((o) => {
      const isMatch = o.getAttribute("data-model") === modelId;
      o.setAttribute("aria-selected", String(isMatch));
      if (isMatch) {
        const name = o.querySelector(".model-option__name").textContent;
        $(".model-badge__name").textContent = name;
      }
    });
  }

  $$(".model-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const modelId = opt.getAttribute("data-model");
      state.model = modelId;
      setActiveModelOption(modelId);
      toggleModelDropdown(false);

      // Persist the choice so Settings and future sessions stay in sync.
      try {
        const current = loadSettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(Object.assign({}, current, { model: modelId })));
      } catch (e) { /* storage unavailable; selection still applies for this session */ }
      const name = opt.querySelector(".model-option__name").textContent;
      showToast("info", null, `Switched to ${name}.`);
    });
  });

  setActiveModelOption(state.model);

  /* =======================================================================
     14. Modals (shortcuts / delete confirm): self-contained open/close
     ======================================================================= */
  let lastFocusedEl = null;
  function openModalById(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    // Guard against stacking two full-screen modal overlays at once (e.g.
    // pressing Shift+? to open the shortcuts modal while the delete-confirm
    // modal is already open). Close any other open modal first.
    $$(".modal-overlay.is-open").forEach((openOverlay) => {
      if (openOverlay !== overlay) closeModalById(openOverlay.id);
    });
    lastFocusedEl = document.activeElement;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const focusable = overlay.querySelector("input, button, [href], select, textarea");
    focusable && focusable.focus();
  }
  function closeModalById(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    lastFocusedEl && lastFocusedEl.focus();
  }
  $$("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const overlay = btn.closest(".modal-overlay");
      overlay && closeModalById(overlay.id);
    });
  });
  $$("[data-modal-overlay]").forEach((overlay) => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModalById(overlay.id); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal-overlay.is-open").forEach((o) => closeModalById(o.id));
  });
  // Basic focus trap
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const overlay = document.querySelector(".modal-overlay.is-open");
    if (!overlay) return;
    const focusables = overlay.querySelectorAll('input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  shortcutsMenuBtn.addEventListener("click", () => { closeAccountMenu(); openModalById("shortcutsModal"); });
  shortcutsTopbarBtn.addEventListener("click", () => openModalById("shortcutsModal"));

  /* =======================================================================
     15. Global keyboard shortcuts
     ======================================================================= */
  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    const inField = tag === "TEXTAREA" || tag === "INPUT";

    // Ctrl/Cmd+Shift+O -> new chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
      e.preventDefault();
      startNewConversation();
      return;
    }
    // Ctrl/Cmd+K -> focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setSidebarState(true);
      setTimeout(() => historySearch.focus(), isMobile() ? 260 : 0);
      return;
    }
    // Ctrl/Cmd+B -> toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      setSidebarState(!isSidebarOpen());
      return;
    }
    // "/" -> focus composer (only if not already typing somewhere)
    if (e.key === "/" && !inField) {
      e.preventDefault();
      composerInput.focus();
      return;
    }
    // Shift+? -> shortcuts modal
    if (e.key === "?" && e.shiftKey && !inField) {
      e.preventDefault();
      openModalById("shortcutsModal");
      return;
    }
    // Escape -> stop generation if running (and no modal open, handled above)
    if (e.key === "Escape" && state.isGenerating && !document.querySelector(".modal-overlay.is-open")) {
      stopGeneration();
    }
  });

  /* =======================================================================
     16. Init
     ======================================================================= */
  function init() {
    const sorted = state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    state.activeConvoId = sorted.length ? sorted[0].id : null;
    renderHistory("");
    renderMessages();
    updateUsageUI();
    updateSendState();
    autoResize(composerInput);

    if (!getApiKey()) {
      showToast("info", "Add your API key", "Open Settings and paste your free OpenRouter API key to start chatting.");
    }
  }

  init();
})();
