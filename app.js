(function () {
  'use strict';
  const welcomeEl = document.getElementById('welcome');
  const welcomeTitle = document.getElementById('welcomeTitle');
  const welcomeSub = document.getElementById('welcomeSub');
  const welcomeSuggest = document.getElementById('welcomeSuggest');
  const messagesEl = document.getElementById('messages');
  const activeBadge = document.getElementById('activeBadge');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const model = document.getElementById('model');
  const sendBtn = document.getElementById('send');
  const mediaImageBtn = document.getElementById('mediaImage');
  const mediaVideoBtn = document.getElementById('mediaVideo');
  const mediaChips = Array.prototype.slice.call(document.querySelectorAll('.media-chip'));
  const newThreadBtn = document.getElementById('newThread');
  const threadList = document.getElementById('threadList');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusIcon = document.getElementById('statusIcon');
  const sideToggle = document.getElementById('sideToggle');
  const themeToggle = document.getElementById('themeToggle');
  const panelHide = document.getElementById('panelHide');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsModal = document.getElementById('settingsModal');
  const settingsClose = document.getElementById('settingsClose');
  const settingsSave = document.getElementById('settingsSave');
  const settingsCancel = document.getElementById('settingsCancel');
  const settingsReset = document.getElementById('settingsReset');
  const settingTheme = document.getElementById('settingTheme');
  const settingDefaultModel = document.getElementById('settingDefaultModel');
  const settingImageAspect = document.getElementById('settingImageAspect');
  const settingImageModel = document.getElementById('settingImageModel');
  const settingEnhancePrompts = document.getElementById('settingEnhancePrompts');
  const settingEnterSend = document.getElementById('settingEnterSend');
  const layoutEl = document.querySelector('.layout');
  const workspaceEl = document.getElementById('workspace');
  const canvasPanel = document.getElementById('canvasPanel');
  const canvasTitle = document.getElementById('canvasTitle');
  const canvasLang = document.getElementById('canvasLang');
  const canvasEditor = document.getElementById('canvasEditor');
  const canvasCopy = document.getElementById('canvasCopy');
  const canvasDownload = document.getElementById('canvasDownload');
  const canvasClose = document.getElementById('canvasClose');
  const canvasPreviewToggle = document.getElementById('canvasPreviewToggle');
  const canvasTabEditor = document.getElementById('canvasTabEditor');
  const canvasTabPreview = document.getElementById('canvasTabPreview');
  const canvasEditorPane = document.getElementById('canvasEditorPane');
  const canvasPreviewPane = document.getElementById('canvasPreviewPane');
  const canvasPreviewFrame = document.getElementById('canvasPreviewFrame');
  const canvasRefreshPreview = document.getElementById('canvasRefreshPreview');
  const previewStatus = document.getElementById('previewStatus');
  const viewTabs = Array.prototype.slice.call(document.querySelectorAll('.view-tab'));
  const filesPanel = document.getElementById('filesPanel');
  const terminalPanel = document.getElementById('terminalPanel');
  const filesRefresh = document.getElementById('filesRefresh');
  const fileSave = document.getElementById('fileSave');
  const filesPath = document.getElementById('filesPath');
  const filesTree = document.getElementById('filesTree');
  const fileName = document.getElementById('fileName');
  const fileEditor = document.getElementById('fileEditor');
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalForm = document.getElementById('terminalForm');
  const terminalInput = document.getElementById('terminalInput');
  const terminalClear = document.getElementById('terminalClear');
  const filesCloseBtn = document.getElementById('filesClose');
  const terminalCloseBtn = document.getElementById('terminalClose');
  const agentMode = document.getElementById('agentMode');
  let currentView = 'chat';
  let currentFilePath = '';
  let currentDir = '.';

  // ---- Scrim sidebar (mobile-first) -----------------------------------
  // Panel sidebar di ponsel muncul sebagai drawer di atas konten; scrim menutupnya saat diketuk.
  const scrim = document.createElement('button');
  scrim.type = 'button';
  scrim.className = 'scrim';
  scrim.tabIndex = -1;
  scrim.setAttribute('aria-hidden', 'true');
  scrim.setAttribute('aria-label', 'Tutup riwayat percakapan');
  document.body.appendChild(scrim);

  function isNarrow() {
    return window.innerWidth <= 768;
  }

  function sidebarOpen() {
    return !layoutEl.classList.contains('collapsed');
  }

  function syncSidebar() {
    const open = sidebarOpen();
    scrim.classList.toggle('show', isNarrow() && open);
    scrim.setAttribute('aria-hidden', !(isNarrow() && open));
    if (sideToggle) {
      sideToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      sideToggle.title = open ? 'Tutup riwayat' : 'Buka riwayat';
      sideToggle.setAttribute('aria-label', sideToggle.title);
    }
    if (panelHide) {
      panelHide.setAttribute('aria-expanded', open ? 'true' : 'false');
      panelHide.title = open ? 'Tutup riwayat' : 'Tampilkan riwayat';
      panelHide.setAttribute('aria-label', panelHide.title);
    }
  }

  scrim.addEventListener('click', function () {
    layoutEl.classList.add('collapsed');
    syncSidebar();
    if (sideToggle) sideToggle.focus();
  });

  new MutationObserver(syncSidebar).observe(layoutEl, {
    attributes: true,
    attributeFilter: ['class'],
  });
  window.addEventListener('resize', syncSidebar);

  if (isNarrow()) {
    // Di ponsel sidebar mulai tertutup agar percakapan langsung terlihat.
    layoutEl.classList.add('collapsed');
  }
  syncSidebar();

  let busy = false;
  let threadId = 0;
  let threadCount = 0;
  let history = []; // {id, items:[{role,content,media?}]}
  let mediaMode = ''; // '' (chat) | 'image' | 'video'

  function setStatus(state, label) {
    statusDot.className = 'dot' + (state ? ' ' + state : '');
    if (label) statusLabel.textContent = label;
    if (statusIcon) statusIcon.classList.remove('show');
  }

  function setStatusIcon(state) {
    statusDot.className = 'dot' + (state ? ' ' + state : '');
    statusLabel.textContent = '';
    if (statusIcon) {
      statusIcon.classList.remove('on', 'err');
      if (state) statusIcon.classList.add(state);
      statusIcon.classList.add('show');
    }
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Optimasi decorateText agar tidak berat saat streaming
  function looksLikeCode(text) {
    if (!text) return false;
    const t = text.trim();
    if (t.length < 20) return false;
    const lines = t.split('\n');
    const codeSignals = [
      /[{};]/,
      /<\/?[a-zA-Z][\w:-]*[^>]*>/,
      /\b(function|const|let|var|class|import|export|return|if|else|for|while|switch|case|break|continue|try|catch|async|await|def|print|public|private|static|void|int|string|bool|#include|package|using)\b/,
      /=>|::|===|!==|<=|>=|\+\+|--|&&|\|\|/,
      /^\s{2,}\S/m,
      /^\s*(#|\/\/|\/\*|\*\/)/m
    ];
    let score = 0;
    codeSignals.forEach(function (re) { if (re.test(t)) score++; });
    if (score >= 2 && lines.length >= 2) return true;
    // Mostly indented or structured lines
    const indented = lines.filter(function (l) { return /^\s{2,}/.test(l); }).length;
    if (lines.length >= 4 && indented >= Math.ceil(lines.length * 0.4) && score >= 1) return true;
    return false;
  }

  function detectLangFromCode(code) {
    const t = (code || '').trim();
    if (/^<(!doctype|html|head|body|div|span|script|style|svg)/i.test(t) || /<\/[a-z]/i.test(t)) return 'html';
    if (/^\s*\{[\s\S]*\}\s*$/.test(t) || /"[^"]+"\s*:/.test(t)) return 'json';
    if (/\b(function|const|let|var|=>|console\.|document\.|window\.)\b/.test(t)) return 'javascript';
    if (/^\s*[.#@][^{]+\{[\s\S]*\}/m.test(t)) return 'css';
    if (/\b(def |import |from |print\(|self\b)\b/.test(t)) return 'python';
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|FROM|WHERE)\b/i.test(t)) return 'sql';
    if (/^#!/.test(t) || /\b(echo|cd|ls|npm|git|curl)\b/.test(t)) return 'bash';
    return 'code';
  }

  function isRunnableLang(lang) {
    const l = (lang || '').toLowerCase();
    return ['html', 'htm', 'css', 'js', 'javascript', 'svg', 'xml'].indexOf(l) !== -1;
  }

  function renderCodeBlock(code, langLabel) {
    const label = (langLabel || 'code').toLowerCase();
    const runnable = isRunnableLang(label);
    return '' +
      '<div class="code-block" data-lang="' + esc(label) + '">' +
        '<div class="code-block-header">' +
          '<span class="code-lang">' + esc(label) + '</span>' +
          '<div class="code-block-actions">' +
            (runnable ? '<button type="button" class="code-run" data-action="run-code" aria-label="Jalankan kode">Run</button>' : '') +
            '<button type="button" class="code-open" data-action="open-canvas" aria-label="Buka di Canvas">Buka di Canvas</button>' +
            '<button type="button" class="code-copy" data-action="copy-code" aria-label="Salin kode">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
              '<span>Salin</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<pre><code>' + esc((code || '').replace(/\n$/, '')) + '</code></pre>' +
      '</div>';
  }

  function renderTextSegment(p) {
    let escaped = esc(p).replace(/\r\n/g, '\n');
    // Auto-detect unfenced code blocks
    if (looksLikeCode(escaped.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'))) {
      const raw = p.replace(/\r\n/g, '\n').trim();
      return renderCodeBlock(raw, detectLangFromCode(raw));
    }
    // Convert double newlines to paragraphs, single to <br>
    escaped = escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    if (escaped.indexOf('<p>') === -1 && escaped.trim()) {
      escaped = '<p>' + escaped + '</p>';
    } else if (escaped.indexOf('<p>') === 0) {
      // ok
    } else if (escaped.trim()) {
      escaped = '<p>' + escaped;
    }
    if (escaped.indexOf('</p>') === -1 && escaped.trim()) {
      escaped = escaped + '</p>';
    }
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    return escaped;
  }

  function decorateText(text) {
    if (!text) return '';
    const blockRe = /```([^\n`]*)\n?([\s\S]*?)```/g;
    const parts = [];
    let last = 0, m;
    let hasFenced = false;
    while ((m = blockRe.exec(text)) !== null) {
      hasFenced = true;
      const before = text.slice(last, m.index);
      if (before) parts.push(before);
      const lang = (m[1] || '').trim();
      const code = m[2] || '';
      const langLabel = lang ? lang : detectLangFromCode(code);
      parts.push({ html: renderCodeBlock(code, langLabel) });
      last = m.index + m[0].length;
    }

    let tail = text.slice(last);
    // Handle unclosed fenced block during streaming
    const openFence = tail.match(/```([^\n`]*)\n?([\s\S]*)$/);
    if (openFence) {
      const beforeFence = tail.slice(0, openFence.index);
      if (beforeFence) parts.push(beforeFence);
      const lang = (openFence[1] || '').trim();
      const code = openFence[2] || '';
      const langLabel = lang ? lang : detectLangFromCode(code);
      parts.push({ html: renderCodeBlock(code, langLabel) });
      tail = '';
      hasFenced = true;
    }
    if (tail) parts.push(tail);

    // If no fenced blocks and the whole text looks like code, render as a single code block
    if (!hasFenced && looksLikeCode(text)) {
      return renderCodeBlock(text.replace(/\r\n/g, '\n').trim(), detectLangFromCode(text));
    }

    return parts.map(function (p) {
      if (typeof p === 'object') return p.html;
      return renderTextSegment(p);
    }).join('');
  }

  function addUserMessage(content) {
    const el = document.createElement('div');
    el.className = 'msg user';
    if (content) {
      const body = document.createElement('div');
      body.className = 'ubody';
      body.textContent = content;
      el.appendChild(body);
    }
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  // Pesan AI yang siap untuk streaming.
  // `item` adalah objek riwayat yang dirender; tombol "Ulangi" memakai posisinya
  // di array, bukan salinan teks saat render, agar tetap benar setelah jawaban
  // diperbarui.
  function createAssistantMessage(item) {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    const tag = document.createElement('div');
    tag.className = 'role-tag';
    // `.model-tag` sengaja dibiarkan kosong untuk chat: nama model upstream
    // tidak diumbar ke pengguna. Hanya label media (Flux/Video) yang diisi.
    tag.innerHTML = '<span class="agent-dot" aria-hidden="true"><svg class="robot-ico" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="7" width="14" height="11" rx="3" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.7"/><path d="M12 4v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="3.2" r="1.1" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><path d="M9 15.2c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 11v3M20 11v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><span>Marbel AI</span><span class="model-tag"></span>';
    const body = document.createElement('div');
    body.className = 'body';
    const inner = document.createElement('div');
    inner.className = 'inner';
    // Baris aksi (copy / regenerate), diisi setelah jawaban final.
    const actions = document.createElement('div');
    actions.className = 'm-actions';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'm-act copy';
    copyBtn.textContent = 'Salin';
    copyBtn.setAttribute('aria-label', 'Salin jawaban');
    const regenBtn = document.createElement('button');
    regenBtn.type = 'button';
    regenBtn.className = 'm-act regen';
    regenBtn.textContent = 'Ulangi';
    regenBtn.setAttribute('aria-label', 'Ulangi jawaban');
    actions.appendChild(copyBtn);
    actions.appendChild(regenBtn);

    copyBtn.addEventListener('click', function () {
      copyToClipboard(inner.textContent || '', copyBtn);
    });
    regenBtn.addEventListener('click', function () {
      if (!item) return;
      const th = history.find(function (h) { return h.id === threadId; });
      regenerate(th ? th.items.indexOf(item) : -1, inner, tag, actions);
    });

    body.appendChild(inner);
    body.appendChild(actions);
    wrap.appendChild(tag);
    wrap.appendChild(body);

    messagesEl.appendChild(wrap);
    scrollDown();
    return { wrap: wrap, inner: inner, body: body, actions: actions, tag: tag };
  }

  function copyToClipboard(text, btn) {
    const done = function () {
      if (!btn) return;
      const old = btn.innerHTML;
      btn.innerHTML = '<span>Tersalin</span>';
      btn.classList.add('ok');
      setTimeout(function () { if (btn) { btn.innerHTML = old; btn.classList.remove('ok'); } }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  // ---- Canvas ----
  let canvasState = { title: 'Canvas', lang: 'text', ext: 'txt', view: 'editor' };

  function extForLang(lang) {
    const l = (lang || '').toLowerCase();
    const map = { js:'js', javascript:'js', ts:'ts', typescript:'ts', html:'html', css:'css', json:'json', md:'md', markdown:'md', py:'py', python:'py', sh:'sh', bash:'sh', yaml:'yml', yml:'yml', xml:'xml', sql:'sql', java:'java', c:'c', cpp:'cpp', go:'go', rs:'rs', php:'php', txt:'txt', code:'txt' };
    return map[l] || 'txt';
  }

  function detectPreviewType(lang, content) {
    const l = (lang || '').toLowerCase();
    const src = String(content || '').trim();
    if (['html', 'htm'].indexOf(l) !== -1) return 'html';
    if (['css'].indexOf(l) !== -1) return 'css';
    if (['js', 'javascript'].indexOf(l) !== -1) return 'js';
    if (['svg'].indexOf(l) !== -1) return 'svg';
    if (['xml'].indexOf(l) !== -1) return 'xml';
    if (['md', 'markdown'].indexOf(l) !== -1) return 'markdown';
    if (['json'].indexOf(l) !== -1) return 'json';
    // infer from content
    if (/^<(!doctype|html\b)/i.test(src) || (/<html[\s>]/i.test(src) && /<\/html>/i.test(src))) return 'html';
    if (/^<svg[\s>]/i.test(src) && /<\/svg>/i.test(src)) return 'svg';
    if (/^<\?xml/i.test(src) || /^<[a-zA-Z][\w:-]*[\s\S]*>/.test(src) && !/\b(function|const|let|var|=>)\b/.test(src)) return 'xml';
    if (/^\s*\{[\s\S]*\}\s*$/.test(src) || /^\s*\[[\s\S]*\]\s*$/.test(src)) { try { JSON.parse(src); return 'json'; } catch(e){} }
    if (/^\s*(@media|@import|:root|[.#@]?[a-zA-Z0-9_-]+\s*\{)/m.test(src) && /\{[\s\S]*:[\s\S]*\}/.test(src) && !/<[a-z]/i.test(src)) return 'css';
    if (/\b(function|const|let|var|class|=>|console\.|document\.|window\.|import\s|export\s)\b/.test(src) && !/^</.test(src)) return 'js';
    if (/^#|\*\*|```|^\-\s/m.test(src)) return 'markdown';
    return l || 'text';
  }

  function isPreviewableLang(lang, content) {
    const t = detectPreviewType(lang, content);
    return ['html', 'css', 'js', 'svg', 'xml', 'markdown', 'json', 'text'].indexOf(t) !== -1;
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function simpleMarkdownToHtml(md) {
    let s = escHtml(String(md || '').replace(/\r\n/g, '\n'));
    s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/^\- (.*)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    s = s.split(/\n\n+/).map(function(p){ if (/^<h\d|^<ul/.test(p.trim())) return p; return '<p>' + p.replace(/\n/g,'<br>') + '</p>'; }).join('\n');
    return s;
  }

  function buildPreviewDoc(lang, content) {
    const src = String(content || '');
    const t = detectPreviewType(lang, src);
    if (t === 'html') return src || '<!doctype html><html><body></body></html>';
    if (t === 'svg') return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:16px;background:#fff;display:flex;align-items:flex-start;justify-content:center}</style></head><body>' + src + '</body></html>';
    if (t === 'xml') return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0b0c0f}pre{margin:0;padding:16px;color:#e5e7eb;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}</style></head><body><pre>' + escHtml(src) + '</pre></body></html>';
    if (t === 'css') return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + src + '</style></head><body><main style="font-family:system-ui;padding:16px"><h2>CSS Preview</h2><p>Preview stylesheet diterapkan.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button>Button</button><input placeholder="Input" /><a href="#">Link</a></div><div class="card" style="padding:12px;border:1px solid #ddd;border-radius:8px;max-width:420px"><h3 style="margin:0 0 6px">Sample Card</h3><p style="margin:0">Contoh elemen untuk melihat efek CSS.</p></div></main></body></html>';
    if (t === 'js') return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;padding:16px;margin:0"><h3 style="margin:0 0 8px">JavaScript Output</h3><pre id="out" style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;min-height:80px;margin:0"></pre><script>(function(){const out=document.getElementById("out");const log=(...a)=>{out.textContent+=a.map(x=>{try{return typeof x==="string"?x:JSON.stringify(x,null,2)}catch(e){return String(x)}}).join(" ")+"\\n";};console.log=log;console.info=log;console.warn=log;console.error=(...a)=>log("[error]",...a);window.onerror=(m)=>log("[error]",m);try{const r=(function(){' + src.replace(/<\/script/gi, '<\\/script') + '\\n})(); if(r!==undefined) log("=>", r);}catch(e){log("Error:",e && e.message?e.message:e);} })();<\/script></body></html>';
    if (t === 'markdown') return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px;line-height:1.6;color:#111;max-width:800px}code{background:#f3f4f6;padding:2px 6px;border-radius:6px}pre{background:#0b0c0f;color:#e5e7eb;padding:12px;border-radius:8px;overflow:auto}h1,h2,h3{margin:.8em 0 .4em}</style></head><body>' + simpleMarkdownToHtml(src) + '</body></html>';
    if (t === 'json') {
      let pretty = src;
      try { pretty = JSON.stringify(JSON.parse(src), null, 2); } catch(e) {}
      return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0b0c0f}pre{margin:0;padding:16px;color:#e5e7eb;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}</style></head><body><pre>' + escHtml(pretty) + '</pre></body></html>';
    }
    // plain text / other
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fff}pre{margin:0;padding:16px;color:#111;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}</style></head><body><pre>' + escHtml(src) + '</pre></body></html>';
  }

  function isSplitCanvas() {
    return window.innerWidth > 768;
  }

  function setCanvasView(view) {
    canvasState.view = view;
    if (isSplitCanvas()) {
      if (canvasEditorPane) { canvasEditorPane.classList.add('active'); }
      if (canvasPreviewPane) { canvasPreviewPane.classList.add('active'); canvasPreviewPane.setAttribute('aria-hidden', 'false'); }
      if (canvasTabEditor) { canvasTabEditor.classList.remove('active'); canvasTabEditor.setAttribute('aria-selected', 'false'); }
      if (canvasTabPreview) { canvasTabPreview.classList.remove('active'); canvasTabPreview.setAttribute('aria-selected', 'false'); }
      if (canvasPreviewToggle) { canvasPreviewToggle.classList.remove('active'); canvasPreviewToggle.setAttribute('aria-pressed', 'false'); canvasPreviewToggle.textContent = 'Preview'; }
      refreshCanvasPreview();
      return;
    }
    const isPreview = view === 'preview';
    if (canvasEditorPane) canvasEditorPane.classList.toggle('active', !isPreview);
    if (canvasPreviewPane) { canvasPreviewPane.classList.toggle('active', isPreview); canvasPreviewPane.setAttribute('aria-hidden', isPreview ? 'false' : 'true'); }
    if (canvasTabEditor) { canvasTabEditor.classList.toggle('active', !isPreview); canvasTabEditor.setAttribute('aria-selected', !isPreview ? 'true' : 'false'); }
    if (canvasTabPreview) { canvasTabPreview.classList.toggle('active', isPreview); canvasTabPreview.setAttribute('aria-selected', isPreview ? 'true' : 'false'); }
    if (canvasPreviewToggle) { canvasPreviewToggle.classList.toggle('active', isPreview); canvasPreviewToggle.setAttribute('aria-pressed', isPreview ? 'true' : 'false'); canvasPreviewToggle.textContent = isPreview ? 'Editor' : 'Preview'; }
    if (isPreview) refreshCanvasPreview();
  }

  window.addEventListener('resize', function(){ if (workspaceEl && workspaceEl.classList.contains('canvas-open')) setCanvasView(canvasState.view || 'editor'); });

  function refreshCanvasPreview() {
    if (!canvasPreviewFrame) return;
    const lang = canvasState.lang || 'text';
    const content = canvasEditor ? canvasEditor.value : '';
    const type = detectPreviewType(lang, content);
    canvasState.previewType = type;
    if (previewStatus) {
      previewStatus.textContent = 'Preview: ' + String(type || 'text').toUpperCase();
    }
    canvasPreviewFrame.srcdoc = buildPreviewDoc(lang, content);
  }

  function openCanvas(content, lang, title) {
    if (!workspaceEl || !canvasPanel) return;
    const safeLang = (lang || 'text').toLowerCase();
    canvasState = { title: title || 'Canvas', lang: safeLang, ext: extForLang(safeLang), view: 'editor' };
    if (canvasTitle) canvasTitle.textContent = canvasState.title;
    if (canvasLang) canvasLang.textContent = safeLang;
    if (canvasEditor) canvasEditor.value = content || '';
    workspaceEl.classList.add('canvas-open');
    canvasPanel.setAttribute('aria-hidden', 'false');
    setCanvasView('editor');
    refreshCanvasPreview();
    if (isNarrow && isNarrow()) {
      try { canvasEditor && canvasEditor.focus(); } catch(e) {}
    }
  }

  function closeCanvas() {
    if (!workspaceEl || !canvasPanel) return;
    workspaceEl.classList.remove('canvas-open');
    canvasPanel.setAttribute('aria-hidden', 'true');
  }

  function downloadCanvas() {
    if (!canvasEditor) return;
    const content = canvasEditor.value || '';
    const name = (canvasState.title || 'canvas').toLowerCase().replace(/[^a-z0-9\-_.]+/g, '-').replace(/^-+|-+$/g,'') || 'canvas';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.' + (canvasState.ext || 'txt');
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 0);
  }

  if (canvasClose) canvasClose.addEventListener('click', closeCanvas);
  if (canvasCopy) canvasCopy.addEventListener('click', function(){ copyToClipboard(canvasEditor ? canvasEditor.value : '', canvasCopy); });
  if (canvasDownload) canvasDownload.addEventListener('click', downloadCanvas);
  if (canvasTabEditor) canvasTabEditor.addEventListener('click', function(){ setCanvasView('editor'); });
  if (canvasTabPreview) canvasTabPreview.addEventListener('click', function(){ setCanvasView('preview'); });
  if (canvasPreviewToggle) canvasPreviewToggle.addEventListener('click', function(){ setCanvasView(canvasState.view === 'preview' ? 'editor' : 'preview'); });
  if (canvasRefreshPreview) canvasRefreshPreview.addEventListener('click', refreshCanvasPreview);
  if (canvasEditor) canvasEditor.addEventListener('input', function(){ if (isSplitCanvas() || canvasState.view === 'preview') refreshCanvasPreview(); });

  // Event delegation for code block actions
  if (messagesEl) {
    messagesEl.addEventListener('click', function (e) {
      const copyBtn = e.target.closest('[data-action="copy-code"]');
      if (copyBtn) {
        const block = copyBtn.closest('.code-block');
        if (!block) return;
        const codeEl = block.querySelector('code') || block.querySelector('pre');
        const text = codeEl ? codeEl.textContent : '';
        copyToClipboard(text, copyBtn);
        return;
      }
      const runBtn = e.target.closest('[data-action="run-code"]');
      if (runBtn) {
        const block = runBtn.closest('.code-block');
        if (!block) return;
        const codeEl = block.querySelector('code') || block.querySelector('pre');
        const text = codeEl ? codeEl.textContent : '';
        const lang = block.getAttribute('data-lang') || 'text';
        openCanvas(text, lang, 'Run - ' + lang);
        setCanvasView('preview');
        return;
      }
      const openBtn = e.target.closest('[data-action="open-canvas"]');
      if (openBtn) {
        const block = openBtn.closest('.code-block');
        if (!block) return;
        const codeEl = block.querySelector('code') || block.querySelector('pre');
        const text = codeEl ? codeEl.textContent : '';
        const lang = block.getAttribute('data-lang') || 'text';
        openCanvas(text, lang, 'Canvas - ' + lang);
        return;
      }
    });
  }

  // Setel mode media (gambar/video) dan tampilkan status pada tombol.
  function setMediaMode(mode) {
    // simpan pilihan dropdown dari mode sebelumnya
    if (model) {
      if (mediaMode === 'image' || mediaMode === 'video') {
        imageModelSelection = model.value || imageModelSelection || 'auto';
        appSettings.imageModel = imageModelSelection;
        imageModel = imageModelSelection;
      } else {
        chatModelSelection = model.value || chatModelSelection || 'semua';
      }
    }

    mediaMode = mode;

    if (mediaImageBtn) {
      mediaImageBtn.classList.toggle('active', mode === 'image');
      mediaImageBtn.setAttribute('aria-pressed', mode === 'image' ? 'true' : 'false');
    }
    if (mediaVideoBtn) {
      mediaVideoBtn.classList.toggle('active', mode === 'video');
      mediaVideoBtn.setAttribute('aria-pressed', mode === 'video' ? 'true' : 'false');
    }
    mediaChips.forEach(function (chip) {
      const on = chip.getAttribute('data-media') === mode;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    populateModelDropdownForMode();

    const ph = mode === 'image'
      ? 'Tulis deskripsi gambar (mis. kucing memakai topi astronot).'
      : mode === 'video'
        ? 'Tulis deskripsi ilustrasi video.'
        : 'Tanya apa saja ke Marbel AI. (Enter kirim, Shift+Enter baris baru)';
    if (input) input.placeholder = ph;
    if (input) input.focus();
  }
  // Bangun kartu media di dalam pesan assistant.
  // Kedua mode berakhir pada gambar dari a0.dev: mode gambar menampilkannya
  // statis, mode video menampilkannya dengan animasi Ken Burns karena tidak ada
  // provider gratis yang menyajikan video dari URL GET. Kegagalan dideteksi via
  // event onload/onerror pada elemen <img>.
  function createMediaCard(kind, prompt, url, onStateChange, mediaObj) {
    const isImg = kind === 'image';
    const label = isImg ? 'Membuat gambar…' : 'Membuat ilustrasi video…';
    const urls = (mediaObj && Array.isArray(mediaObj.urls) && mediaObj.urls.length) ? mediaObj.urls.slice() : [url];
    let urlIdx = Math.max(0, urls.indexOf(url));
    if (urlIdx < 0) urlIdx = 0;
    let currentUrl = urls[urlIdx] || url;
    if (mediaObj) { mediaObj.url = currentUrl; mediaObj.urls = urls; }

    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML =
      '<div class="media-head"><span class="media-ico">' + (isImg ? '🎨' : '🎬') + '</span><span class="media-label">' + label + '</span></div>' +
      '<div class="media-body">' +
      '<div class="media-skel"><span class="media-spin"></span><span class="media-loading">' + label + '</span></div>' +
      '<div class="media-err" style="display:none">' +
      '<span class="media-err-tx">Gagal memuat gambar. Provider mungkin sedang sibuk.</span>' +
      '<button type="button" class="m-act retry-media">Coba lagi</button>' +
      '</div>' +
      (isImg
        ? '<a class="media-thumb" href="' + currentUrl + '" target="_blank" rel="noopener" style="display:none"><img class="media-img" src="' + currentUrl + '" alt="' + esc(prompt) + '" /></a>'
        : '<div class="media-burns-wrap" style="display:none"><img class="media-burns" src="' + currentUrl + '" alt="' + esc(prompt) + '" /></div>') +
      '</div>' +
      '<div class="media-caption">' + esc(prompt) + '</div>' +
      '<div class="media-actions">' +
      '<a class="m-act link" href="' + currentUrl + '" target="_blank" rel="noopener" style="display:none">Buka gambar</a>' +
      '</div>';

    const skel = card.querySelector('.media-skel');
    const errBox = card.querySelector('.media-err');
    const retryBtn = card.querySelector('.retry-media');
    const thumb = card.querySelector('.media-thumb');
    const burnsWrap = card.querySelector('.media-burns-wrap');
    const link = card.querySelector('.link');
    const lblEl = card.querySelector('.media-label');
    const img = card.querySelector(isImg ? '.media-img' : '.media-burns');
    let done = false;
    let loadTimer = null;
    let totalTimer = null;

    const showStates = function (result) {
      if (skel) skel.style.display = result === 'loading' ? '' : 'none';
      if (errBox) errBox.style.display = result === 'err' ? '' : 'none';
      if (thumb) thumb.style.display = result === 'ok' ? '' : 'none';
      if (burnsWrap) burnsWrap.style.display = result === 'ok' ? '' : 'none';
      if (link) link.style.display = result === 'loading' ? 'none' : '';
      if (!lblEl) return;
      if (result === 'ok') lblEl.textContent = isImg ? 'Gambar siap' : 'Ilustrasi video siap';
      else if (result === 'err') lblEl.textContent = isImg ? 'Gambar gagal' : 'Ilustrasi gagal';
      else lblEl.textContent = label;
    };

    const setCurrentUrl = function (u) {
      currentUrl = u;
      if (mediaObj) mediaObj.url = u;
      if (thumb) thumb.href = u;
      if (link) link.href = u;
      img.src = u;
    };

    let staggerTimer = null;
    let probes = [];

    const clearTimers = function () {
      if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
      if (staggerTimer) { clearTimeout(staggerTimer); staggerTimer = null; }
      if (totalTimer) { clearTimeout(totalTimer); totalTimer = null; }
      probes.forEach(function (p) { try { p.onload = null; p.onerror = null; p.src = ''; } catch(e){} });
      probes = [];
    };

    const showResult = function (ok) {
      if (done) return;
      done = true;
      clearTimers();
      showStates(ok ? 'ok' : 'err');
      if (onStateChange) onStateChange(ok);
    };

    const tryIndex = function (idx) {
      if (done) return;
      if (idx >= urls.length) {
        showResult(false);
        const txt = card.querySelector('.media-err-tx');
        if (txt) txt.textContent = 'Proses terlalu lama atau provider sibuk. Coba lagi.';
        return;
      }
      urlIdx = idx;
      setCurrentUrl(urls[urlIdx]);
      scheduleAttempt();
    };

    const preloadProbe = function (idx) {
      if (done || idx >= urls.length) return;
      // jangan duplikasi probe untuk index yang sama
      for (let i = 0; i < probes.length; i++) { if (probes[i]._idx === idx) return; }
      const probe = new Image();
      probe._idx = idx;
      probes.push(probe);
      probe.onload = function () {
        if (done) return;
        // kandidat alternatif lebih cepat siap: pakai ini
        tryIndex(idx);
        showResult(true);
      };
      probe.onerror = function () { /* abaikan, alur utama yang menentukan */ };
      probe.src = urls[idx];
    };

    const scheduleAttempt = function () {
      if (loadTimer) clearTimeout(loadTimer);
      if (staggerTimer) clearTimeout(staggerTimer);

      // Balapan paralel sejak awal: preload beberapa kandidat teratas agar yang tercepat menang.
      for (let i = urlIdx + 1; i < urls.length && i <= urlIdx + 4; i++) preloadProbe(i);

      // Cadangan: jika masih lambat, tambah probe kandidat berikutnya.
      staggerTimer = setTimeout(function () {
        if (done) return;
        for (let i = urlIdx + 5; i < urls.length && i <= urlIdx + 6; i++) preloadProbe(i);
      }, 4000);

      loadTimer = setTimeout(function () {
        if (done) return;
        if (urlIdx + 1 < urls.length) {
          tryIndex(urlIdx + 1);
          return;
        }
        showResult(false);
        const txt = card.querySelector('.media-err-tx');
        if (txt) txt.textContent = 'Proses terlalu lama atau provider sibuk. Coba lagi.';
      }, 12000);
    };

    totalTimer = setTimeout(function () {
      if (done) return;
      showResult(false);
      const txt = card.querySelector('.media-err-tx');
      if (txt) txt.textContent = 'Tidak ada hasil dalam waktu lama. Semua provider gagal/sibuk. Coba lagi.';
    }, 90000);

    scheduleAttempt();

    img.addEventListener('load', function () { showResult(true); });
    img.addEventListener('error', function () {
      if (done) return;
      if (urlIdx + 1 < urls.length) {
        tryIndex(urlIdx + 1);
        return;
      }
      showResult(false);
    });

    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        const gen = (mediaObj && mediaObj.genPrompt) ? mediaObj.genPrompt : prompt;
        const newUrls = buildImageUrls(gen, null, kind);
        urls.length = 0;
        Array.prototype.push.apply(urls, newUrls);
        urlIdx = 0;
        if (mediaObj) { mediaObj.urls = urls.slice(); mediaObj.url = urls[0]; }
        done = false;
        showStates('loading');
        tryIndex(0);
      });
    }

    return card;
  }

  // Muat ulang isi media ke elemen pesan (dipakai saat pindah thread).
  function renderMediaInto(msgEl, media) {
    if (!media || !msgEl) return;
    msgEl.inner.innerHTML = '';
    msgEl.inner.appendChild(createMediaCard(media.kind, media.prompt, media.url, null, media));
    if (msgEl.tag) {
      msgEl.tag.querySelector('.model-tag').textContent = media.kind === 'image' ? ' · Gambar' : ' · Ilustrasi';
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // Ulangi: tulis ulang pesan assistant terakhir pada thread aktif.
  async function regenerate(itemIdx, inner, tag, actions) {
    if (busy) return;
    const current = history.find(function (h) { return h.id === threadId; });
    if (!current) return;

    // Fallback: tanpa index, pakai jawaban assistant terakhir.
    if (itemIdx == null || itemIdx < 0 || !current.items[itemIdx]) {
      itemIdx = -1;
      for (let i = current.items.length - 1; i >= 0; i--) {
        if (current.items[i].role === 'assistant') { itemIdx = i; break; }
      }
    }
    if (itemIdx < 0) return;

    // Hanya jawaban terakhir yang boleh diulang. Kalau sudah ada pesan user
    // sesudahnya, jawaban ini bukan lagi ujung percakapan — mengulangnya akan
    // menimpa konteks yang sudah berjalan.
    const hasUserAfter = current.items.some(function (i, i2) {
      return i2 > itemIdx && i.role === 'user';
    });
    if (hasUserAfter) {
      setStatus('err', 'hanya jawaban terakhir yang bisa diulang');
      return;
    }
    const hasUserBefore = current.items.some(function (i, i2) {
      return i2 < itemIdx && i.role === 'user';
    });
    if (!hasUserBefore) return;

    busy = true;
    sendBtn.disabled = true;
    updateSendState();
    activeBadge.classList.add('show');
    setStatus('on', 'mengulangi jawaban…');
    inner.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    actions.style.display = 'none';

    try {
      // Jawaban lama dibuang dari konteks, kalau tidak model hanya menyalinnya.
      const msgs = buildThreadHistory(itemIdx);
      const built = await chatAnswer(msgs, model.value);
      const finalText = built.content;
      inner.innerHTML = decorateText(finalText);
      current.items[itemIdx] = { role: 'assistant', content: finalText, model: built.modelId };
      setStatus('on', 'terhubung');
    } catch (err) {
      inner.innerHTML = decorateText('Terjadi kesalahan saat mengulangi jawaban.\nDetail: ' + err.message);
      tag.querySelector('.model-tag').textContent = '';
      setStatus('err', 'gagal');
    } finally {
      actions.style.display = '';
      busy = false;
      updateSendState();
      activeBadge.classList.remove('show');
      updateThreadList();
      scrollDown();
    }
  }

  function typingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    const tag = document.createElement('div');
    tag.className = 'role-tag';
    tag.innerHTML = '<span class="agent-dot" aria-hidden="true"><svg class="robot-ico" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="7" width="14" height="11" rx="3" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.7"/><path d="M12 4v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="3.2" r="1.1" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><path d="M9 15.2c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 11v3M20 11v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><span>Marbel AI</span>';
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    wrap.appendChild(tag);
    wrap.appendChild(body);
    messagesEl.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  let scrollTimeout;
  function scrollDown() {
    // Throttle scroll untuk mencegah lag saat streaming
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(function() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      scrollTimeout = null;
    }, 50);
  }

  let toastEl = null;
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg || '';
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl && toastEl.classList.remove('show'); }, 1800);
  }

  function updateSendState() {
    if (!sendBtn || !input) return;
    const hasText = (input.value || '').trim().length > 0;
    sendBtn.disabled = busy ? true : !hasText;
  }

  function setFileStatus(text, type) {
    if (!fileStatus) return;
    fileStatus.textContent = text || '';
    fileStatus.className = 'file-status' + (type ? ' ' + type : '');
  }

  function showChat() {
    welcomeEl.style.display = 'none';
  }

  function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderWelcome() {
    if (!welcomeEl || !welcomeSuggest) return;
    const greetings = [
      { grad: 'Halo,', dim: 'Apa yang ingin Anda buat hari ini?', sub: 'Chat, buat gambar, atau ilustrasi video. Buka <strong>Files</strong>, <strong>Terminal</strong>, atau <strong>Browser</strong> untuk workspace side-by-side.' },
      { grad: 'Selamat datang,', dim: 'Mau mulai dari ide apa sekarang?', sub: 'Saya bisa membantu menulis, ngoding, membuat gambar, atau merapikan ide Anda. Pilih salah satu rekomendasi cepat di bawah.' },
      { grad: 'Hai!', dim: 'Ada yang bisa saya bantu wujudkan?', sub: 'Coba mulai dengan obrolan, generate gambar, atau ilustrasi video. Rekomendasi di bawah bisa langsung Anda pakai.' },
      { grad: 'Siap berkarya,', dim: 'Apa target Anda hari ini?', sub: 'Dari brainstorming sampai eksekusi—chat, gambar, dan workspace tools siap dipakai dalam satu tempat.' }
    ];
    const promptSets = [
      [
        { type: 'prompt', text: 'Bantu saya membuat rencana belajar JavaScript', prompt: 'Bantu saya membuat rencana belajar JavaScript selama 4 minggu untuk pemula.' },
        { type: 'image', text: 'Buat gambar kucing oranye memakai kacamata hitam' },
        { type: 'prompt', text: 'AI chatbot yang memberikan rekomendasi', prompt: 'Kamu adalah AI chatbot yang memberikan rekomendasi. Rekomendasikan 5 film seru untuk ditonton akhir pekan ini beserta alasan singkatnya.' }
      ],
      [
        { type: 'prompt', text: 'Jelaskan cara kerja API dengan contoh sederhana', prompt: 'Jelaskan cara kerja API dengan analogi sederhana dan contoh praktis.' },
        { type: 'prompt', text: 'Buatkan landing page HTML sederhana', prompt: 'Buatkan kode HTML dan CSS untuk landing page produk sederhana yang modern dan responsif.' },
        { type: 'video', text: 'Buat ilustrasi video kota futuristik di malam hari' }
      ],
      [
        { type: 'prompt', text: 'Ringkas teks panjang menjadi poin-poin penting', prompt: 'Saya akan kirim teks panjang, bantu ringkas menjadi poin-poin penting yang mudah dipahami.' },
        { type: 'image', text: 'Buat gambar poster event musik bergaya retro' },
        { type: 'prompt', text: 'Bantu debug error JavaScript saya', prompt: 'Bantu saya debug error JavaScript ini. Jelaskan penyebabnya dan berikan perbaikannya: ' }
      ],
      [
        { type: 'prompt', text: 'Susun itinerary liburan 3 hari di Bandung', prompt: 'Buatkan itinerary liburan 3 hari di Bandung untuk 2 orang dengan budget menengah.' },
        { type: 'video', text: 'Buat ilustrasi video pemandangan gunung saat sunrise' },
        { type: 'prompt', text: 'Buat prompt gambar untuk logo kafe minimalis', prompt: 'Buatkan 5 ide prompt gambar untuk logo kafe minimalis dengan nuansa hangat.' }
      ]
    ];
    const g = greetings[Math.floor(Math.random() * greetings.length)];
    const cards = promptSets[Math.floor(Math.random() * promptSets.length)];
    if (welcomeTitle) welcomeTitle.innerHTML = '<span class="grad">' + g.grad + '</span><br><span class="dim">' + g.dim + '</span>';
    if (welcomeSub) welcomeSub.innerHTML = g.sub;

    const iconPrompt = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>';
    const iconImage = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M20 15l-5-5-8 8"/></svg>';
    const iconVideo = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="14" height="14" rx="3"/><path d="M16.5 10.5l5-3v9l-5-3z"/></svg>';

    welcomeSuggest.innerHTML = cards.map(function(card) {
      if (card.type === 'image' || card.type === 'video') {
        const isImg = card.type === 'image';
        return '<button type="button" class="suggest-card media-chip" data-media="' + card.type + '" data-prompt="' + escAttr(card.prompt || card.text) + '" role="listitem" aria-pressed="false">' +
          '<span class="sc-text">' + esc(card.text) + '</span>' +
          '<span class="sc-ico" aria-hidden="true">' + (isImg ? iconImage : iconVideo) + '</span>' +
        '</button>';
      }
      return '<button type="button" class="suggest-card" data-prompt="' + escAttr(card.prompt || card.text) + '" role="listitem">' +
        '<span class="sc-text">' + esc(card.text) + '</span>' +
        '<span class="sc-ico" aria-hidden="true">' + iconPrompt + '</span>' +
      '</button>';
    }).join('');

    Array.prototype.slice.call(welcomeSuggest.querySelectorAll('.suggest-card')).forEach(function (card) {
      card.addEventListener('click', function () {
        const media = card.getAttribute('data-media');
        const prompt = card.getAttribute('data-prompt') || card.querySelector('.sc-text') && card.querySelector('.sc-text').textContent || '';
        if (media) {
          setMediaMode(mediaMode === media ? '' : media);
          input.value = prompt;
          resize();
          updateSendState();
          input.focus();
          return;
        }
        setMediaMode('');
        input.value = prompt;
        resize();
        updateSendState();
        input.focus();
        onSend();
      });
    });
  }

// Konfigurasi Model - sumber: https://github.com/zebbern/no-cost-ai
// Model gratis yang aktif lewat backend/direct:
//  - uncloseai (hermes.ai.unturf.com & qwen.ai.unturf.com) - Qwen 3.8 27B gratis, tanpa API key.
//  - Free.ai (api.free.ai) - model open-weight gratis tanpa API key.
// Model dipanggil via /api/chat (proxy) atau langsung (mode direct/CORS).
const FREE_MODELS = [
  'qwen3.8-27b',
  'gpt-oss-20b',
  'qwen3-8b',
  'mistral',
  'llama',
  'gemma',
  'deepseek',
];

// Konfigurasi model upstream (dipakai pada mode langsung, mis. GitHub Pages/file).
// Provider CORS yang dipakai langsung dari browser tanpa backend proxy:
//  - uncloseai (hermes.ai.unturf.com, qwen.ai.unturf.com) - CORS '*' aktif.
//  - Pollinations (text.pollinations.ai) - CORS '*', OpenAI-compatible (/openai).
//  - Free.ai (api.free.ai) - CORS origin dicerminkan, hanya model self-hosted.
// Model UI dipetakan ke nama model yang dikenal tiap upstream (mirip UPSTREAM_MODEL_MAP server).
const DIRECT_UPSTREAMS = [
  'https://hermes.ai.unturf.com',
  'https://qwen.ai.unturf.com',
  'https://text.pollinations.ai',
  'https://api.free.ai',
];
const DIRECT_PAYLOAD = {
  'https://hermes.ai.unturf.com': { chat_template_kwargs: { enable_thinking: false } },
  'https://qwen.ai.unturf.com': { chat_template_kwargs: { enable_thinking: false } },
  'https://text.pollinations.ai': {},
  'https://api.free.ai': {},
};
// uncloseai kini hanya melayani satu model: turboderp/Qwen3.8-27B-exl3.
// free.ai hanya qwen7b/qwen3-8b.
const UNCLOSEAI_MODEL = 'turboderp/Qwen3.8-27B-exl3';
const DIRECT_MODEL_MAP = {
  'https://hermes.ai.unturf.com': {
    'qwen3.8-27b': UNCLOSEAI_MODEL,
    'gpt-oss-20b': UNCLOSEAI_MODEL,
    'qwen3-8b': UNCLOSEAI_MODEL,
    'mistral': UNCLOSEAI_MODEL,
    'llama': UNCLOSEAI_MODEL,
    'gemma': UNCLOSEAI_MODEL,
    'deepseek': UNCLOSEAI_MODEL,
  },
  'https://qwen.ai.unturf.com': {
    'qwen3.8-27b': UNCLOSEAI_MODEL,
    'gpt-oss-20b': UNCLOSEAI_MODEL,
    'qwen3-8b': UNCLOSEAI_MODEL,
    'mistral': UNCLOSEAI_MODEL,
    'llama': UNCLOSEAI_MODEL,
    'gemma': UNCLOSEAI_MODEL,
    'deepseek': UNCLOSEAI_MODEL,
  },
  'https://text.pollinations.ai': {
    'qwen3.8-27b': 'openai',
    'gpt-oss-20b': 'openai',
    'qwen3-8b': 'openai',
    'mistral': 'openai',
    'llama': 'openai',
    'gemma': 'openai',
    'deepseek': 'openai',
  },
  'https://api.free.ai': {
    'qwen3.8-27b': 'qwen7b',
    'gpt-oss-20b': 'qwen7b',
    'qwen3-8b': 'qwen3-8b',
    'mistral': 'qwen7b',
    'llama': 'qwen3-8b',
    'gemma': 'qwen3-8b',
    'deepseek': 'qwen3-8b',
  },
};
function directChatUrl(base) {
  const b = base.replace(/\/$/, '');
  if (b === 'https://text.pollinations.ai') return b + '/openai';
  return b + '/v1/chat/completions';
}
function directChat(messages, model) {
  const baseError = [];
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  // Failover berurutan: coba tiap upstream sampai ada yang berhasil.
  const tryFrom = function (idx) {
    const base = DIRECT_UPSTREAMS[idx];
    if (!base) {
      const joined = baseError.join(' | ') || 'Semua upstream gagal.';
      return Promise.reject(new Error(joined));
    }
    const url = directChatUrl(base);
    const upModel = (DIRECT_MODEL_MAP[base] && DIRECT_MODEL_MAP[base][model]) || model;
    const payload = Object.assign({}, DIRECT_PAYLOAD[base] || {}, {
      model: upModel,
      messages: messages,
      stream: false,
    });
    const headers = { 'content-type': 'application/json' };
    const attempt = function (retry) {
      const hardT = withTimeout(fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      }), AI_TIMEOUT_MS);
      return hardT.then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            const msg = t || '';
            const err = new Error('HTTP ' + res.status + (msg ? ': ' + msg.slice(0, 120) : ''));
            const isRate = res.status === 429 || /rate.?limit|too many requests|1 request per second/i.test(msg);
            const isQuota = /FREE_LIMIT|daily limit|quota|insufficient/i.test(msg);
            if (isRate && !isQuota && retry < 2) {
              const d = 2000 + (retry * 3000);
              return sleep(d).then(function () { return attempt(retry + 1); });
            }
            throw err;
          });
        }
        return res.json();
      }).then(function (data) {
        if (data && data.error) {
          const eMsg = String(data.error.message || data.error || 'Upstream error');
          const isRate = /rate.?limit|429|too many requests|1 request per second/i.test(eMsg);
          const isQuota = /FREE_LIMIT|daily limit|quota|insufficient/i.test(eMsg);
          if (isRate && !isQuota && retry < 2) {
            const d = 2000 + (retry * 3000);
            return sleep(d).then(function () { return attempt(retry + 1); });
          }
          throw new Error(eMsg);
        }
        let text = '';
        if (data && data.choices && data.choices[0]) {
          const c = data.choices[0].message || {};
          text = c.content || c.reasoning_content || '';
        }
        if (typeof data === 'string') text = data;
        if (!text) throw new Error('Model tanpa isi');
        return { text: text, realModel: (data && data.model) || model };
      });
    };
    return attempt(0).catch(function (err) {
      baseError.push(base + ' -> ' + err.message);
      // jeda singkat sebelum pindah upstream untuk menghindari 1 req/s global
      return sleep(700).then(function () { return tryFrom(idx + 1); });
    });
  };
  return tryFrom(0);
}
// Backend proxy.
//  - Bila halaman disajikan oleh server.js (host kerja/Render/Railway/Docker),
//    pakai origin yang sama (relative: '' → /api/chat).
//  - Bila halaman statis di GitHub Pages atau dibungkus sebagai aplikasi
//    Android (Capacitor), panggil provider langsung dari browser (CORS) —
//    tanpa perlu backend terpisah → tetap berjalan 24/7.
//    Tetap bisa dioverride dengan ?frontend=URL agar memakai proxy sendiri.
const isGitHubPages = window.location.hostname.indexOf('github.io') !== -1;
// Capacitor menyajikan aset dari https://localhost di dalam WebView native;
// origin itu tidak punya /api/chat, jadi aplikasi Android selalu mode langsung.
const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const DEFAULT_BACKEND = '';
const FALLBACK_BACKEND = '';
// Cadangan untuk aplikasi Android: proxy publik milik proyek ini. Dipakai hanya
// bila provider langsung menolak (mis. rate-limit per-IP), sehingga APK tetap
// berfungsi tanpa bergantung pada satu jalur saja.
const NATIVE_FALLBACK_BACKEND = 'https://marbel-ai.onrender.com';
const FRONTEND_OVERRIDE = new URLSearchParams(window.location.search).get('frontend');
let backendInUse = FRONTEND_OVERRIDE || DEFAULT_BACKEND;
const api = function (path) { return backendInUse + path; };

// Media generation (gambar & video).
//  - Gambar: a0.dev assets/image (gratis tanpa API key, CORS aktif, hasil WEBP).
//    URL yang dihasilkan dipakai langsung sebagai src <img>.
//  - Video : TIDAK ada provider gratis yang menyajikan video dari URL GET, jadi
//    kartu video memakai jalur "ilustrasi animasi": gambar dari a0.dev dengan
//    efek Ken Burns (lihat createMediaCard).
const IMAGE_ENDPOINT = 'https://api.a0.dev/assets/image';
const IMAGE_MODEL_OPTIONS = [
  { id: 'auto', label: 'Auto (a0.dev)' },
  { id: 'a0', label: 'a0.dev' }
];
const SETTINGS_KEY = 'marbel-settings-v1';
const defaultSettings = {
  theme: (localStorage.getItem('marbel-theme') || 'dark'),
  defaultModel: 'semua',
  imageAspect: '1:1',
  imageModel: 'auto',
  enhancePrompts: true,
  enterToSend: true
};
let appSettings = (function(){
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.assign({}, defaultSettings, parsed || {});
  } catch (e) {
    return Object.assign({}, defaultSettings);
  }
})();
let imageAspect = appSettings.imageAspect || '1:1';
let imageModel = appSettings.imageModel || 'auto';

function saveAppSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); } catch (e) {}
}

function enhanceImagePrompt(prompt, kind) {
  const base = String(prompt || '').trim();
  if (!base) return base;
  if (!appSettings.enhancePrompts) return base;
  // Keep enhancement short to avoid slowing generation, but reinforce accuracy
  let suffix = 'accurate to prompt, clear subject, detailed';
  if (kind === 'video') suffix = 'accurate to prompt, cinematic, clear details';
  return base + ', ' + suffix;
}

function imageDimsFromAspect(aspect) {
  const a = String(aspect || '1:1');
  if (a === '16:9') return { w: 1280, h: 720 };
  if (a === '9:16') return { w: 720, h: 1280 };
  if (a === '4:3') return { w: 1024, h: 768 };
  if (a === '3:4') return { w: 768, h: 1024 };
  return { w: 1024, h: 1024 };
}

function buildImageUrls(prompt, seed, kind) {
  const enhanced = enhanceImagePrompt(prompt, kind);
  const q = encodeURIComponent(enhanced);
  const s = (seed == null ? Math.floor(Math.random() * 100000) : seed);
  const aspect = imageAspect || '1:1';
  const a0Url = IMAGE_ENDPOINT + '?text=' + q + '&aspect=' + encodeURIComponent(aspect) + '&seed=' + s;
  return [a0Url];
}

function buildImageUrl(prompt, seed, kind) {
  const urls = buildImageUrls(prompt, seed, kind);
  return urls[0];
}

const AI_TIMEOUT_MS = 60000;
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (resolveTimeout) {
      setTimeout(function () {
        const msg = 'Waktu tunggu habis (' + Math.round(ms / 1000) + ' detik). Silakan coba lagi.';
        resolveTimeout(new Error(msg));
      }, ms);
    }),
  ]);
}

// Pilih backend yang sehat: coba yang aktif, gagal → cadangan.
// Pada mode langsung (tanpa backend), tidak melakukan apa-apa.
async function ensureBackend() {
  return;
}

// Ambil jawaban lengkap dari backend proxy (OpenAI-compatible /api/chat).
// Kalau model tak dikenal upstream, server mengisi default; klien tetap
// mengirim model agar info di tag jawaban akurat.
async function backendChat(messages, model, baseOverride) {
  await ensureBackend();
  const res = await withTimeout(fetch((baseOverride || backendInUse) + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: model, messages: messages, stream: false }),
  }), AI_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text().catch(function () { return ''; });
    let detail = text || '';
    try {
      const j = JSON.parse(text);
      detail = (j && (j.error && (j.error.message || j.error) || j.message || j.detail)) || detail;
    } catch (e) {}
    const msg = String(detail || '').trim();
    throw new Error('HTTP ' + res.status + (msg ? ': ' + msg.slice(0, 160) : ''));
  }
  const data = await res.json().catch(function () { throw new Error('Respons bukan JSON'); });
  if (data.error) throw new Error(data.error.message || data.error || 'Upstream error');
  let text = '';
  if (data.choices && data.choices[0]) {
    const c = data.choices[0].message || {};
    text = c.content || c.reasoning_content || '';
  }
  if (typeof data === 'string') text = data;
  if (!text) throw new Error('Model tanpa isi');
  return { text: text, realModel: data.model || model };
}

// Kembalikan {text, realModel}. Pada GitHub Pages / aplikasi Android / file lokal (tanpa
// override frontend) provider dipanggil langsung (CORS); pada aplikasi Android
// proxy cadangan ditambahkan sebagai jaring pengaman bila provider menolak.
// Jika backend lokal tidak tersedia (mis. dibuka sebagai file statis atau server mati),
// otomatis fallback ke mode langsung.
async function modelChat(messages, model) {
  const errs = [];
  const attempts = [];
  const isLocalFile = window.location.protocol === 'file:';
  const useDirect = (isGitHubPages || isNativeApp || isLocalFile) && !FRONTEND_OVERRIDE;
  if (useDirect) {
    attempts.push({ label: 'Langsung', run: function () { return directChat(messages, model); } });
    if (isNativeApp) {
      attempts.push({
        label: 'Cadangan',
        run: function () { return backendChat(messages, model, NATIVE_FALLBACK_BACKEND); },
      });
    }
  } else {
    attempts.push({ label: 'Backend', run: function () { return backendChat(messages, model); } });
    attempts.push({ label: 'Langsung', run: function () { return directChat(messages, model); } });
  }
  for (const attempt of attempts) {
    try {
      return await attempt.run();
    } catch (err) {
      errs.push(attempt.label + ': ' + err.message);
    }
  }
  throw new Error(errs.join(' | ') || 'Semua jalur gagal.');
}


  // Ulangi operasi sampai berhasil memberikan respons (kesalahan server/jaringan).
  // Jeda antar percobaan bertingkat: 1s, 2s, 3s… maksimum 5 detik.
  async function retryUntilResponse(fn, label) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt >= 3) throw err;
        const delay = Math.min(attempt, 5) * 1000;
        setStatusIcon('err');
        if (label) console.warn('[retry] ' + label + ' percobaan ke-' + attempt + ':', err.message);
        await new Promise(function (r) { setTimeout(r, delay); });
        setStatusIcon('on');
      }
    }
  }


  // ==================== Modul chat (streaming & ensemble) ====================
  // Semua fungsi memakai `stream:false` (JSON biasa) untuk keandalan dengan
  // model gratis (yang kadang tidak stabil untuk SSE), lalu efek mengetik
  // disimulasikan di sisi klien agar tetap terasa responsif.

  // Kirim ke 1 model, tunggu jawaban lengkap, lalu beri efek mengetik.
  // Kesalahan server/jaringan diulang otomatis sampai dapat respons.
  async function streamChat(modelId, messages, onChunk) {
  setStatus('on', 'mencoba model: ' + modelId + '…');
  const out = await retryUntilResponse(function () {
    return modelChat(messages, modelId);
  }, 'chat ' + modelId);
  const fullText = out.text;
  const words = fullText.split(' ');
  for (let i = 1; i <= words.length; i++) {
    const partial = words.slice(0, i).join(' ');
    if (onChunk) onChunk(partial, modelId);
    await new Promise(function (r) { setTimeout(r, 16); });
  }
  return out;
}
  // Ambil jawaban lengkap dari 1 model (tanpa efek mengetik). Dipakai ensemble paralel.
  // Kesalahan diulang otomatis sampai model ini memberikan respons.
function runOneModel(modelId, messages) {
  setStatus('on', 'menghubungi ' + modelId + '…');
  return retryUntilResponse(function () {
    return modelChat(messages, modelId);
  }, 'ensemble ' + modelId);
}
  // Resolve dengan nilai pertama yang sukses di antara banyak Promise.
  // Semua model dijalankan paralel; yang paling cepat selesai & berhasil yang menang.
  function firstFulfilled(promises) {
    return new Promise(function (resolve, reject) {
      let pending = promises.length;
      if (pending === 0) { reject(new Error('Tidak ada model untuk dicoba.')); return; }
      let done = false;
      let lastErr = null;
      function onFulfill(value) {
        if (done) return;
        done = true;
        resolve(value);
      }
      function onReject(err) {
        lastErr = err;
        pending--;
        if (pending === 0 && !done) reject(lastErr || new Error('Semua model gagal.'));
      }
      promises.forEach(function (p) { p.then(onFulfill, onReject); });
    });
  }

  // Urutan model yang dicoba: model pilihan dulu (bila dipilih), sisanya gratis.
  function resolveModelOrder(selected) {
    const order = [];
    if (selected && selected !== 'semua') order.push(selected);
    FREE_MODELS.forEach(function (m) {
      if (order.indexOf(m) === -1) order.push(m);
    });
    return order;
  }

  // Pusat logika chat.
  //  - Mode "semua": jalankan semua model paralel, ambil jawaban lengkap pertama.
  //  - Mode single : coba model berurutan, failover ke cadangan saat 4xx/5xx/upstream.
  // Kembali dengan efek mengetik lalu resolve {content, modelId}.
  function typeOut(text, onChunk) {
    const words = text.split(' ');
    return (function step(i) {
      if (i > words.length) return;
      if (onChunk) onChunk(words.slice(0, i).join(' '));
      if (i < words.length) return new Promise(function (r) { setTimeout(function () { r(step(i + 1)); }, 1.4); });
    }(1));
  }

  function isNetworkError(err) {
    return err instanceof TypeError;
  }

  async function chatAnswer(messages, selected, onChunk) {
    const order = resolveModelOrder(selected);
    let first = null;
    if (selected === 'semua') {
      // Mode auto: jalankan SEMUA model paralel, jawaban lengkap tercepat yang menang.


      const jobs = order.map(function (m) {
        return runOneModel(m, messages).then(function (out) { return { modelId: out.realModel || m, content: out.text }; });
      });
      first = await firstFulfilled(jobs);
    } else {
      // Mode single: coba model pilihan dulu,, lalu failover berurutan ke cadangan
      // saat error 4xx/5xx/rate-limit/upstream. Error non-HTTP (NetworkError)
      // langsung gagal tanpa coba cadangan.



      for (let i = 0; i < order.length; i++) {
        const m = order[i];
        try {
          const out = await runOneModel(m, messages);
          first = { modelId: out.realModel || m, content: out.text };
          break;
        } catch (err) {
          if (isNetworkError(err)) throw err;
          if (i === order.length - 1) throw err;
        }
      }
    }
    await typeOut(first.content, function (p) { if (onChunk) onChunk(p, first.modelId); });
    return { content: first.content, modelId: first.modelId };
  }

  function buildThreadHistory(skipIndex) {
    let sysContent = 'Kamu adalah Marbel AI. Saat ditanya siapa kamu, jawab sebagai Marbel AI. Jawab dengan bahasa Indonesia. Jangan gunakan tabel Markdown, jangan gunakan karakter "|", "---", atau "*". Balas ringkas, jelas, dan tanpa hiasan berlebihan.';
    if (agentMode && agentMode.checked) {
      sysContent += '\n\nMode agent aktif. Kamu bisa menggunakan tools untuk menyelesaikan tugas. Jika perlu memakai tool, balas HANYA dengan satu blok:\n```tool\n{"tool":"list_dir|read_file|write_file|run_command","args":{...}}\n```\nTool tersedia: list_dir(path), read_file(path), write_file(path,content), run_command(command,cwd?). Setelah menerima hasil tool, lanjutkan langkah berikutnya atau berikan jawaban final tanpa blok tool.';
    }
    const systemMsg = { role: 'system', content: sysContent };
    const th = history.find(function (h) { return h.id === threadId; });
    if (!th) return [systemMsg];
    // Pesan media (gambar/video) tidak dikirim sebagai teks ke model chat.
    // skipIndex dipakai oleh "Ulangi": jawaban lama dibuang dari konteks supaya
    // model benar-benar menjawab ulang, bukan menyalin jawaban sebelumnya.
    const msgs = th.items.filter(function (i, idx) {
      return !i.media && idx !== skipIndex;
    }).map(function (i) {
      return { role: i.role, content: i.content };
    });
    msgs.unshift(systemMsg);
    return msgs;
  }

  function updateThreadList() {
    threadList.innerHTML = '';
    history.forEach(function (h) {
      const li = document.createElement('li');
      li.className = 'thread-item' + (h.id === threadId && !busy ? ' active' : '');
      const first = h.items.find(function (i) { return i.role === 'user'; });
      const name = (first ? first.content : 'Thread ' + h.id);
      li.innerHTML = '<span class="tid">#' + h.id + '</span><span class="tname">' + esc(name.slice(0, 40)) + '</span>';
      li.addEventListener('click', function () {
        if (window.innerWidth <= 768) layoutEl.classList.add('collapsed');
        loadThread(h.id);
      });
      threadList.appendChild(li);
    });
  }

  function newThread() {
    threadId = ++threadCount;
    history.push({ id: threadId, items: [] });
    messagesEl.innerHTML = '';
    welcomeEl.style.display = '';
    activeBadge.classList.remove('show');
    input.value = '';
    setMediaMode('');
    renderWelcome();
    resize();
    updateThreadList();
  }

  function loadThread(id) {
    const th = history.find(function (h) { return h.id === id; });
    if (!th || busy) return;
    threadId = id;
    messagesEl.innerHTML = '';
    welcomeEl.style.display = 'none';
    activeBadge.classList.remove('show');
    th.items.forEach(function (i) {
      if (i.role === 'user') addUserMessage(i.content);
      else if (i.media) {
        const msgEl = createAssistantMessage(i);
        renderMediaInto(msgEl, i.media);
        // Media tidak bisa diulang/di-copy sebagai teks.
        if (msgEl.actions) msgEl.actions.style.display = 'none';
      }
      else {
        const msgEl = createAssistantMessage(i);
        msgEl.inner.innerHTML = decorateText(i.content);
      }
    });
    updateThreadList();
    scrollDown();
  }

  function resize() {
    input.style.height = 'auto';
    input.style.height = Math.min(220, Math.max(48, input.scrollHeight)) + 'px';
  }

  function looksIndonesian(text) {
    const s = String(text || '');
    if (!s) return false;
    if (/[^\x00-\x7F]/.test(s)) return true; // accents/diacritics/unicode often present
    return /\b(dan|yang|dengan|untuk|sebuah|seekor|seorang|gambar|foto|ilustrasi|buatkan|tolong|di|ke|dari|pada|saat|malam|siang|pagi|sore|warna|bergaya|seperti|sedang|menggunakan|memakai|tanpa|dalam|atas|bawah|depan|belakang|kucing|anjing|orang|pemandangan|rumah|jalan|pantai|gunung|hutan|kota)\b/i.test(s);
  }

  async function translatePromptForImage(prompt, kind) {
    const original = String(prompt || '').trim();
    if (!original) return original;
    if (!looksIndonesian(original)) return original;
    try {
      const instruction = [
        'Convert the user request into a precise English image generation prompt.',
        'Keep every important visual detail exactly: subject, count, colors, clothing/accessories (e.g. sunglasses), actions/pose, expressions, setting/background, lighting, style, and composition.',
        'Do not omit or change attributes. Put key attributes early and explicitly.',
        'Return only the final prompt text, no quotes, no explanation.'
      ].join(' ');
      const out = await Promise.race([
        modelChat([
          { role: 'system', content: instruction },
          { role: 'user', content: original }
        ], model ? model.value : 'semua'),
        new Promise(function(_, reject){ setTimeout(function(){ reject(new Error('translate timeout')); }, 3500); })
      ]);
      let translated = (out && out.text ? String(out.text) : '').trim();
      translated = translated.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').replace(/^"|"$/g, '').replace(/^prompt:\s*/i, '').trim();
      if (!translated) return original;
      return translated;
    } catch (e) {
      return original;
    }
  }

  // Hasilkan URL gambar dari teks via a0.dev (gratis, tanpa API key).
  // Prompt diperkaya agar hasil lebih akurat dan sesuai permintaan.
  function generateImage(prompt, seed, kind) {
    return buildImageUrl(prompt, seed, kind);
  }

  async function onSend(rawText) {
    const text = (rawText != null ? rawText : input.value).trim();
    const mode = mediaMode;
    // Saat mode media aktif, text = prompt media; mode tidak memicu chat.
    if (!text || busy) return;

    if (history.length === 0) newThread();

    busy = true;
    sendBtn.disabled = true;
    showChat();
    activeBadge.classList.add('show');
    input.value = '';
    resize();
    updateSendState();
    setStatus('on', mode === 'image' ? 'membuat gambar…' : mode === 'video' ? 'membuat video…' : 'memproses…');

    const current = history.find(function (h) { return h.id === threadId; });
    if (!current) return;
    current.items.push({ role: 'user', content: text });
    addUserMessage(text);

    // Mode gambar/video: alur tanpa chat model. Keduanya memakai gambar
    // a0.dev; mode video menampilkannya sebagai ilustrasi beranimasi.
    if (mode === 'image' || mode === 'video') {
      setStatus('on', mode === 'image' ? 'membuat gambar…' : 'membuat ilustrasi…');
      setStatus('on', 'menyiapkan prompt gambar…');
      const promptForGen = await translatePromptForImage(text, mode);
      setStatus('on', mode === 'image' ? 'membuat gambar…' : 'membuat ilustrasi…');
      // sinkronkan model gambar dari dropdown composer (mode gambar/video)
      if (model && (mode === 'image' || mode === 'video')) {
        imageModelSelection = model.value || imageModelSelection || 'auto';
        appSettings.imageModel = imageModelSelection;
        imageModel = imageModelSelection;
      }
      const urls = buildImageUrls(promptForGen, null, mode);
      const url = urls[0];
      const cur = history.find(function (h) { return h.id === threadId; });
      if (!cur) return;
      const content = (mode === 'image' ? '[Gambar] ' : '[Ilustrasi video] ') + text;
      const item = { role: 'assistant', content: content, media: { kind: mode, prompt: text, genPrompt: promptForGen, url: url, urls: urls } };
      cur.items.push(item);
      const msgEl = createAssistantMessage(item);
      msgEl.inner.innerHTML = '';
      const card = createMediaCard(mode, text, url, function (ok) {
        setStatus(ok ? 'on' : 'err', ok ? 'terhubung' : 'gagal memuat media');
      }, item.media);
      msgEl.inner.appendChild(card);
      msgEl.tag.querySelector('.model-tag').textContent = mode === 'image' ? ' · Gambar' : ' · Ilustrasi';
      if (msgEl.actions) msgEl.actions.style.display = 'none';
      scrollDown();
      busy = false;
      activeBadge.classList.remove('show');
      setMediaMode('');
      updateThreadList();
      updateSendState();
      input.focus();
      return;
    }

    const typing = typingIndicator();
    const selected = model.value;

    try {
      typing.remove();
      // Item riwayat dibuat lebih dulu supaya tombol "Ulangi" punya rujukan
      // index yang stabil sejak awal streaming.
      const item = { role: 'assistant', content: '' };
      const itemIdx = current.items.length;
      current.items.push(item);
      const msgEls = createAssistantMessage(item);

      const renderChunk = function (partial) {
        msgEls.inner.innerHTML = decorateText(partial);
        scrollDown();
      };

      // itemIdx dibuang dari konteks: isinya masih kosong saat request dibuat.
      const built = await chatAnswer(buildThreadHistory(itemIdx), selected, renderChunk);
      let finalText = built.content;
      item.content = finalText;
      item.model = built.modelId;
      if (agentMode && agentMode.checked) {
        finalText = await maybeRunAgentLoop(finalText, msgEls, item, current, selected);
      }
      msgEls.inner.innerHTML = decorateText(finalText);
      item.content = finalText;
      if (msgEls.actions) msgEls.actions.style.display = '';
      setStatus('on', 'terhubung');
    } catch (err) {
      typing.remove();
      const msg = String(err && err.message || err || '');
      let friendly = 'Terjadi kesalahan saat menghubungi server.\nDetail: ' + msg + '\n\nSilakan coba lagi.';
      if (/401|403|public beta|api key|registration is closed|unauthorized|forbidden/i.test(msg)) {
        friendly = 'Layanan chat upstream saat ini tidak tersedia (butuh API key/akses ditutup) atau ditolak.\nDetail: ' + msg + '\n\nSaran: coba lagi nanti, ganti model, atau jalankan server lokal (`node server.js`) dengan upstream/API key sendiri via env (`UPSTREAM`, `API_KEY`). Fitur pembuatan gambar tetap bisa dicoba terpisah.';
      } else if (/402|429|daily limit|rate limit|quota|too many requests|FREE_LIMIT|insufficient|token/i.test(msg)) {
        friendly = 'Batas penggunaan/kuota server atau model tercapai.\nDetail: ' + msg + '\n\nSaran: tunggu beberapa saat lalu coba lagi, ganti model, atau gunakan server lokal Marbel AI (`node server.js`) dengan upstream/API key sendiri. Fitur pembuatan gambar tetap bisa dicoba terpisah.';
      } else if (/timeout|waktu tunggu habis|timed out/i.test(msg)) {
        friendly = 'Permintaan memakan waktu terlalu lama.\nDetail: ' + msg + '\n\nSilakan coba lagi. Jika membuat gambar, gunakan prompt lebih singkat atau nonaktifkan optimasi prompt di Pengaturan.';
      }
      const item = { role: 'assistant', content: friendly };
      current.items.push(item);

      const errEl = createAssistantMessage(item);
      errEl.wrap.classList.add('err');
      errEl.inner.innerHTML = decorateText(friendly);
      errEl.actions.style.display = 'none';

      setStatus('err', 'gagal');
      showToast(/401|403|402|429|daily limit|rate limit|quota|token/i.test(msg) ? 'Layanan/kuota tidak tersedia' : 'Gagal mengirim pesan');
    } finally {
      busy = false;
      activeBadge.classList.remove('show');
      updateThreadList();
      updateSendState();
      input.focus();
    }
  }
      

  form.addEventListener('submit', function (e) { e.preventDefault(); onSend(); });
  input.addEventListener('input', function(){ resize(); updateSendState(); });
  input.addEventListener('keydown', function (e) {
    if (appSettings.enterToSend === false) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSend(); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
  updateSendState();
  newThreadBtn.addEventListener('click', function () {
    if (window.innerWidth <= 768) layoutEl.classList.add('collapsed');
    newThread();
  });
  sideToggle.addEventListener('click', function () {
    layoutEl.classList.toggle('collapsed');
    syncSidebar();
  });

  const setTheme = function (theme) {
    const t = (theme === 'light') ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('marbel-theme', t);
    appSettings.theme = t;
    if (themeToggle) themeToggle.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  };

  setTheme(appSettings.theme || localStorage.getItem('marbel-theme') || 'dark');

  let themeDark = document.documentElement.dataset.theme === 'dark';
  themeToggle && themeToggle.setAttribute('aria-pressed', themeDark ? 'true' : 'false');
  themeToggle && themeToggle.addEventListener('click', function () {
    themeDark = !themeDark;
    setTheme(themeDark ? 'dark' : 'light');
    saveAppSettings();
    if (settingTheme) settingTheme.value = appSettings.theme;
  });

  panelHide.addEventListener('click', function () {
    layoutEl.classList.toggle('collapsed');
    syncSidebar();
  });
  if (mediaImageBtn) {
    mediaImageBtn.addEventListener('click', function () { setMediaMode(mediaMode === 'image' ? '' : 'image'); });
  }
  if (mediaVideoBtn) {
    mediaVideoBtn.addEventListener('click', function () { setMediaMode(mediaMode === 'video' ? '' : 'video'); });
  }

  // Chip media sambutan lama tidak dipakai (saran dirender dinamis). Media chips composer tetap aktif.

  // Kartu saran sambutan dirender dinamis oleh renderWelcome().
  renderWelcome();

  let chatModelSelection = appSettings.defaultModel || 'semua';
  let imageModelSelection = appSettings.imageModel || 'auto';

  function setSelectOptions(options, selectedValue) {
    if (!model) return;
    model.innerHTML = '';
    options.forEach(function (o) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      model.appendChild(opt);
    });
    const has = Array.prototype.some.call(model.options, function (o) { return o.value === selectedValue; });
    model.value = has ? selectedValue : (options[0] ? options[0].value : '');
  }

  function getChatModelOptions() {
    const opts = [{ value: 'semua', label: 'Auto Model (Tercepat)' }];
    FREE_MODELS.forEach(function (id) { opts.push({ value: id, label: id }); });
    return opts;
  }

  function getImageModelOptions() {
    return IMAGE_MODEL_OPTIONS.map(function (o) { return { value: o.id, label: o.label }; });
  }

  function populateModelDropdownForMode() {
    if (!model) return;
    if (mediaMode === 'image' || mediaMode === 'video') {
      setSelectOptions(getImageModelOptions(), imageModelSelection || appSettings.imageModel || 'auto');
    } else {
      setSelectOptions(getChatModelOptions(), chatModelSelection || appSettings.defaultModel || 'semua');
    }
  }

  function populateModelSelect(allIds, usableIds) {
    populateModelDropdownForMode();
  }

function loadModels() {
  populateModelSelect(FREE_MODELS, FREE_MODELS);
  if (model) {
    model.addEventListener('change', function () {
      if (mediaMode === 'image' || mediaMode === 'video') {
        imageModelSelection = model.value || 'auto';
        appSettings.imageModel = imageModelSelection;
        imageModel = imageModelSelection;
      } else {
        chatModelSelection = model.value || 'semua';
      }
    });
  }
  setStatus('on', 'terhubung');
}

  // ---- Settings ----
  function syncSettingsForm() {
    if (settingTheme) settingTheme.value = appSettings.theme || 'dark';
    if (settingDefaultModel) settingDefaultModel.value = appSettings.defaultModel || 'semua';
    if (settingImageAspect) settingImageAspect.value = appSettings.imageAspect || '1:1';
    if (settingImageModel) settingImageModel.value = appSettings.imageModel || 'auto';
    if (settingEnhancePrompts) settingEnhancePrompts.checked = appSettings.enhancePrompts !== false;
    if (settingEnterSend) settingEnterSend.value = appSettings.enterToSend === false ? 'newline' : 'send';
  }
  function openSettings() {
    syncSettingsForm();
    if (settingsOverlay) { settingsOverlay.classList.add('show'); settingsOverlay.setAttribute('aria-hidden', 'false'); }
  }
  function closeSettings() {
    if (settingsOverlay) { settingsOverlay.classList.remove('show'); settingsOverlay.setAttribute('aria-hidden', 'true'); }
  }
  function applySettingsFromForm() {
    appSettings.theme = settingTheme ? settingTheme.value : (appSettings.theme || 'dark');
    appSettings.defaultModel = settingDefaultModel ? settingDefaultModel.value : (appSettings.defaultModel || 'semua');
    appSettings.imageAspect = settingImageAspect ? settingImageAspect.value : (appSettings.imageAspect || '1:1');
    appSettings.imageModel = settingImageModel ? settingImageModel.value : (appSettings.imageModel || 'auto');
    appSettings.enhancePrompts = settingEnhancePrompts ? !!settingEnhancePrompts.checked : true;
    appSettings.enterToSend = settingEnterSend ? (settingEnterSend.value !== 'newline') : true;
    imageAspect = appSettings.imageAspect;
    setTheme(appSettings.theme);
    imageModel = appSettings.imageModel;
    themeDark = (appSettings.theme === 'dark');
    if (model) {
      const exists = Array.prototype.some.call(model.options || [], function(o){ return o.value === appSettings.defaultModel; });
      if (exists) model.value = appSettings.defaultModel;
    }
    saveAppSettings();
    const hint = document.querySelector('.composer-bar textarea');
    if (hint) {
      hint.placeholder = appSettings.enterToSend === false
        ? 'Tanya apa saja ke Marbel AI… (Ctrl/Cmd+Enter kirim, Enter baris baru)'
        : 'Tanya apa saja ke Marbel AI… (Enter kirim, Shift+Enter baris baru)';
    }
  }
  function resetSettings() {
    appSettings = Object.assign({}, defaultSettings, { theme: 'dark' });
    syncSettingsForm();
    applySettingsFromForm();
    showToast('Pengaturan direset');
  }
  settingsBtn && settingsBtn.addEventListener('click', openSettings);
  settingsClose && settingsClose.addEventListener('click', closeSettings);
  settingsCancel && settingsCancel.addEventListener('click', closeSettings);
  settingsSave && settingsSave.addEventListener('click', function(){ applySettingsFromForm(); closeSettings(); showToast('Pengaturan disimpan'); });
  settingsReset && settingsReset.addEventListener('click', resetSettings);
  settingsOverlay && settingsOverlay.addEventListener('click', function(e){ if (e.target === settingsOverlay) closeSettings(); });
  // apply saved non-theme runtime settings
  imageAspect = appSettings.imageAspect || '1:1';
  if (input) {
    input.placeholder = appSettings.enterToSend === false
      ? 'Tanya apa saja ke Marbel AI… (Ctrl/Cmd+Enter kirim, Enter baris baru)'
      : 'Tanya apa saja ke Marbel AI… (Enter kirim, Shift+Enter baris baru)';
  }

  // Keyboard shortcuts: Esc closes settings/panels/canvas
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (settingsOverlay && settingsOverlay.classList.contains('show')) { closeSettings(); return; }
    let acted = false;
    if (workspaceEl && workspaceEl.classList.contains('canvas-open')) { closeCanvas(); acted = true; }
    if (workspaceEl && workspaceEl.classList.contains('show-browser')) { workspaceEl.classList.remove('show-browser'); acted = true; }
    if (workspaceEl && workspaceEl.classList.contains('show-terminal')) { workspaceEl.classList.remove('show-terminal'); acted = true; }
    if (workspaceEl && workspaceEl.classList.contains('show-files')) { workspaceEl.classList.remove('show-files'); acted = true; }
    if (acted) updatePanelToggles();
  });

  // ---- Right-side panels (Files/Terminal) ----
  function updatePanelToggles() {
    viewTabs.forEach(function (btn) {
      const panel = btn.getAttribute('data-panel');
      if (!panel) return;
      const on = workspaceEl && workspaceEl.classList.contains('show-' + panel);
      btn.classList.toggle('active', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (filesPanel) filesPanel.setAttribute('aria-hidden', workspaceEl && workspaceEl.classList.contains('show-files') ? 'false' : 'true');
    if (terminalPanel) terminalPanel.setAttribute('aria-hidden', workspaceEl && workspaceEl.classList.contains('show-terminal') ? 'false' : 'true');
    if (browserPanel) browserPanel.setAttribute('aria-hidden', workspaceEl && workspaceEl.classList.contains('show-browser') ? 'false' : 'true');
  }

  function togglePanel(panel) {
    if (!workspaceEl || !panel) return;
    const cls = 'show-' + panel;
    const willShow = !workspaceEl.classList.contains(cls);
    workspaceEl.classList.toggle(cls, willShow);
    // Chat always visible; ensure main chat UI is shown
    if (threadWrap) threadWrap.style.display = '';
    if (form) form.style.display = '';
    updatePanelToggles();
    if (panel === 'files' && willShow) loadFileTree(currentDir);
    if (panel === 'browser' && willShow && browserUrl && browserFrame && !browserFrame.src && browserUrl.value) navigateBrowser(browserUrl.value);
  }

  function normalizeBrowserUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return u;
    return 'http://' + u;
  }
  function navigateBrowser(url) {
    const u = normalizeBrowserUrl(url);
    if (!u || !browserFrame) return;
    if (browserUrl) browserUrl.value = u;
    if (browserEmpty) browserEmpty.classList.add('hidden');
    browserFrame.src = u;
  }

  if (browserForm) browserForm.addEventListener('submit', function(e){ e.preventDefault(); navigateBrowser(browserUrl ? browserUrl.value : ''); });
  if (browserRefresh) browserRefresh.addEventListener('click', function(){ if (browserFrame && browserFrame.src) { const s = browserFrame.src; browserFrame.src = s; } else if (browserUrl) { navigateBrowser(browserUrl.value); } });
  if (browserBack) browserBack.addEventListener('click', function(){ try { browserFrame && browserFrame.contentWindow && browserFrame.contentWindow.history.back(); } catch(e) { /* cross-origin */ } });
  if (browserClose) browserClose.addEventListener('click', function(){ if (workspaceEl) workspaceEl.classList.remove('show-browser'); updatePanelToggles(); });
  if (browserOpenExternal) browserOpenExternal.addEventListener('click', function(){ const u = normalizeBrowserUrl(browserUrl ? browserUrl.value : ''); if (u) window.open(u, '_blank', 'noopener'); else showToast('Masukkan URL terlebih dahulu'); });

  viewTabs.forEach(function (btn) {
    const panel = btn.getAttribute('data-panel');
    if (panel) btn.addEventListener('click', function () { togglePanel(panel); });
  });
  updatePanelToggles();

  async function apiJson(url, opts) {
    const res = await fetch(url, opts || {});
    const data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
    return data;
  }

  async function loadFileTree(dir) {
    if (!filesTree) return;
    filesTree.innerHTML = '<li class="file-item"><span class="ficon">…</span><span>Memuat...</span></li>';
    try {
      const data = await apiJson('/api/workspace/tree?path=' + encodeURIComponent(dir || '.'));
      currentDir = data.path || '.';
      if (filesPath) filesPath.textContent = currentDir;
      filesTree.innerHTML = '';
      if (currentDir !== '.') {
        const up = document.createElement('li');
        up.className = 'file-item dir';
        up.innerHTML = '<span class="ficon">↩</span><span>..</span>';
        up.title = 'Naik satu folder';
        up.addEventListener('click', function () {
          const parts = currentDir.split('/').filter(Boolean); parts.pop();
          loadFileTree(parts.length ? parts.join('/') : '.');
        });
        filesTree.appendChild(up);
      }
      const items = data.items || [];
      if (!items.length) {
        filesTree.innerHTML = '<li class="file-item"><span class="ficon">•</span><span>Folder kosong</span></li>';
        return;
      }
      items.forEach(function (it) {
        const li = document.createElement('li');
        li.className = 'file-item ' + it.type;
        li.innerHTML = '<span class="ficon">' + (it.type === 'dir' ? '📁' : '📄') + '</span><span>' + esc(it.name) + '</span>';
        li.title = it.name;
        li.addEventListener('click', function () {
          const next = currentDir === '.' ? it.name : (currentDir + '/' + it.name);
          if (it.type === 'dir') loadFileTree(next); else openFile(next);
        });
        filesTree.appendChild(li);
      });
    } catch (e) {
      filesTree.innerHTML = '<li class="file-item"><span class="ficon">!</span><span>Gagal memuat: ' + esc(e.message) + '</span></li>';
    }
  }

  async function openFile(p) {
    try {
      if (fileName) fileName.textContent = 'Membuka ' + p + '...';
      setFileStatus('memuat', '');
      const data = await apiJson('/api/workspace/file?path=' + encodeURIComponent(p));
      currentFilePath = data.path;
      currentFileDirty = false;
      if (fileName) fileName.textContent = currentFilePath;
      if (fileEditor) fileEditor.value = data.content || '';
      setFileStatus('', '');
    } catch (e) {
      if (fileName) fileName.textContent = 'Gagal membuka file';
      if (fileEditor) fileEditor.value = e.message;
      setFileStatus('gagal', 'err');
    }
  }

  async function saveCurrentFile() {
    if (!currentFilePath) { setFileStatus('pilih file dulu', 'err'); showToast('Pilih file terlebih dahulu'); return; }
    try {
      setFileStatus('menyimpan...', '');
      await apiJson('/api/workspace/file', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path: currentFilePath, content: fileEditor ? fileEditor.value : '' }) });
      currentFileDirty = false;
      if (fileName) fileName.textContent = currentFilePath;
      setFileStatus('tersimpan', 'ok');
      showToast('File tersimpan');
    } catch (e) {
      setFileStatus('gagal simpan', 'err');
      showToast('Gagal menyimpan: ' + e.message);
    }
  }

  if (fileEditor) fileEditor.addEventListener('input', function(){
    if (currentFilePath) { currentFileDirty = true; if (fileName) fileName.textContent = currentFilePath + ' •'; setFileStatus('belum disimpan', ''); }
  });

  if (filesRefresh) filesRefresh.addEventListener('click', function(){ loadFileTree(currentDir); });
  if (fileSave) fileSave.addEventListener('click', saveCurrentFile);
  if (filesCloseBtn) filesCloseBtn.addEventListener('click', function(){ if (workspaceEl) workspaceEl.classList.remove('show-files'); updatePanelToggles(); });

  // ---- Terminal ----
  function termPrint(text) {
    if (!terminalOutput) return;
    terminalOutput.textContent += (text || '') + '\n';
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
  if (terminalOutput && !terminalOutput.textContent.trim()) {
    terminalOutput.textContent = 'Terminal siap.\nJalankan perintah di workspace aktif.\nContoh: dir, node -v, git status, npm run dev\n\n';
  }
  if (terminalClear) terminalClear.addEventListener('click', function(){ if (terminalOutput) terminalOutput.textContent = ''; showToast('Terminal dibersihkan'); });
  if (terminalCloseBtn) terminalCloseBtn.addEventListener('click', function(){ if (workspaceEl) workspaceEl.classList.remove('show-terminal'); updatePanelToggles(); });
  if (terminalForm) terminalForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const cmd = terminalInput ? terminalInput.value.trim() : '';
    if (!cmd) return;
    termPrint('$ ' + cmd);
    if (terminalInput) terminalInput.value = '';
    if (terminalRunBtn) terminalRunBtn.disabled = true;
    if (terminalInput) terminalInput.disabled = true;
    try {
      const data = await apiJson('/api/terminal/exec', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ command: cmd, cwd: currentDir === '.' ? '' : currentDir }) });
      if (data.stdout) termPrint(data.stdout.replace(/\n$/, ''));
      if (data.stderr) termPrint('[stderr] ' + data.stderr.replace(/\n$/, ''));
      if (!data.ok) termPrint('[exit ' + data.code + ']');
    } catch (err) {
      termPrint('[error] ' + err.message);
    } finally {
      if (terminalRunBtn) terminalRunBtn.disabled = false;
      if (terminalInput) { terminalInput.disabled = false; terminalInput.focus(); }
    }
  });

  // ---- Agentic tools (MVP) ----
  async function runAgentTool(name, args) {
    if (name === 'list_dir') return await apiJson('/api/workspace/tree?path=' + encodeURIComponent(args.path || '.'));
    if (name === 'read_file') return await apiJson('/api/workspace/file?path=' + encodeURIComponent(args.path || ''));
    if (name === 'write_file') return await apiJson('/api/workspace/file', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ path: args.path || '', content: args.content || '' }) });
    if (name === 'run_command') return await apiJson('/api/terminal/exec', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ command: args.command || '', cwd: args.cwd || '' }) });
    throw new Error('Unknown tool: ' + name);
  }

  function parseToolCall(text) {
    if (!text) return null;
    const m = text.match(/```tool\s*([\s\S]*?)```/i) || text.match(/<tool>([\s\S]*?)<\/tool>/i);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch(e) { return null; }
  }

  async function maybeRunAgentLoop(initialText, msgEls, item, current, selected) {
    if (!agentMode || !agentMode.checked) return initialText;
    let text = initialText;
    let steps = 0;
    while (steps < 4) {
      const call = parseToolCall(text);
      if (!call || !call.tool) break;
      steps++;
      let result;
      try { result = await runAgentTool(call.tool, call.args || {}); }
      catch (e) { result = { error: e.message }; }
      const toolMsg = { role: 'user', content: '[Tool result: ' + call.tool + ']\n' + JSON.stringify(result, null, 2) + '\nLanjutkan. Jika selesai, jawab final tanpa blok tool.' };
      current.items.push(toolMsg);
      msgEls.inner.innerHTML = decorateText(text + '\n\nMenjalankan tool: ' + call.tool + '...');
      const built = await chatAnswer(buildThreadHistory(current.items.length), selected, function(p){ msgEls.inner.innerHTML = decorateText(text + '\n\n' + p); });
      text = built.content;
      item.content = text;
      item.model = built.modelId;
    }
    return text;
  }

  newThread();
  syncSidebar();
  ensureBackend().then(function () {
    loadModels();
  }).catch(function () {
    loadModels();
  });
})();
