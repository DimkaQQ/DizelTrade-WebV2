(async () => {
  'use strict';
  window._dtlV = 'v20260529';

  let user = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function isDesktop() { return window.innerWidth >= 768; }

  function isPartner() { return user && user.role === 'partner'; }
  function isArtem()   { return user && user.role === 'artem'; }
  function isOp()      { return user && user.role === 'operator'; }

  function currentTime() {
    return new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }

  function formatNum(n) {
    if (n == null || n === '') return '—';
    return Number(n).toLocaleString('ru');
  }

  function navigate(hash) { location.hash = hash; }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));
    const dur = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
      el.classList.remove('toast-show');
      setTimeout(() => el.remove(), 350);
    }, dur);
  }

  // ── Component library ────────────────────────────────────────────────────

  function statusBar() {
    return '';
  }

  function badge(text, type) {
    return `<span class="badge ${esc(type)}">${esc(text)}</span>`;
  }

  function chipGroup(options, selectedVal, name) {
    return `<div class="chips" data-group="${esc(name)}">${options.map(o => {
      const val = typeof o === 'object' ? String(o.value) : o;
      const label = typeof o === 'object' ? o.label : o;
      const sel = val === String(selectedVal) ? ' sel' : '';
      return `<div class="chip${sel}" data-val="${esc(val)}">${esc(label)}</div>`;
    }).join('')}</div>`;
  }

  function statCard(value, label, color) {
    return `<div class="sc"><div class="v${color ? ' ' + color : ''}">${esc(String(value))}</div><div class="lv">${esc(label)}</div></div>`;
  }

  function listItem({ icon, iconBg, title, sub, rightVal, rightSub, badgeHtml }) {
    return `<div class="li">
      <div class="lic ${esc(iconBg || '')}">${icon || ''}</div>
      <div class="lit"><div class="lim">${esc(title)}</div>${sub ? `<div class="lis">${esc(sub)}</div>` : ''}</div>
      <div class="lir">
        ${rightVal ? `<div class="lival">${esc(String(rightVal))}</div>` : ''}
        ${rightSub ? `<div style="font-size:11px;color:var(--text2)">${esc(rightSub)}</div>` : ''}
        ${badgeHtml || ''}
      </div>
    </div>`;
  }

  function pendingItem({ title, sub, btnLabel, onConfirmAttr }) {
    return `<div class="pr">
      <div><div class="prt">${esc(title)}</div><div class="prs">${esc(sub)}</div></div>
      <button class="prb" ${onConfirmAttr || ''}>${esc(btnLabel || 'Принял')}</button>
    </div>`;
  }

  function menuCard({ icon, label, sub, accent, badgeText, wide, onClick }) {
    return `<div class="mc${accent ? ' accent' : ''}${wide ? ' wide' : ''}" onclick="${onClick || ''}">
      <span class="i">${icon || ''}</span>
      <div class="l">${esc(label)}</div>
      ${sub ? `<div class="sl">${esc(sub)}</div>` : ''}
      ${badgeText ? `<div class="b">${esc(badgeText)}</div>` : ''}
    </div>`;
  }

  function orderCard({ id, name, date, amount, pricePerLiter, delivered, inTransit, total, sites, closed, showFinancials, deliveryType, notes }) {
    const deliveredN = parseFloat(delivered) || 0;
    const inTransitN = parseFloat(inTransit) || 0;
    const totalN = parseFloat(total) || 0;
    const pct = totalN > 0 ? Math.round((deliveredN / totalN) * 100) : (closed ? 100 : 0);
    const remaining = Math.max(0, totalN - deliveredN - inTransitN);
    const isOver = pct >= 80;
    const dtLabels = { 'own': 'свой транспорт', 'hire': 'найм', 'mixed': 'смешанный' };
    const dtLabel = deliveryType ? (dtLabels[deliveryType] || deliveryType) : null;
    return `<div class="oc${closed ? '" style="opacity:.55' : ''}" ${id && !closed ? `onclick="navigate('#orders/${id}')" style="cursor:pointer"` : ''}>
      <div class="och">
        <div style="flex:1;min-width:0">
          <div class="ocn">${esc(name)}${sites && sites.length ? `<span style="color:var(--text3);font-weight:400"> → ${sites.map(s => esc(s)).join(', ')}</span>` : ''}</div>
          <div class="ocd">${esc(date)}${dtLabel ? ` · <span style="color:var(--text3)">${dtLabel}</span>` : ''}${totalN ? ` · <strong>${totalN} куб</strong>` : ''}</div>
        </div>
        ${showFinancials && amount ? `<div style="text-align:right;flex-shrink:0"><div class="oca">${esc(amount)}</div><div class="ocsub">${pricePerLiter ? esc(pricePerLiter) : ''}</div></div>` : ''}
      </div>
      ${notes ? `<div style="font-size:12px;color:var(--text2);margin:2px 0 6px;padding:0 2px">${esc(notes)}</div>` : ''}
      <div class="ocp-labels">
        <span>✅ ${deliveredN} куб</span>
        ${inTransitN > 0 ? `<span style="color:var(--orange)">🚚 ${inTransitN} куб</span>` : ''}
        <span style="color:var(--text2)">осталось: <strong style="color:var(--orange)">${remaining} куб</strong></span>
        ${showFinancials ? `<span style="color:var(--accent);font-weight:700">${pct}%</span>` : ''}
      </div>
      <div class="ocbar"><div class="ocfill${isOver ? ' o' : ''}" style="width:${Math.min(pct,100)}%"></div></div>
    </div>`;
  }

  function balanceBox(rows, totalLabel, totalVal, totalColor) {
    return `<div class="bb">
      ${rows.map(r => `<div class="bbr"><div class="bbl">${esc(r.label)}</div><div class="bbv" ${r.color ? `style="color:var(--${r.color})"` : ''}>${esc(r.val)}</div></div>`).join('')}
      <div class="bbt"><span style="color:var(--text2)">${esc(totalLabel)}</span><span style="color:var(--${totalColor || 'orange'})">${esc(totalVal)}</span></div>
    </div>`;
  }

  function infoTag(text) {
    return `<div class="info-tag">${text}</div>`;
  }

  function formField(label, inputHtml) {
    return `<div class="fsec"><div class="fl">${esc(label)}</div>${inputHtml}</div>`;
  }

  function photoButton(inputId) {
    return `<label class="photo-btn" for="${inputId}">
    <div class="pi2">📷</div>
    <div class="pt2">Сфотографировать ТТН</div>
    <div class="ps">Нажми чтобы выбрать или сделать фото</div>
    <input type="file" id="${inputId}" accept="image/*" style="display:none" onchange="previewPhoto('${inputId}')">
  </label>
  <div id="${inputId}-preview" style="display:none;margin-top:8px">
    <img id="${inputId}-img" style="max-width:100%;border-radius:8px;max-height:200px" src="" alt="ТТН">
    <button id="${inputId}-scan" class="btn-secondary" style="display:none;width:100%;margin-top:8px;font-size:12px" onclick="window.scanTTN('${inputId}')">🔍 Распознать ТТН (Claude AI)</button>
  </div>`;
  }

  window.previewPhoto = function(inputId) {
    const file = document.getElementById(inputId)?.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById(inputId + '-img');
      const preview = document.getElementById(inputId + '-preview');
      if (img) img.src = e.target.result;
      if (preview) preview.style.display = 'block';
      const label = document.querySelector(`label[for="${inputId}"] .pt2`);
      if (label) label.textContent = '✅ Фото выбрано';
      // Show scan button if present
      const scanBtn = document.getElementById(inputId + '-scan');
      if (scanBtn) {
        scanBtn.style.display = 'block';
        scanBtn.onclick = () => window.scanTTN(inputId);
      }
    };
    reader.readAsDataURL(file);
  };

  async function uploadTtnPhoto(inputId) {
    const input = document.getElementById(inputId);
    const file = input?.files[0];
    if (!file) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload/ttn', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + api.getToken() },
        body: formData,
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.url || null;
    } catch (e) {
      return null;
    }
  }

  function sectionHeader(text) {
    return `<div class="sh">${esc(text)}</div>`;
  }

  function emptyState(text) {
    return `<div class="empty-state">${esc(text)}</div>`;
  }

  // ── Layout builders ──────────────────────────────────────────────────────

  function getTabBar() {
    if (isDesktop()) return '';
    if (!user) return '';
    if (isPartner()) {
      return `<div class="tab-bar">
        <div class="tab-item" data-tab="home" onclick="navigate('#home')"><div class="tab-icon">🏠</div><div class="tab-label">Главная</div></div>
        <div class="tab-item" data-tab="base" onclick="navigate('#base')"><div class="tab-icon">⛽</div><div class="tab-label">БАЗА</div></div>
        <div class="tab-item" data-tab="orders" onclick="navigate('#orders')"><div class="tab-icon">📦</div><div class="tab-label">Заказы</div></div>
        <div class="tab-item" data-tab="dashboard" onclick="navigate('#dashboard')"><div class="tab-icon">📊</div><div class="tab-label">Дашборд</div></div>
      </div>`;
    }
    if (isArtem()) {
      return `<div class="tab-bar">
        <div class="tab-item" data-tab="home" onclick="navigate('#home')"><div class="tab-icon">🏠</div><div class="tab-label">Главная</div></div>
        <div class="tab-item" data-tab="base/receipts/new" onclick="navigate('#base/receipts/new')"><div class="tab-icon">📥</div><div class="tab-label">Принял</div></div>
        <div class="tab-item" data-tab="base/dispatches/new" onclick="navigate('#base/dispatches/new')"><div class="tab-icon">🚚</div><div class="tab-label">Рейс</div></div>
        <div class="tab-item" data-tab="fleet" onclick="navigate('#fleet')"><div class="tab-icon">🏗</div><div class="tab-label">Мой парк</div></div>
      </div>`;
    }
    // operator
    return `<div class="tab-bar">
      <div class="tab-item" data-tab="home" onclick="navigate('#home')"><div class="tab-icon">🏠</div><div class="tab-label">Главная</div></div>
      <div class="tab-item" data-tab="base/receipts/new" onclick="navigate('#base/receipts/new')"><div class="tab-icon">📥</div><div class="tab-label">Принял</div></div>
      <div class="tab-item" data-tab="base/dispatches/new" onclick="navigate('#base/dispatches/new')"><div class="tab-icon">🚚</div><div class="tab-label">Рейс</div></div>
    </div>`;
  }

  function getUserInitials() {
    if (!user) return '??';
    const nm = user.name || user.email || '';
    const parts = nm.split(' ');
    return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
  }

  function buildDesktopLayout() {
    const el = document.getElementById('app');
    el.innerHTML = `
    <div class="app-shell">
      <div class="sidebar">
        <div class="sidebar-logo">
          <div class="logo">DIZEL<span>TRADE</span></div>
          <div class="version">Управление · v2.0</div>
        </div>
        <div class="sidebar-nav">
          <div class="nav-item" data-page="home" onclick="navigate('#home')"><span class="ni-icon">🏠</span> Главная</div>
          <div class="nav-group-label">Главное</div>
          <div class="nav-item" data-page="dashboard" onclick="navigate('#dashboard')"><span class="ni-icon">📊</span> Дашборд</div>
          <div class="nav-item" data-page="base" onclick="navigate('#base')"><span class="ni-icon">⛽</span> База Тында<span class="ni-badge" id="sb-pending-badge" style="display:none">0</span></div>
          ${!isOp() ? `<div class="nav-item" data-page="orders" onclick="navigate('#orders')"><span class="ni-icon">📦</span> Заказы клиентов</div>` : `<div class="nav-item nav-item-dim"><span class="ni-icon">📦</span> Заказы клиентов</div>`}
          <div class="nav-item" data-page="base-dispatches" onclick="navigate('#base?tab=trips')"><span class="ni-icon">🚚</span> Журнал рейсов</div>

          ${isPartner() ? `
          <div class="nav-group-label">Финансы</div>
          <div class="nav-item" data-page="income" onclick="navigate('#income')"><span class="ni-icon">💰</span> Доходы</div>
          <div class="nav-item" data-page="expenses" onclick="navigate('#expenses')"><span class="ni-icon">📋</span> Расходы</div>
          <div class="nav-item" data-page="debts" onclick="navigate('#debts')"><span class="ni-icon">📄</span> Долги</div>
          <div class="nav-group-label">Операционка</div>
          <div class="nav-item" data-page="fleet" onclick="navigate('#fleet')"><span class="ni-icon">🚛</span> Автопарк DTL</div>
          <div class="nav-item" data-page="hire" onclick="navigate('#hire')"><span class="ni-icon">🔁</span> Найм</div>
          ` : ''}
          ${isArtem() ? `
          <div class="nav-group-label">Операционка</div>
          <div class="nav-item" data-page="fleet" onclick="navigate('#fleet')"><span class="ni-icon">🏗</span> Мой автопарк</div>
          ` : ''}

          <div class="nav-group-label">Аналитика</div>
          ${isPartner() ? `
          <div class="nav-item" data-page="analytics" onclick="navigate('#analytics')"><span class="ni-icon">📈</span> Аналитика</div>
          <div class="nav-item" data-page="balance" onclick="navigate('#balance')"><span class="ni-icon">⚖️</span> Баланс</div>
          <div class="nav-item" data-page="annual" onclick="navigate('#annual')"><span class="ni-icon">📅</span> Год. итоги</div>
          ` : `
          <div class="nav-item nav-item-dim"><span class="ni-icon">📈</span> Аналитика</div>
          <div class="nav-item nav-item-dim"><span class="ni-icon">⚖️</span> Баланс</div>
          <div class="nav-item nav-item-dim"><span class="ni-icon">📅</span> Год. итоги</div>
          `}

          <div class="nav-group-label">Система</div>
          ${!isOp() ? `<div class="nav-item" data-page="settings" onclick="navigate('#settings')"><span class="ni-icon">⚙️</span> Настройки</div>` : `<div class="nav-item nav-item-dim"><span class="ni-icon">⚙️</span> Настройки</div>`}
        </div>
        <div class="sidebar-user">
          <div class="user-avatar">${getUserInitials().toUpperCase()}</div>
          <div>
            <div class="user-name">${esc(user.name || user.email)}</div>
            <div class="user-role">${esc(user.role === 'partner' ? 'Партнёр DTL · Полный доступ' : user.role === 'artem' ? 'Артём · Ограниченный доступ' : 'Оператор')}</div>
          </div>
          <button class="btn-logout-sidebar" onclick="doLogout()">⏻</button>
        </div>
      </div>
      <div class="main">
        <div class="topbar">
          <div class="topbar-title" id="topbar-title">Загрузка...</div>
          <div class="topbar-stat">
            <div class="ts-dot"></div>
            <div><div class="ts-val" id="tb-balance">— куб</div><div class="ts-lbl">На базе сейчас</div></div>
          </div>
          <div class="topbar-stat">
            <div><div class="ts-val" style="color:var(--orange)" id="tb-trips">—</div><div class="ts-lbl">Рейса в пути</div></div>
          </div>
          ${isPartner() || isArtem() ? `<button onclick="window.openAiChat()" style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;font-weight:700;white-space:nowrap">✦ ИИ</button>` : ''}
          <div class="topbar-alert" id="tb-alert" style="display:none" onclick="navigate('#base')">⏳ <span id="tb-alert-text">Ожидают</span></div>
        </div>
        <div id="content"></div>
      </div>
    </div>`;

    loadTopbarStats();
    setInterval(loadTopbarStats, 15000);
  }

  function buildMobileLayout() {
    const el = document.getElementById('app');
    el.innerHTML = `<div class="app-shell" id="mobile-shell"></div>`;
    // Floating AI button for mobile — add only once
    if ((isPartner() || isArtem()) && !document.getElementById('ai-fab')) {
      const fab = document.createElement('button');
      fab.id = 'ai-fab';
      fab.textContent = '✦';
      fab.style.cssText = 'position:fixed;bottom:82px;right:16px;width:54px;height:54px;border-radius:50%;background:var(--accent);color:#000;border:none;font-size:24px;font-weight:700;cursor:pointer;z-index:8000;box-shadow:0 4px 18px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;transition:transform .2s,opacity .2s';
      fab.onclick = () => window.openAiChat();
      document.body.appendChild(fab);
    }
  }

  async function loadTopbarStats() {
    try {
      const dashRes = await Promise.allSettled([
        api.get('/api/dashboard')
      ]);
      const dashResult = dashRes[0];
      if (dashResult.status === 'fulfilled' && dashResult.value) {
        const d = dashResult.value;
        const b = document.getElementById('tb-balance');
        if (b) b.textContent = (d.base_balance ?? '—') + ' куб';
        const tripsEl = document.getElementById('tb-trips');
        if (tripsEl) tripsEl.textContent = d.trips_in_transit || '—';
        const pending = d.pending_receipts || 0;
        const alertEl = document.getElementById('tb-alert');
        const badgeEl = document.getElementById('sb-pending-badge');
        if (pending > 0) {
          if (alertEl) { alertEl.style.display = 'flex'; }
          const alertText = document.getElementById('tb-alert-text');
          if (alertText) alertText.textContent = pending + ' ожидают подтверждения';
          if (badgeEl) { badgeEl.style.display = 'flex'; badgeEl.textContent = pending; }
        }
      }
    } catch (e) { /* silent */ }
  }

  // ── Router ───────────────────────────────────────────────────────────────
  window.addEventListener('hashchange', () => render(location.hash));
  let _resizeTimer;
  let _prevIsDesktop = window.innerWidth >= 768;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      // Only re-render when mobile↔desktop breakpoint actually crosses.
      // iOS Safari fires resize constantly as toolbar hides/shows during scroll
      // (height changes, width stays the same) — this caused full DOM rebuild → flicker.
      const nowDesktop = window.innerWidth >= 768;
      if (user && nowDesktop !== _prevIsDesktop) {
        _prevIsDesktop = nowDesktop;
        setupLayout();
        render(location.hash);
      }
    }, 300);
  });

  function render(hash) {
    const h = (hash || '').replace(/^#/, '') || 'home';
    updateTabBar(h);
    const _tab = new URLSearchParams((h.split('?')[1] || '')).get('tab');
    const _pageKey = (_tab === 'trips') ? 'base-dispatches' : (_tab === 'receipts') ? 'base' : h.split('?')[0];
    updateSidebarActive(_pageKey);

    if (h === 'login' || !user) { viewLogin(); return; }
    if (h === 'home' || h === '') { viewHome(); return; }
    if (h === 'base' || h.startsWith('base?')) {
      const params = new URLSearchParams((h.split('?')[1] || ''));
      viewBase(params.get('tab')); return;
    }
    if (h === 'base/receipts/new') { viewBaseReceiptNew(); return; }
    if (h === 'base/dispatches/new') { viewBaseDispatchNew(); return; }
    if (h === 'orders') { if (isOp()) { toast('Нет доступа · Только БАЗА', 'error'); navigate('#home'); return; } viewOrders(); return; }
    if (h.startsWith('orders/')) { viewOrderDetail(h.split('/')[1]); return; }
    if (h === 'income') { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewIncome(); return; }
    if (h === 'expenses') { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewExpenses(); return; }
    if (h === 'hire') { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewHire(); return; }
    if (h === 'debts') { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewDebts(); return; }
    if (h === 'dashboard') { viewDashboard(); return; }
    if (h === 'fleet') { viewFleet(); return; }
    if (h === 'analytics' || h.startsWith('analytics?')) { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewAnalytics(); return; }
    if (h === 'balance' || h.startsWith('balance?')) { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewBalance(); return; }
    if (h === 'annual' || h.startsWith('annual?')) { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewAnnual(); return; }
    if (h === 'settings') { if (isOp()) { toast('Нет доступа · Только БАЗА', 'error'); navigate('#home'); return; } viewSettings(); return; }
    if (h === 'logs') { if (!isPartner()) { toast('Нет доступа', 'error'); navigate('#home'); return; } viewLogs(); return; }
    viewHome();
  }

  function updateTabBar(hash) {
    document.querySelectorAll('.tab-item').forEach(item => {
      item.classList.remove('active');
      const tab = item.getAttribute('data-tab');
      if (tab && (hash === tab || hash.startsWith(tab + '/') || hash.startsWith(tab + '?'))) {
        item.classList.add('active');
      }
    });
    if (hash === 'home' || hash === '') {
      document.querySelectorAll('.tab-item[data-tab="home"]').forEach(e => e.classList.add('active'));
    }
  }

  function updateSidebarActive(page) {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-page') === page) el.classList.add('active');
    });
  }

  function getContentEl() {
    return isDesktop() ? document.getElementById('content') : document.getElementById('mobile-shell');
  }

  function setPageContent(html, tabBarHtml) {
    const el = getContentEl();
    if (!el) return;
    el.innerHTML = html;
    if (!isDesktop() && tabBarHtml) {
      el.insertAdjacentHTML('beforeend', tabBarHtml);
    }
    const sb = document.getElementById('sb-time');
    if (sb) sb.textContent = currentTime();
    bindChips(el);
  }

  function bindChips(root) {
    if (!root) return;
    root.querySelectorAll('.chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
      });
    });
  }

  // ── BOOT ──────────────────────────────────────────────────────────────────
  async function boot() {
    try {
      const r = await api.refresh();
      if (r && r.access_token) api.setToken(r.access_token);
      user = await api.me();
      window.currentUser = user;
      checkOnboarding();
    } catch (e) { user = null; }
    setupLayout();
    render(location.hash || '#home');
    // Re-register push subscription if already granted
    if (user && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          const j = existing.toJSON();
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.getToken() },
            body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }),
          });
        }
      } catch (e) { /* non-critical */ }
    }
    setInterval(() => {
      document.querySelectorAll('#sb-time').forEach(el => { el.textContent = currentTime(); });
    }, 30000);
  }

  async function checkOnboarding() {
    if (localStorage.getItem('dtl_onboarding_dismissed')) return;
    let steps = [];
    try { steps = await api.get('/api/onboarding') || []; } catch(e) { return; }
    const allDone = steps.every(s => s.done);
    if (allDone) { localStorage.setItem('dtl_onboarding_dismissed', '1'); return; }
    const doneCount = steps.filter(s => s.done).length;
    if (doneCount === 0) {
      // First-time user — show welcome modal
      const existing = document.getElementById('modal-overlay');
      if (existing) existing.remove();
      const fab = document.getElementById('ai-fab');
      if (fab) { fab.style.transform = 'scale(0)'; fab.style.opacity = '0'; }
      const overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-sheet">
          <div class="modal-body" style="text-align:center;padding:16px 0 8px">
            <div style="font-size:48px">👋</div>
            <div style="font-size:20px;font-weight:700;margin:8px 0">Добро пожаловать в DTL!</div>
            <div style="color:var(--text2);font-size:14px;margin-bottom:16px">Несколько шагов для начала работы</div>
            ${steps.map((s, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px;text-align:left">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--text2)">${i + 1}</div>
              <div style="font-size:13px">${esc(s.label)}</div>
            </div>`).join('')}
            <button onclick="localStorage.setItem('dtl_onboarding_dismissed','1');closeModal()" class="btn-secondary" style="width:100%;margin-top:16px">Понятно, начнём</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) { localStorage.setItem('dtl_onboarding_dismissed', '1'); closeModal(); } });
    }
  }

  window.completeOnboardingStep = async function(stepKey) {
    try {
      await api.post('/api/onboarding/' + stepKey, {});
      navigate('#home');
    } catch(e) {}
  };

  function setupLayout() {
    if (!user) {
      document.getElementById('app').innerHTML = '';
      return;
    }
    if (isDesktop()) { buildDesktopLayout(); }
    else { buildMobileLayout(); }
  }

  window.doLogout = async function () {
    try { await api.logout(); } catch (e) { /* */ }
    user = null;
    setupLayout();
    viewLogin();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ══════════════════════════════════════════════════════════════════════════

  async function viewLogin() {
    document.getElementById('app').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">DIZEL<span>TRADE</span></div>
        <div class="login-sub">// добро пожаловать</div>
        <div id="login-err" class="login-err" style="display:none"></div>
        <div class="fsec">
          <div class="fl">Логин</div>
          <input class="inp" type="text" id="l-login" placeholder="Ваш логин" autocomplete="username">
        </div>
        <div class="fsec">
          <div class="fl">Пароль</div>
          <input class="inp" type="password" id="l-pass" placeholder="Пароль" autocomplete="current-password">
        </div>
        <button class="btn-primary" id="l-btn" onclick="doLogin()">Войти</button>
      </div>
    </div>`;
    const passEl = document.getElementById('l-pass');
    if (passEl) passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }

  window.doLogin = async function () {
    const loginVal = (document.getElementById('l-login')?.value || '').trim();
    const passVal = document.getElementById('l-pass')?.value || '';
    const errEl = document.getElementById('login-err');
    const btn = document.getElementById('l-btn');
    if (errEl) errEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = 'Вход...'; }
    document.querySelectorAll('.inp-err').forEach(e => e.classList.remove('inp-err'));
    try {
      const d = await api.login(loginVal, passVal);
      api.setToken(d.access_token);
      user = await api.me();
      window.currentUser = user;
      setupLayout();
      navigate('#home');
      checkOnboarding();
    } catch (e) {
      if (errEl) { errEl.textContent = e.message || 'Ошибка входа'; errEl.style.display = 'block'; }
      document.getElementById('l-login')?.classList.add('inp-err');
      document.getElementById('l-pass')?.classList.add('inp-err');
    } finally {
      const b = document.getElementById('l-btn');
      if (b) { b.disabled = false; b.textContent = 'Войти'; }
    }
  };

  // ── Home ─────────────────────────────────────────────────────────────────
  async function viewHome() {
    if (!user) { viewLogin(); return; }
    if (isPartner()) { await viewHomePartner(); return; }
    if (isArtem()) { await viewHomeArtem(); return; }
    await viewHomeOperator();
  }

  async function viewHomePartner() {
    let pendingCount = 0;
    let alertBannerHtml = '';
    try {
      const alerts = await api.get('/api/dashboard/alerts');
      if (Array.isArray(alerts)) {
        pendingCount = alerts.filter(a => a.type === 'unconfirmed_receipt').length;
        if (pendingCount > 0) {
          alertBannerHtml = `<div class="alert-banner" onclick="navigate('#base')">
            <span class="ai">⏳</span>
            <div class="at"><div class="h">${pendingCount} поставки ожидают подтверждения</div><div class="s">Нажмите, чтобы открыть базу</div></div>
            <span style="color:var(--text2)">›</span>
          </div>`;
        }
      }
    } catch (e) { /* silent */ }

    let onboardingSteps = [];
    if (!localStorage.getItem('dtl_onboarding_dismissed')) {
      try { onboardingSteps = await api.get('/api/onboarding') || []; } catch(e) {}
      if (onboardingSteps.length && onboardingSteps.every(s => s.done)) {
        localStorage.setItem('dtl_onboarding_dismissed', '1');
        onboardingSteps = [];
      }
    }
    const onboardingCard = onboardingSteps.length ? `
      <div style="background:linear-gradient(135deg,rgba(0,212,100,.1),rgba(0,150,255,.1));border:1px solid var(--accent);border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;font-size:14px">🚀 Начало работы · ${onboardingSteps.filter(s => s.done).length}/${onboardingSteps.length}</div>
          <button onclick="localStorage.setItem('dtl_onboarding_dismissed','1');this.closest('div[style*=gradient]').remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px">✕</button>
        </div>
        ${onboardingSteps.map(s => `
          <div onclick="window.completeOnboardingStep('${esc(s.key)}')" style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;opacity:${s.done ? '0.5' : '1'}">
            <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${s.done ? 'var(--accent)' : 'var(--border)'};background:${s.done ? 'var(--accent)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${s.done ? '<span style="color:#000;font-size:10px">✓</span>' : ''}
            </div>
            <div style="font-size:13px;${s.done ? 'text-decoration:line-through;color:var(--text2)' : ''}">${esc(s.label)}</div>
          </div>`).join('')}
      </div>` : '';

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
      <div class="stitle">Что записать?</div>
      <div class="ssub">// добро пожаловать</div>
      ${alertBannerHtml}
      ${onboardingCard}
      <div class="menu-grid">
        ${menuCard({ icon: '⛽', label: 'База', sub: 'приёмка / рейсы', accent: true, badgeText: pendingCount > 0 ? String(pendingCount) : '', onClick: "navigate('#base')" })}
        ${menuCard({ icon: '📦', label: 'Заказы', sub: 'прогресс', onClick: "navigate('#orders')" })}
        ${menuCard({ icon: '💰', label: 'Доходы', onClick: "navigate('#income')" })}
        ${menuCard({ icon: '📋', label: 'Расходы', onClick: "navigate('#expenses')" })}
        ${menuCard({ icon: '🔁', label: 'Найм', sub: 'Хб → Тында', onClick: "navigate('#hire')" })}
        ${menuCard({ icon: '📄', label: 'Долги', onClick: "navigate('#debts')" })}
        ${menuCard({ icon: '📈', label: 'Аналитика', onClick: "navigate('#analytics')" })}
        ${menuCard({ icon: '⚖️', label: 'Баланс', onClick: "navigate('#balance')" })}
        ${menuCard({ icon: '📅', label: 'Год. итоги', onClick: "navigate('#annual')" })}
        ${menuCard({ icon: '📊', label: 'Дашборд', onClick: "navigate('#dashboard')" })}
        ${menuCard({ icon: '🕐', label: 'История записей', sub: 'кто, что и когда', wide: true, onClick: "navigate('#logs')" })}
      </div>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Главная';
    updateTabBar('home');
  }

  async function viewHomeArtem() {
    let balance = null, pending = [], dispatches = [], orders = [];
    try { balance = await api.get('/api/base/balance'); } catch (e) {}
    try { pending = await api.get('/api/base/receipts/pending') || []; } catch (e) {}
    try {
      const all = await api.get('/api/base/dispatches') || [];
      dispatches = all.filter(d => d.status === 'dispatched' || d.status === 'in_transit').slice(0, 3);
    } catch (e) {}
    try { orders = await api.get('/api/orders') || []; } catch (e) {}

    let onboardingSteps = [];
    if (!localStorage.getItem('dtl_onboarding_dismissed')) {
      try { onboardingSteps = await api.get('/api/onboarding') || []; } catch(e) {}
      if (onboardingSteps.length && onboardingSteps.every(s => s.done)) {
        localStorage.setItem('dtl_onboarding_dismissed', '1');
        onboardingSteps = [];
      }
    }
    const onboardingCard = onboardingSteps.length ? `
      <div style="background:linear-gradient(135deg,rgba(0,212,100,.1),rgba(0,150,255,.1));border:1px solid var(--accent);border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;font-size:14px">🚀 Начало работы · ${onboardingSteps.filter(s => s.done).length}/${onboardingSteps.length}</div>
          <button onclick="localStorage.setItem('dtl_onboarding_dismissed','1');this.closest('div[style*=gradient]').remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px">✕</button>
        </div>
        ${onboardingSteps.map(s => `
          <div onclick="window.completeOnboardingStep('${esc(s.key)}')" style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;opacity:${s.done ? '0.5' : '1'}">
            <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${s.done ? 'var(--accent)' : 'var(--border)'};background:${s.done ? 'var(--accent)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${s.done ? '<span style="color:#000;font-size:10px">✓</span>' : ''}
            </div>
            <div style="font-size:13px;${s.done ? 'text-decoration:line-through;color:var(--text2)' : ''}">${esc(s.label)}</div>
          </div>`).join('')}
      </div>` : '';

    const currentBal = balance ? balance.balance_cubic : '—';
    let artemDebt = null;
    try { artemDebt = await api.get('/api/base/artem-debt'); } catch (e) {}
    const debtAmount = artemDebt ? (artemDebt.debt_rub || 0) : 0;
    const pendingItems = [
      ...pending.slice(0, 3).map(r => pendingItem({ title: `ТТН ${r.ttn_number || ''} — ${r.source_custom || r.supplier_name || ''} ${r.volume_nominal || ''} куб`, sub: r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : '', btnLabel: 'Принял', onConfirmAttr: `onclick="confirmReceipt(${r.id})"` })),
      ...dispatches.slice(0, 2).map(d => pendingItem({ title: `${d.truck_name || ''} → ${d.site_name || ''} · ${d.volume} куб`, sub: d.driver_name || '', btnLabel: 'Доставлено', onConfirmAttr: `onclick="confirmDispatch(${d.id},this)"` }))
    ].join('');

    const activeOrder = orders.find(o => o.status === 'active');

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
      ${onboardingCard}
      <div class="role-tag orange">🔒 Ограниченный доступ · База Тында</div>
      <div class="stitle">База Тында</div>
      <div class="ssub">// добрый день, ${esc(user.name || user.email)}</div>
      <div class="big-stat">
        <div class="bl">⛽ Сейчас на базе</div>
        <div class="bv">${esc(String(currentBal))} <span class="bu">куб</span></div>
        <div class="bs">Вместимость: 2500 куб</div>
      </div>
      ${debtAmount > 0 ? `<div style="background:rgba(255,165,0,.1);border:1px solid var(--orange);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:13px">
        <div style="color:var(--text2);font-size:11px;margin-bottom:4px">Долг DTL перед тобой</div>
        <div style="font-size:22px;font-weight:700;color:var(--orange)">${formatNum(Math.round(debtAmount))} ₽</div>
        <div style="font-size:11px;color:var(--text2)">за рейсы твоих машин</div>
      </div>` : ''}
      ${pendingItems ? `<div class="pending-block"><div class="pt">⏳ Требуют действия (${pending.length + dispatches.length})</div>${pendingItems}</div>` : ''}
      <div class="menu-grid">
        ${menuCard({ icon: '📥', label: 'Принял топливо', accent: true, onClick: "navigate('#base/receipts/new')" })}
        ${menuCard({ icon: '🚚', label: 'Рейс на участок', onClick: "navigate('#base/dispatches/new')" })}
        ${menuCard({ icon: '🏗', label: 'Мой автопарк', onClick: "navigate('#fleet')" })}
        ${menuCard({ icon: '💵', label: 'Наличные Артёму', sub: 'мои отчёты', wide: true, onClick: "navigate('#base?tab=cash')" })}
      </div>
      ${activeOrder ? `${sectionHeader('План доставки')}
      ${orderCard({ name: activeOrder.client_name, date: 'Приоритетный', delivered: activeOrder.delivered || 0, total: activeOrder.volume_ordered || 0, showFinancials: false, sites: activeOrder.sites || [] })}` : ''}
      ${sectionHeader('Последние рейсы')}
      ${dispatches.length ? dispatches.map(d => listItem({ icon: '🚚', iconBg: 'tr', title: `${d.truck_name || ''} → ${d.site_name || ''}`, sub: `${d.volume} куб · ${d.driver_name || ''}`, badgeHtml: badge('В пути', 'transit') })).join('') : emptyState('Нет рейсов')}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('home');
  }

  async function viewHomeOperator() {
    let balance = null, pending = [];
    try { balance = await api.get('/api/base/balance'); } catch (e) {}
    try { pending = await api.get('/api/base/receipts/pending') || []; } catch (e) {}

    let onboardingSteps = [];
    if (!localStorage.getItem('dtl_onboarding_dismissed')) {
      try { onboardingSteps = await api.get('/api/onboarding') || []; } catch(e) {}
      if (onboardingSteps.length && onboardingSteps.every(s => s.done)) {
        localStorage.setItem('dtl_onboarding_dismissed', '1');
        onboardingSteps = [];
      }
    }
    const onboardingCard = onboardingSteps.length ? `
      <div style="background:linear-gradient(135deg,rgba(0,212,100,.1),rgba(0,150,255,.1));border:1px solid var(--accent);border-radius:14px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;font-size:14px">🚀 Начало работы · ${onboardingSteps.filter(s => s.done).length}/${onboardingSteps.length}</div>
          <button onclick="localStorage.setItem('dtl_onboarding_dismissed','1');this.closest('div[style*=gradient]').remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px">✕</button>
        </div>
        ${onboardingSteps.map(s => `
          <div onclick="window.completeOnboardingStep('${esc(s.key)}')" style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;opacity:${s.done ? '0.5' : '1'}">
            <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${s.done ? 'var(--accent)' : 'var(--border)'};background:${s.done ? 'var(--accent)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${s.done ? '<span style="color:#000;font-size:10px">✓</span>' : ''}
            </div>
            <div style="font-size:13px;${s.done ? 'text-decoration:line-through;color:var(--text2)' : ''}">${esc(s.label)}</div>
          </div>`).join('')}
      </div>` : '';

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
      ${onboardingCard}
      <div class="role-tag blue">🔒 Минимальный доступ · Ввод данных</div>
      <div class="stitle">Что записать?</div>
      <div class="ssub">// добро пожаловать</div>
      <div class="big-stat">
        <div class="bl">⛽ Остаток на базе</div>
        <div class="bv">${esc(String(balance ? balance.balance_cubic : '—'))} <span class="bu">куб</span></div>
        <div class="bs">Из 2500 куб</div>
      </div>
      <div class="menu-grid">
        ${menuCard({ icon: '📥', label: 'Принял топливо', accent: true, onClick: "navigate('#base/receipts/new')" })}
        ${menuCard({ icon: '🚚', label: 'Рейс на участок', onClick: "navigate('#base/dispatches/new')" })}
      </div>
      ${sectionHeader('Ожидают подтверждения')}
      ${pending.length ? `<div class="pending-block"><div class="pt">⏳ Требуют действия (${pending.length})</div>
        ${pending.slice(0, 3).map(r => pendingItem({ title: `ТТН ${r.ttn_number || ''} — ${r.source_custom || r.supplier_name || ''}`, sub: `${r.volume_nominal} куб`, btnLabel: 'Принял', onConfirmAttr: `onclick="confirmReceipt(${r.id})"` })).join('')}
      </div>` : emptyState('Нет ожидающих подтверждения')}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('home');
  }

  // ── БАЗА ─────────────────────────────────────────────────────────────────
  async function viewBase(tab) {
    const activeTab = tab || 'main';

    const tabTitles = { main: 'База Тында', receipts: 'Приёмки', trips: 'Рейсы', cash: 'Наличные', advances: 'Авансы', recon: 'Сверка' };
    const pageTitle = tabTitles[activeTab] || 'База Тында';

    let balance = null, pending = [], dispatches = [], cashData = null;
    if (activeTab === 'main') {
      try { balance = await api.get('/api/base/balance'); } catch (e) {}
      try { pending = await api.get('/api/base/receipts/pending') || []; } catch (e) {}
      try { dispatches = await api.get('/api/base/dispatches') || []; } catch (e) {}
    } else if (activeTab === 'trips') {
      try { dispatches = await api.get('/api/base/dispatches') || []; } catch (e) {}
    } else if (activeTab === 'cash') {
      try { cashData = await api.get('/api/base/artem-balance'); } catch (e) {}
    }

    const inTransit = dispatches.filter(d => d.status === 'dispatched' || d.status === 'in_transit');

    // Build tab list based on role
    const tabDefs = [
      ['main','Главная'],
      ['receipts','Приёмки'],
      ['trips','Рейсы'],
      ...(!isOp() ? [['cash','Наличные']] : []),
      ...(!isOp() ? [['advances','Авансы']] : []),
      ['recon','Сверка'],
      ['own-usage','Своя заправка'],
    ];

    function subTabBar() {
      return `<div class="sub-tabs">${tabDefs.map(([t, l]) => `<div class="sub-tab${activeTab === t ? ' active' : ''}" onclick="navigate('#base?tab=${t}')">${l}</div>`).join('')}</div>`;
    }

    let tabContent = '';

    if (activeTab === 'main') {
      tabContent = `
      <div class="stats">
        ${statCard(balance ? balance.balance_cubic : '—', 'Остаток куб', 'a')}
        ${statCard(balance ? '+' + (balance.received_today || 0) : '—', 'Принято сегодня')}
        ${statCard(inTransit.length, 'Рейса в пути', 'o')}
      </div>
      ${balance ? balanceBox(
        [
          { label: 'Принято (всего)', val: (balance.total_received || 0) + ' куб', color: 'green' },
          { label: 'Доставлено', val: (balance.total_dispatched || 0) + ' куб' },
          { label: 'В пути', val: (balance.in_transit || 0) + ' куб', color: 'orange' },
        ],
        'Остаток на базе', (balance.balance_cubic || 0) + ' куб', 'accent'
      ) : ''}
      ${pending.length ? `<div class="pending-block">
        <div class="pt">⏳ Ожидают подтверждения приёмки (${pending.length})</div>
        ${pending.slice(0, 3).map(r => pendingItem({ title: `ТТН ${r.ttn_number || ''} — ${r.source_custom || r.supplier_name || ''} ${r.volume_nominal} куб`, sub: r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : '', btnLabel: 'Принял', onConfirmAttr: `onclick="confirmReceipt(${r.id})"` })).join('')}
      </div>` : ''}
      ${sectionHeader('Действия')}
      <div class="menu-grid">
        ${menuCard({ icon: '📥', label: 'Принял топливо', accent: true, onClick: "navigate('#base/receipts/new')" })}
        ${menuCard({ icon: '🚚', label: 'Рейс на участок', onClick: "navigate('#base/dispatches/new')" })}
        ${!isOp() ? menuCard({ icon: '💸', label: 'Авансы', sub: 'топливо в долг', onClick: "navigate('#base?tab=advances')" }) : ''}
        ${menuCard({ icon: '🔋', label: 'Заправка', sub: 'своих машин', onClick: "navigate('#base?tab=own-usage')" })}
        ${!isOp() ? menuCard({ icon: '💵', label: 'Наличные', sub: 'Артёму', onClick: "navigate('#base?tab=cash')" }) : ''}
        ${menuCard({ icon: '📊', label: 'Сверка', onClick: "navigate('#base?tab=recon')" })}
      </div>
      ${sectionHeader('Рейсы в пути')}
      ${inTransit.length ? inTransit.map(d => `<div onclick="window.showDispatchDetail(${d.id})" style="cursor:pointer">${listItem({ icon: '🚚', iconBg: 'tr', title: `${d.truck_name || ''} → ${d.site_name || ''}`, sub: `${d.volume} куб · ${d.driver_name || ''} · ${d.created_at ? new Date(d.created_at).toLocaleDateString('ru') : ''}`, badgeHtml: badge('В пути', 'transit') })}</div>`).join('') : emptyState('Нет рейсов в пути')}`;

    } else if (activeTab === 'receipts') {
      let receipts = [];
      try { receipts = await api.get('/api/base/receipts?limit=20') || []; } catch (e) {}
      tabContent = `
      <button class="btn-primary" style="width:100%;margin-bottom:14px" onclick="navigate('#base/receipts/new')">+ Принял топливо</button>
      ${receipts.length ? receipts.map(r => `<div onclick="window.showReceiptDetail(${r.id})" style="cursor:pointer">${listItem({
        icon: '📥', iconBg: r.ttn_confirmed === true ? 'g' : 'o',
        title: `${r.source_custom || r.supplier_name || '—'} — ${r.volume_nominal} куб`,
        sub: `${r.ttn_number || '—'} · ${r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : ''}`,
        badgeHtml: badge(r.ttn_confirmed === true ? 'Подтверждено' : 'Ожидает', r.ttn_confirmed === true ? 'done' : 'pending')
      })}</div>`).join('') : emptyState('Нет приёмок')}`;

    } else if (activeTab === 'trips') {
      tabContent = `
      <button class="btn-primary" style="width:100%;margin-bottom:14px" onclick="navigate('#base/dispatches/new')">+ Рейс</button>
      ${dispatches.length ? dispatches.map(d => {
        const isDone = d.status === 'delivered';
        const isTransit = d.status === 'dispatched' || d.status === 'in_transit';
        return `<div onclick="window.showDispatchDetail(${d.id})" style="cursor:pointer"><div class="li">
          <div class="lic tr">🚚</div>
          <div class="lit"><div class="lim">${esc((d.truck_name || ''))} → ${esc(d.site_name || '')}</div><div class="lis">${esc(d.volume + ' куб · ' + (d.driver_name || ''))}${d.tariff ? ' · ' + formatNum(d.tariff) + ' ₽' : ''}</div></div>
          <div class="lir" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            ${isDone ? (d.paid ? `<span style="font-size:10px;color:var(--accent);font-weight:600">✅ Оплачено</span>` : badge('Доставлено', 'done')) : badge('В пути', 'transit')}
            ${isTransit ? `<button class="prb" onclick="event.stopPropagation();confirmDispatch(${d.id},this)">Доставлено</button>` : ''}
          </div>
        </div></div>`;
      }).join('') : emptyState('Нет рейсов')}`;

    } else if (activeTab === 'cash') {
      tabContent = await buildCashArtemTab();
    } else if (activeTab === 'advances') {
      tabContent = await buildAdvancesTab();
    } else if (activeTab === 'recon') {
      tabContent = await buildReconTab();
    } else if (activeTab === 'own-usage') {
      tabContent = await buildOwnUsageTab();
    }

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar">
      <div class="nav-back" onclick="navigate('#home')">Назад</div>
      <div class="nav-title">${esc(pageTitle)}</div>
      <div style="width:55px"></div>
    </div>` : ''}
    <div class="content">
      ${subTabBar()}
      ${tabContent}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('base');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = pageTitle;

    // Load recon history asynchronously after page render
    if (activeTab === 'recon') {
      (async () => {
        const histEl = document.getElementById('recon-history');
        if (!histEl) return;
        const histPeriods = [];
        const now2 = new Date();
        for (let i = 1; i <= 5; i++) {
          const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
          histPeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        const months2 = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
        const rows2 = await Promise.all(histPeriods.map(p => api.get('/api/base/reconciliation/' + p).catch(() => null)));
        histEl.innerHTML = rows2.map((r2, i) => {
          const p = histPeriods[i];
          const mo = months2[parseInt(p.split('-')[1]) - 1];
          const yr = p.split('-')[0];
          if (!r2 || r2.physical_stock == null) return `<div class="li"><div class="lic"><span style="color:var(--text3)">—</span></div><div class="lit"><div class="lim">${mo} ${yr}</div><div class="lis">Не проводилась</div></div></div>`;
          const diff = parseFloat(r2.difference || 0);
          const color = Math.abs(diff) > 5 ? 'var(--red)' : 'var(--green)';
          return `<div class="li"><div class="lic g">✓</div><div class="lit"><div class="lim">${mo} ${yr}</div><div class="lis">Физ: ${parseFloat(r2.physical_stock).toFixed(1)} куб</div></div><div class="lir"><div class="lival" style="color:${color}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</div></div></div>`;
        }).join('') || '<div class="empty-state">Нет данных</div>';
      })();
    }
  }

  // ── buildAdvancesTab ──────────────────────────────────────────────────────
  async function buildAdvancesTab() {
    let advances = [];
    try { advances = await api.get('/api/base/advances') || []; } catch (e) {}

    const openAdvances = advances.filter(a => a.status === 'open');
    const closedAdvances = advances.filter(a => a.status === 'returned');

    const fmt = n => n ? formatNum(Math.round(n)) : '—';

    const totalOpen = openAdvances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const totalVolOpen = openAdvances.reduce((s, a) => s + (parseFloat(a.volume) || 0), 0);

    const openRows = openAdvances.length ? openAdvances.map(a => `
      <div class="li">
        <div class="lic y">⛽</div>
        <div class="lit">
          <div class="lim">${esc(a.recipient || '—')}</div>
          <div class="lis">${a.given_at ? new Date(a.given_at).toLocaleDateString('ru') : '—'}${a.volume ? ' · ' + a.volume + ' куб' : ''}</div>
          ${a.notes ? `<div class="lis" style="color:var(--text3)">${esc(a.notes)}</div>` : ''}
        </div>
        <div class="lir">
          ${a.amount ? `<div class="lival">${fmt(a.amount)} ₽</div>` : ''}
          ${!isOp() ? `<button onclick="window.returnAdvance(${a.id})" style="margin-top:4px;background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">Вернули</button>` : ''}
        </div>
      </div>`).join('') : `<div class="empty-state">Нет открытых авансов</div>`;

    const closedRows = closedAdvances.slice(0, 10).map(a => `
      <div class="li" style="opacity:.6">
        <div class="lic g">✓</div>
        <div class="lit">
          <div class="lim">${esc(a.recipient || '—')}</div>
          <div class="lis">${a.given_at ? new Date(a.given_at).toLocaleDateString('ru') : '—'} · возвращено</div>
        </div>
        <div class="lir"><div class="lival">${fmt(a.amount)} ₽</div></div>
      </div>`).join('');

    return `
      ${totalOpen > 0 ? `<div style="background:rgba(255,165,0,.1);border:1px solid var(--orange);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:13px">
        <span style="color:var(--orange);font-weight:700">Открытых авансов: ${openAdvances.length} · ${fmt(totalOpen)} ₽</span>
        ${totalVolOpen > 0 ? ` · ${totalVolOpen} куб` : ''}
      </div>` : ''}
      ${sectionHeader('Открытые авансы')}
      ${openRows}
      ${isPartner() || isArtem() ? `<button class="btn-primary" style="width:100%;margin-top:8px" onclick="window.addAdvanceModal()">+ Новый аванс</button>` : ''}
      ${closedAdvances.length ? sectionHeader('Закрытые') + closedRows : ''}
    `;
  }

  // ── buildOwnUsageTab ──────────────────────────────────────────────────────
  async function buildOwnUsageTab() {
    let records = [], trucks = [];
    try { records = await api.get('/api/base/own-usage') || []; } catch (e) {}
    try { trucks = await api.get('/api/trucks') || []; } catch (e) {}

    const total = records.reduce((s, r) => s + (parseFloat(r.volume) || 0), 0);

    const rows = records.length ? records.map(r => listItem({
      icon: '⛽', iconBg: 'g',
      title: r.truck_name || '—',
      sub: `${r.used_at ? new Date(r.used_at).toLocaleDateString('ru') : '—'}${r.notes ? ' · ' + esc(r.notes) : ''}`,
      rightVal: r.volume + ' куб',
    })).join('') : emptyState('Нет записей');

    const truckOpts = trucks.filter(t => t.status !== 'archived').map(t => ({ value: String(t.id), label: t.name }));

    return `
      <div style="background:var(--card2);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Всего заправлено своих машин</div>
        <div style="font-size:24px;font-weight:700;color:var(--text)">${total.toFixed(1)} куб</div>
      </div>
      ${rows}
      <div style="margin-top:12px;background:var(--card2);border-radius:10px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">+ Записать заправку</div>
        ${formField('Машина', chipGroup(truckOpts.length ? truckOpts : [{value:'0',label:'Своя машина'}], truckOpts[0]?.value || '0', 'own-truck'))}
        ${formField('Объём, куб', `<input class="inp" type="number" id="own-vol" placeholder="5.0" step="0.5">`)}
        ${formField('Примечание', `<input class="inp" type="text" id="own-notes" placeholder="Необязательно">`)}
        <button onclick="window.submitOwnUsage()" class="btn-primary" style="width:100%">Записать</button>
      </div>
    `;
  }

  window.submitOwnUsage = async function() {
    const truckEl = document.querySelector('.chips[data-group="own-truck"] .chip.sel');
    const truck_id = parseInt(truckEl?.getAttribute('data-val')) || null;
    const volume = parseFloat(document.getElementById('own-vol')?.value) || 0;
    const notes = document.getElementById('own-notes')?.value?.trim() || null;
    if (!volume || volume <= 0) { toast('Укажите объём', 'error'); return; }
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/api/base/own-usage', { used_at: today, truck_id, volume, notes });
      toast('✅ Заправка записана');
      navigate('#base?tab=own-usage');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── buildCashArtemTab ─────────────────────────────────────────────────────
  async function buildCashArtemTab() {
    let records = [], artemBalance = null;
    try { records = await api.get('/api/base/cash-artem') || []; } catch (e) {}
    try { artemBalance = await api.get('/api/base/artem-balance'); } catch (e) {}

    const fmt = n => n != null ? formatNum(Math.round(n)) : '—';
    const balance = artemBalance ? parseFloat(artemBalance.balance || 0) : 0;

    const rows = records.length ? records.map(r => {
      const settled = r.is_settled;
      return `<div class="li${settled ? '" style="opacity:.55' : ''}">
        <div class="lic ${settled ? 'g' : 'y'}">${settled ? '✓' : '💵'}</div>
        <div class="lit">
          <div class="lim">${r.purpose ? esc(r.purpose) : 'Наличные Артёму'}</div>
          <div class="lis">${r.given_at ? new Date(r.given_at).toLocaleDateString('ru') : '—'}
            ${r.amount_spent ? ' · потрачено: ' + fmt(r.amount_spent) + ' ₽' : ''}
            ${r.fuel_received ? ' · получено: ' + r.fuel_received + ' куб' : ''}
          </div>
        </div>
        <div class="lir">
          <div class="lival">${fmt(r.amount_given)} ₽</div>
          ${!settled && isArtem() ? `<button onclick="window.reportCashArtem(${r.id})" style="margin-top:4px;background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">Отчёт</button>` : ''}
          ${!settled && isPartner() ? `<button onclick="window.settleCashArtem(${r.id})" style="margin-top:4px;background:rgba(50,215,75,.12);border:1px solid rgba(50,215,75,.3);color:var(--green);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600">✓ Закрыть</button>` : ''}
        </div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет записей</div>`;

    return `
      <div style="background:var(--card2);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Остаток у Артёма (не освоено)</div>
        <div style="font-size:28px;font-weight:700;color:${balance > 0 ? 'var(--orange)' : 'var(--text)'}">${fmt(balance)} ₽</div>
      </div>
      ${rows}
      ${isPartner() ? `<button class="btn-primary" style="width:100%;margin-top:8px" onclick="window.addCashArtemModal()">+ Выдать наличные</button>` : ''}
    `;
  }

  // ── buildReconTab ─────────────────────────────────────────────────────────
  async function buildReconTab() {
    const now = new Date();
    const thisPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let recon = null, balance = null;
    try { recon = await api.get('/api/base/reconciliation/' + thisPeriod); } catch (e) {}
    try { balance = await api.get('/api/base/balance'); } catch (e) {}

    const calcStock = balance ? parseFloat(balance.balance_cubic || 0) : 0;
    const fmt = n => n != null ? parseFloat(n).toFixed(1) : '—';

    const diffHtml = recon && recon.physical_stock != null ? (() => {
      const diff = parseFloat(recon.difference || 0);
      const color = Math.abs(diff) > 5 ? 'var(--red)' : 'var(--green)';
      return `<div class="bbr"><div class="bbl">Расхождение</div><div class="bbv" style="color:${color}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} куб</div></div>`;
    })() : '';

    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const monthName = months[parseInt(thisPeriod.split('-')[1]) - 1];
    const yearName = thisPeriod.split('-')[0];

    return `
      ${sectionHeader('Сверка за ' + monthName + ' ' + yearName)}
      <div class="bb">
        <div class="bbr"><div class="bbl">Расчётный остаток (система)</div><div class="bbv" style="color:var(--accent)">${fmt(calcStock)} куб</div></div>
        <div class="bbr"><div class="bbl">Физический замер</div><div class="bbv">${recon && recon.physical_stock != null ? fmt(recon.physical_stock) + ' куб' : '<span style="color:var(--text3)">Не внесён</span>'}</div></div>
        ${diffHtml}
        ${recon && recon.notes ? `<div class="bbr"><div class="bbl">Примечание</div><div class="bbv">${esc(recon.notes)}</div></div>` : ''}
      </div>

      ${!isOp() ? `
      <div style="background:var(--card2);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">Ввести физический замер</div>
        <input id="recon-physical" class="inp" type="number" step="0.1" placeholder="Замер в кубах" value="${recon && recon.physical_stock != null ? recon.physical_stock : ''}" style="width:100%;margin-bottom:10px">
        <input id="recon-notes" class="inp" placeholder="Примечание (опционально)" value="${recon && recon.notes ? esc(recon.notes) : ''}" style="width:100%;margin-bottom:10px">
        <button onclick="window.submitReconciliation('${thisPeriod}', ${calcStock})" class="btn-primary" style="width:100%">Сохранить замер</button>
      </div>` : ''}

      ${sectionHeader('История сверок')}
      <div id="recon-history">Загрузка...</div>
    `;
  }

  window.confirmReceipt = async function (id) {
    try {
      await api.put(`/api/base/receipts/${id}/confirm`);
      toast('✅ Приёмка подтверждена!');
      render(location.hash);
    } catch (e) { toast(e.message, 'error'); }
  };

  window.confirmDispatch = async function (id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      await api.put(`/api/base/dispatches/${id}/status`, { status: 'delivered' });
      toast('✅ Доставка подтверждена!');
      loadTopbarStats();
      render(location.hash);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Доставлено'; }
      toast(e.message, 'error');
    }
  };

  window.showCashForm = function () {
    showModal('Выдать наличные Артёму', `
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-amount" placeholder="0">`)}
      ${formField('Комментарий', `<input class="inp" type="text" id="m-note" placeholder="Назначение...">`)}
    `, async () => {
      const amount_given = parseFloat(document.getElementById('m-amount').value);
      const purpose = document.getElementById('m-note').value;
      await api.post('/api/base/cash-artem', { amount_given, purpose });
      toast('✅ Записано!');
      viewBase('cash');
    });
  };

  // ── Advances global functions ─────────────────────────────────────────────
  window.returnAdvance = async function(advanceId) {
    if (!confirm('Отметить аванс как возвращённый?')) return;
    try {
      await api.put('/api/base/advances/' + advanceId + '/return', {});
      toast('✅ Аванс закрыт');
      render('#base?tab=advances');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.addAdvanceModal = function() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--card);border-radius:20px 20px 0 0;padding:24px;max-width:500px;width:100%">
      <div style="font-size:17px;font-weight:700;margin-bottom:16px">Новый аванс топлива</div>
      <input id="adv-recipient" class="inp" placeholder="Кому (Максим, другое)" style="width:100%;margin-bottom:10px">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="adv-volume" class="inp" type="number" placeholder="Объём куб" style="flex:1">
        <input id="adv-amount" class="inp" type="number" placeholder="Сумма ₽" style="flex:1">
      </div>
      <input id="adv-notes" class="inp" placeholder="Примечание (опционально)" style="width:100%;margin-bottom:16px">
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=z-index]').remove()" class="btn-secondary" style="flex:1">Отмена</button>
        <button onclick="window._submitAdvance()" class="btn-primary" style="flex:1">Записать</button>
      </div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window._submitAdvance = async function() {
    const recipient = document.getElementById('adv-recipient')?.value?.trim();
    const volume = parseFloat(document.getElementById('adv-volume')?.value) || null;
    const amount = parseFloat(document.getElementById('adv-amount')?.value) || null;
    const notes = document.getElementById('adv-notes')?.value?.trim() || null;
    if (!recipient) { toast('Укажите кому', 'error'); return; }
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/api/base/advances', { given_at: today, recipient, volume, amount, notes });
      toast('✅ Аванс записан');
      document.querySelector('[style*="z-index:9999"]')?.remove();
      navigate('#base?tab=advances');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Cash Artem global functions ───────────────────────────────────────────
  window.addCashArtemModal = function() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--card);border-radius:20px 20px 0 0;padding:24px;max-width:500px;width:100%">
      <div style="font-size:17px;font-weight:700;margin-bottom:16px">Выдать наличные Артёму</div>
      <input id="cash-amount" class="inp" type="number" placeholder="Сумма ₽" style="width:100%;margin-bottom:10px">
      <input id="cash-purpose" class="inp" placeholder="Назначение (закупка Ангарск, прочее)" style="width:100%;margin-bottom:16px">
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=z-index]').remove()" class="btn-secondary" style="flex:1">Отмена</button>
        <button onclick="window._submitCashArtem()" class="btn-primary" style="flex:1">Записать</button>
      </div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window._submitCashArtem = async function() {
    const amount = parseFloat(document.getElementById('cash-amount')?.value);
    const purpose = document.getElementById('cash-purpose')?.value?.trim() || null;
    if (!amount || amount <= 0) { toast('Укажите сумму', 'error'); return; }
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/api/base/cash-artem', { given_at: today, amount_given: amount, purpose });
      toast('✅ Записано');
      document.querySelector('[style*="z-index:9999"]')?.remove();
      navigate('#base?tab=cash');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.reportCashArtem = function(recordId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--card);border-radius:20px 20px 0 0;padding:24px;max-width:500px;width:100%">
      <div style="font-size:17px;font-weight:700;margin-bottom:16px">Отчёт по расходованию</div>
      <input id="report-spent" class="inp" type="number" placeholder="Потрачено ₽" style="width:100%;margin-bottom:10px">
      <input id="report-fuel" class="inp" type="number" placeholder="Получено топлива куб" style="width:100%;margin-bottom:10px">
      <input id="report-notes" class="inp" placeholder="Примечание" style="width:100%;margin-bottom:16px">
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=z-index]').remove()" class="btn-secondary" style="flex:1">Отмена</button>
        <button onclick="window._submitCashReport(${recordId})" class="btn-primary" style="flex:1">Отправить</button>
      </div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window._submitCashReport = async function(recordId) {
    const amount_spent = parseFloat(document.getElementById('report-spent')?.value) || 0;
    const fuel_received = parseFloat(document.getElementById('report-fuel')?.value) || 0;
    const notes = document.getElementById('report-notes')?.value?.trim() || null;
    try {
      await api.put('/api/base/cash-artem/' + recordId + '/report', { amount_spent, fuel_received, notes });
      toast('✅ Отчёт отправлен');
      document.querySelector('[style*="z-index:9999"]')?.remove();
      render('#base?tab=cash');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.settleCashArtem = async function(recordId) {
    if (!confirm('Закрыть эту запись? Деньги освоены и проверены.')) return;
    try {
      await api.put('/api/base/cash-artem/' + recordId + '/settle', {});
      toast('✅ Запись закрыта');
      render('#base?tab=cash');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Reconciliation global functions ───────────────────────────────────────
  window.submitReconciliation = async function(period, calcStock) {
    const physical = parseFloat(document.getElementById('recon-physical')?.value);
    const notes = document.getElementById('recon-notes')?.value?.trim() || null;
    if (!physical || isNaN(physical)) { toast('Введите замер', 'error'); return; }
    try {
      await api.post('/api/base/reconciliation', { period: period, physical_stock: physical, notes });
      toast('✅ Замер сохранён');
      navigate('#base?tab=recon');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Correction modal ──────────────────────────────────────────────────────
  function showCorrectionModal({ title, fields, onSubmit }) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    const fieldsHtml = fields.map(f => `
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:var(--text2);margin-bottom:4px">${esc(f.label)}</div>
        <input id="corr-${f.id}" class="inp" type="${f.type || 'text'}" value="${esc(String(f.value || ''))}" placeholder="${esc(f.label)}" style="width:100%">
      </div>`).join('');
    overlay.innerHTML = `<div style="background:var(--card);border-radius:20px 20px 0 0;padding:24px;max-width:500px;width:100%;max-height:85vh;overflow-y:auto">
      <div style="font-size:17px;font-weight:700;margin-bottom:16px">${esc(title)}</div>
      ${fieldsHtml}
      <div style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--orange);margin-bottom:4px;font-weight:600">Причина исправления (обязательно)</div>
        <input id="corr-reason" class="inp" placeholder="Например: ошибка при вводе, уточнённые данные..." style="width:100%;border-color:var(--orange)">
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=z-index]').remove()" class="btn-secondary" style="flex:1">Отмена</button>
        <button onclick="window._submitCorrection()" class="btn-primary" style="flex:1">Исправить</button>
      </div>
    </div>`;

    window._correctionOnSubmit = onSubmit;
    window._correctionFields = fields;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  window._submitCorrection = async function() {
    const reason = document.getElementById('corr-reason')?.value?.trim();
    if (!reason) { toast('Укажите причину исправления', 'error'); return; }
    const data = { reason };
    (window._correctionFields || []).forEach(f => {
      const el = document.getElementById('corr-' + f.id);
      if (el && el.value !== String(f.value || '')) {
        data[f.id] = f.type === 'number' ? (parseFloat(el.value) || null) : el.value;
      }
    });
    try {
      await window._correctionOnSubmit(data);
      toast('✅ Исправлено и записано в аудит-лог');
      document.querySelector('[style*="z-index:9999"]')?.remove();
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Receipt correction modal ──────────────────────────────────────────────
  window.correctReceiptModal = function(id, vol, density, temp, ttn, notes) {
    showCorrectionModal({
      title: 'Исправить приёмку',
      fields: [
        { id: 'volume_nominal', label: 'Объём номинал (куб)', type: 'number', value: vol },
        { id: 'density', label: 'Плотность (г/см³)', type: 'number', value: density },
        { id: 'temperature', label: 'Температура (°C)', type: 'number', value: temp },
        { id: 'ttn_number', label: 'Номер ТТН', value: ttn },
        { id: 'notes', label: 'Примечание', value: notes },
      ],
      onSubmit: async (data) => {
        await api.put('/api/base/receipts/' + id + '/correct', data);
        navigate('#base');
      },
    });
  };

  // ── Dispatch correction modal ─────────────────────────────────────────────
  window.correctDispatchModal = function(id, volume, tariff, ttn, notes) {
    showCorrectionModal({
      title: 'Исправить рейс',
      fields: [
        { id: 'volume', label: 'Объём (куб)', type: 'number', value: volume },
        { id: 'tariff', label: 'Тариф ₽', type: 'number', value: tariff },
        { id: 'ttn_number', label: 'Номер ТТН', value: ttn },
        { id: 'notes', label: 'Примечание', value: notes },
      ],
      onSubmit: async (data) => {
        await api.put('/api/base/dispatches/' + id + '/correct', data);
        navigate('#base?tab=trips');
      },
    });
  };

  // ── Receipt form ──────────────────────────────────────────────────────────
  async function viewBaseReceiptNew() {
    const sources = ['Хабаровск', 'Ангарск', 'Коля', 'Восточка', 'Артём закупил', 'Другое'];

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar">
      <div class="nav-back" onclick="navigate('#base')">База</div>
      <div class="nav-title">Принял топливо</div>
      <div style="width:55px"></div>
    </div>` : ''}
    <div class="content">
      <div class="form-content">
      <div style="color:var(--text2);font-size:11px;margin-bottom:8px">// шаг 1 из 4</div>
      <div style="background:var(--card);border-radius:6px;height:3px;margin-bottom:18px;overflow:hidden"><div style="width:25%;height:100%;background:var(--accent);border-radius:6px"></div></div>
      ${formField('Источник топлива', chipGroup(sources, 'Хабаровск', 'source'))}
      ${formField('Объём, кубометры', `<input class="inp" type="number" id="f-volume" value="200" placeholder="Куб" oninput="recalcReceipt()">`)}
      ${formField('Температура и плотность', `<div class="inp-row">
        <input class="inp" type="number" id="f-temp" value="15" placeholder="°C" oninput="recalcReceipt()">
        <input class="inp" type="number" id="f-density" value="0.840" step="0.001" placeholder="г/см³" oninput="recalcReceipt()">
      </div>
      <div class="auto-calc" id="auto-calc">→ Пересчитано: <strong>200.0 куб</strong> при 20°C</div>`)}
      ${formField('Номер ТТН', `<input class="inp" type="text" id="f-ttn" placeholder="ТТН-2026-...">`)}
      ${formField('Фото ТТН', photoButton('f-photo-r'))}
      <button class="btn-primary" onclick="submitReceiptForm()">Далее →</button>
      <button class="btn-secondary" onclick="navigate('#base')">Отмена</button>
      </div>
    </div>
    <div class="conf-overlay" id="conf-overlay" style="display:none">
      <div class="conf-sheet">
        <div class="conf-title">Подтвердите приёмку</div>
        <div class="conf-sub" id="conf-sub"></div>
        <div class="conf-row">
          <button class="conf-cancel" onclick="document.getElementById('conf-overlay').style.display='none'">Изменить</button>
          <button class="conf-ok" onclick="doSubmitReceipt()">Записать ✓</button>
        </div>
      </div>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Принял топливо';
    recalcReceipt();
  }

  window.recalcReceipt = function () {
    const vol = parseFloat(document.getElementById('f-volume')?.value) || 0;
    const density = parseFloat(document.getElementById('f-density')?.value) || 0.840;
    const converted = (vol * density / 0.840).toFixed(1);
    const el = document.getElementById('auto-calc');
    if (el) el.innerHTML = `→ Пересчитано: <strong>${converted} куб</strong> при 20°C`;
  };

  window.submitReceiptForm = function () {
    const vol = document.getElementById('f-volume')?.value || '0';
    const density = document.getElementById('f-density')?.value || '0.840';
    const temp = document.getElementById('f-temp')?.value || '0';
    const ttn = document.getElementById('f-ttn')?.value || '';
    const sourceEl = document.querySelector('.chips[data-group="source"] .chip.sel');
    const source = sourceEl ? sourceEl.getAttribute('data-val') : '';
    const converted = (parseFloat(vol) * parseFloat(density) / 0.840).toFixed(1);
    const sub = document.getElementById('conf-sub');
    const hasPhoto = document.getElementById('f-photo-r')?.files?.length > 0;
    const photoLine = hasPhoto ? '<span style="color:var(--green)">✅ Фото прикреплено</span>' : '<span style="color:var(--orange)">⚠ Фото не прикреплено</span>';
    if (sub) sub.innerHTML = `📥 <strong>${esc(source)} → База Тында</strong><br>Объём: <strong>${esc(vol)} куб</strong> (${esc(converted)} приведённых)<br>Плотность: ${esc(density)} · Темп: +${esc(temp)}°C<br>ТТН: ${ttn ? esc(ttn) : '<span style="color:var(--text3)">не указан</span>'}<br>${photoLine}`;
    const overlay = document.getElementById('conf-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.doSubmitReceipt = async function () {
    const vol = parseFloat(document.getElementById('f-volume')?.value) || 0;
    const density = parseFloat(document.getElementById('f-density')?.value) || 0.840;
    const temp = parseFloat(document.getElementById('f-temp')?.value) || 0;
    const ttn = document.getElementById('f-ttn')?.value || '';
    const sourceEl = document.querySelector('.chips[data-group="source"] .chip.sel');
    const source = sourceEl ? sourceEl.getAttribute('data-val') : '';
    try {
      const res = await api.post('/api/base/receipts', { source_custom: source, volume_nominal: vol, density, temperature: temp, ttn_number: ttn });
      const overlay = document.getElementById('conf-overlay');
      if (overlay) overlay.style.display = 'none';
      if (res && res.id) {
        const photoUrl = await uploadTtnPhoto('f-photo-r');
        if (photoUrl) {
          try {
            await fetch(`/api/base/receipts/${res.id}/photo?photo_url=${encodeURIComponent(photoUrl)}`, {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + api.getToken() },
            });
          } catch (e2) { /* photo upload failed, not critical */ }
        }
      }
      toast('✅ Записано! Артём получит уведомление.');
      loadTopbarStats();
      navigate('#base');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Dispatch form ─────────────────────────────────────────────────────────
  async function viewBaseDispatchNew() {
    let trucks = [], drivers = [], sites = [];
    try { trucks = await api.get('/api/trucks') || []; } catch (e) {}
    try { drivers = await api.get('/api/drivers') || []; } catch (e) {}
    try { sites = await api.get('/api/sites') || []; } catch (e) {}

    const ownerTypes = ['Наш DTL', 'Автопарк Артёма', 'Наёмная'];
    const truckOpts = trucks.length ? trucks.map(t => ({ value: String(t.id), label: t.name })) : [{ value: 'shkh-1', label: 'Шахман-1' }, { value: 'shkh-2', label: 'Шахман-2' }];
    const driverOpts = drivers.length ? drivers.map(d => ({ value: String(d.id), label: d.name })) : [{ value: 'andrey', label: 'Андрюха' }, { value: 'sanya', label: 'Санёк' }];
    const siteOpts = sites.length ? sites.map(s => ({ value: String(s.id), label: s.name })) : [
      { value: 'dipkun_near', label: 'Дипкун ближний' }, { value: 'dipkun_far', label: 'Дипкун дальний' },
      { value: 'saginakh', label: 'Сагинах' }, { value: 'kamagin', label: 'Камагин' }, { value: 'berkakit', label: 'Беркакит' }
    ];

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar">
      <div class="nav-back" onclick="navigate('#base')">База</div>
      <div class="nav-title">Рейс на участок</div>
      <div style="width:55px"></div>
    </div>` : ''}
    <div class="content">
      <div class="form-content">
      ${infoTag('ℹ Это рейс Тында → участок. Найм Хабаровск → Тында — в разделе «Найм»')}
      ${formField('Чья машина', chipGroup(ownerTypes, 'Наш DTL', 'owner'))}
      ${formField('Машина', chipGroup(truckOpts, truckOpts[0]?.value || '', 'truck'))}
      ${formField('Водитель', chipGroup(driverOpts, driverOpts[0]?.value || '', 'driver'))}
      ${formField('Участок', `<div class="chips" data-group="site">${siteOpts.map((s, i) =>
        `<div class="chip${i === 0 ? ' sel' : ''}" data-val="${esc(s.value)}" onclick="">${esc(s.label)}</div>`
      ).join('')}</div>`)}
      ${formField('Объём, куб', `<input class="inp" type="number" id="f-vol-d" value="23.5">`)}
      <div class="tariff-box" id="tariff-box">
        <div class="tariff-label" id="tariff-label">Тариф (Тында → ${esc(siteOpts[0]?.label || '')})</div>
        <div class="tariff-val" id="tariff-val">—</div>
      </div>
      ${formField('Номер ТТН', `<input class="inp" type="text" id="f-ttn-d" placeholder="ТТН-2026-...">`)}
      ${formField('Фото ТТН', photoButton('f-photo-d'))}
      <div style="background:rgba(50,215,75,.06);border:1px solid rgba(50,215,75,.15);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--green)">
        «Доставлено» отмечает Артём или приёмщик, когда водитель вернулся с подписанным ТТН
      </div>
      <button class="btn-primary" onclick="doSubmitDispatch()">Записать рейс</button>
      <button class="btn-secondary" onclick="navigate('#base')">Отмена</button>
      </div>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Рейс на участок';

    const ownerMap = { 'Наш DTL': 'DTL', 'Автопарк Артёма': 'Артём', 'Наёмная': 'наёмная' };

    // Bind site chips
    document.querySelectorAll('.chips[data-group="site"] .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        const siteId = chip.getAttribute('data-val');
        const siteLabel = chip.textContent;
        const lbl = document.getElementById('tariff-label');
        if (lbl) lbl.textContent = `Тариф (Тында → ${siteLabel})`;
        const ownerEl = document.querySelector('.chips[data-group="owner"] .chip.sel');
        loadTariff(siteId, ownerMap[ownerEl?.dataset.val] || 'DTL');
      });
    });

    // Bind owner chips to reload tariff
    document.querySelectorAll('.chips[data-group="owner"] .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        setTimeout(() => {
          const siteEl = document.querySelector('.chips[data-group="site"] .chip.sel');
          const ownerEl = document.querySelector('.chips[data-group="owner"] .chip.sel');
          if (siteEl) loadTariff(siteEl.dataset.val, ownerMap[ownerEl?.dataset.val] || 'DTL');
        }, 50);
      });
    });

    if (siteOpts[0]) loadTariff(siteOpts[0].value, 'DTL');
  }

  window.loadTariff = async function (siteId, truckOwner) {
    const valEl = document.getElementById('tariff-val');
    if (!valEl || !siteId) return;
    try {
      let url = `/api/tariffs?site_id=${encodeURIComponent(siteId)}&latest=true`;
      if (truckOwner) url += `&truck_owner=${encodeURIComponent(truckOwner)}`;
      const tariff = await api.get(url);
      valEl.textContent = tariff && tariff.amount ? formatNum(tariff.amount) + ' ₽' : '—';
      valEl.dataset.tariffAmount = tariff ? (tariff.amount || '') : '';
      if (tariff && tariff.comment) {
        const lbl = document.getElementById('tariff-label');
        if (lbl) lbl.textContent += ` · ${tariff.comment}`;
      }
    } catch (e) { if (valEl) valEl.textContent = '—'; }
  };

  window.doSubmitDispatch = async function () {
    const vol = parseFloat(document.getElementById('f-vol-d')?.value) || 0;
    const ttn = document.getElementById('f-ttn-d')?.value || '';
    const truckEl = document.querySelector('.chips[data-group="truck"] .chip.sel');
    const driverEl = document.querySelector('.chips[data-group="driver"] .chip.sel');
    const siteEl = document.querySelector('.chips[data-group="site"] .chip.sel');
    const ownerEl = document.querySelector('.chips[data-group="owner"] .chip.sel');
    const ownerMap = { 'Наш DTL': 'DTL', 'Автопарк Артёма': 'Артём', 'Наёмная': 'наёмная' };
    const ownerRaw = ownerEl ? ownerEl.getAttribute('data-val') : 'Наш DTL';
    try {
      const res = await api.post('/api/base/dispatches', {
        truck_id: truckEl ? parseInt(truckEl.getAttribute('data-val')) || null : null,
        driver_id: driverEl ? parseInt(driverEl.getAttribute('data-val')) || null : null,
        site_id: siteEl ? parseInt(siteEl.getAttribute('data-val')) : null,
        truck_owner: ownerMap[ownerRaw] || 'DTL',
        volume: vol,
        ttn_number: ttn
      });
      if (res && res.id) {
        const photoUrl = await uploadTtnPhoto('f-photo-d');
        if (photoUrl) {
          try {
            await fetch(`/api/base/dispatches/${res.id}/photo?photo_url=${encodeURIComponent(photoUrl)}`, {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + api.getToken() },
            });
          } catch (e2) { /* photo upload failed, not critical */ }
        }
      }
      toast('✅ Рейс зафиксирован!');
      navigate('#base?tab=trips');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  async function viewOrders() {
    let orders = [];
    try { orders = await api.get('/api/orders') || []; } catch (e) {}

    const active = orders.filter(o => o.status === 'active');
    const closed = orders.filter(o => o.status !== 'active');
    const deliveredCub = active.reduce((s, o) => s + (o.delivered || 0), 0);

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar">
      <div class="nav-back" onclick="navigate('#home')">Главная</div>
      <div class="nav-title">📦 Заказы клиентов</div>
      ${isPartner() ? `<div style="font-size:12px;color:var(--accent);cursor:pointer;padding:4px 8px" onclick="showNewOrderModal()">+ Новый</div>` : '<div style="width:55px"></div>'}
    </div>` : ''}
    <div class="content">
      ${isDesktop() && isPartner() ? `<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showNewOrderModal()">+ Новый заказ</button></div>` : ''}
      ${isPartner() ? `<div class="stats">
        ${statCard(active.length, 'Активных')}
        ${statCard(deliveredCub, 'Доставлено куб', 'a')}
        ${statCard('—', 'Дебиторка млн', 'o')}
      </div>` : ''}
      ${active.length ? active.map(o => orderCard({ id: o.id, name: o.client_name, date: o.created_at ? new Date(o.created_at).toLocaleDateString('ru') : '', amount: isPartner() ? formatNum(o.amount_paid) + ' ₽' : null, pricePerLiter: o.price_per_liter ? o.price_per_liter + ' ₽/л' : '', delivered: o.delivered || 0, inTransit: o.in_transit || 0, total: o.volume_ordered || 0, sites: o.sites || [], showFinancials: isPartner(), deliveryType: o.delivery_type, notes: o.notes })).join('') : emptyState('Нет активных заказов')}
      ${closed.length ? closed.map(o => orderCard({ id: o.id, name: o.client_name, date: 'Закрыт ' + (o.closed_at ? new Date(o.closed_at).toLocaleDateString('ru') : ''), delivered: o.delivered || 0, inTransit: 0, total: o.volume_ordered || 0, sites: o.sites || [], closed: true, showFinancials: false })).join('') : ''}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('orders');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Заказы клиентов';
  }

  async function viewOrderDetail(id) {
    let order = null, dispatches = [];
    try { order = await api.get(`/api/orders/${id}`); } catch (e) {}
    if (!order) { navigate('#orders'); return; }
    try {
      const allD = await api.get(`/api/base/dispatches`) || [];
      dispatches = allD.filter(d => d.order_id == id);
    } catch (e) {}

    const delivered = dispatches.filter(d => d.status === 'delivered').reduce((s, d) => s + (parseFloat(d.volume) || 0), 0);
    const inTransit = dispatches.filter(d => ['dispatched','in_transit'].includes(d.status)).reduce((s, d) => s + (parseFloat(d.volume) || 0), 0);
    const total = parseFloat(order.volume_ordered) || 0;
    const remaining = Math.max(0, total - delivered - inTransit);
    const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

    const statusLabels = { dispatched: 'В дороге', in_transit: 'В пути', delivered: 'Доставлено', cancelled: 'Отменён' };
    const statusColors = { dispatched: 'var(--orange)', in_transit: 'var(--accent)', delivered: 'var(--green)', cancelled: 'var(--red)' };

    const dispatchRows = dispatches.length ? dispatches.map(d => `
      <div onclick="window.showDispatchDetail(${d.id})" style="cursor:pointer">${listItem({
        icon: '🚛', iconBg: 'tr',
        title: `${esc(d.truck_name || d.truck_temp || '?')} → ${esc(d.site_name || '?')}`,
        sub: `${d.volume} куб · ${d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString('ru') : ''} · ${esc(d.driver_name || d.driver_temp || '')}`,
        badgeHtml: `<span style="font-size:10px;color:${statusColors[d.status]||'var(--text2)'}">${statusLabels[d.status]||d.status}</span>`
      })}</div>`).join('') : `<div class="empty-state">Рейсов ещё нет</div>`;

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#orders')">Заказы</div><div class="nav-title">${esc(order.client_name || '')}</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div style="background:var(--card);border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">${esc(order.client_name || '')}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${order.paid_at ? new Date(order.paid_at).toLocaleDateString('ru') : ''}${order.delivery_type ? ' · ' + esc(order.delivery_type) : ''}</div>
        <div style="background:var(--bg);border-radius:8px;height:8px;margin-bottom:8px;overflow:hidden">
          <div style="height:100%;border-radius:8px;background:${pct >= 100 ? 'var(--green)' : 'var(--accent)'};width:${Math.min(100,pct)}%;transition:width .4s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:12px">
          <span>${pct}% доставлено</span><span>Осталось: ${remaining.toFixed(1)} куб</span>
        </div>
        <div class="bb" style="margin:0">
          <div class="bbr"><div class="bbl">Объём заказа</div><div class="bbv">${total} куб</div></div>
          <div class="bbr"><div class="bbl">Доставлено</div><div class="bbv" style="color:var(--green)">${delivered.toFixed(1)} куб</div></div>
          <div class="bbr"><div class="bbl">В пути</div><div class="bbv" style="color:var(--orange)">${inTransit.toFixed(1)} куб</div></div>
          ${isPartner() ? `
          <div class="bbr"><div class="bbl">Сумма оплаты</div><div class="bbv">${formatNum(order.amount_paid)} ₽</div></div>
          <div class="bbr"><div class="bbl">Цена за литр</div><div class="bbv">${order.price_per_liter || '—'} ₽/л</div></div>
          ` : ''}
          ${order.notes ? `<div class="bbr"><div class="bbl">Примечание</div><div class="bbv">${esc(order.notes)}</div></div>` : ''}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button onclick="window.openOrderReport(${id})" class="btn-secondary" style="flex:1">🖨 Отчёт для клиента</button>
        ${isPartner() && order.status === 'active' ? `<button onclick="window.closeOrder(${id})" class="btn-secondary" style="flex:1;color:var(--red)">Закрыть заказ</button>` : ''}
        ${isPartner() && order.status !== 'closed' ? `<button onclick="window.reconcileOrder(${id})" class="btn-secondary" style="flex:1">✅ Сверен</button>` : ''}
      </div>

      ${sectionHeader('Рейсы по заказу · ' + dispatches.length)}
      ${dispatchRows}
    </div>`;

    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = (order.client_name || 'Заказ');
  }

  window.closeOrder = async function(id) {
    if (!confirm('Закрыть заказ? Это действие нельзя отменить.')) return;
    try {
      await api.put('/api/orders/' + id + '/close', {});
      toast('✅ Заказ закрыт');
      navigate('#orders');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.reconcileOrder = async function(id) {
    try {
      await api.put('/api/orders/' + id + '/reconcile', {});
      toast('✅ Заказ отмечен как сверен');
      render('#orders/' + id);
    } catch (e) { toast(e.message, 'error'); }
  };

  window.openOrderReport = async function(id) {
    try {
      const res = await fetch(`/api/orders/${id}/report`, { headers: { Authorization: 'Bearer ' + api.getToken() } });
      if (!res.ok) { toast('Ошибка: ' + res.status, 'error'); return; }
      const html = await res.text();
      const w = window.open('', '_blank', 'width=1050,height=720');
      w.document.write(html);
      w.document.close();
    } catch (e) { toast('Ошибка: ' + e.message, 'error'); }
  };

  window.showNewOrderModal = async function () {
    let clients = [], sites = [];
    try { clients = await api.get('/api/clients') || []; } catch (e) {}
    try { sites = await api.get('/api/sites') || []; } catch (e) {}
    const clientOpts = clients.length ? clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : '';
    const siteCheckboxes = sites.map(s => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer"><input type="checkbox" class="site-cb" value="${s.id}" style="width:16px;height:16px"> ${esc(s.name)}</label>`).join('');
    showModal('Новый заказ', `
      ${formField('Клиент', clients.length ? `<select class="inp" id="m-client-id">${clientOpts}</select>` : `<input class="inp" type="text" id="m-client-name" placeholder="Имя клиента">`)}
      ${formField('Дата оплаты', `<input class="inp" type="date" id="m-paid-at" value="${new Date().toISOString().slice(0,10)}">`)}
      ${formField('Объём, куб', `<input class="inp" type="number" id="m-vol" placeholder="0">`)}
      ${formField('Цена, ₽/л', `<input class="inp" type="number" id="m-price" placeholder="74">`)}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-amount" placeholder="0">`)}
      ${formField('Тип доставки', `<div class="chips" data-group="deltype">
        <div class="chip sel" data-val="до Тынды">До Тынды</div>
        <div class="chip" data-val="до участка">До участка</div>
      </div>`)}
      ${formField('Участки', `<div style="max-height:150px;overflow-y:auto;padding:4px 0">${siteCheckboxes}</div>`)}
    `, async () => {
      const clientEl = document.getElementById('m-client-id');
      const clientNameEl = document.getElementById('m-client-name');
      const paid_at = document.getElementById('m-paid-at').value;
      const volume_ordered = parseFloat(document.getElementById('m-vol').value) || 0;
      const price_per_liter = parseFloat(document.getElementById('m-price').value) || 0;
      const amount_paid = parseFloat(document.getElementById('m-amount').value) || 0;
      const delivery_type = document.querySelector('.chips[data-group="deltype"] .chip.sel')?.dataset.val || 'до Тынды';
      const site_ids = [...document.querySelectorAll('.site-cb:checked')].map(cb => parseInt(cb.value));
      if (clientEl) {
        const client_id = parseInt(clientEl.value);
        await api.post('/api/orders', { client_id, paid_at, volume_ordered, price_per_liter, amount_paid, delivery_type, site_ids });
      } else {
        const client_name = clientNameEl?.value?.trim() || '';
        await api.post('/api/orders', { client_name, paid_at, volume_ordered, price_per_liter, amount_paid, delivery_type, site_ids });
      }
      toast('✅ Заказ создан!'); viewOrders();
    });
  };

  // ── Print / PDF helper ────────────────────────────────────────────────────
  let _printData = null;

  function printBtn(label) {
    return `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="window.printCurrentPage()">🖨 ${label || 'Печать / PDF'}</button>`;
  }

  window.printCurrentPage = function() {
    if (!_printData) return;
    window.openPrintWindow(_printData.title, _printData.columns, _printData.rows, _printData.totals);
  };

  window.openPrintWindow = function(title, columns, rows, totals) {
    const w = window.open('', '_blank', 'width=1050,height=720');
    const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c !== null && c !== undefined ? c : '—'}</td>`).join('')}</tr>`).join('');
    const tfoot = totals ? `<tfoot><tr>${totals.map(c => `<td><b>${c}</b></td>`).join('')}</tr></tfoot>` : '';
    w.document.write(`<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8"><title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Arial,sans-serif;color:#111;padding:18mm 18mm 12mm;font-size:12px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
.logo{font-size:22px;font-weight:900;letter-spacing:-1px}.logo-sub{font-size:10px;color:#666;margin-top:2px}
.meta{font-size:11px;color:#666;text-align:right}
h1{font-size:17px;font-weight:700;margin:4px 0 0}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
th{background:#f2f2f2;border:1px solid #bbb;padding:7px 8px;text-align:left;font-weight:600}
td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}
tr:nth-child(even) td{background:#fafafa}
tfoot td{background:#e8e8e8;font-weight:700;border:1px solid #bbb}
.pbar{margin-bottom:14px;display:flex;gap:8px}
.pbtn{background:#c8ff00;border:none;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;border-radius:6px}
.cbtn{background:#f0f0f0;border:none;padding:9px 14px;font-size:12px;cursor:pointer;border-radius:6px;color:#666}
.hint{font-size:11px;color:#999;align-self:center}
.footer{margin-top:18px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px;text-align:center}
@media print{.pbar{display:none}@page{margin:10mm 12mm}}
</style></head><body>
<div class="header">
  <div><div class="logo">DIZELTRADE</div><h1>${title}</h1></div>
  <div class="meta">Сформировано: ${new Date().toLocaleDateString('ru',{day:'2-digit',month:'2-digit',year:'numeric'})} ${new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}<br>DTL Менеджмент v2.0</div>
</div>
<div class="pbar">
  <button class="pbtn" onclick="window.print()">🖨 Печать / Сохранить PDF</button>
  <button class="cbtn" onclick="window.close()">✕ Закрыть</button>
  <span class="hint">Ctrl+P → «Сохранить как PDF» для цифровой подписи</span>
</div>
<table>
  <thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
  ${tfoot}
</table>
<div class="footer">Сперанский Василий · ${new Date().toLocaleDateString('ru',{year:'numeric',month:'long'})}</div>
</body></html>`);
    w.document.close();
  };

  // ── Income ────────────────────────────────────────────────────────────────
  async function viewIncome() {
    if (!isPartner()) { navigate('#home'); return; }
    let records = [];
    try { records = await api.get('/api/income') || []; } catch (e) {}
    const total = records.reduce((s, r) => s + (r.amount || 0), 0);
    const thisMonth = records.filter(r => { if (!r.income_at) return false; const d = new Date(r.income_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
    const monthTotal = thisMonth.reduce((s, r) => s + (r.amount || 0), 0);

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">💰 Доходы</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${isDesktop() ? `<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showIncomeModal()">+ Добавить</button></div>` : ''}
      <div class="stats">
        ${statCard(formatNum(total) + ' ₽', 'Итого доходы', 'a')}
        ${statCard(records.length, 'Записей')}
        ${statCard(formatNum(monthTotal) + ' ₽', 'За этот месяц', 'g')}
      </div>
      ${records.length ? records.map(r => `<div class="li" style="flex-direction:column;align-items:stretch;gap:4px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="lic g">💰</div>
          <div class="lit" style="flex:1">
            <div class="lim">${formatNum(r.amount)} ₽ · ${esc(r.client_name || '—')}</div>
            <div class="lis">${r.income_at ? new Date(r.income_at).toLocaleDateString('ru') : ''}${r.volume ? ` · ${r.volume} т` : ''}${r.entered_by_name ? ` · ${esc(r.entered_by_name)}` : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            ${isPartner() ? `<button onclick="window.correctIncome(${r.id},'${r.income_at ? r.income_at.slice(0,10) : ''}',${r.amount || 0},'${esc(r.comment||'')}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">✏ Испр.</button>` : ''}
          </div>
        </div>
        ${r.comment ? `<div style="font-size:12px;color:var(--text2);padding:4px 8px;background:var(--card2);border-radius:6px;margin-left:42px">${esc(r.comment)}</div>` : ''}
      </div>`).join('') : emptyState('Нет доходов')}
      ${!isDesktop() ? `<button class="btn-primary" style="margin-top:12px" onclick="showIncomeModal()">+ Добавить</button>` : ''}
      ${printBtn('Распечатать / PDF')}
    </div>`;
    _printData = { title: 'Доходы', columns: ['Дата', 'Клиент', 'Сумма ₽', 'Объём куб', 'Комментарий'],
      rows: records.map(r => [r.income_at ? new Date(r.income_at).toLocaleDateString('ru') : '—', r.client_name || '—', formatNum(r.amount), r.volume || '—', r.comment || '']),
      totals: ['Итого', '', formatNum(total) + ' ₽', '', ''] };
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Доходы';
  }

  window.correctIncome = function(id, income_at, amount, comment) {
    showCorrectionModal({
      title: 'Исправить запись доходов',
      fields: [
        { id: 'income_at', label: 'Дата', type: 'date', value: income_at },
        { id: 'amount', label: 'Сумма ₽', type: 'number', value: amount },
        { id: 'comment', label: 'Комментарий', value: comment || '' },
      ],
      onSubmit: async (data) => {
        await api.put('/api/income/' + id + '/correct', data);
        await viewIncome();
      },
    });
  };

  window.showIncomeModal = function () {
    showModal('Добавить доход', `
      ${formField('Дата', `<input class="inp" type="date" id="m-income-at" value="${new Date().toISOString().slice(0,10)}">`)}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-amount" placeholder="0">`)}
      ${formField('Комментарий', `<input class="inp" type="text" id="m-note" placeholder="Детали...">`)}
    `, async () => {
      const income_at = document.getElementById('m-income-at').value;
      const amount = parseFloat(document.getElementById('m-amount').value);
      const comment = document.getElementById('m-note').value;
      await api.post('/api/income', { income_at, amount, comment });
      toast('✅ Доход записан!');
      viewIncome();
    });
  };

  // ── Expenses ──────────────────────────────────────────────────────────────
  async function viewExpenses() {
    if (!isPartner()) { navigate('#home'); return; }
    let records = [];
    try { records = await api.get('/api/expenses') || []; } catch (e) {}
    const total = records.reduce((s, r) => s + (r.amount || 0), 0);
    const expThisMonth = records.filter(r => { if (!r.expense_at) return false; const d = new Date(r.expense_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
    const expMonthTotal = expThisMonth.reduce((s, r) => s + (r.amount || 0), 0);
    const uniqueCats = new Set(records.map(r => r.category).filter(Boolean)).size;

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📋 Расходы</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(formatNum(total) + ' ₽', 'Итого расходы', 'r')}
        ${statCard(formatNum(expMonthTotal) + ' ₽', 'За этот месяц', 'o')}
        ${statCard(uniqueCats || records.length, 'Категорий')}
      </div>
      ${records.length ? records.map(r => `<div class="li" style="flex-direction:column;align-items:stretch;gap:4px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="lic o">📋</div>
          <div class="lit" style="flex:1">
            <div class="lim">${formatNum(r.amount)} ₽ · ${esc(r.category || '—')}</div>
            <div class="lis">${r.expense_at ? new Date(r.expense_at).toLocaleDateString('ru') : ''}${r.entered_by_name ? ` · ${esc(r.entered_by_name)}` : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            ${isPartner() ? `<button onclick="window.correctExpense(${r.id},'${r.expense_at ? r.expense_at.slice(0,10) : ''}',${r.amount || 0},'${esc(r.category||'')}','${esc(r.comment||'')}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">✏ Испр.</button>` : ''}
          </div>
        </div>
        ${r.comment ? `<div style="font-size:12px;color:var(--text2);padding:4px 8px;background:var(--card2);border-radius:6px;margin-left:42px">${esc(r.comment)}</div>` : ''}
      </div>`).join('') : emptyState('Нет расходов')}
      <button class="btn-primary" style="margin-top:12px" onclick="showExpenseModal()">+ Добавить</button>
      ${printBtn('Распечатать / PDF')}
    </div>`;
    _printData = { title: 'Расходы компании', columns: ['Дата', 'Категория', 'Сумма ₽', 'Комментарий'],
      rows: records.map(r => [r.expense_at ? new Date(r.expense_at).toLocaleDateString('ru') : '—', r.category || '—', formatNum(r.amount), r.comment || '']),
      totals: ['Итого', '', formatNum(total) + ' ₽', ''] };
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Расходы';
  }

  window.correctExpense = function(id, expense_at, amount, category, comment) {
    showCorrectionModal({
      title: 'Исправить расход',
      fields: [
        { id: 'expense_at', label: 'Дата', type: 'date', value: expense_at },
        { id: 'amount', label: 'Сумма ₽', type: 'number', value: amount },
        { id: 'category', label: 'Категория', value: category || '' },
        { id: 'comment', label: 'Комментарий', value: comment || '' },
      ],
      onSubmit: async (data) => {
        await api.put('/api/expenses/' + id + '/correct', data);
        viewExpenses();
      },
    });
  };

  window.showExpenseModal = function () {
    const categories = ['Бухгалтерия', 'Аренда', 'Кредиты (тело)', 'Проценты по кредитам', 'Налоги/штрафы', 'Командировочные', 'Зарплата партнёрам', 'Финансовые расходы (налоги/вывод)', 'Прочие'];
    showModal('Добавить расход', `
      ${formField('Дата', `<input class="inp" type="date" id="m-expense-at" value="${new Date().toISOString().slice(0,10)}">`)}
      ${formField('Категория', chipGroup(categories, 'Прочие', 'exp-cat'))}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-amount" placeholder="0">`)}
      ${formField('Комментарий', `<input class="inp" type="text" id="m-note" placeholder="Детали...">`)}
    `, async () => {
      const expense_at = document.getElementById('m-expense-at').value;
      const catEl = document.querySelector('.chips[data-group="exp-cat"] .chip.sel');
      const category = catEl ? catEl.getAttribute('data-val') : 'Прочие';
      const amount = parseFloat(document.getElementById('m-amount').value);
      const comment = document.getElementById('m-note').value;
      await api.post('/api/expenses', { expense_at, category, amount, comment });
      toast('✅ Расход записан!');
      viewExpenses();
    });
  };

  // ── Hire ──────────────────────────────────────────────────────────────────
  async function viewHire() {
    if (!isPartner()) { navigate('#home'); return; }
    let deals = [];
    try { deals = await api.get('/api/hire') || []; } catch (e) {}

    const totalRevenue = deals.reduce((s, d) => s + (parseFloat(d.amount_client) || 0), 0);
    const totalMargin = deals.reduce((s, d) => s + (parseFloat(d.margin) || 0), 0);
    const avgMarginPct = totalRevenue > 0 ? Math.round(totalMargin / totalRevenue * 100) : 0;

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">🔁 Найм</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(deals.length, 'Всего сделок')}
        ${statCard(totalRevenue > 0 ? (totalRevenue/1000000).toFixed(1) + ' млн' : '—', 'Выручка ₽', 'a')}
        ${statCard(avgMarginPct + '%', 'Маржа ср.', 'g')}
      </div>
      ${deals.length ? deals.map(d => {
        const volCub = d.volume_liters ? (d.volume_liters / 1000).toFixed(1) : null;
        const marginColor = d.margin_pct >= 10 ? 'var(--green)' : d.margin_pct > 0 ? 'var(--orange)' : 'var(--red)';
        return `<div class="oc" style="padding:16px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="font-size:17px;font-weight:700;margin-bottom:3px">${esc(d.client_name || '—')}${d.carrier_name || d.carrier_custom ? ` <span style="color:var(--text2);font-weight:400">→</span> ${esc(d.carrier_name || d.carrier_custom)}` : ''}</div>
              <div style="font-size:13px;color:var(--text2)">${d.delivery_at ? new Date(d.delivery_at).toLocaleDateString('ru') : ''}${d.supplier_name ? ' · ⛽ ' + esc(d.supplier_name) : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${d.margin_pct ? `<div style="text-align:center"><div style="font-size:20px;font-weight:800;color:${marginColor}">${d.margin_pct}%</div><div style="font-size:11px;color:var(--text2)">маржа</div></div>` : ''}
              ${isPartner() ? `<button onclick="window.correctHire(${d.id},'${d.delivery_at ? d.delivery_at.slice(0,10) : ''}',${d.volume_liters||0},${d.price_client||0},${d.price_carrier||0},'${esc(d.comment||'')}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:4px 10px;font-size:12px;cursor:pointer">✏ Испр.</button>` : ''}
            </div>
          </div>
          ${d.volume_liters ? `<div style="font-size:15px;font-weight:600;margin-bottom:10px">📦 ${formatNum(d.volume_liters)} л${volCub ? ' <span style="font-size:13px;color:var(--text2);font-weight:400">(' + volCub + ' куб)</span>' : ''}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
            ${d.price_client ? `<div style="background:var(--card2);border-radius:8px;padding:8px 10px"><div style="font-size:16px;font-weight:700">${d.price_client} ₽/л</div><div style="font-size:11px;color:var(--text2);margin-top:2px">клиенту</div></div>` : '<div></div>'}
            ${d.price_supplier ? `<div style="background:var(--card2);border-radius:8px;padding:8px 10px"><div style="font-size:16px;font-weight:700">${d.price_supplier} ₽/л</div><div style="font-size:11px;color:var(--text2);margin-top:2px">поставщику</div></div>` : '<div></div>'}
            ${d.price_carrier ? `<div style="background:var(--card2);border-radius:8px;padding:8px 10px"><div style="font-size:16px;font-weight:700">${d.price_carrier} ₽/л</div><div style="font-size:11px;color:var(--text2);margin-top:2px">перевозчику</div></div>` : '<div></div>'}
          </div>
          <div style="display:flex;gap:16px;font-size:14px;flex-wrap:wrap">
            ${d.amount_client ? `<span>Выручка: <strong style="color:var(--green)">${formatNum(d.amount_client)} ₽</strong></span>` : ''}
            ${d.margin ? `<span>Маржа: <strong>${formatNum(d.margin)} ₽</strong></span>` : ''}
          </div>
          ${d.comment ? `<div style="font-size:13px;color:var(--text2);margin-top:8px;padding:6px 10px;background:var(--card2);border-radius:7px">${esc(d.comment)}</div>` : ''}
        </div>`;
      }).join('') : emptyState('Нет сделок')}
      <button class="btn-primary" style="margin-top:12px" onclick="showHireModal()">+ Новая сделка</button>
      ${printBtn('Распечатать / PDF')}
    </div>`;
    _printData = { title: 'Найм · Хабаровск → Тында', columns: ['Дата', 'Клиент', 'Поставщик', 'Перевозчик', 'Объём л', 'Цена кл. ₽/л', 'Выручка ₽', 'Маржа %'],
      rows: deals.map(d => [d.delivery_at ? new Date(d.delivery_at).toLocaleDateString('ru') : '—', d.client_name || '—', d.supplier_name || '—', d.carrier_name || d.carrier_custom || '—', formatNum(d.volume_liters), d.price_client || '—', formatNum(d.amount_client), (d.margin_pct || 0) + '%']),
      totals: ['Итого', '', '', '', '', '', formatNum(totalRevenue) + ' ₽', ''] };
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Найм';
  }

  window.correctHire = function(id, delivery_at, volume_liters, price_client, price_carrier, comment) {
    showCorrectionModal({
      title: 'Исправить сделку по найму',
      fields: [
        { id: 'delivery_at', label: 'Дата', type: 'date', value: delivery_at },
        { id: 'volume_liters', label: 'Объём литров', type: 'number', value: volume_liters },
        { id: 'price_client', label: 'Цена клиенту ₽/л', type: 'number', value: price_client },
        { id: 'price_carrier', label: 'Цена перевозчику ₽/л', type: 'number', value: price_carrier },
        { id: 'comment', label: 'Комментарий', value: comment || '' },
      ],
      onSubmit: async (data) => {
        await api.put('/api/hire/' + id + '/correct', data);
        viewHire();
      },
    });
  };

  window.showHireModal = async function () {
    let clients = [], suppliers = [], carriers = [];
    try { clients = await api.get('/api/clients') || []; } catch (e) {}
    try { suppliers = await api.get('/api/suppliers') || []; } catch (e) {}
    try { carriers = await api.get('/api/carriers') || []; } catch (e) {}
    const sel = (id, items, label) => `<select class="inp" id="${id}">
      <option value="">— выбери ${label} —</option>
      ${items.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join('')}
    </select>`;
    showModal('Новая сделка по найму', `
      ${formField('Дата сделки', `<input class="inp" type="date" id="m-deal-date" value="${new Date().toISOString().slice(0,10)}">`)}
      ${formField('Клиент', sel('m-client', clients, 'клиента'))}
      ${formField('Поставщик', sel('m-supplier', suppliers, 'поставщика'))}
      ${formField('Перевозчик', sel('m-carrier', carriers, 'перевозчика'))}
      ${formField('Объём, л', `<input class="inp" type="number" id="m-volume" placeholder="0" oninput="calcHireMargin()">`)}
      ${formField('Цена клиенту, ₽/л', `<input class="inp" type="number" id="m-price-c" placeholder="74" oninput="calcHireMargin()">`)}
      ${formField('Цена поставщику, ₽/л', `<input class="inp" type="number" id="m-price-s" placeholder="59" oninput="calcHireMargin()">`)}
      ${formField('Цена перевозчику, ₽/л', `<input class="inp" type="number" id="m-price-t" placeholder="7" oninput="calcHireMargin()">`)}
      <div class="auto-calc" id="hire-calc">Маржа: — ₽ (—%)</div>
    `, async () => {
      const client_id = parseInt(document.getElementById('m-client').value) || null;
      const supplier_id = parseInt(document.getElementById('m-supplier').value) || null;
      const carrier_id = parseInt(document.getElementById('m-carrier').value) || null;
      const delivery_at = document.getElementById('m-deal-date').value;
      const volume_liters = parseFloat(document.getElementById('m-volume').value) || 0;
      const price_client = parseFloat(document.getElementById('m-price-c').value) || 0;
      const price_supplier = parseFloat(document.getElementById('m-price-s').value) || 0;
      const price_carrier = parseFloat(document.getElementById('m-price-t').value) || 0;
      if (!client_id) throw new Error('Выберите клиента');
      if (!supplier_id) throw new Error('Выберите поставщика');
      await api.post('/api/hire', { client_id, supplier_id, carrier_id, delivery_at, volume_liters, price_client, price_supplier, price_carrier });
      toast('✅ Сделка записана!'); viewHire();
    });
  };

  window.calcHireMargin = function () {
    const pc = parseFloat(document.getElementById('m-price-c')?.value) || 0;
    const ps = parseFloat(document.getElementById('m-price-s')?.value) || 0;
    const pt = parseFloat(document.getElementById('m-price-t')?.value) || 0;
    const vol = parseFloat(document.getElementById('m-volume')?.value) || 0;
    const margin = pc - ps - pt;
    const marginPct = pc > 0 ? ((margin / pc) * 100).toFixed(1) : 0;
    const marginRub = margin * vol;
    const el = document.getElementById('hire-calc');
    if (el) el.innerHTML = `Маржа: <strong>${formatNum(Math.round(marginRub))} ₽</strong> (${marginPct}% от выручки)`;
  };

  // ── Debts ─────────────────────────────────────────────────────────────────
  async function viewDebts() {
    let balances = {}, records = [];
    try {
      const debtData = await api.get('/api/debts');
      if (debtData && debtData.records) {
        records = debtData.records;
        balances = debtData.balances || {};
      }
    } catch (e) {}

    const balanceEntries = Object.entries(balances);

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📄 Долги</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${balanceEntries.length ? `<div class="bb">${balanceEntries.map(([debtor, bal]) => `<div class="bbr"><div class="bbl">${esc(debtor)}</div><div class="bbv" style="color:var(--${bal > 0 ? 'orange' : 'green'})">${bal > 0 ? '+' : ''}${formatNum(bal)} ₽</div></div>`).join('')}</div>` : ''}
      ${records.length ? records.map(r => `<div class="li">
        <div class="lic ${r.type === 'ДОЛГ' ? 'o' : 'g'}">📄</div>
        <div class="lit"><div class="lim">${esc(r.debtor)} — ${formatNum(Math.abs(r.amount))} ₽</div><div class="lis">${[r.type === 'ОПЛАТА' ? 'Оплата' : '', r.comment || '', r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('ru') : ''].filter(Boolean).join(' · ')}</div></div>
        <div class="lir" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${isPartner() ? `<button onclick="window.correctDebt(${r.id},'${r.recorded_at ? r.recorded_at.slice(0,10) : ''}',${r.amount||0},'${esc(r.type||'ДОЛГ')}','${esc(r.comment||'')}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">✏ Испр.</button>` : ''}
        </div>
      </div>`).join('') : emptyState('Нет записей')}
      ${isPartner() ? `<button class="btn-primary" style="margin-top:12px" onclick="showDebtModal()">+ Запись</button>` : ''}
      ${isPartner() ? printBtn('Распечатать / PDF') : ''}
    </div>`;
    const totalDebt = records.filter(r => r.type === 'ДОЛГ').reduce((s,r) => s + (r.amount || 0), 0);
    const totalPaid = records.filter(r => r.type === 'ОПЛАТА').reduce((s,r) => s + (Math.abs(r.amount) || 0), 0);
    _printData = { title: 'Долги и платежи', columns: ['Дата', 'Контрагент', 'Тип', 'Сумма ₽', 'Комментарий'],
      rows: records.map(r => [r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('ru') : '—', r.debtor || '—', r.type || 'ДОЛГ', formatNum(Math.abs(r.amount)), r.comment || '']),
      totals: ['', 'Долг: ' + formatNum(totalDebt) + ' · Оплачено: ' + formatNum(totalPaid), '', '', ''] };
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Долги';
  }

  window.correctDebt = function(id, recorded_at, amount, type, comment) {
    showCorrectionModal({
      title: 'Исправить запись долга',
      fields: [
        { id: 'recorded_at', label: 'Дата', type: 'date', value: recorded_at },
        { id: 'amount', label: 'Сумма ₽', type: 'number', value: amount },
        { id: 'type', label: 'Тип (ДОЛГ / ОПЛАТА)', value: type || 'ДОЛГ' },
        { id: 'comment', label: 'Комментарий', value: comment || '' },
      ],
      onSubmit: async (data) => {
        await api.put('/api/debts/' + id + '/correct', data);
        viewDebts();
      },
    });
  };

  window.showDebtModal = function () {
    showModal('Добавить запись долга', `
      ${formField('Дата', `<input class="inp" type="date" id="m-recorded-at" value="${new Date().toISOString().slice(0,10)}">`)}
      ${formField('Контрагент (должник)', `<input class="inp" type="text" id="m-cp" placeholder="Кто">`)}
      ${formField('Тип', `<div class="chips" data-group="debt-type"><div class="chip sel" data-val="ДОЛГ">Долг</div><div class="chip" data-val="ОПЛАТА">Оплата</div></div>`)}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-amount" placeholder="0">`)}
      ${formField('Комментарий', `<input class="inp" type="text" id="m-note" placeholder="Детали...">`)}
    `, async () => {
      const recorded_at = document.getElementById('m-recorded-at').value;
      const debtor = document.getElementById('m-cp').value;
      const typeEl = document.querySelector('.chips[data-group="debt-type"] .chip.sel');
      const type = typeEl ? typeEl.getAttribute('data-val') : 'ДОЛГ';
      const amount = parseFloat(document.getElementById('m-amount').value);
      const comment = document.getElementById('m-note').value;
      await api.post('/api/debts', { recorded_at, debtor, type, amount, comment });
      toast('✅ Записано!');
      viewDebts();
    });
  };

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async function viewDashboard() {
    let dash = null, orders = [];
    try { dash = await api.get('/api/dashboard'); } catch (e) {}
    try { orders = await api.get('/api/orders') || []; } catch (e) {}

    const baseBalance = dash?.base_balance ?? null;
    const tripsInTransit = dash?.trips_in_transit ?? null;
    const pendingReceipts = dash?.pending_receipts ?? null;
    const artemCashBalance = dash?.artem_cash_balance ?? null;
    const artemDebt = dash?.artem_debt || 0;
    const alerts = dash?.alerts || [];

    const clientDebts = dash?.client_debts || [];
    const trucksMonth = dash?.trucks_month || [];
    const curMonthName = new Date().toLocaleString('ru',{month:'long'});

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📊 Дашборд</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(baseBalance != null ? baseBalance + ' куб' : '—', 'Остаток на базе', 'a')}
        ${statCard(tripsInTransit != null ? tripsInTransit : '—', 'Рейсов в пути', 'o')}
        ${statCard(pendingReceipts != null ? pendingReceipts : '—', 'Ждут подтвержд.')}
      </div>

      ${clientDebts.length ? `
        ${sectionHeader('Долги клиентов')}
        ${clientDebts.map(c => {
          const debt = c.debt;
          const color = debt > 0 ? 'var(--red)' : debt < 0 ? 'var(--green)' : 'var(--text2)';
          return `<div class="li">
            <div class="lic r">💸</div>
            <div class="lit">
              <div class="lim">${esc(c.name)}</div>
              <div class="lis">Отгружено ${formatNum(c.total_hire)} ₽ · Оплачено ${formatNum(c.total_paid)} ₽</div>
            </div>
            <div class="lir"><div style="font-size:14px;font-weight:700;color:${color}">${debt > 0 ? '+' : ''}${formatNum(Math.round(debt))} ₽</div></div>
          </div>`;
        }).join('')}
      ` : ''}

      ${trucksMonth.length ? `
        ${sectionHeader('Машины · ' + curMonthName)}
        ${trucksMonth.map(t => `<div class="li">
          <div class="lic y">🚛</div>
          <div class="lit">
            <div class="lim">${esc(t.name)}${t.status === 'for_sale' ? ' <span style="font-size:10px;color:var(--orange)">на продаже</span>' : ''}</div>
            <div class="lis">${t.trips ? t.trips + ' рейсов' : 'рейсов нет'}${t.revenue ? ' · ' + formatNum(t.revenue) + ' ₽' : ''}</div>
          </div>
          <div class="lir" style="text-align:right">
            ${t.expenses ? `<div style="font-size:12px;color:var(--red)">−${formatNum(t.expenses)} ₽</div>` : '<div style="font-size:12px;color:var(--text3)">—</div>'}
          </div>
        </div>`).join('')}
      ` : ''}

      ${sectionHeader('Долг DTL перед Артёмом')}
      ${balanceBox(
        [{ label: 'Задолженность по рейсам', val: formatNum(artemDebt) + ' ₽', color: 'red' }, { label: 'Остаток наличных у Артёма', val: formatNum(artemCashBalance) + ' ₽', color: 'green' }],
        'Долг DTL',
        formatNum(Math.max(0, artemDebt)) + ' ₽',
        'orange'
      )}
      ${alerts.length ? `
        ${sectionHeader('Алерты')}
        ${alerts.map(a => `<div style="background:${a.severity==='warning'?'rgba(255,165,0,.1)':a.severity==='critical'?'rgba(255,50,50,.1)':'rgba(100,100,100,.1)'};border:1px solid ${a.severity==='warning'?'var(--orange)':a.severity==='critical'?'var(--red)':'var(--border)'};border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:13px;color:var(--text)">
          ${a.severity === 'warning' ? '⚠️' : a.severity === 'critical' ? '🔴' : 'ℹ️'} ${esc(a.message)}
        </div>`).join('')}
      ` : `<div class="empty-state" style="color:var(--green)">✅ Всё в порядке, нет активных алертов</div>`}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('dashboard');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Дашборд';
  }

  // ── Fleet ─────────────────────────────────────────────────────────────────
  async function viewFleet() {
    let trucks = [];
    let archivedTrucks = [];
    let artemDebtData = null;
    try { trucks = (isArtem() ? await api.get('/api/trucks?owner=Артём') : await api.get('/api/trucks')) || []; } catch (e) {}
    if (isPartner() || isArtem()) {
      try {
        const all = (isArtem() ? await api.get('/api/trucks?owner=Артём&status=archived') : await api.get('/api/trucks?status=archived')) || [];
        archivedTrucks = all;
      } catch (e) {}
    }
    if (isArtem()) {
      try { artemDebtData = await api.get('/api/base/artem-debt'); } catch (e) {}
    }

    const debtRub = artemDebtData ? (artemDebtData.debt_rub || 0) : 0;
    const debtBalance = debtRub;
    const debtMln = debtBalance > 0 ? (debtBalance / 1000000).toFixed(2) : '0';

    // Aggregate trips and revenue from truck data
    const tripsMonth = trucks.reduce((s, t) => s + (t.trips_month || 0), 0);

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">${isArtem() ? '🏗 Мой автопарк' : '🚛 Автопарк DTL'}</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${isArtem() ? `<div class="role-tag">Управляешь сам · партнёры DTL видят P&amp;L только просмотром</div>` : ''}
      <div class="stats">
        ${statCard(trucks.length || '—', 'Машин')}
        ${statCard(tripsMonth || '—', 'Рейсов (май)', 'o')}
        ${isArtem() ? statCard(debtMln, 'Долг DTL млн', 'r') : statCard('—', 'Долг DTL млн', 'r')}
      </div>
      ${sectionHeader('Машины')}
      ${(isPartner() || isArtem()) ? `<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn-primary" onclick="showAddTruckModal()">+ Добавить машину</button></div>` : ''}
      ${trucks.length ? trucks.map(t => `<div class="li">
        <div class="lic y">🚛</div>
        <div class="lit">
          <div class="lim" style="display:flex;align-items:center;gap:6px">${esc(t.name)}${t.status === 'for_sale' ? `<span style="font-size:10px;font-weight:600;background:rgba(255,165,0,.15);border:1px solid var(--orange);color:var(--orange);border-radius:5px;padding:2px 7px;line-height:1.4;flex-shrink:0">На продаже</span>` : ''}</div>
          <div class="lis">${t.trips_month || 0} рейсов · ${t.plate || '—'}</div>
        </div>
        <div class="lir" style="display:flex;gap:6px;align-items:center">
          ${t.revenue_month ? `<span style="font-size:13px;font-weight:600">${formatNum(t.revenue_month)} ₽</span>` : ''}
          ${(isPartner() || isArtem()) ? `<button onclick="showEditTruckModal(${t.id},'${esc(t.name)}','${esc(t.plate||'')}',${t.tank_volume||0})" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer">✏ Изм.</button>` : ''}
          ${(isPartner() || isArtem()) && t.status === 'active' ? `<button onclick="setTruckForSale(${t.id})" style="background:rgba(255,165,0,.1);border:1px solid rgba(255,165,0,.3);color:var(--orange);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer">🏷 На продажу</button>` : ''}
          ${(isPartner() || isArtem()) && t.status === 'for_sale' ? `<button onclick="activateTruck(${t.id})" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer">↩ Снять</button>` : ''}
          ${(isPartner() || isArtem()) ? `<button onclick="archiveTruck(${t.id})" style="background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.25);color:var(--red);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer">📦 Арх.</button>` : ''}
        </div>
      </div>`).join('') : emptyState('Нет машин')}
      ${(isPartner() || isArtem()) && archivedTrucks.length ? `
      <details style="margin-top:16px">
        <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--text2);padding:10px 0;list-style:none;display:flex;align-items:center;gap:6px">
          <span>▶</span> Архив (${archivedTrucks.length})
        </summary>
        <div style="margin-top:8px">
          ${archivedTrucks.map(t => `<div class="li" style="opacity:.7">
            <div class="lic" style="background:var(--card2)">📦</div>
            <div class="lit">
              <div class="lim">${esc(t.name)}</div>
              <div class="lis">${t.plate || '—'} · архивирована</div>
            </div>
            <div class="lir">
              <button onclick="unarchiveTruck(${t.id})" style="background:rgba(100,200,100,.1);border:1px solid rgba(100,200,100,.3);color:var(--green);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer">↩ Вернуть</button>
            </div>
          </div>`).join('')}
        </div>
      </details>
      ` : ''}
      ${isArtem() ? `
      ${sectionHeader('Внести расход')}
      ${formField('Машина', chipGroup(trucks.map(t => ({ value: String(t.id), label: t.name })), trucks[0] ? String(trucks[0].id) : '', 'fleet-truck'))}
      ${formField('Категория', chipGroup(['Ремонт', 'ТО', 'Зарплата', 'Топливо', 'Резина', 'Прочее'], 'Ремонт', 'fleet-cat'))}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="fleet-amount" placeholder="0">`)}
      ${formField('Комментарий', `<input class="inp" type="text" id="fleet-note" placeholder="Детали...">`)}
      <button class="btn-primary" onclick="submitFleetExpense()">Записать расход</button>
      ${sectionHeader('Долг DTL передо мной')}
      <div class="bb">
        <div class="bbr"><div class="bbl">Рейсы моих машин (всего)</div><div class="bbv" style="color:var(--red)">${formatNum(Math.round(debtRub))} ₽</div></div>
        <div class="bbt"><span style="color:var(--text2)">DTL мне должна</span><span style="color:var(--orange)">${formatNum(Math.round(debtBalance))} ₽</span></div>
      </div>
      ` : ''}
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Автопарк';
  }

  window.showAddTruckModal = function () {
    showModal('Добавить машину', `
      ${formField('Название / марка', `<input class="inp" type="text" id="m-truck-name" placeholder="Шахман-4, Сайгак...">`)}
      ${formField('Объём бочки, куб', `<input class="inp" type="number" id="m-truck-cap" placeholder="23.5">`)}
      ${formField('Гос. номер', `<input class="inp" type="text" id="m-truck-plate" placeholder="А000АА000">`)}
    `, async () => {
      const name = document.getElementById('m-truck-name').value.trim();
      const capacity_m3 = parseFloat(document.getElementById('m-truck-cap').value) || null;
      const plate_number = document.getElementById('m-truck-plate').value.trim();
      if (!name) throw new Error('Введите название машины');
      await api.post('/api/trucks', { name, tank_volume: capacity_m3, plate: plate_number, owner: isArtem() ? 'Артём' : 'DTL' });
      toast('✅ Машина добавлена!');
      viewFleet();
    });
  };

  window.showEditTruckModal = function (id, name, plate, tank) {
    showModal('Редактировать машину', `
      ${formField('Название / марка', `<input class="inp" type="text" id="m-truck-name" value="${esc(name)}" placeholder="Шахман-4...">`)}
      ${formField('Объём бочки, куб', `<input class="inp" type="number" id="m-truck-cap" value="${tank||''}" placeholder="23.5">`)}
      ${formField('Гос. номер', `<input class="inp" type="text" id="m-truck-plate" value="${esc(plate)}" placeholder="А000АА000">`)}
    `, async () => {
      const nm = document.getElementById('m-truck-name').value.trim();
      const capacity_m3 = parseFloat(document.getElementById('m-truck-cap').value) || null;
      const plate_number = document.getElementById('m-truck-plate').value.trim();
      if (!nm) throw new Error('Введите название');
      await api.put(`/api/trucks/${id}`, { name: nm, tank_volume: capacity_m3, plate: plate_number });
      toast('✅ Сохранено'); viewFleet();
    });
  };

  window.archiveTruck = function (id) {
    showModal('Архивировать машину?', `<p style="color:var(--text2)">Машина будет скрыта из списка. Данные сохранятся.</p>`, async () => {
      await api.put(`/api/trucks/${id}/archive`);
      toast('📦 Машина архивирована'); viewFleet();
    });
  };

  window.unarchiveTruck = function (id) {
    showModal('Восстановить машину?', `<p style="color:var(--text2)">Машина вернётся в активный список.</p>`, async () => {
      await api.put(`/api/trucks/${id}/unarchive`);
      toast('✅ Машина восстановлена'); viewFleet();
    });
  };

  window.setTruckForSale = function (id) {
    showModal('Выставить на продажу?', `<p style="color:var(--text2)">Машина останется в работе, но будет отмечена как «На продаже».</p>`, async () => {
      await api.put(`/api/trucks/${id}/for-sale`);
      toast('🏷 Машина выставлена на продажу'); viewFleet();
    });
  };

  window.activateTruck = function (id) {
    showModal('Снять с продажи?', `<p style="color:var(--text2)">Статус изменится обратно на «Активна».</p>`, async () => {
      await api.put(`/api/trucks/${id}/activate`);
      toast('✅ Статус обновлён'); viewFleet();
    });
  };

  window.submitFleetExpense = async function () {
    const truckEl = document.querySelector('.chips[data-group="fleet-truck"] .chip.sel');
    const catEl = document.querySelector('.chips[data-group="fleet-cat"] .chip.sel');
    const amount = parseFloat(document.getElementById('fleet-amount')?.value) || 0;
    const note = document.getElementById('fleet-note')?.value || '';
    try {
      const truck_id = parseInt(truckEl?.getAttribute('data-val')) || null;
      if (!truck_id) { toast('Выберите машину', 'error'); return; }
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/api/fleet/expenses', { truck_id, expense_at: today, category: catEl ? catEl.getAttribute('data-val') : 'Прочее', amount, comment: note });
      toast('✅ Расход записан!');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── AI Chat ───────────────────────────────────────────────────────────────
  const AI_STORAGE_KEY = 'dtl_ai_chat';
  let _aiMessages = (() => {
    try { return JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '[]'); } catch { return []; }
  })();
  let _aiPanelOpen = false;

  function _saveAiMessages() {
    try { localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(_aiMessages.slice(-60))); } catch {}
  }

  function _timeLabel(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }

  function _renderAiPanel() {
    let panel = document.getElementById('ai-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ai-panel';
      document.body.appendChild(panel);
    }
    const mob = !isDesktop();
    panel.style.cssText = mob
      ? 'position:fixed;inset:0;background:var(--bg);z-index:9100;display:flex;flex-direction:column'
      : 'position:fixed;top:56px;right:16px;width:370px;height:calc(100vh - 72px);background:var(--card);border:1px solid var(--border);border-radius:16px;z-index:9100;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.4)';

    const msgs = _aiMessages.filter(m => !m.loading).map((m, i) => {
      const isUser = m.role === 'user';
      const confirmBtns = m.action ? `<div style="display:flex;gap:8px;margin-top:10px">
        <button id="ai-confirm-${i}" onclick="window.confirmAiAction(${i})" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:9px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer">✅ Подтвердить</button>
        <button onclick="window.cancelAiAction(${i})" style="flex:1;background:var(--card);border:1px solid var(--border);color:var(--text2);border-radius:9px;padding:9px 14px;font-size:13px;cursor:pointer">Отмена</button>
      </div>` : '';
      return `<div style="display:flex;flex-direction:column;align-items:${isUser ? 'flex-end' : 'flex-start'};gap:2px">
        <div style="max-width:86%;background:${isUser ? 'var(--accent)' : m.action ? 'rgba(196,180,84,.12)' : 'var(--card2)'};${m.action ? 'border:1px solid rgba(196,180,84,.4);' : ''}color:${isUser ? '#000' : 'var(--text)'};border-radius:${isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px'};padding:10px 14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word">${esc(m.text)}${confirmBtns}</div>
        <div style="font-size:10px;color:var(--text3);padding:0 4px">${_timeLabel(m.ts)}</div>
      </div>`;
    }).join('');

    const hasLoading = _aiMessages.some(m => m.loading);
    const loadingBubble = hasLoading ? `<div style="display:flex;align-items:flex-start;gap:2px;flex-direction:column">
      <div style="background:var(--card2);border-radius:4px 16px 16px 16px;padding:12px 16px;font-size:18px;color:var(--text2);letter-spacing:2px">●●●</div>
    </div>` : '';

    const empty = _aiMessages.length === 0
      ? `<div style="color:var(--text3);font-size:13px;text-align:center;margin:auto;padding:24px;line-height:1.8">
          Привет! Я ИИ-ассистент DTL.<br>Могу помочь с данными или подсказать как пользоваться системой.<br><br>
          <span style="color:var(--text2);font-size:12px">Например:</span><br>
          Как записать новый рейс?<br>
          Сколько выручки за май?<br>
          Кто самый крупный клиент?
        </div>` : '';

    panel.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">
        ${mob ? `<button onclick="window.closeAiChat()" style="background:none;border:none;color:var(--text2);font-size:22px;cursor:pointer;padding:0;line-height:1">‹</button>` : ''}
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700">ИИ-ассистент</div>
          <div style="font-size:11px;color:var(--green)">● claude opus</div>
        </div>
        <button onclick="_aiClearChat()" style="background:none;border:none;color:var(--text3);font-size:11px;cursor:pointer;padding:4px 8px">Очистить</button>
        ${!mob ? `<button onclick="window.closeAiChat()" style="background:none;border:none;color:var(--text2);font-size:22px;cursor:pointer;line-height:1;padding:0 4px">×</button>` : ''}
      </div>
      <div id="ai-msgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth">${empty}${msgs}${loadingBubble}</div>
      <div style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0;align-items:flex-end">
        <button id="ai-voice-btn" onclick="window.startVoiceInput()" title="Голосовой ввод" style="background:var(--card2);border:1px solid var(--border);border-radius:12px;width:40px;height:40px;font-size:18px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">🎤</button>
        <textarea id="ai-chat-input" placeholder="Написать или нажать 🎤..." rows="1" style="flex:1;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:10px 14px;color:var(--text);font-size:14px;outline:none;font-family:inherit;resize:none;max-height:100px;line-height:1.4;overflow:hidden" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.sendAiMessage()}"></textarea>
        <button id="ai-chat-btn" onclick="window.sendAiMessage()" style="background:var(--accent);color:#000;border:none;border-radius:12px;width:40px;height:40px;font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">↑</button>
      </div>`;

    const msgsEl = document.getElementById('ai-msgs');
    if (msgsEl) setTimeout(() => { msgsEl.scrollTop = msgsEl.scrollHeight; }, 0);
    if (!hasLoading) setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 50);
  }

  window._aiClearChat = function() {
    _aiMessages = [];
    _saveAiMessages();
    _renderAiPanel();
  };

  window.openAiChat = function() {
    _aiPanelOpen = true;
    _renderAiPanel();
  };

  window.closeAiChat = function() {
    _aiPanelOpen = false;
    document.getElementById('ai-panel')?.remove();
  };

  window.sendAiMessage = async function() {
    const input = document.getElementById('ai-chat-input');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    input.style.height = 'auto';

    _aiMessages.push({ role: 'user', text: q, ts: Date.now() });
    _aiMessages.push({ role: 'assistant', text: '', loading: true, ts: Date.now() });
    _saveAiMessages();
    _renderAiPanel();

    try {
      const res = await api.post('/api/ai/query', { question: q });
      const idx = _aiMessages.length - 1;
      if (res.type === 'action') {
        _aiMessages[idx] = { role: 'assistant', text: res.description || 'Записать?', action: res.action, actionData: res.data, ts: Date.now() };
      } else {
        _aiMessages[idx] = { role: 'assistant', text: res.answer || 'Нет ответа', ts: Date.now() };
      }
    } catch (e) {
      _aiMessages[_aiMessages.length - 1] = { role: 'assistant', text: 'Ошибка соединения. Попробуйте ещё раз.', ts: Date.now() };
    }
    _saveAiMessages();
    _renderAiPanel();
  };

  window.confirmAiAction = async function(idx) {
    const msg = _aiMessages[idx];
    if (!msg || !msg.action) return;
    const btn = document.getElementById('ai-confirm-' + idx);
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      const res = await api.post('/api/ai/execute', { action: msg.action, data: msg.actionData });
      delete _aiMessages[idx].action; delete _aiMessages[idx].actionData;
      _aiMessages.push({ role: 'assistant', text: '✅ ' + (res.message || 'Записано!'), ts: Date.now() });
      _saveAiMessages(); _renderAiPanel();
      toast('✅ ' + (res.message || 'Записано'));
    } catch (e) { toast('Ошибка: ' + e.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Подтвердить'; } }
  };

  window.cancelAiAction = function(idx) {
    const msg = _aiMessages[idx];
    if (!msg) return;
    delete msg.action; delete msg.actionData;
    _aiMessages.push({ role: 'assistant', text: 'Хорошо, отменено.', ts: Date.now() });
    _saveAiMessages(); _renderAiPanel();
  };

  window.startVoiceInput = function() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Голосовой ввод недоступен в этом браузере', 'error'); return; }
    const recog = new SR();
    recog.lang = 'ru-RU'; recog.continuous = false; recog.interimResults = false;
    const btn = document.getElementById('ai-voice-btn');
    if (btn) { btn.textContent = '🔴'; btn.style.background = 'rgba(255,59,48,.15)'; btn.style.borderColor = 'var(--red)'; }
    recog.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const input = document.getElementById('ai-chat-input');
      if (input) { input.value = t; input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight,100)+'px'; }
      if (btn) { btn.textContent = '🎤'; btn.style.background=''; btn.style.borderColor=''; }
      window.sendAiMessage();
    };
    recog.onerror = recog.onend = () => { if (btn) { btn.textContent='🎤'; btn.style.background=''; btn.style.borderColor=''; } };
    recog.start();
  };

  window.scanTTN = async function(inputId) {
    const file = document.getElementById(inputId)?.files[0];
    if (!file) return;
    const btn = document.getElementById(inputId + '-scan');
    if (btn) { btn.textContent = '⏳ Распознаём...'; btn.disabled = true; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/upload/ttn', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + api.getToken() },
        body: fd,
      });
      if (!upRes.ok) throw new Error('Ошибка загрузки фото');
      const { url } = await upRes.json();

      const scanRes = await fetch('/api/ai/scan-ttn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.getToken() },
        body: JSON.stringify({ image_url: url }),
      });
      if (!scanRes.ok) throw new Error('AI недоступен');
      const { data } = await scanRes.json();

      if (data.ttn_number) {
        const ttnInput = document.getElementById('f-ttn') || document.getElementById('f-ttn-d');
        if (ttnInput) { ttnInput.value = data.ttn_number; ttnInput.style.borderColor = 'var(--green)'; }
      }
      if (data.temperature) {
        const tempInput = document.getElementById('f-temp');
        if (tempInput) { tempInput.value = data.temperature; tempInput.style.borderColor = 'var(--green)'; if (window.recalcReceipt) recalcReceipt(); }
      }
      if (data.density) {
        const densInput = document.getElementById('f-density');
        if (densInput) { densInput.value = data.density; densInput.style.borderColor = 'var(--green)'; if (window.recalcReceipt) recalcReceipt(); }
      }
      if (data.volume_cubic) {
        const volInput = document.getElementById('f-volume');
        if (volInput) { volInput.value = data.volume_cubic; volInput.style.borderColor = 'var(--green)'; if (window.recalcReceipt) recalcReceipt(); }
      }

      toast('✅ ТТН распознан! Проверьте поля.');
      if (btn) { btn.textContent = '✅ Распознан'; btn.disabled = false; }
    } catch (e) {
      toast('AI: ' + e.message, 'error');
      if (btn) { btn.textContent = '🔍 Распознать ТТН (Claude AI)'; btn.disabled = false; }
    }
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  }

  window.subscribePush = async function() {
    const btn = document.getElementById('push-subscribe-btn');
    if (btn) btn.disabled = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast('Уведомления заблокированы', 'error'); if (btn) btn.disabled = false; return; }
      const reg = await navigator.serviceWorker.ready;
      const keyResp = await fetch('/api/notifications/vapid-public-key');
      const { key } = await keyResp.json();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      const j = sub.toJSON();
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.getToken() },
        body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }),
      });
      toast('✅ Push-уведомления подключены!');
      if (btn) { btn.textContent = '✅ Подключено'; btn.disabled = false; }
    } catch (e) {
      toast('Ошибка подписки: ' + e.message, 'error');
      if (btn) btn.disabled = false;
    }
  };

  // ── Logs / Аудит ─────────────────────────────────────────────────────────
  async function viewLogs() {
    let logs = [];
    try { logs = await api.get('/api/logs?limit=500') || []; } catch (e) {}

    const actionColors = { INSERT: 'var(--green)', UPDATE: 'var(--orange)', CORRECTION: 'var(--red)', DELETE: 'var(--red)' };
    const tableNames = { fuel_receipts: 'Приёмка', fuel_dispatches: 'Рейс', income_records: 'Доход', company_expenses: 'Расход', debt_records: 'Долг', hire_deliveries: 'Найм', orders: 'Заказ', trucks: 'Машина' };

    const rows = logs.length ? logs.map(l => `<div class="li">
      <div class="lic" style="background:var(--card2);font-size:10px;color:${actionColors[l.action]||'var(--text2)'};font-weight:700">${(l.action||'').slice(0,3)}</div>
      <div class="lit">
        <div class="lim">${esc(tableNames[l.table_name] || l.table_name || '?')} #${l.record_id || '?'}</div>
        <div class="lis">${l.user_name || l.user_id || '?'} · ${l.created_at ? new Date(l.created_at).toLocaleString('ru') : ''}</div>
        ${l.reason ? `<div class="lis" style="color:var(--orange)">Причина: ${esc(l.reason)}</div>` : ''}
      </div>
      <div class="lir"><span style="font-size:10px;color:${actionColors[l.action]||'var(--text2)'}">${esc(l.action||'')}</span></div>
    </div>`).join('') : emptyState('Нет записей');

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">🕐 История записей</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${infoTag('Все изменения в системе · от новых к старым')}
      ${rows}
    </div>`;

    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'История записей';
  }

  async function viewSettings() {
    let sites = [], tariffs = [], suppliers = [], carriers = [], settings = [], clients = [];
    try { sites = await api.get('/api/sites') || []; } catch (e) {}
    try { tariffs = await api.get('/api/tariffs') || []; } catch (e) {}
    try { suppliers = await api.get('/api/suppliers') || []; } catch (e) {}
    try { carriers = await api.get('/api/carriers') || []; } catch (e) {}
    try { settings = await api.get('/api/settings') || []; } catch (e) {}
    try { clients = await api.get('/api/clients') || []; } catch (e) {}

    let aiUsage = null;
    let apiTokens = [];
    let sessions = [];
    if (isPartner()) {
      try { aiUsage = await api.get('/api/ai/usage'); } catch(e) {}
      try { apiTokens = await api.get('/api/tokens') || []; } catch(e) {}
      try { sessions = await api.get('/api/auth/sessions') || []; } catch(e) {}
    }

    const getSetting = (key, def) => { const s = settings.find(x => x.key === key); return s ? s.value : def; };

    const pushSupported = ('Notification' in window && 'serviceWorker' in navigator);
    let pushPermState = pushSupported ? Notification.permission : 'unsupported';
    let pushBtnLabel = 'Подключить уведомления';
    if (pushPermState === 'granted') pushBtnLabel = '✅ Подключено (обновить)';
    if (pushPermState === 'denied') pushBtnLabel = '🚫 Заблокировано в браузере';

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">⚙️ Настройки</div><div style="width:55px"></div></div>` : ''}
    <div class="content">

      ${sectionHeader('Push-уведомления')}
      ${pushSupported ? `<div class="bb">
        <div class="bbr"><div class="bbl">Статус</div><div class="bbv">${pushPermState === 'granted' ? '<span style="color:var(--green)">✅ Разрешены</span>' : pushPermState === 'denied' ? '<span style="color:var(--red)">🚫 Заблокированы</span>' : '<span style="color:var(--text2)">Не запрошено</span>'}</div></div>
      </div>
      <button id="push-subscribe-btn" class="btn-secondary" style="width:100%;margin-top:8px" onclick="subscribePush()" ${pushPermState === 'denied' ? 'disabled' : ''}>${pushBtnLabel}</button>` : `<div class="info-tag">Push-уведомления не поддерживаются в этом браузере</div>`}

      ${sectionHeader('Участки')}
      ${sites.map(s => `<div class="li">
        <div class="lic b">📍</div>
        <div class="lit"><div class="lim">${esc(s.name)}</div></div>
        <div class="lir">${s.is_active ? badge('Активен','done') : badge('Скрыт','cancelled')}
          ${isPartner() ? `<button onclick="toggleSite(${s.id},${!s.is_active})" style="margin-left:8px;background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">${s.is_active ? 'Скрыть' : 'Показать'}</button>` : ''}
        </div>
      </div>`).join('')}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addSiteModal()">+ Добавить участок</button>` : ''}

      ${sectionHeader('Поставщики (источники топлива)')}
      ${suppliers.map(s => `<div class="li">
        <div class="lic g">⛽</div>
        <div class="lit"><div class="lim">${esc(s.name)}</div></div>
        <div class="lir">${s.is_active !== false ? badge('Активен','done') : badge('Скрыт','cancelled')}</div>
      </div>`).join('')}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addSupplierModal()">+ Добавить поставщика</button>` : ''}

      ${sectionHeader('Перевозчики')}
      ${carriers.map(c => `<div class="li">
        <div class="lic tr">🚛</div>
        <div class="lit"><div class="lim">${esc(c.name)}</div></div>
        <div class="lir">${c.is_active ? badge('Активен','done') : badge('Скрыт','cancelled')}</div>
      </div>`).join('')}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addCarrierModal()">+ Добавить перевозчика</button>` : ''}

      ${sectionHeader('Тарифы')}
      ${(() => {
        const tariffMatrix = {};
        tariffs.forEach(t => {
          const key = t.site_id;
          if (!tariffMatrix[key]) tariffMatrix[key] = { site_name: t.site_name, DTL: null, 'Артём': null, 'наёмная': null };
          tariffMatrix[key][t.truck_owner] = t;
        });
        const tariffRows = Object.values(tariffMatrix).map(row => `
          <div class="li" style="align-items:flex-start;flex-direction:column;gap:6px;padding:12px">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(row.site_name || '?')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${['DTL','Артём','наёмная'].map(owner => {
                const t = row[owner];
                return `<div style="background:var(--card2);border-radius:8px;padding:6px 10px;min-width:80px">
                  <div style="font-size:10px;color:var(--text3)">${owner}</div>
                  <div style="font-size:15px;font-weight:700;color:var(--accent)">${t ? formatNum(t.amount) + ' ₽' : '—'}</div>
                  ${isPartner() && t ? `<div onclick="window.editTariffModal(${t.id},${t.site_id},'${esc(row.site_name || '')}','${owner}',${t.amount})" style="font-size:10px;color:var(--text2);cursor:pointer;margin-top:2px">изменить</div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>
        `).join('');
        return tariffRows || emptyState('Нет тарифов');
      })()}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addTariffModal()">+ Добавить тариф</button>` : ''}

      ${sectionHeader('Клиенты')}
      ${clients.map(c => `<div class="li">
        <div class="lic b">👤</div>
        <div class="lit"><div class="lim">${esc(c.name)}</div>${c.notes ? `<div class="lis">${esc(c.notes)}</div>` : ''}</div>
        <div class="lir">${isPartner() ? `<button onclick="event.stopPropagation();window.editClientModal(${c.id},${JSON.stringify(c.name)},${JSON.stringify(c.notes||'')})" style="background:var(--card2);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">✏</button>` : ''}</div>
      </div>`).join('') || emptyState('Нет клиентов')}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addClientModal()">+ Добавить клиента</button>` : ''}

      ${isPartner() ? `
      ${sectionHeader('Настройки алертов')}
      <div class="bb">
        <div class="bbr"><div class="bbl">Вместимость хранилища (куб)</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input id="set-capacity" class="inp" type="number" value="${getSetting('base_capacity_cubic','2500')}" style="width:90px;text-align:right;padding:4px 8px">
            <span style="color:var(--text2);font-size:13px;min-width:34px">куб</span>
          </div>
        </div>
        <div class="bbr"><div class="bbl">Порог остатка (алерт)</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input id="set-low-stock" class="inp" type="number" value="${getSetting('alert_low_stock_cubic','100')}" style="width:90px;text-align:right;padding:4px 8px">
            <span style="color:var(--text2);font-size:13px;min-width:34px">куб</span>
          </div>
        </div>
        <div class="bbr"><div class="bbl">Неподтв. ТТН (алерт)</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input id="set-unconf-hours" class="inp" type="number" value="${getSetting('alert_unconfirmed_hours','48')}" style="width:90px;text-align:right;padding:4px 8px">
            <span style="color:var(--text2);font-size:13px;min-width:34px">ч</span>
          </div>
        </div>
        <div class="bbr"><div class="bbl">Неосвоенные нал. Артёма</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input id="set-cash-days" class="inp" type="number" value="${getSetting('alert_cash_unsettled_days','7')}" style="width:90px;text-align:right;padding:4px 8px">
            <span style="color:var(--text2);font-size:13px;min-width:34px">дней</span>
          </div>
        </div>
      </div>
      <button onclick="window.saveSettings()" class="btn-primary" style="width:100%;margin-top:8px">Сохранить настройки</button>
      ` : ''}

      ${isPartner() ? `
      ${sectionHeader('Использование ИИ')}
      <div class="bb">
        <div class="bbr"><div class="bbl">Сегодня</div><div class="bbv">${aiUsage ? aiUsage.today_cost_rub + ' ₽ / ' + aiUsage.today_tokens + ' токенов' : '—'}</div></div>
        <div class="bbr"><div class="bbl">В этом месяце</div><div class="bbv">${aiUsage ? aiUsage.month_cost_rub + ' ₽ / ' + aiUsage.month_tokens + ' токенов' : '—'}</div></div>
        <div class="bbr"><div class="bbl">Дневной лимит</div><div class="bbv">${aiUsage ? aiUsage.daily_limit_rub + ' ₽' : '—'}</div></div>
      </div>
      ` : ''}

      ${isPartner() ? `
      ${sectionHeader('API Токены')}
      <div class="pi">
        ${apiTokens.length ? apiTokens.map(t => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:13px">${esc(t.name)}</div>
              <div style="font-size:11px;color:var(--text2)">${t.last_used_at ? 'Последнее: ' + new Date(t.last_used_at).toLocaleDateString('ru') : 'Не использовался'} · ${t.is_active ? 'Активен' : 'Отозван'}</div>
            </div>
            ${t.is_active ? '<button onclick="window.revokeApiToken(' + t.id + ')" style="background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.3);color:var(--red);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer">Отозвать</button>' : ''}
          </div>`).join('') : '<div style="color:var(--text2);font-size:13px;padding:8px 0">Нет активных токенов</div>'}
        <button onclick="window.createApiTokenModal()" class="btn-primary" style="width:100%;margin-top:10px">+ Новый токен</button>
      </div>
      ` : ''}

      ${isPartner() ? `
      ${sectionHeader('Активные сессии')}
      <div class="pi">
        ${sessions.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:12px;font-weight:600">${esc(s.user_agent ? s.user_agent.substring(0,40) : 'Неизвестно')}</div>
              <div style="font-size:11px;color:var(--text2)">IP: ${esc(s.ip || '—')} · ${s.created_at ? new Date(s.created_at).toLocaleDateString('ru') : ''}</div>
            </div>
            <button onclick="window.revokeSession('${esc(s.id)}')" style="background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.3);color:var(--red);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer">Завершить</button>
          </div>`).join('') || '<div style="color:var(--text2);font-size:13px">Нет данных о сессиях</div>'}
      </div>
      ` : ''}

      <div class="div"></div>
      <button class="btn-secondary" style="width:100%" onclick="doLogout()">Выйти из системы</button>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Настройки';
  }

  window.toggleSite = async function(id, active) {
    try {
      const sites = await api.get('/api/sites') || [];
      const s = sites.find(x => x.id === id);
      if (s) { await api.put(`/api/sites/${id}`, { name: s.name, is_active: active }); viewSettings(); }
    } catch (e) { toast(e.message, 'error'); }
  };

  window.addSiteModal = function() {
    showModal('Новый участок',
      formField('Название', `<input class="inp" id="m-site-name" placeholder="Название участка">`),
      async () => {
        const name = document.getElementById('m-site-name')?.value?.trim();
        if (!name) throw new Error('Введите название');
        await api.post('/api/sites', { name, is_active: true });
        toast('✅ Участок добавлен'); viewSettings();
      });
  };

  window.addSupplierModal = function() {
    showModal('Новый поставщик',
      formField('Название', `<input class="inp" id="m-sup-name" placeholder="Название поставщика">`),
      async () => {
        const name = document.getElementById('m-sup-name')?.value?.trim();
        if (!name) throw new Error('Введите название');
        await api.post('/api/suppliers', { name });
        toast('✅ Поставщик добавлен'); viewSettings();
      });
  };

  window.addCarrierModal = function() {
    showModal('Новый перевозчик',
      formField('Название', `<input class="inp" id="m-car-name" placeholder="Название / ФИО">`),
      async () => {
        const name = document.getElementById('m-car-name')?.value?.trim();
        if (!name) throw new Error('Введите название');
        await api.post('/api/carriers', { name });
        toast('✅ Перевозчик добавлен'); viewSettings();
      });
  };

  window.addClientModal = function() {
    showModal('Новый клиент',
      formField('Название / имя', `<input class="inp" id="m-cli-name" placeholder="Лао, ООО Рога...">`) +
      formField('Примечание', `<input class="inp" id="m-cli-notes" placeholder="Необязательно">`),
      async () => {
        const name = document.getElementById('m-cli-name')?.value?.trim();
        if (!name) throw new Error('Введите название');
        const notes = document.getElementById('m-cli-notes')?.value?.trim() || null;
        await api.post('/api/clients', { name, notes });
        toast('✅ Клиент добавлен'); viewSettings();
      });
  };

  window.editClientModal = function(id, currentName, currentNotes) {
    showModal('Изменить клиента',
      formField('Название / имя', `<input class="inp" id="m-cli-name" value="${esc(currentName)}">`) +
      formField('Примечание', `<input class="inp" id="m-cli-notes" value="${esc(currentNotes || '')}" placeholder="Необязательно">`),
      async () => {
        const name = document.getElementById('m-cli-name')?.value?.trim();
        if (!name) throw new Error('Введите название');
        const notes = document.getElementById('m-cli-notes')?.value?.trim() || null;
        await api.put(`/api/clients/${id}`, { name, notes });
        toast('✅ Клиент обновлён'); viewSettings();
      });
  };

  window.addTariffModal = async function() {
    let sites = [];
    try { sites = await api.get('/api/sites') || []; } catch(e) {}
    showModal('Новый тариф',
      formField('Участок', `<select class="inp" id="m-t-site">${sites.filter(s=>s.is_active).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>`) +
      formField('Чья машина', chipGroup(['DTL','Артём','наёмная'], 'DTL', 'm-t-owner')) +
      formField('Сумма ₽', `<input class="inp" type="number" id="m-t-amount" placeholder="0">`) +
      formField('Дата начала', `<input class="inp" type="date" id="m-t-date" value="${new Date().toISOString().slice(0,10)}">`) +
      formField('Комментарий', `<input class="inp" id="m-t-comment" placeholder="зима 2026, бездорожье...">`),
      async () => {
        const site_id = parseInt(document.getElementById('m-t-site')?.value);
        const ownerEl = document.querySelector('.chips[data-group="m-t-owner"] .chip.sel');
        const amount = parseFloat(document.getElementById('m-t-amount')?.value);
        const valid_from = document.getElementById('m-t-date')?.value;
        const comment = document.getElementById('m-t-comment')?.value || null;
        if (!site_id || !amount) throw new Error('Заполните поля');
        await api.post('/api/tariffs', { site_id, truck_owner: ownerEl?.dataset.val || 'DTL', amount, valid_from, comment });
        toast('✅ Тариф добавлен'); viewSettings();
      });
  };

  window.editTariffModal = function(tariffId, siteId, siteName, owner, currentAmount) {
    const overlay = document.createElement('div');
    overlay.id = 'edit-tariff-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--card);border-radius:16px;padding:24px;max-width:340px;width:100%">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">Изменить тариф</div>
        <div style="color:var(--text2);font-size:13px;margin-bottom:12px">${esc(siteName)} · ${esc(owner)}</div>
        <input id="edit-tariff-val" type="number" class="inp" value="${currentAmount}" placeholder="Тариф ₽" style="width:100%;margin-bottom:16px">
        <input type="hidden" id="edit-tariff-site" value="${siteId}">
        <input type="hidden" id="edit-tariff-owner" value="${esc(owner)}">
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('edit-tariff-overlay').remove()" class="btn-secondary" style="flex:1">Отмена</button>
          <button onclick="window.saveTariff(${tariffId})" class="btn-primary" style="flex:1">Сохранить</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window.saveTariff = async function(tariffId) {
    const val = parseFloat(document.getElementById('edit-tariff-val')?.value);
    if (!val || val <= 0) { toast('Введите сумму', 'error'); return; }
    const siteId = parseInt(document.getElementById('edit-tariff-site')?.value);
    const owner = document.getElementById('edit-tariff-owner')?.value || 'DTL';
    try {
      await api.put('/api/tariffs/' + tariffId, { site_id: siteId, truck_owner: owner, amount: val });
      toast('✅ Тариф обновлён!');
      document.getElementById('edit-tariff-overlay')?.remove();
      viewSettings();
    } catch (e) { toast(e.message, 'error'); }
  };

  window.editSettingsModal = function() {
    showModal('Параметры базы',
      formField('Вместимость хранилища (куб)', `<input class="inp" type="number" id="m-s-cap" placeholder="2500">`) +
      formField('Порог алерта (куб)', `<input class="inp" type="number" id="m-s-low" placeholder="100">`) +
      formField('Алерт неподтвержд. ТТН (ч)', `<input class="inp" type="number" id="m-s-hours" placeholder="48">`),
      async () => {
        const cap = document.getElementById('m-s-cap')?.value;
        const low = document.getElementById('m-s-low')?.value;
        const hrs = document.getElementById('m-s-hours')?.value;
        if (cap) await api.put('/api/settings/base_capacity_cubic', { value: cap });
        if (low) await api.put('/api/settings/alert_low_stock_cubic', { value: low });
        if (hrs) await api.put('/api/settings/alert_unconfirmed_hours', { value: hrs });
        toast('✅ Сохранено'); viewSettings();
      });
  };

  window.saveSettings = async function() {
    const pairs = [
      ['base_capacity_cubic', document.getElementById('set-capacity')?.value],
      ['alert_low_stock_cubic', document.getElementById('set-low-stock')?.value],
      ['alert_unconfirmed_hours', document.getElementById('set-unconf-hours')?.value],
      ['alert_cash_unsettled_days', document.getElementById('set-cash-days')?.value],
    ].filter(([k, v]) => v);
    try {
      await Promise.all(pairs.map(([key, value]) => api.put('/api/settings/' + key, { value })));
      toast('✅ Настройки сохранены');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Modal helper ──────────────────────────────────────────────────────────
  function showModal(title, bodyHtml, onSubmit) {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
    const fab = document.getElementById('ai-fab');
    if (fab) { fab.style.transform = 'scale(0)'; fab.style.opacity = '0'; }
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-title">${esc(title)}</div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer-btns">
          <button class="btn-secondary" onclick="closeModal()">Отмена</button>
          <button class="btn-primary" id="modal-ok">Сохранить</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    bindChips(overlay);
    document.getElementById('modal-ok').addEventListener('click', async () => {
      try { await onSubmit(); closeModal(); } catch (e) { toast(e.message, 'error'); }
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }

  window.closeModal = function () {
    const el = document.getElementById('modal-overlay');
    if (el) el.remove();
    const fab = document.getElementById('ai-fab');
    if (fab) { fab.style.transform = 'scale(1)'; fab.style.opacity = '1'; }
  };

  // ── Analytics (Phase 3) ───────────────────────────────────────────────────
  async function viewAnalytics() {
    try { await _viewAnalytics(); } catch (e) {
      console.error('[viewAnalytics ERROR]', e);
      sendLog('error', '[viewAnalytics] ' + e.message, e.stack);
    }
  }

  async function _viewAnalytics() {
    if (!isPartner()) {
      sendLog('warn', `[analytics] isPartner=false, user=${JSON.stringify(user)}, hash=${location.hash}`);
      navigate('#home'); return;
    }
    sendLog('info', `[analytics] start role=${user && user.role} hash=${location.hash}`);

    const now = new Date();
    let selYear = now.getFullYear();
    let selMonth = now.getMonth() + 1;

    // Read hash params if any: #analytics?year=2026&month=5
    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));
    if (hashParams.get('month') !== null && hashParams.get('month') !== '') selMonth = parseInt(hashParams.get('month'));
    // selMonth=0 means full year
    const monthParam = selMonth ? `&month=${selMonth}` : '';
    let summary = null, clients = [], fleetPnl = null, suppliers = [], carriers = [];
    const curMonthFallback = selMonth || new Date().getMonth() + 1;
    try { summary  = await api.get(`/api/analytics/summary?year=${selYear}&month=${selMonth || 1}`); } catch (e) { sendLog('warn', `[analytics] summary err: ${e.message}`); }
    try { clients  = await api.get(`/api/analytics/clients?year=${selYear}${monthParam}`) || []; } catch (e) { sendLog('warn', `[analytics] clients err: ${e.message}`); }
    try { fleetPnl = await api.get(`/api/analytics/fleet-pnl?year=${selYear}&month=${curMonthFallback}`); } catch (e) { sendLog('warn', `[analytics] fleet-pnl err: ${e.message}`); }
    try { suppliers = await api.get(`/api/analytics/suppliers?year=${selYear}${monthParam}`) || []; } catch (e) { sendLog('warn', `[analytics] suppliers err: ${e.message}`); }
    try { carriers  = await api.get(`/api/analytics/carriers?year=${selYear}&month=${curMonthFallback}`) || []; } catch (e) { sendLog('warn', `[analytics] carriers err: ${e.message}`); }
    sendLog('info', `[analytics] data ok: summary=${!!summary} clients=${Array.isArray(clients)?clients.length:'NOT_ARRAY:'+typeof clients} fleetPnl=${!!fleetPnl}`);

    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

    // Period selector (year tabs + month tabs)
    const curYear = new Date().getFullYear();
    const yearTabsHtml = [curYear, curYear - 1, curYear - 2].map(y =>
      `<div class="year-tab${y === selYear ? ' active' : ''}" onclick="navigate('#analytics?year=${y}&month=${selMonth}')">${y}</div>`
    ).join('');

    const monthTabsHtml = `<div class="month-tab${selMonth === 0 ? ' active' : ''}" onclick="navigate('#analytics?year=${selYear}&month=0')">Год</div>` +
      months.map((name, i) => {
        const m = i + 1;
        return `<div class="month-tab${m === selMonth ? ' active' : ''}" onclick="navigate('#analytics?year=${selYear}&month=${m}')">${name}</div>`;
      }).join('');

    // Clients section
    const maxClientPct = clients.length ? Math.max(...clients.map(c => c.pct_of_total)) : 0;
    const clientRows = clients.length ? clients.map(c => {
      const isOrange = c.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(c.client_name)}">${esc(c.client_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${c.pct_of_total}%"></div></div>
        <div class="prog-mini-val" style="color:${isOrange ? 'var(--orange)' : 'var(--accent)'}">${c.pct_of_total}%</div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет данных</div>`;

    const concentrationWarning = maxClientPct > 50
      ? `<div class="concentration-warning">⚠ Концентрация риска: один клиент занимает ${maxClientPct}% выручки</div>`
      : '';

    // Fleet P&L table
    const mkM = v => v >= 1000000 ? (v / 1000000).toFixed(2) + ' млн' : v >= 1000 ? (v / 1000).toFixed(0) + ' т.₽' : formatNum(v);
    const mkC = (v, good, ok) => v >= good ? 'var(--accent)' : v >= ok ? 'var(--orange)' : 'var(--red)';
    const pnlTrucks = fleetPnl ? fleetPnl.trucks : [];
    const pnlOwn   = fleetPnl ? fleetPnl.own_fleet : null;
    const pnlHire  = fleetPnl ? fleetPnl.hire : null;
    const pnlCoExp = fleetPnl ? fleetPnl.company_expenses : 0;
    const pnlNet   = fleetPnl ? fleetPnl.net_profit : 0;

    const pnlTruckRows = pnlTrucks.map(t => {
      const mc = mkC(t.margin_pct, 30, 10);
      return `<tr>
        <td style="font-weight:600">${esc(t.truck_name)}</td>
        <td style="color:var(--accent)">${mkM(t.revenue)}</td>
        <td style="color:var(--red)">${mkM(t.expenses)}</td>
        <td style="color:${mc};font-weight:700">${t.margin_pct}%</td>
        <td>${t.trips}</td>
        <td style="color:var(--text2)">${mkM(t.avg_per_trip)}</td>
        <td style="color:var(--text2)">${t.volume}</td>
      </tr>`;
    }).join('');

    const pnlHireRow = pnlHire ? `<tr style="border-top:1px solid var(--border)">
      <td style="font-weight:600;color:var(--orange)">Найм (итого)</td>
      <td style="color:var(--accent)">${mkM(pnlHire.revenue)}</td>
      <td style="color:var(--red)">${mkM(pnlHire.expenses)}</td>
      <td style="color:${mkC(pnlHire.margin_pct, 20, 5)};font-weight:700">${pnlHire.margin_pct}%</td>
      <td>${pnlHire.trips}</td>
      <td style="color:var(--text2)">—</td>
      <td style="color:var(--text2)">${pnlHire.volume}</td>
    </tr>` : '';

    const pnlOwnRow = pnlOwn ? `<tr style="background:var(--card2);font-weight:700">
      <td>Свой парк итого</td>
      <td style="color:var(--accent)">${mkM(pnlOwn.revenue)}</td>
      <td style="color:var(--red)">${mkM(pnlOwn.expenses)}</td>
      <td style="color:${mkC(pnlOwn.margin_pct, 30, 10)}">${pnlOwn.margin_pct}%</td>
      <td>${pnlOwn.trips}</td>
      <td>—</td>
      <td>${pnlOwn.volume}</td>
    </tr>` : '';

    const pnlNetRow = `<tr style="background:var(--accent10,rgba(0,212,100,.08));font-weight:700;font-size:13px">
      <td colspan="3" style="color:${pnlNet >= 0 ? 'var(--accent)' : 'var(--red)'}">Чистая прибыль</td>
      <td colspan="4" style="color:${pnlNet >= 0 ? 'var(--accent)' : 'var(--red)'};font-size:15px">${pnlNet >= 0 ? '+' : ''}${mkM(pnlNet)}</td>
    </tr>`;

    const pnlTable = pnlTrucks.length || pnlHire ? `
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="color:var(--text2);font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 6px">Машина</th>
            <th style="text-align:right;padding:4px 6px">Выручка</th>
            <th style="text-align:right;padding:4px 6px">Расходы</th>
            <th style="text-align:right;padding:4px 6px">Маржа</th>
            <th style="text-align:right;padding:4px 6px">Рейсы</th>
            <th style="text-align:right;padding:4px 6px">Ср/рейс</th>
            <th style="text-align:right;padding:4px 6px">Объём</th>
          </tr></thead>
          <tbody style="line-height:2">
            ${pnlTruckRows}
            ${pnlOwnRow}
            ${pnlHireRow}
            <tr style="border-top:1px solid var(--border)">
              <td colspan="7" style="font-size:11px;color:var(--text2);padding:4px 6px">Общие расходы компании: <strong style="color:var(--red)">${mkM(pnlCoExp)}</strong></td>
            </tr>
            ${pnlNetRow}
          </tbody>
        </table>
      </div>` : `<div class="empty-state">Нет данных по машинам</div>`;

    // Suppliers section
    const supplierRows = suppliers.length ? suppliers.map(s => {
      const isOrange = s.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(s.supplier_name)}">${esc(s.supplier_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${s.pct_of_total}%"></div></div>
        <div class="prog-mini-val">${s.pct_of_total}%</div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет данных</div>`;

    // Carriers section — dual bar: cost share + volume share
    const carrierRows = carriers.length ? carriers.map(c => {
      const isOrange = c.pct_cost >= 40;
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span style="font-weight:600;color:var(--text)">${esc(c.carrier_name)}</span>
          <span style="color:var(--text2)">${c.trips} рейс · ${formatNum(c.cost)} ₽</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="font-size:10px;color:var(--text2);width:40px">Сумма</span>
          <div style="flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%;height:100%;border-radius:3px" data-target="${c.pct_cost}%"></div></div>
          <span style="font-size:11px;font-weight:700;color:${isOrange ? 'var(--orange)' : 'var(--accent)'};">${c.pct_cost}%</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <span style="font-size:10px;color:var(--text2);width:40px">Объём</span>
          <div style="flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden"><div class="prog-mini-fill" style="width:0%;height:100%;border-radius:3px;background:var(--accent)" data-target="${c.pct_volume}%"></div></div>
          <span style="font-size:11px;color:var(--text2)">${c.pct_volume}%</span>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет данных</div>`;

    // Financial summary card
    const rev = summary ? summary.revenue_total : 0;
    const profit = summary ? summary.profit : 0;
    const marginPct = summary ? summary.margin_pct : 0;
    const monthLabel = months[selMonth - 1] || '';

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📈 Аналитика</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${infoTag('🔒 Только для партнёров DTL')}
      <div class="year-tabs">${yearTabsHtml}</div>
      <div class="month-tabs">${monthTabsHtml}</div>

      ${sectionHeader('Клиенты — доля выручки')}
      <div class="pi">
        ${clientRows}
        ${concentrationWarning}
      </div>

      ${sectionHeader('P&L по машинам · ' + (selMonth ? months[selMonth-1] + ' ' + selYear : 'Весь ' + selYear))}
      ${pnlTable}

      ${sectionHeader('Поставщики — доля закупок')}
      <div class="pi">
        ${supplierRows}
      </div>

      ${sectionHeader('Перевозчики — доля объёма и суммы')}
      <div class="pi" style="padding:12px 0">
        ${carrierRows}
      </div>

      ${sectionHeader('Финансовый итог · ' + (selMonth ? monthLabel + ' ' + selYear : 'Весь ' + selYear))}
      <div class="big-stat">
        <div class="bl">💰 Выручка</div>
        <div class="bv">${rev > 0 ? (rev / 1000000).toFixed(2) : '—'} <span class="bu">млн ₽</span></div>
        <div class="bs">Прибыль: <strong style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'}">${profit > 0 ? '+' : ''}${profit > 0 ? (profit / 1000000).toFixed(2) : (profit / 1000000).toFixed(2)} млн ₽</strong> · Маржа: <strong>${marginPct}%</strong></div>
      </div>
    </div>`;

    sendLog('info', '[analytics] calling setPageContent');
    setPageContent(html, getTabBar());
    sendLog('info', '[analytics] done — content set');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Аналитика';
    updateSidebarActive('analytics');

    // Animate progress bars after render
    requestAnimationFrame(() => {
      document.querySelectorAll('.prog-mini-fill[data-target]').forEach(el => {
        setTimeout(() => { el.style.width = el.getAttribute('data-target'); }, 50);
      });
    });
  }


  // ── API Token & Session management ────────────────────────────────────────
  window.revokeApiToken = async function(id) {
    if (!confirm('Отозвать токен? Его нельзя восстановить.')) return;
    try {
      await api.del('/api/tokens/' + id);
      toast('Токен отозван');
      viewSettings();
    } catch(e) { toast(e.message, 'error'); }
  };

  window.createApiTokenModal = function() {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
    const fab = document.getElementById('ai-fab');
    if (fab) { fab.style.transform = 'scale(0)'; fab.style.opacity = '0'; }
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-title">Новый API токен</div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Название токена</label><input id="token-name-inp" class="inp" placeholder="Например: Курсор MCP"></div>
          <div id="token-result" style="display:none;margin-top:12px;padding:10px;background:var(--bg);border-radius:8px;word-break:break-all;font-size:12px;font-family:monospace;color:var(--accent)"></div>
        </div>
        <div class="modal-footer-btns">
          <button class="btn-secondary" onclick="closeModal()">Отмена</button>
          <button class="btn-primary" id="modal-create-token-btn" onclick="window.doCreateToken()">Создать</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  };

  window.doCreateToken = async function() {
    const name = document.getElementById('token-name-inp')?.value?.trim();
    if (!name) { toast('Введите название', 'error'); return; }
    try {
      const res = await api.post('/api/tokens', { name });
      const el = document.getElementById('token-result');
      if (el) {
        el.style.display = 'block';
        el.textContent = res.token;
      }
      toast('Токен создан — скопируйте сейчас!');
      const btn = document.getElementById('modal-create-token-btn');
      if (btn) btn.style.display = 'none';
    } catch(e) { toast(e.message, 'error'); }
  };

  window.revokeSession = async function(sessionId) {
    if (!confirm('Завершить сессию?')) return;
    try {
      await api.del('/api/auth/sessions/' + sessionId);
      toast('Сессия завершена');
      viewSettings();
    } catch(e) { toast(e.message, 'error'); }
  };

  // ── Balance (Phase 3) ─────────────────────────────────────────────────────
  async function viewBalance() {
    if (!isPartner()) { navigate('#home'); return; }

    const now = new Date();
    let selYear = now.getFullYear();
    let selMonth = now.getMonth() + 1;

    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));
    if (hashParams.get('month')) selMonth = parseInt(hashParams.get('month'));

    let monthly = [], current = null, entries = [];
    try { monthly = await api.get(`/api/balance/monthly?year=${selYear}`) || []; } catch (e) {}
    try { current = await api.get('/api/balance/current'); } catch (e) {}
    try { entries = await api.get(`/api/balance/entries?year=${selYear}&month=${selMonth}`) || []; } catch (e) {}

    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

    // Current month data from monthly array
    const monthData = monthly.find(m => m.month === selMonth) || { assets: 0, liabilities: 0, net_assets: 0 };

    // Year + month tabs
    const curYear = new Date().getFullYear();
    const yearTabsHtml = [curYear, curYear - 1, curYear - 2].map(y =>
      `<div class="year-tab${y === selYear ? ' active' : ''}" onclick="navigate('#balance?year=${y}&month=${selMonth}')">${y}</div>`
    ).join('');
    const monthTabsHtml = months.map((name, i) => {
      const m = i + 1;
      return `<div class="month-tab${m === selMonth ? ' active' : ''}" onclick="navigate('#balance?year=${selYear}&month=${m}')">${name}</div>`;
    }).join('');

    // Mini bar chart — show up to 5 recent months ending at selMonth
    const barMonths = [];
    for (let i = 4; i >= 0; i--) {
      let m = selMonth - i;
      let y = selYear;
      if (m <= 0) { m += 12; y -= 1; }
      barMonths.push({ m, y });
    }
    const barData = barMonths.map(bm => {
      const d = monthly.find(row => row.month === bm.m);
      return { label: months[bm.m - 1], net: d ? d.net_assets : 0, isCurrent: bm.m === selMonth && bm.y === selYear };
    });
    const maxNet = Math.max(...barData.map(b => Math.max(0, b.net || 0)), 1);
    const barsHtml = barData.map(b => {
      const netVal = Math.max(0, b.net || 0);
      const heightPx = Math.max(4, Math.round((netVal / maxNet) * 60));
      const valLabel = b.net > 0 ? (b.net / 1000000).toFixed(1) : '0';
      return `<div class="bar-col">
        <div class="bar-val">${valLabel}</div>
        <div class="bar-fill${b.isCurrent ? ' current' : ''}" style="height:${heightPx}px"></div>
        <div class="bar-label">${b.label}</div>
      </div>`;
    }).join('');

    // Selected month's data
    const assets = monthData.assets || (current ? current.assets : 0);
    const liabilities = monthData.liabilities || (current ? current.liabilities : 0);
    const netAssets = assets - liabilities;
    const netDebt = liabilities - assets * 0.3; // simplified net debt estimate
    const liquidity = liabilities > 0 ? (assets / liabilities).toFixed(1) : '—';

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">⚖️ Баланс</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${infoTag('🔒 Только для партнёров DTL')}
      <div class="year-tabs">${yearTabsHtml}</div>
      <div class="month-tabs">${monthTabsHtml}</div>

      <div class="big-stat">
        <div class="bl">Чистые активы · ${months[selMonth - 1]} ${selYear}</div>
        <div class="bv">${netAssets > 0 ? (netAssets / 1000000).toFixed(2) : '—'} <span class="bu">млн ₽</span></div>
        <div class="bs">${netAssets > 0 ? 'Активы: ' + (assets / 1000000).toFixed(2) + ' млн · Пассивы: ' + (liabilities / 1000000).toFixed(2) + ' млн' : 'Нет данных за этот период'}</div>
      </div>

      <div class="bar-chart">${barsHtml}</div>

      <div class="bb">
        <div class="bbr"><div class="bbl">ИТОГО АКТИВЫ</div><div class="bbv" style="color:var(--accent)">${formatNum(Math.round(assets))} ₽</div></div>
        <div class="bbr"><div class="bbl">ИТОГО ПАССИВЫ</div><div class="bbv" style="color:var(--red)">${formatNum(Math.round(liabilities))} ₽</div></div>
        <div class="bbt"><span>Чистые активы</span><span style="color:var(--accent)">${formatNum(Math.round(netAssets))} ₽</span></div>
      </div>
      <div class="bb">
        <div class="bbr"><div class="bbl">Чистый долг</div><div class="bbv" style="color:${netDebt > 0 ? 'var(--orange)' : 'var(--green)'}">${formatNum(Math.round(Math.abs(netDebt)))} ₽</div></div>
        <div class="bbr"><div class="bbl">Ликвидность</div><div class="bbv" style="color:var(--accent)">${liquidity}</div></div>
      </div>
      <button class="btn-secondary" onclick="showBalanceEntryModal(${selYear}, ${selMonth})">+ Внести данные за ${months[selMonth - 1]}</button>

      ${entries.length ? `
        ${sectionHeader('Детализация записей')}
        <div class="bb">
          ${entries.map(e => `<div class="bbr">
            <div class="bbl" style="font-size:11px">${esc(e.object_name)} <span style="color:var(--text3)">${esc(e.category)}</span></div>
            <div class="bbv" style="color:${e.entry_type==='asset'?'var(--accent)':'var(--red)'}">${e.entry_type==='liability'?'-':''}${formatNum(e.amount)} ₽</div>
          </div>`).join('')}
        </div>
        <button class="btn-secondary" style="width:100%;margin-top:4px" onclick="showDetailedBalanceModal(${selYear},${selMonth})">+ Добавить строку</button>
      ` : `<button class="btn-secondary" style="width:100%;margin-top:4px" onclick="showDetailedBalanceModal(${selYear},${selMonth})">+ Детализировать баланс</button>`}
    </div>`;

    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Баланс';
    updateSidebarActive('balance');
  }

  window.showBalanceEntryModal = function (year, month) {
    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    showModal(`Баланс за ${months[month - 1]} ${year}`, `
      ${formField('Итого активы, ₽', `<input class="inp" type="number" id="m-assets" placeholder="0">`)}
      ${formField('Итого пассивы, ₽', `<input class="inp" type="number" id="m-liabs" placeholder="0">`)}
      ${formField('Примечания', `<input class="inp" type="text" id="m-notes" placeholder="Комментарий...">`)}
    `, async () => {
      const assets = parseFloat(document.getElementById('m-assets').value) || 0;
      const liabilities = parseFloat(document.getElementById('m-liabs').value) || 0;
      const notes = document.getElementById('m-notes').value;
      await api.post('/api/balance/entry', { year, month, assets, liabilities, notes });
      toast('✅ Данные баланса сохранены!');
      navigate(`#balance?year=${year}&month=${month}`);
    });
  };

  window.showDetailedBalanceModal = function(year, month) {
    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    const cats = ['Деньги','ОФЗ','Техника','Оборудование','Займы','Обязательства'];
    showModal(`Запись баланса · ${months[month-1]} ${year}`, `
      ${formField('Категория', `<div class="chips" data-group="bal-cat">${cats.map((c,i) => `<div class="chip${i===0?' sel':''}" data-val="${c}">${c}</div>`).join('')}</div>`)}
      ${formField('Объект', `<input class="inp" type="text" id="m-obj-name" placeholder="Касса ЛН, Шахман-1, Займ Коля...">`)}
      ${formField('Сумма, ₽', `<input class="inp" type="number" id="m-bal-amount" placeholder="0">`)}
      ${formField('Тип', `<div class="chips" data-group="bal-type"><div class="chip sel" data-val="asset">Актив</div><div class="chip" data-val="liability">Пассив</div></div>`)}
      ${formField('Примечание', `<input class="inp" type="text" id="m-bal-notes" placeholder="Опционально">`)}
    `, async () => {
      const category = document.querySelector('.chips[data-group="bal-cat"] .chip.sel')?.dataset.val;
      const object_name = document.getElementById('m-obj-name').value.trim();
      const amount = parseFloat(document.getElementById('m-bal-amount').value) || 0;
      const entry_type = document.querySelector('.chips[data-group="bal-type"] .chip.sel')?.dataset.val || 'asset';
      const notes = document.getElementById('m-bal-notes').value.trim() || null;
      if (!object_name || !amount) throw new Error('Укажите объект и сумму');
      const period = `${year}-${String(month).padStart(2,'0')}-01`;
      await api.post('/api/balance', { period, category, object_name, amount, entry_type, notes });
      toast('✅ Записано');
      navigate(`#balance?year=${year}&month=${month}`);
    });
  };


  // ── Annual (Phase 3) ──────────────────────────────────────────────────────
  async function viewAnnual() {
    try { await _viewAnnual(); } catch (e) {
      console.error('[viewAnnual ERROR]', e);
      sendLog('error', '[viewAnnual] ' + e.message, e.stack);
    }
  }

  async function _viewAnnual() {
    if (!isPartner()) { navigate('#home'); return; }

    const now = new Date();
    let selYear = now.getFullYear();
    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));

    let data = null;
    try { data = await api.get(`/api/annual?year=${selYear}`); } catch (e) {}

    const curYear = new Date().getFullYear();
    const yearTabsHtml = [curYear, curYear - 1, curYear - 2].map(y =>
      `<div class="year-tab${y === selYear ? ' active' : ''}" onclick="navigate('#annual?year=${y}')">${y}</div>`
    ).join('');

    const totalRev = data ? (data.revenue_fleet + data.revenue_hire) : 0;
    const totalExp = data ? (data.expenses_fleet + data.expenses_fuel + data.expenses_carriers + data.expenses_general) : 0;
    const profit = data ? data.profit : 0;

    const fmt = (n) => n > 0 ? formatNum(Math.round(n)) : '—';
    const mln = (n) => n > 0 ? (n / 1000000).toFixed(1) : '—';

    const clients = (data && data.clients) ? data.clients : [];
    const clientRows = clients.length ? clients.map(c => {
      const isOrange = c.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(c.client_name)}">${esc(c.client_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${c.pct_of_total}%"></div></div>
        <div class="prog-mini-val">${c.pct_of_total}%</div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет данных</div>`;

    const annualSuppliers = (data && data.suppliers) ? data.suppliers : [];
    const annualSupplierRows = annualSuppliers.length ? annualSuppliers.map(s => {
      const isOrange = s.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(s.supplier_name)}">${esc(s.supplier_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${s.pct_of_total}%"></div></div>
        <div class="prog-mini-val">${s.pct_of_total}%</div>
      </div>`;
    }).join('') : `<div class="empty-state">Нет данных</div>`;

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📅 Годовые итоги</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${infoTag('🔒 Только для партнёров DTL')}
      <div class="year-tabs">${yearTabsHtml}</div>

      <div class="stats">
        <div class="sc"><div class="v" style="font-size:16px">${mln(totalRev)}</div><div class="lv">Выручка млн ₽</div></div>
        <div class="sc"><div class="v r" style="font-size:16px">${mln(totalExp)}</div><div class="lv">Расходы млн ₽</div></div>
        <div class="sc"><div class="v g" style="font-size:16px">${mln(profit)}</div><div class="lv">Прибыль млн ₽</div></div>
      </div>

      <div class="bb">
        <div class="bbr"><div class="bbl">Выручка свой парк</div><div class="bbv">${fmt(data ? data.revenue_fleet : 0)} ₽</div></div>
        <div class="bbr"><div class="bbl">Выручка найм</div><div class="bbv">${fmt(data ? data.revenue_hire : 0)} ₽</div></div>
        <div class="bbr"><div class="bbl">Расходы парк</div><div class="bbv" style="color:var(--red)">${fmt(data ? data.expenses_fleet : 0)} ₽</div></div>
        <div class="bbr"><div class="bbl">Расходы топливо</div><div class="bbv" style="color:var(--red)">${fmt(data ? data.expenses_fuel : 0)} ₽</div></div>
        <div class="bbr"><div class="bbl">Расходы перевозчики</div><div class="bbv" style="color:var(--red)">${fmt(data ? data.expenses_carriers : 0)} ₽</div></div>
        <div class="bbr"><div class="bbl">Общие расходы</div><div class="bbv" style="color:var(--red)">${fmt(data ? data.expenses_general : 0)} ₽</div></div>
        <div class="bbt"><span>Чистая прибыль</span><span style="color:var(--green)">${fmt(profit)} ₽</span></div>
      </div>

      ${sectionHeader('Клиенты ' + selYear)}
      <div class="pi">
        ${clientRows}
      </div>

      ${sectionHeader('Поставщики ' + selYear)}
      <div class="pi">
        ${annualSupplierRows}
      </div>

      <button class="btn-secondary" onclick="window.open('/api/annual/export?year=${selYear}')">Экспорт CSV</button>
    </div>`;

    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Годовые итоги';
    updateSidebarActive('annual');

    // Animate progress bars
    requestAnimationFrame(() => {
      document.querySelectorAll('.prog-mini-fill[data-target]').forEach(el => {
        setTimeout(() => { el.style.width = el.getAttribute('data-target'); }, 50);
      });
    });
  }


  window.navigate = navigate;

  // ── Receipt / Dispatch detail views ──────────────────────────────────────

  window.showReceiptDetail = async function(receiptId) {
    let r;
    try {
      r = await api.get('/api/base/receipts/' + receiptId);
    } catch (e) { toast('Ошибка загрузки', 'error'); return; }

    const statusHtml = r.ttn_confirmed
      ? '<span style="color:var(--green)">✅ Подтверждено</span>'
      : '<span style="color:var(--orange)">⏳ Ожидает подтверждения</span>';

    const photoHtml = r.ttn_photo_url
      ? `<img src="${esc(r.ttn_photo_url)}" style="width:100%;border-radius:8px;margin-top:12px;cursor:pointer" onclick="window.open('${esc(r.ttn_photo_url)}')" title="Нажмите для просмотра">`
      : '<div style="color:var(--text3);font-size:12px;margin-top:8px">Фото не прикреплено</div>';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--card);border-radius:16px 16px 0 0;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:16px;font-weight:700">Приёмка #${r.id}</div>
          <button onclick="this.closest('[style*=position]').remove()" style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer">✕</button>
        </div>
        <div class="bb">
          <div class="bbr"><div class="bbl">Источник</div><div class="bbv">${esc(r.source_name || r.source_custom || r.supplier_name || '—')}</div></div>
          <div class="bbr"><div class="bbl">Объём номинал</div><div class="bbv">${esc(String(r.volume_nominal || '—'))} куб</div></div>
          <div class="bbr"><div class="bbl">Объём приведённый</div><div class="bbv" style="color:var(--accent)">${esc(String(r.volume_adjusted || '—'))} куб</div></div>
          <div class="bbr"><div class="bbl">Температура</div><div class="bbv">${r.temperature !== null && r.temperature !== undefined ? esc(String(r.temperature)) + ' °C' : '—'}</div></div>
          <div class="bbr"><div class="bbl">Плотность</div><div class="bbv">${r.density ? esc(String(r.density)) + ' г/см³' : '—'}</div></div>
          <div class="bbr"><div class="bbl">Номер ТТН</div><div class="bbv">${esc(r.ttn_number || '—')}</div></div>
          <div class="bbr"><div class="bbl">Статус</div><div class="bbv">${statusHtml}</div></div>
          <div class="bbr"><div class="bbl">Дата</div><div class="bbv">${esc(r.received_at ? new Date(r.received_at).toLocaleString('ru') : '—')}</div></div>
          ${r.notes ? `<div class="bbr"><div class="bbl">Примечание</div><div class="bbv">${esc(r.notes)}</div></div>` : ''}
        </div>
        ${photoHtml}
        ${!r.ttn_confirmed && (isArtem() || isOp() || isPartner()) ? `
          <button onclick="window.confirmReceiptFromDetail(${r.id})" class="btn-primary" style="width:100%;margin-top:16px">✅ Подтвердить приёмку</button>
        ` : ''}
        ${isPartner() || isArtem() ? `<button onclick="window.correctReceiptModal(${r.id},${r.volume_nominal||0},${r.density||0.840},${r.temperature||15},'${esc(r.ttn_number||'')}','${esc(r.notes||'')}')" class="btn-secondary" style="width:100%;margin-top:8px">✏ Исправить запись</button>` : ''}
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window.confirmReceiptFromDetail = async function(receiptId) {
    try {
      await api.put('/api/base/receipts/' + receiptId + '/confirm', {});
      toast('✅ Приёмка подтверждена!');
      document.querySelector('[style*="position:fixed"][style*="z-index:9999"]')?.remove();
      navigate('#base');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.showDispatchDetail = async function(dispatchId) {
    let d;
    try {
      d = await api.get('/api/base/dispatches/' + dispatchId);
    } catch (e) { toast('Ошибка загрузки', 'error'); return; }

    const statusLabels = { dispatched: 'Отправлен', in_transit: 'В пути', delivered: 'Доставлено', cancelled: 'Отменён' };
    const statusColors = { dispatched: 'var(--orange)', in_transit: 'var(--accent)', delivered: 'var(--green)', cancelled: 'var(--red)' };
    const st = d.status || 'dispatched';

    const photoHtml = d.ttn_photo_url
      ? `<img src="${esc(d.ttn_photo_url)}" style="width:100%;border-radius:8px;margin-top:12px;cursor:pointer" onclick="window.open('${esc(d.ttn_photo_url)}')" title="Фото ТТН">`
      : '<div style="color:var(--text3);font-size:12px;margin-top:8px">Фото не прикреплено</div>';

    const actionsHtml = st !== 'delivered' && st !== 'cancelled' ? `
      ${(isArtem() || isOp() || isPartner()) ? `<button onclick="window.updateDispatchStatus(${d.id},'delivered')" class="btn-primary" style="width:100%;margin-top:12px">✅ Водитель вернулся — Доставлено</button>` : ''}
      ${isPartner() && st !== 'cancelled' ? `<button onclick="window.updateDispatchStatus(${d.id},'cancelled')" class="btn-secondary" style="width:100%;margin-top:8px;color:var(--red)">Отменить рейс</button>` : ''}
    ` : '';

    const paidHtml = isPartner() && st === 'delivered' ? (d.paid
      ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(0,212,100,.1);border-radius:8px;font-size:12px;color:var(--accent)">
           ✅ Оплачено клиентом${d.paid_at ? ' · ' + new Date(d.paid_at).toLocaleDateString('ru') : ''}
           <button onclick="window.toggleDispatchPaid(${d.id},false)" style="float:right;background:none;border:none;color:var(--text3);font-size:11px;cursor:pointer">Отменить</button>
         </div>`
      : `<button onclick="window.toggleDispatchPaid(${d.id},true)" class="btn-secondary" style="width:100%;margin-top:8px;color:var(--accent);border-color:var(--accent)">💳 Отметить оплаченным</button>`
    ) : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--card);border-radius:16px 16px 0 0;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:16px;font-weight:700">Рейс #${d.id}</div>
          <button onclick="this.closest('[style*=position]').remove()" style="background:none;border:none;color:var(--text2);font-size:20px;cursor:pointer">✕</button>
        </div>
        <div class="bb">
          <div class="bbr"><div class="bbl">Машина</div><div class="bbv">${esc(d.truck_name || d.truck_temp || '—')}</div></div>
          <div class="bbr"><div class="bbl">Водитель</div><div class="bbv">${esc(d.driver_name || d.driver_temp || '—')}</div></div>
          <div class="bbr"><div class="bbl">Участок</div><div class="bbv">${esc(d.site_name || '—')}</div></div>
          <div class="bbr"><div class="bbl">Объём</div><div class="bbv" style="color:var(--accent)">${esc(String(d.volume || '—'))} куб</div></div>
          <div class="bbr"><div class="bbl">Тариф</div><div class="bbv">${d.tariff ? formatNum(d.tariff) + ' ₽' : '—'}</div></div>
          <div class="bbr"><div class="bbl">ТТН</div><div class="bbv">${esc(d.ttn_number || '—')}</div></div>
          <div class="bbr"><div class="bbl">Статус</div><div class="bbv" style="color:${statusColors[st]}">${statusLabels[st] || st}</div></div>
          ${d.paid !== undefined ? `<div class="bbr"><div class="bbl">Оплата</div><div class="bbv" style="color:${d.paid ? 'var(--accent)' : 'var(--text2)'}">${d.paid ? '✅ Оплачено' : 'Не оплачено'}</div></div>` : ''}
          <div class="bbr"><div class="bbl">Дата отправки</div><div class="bbv">${esc(d.dispatched_at ? new Date(d.dispatched_at).toLocaleString('ru') : '—')}</div></div>
          ${d.delivered_at ? `<div class="bbr"><div class="bbl">Доставлено</div><div class="bbv">${esc(new Date(d.delivered_at).toLocaleString('ru'))}</div></div>` : ''}
          ${d.notes ? `<div class="bbr"><div class="bbl">Примечание</div><div class="bbv">${esc(d.notes)}</div></div>` : ''}
        </div>
        ${photoHtml}
        ${actionsHtml}
        ${paidHtml}
        ${isPartner() || isArtem() ? `<button onclick="window.correctDispatchModal(${d.id},${d.volume||0},${d.tariff||0},'${esc(d.ttn_number||'')}','${esc(d.notes||'')}')" class="btn-secondary" style="width:100%;margin-top:8px">✏ Исправить запись</button>` : ''}
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window.updateDispatchStatus = async function(dispatchId, status) {
    try {
      await api.put('/api/base/dispatches/' + dispatchId + '/status', { status });
      const labels = { delivered: '✅ Доставлено!', cancelled: 'Рейс отменён' };
      toast(labels[status] || 'Статус обновлён');
      document.querySelector('[style*="position:fixed"][style*="z-index:9999"]')?.remove();
      navigate('#base?tab=trips');
    } catch (e) { toast(e.message, 'error'); }
  };

  window.toggleDispatchPaid = async function(dispatchId, markPaid) {
    try {
      const endpoint = markPaid ? 'paid' : 'unpaid';
      await api.put(`/api/base/dispatches/${dispatchId}/${endpoint}`, {});
      toast(markPaid ? '✅ Отмечено оплаченным' : 'Оплата отменена');
      document.querySelector('[style*="position:fixed"][style*="z-index:9999"]')?.remove();
      showDispatchDetail(dispatchId);
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Global error logging ──────────────────────────────────────────────────
  function sendLog(level, message, stack) {
    const body = { level, message, stack: stack || null, url: location.href };
    fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(api.getToken() ? { Authorization: 'Bearer ' + api.getToken() } : {}) },
      body: JSON.stringify(body),
      credentials: 'include',
    }).catch(() => {});
  }

  window.addEventListener('error', (e) => {
    const msg = `${e.message} (${e.filename}:${e.lineno}:${e.colno})`;
    console.error('[JS ERROR]', msg, e.error);
    sendLog('error', msg, e.error ? e.error.stack : null);
    toast('Ошибка JS: ' + e.message, 'error');
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const stack = e.reason instanceof Error ? e.reason.stack : null;
    console.error('[UNHANDLED PROMISE]', msg, e.reason);
    sendLog('error', 'Unhandled promise: ' + msg, stack);
    toast('Ошибка: ' + msg, 'error');
  });

  boot();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
