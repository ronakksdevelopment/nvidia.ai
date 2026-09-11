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
  const TOAST_ICONS = { success: "icon-check-circle", danger: "icon-x-circle", warning: "icon-alert-triangle", info: "icon-info" };
  const TOAST_TITLES = { success: "Success", danger: "Something went wrong", warning: "Heads up", info: "Note" };
  function showToast(type, title, message) {
    if (!toastRegion) return;
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toastTitle = title || TOAST_TITLES[type] || TOAST_TITLES.info;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <svg class="toast__icon" width="20" height="20"><use href="#${icon}"/></svg>
      <div class="toast__content">
        <div class="toast__title">${escapeHtml(toastTitle)}</div>
        ${message ? `<div class="toast__message">${escapeHtml(message)}</div>` : ""}
      </div>
      <button class="toast__close" type="button" aria-label="Dismiss notification">
        <svg width="16" height="16"><use href="#icon-x"/></svg>
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

  function inlineMd(str) {
    let s = str;
    // inline code (already escaped upstream, so `` `code` `` is safe)
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // italic
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }

  /* -----------------------------------------------------------------------
     Minimal syntax highlighter (token-regex based, language-agnostic-ish)
     ----------------------------------------------------------------------- */
  const KEYWORDS = /\b(function|const|let|var|return|if|else|for|while|class|import|from|export|default|new|this|try|catch|finally|await|async|def|self|elif|None|True|False|end|do|then|public|private|static|void|int|string|bool|struct|impl|fn|match|switch|case|break|continue|null|undefined|True|False|None|lambda|yield|with|as|in|is|not|and|or|pass|raise|except)\b/g;

  function highlightCode(code, lang) {
    let s = escapeHtml(code);
    // comments (line)
    s = s.replace(/(^|[^:])\/\/(.*)$/gm, (m, pre, c) => `${pre}<span class="tok-comment">//${c}</span>`);
    s = s.replace(/(#.*)$/gm, (m) => {
      if (/^#(!\/)/.test(m)) return m; // shebang
      return `<span class="tok-comment">${m}</span>`;
    });
    // strings
    s = s.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="tok-string">$1</span>');
    // numbers
    s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-number">$1</span>');
    // function calls: word(
    s = s.replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="tok-function">$1</span>');
    // keywords
    s = s.replace(KEYWORDS, '<span class="tok-keyword">$1</span>');
    return s;
  }

  function renderCodeBlock(lang, code) {
    const id = "code-" + uid();
    const highlighted = highlightCode(code, lang);
    return `
<div class="code-block">
  <div class="code-block__head">
    <span class="code-block__lang">${escapeHtml(lang || "text")}</span>
    <button class="code-block__copy-btn" type="button" data-copy-target="${id}">
      <svg width="13" height="13"><use href="#icon-copy"/></svg>
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

  const isGuestSession = () => !!(window.NemotronSession && window.NemotronSession.isGuestActive());

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
    if (isGuestSession()) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({
        conversations: state.conversations,
        messagesByConvo: state.messagesByConvo,
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
  const topbarUsageChip = $("#topbarUsageChip");
  const topbarUsageText = $("#topbarUsageText");

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

    let list = state.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
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
            <svg width="16" height="16"><use href="#icon-dots"/></svg>
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
    state.conversations.unshift({ id, title: "New chat", updatedAt: Date.now(), pinned: false });
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
        <svg width="16" height="16"><use href="#icon-file"/></svg>
        <span class="msg-attachment__name">${escapeHtml(att.name)}</span>
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

    const actions = document.createElement("div");
    actions.className = "msg__actions";
    if (msg.role === "user") {
      actions.innerHTML = `
        <button class="msg__action-btn" type="button" data-action="edit" aria-label="Edit message" title="Edit">
          <svg width="15" height="15"><use href="#icon-edit"/></svg>
        </button>
        <button class="msg__action-btn" type="button" data-action="copy" aria-label="Copy message" title="Copy">
          <svg width="15" height="15"><use href="#icon-copy"/></svg>
        </button>`;
    } else if (!msg.streaming) {
      actions.innerHTML = `
        <button class="msg__action-btn" type="button" data-action="copy" aria-label="Copy response" title="Copy">
          <svg width="15" height="15"><use href="#icon-copy"/></svg>
        </button>
        <button class="msg__action-btn" type="button" data-action="regenerate" aria-label="Regenerate response" title="Regenerate">
          <svg width="15" height="15"><use href="#icon-refresh"/></svg>
        </button>
        <button class="msg__action-btn ${msg.feedback === "up" ? "is-active" : ""}" type="button" data-action="thumb-up" aria-label="Good response" title="Good response">
          <svg width="15" height="15"><use href="#icon-thumb-up"/></svg>
        </button>
        <button class="msg__action-btn ${msg.feedback === "down" ? "is-active" : ""}" type="button" data-action="thumb-down" aria-label="Bad response" title="Bad response">
          <svg width="15" height="15"><use href="#icon-thumb-down"/></svg>
        </button>`;
    }

    col.appendChild(roleRow);
    col.appendChild(bubble);
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
              <svg width="12" height="12"><use href="#icon-x"/></svg>
            </button>
          </div>`;
      }
      return `
        <div class="attachment-chip" data-attachment-id="${a.id}">
          <svg width="14" height="14"><use href="#icon-file"/></svg>
          <span class="attachment-chip__name">${escapeHtml(a.name)}</span>
          <button class="attachment-chip__remove" type="button" data-remove-attachment="${a.id}" aria-label="Remove attachment">
            <svg width="12" height="12"><use href="#icon-x"/></svg>
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

    // Update conversation title from first message
    const convo = state.conversations.find((c) => c.id === state.activeConvoId);
    if (convo && (convo.title === "New chat" || !convo.title)) {
      convo.title = text.slice(0, 60) || "New chat";
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

  function updateUsageUI() {
    const pct = Math.min(100, (state.tokensUsed / MAX_TOKENS) * 100);
    usageBarFill.style.width = pct + "%";
    usageBarFill.classList.toggle("is-high", pct > 75);
    const kLabel = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K" : String(n));
    usageValueText.textContent = `${kLabel(state.tokensUsed)} / ${kLabel(MAX_TOKENS)}`;
    topbarUsageText.textContent = `${kLabel(state.tokensUsed)} / ${kLabel(MAX_TOKENS)} tokens`;
  }

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
    return msgs.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text || "",
    }));
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
    const bubbleEl = placeholderEl();
    if (bubbleEl) {
      bubbleEl.innerHTML = `<div class="typing-indicator" role="status" aria-label="Nemotron is thinking"><span></span><span></span><span></span></div>`;
    }

    const abortController = new AbortController();
    let stoppedByUser = false;
    currentStreamController = {
      cancel: () => { stoppedByUser = true; abortController.abort(); },
    };

    function finalizeMessage(errored) {
      placeholder.streaming = false;
      placeholder.thinking = false;
      if (!errored) {
        const tokensAdded = estimateTokens(placeholder.text);
        state.tokensUsed = Math.min(MAX_TOKENS, state.tokensUsed + tokensAdded);
        updateUsageUI();
      }
      const convo = state.conversations.find((c) => c.id === convoId);
      if (convo) convo.updatedAt = Date.now();
      setGeneratingUI(false);
      currentStreamController = null;
      renderMessages();
      renderHistory(historySearch.value);
      persistHistory();
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
        if (el) el.innerHTML = '<span class="streaming-caret"></span>';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function readChunk() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              finalizeMessage(false);
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
                placeholder.text += deltaText;
                const el2 = placeholderEl();
                if (el2) {
                  el2.innerHTML = renderMarkdown(placeholder.text) + '<span class="streaming-caret"></span>';
                }
                if (isNearBottom()) scrollToBottom(false);
              }
            }
            return readChunk();
          });
        }
        return readChunk();
      })
      .catch((err) => {
        if (stoppedByUser) {
          if (!placeholder.text) placeholder.text = "_Generation stopped._";
          else placeholder.text += "\n\n_(Generation stopped by user.)_";
          finalizeMessage(false);
          return;
        }
        const message = (err && err.message) || "Something went wrong reaching OpenRouter.";
        placeholder.text = placeholder.text || `_${message}_`;
        placeholder.errored = true;
        showToast("danger", "Generation failed", message);
        finalizeMessage(true);
      });
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
