// xhr-watch panel · vanilla JS · zero deps
const $ = (id) => document.getElementById(id);
const rowsTbody = document.querySelector('#rows tbody');
const emptyEl = $('empty');
const filterEl = $('filter');
const pauseEl = $('pause');
const clearBtn = $('clear');
const countEl = $('count');
const statusEl = $('status');
const tabsEl = document.querySelector('.tabs');
const detailBodyEl = $('detail-body');

let events = [];
let selectedId = null;
let filterText = '';
let paused = false;
let activeTab = 'params';

// ============ WS ============
let ws;
let backoff = 1000;
function connect() {
  setStatus('disconnected');
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => {
    setStatus('connected');
    backoff = 1000;
    fetch('/xhr-events').then(r => r.json()).then(({ events: hist }) => {
      events = hist || [];
      render();
    });
  };
  ws.onmessage = (msg) => {
    let data;
    try { data = JSON.parse(msg.data); } catch { return; }
    if (data.type === 'event') {
      events.push(data.payload);
      if (!paused) render();
    } else if (data.type === 'clear') {
      events = [];
      selectedId = null;
      render();
    }
  };
  ws.onclose = () => {
    setStatus('disconnected');
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 10000);
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
}
function setStatus(s) {
  statusEl.textContent = s;
  statusEl.className = 'status status-' + s;
}

// ============ Render ============
function render() {
  countEl.textContent = `${events.length} events`;
  emptyEl.classList.toggle('hidden', events.length > 0);

  const filtered = events.filter(applyFilter);
  // 增量渲染？5000 行一次性 innerHTML 反而最快，先用最简
  const frag = document.createDocumentFragment();
  for (const ev of filtered) frag.appendChild(renderRow(ev));
  rowsTbody.innerHTML = '';
  rowsTbody.appendChild(frag);

  // 选中态保持
  if (selectedId != null) {
    const ev = events.find(e => e.id === selectedId);
    if (ev) renderDetail(ev);
    else {
      selectedId = null;
      detailBodyEl.innerHTML = '<div class="placeholder">click a row to inspect</div>';
    }
  }
}

function applyFilter(ev) {
  if (!filterText) return true;
  const t = filterText.toLowerCase();
  return (ev.url || '').toLowerCase().includes(t) ||
         (ev.method || '').toLowerCase().includes(t);
}

function renderRow(ev) {
  const tr = document.createElement('tr');
  if (ev.id === selectedId) tr.classList.add('selected');
  const fn = extractFn(ev.url) || '(no fn)';
  const m = (ev.method || 'OTHER').toUpperCase();
  const size = byteSize(ev.resBody);
  tr.innerHTML =
    `<td><span class="method method-${m}">${esc(ev.method || '')}</span></td>` +
    `<td class="url-cell" title="${esc(ev.url || '')}"><span class="url-fn">${esc(fn)}</span></td>` +
    `<td><span class="${statusClass(ev.status)}">${ev.status}</span></td>` +
    `<td>${ev.cost}ms</td>` +
    `<td>${formatSize(size)}</td>`;
  tr.addEventListener('click', () => { selectedId = ev.id; render(); });
  return tr;
}

function statusClass(s) {
  if (s >= 200 && s < 300) return 'status-2xx';
  if (s >= 300 && s < 400) return 'status-3xx';
  if (s >= 400 && s < 500) return 'status-4xx';
  if (s >= 500) return 'status-5xx';
  return 'status-0';
}

function extractFn(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.searchParams.get('fn') || u.pathname.split('/').filter(Boolean).pop() || u.hostname;
  } catch { return null; }
}

function byteSize(s) {
  if (!s) return 0;
  return new Blob([s]).size;
}
function formatSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// ============ Detail ============
function renderDetail(ev) {
  if (activeTab === 'params') detailBodyEl.innerHTML = renderParams(ev.url);
  else if (activeTab === 'req') detailBodyEl.innerHTML = renderBody(ev.reqBody, 'request');
  else if (activeTab === 'res') detailBodyEl.innerHTML = renderBody(ev.resBody, 'response');
}

function renderParams(url) {
  let params = [];
  try {
    const u = new URL(url);
    params = Array.from(u.searchParams.entries());
  } catch { return `<div class="body-raw">invalid URL: ${esc(url)}</div>`; }
  if (params.length === 0) return '<div class="placeholder">no query params</div>';
  const rows = params.map(([k, v]) =>
    `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`
  ).join('');
  return `<table class="params-table"><tbody>${rows}</tbody></table>`;
}

function renderBody(s, kind) {
  if (!s) return `<div class="placeholder">empty ${kind} body</div>`;
  const truncated = s.indexOf('[truncated') !== -1;
  let parsed = null;
  try { parsed = JSON.parse(s); } catch {}
  // 重置 JSON 节点 id 计数器，避免长生命周期内数值膨胀
  jsonNodeSeq = 0;
  const copyData = esc(s);
  let html = `<div class="json-wrap">`
           + `<div class="json-toolbar"><button class="copy-btn" type="button" data-copy="${copyData}" aria-label="copy ${kind} body">📋 Copy</button></div>`;
  if (parsed !== null) html += `<div class="json">${renderJSON(parsed)}</div>`;
  else html += `<pre class="body-raw">${esc(s)}</pre>`;
  html += `</div>`;
  if (truncated) html += `<div class="truncated-notice">⚠ body truncated at 50KB</div>`;
  return html;
}

// JSON 树渲染：可折叠/展开的交互式树
const MAX_JSON_DEPTH = 8;           // 硬性上限：超过则截断为 {...} / [...]
const DEFAULT_COLLAPSE_DEPTH = 2;   // >= 此深度的对象/数组默认折叠
let jsonNodeSeq = 0;                // 自增 id 计数器，每个节点唯一

function renderJSON(value, depth = 0) {
  if (value === null) return '<span class="j-null">null</span>';
  switch (typeof value) {
    case 'string': return `<span class="j-str">"${esc(value)}"</span>`;
    case 'number': return `<span class="j-num">${value}</span>`;
    case 'boolean': return `<span class="j-bool">${value}</span>`;
  }
  const isArray = Array.isArray(value);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
  // 硬上限：超深截断为占位
  if (depth >= MAX_JSON_DEPTH) {
    return `<span class="j-bracket">${open}</span><span class="j-meta">…</span><span class="j-bracket">${close}</span>`;
  }
  // 空容器
  if (entries.length === 0) return `<span class="j-bracket">${open}${close}</span>`;
  const id = `n${jsonNodeSeq++}`;
  const collapsed = depth >= DEFAULT_COLLAPSE_DEPTH;
  const meta = isArray
    ? `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`
    : `${entries.length} ${entries.length === 1 ? 'key' : 'keys'}`;
  const toggle = `<span class="j-toggle" data-target="${id}">${collapsed ? '▶' : '▼'}</span>`;
  // 始终渲染 j-content（含子节点 + 闭合括号），折叠时由 CSS 隐藏；避免懒渲染导致的首次展开延迟
  const innerLines = entries.map(([k, v]) => {
    const keyStr = isArray ? '' : `<span class="j-key">"${esc(String(k))}"</span>: `;
    return `<div class="j-line">${keyStr}${renderJSON(v, depth + 1)}</div>`;
  }).join('');
  // header：折叠态包含 meta+close；展开态只有 open
  // trailer：始终渲染闭合括号（折叠时与 header 中的合并表现为完整 { N keys }）
  const header = collapsed
    ? `${toggle}<span class="j-bracket">${open}</span><span class="j-meta"> ${esc(meta)} </span>`
    : `${toggle}<span class="j-bracket">${open}</span>`;
  const trailer = `<span class="j-bracket j-close">${close}</span>`;
  const contentBlock = `<div class="j-content">${innerLines}</div>`;
  return `<div class="j-node ${isArray ? 'j-arr' : 'j-obj'} ${collapsed ? 'collapsed' : ''}" data-id="${id}">${header}${contentBlock}${trailer}</div>`;
}

// ============ Wiring ============
filterEl.addEventListener('input', () => { filterText = filterEl.value.trim(); render(); });
pauseEl.addEventListener('change', () => { paused = pauseEl.checked; });
clearBtn.addEventListener('click', () => {
  fetch('/xhr-events', { method: 'DELETE' });
});
tabsEl.addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') return;
  activeTab = e.target.dataset.tab;
  for (const b of tabsEl.querySelectorAll('button')) b.classList.toggle('active', b === e.target);
  if (selectedId != null) {
    const ev = events.find(x => x.id === selectedId);
    if (ev) renderDetail(ev);
  }
});

// 详情面板：折叠切换 + 一键复制（事件委托，render 后无需重绑）
detailBodyEl.addEventListener('click', async (e) => {
  // (a) 折叠/展开 JSON 节点
  const toggle = e.target.closest('.j-toggle');
  if (toggle) {
    const id = toggle.dataset.target;
    const node = detailBodyEl.querySelector(`.j-node[data-id="${id}"]`);
    if (node) {
      const collapsed = node.classList.toggle('collapsed');
      toggle.textContent = collapsed ? '▶' : '▼';
    }
    return;
  }
  // (b) 一键复制
  const btn = e.target.closest('.copy-btn');
  if (btn) {
    const text = btn.dataset.copy ?? '';
    const ok = await copyText(text);
    const orig = btn.textContent;
    btn.textContent = ok ? '✓ Copied' : '✗ Failed';
    btn.classList.add(ok ? 'flash-ok' : 'flash-err');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('flash-ok', 'flash-err');
    }, 1200);
  }
});

// 复制到剪贴板：优先 modern API，失败时回退到隐藏 textarea + execCommand
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ============ Init ============
connect();
render();