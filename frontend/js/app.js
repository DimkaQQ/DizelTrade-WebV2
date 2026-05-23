(async () => {
  'use strict';

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

  function orderCard({ name, date, amount, pricePerLiter, delivered, total, sites, closed, showFinancials }) {
    const pct = total > 0 ? Math.round((delivered / total) * 100) : (closed ? 100 : 0);
    const remaining = total - delivered;
    const isOver = pct >= 80;
    return `<div class="oc${closed ? '" style="opacity:.6' : ''}">
      <div class="och">
        <div><div class="ocn">${esc(name)}</div><div class="ocd">${esc(date)}</div></div>
        ${showFinancials && amount ? `<div><div class="oca">${esc(amount)}</div><div class="ocsub">${esc((total || '') + ' куб' + (pricePerLiter ? ' · ' + pricePerLiter : ''))}</div></div>` : ''}
      </div>
      <div class="ocp-labels">
        <span>Доставлено: <strong>${esc(String(delivered))} куб</strong></span>
        ${showFinancials ? `<span style="color:var(--accent);font-weight:700">${pct}%</span>` : ''}
        <span>Осталось: <strong style="color:var(--orange)">${esc(String(remaining))} куб</strong></span>
      </div>
      <div class="ocbar"><div class="ocfill${isOver ? ' o' : ''}" style="width:${pct}%"></div></div>
      ${sites && sites.length ? `<div class="oc-sites">${sites.map(s => `<div class="oc-site">${esc(s)}</div>`).join('')}</div>` : ''}
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

  function photoButton() {
    return `<div class="photo-btn">
      <div class="pi2">📷</div>
      <div class="pt2">Сфотографировать ТТН</div>
      <div class="ps">или добавить позже — запись сохранится без фото</div>
    </div>`;
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
          <div class="nav-group-label">Главное</div>
          <div class="nav-item" data-page="dashboard" onclick="navigate('#dashboard')"><span class="ni-icon">📊</span> Дашборд</div>
          <div class="nav-item" data-page="base" onclick="navigate('#base')"><span class="ni-icon">⛽</span> База Тында<span class="ni-badge" id="sb-pending-badge" style="display:none">0</span></div>
          <div class="nav-item" data-page="orders" onclick="navigate('#orders')"><span class="ni-icon">📦</span> Заказы клиентов</div>
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
          <div class="nav-item" data-page="settings" onclick="navigate('#settings')"><span class="ni-icon">⚙️</span> Настройки</div>
        </div>
        <div class="sidebar-user">
          <div class="user-avatar">${getUserInitials().toUpperCase()}</div>
          <div>
            <div class="user-name">${esc(user.name || user.email)}</div>
            <div class="user-role">${esc(user.role === 'partner' ? 'Партнёр DTL · Полный доступ' : user.role === 'artem' ? 'Партнёр (база)' : 'Оператор')}</div>
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
          <div class="topbar-alert" id="tb-alert" style="display:none" onclick="navigate('#base')">⏳ <span id="tb-alert-text">Ожидают</span></div>
        </div>
        <div class="content" id="content"></div>
      </div>
    </div>`;

    loadTopbarStats();
  }

  function buildMobileLayout() {
    const el = document.getElementById('app');
    el.innerHTML = `<div class="app-shell" id="mobile-shell"></div>`;
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
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => { if (user) { setupLayout(); render(location.hash); } }, 200);
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
    if (h === 'orders') { viewOrders(); return; }
    if (h.startsWith('orders/')) { viewOrderDetail(h.split('/')[1]); return; }
    if (h === 'income') { viewIncome(); return; }
    if (h === 'expenses') { viewExpenses(); return; }
    if (h === 'hire') { viewHire(); return; }
    if (h === 'debts') { viewDebts(); return; }
    if (h === 'dashboard') { viewDashboard(); return; }
    if (h === 'fleet') { viewFleet(); return; }
    if (h === 'analytics' || h.startsWith('analytics?')) { viewAnalytics(); return; }
    if (h === 'balance' || h.startsWith('balance?')) { viewBalance(); return; }
    if (h === 'annual' || h.startsWith('annual?')) { viewAnnual(); return; }
    if (h === 'settings') { viewSettings(); return; }
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
    } catch (e) { user = null; }
    setupLayout();
    render(location.hash || '#home');
    setInterval(() => {
      document.querySelectorAll('#sb-time').forEach(el => { el.textContent = currentTime(); });
    }, 30000);
  }

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

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
      <div class="stitle">Что записать?</div>
      <div class="ssub">// добро пожаловать</div>
      ${alertBannerHtml}
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
        ${menuCard({ icon: '🕐', label: 'История записей', sub: 'кто, что и когда', wide: true })}
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

    const currentBal = balance ? balance.balance_cubic : '—';
    const pendingItems = [
      ...pending.slice(0, 3).map(r => pendingItem({ title: `ТТН ${r.ttn_number || ''} — ${r.source_custom || r.supplier_name || ''} ${r.volume_nominal || ''} куб`, sub: r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : '', btnLabel: 'Принял', onConfirmAttr: `onclick="confirmReceipt(${r.id})"` })),
      ...dispatches.slice(0, 2).map(d => pendingItem({ title: `${d.truck_name || ''} → ${d.site_name || ''} · ${d.volume} куб`, sub: d.driver_name || '', btnLabel: 'Доставлено', onConfirmAttr: `onclick="confirmDispatch(${d.id})"` }))
    ].join('');

    const activeOrder = orders.find(o => o.status === 'active');

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
      <div class="role-tag orange">🔒 Ограниченный доступ · База Тында</div>
      <div class="stitle">База Тында</div>
      <div class="ssub">// добрый день, ${esc(user.name || user.email)}</div>
      <div class="big-stat">
        <div class="bl">⛽ Сейчас на базе</div>
        <div class="bv">${esc(String(currentBal))} <span class="bu">куб</span></div>
        <div class="bs">Вместимость: 2500 куб</div>
      </div>
      ${pendingItems ? `<div class="pending-block"><div class="pt">⏳ Требуют действия (${pending.length + dispatches.length})</div>${pendingItems}</div>` : ''}
      <div class="menu-grid">
        ${menuCard({ icon: '📥', label: 'Принял топливо', accent: true, onClick: "navigate('#base/receipts/new')" })}
        ${menuCard({ icon: '🚚', label: 'Рейс на участок', onClick: "navigate('#base/dispatches/new')" })}
        ${menuCard({ icon: '🏗', label: 'Мой автопарк', onClick: "navigate('#fleet')" })}
        ${menuCard({ icon: '💵', label: 'Отчёт по наличным', wide: true })}
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

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-logo">DIZEL<span>TRADE</span></div><span class="nav-user">${esc(user.name || user.email)}</span></div>` : ''}
    <div class="content">
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

    const tabTitles = { main: 'База Тында', receipts: 'Приёмки', trips: 'Журнал рейсов', cash: 'Наличные' };
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

    const tabDefs = [['main','Главная'],['receipts','Приёмки'],['trips','Рейсы'],['cash','Наличные']];

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
      ${pending.length ? `<div class="pending-block">
        <div class="pt">⏳ Ожидают подтверждения приёмки (${pending.length})</div>
        ${pending.slice(0, 3).map(r => pendingItem({ title: `ТТН ${r.ttn_number || ''} — ${r.source_custom || r.supplier_name || ''} ${r.volume_nominal} куб`, sub: r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : '', btnLabel: 'Принял', onConfirmAttr: `onclick="confirmReceipt(${r.id})"` })).join('')}
      </div>` : ''}
      ${sectionHeader('Действия')}
      <div class="menu-grid">
        ${menuCard({ icon: '📥', label: 'Принял топливо', accent: true, onClick: "navigate('#base/receipts/new')" })}
        ${menuCard({ icon: '🚚', label: 'Рейс на участок', onClick: "navigate('#base/dispatches/new')" })}
        ${menuCard({ icon: '💸', label: 'Аванс', sub: 'топливо в долг' })}
        ${menuCard({ icon: '🔋', label: 'Заправка', sub: 'своих машин' })}
        ${menuCard({ icon: '💵', label: 'Наличные', sub: 'Артёму' })}
        ${menuCard({ icon: '📊', label: 'Состояние базы', onClick: "navigate('#base?tab=main')" })}
      </div>
      ${sectionHeader('Рейсы в пути')}
      ${inTransit.length ? inTransit.map(d => listItem({ icon: '🚚', iconBg: 'tr', title: `${d.truck_name || ''} → ${d.site_name || ''}`, sub: `${d.volume} куб · ${d.driver_name || ''} · ${d.created_at ? new Date(d.created_at).toLocaleDateString('ru') : ''}`, badgeHtml: badge('В пути', 'transit') })).join('') : emptyState('Нет рейсов в пути')}`;

    } else if (activeTab === 'receipts') {
      let receipts = [];
      try { receipts = await api.get('/api/base/receipts?limit=20') || []; } catch (e) {}
      tabContent = `
      <button class="btn-primary" style="width:100%;margin-bottom:14px" onclick="navigate('#base/receipts/new')">+ Принял топливо</button>
      ${receipts.length ? receipts.map(r => listItem({
        icon: '📥', iconBg: r.ttn_confirmed === true ? 'g' : 'o',
        title: `${r.source_custom || r.supplier_name || '—'} — ${r.volume_nominal} куб`,
        sub: `${r.ttn_number || '—'} · ${r.received_at ? new Date(r.received_at).toLocaleDateString('ru') : ''}`,
        badgeHtml: badge(r.ttn_confirmed === true ? 'Подтверждено' : 'Ожидает', r.ttn_confirmed === true ? 'done' : 'pending')
      })).join('') : emptyState('Нет приёмок')}`;

    } else if (activeTab === 'trips') {
      tabContent = `
      <button class="btn-primary" style="width:100%;margin-bottom:14px" onclick="navigate('#base/dispatches/new')">+ Рейс</button>
      ${dispatches.length ? dispatches.map(d => {
        const isDone = d.status === 'delivered';
        const isTransit = d.status === 'dispatched' || d.status === 'in_transit';
        return `<div class="li">
          <div class="lic tr">🚚</div>
          <div class="lit"><div class="lim">${esc((d.truck_name || ''))} → ${esc(d.site_name || '')}</div><div class="lis">${esc(d.volume + ' куб · ' + (d.driver_name || ''))}</div></div>
          <div class="lir" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            ${isDone ? badge('Доставлено', 'done') : badge('В пути', 'transit')}
            ${isTransit && (isArtem() || isOp()) ? `<button class="prb" onclick="confirmDispatch(${d.id})">Доставлено</button>` : ''}
          </div>
        </div>`;
      }).join('') : emptyState('Нет рейсов')}`;

    } else if (activeTab === 'cash') {
      let cashList = [];
      try { cashList = await api.get('/api/base/cash-artem') || []; } catch (e) {}
      tabContent = `
      ${cashData ? balanceBox(
        [{ label: 'Выдано', val: formatNum(cashData.total_given) + ' ₽' }, { label: 'Освоено', val: '−' + formatNum(cashData.total_spent) + ' ₽', color: 'green' }],
        'Остаток у Артёма', formatNum(cashData.balance) + ' ₽', 'orange'
      ) : '<div class="empty-state">Нет данных по наличным</div>'}
      ${isPartner() ? `<button class="btn-primary" style="width:100%;margin-bottom:14px" onclick="showCashForm()">+ Выдать наличные</button>` : ''}
      ${cashList.length ? cashList.map(c => listItem({ icon: '💵', iconBg: 'o', title: formatNum(c.amount_given) + ' ₽', sub: c.purpose || (c.created_at ? new Date(c.created_at).toLocaleDateString('ru') : '') })).join('') : emptyState('Нет записей')}`;
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
  }

  window.confirmReceipt = async function (id) {
    try {
      await api.put(`/api/base/receipts/${id}/confirm`);
      toast('✅ Приёмка подтверждена!');
      render(location.hash);
    } catch (e) { toast(e.message, 'error'); }
  };

  window.confirmDispatch = async function (id) {
    try {
      await api.put(`/api/base/dispatches/${id}/status`, { status: 'delivered' });
      toast('✅ Доставка подтверждена!');
      render(location.hash);
    } catch (e) { toast(e.message, 'error'); }
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
      ${formField('Фото ТТН', photoButton())}
      <button class="btn-primary" onclick="submitReceiptForm()">Далее →</button>
      <button class="btn-secondary" onclick="navigate('#base')">Отмена</button>
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
    if (sub) sub.innerHTML = `📥 <strong>${esc(source)} → База Тында</strong><br>Объём: <strong>${esc(vol)} куб</strong> (${esc(converted)} приведённых)<br>Плотность: ${esc(density)} · Темп: +${esc(temp)}°C<br>ТТН: ${ttn ? esc(ttn) : '<span style="color:var(--text3)">не указан</span>'}<br><span style="color:var(--orange)">⚠ Фото не прикреплено</span>`;
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
      await api.post('/api/base/receipts', { source_custom: source, volume_nominal: vol, density, temperature: temp, ttn_number: ttn });
      const overlay = document.getElementById('conf-overlay');
      if (overlay) overlay.style.display = 'none';
      toast('✅ Записано! Артём получит уведомление.');
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
      ${formField('Фото ТТН', photoButton())}
      <div style="background:rgba(50,215,75,.06);border:1px solid rgba(50,215,75,.15);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--green)">
        «Доставлено» отмечает Артём или приёмщик, когда водитель вернулся с подписанным ТТН
      </div>
      <button class="btn-primary" onclick="doSubmitDispatch()">Записать рейс</button>
      <button class="btn-secondary" onclick="navigate('#base')">Отмена</button>
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
      await api.post('/api/base/dispatches', {
        truck_id: truckEl ? parseInt(truckEl.getAttribute('data-val')) || null : null,
        driver_id: driverEl ? parseInt(driverEl.getAttribute('data-val')) || null : null,
        site_id: siteEl ? parseInt(siteEl.getAttribute('data-val')) : null,
        truck_owner: ownerMap[ownerRaw] || 'DTL',
        volume: vol,
        ttn_number: ttn
      });
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
      ${active.length ? active.map(o => orderCard({ name: o.client_name, date: o.created_at ? new Date(o.created_at).toLocaleDateString('ru') : '', amount: isPartner() ? formatNum(o.amount_paid) + ' ₽' : null, pricePerLiter: o.price_per_liter ? o.price_per_liter + ' ₽/л' : '', delivered: o.delivered || 0, total: o.volume_ordered || 0, sites: o.sites || [], showFinancials: isPartner() })).join('') : emptyState('Нет активных заказов')}
      ${closed.length ? closed.map(o => orderCard({ name: o.client_name, date: 'Закрыт ' + (o.closed_at ? new Date(o.closed_at).toLocaleDateString('ru') : ''), delivered: o.delivered || 0, total: o.volume_ordered || 0, closed: true, showFinancials: false })).join('') : ''}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('orders');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Заказы клиентов';
  }

  async function viewOrderDetail(id) {
    let order = null;
    try { order = await api.get(`/api/orders/${id}`); } catch (e) {}
    if (!order) { navigate('#orders'); return; }
    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#orders')">Заказы</div><div class="nav-title">${esc(order.client_name)}</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${orderCard({ name: order.client_name, date: order.created_at ? new Date(order.created_at).toLocaleDateString('ru') : '', delivered: order.delivered || 0, total: order.volume_ordered || 0, showFinancials: isPartner(), amount: formatNum(order.amount_paid) + ' ₽', sites: order.sites || [] })}
    </div>`;
    setPageContent(html, getTabBar());
  }

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

  // ── Income ────────────────────────────────────────────────────────────────
  async function viewIncome() {
    if (!isPartner()) { navigate('#home'); return; }
    let records = [];
    try { records = await api.get('/api/income') || []; } catch (e) {}
    const total = records.reduce((s, r) => s + (r.amount || 0), 0);

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">💰 Доходы</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      ${isDesktop() ? `<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" onclick="showIncomeModal()">+ Добавить</button></div>` : ''}
      <div class="stats">
        ${statCard(formatNum(total) + ' ₽', 'Итого доходы', 'a')}
        ${statCard(records.length, 'Записей')}
        ${statCard('—', 'Маржа')}
      </div>
      ${records.length ? records.map(r => listItem({ icon: '💰', iconBg: 'g', title: formatNum(r.amount) + ' ₽', sub: `${r.client_name || ''} · ${r.income_at ? new Date(r.income_at).toLocaleDateString('ru') : ''}` })).join('') : emptyState('Нет доходов')}
      ${!isDesktop() ? `<button class="btn-primary" style="margin-top:12px" onclick="showIncomeModal()">+ Добавить</button>` : ''}
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Доходы';
  }

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

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📋 Расходы</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(formatNum(total) + ' ₽', 'Итого расходы', 'r')}
        ${statCard(records.length, 'Записей')}
        ${statCard('—', 'Категорий')}
      </div>
      ${records.length ? records.map(r => listItem({ icon: '📋', iconBg: 'o', title: formatNum(r.amount) + ' ₽', sub: `${r.category || ''} · ${r.expense_at ? new Date(r.expense_at).toLocaleDateString('ru') : ''}` })).join('') : emptyState('Нет расходов')}
      <button class="btn-primary" style="margin-top:12px" onclick="showExpenseModal()">+ Добавить</button>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Расходы';
  }

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

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">🔁 Найм</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(deals.length, 'Всего сделок')}
        ${statCard('—', 'Выручка млн')}
        ${statCard('—', 'Маржа', 'a')}
      </div>
      ${deals.length ? deals.map(d => `<div class="oc">
        <div class="och">
          <div><div class="ocn">${esc(d.client_name || '')} → ${esc(d.carrier_name || d.carrier_custom || '')}</div><div class="ocd">${[d.delivery_at ? new Date(d.delivery_at).toLocaleDateString('ru') : '', d.supplier_name || ''].filter(Boolean).join(' · ')}</div></div>
          <div><div class="oca">${d.margin_pct ? d.margin_pct + '%' : '—'}</div><div class="ocsub">маржа</div></div>
        </div>
        ${d.volume_liters ? `<div class="ocp-labels"><span>${formatNum(d.volume_liters)} л</span><span>${d.price_client ? d.price_client + ' ₽/л' : ''}</span><span style="color:var(--accent)">${d.price_supplier ? d.price_supplier + ' ₽/л поставщику' : ''}</span></div>` : ''}
      </div>`).join('') : emptyState('Нет сделок')}
      <button class="btn-primary" style="margin-top:12px" onclick="showHireModal()">+ Новая сделка</button>
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Найм';
  }

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
      ${records.length ? records.map(r => listItem({ icon: '📄', iconBg: r.type === 'ДОЛГ' ? 'o' : 'g', title: `${r.debtor} — ${formatNum(Math.abs(r.amount))} ₽`, sub: [r.type === 'ОПЛАТА' ? 'Оплата' : '', r.comment || '', r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('ru') : ''].filter(Boolean).join(' · ') })).join('') : emptyState('Нет записей')}
      ${isPartner() ? `<button class="btn-primary" style="margin-top:12px" onclick="showDebtModal()">+ Запись</button>` : ''}
    </div>`;
    setPageContent(html, getTabBar());
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Долги';
  }

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

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">📊 Дашборд</div><div style="width:55px"></div></div>` : ''}
    <div class="content">
      <div class="stats">
        ${statCard(baseBalance != null ? baseBalance + ' куб' : '—', 'Остаток на базе', 'a')}
        ${statCard(tripsInTransit != null ? tripsInTransit : '—', 'Рейсов в пути', 'o')}
        ${statCard(pendingReceipts != null ? pendingReceipts : '—', 'Ждут подтвержд.')}
      </div>
      ${orders.slice(0, 2).map(o => listItem({ icon: '🚛', iconBg: 'y', title: o.client_name, sub: `${o.delivered || 0} куб из ${o.volume_ordered || 0}`, rightVal: o.volume_ordered > 0 ? Math.round(((o.delivered || 0) / o.volume_ordered) * 100) + '%' : '—' })).join('')}
      ${sectionHeader('Долг DTL перед Артёмом')}
      ${balanceBox(
        [{ label: 'Задолженность по рейсам', val: formatNum(artemDebt) + ' ₽', color: 'red' }, { label: 'Остаток наличных у Артёма', val: formatNum(artemCashBalance) + ' ₽', color: 'green' }],
        'Долг DTL',
        formatNum(Math.max(0, artemDebt)) + ' ₽',
        'orange'
      )}
    </div>`;
    setPageContent(html, getTabBar());
    updateTabBar('dashboard');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Дашборд';
  }

  // ── Fleet ─────────────────────────────────────────────────────────────────
  async function viewFleet() {
    let trucks = [];
    let artemDebtData = null;
    try { trucks = (isArtem() ? await api.get('/api/trucks?owner=Артём') : await api.get('/api/trucks')) || []; } catch (e) {}
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
        <div class="lit"><div class="lim">${esc(t.name)}</div><div class="lis">${t.trips_month || 0} рейсов · ${t.plate || '—'}</div></div>
        <div class="lir" style="display:flex;gap:6px;align-items:center">
          ${t.revenue_month ? `<span style="font-size:13px;font-weight:600">${formatNum(t.revenue_month)} ₽</span>` : ''}
          ${(isPartner() || isArtem()) ? `<button class="prb" onclick="showEditTruckModal(${t.id},'${esc(t.name)}','${esc(t.plate||'')}',${t.tank_volume||0})">✏️</button>` : ''}
          ${(isPartner() || isArtem()) ? `<button class="prb" style="background:var(--red)" onclick="archiveTruck(${t.id})">📦</button>` : ''}
        </div>
      </div>`).join('') : emptyState('Нет машин')}
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

  // ── Settings ──────────────────────────────────────────────────────────────
  async function viewSettings() {
    let sites = [], tariffs = [], suppliers = [], carriers = [], settings = [];
    try { sites = await api.get('/api/sites') || []; } catch (e) {}
    try { tariffs = await api.get('/api/tariffs') || []; } catch (e) {}
    try { suppliers = await api.get('/api/suppliers') || []; } catch (e) {}
    try { carriers = await api.get('/api/carriers') || []; } catch (e) {}
    try { settings = await api.get('/api/settings') || []; } catch (e) {}

    const getSetting = (key, def) => { const s = settings.find(x => x.key === key); return s ? s.value : def; };

    const html = `
    ${!isDesktop() ? statusBar() : ''}
    ${!isDesktop() ? `<div class="nav-bar"><div class="nav-back" onclick="navigate('#home')">Главная</div><div class="nav-title">⚙️ Настройки</div><div style="width:55px"></div></div>` : ''}
    <div class="content">

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

      ${sectionHeader('Тарифы — история')}
      ${tariffs.length ? tariffs.map(t => `<div class="li">
        <div class="lic y">💰</div>
        <div class="lit">
          <div class="lim">${esc(t.site_name || '')} · ${esc(t.truck_owner || '')}</div>
          <div class="lis">${t.valid_from ? 'с ' + t.valid_from : ''}${t.comment ? ' · ' + esc(t.comment) : ''}</div>
        </div>
        <div class="lir"><div class="lival" style="color:var(--accent)">${formatNum(t.amount)} ₽</div></div>
      </div>`).join('') : emptyState('Нет тарифов')}
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="addTariffModal()">+ Добавить тариф</button>` : ''}

      ${sectionHeader('Параметры базы')}
      <div class="bb">
        <div class="bbr"><div class="bbl">Вместимость хранилища (куб)</div><div class="bbv">${getSetting('base_capacity_cubic', '2500')}</div></div>
        <div class="bbr"><div class="bbl">Порог алерта низкого остатка (куб)</div><div class="bbv">${getSetting('alert_low_stock_cubic', '100')}</div></div>
        <div class="bbr"><div class="bbl">Алерт неподтверждённых ТТН (часов)</div><div class="bbv">${getSetting('alert_unconfirmed_hours', '48')}</div></div>
      </div>
      ${isPartner() ? `<button class="btn-secondary" style="width:100%;margin-top:8px" onclick="editSettingsModal()">✏️ Изменить параметры</button>` : ''}

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

  // ── Modal helper ──────────────────────────────────────────────────────────
  function showModal(title, bodyHtml, onSubmit) {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
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
  };

  // ── Analytics (Phase 3) ───────────────────────────────────────────────────
  async function viewAnalytics() {
    try { await _viewAnalytics(); } catch (e) { console.error('[viewAnalytics ERROR]', e); }
  }

  async function _viewAnalytics() {
    if (!isPartner()) { navigate('#home'); return; }
    console.log('[analytics] start, role=', user && user.role, 'hash=', location.hash);

    const now = new Date();
    let selYear = now.getFullYear();
    let selMonth = now.getMonth() + 1;

    // Read hash params if any: #analytics?year=2026&month=5
    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));
    if (hashParams.get('month')) selMonth = parseInt(hashParams.get('month'));
    console.log('[analytics] selYear=', selYear, 'selMonth=', selMonth);

    let summary = null, clients = [], trucks = [], suppliers = [];
    try { summary  = await api.get(`/api/analytics/summary?year=${selYear}&month=${selMonth}`); } catch (e) { console.warn('[analytics] summary err', e); }
    try { clients  = await api.get(`/api/analytics/clients?year=${selYear}`) || []; } catch (e) { console.warn('[analytics] clients err', e); }
    try { trucks   = await api.get(`/api/analytics/trucks?year=${selYear}&month=${selMonth}`) || []; } catch (e) { console.warn('[analytics] trucks err', e); }
    try { suppliers = await api.get(`/api/analytics/suppliers?year=${selYear}`) || []; } catch (e) { console.warn('[analytics] suppliers err', e); }
    console.log('[analytics] data loaded: summary=', !!summary, 'clients=', clients.length, 'trucks=', trucks.length);

    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

    // Period selector (year tabs + month tabs)
    const yearTabsHtml = [selYear, selYear - 1].map(y =>
      `<div class="year-tab${y === selYear ? ' active' : ''}" onclick="navigate('#analytics?year=${y}&month=${selMonth}')">${y}</div>`
    ).join('');

    const monthTabsHtml = months.map((name, i) => {
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

    // Trucks section
    const truckRows = trucks.length ? trucks.map(t => {
      const marginColor = t.margin_pct >= 60 ? 'var(--accent)' : t.margin_pct >= 30 ? 'var(--orange)' : 'var(--red)';
      return listItem({
        icon: '🚛', iconBg: 'y',
        title: t.truck_name,
        sub: `${t.trips} рейсов · ${t.volume} куб`,
        rightVal: t.margin_pct + '%',
        rightSub: 'маржа'
      }).replace('style="font-size:14px;font-weight:700;color:var(--text)"',
        `style="font-size:14px;font-weight:700;color:${marginColor}"`);
    }).join('') : `<div class="empty-state">Нет данных по машинам</div>`;

    // Suppliers section
    const supplierRows = suppliers.length ? suppliers.map(s => {
      const isOrange = s.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(s.supplier_name)}">${esc(s.supplier_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${s.pct_of_total}%"></div></div>
        <div class="prog-mini-val">${s.pct_of_total}%</div>
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

      ${sectionHeader('Итог по машинам')}
      ${truckRows}

      ${sectionHeader('Поставщики — доля закупок')}
      <div class="pi">
        ${supplierRows}
      </div>

      ${sectionHeader('Финансовый итог · ' + monthLabel + ' ' + selYear)}
      <div class="big-stat">
        <div class="bl">💰 Выручка</div>
        <div class="bv">${rev > 0 ? (rev / 1000000).toFixed(2) : '—'} <span class="bu">млн ₽</span></div>
        <div class="bs">Прибыль: <strong style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'}">${profit > 0 ? '+' : ''}${profit > 0 ? (profit / 1000000).toFixed(2) : (profit / 1000000).toFixed(2)} млн ₽</strong> · Маржа: <strong>${marginPct}%</strong></div>
      </div>
    </div>`;

    console.log('[analytics] calling setPageContent');
    setPageContent(html, getTabBar());
    console.log('[analytics] done');
    if (isDesktop() && document.getElementById('topbar-title')) document.getElementById('topbar-title').textContent = 'Аналитика';
    updateSidebarActive('analytics');

    // Animate progress bars after render
    requestAnimationFrame(() => {
      document.querySelectorAll('.prog-mini-fill[data-target]').forEach(el => {
        setTimeout(() => { el.style.width = el.getAttribute('data-target'); }, 50);
      });
    });
  }


  // ── Balance (Phase 3) ─────────────────────────────────────────────────────
  async function viewBalance() {
    if (!isPartner()) { navigate('#home'); return; }

    const now = new Date();
    let selYear = now.getFullYear();
    let selMonth = now.getMonth() + 1;

    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));
    if (hashParams.get('month')) selMonth = parseInt(hashParams.get('month'));

    let monthly = [], current = null;
    try { monthly = await api.get(`/api/balance/monthly?year=${selYear}`) || []; } catch (e) {}
    try { current = await api.get('/api/balance/current'); } catch (e) {}

    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

    // Current month data from monthly array
    const monthData = monthly.find(m => m.month === selMonth) || { assets: 0, liabilities: 0, net_assets: 0 };

    // Month tabs
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
    const maxNet = Math.max(...barData.map(b => b.net), 1);
    const barsHtml = barData.map(b => {
      const heightPx = Math.max(4, Math.round((b.net / maxNet) * 60));
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


  // ── Annual (Phase 3) ──────────────────────────────────────────────────────
  async function viewAnnual() {
    if (!isPartner()) { navigate('#home'); return; }

    const now = new Date();
    let selYear = now.getFullYear();
    const hashParams = new URLSearchParams((location.hash.split('?')[1] || ''));
    if (hashParams.get('year')) selYear = parseInt(hashParams.get('year'));

    let data = null;
    try { data = await api.get(`/api/annual?year=${selYear}`); } catch (e) {}

    const yearTabsHtml = [selYear, selYear - 1].map(y =>
      `<div class="year-tab${y === selYear ? ' active' : ''}" onclick="navigate('#annual?year=${y}')">${y}</div>`
    ).join('');

    const totalRev = data ? (data.revenue_fleet + data.revenue_hire) : 0;
    const totalExp = data ? (data.expenses_fleet + data.expenses_fuel + data.expenses_carriers + data.expenses_general) : 0;
    const profit = data ? data.profit : 0;

    const fmt = (n) => n > 0 ? formatNum(Math.round(n)) : '—';
    const mln = (n) => n > 0 ? (n / 1000000).toFixed(1) : '—';

    const clients = data ? data.clients : [];
    const clientRows = clients.length ? clients.map(c => {
      const isOrange = c.pct_of_total >= 40;
      return `<div class="prog-mini-row">
        <div class="prog-mini-label" title="${esc(c.client_name)}">${esc(c.client_name)}</div>
        <div class="prog-mini-bar"><div class="prog-mini-fill${isOrange ? ' o' : ''}" style="width:0%" data-target="${c.pct_of_total}%"></div></div>
        <div class="prog-mini-val">${c.pct_of_total}%</div>
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

  boot();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
