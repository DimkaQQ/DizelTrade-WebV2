/**
 * DTL Management System – Main Application
 * Vanilla JS SPA, no frameworks, no build tools.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════════════════ */
  window.currentUser = null;

  // Simple key-value cache per route to avoid redundant refetches
  const _cache = {};

  /* ═══════════════════════════════════════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════════════════════════════════════ */

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  function fmt(n, digits = 0) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: digits });
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  function plural(n, one, few, many) {
    const abs = Math.abs(n) % 100;
    const mod10 = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
  }

  function hasRole(...roles) {
    return window.currentUser && roles.includes(window.currentUser.role);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     UI COMPONENTS
     ═══════════════════════════════════════════════════════════════════════════ */

  function card(content) {
    return `<div class="card">${content}</div>`;
  }

  function badge(text, type) {
    return `<span class="badge ${type || ''}">${text}</span>`;
  }

  function badgeNum(n) {
    if (!n) return '';
    return `<span class="badge-num">${n}</span>`;
  }

  function listItem({ icon, iconColor, title, subtitle, rightVal, rightSub, badge: bdg }) {
    return `
      <div class="li">
        ${icon ? `<div class="li-icon" style="background:${iconColor || 'var(--card3)'};">${icon}</div>` : ''}
        <div class="li-body">
          <div class="li-title">${title}</div>
          ${subtitle ? `<div class="li-sub">${subtitle}</div>` : ''}
        </div>
        ${(rightVal || bdg) ? `
          <div class="li-right">
            ${bdg ? bdg : ''}
            ${rightVal ? `<div class="li-val">${rightVal}</div>` : ''}
            ${rightSub ? `<div class="li-sub2">${rightSub}</div>` : ''}
          </div>` : ''}
      </div>`;
  }

  function statBlock(value, label, colorClass) {
    return `<div class="sc ${colorClass || ''}"><div class="val">${value}</div><div class="lbl">${label}</div></div>`;
  }

  function progressBar(percent, color) {
    const pct = Math.min(100, Math.max(0, percent || 0));
    return `
      <div class="progress-wrap">
        <div class="progress-bar" style="width:${pct}%;background:${color || 'var(--accent)'};"></div>
      </div>`;
  }

  function chipSelector(options, selected, onChange, multi) {
    const id = 'chips_' + Math.random().toString(36).slice(2);
    // options: [{value, label}] or ['string']
    const norm = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
    let sel = multi ? (Array.isArray(selected) ? [...selected] : []) : selected;

    const render = () => {
      const el = qs(`#${id}`);
      if (!el) return;
      el.innerHTML = norm.map(o => {
        const active = multi ? sel.includes(o.value) : sel === o.value;
        return `<button class="chip ${active ? 'active' : ''}" data-val="${o.value}">${o.label}</button>`;
      }).join('');
    };

    // We'll attach listeners after inserting into DOM via a special attribute
    const html = `<div class="chips" id="${id}" data-chipsel="${id}"></div>`;

    // Return object with html and a setup function
    return {
      html,
      setup() {
        render();
        const el = qs(`#${id}`);
        if (!el) return;
        el.addEventListener('click', e => {
          const chip = e.target.closest('.chip');
          if (!chip) return;
          const val = chip.dataset.val;
          if (multi) {
            const idx = sel.indexOf(val);
            if (idx >= 0) sel.splice(idx, 1);
            else sel.push(val);
          } else {
            sel = val;
          }
          render();
          onChange(multi ? [...sel] : sel);
        });
      },
      getValue() { return multi ? [...sel] : sel; }
    };
  }

  function toast(message, type) {
    const container = qs('#toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type || 'info'}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function modal({ title, content, onConfirm, onCancel, confirmLabel, cancelLabel, confirmClass }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">${title}</div>
        <div class="modal-body">${content}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">${cancelLabel || 'Отмена'}</button>
          ${onConfirm ? `<button class="btn ${confirmClass || 'btn-accent'}" id="modal-confirm">${confirmLabel || 'Подтвердить'}</button>` : ''}
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      close();
      onCancel && onCancel();
    });

    const confirmBtn = overlay.querySelector('#modal-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        onConfirm && onConfirm(close);
      });
    }

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        close();
        onCancel && onCancel();
      }
    });

    return close;
  }

  function formField(label, inputHTML) {
    return `<div class="fsec"><label>${label}</label>${inputHTML}</div>`;
  }

  function spinner() {
    return '<div class="spinner">Загрузка...</div>';
  }

  function emptyState(icon, text) {
    return `<div class="empty"><div class="empty-icon">${icon}</div><div>${text}</div></div>`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ROUTER
     ═══════════════════════════════════════════════════════════════════════════ */

  const PAGE_TITLES = {
    '#home': 'Главная',
    '#base': 'База Тында',
    '#base/receipts/new': 'Приёмка топлива',
    '#orders': 'Заказы',
    '#income': 'Доходы',
    '#expenses': 'Расходы',
    '#hire': 'Найм',
    '#debts': 'Долги',
    '#dashboard': 'Дашборд',
    '#settings': 'Настройки',
    '#login': 'Вход',
  };

  function navigate(hash) {
    if (location.hash !== hash) location.hash = hash;
    else render(hash);
  }

  window.addEventListener('hashchange', () => render(location.hash));

  /* ═══════════════════════════════════════════════════════════════════════════
     LAYOUT BUILDING
     ═══════════════════════════════════════════════════════════════════════════ */

  function buildLayout() {
    const app = qs('#app');
    if (!window.currentUser) {
      app.innerHTML = '';
      return;
    }

    const role = window.currentUser.role;

    // Desktop sidebar items
    const sidebarItems = getSidebarItems(role);

    app.innerHTML = `
      <nav id="sidebar">
        <div class="sb-logo">DIZEL<span>TRADE</span></div>
        ${sidebarItems.map(item => `
          <div class="sb-item" data-hash="${item.hash}" id="sb-${item.id}">
            <span class="sb-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="sb-badge badge-num" id="sbbadge-${item.id}"></span>` : ''}
          </div>`).join('')}
        <div class="sb-spacer"></div>
        <div class="sb-bottom">
          <div class="sb-user">${window.currentUser.name || window.currentUser.login}</div>
          <button class="btn btn-ghost btn-sm btn-full" id="sb-logout">Выйти</button>
        </div>
      </nav>
      <div id="main-area">
        <header id="topbar">
          <div class="tb-title" id="tb-title">Главная</div>
          <div class="tb-stat" id="tb-base-stat" style="display:none">
            <span>⛽ База:</span>
            <span class="tsv" id="tb-base-val">—</span>
            <span>куб.</span>
          </div>
          <div class="tb-stat" id="tb-transit-stat" style="display:none">
            <span>🚚 В пути:</span>
            <span class="tsv" id="tb-transit-val">—</span>
          </div>
        </header>
        <div id="view-container" class="view"></div>
      </div>
      <div id="tabbar"></div>`;

    // Sidebar click handlers
    sidebarItems.forEach(item => {
      const el = qs(`#sb-${item.id}`);
      if (el) el.addEventListener('click', () => navigate(item.hash));
    });

    qs('#sb-logout').addEventListener('click', handleLogout);

    // Build tabbar
    buildTabbar(role);

    // Fetch topbar stats
    fetchTopbarStats();
  }

  function getSidebarItems(role) {
    const all = [
      { id: 'dashboard', hash: '#dashboard', icon: '📊', label: 'Дашборд' },
      { id: 'base',      hash: '#base',      icon: '⛽', label: 'База Тында', badge: true },
      { id: 'orders',    hash: '#orders',    icon: '📦', label: 'Заказы' },
      { id: 'income',    hash: '#income',    icon: '💰', label: 'Доходы',  roles: ['partner'] },
      { id: 'expenses',  hash: '#expenses',  icon: '📋', label: 'Расходы', roles: ['partner'] },
      { id: 'hire',      hash: '#hire',      icon: '🔁', label: 'Найм',    roles: ['partner'] },
      { id: 'debts',     hash: '#debts',     icon: '📄', label: 'Долги' },
      { id: 'settings',  hash: '#settings',  icon: '⚙️', label: 'Настройки', roles: ['partner'] },
    ];
    return all.filter(i => !i.roles || i.roles.includes(role));
  }

  function getTabItems(role) {
    if (role === 'partner') {
      return [
        { hash: '#home',      icon: '🏠', label: 'Главная' },
        { hash: '#base',      icon: '⛽', label: 'БАЗА' },
        { hash: '#orders',    icon: '📦', label: 'Заказы' },
        { hash: '#dashboard', icon: '📊', label: 'Дашборд' },
      ];
    }
    if (role === 'artem') {
      return [
        { hash: '#home',                  icon: '🏠', label: 'Главная' },
        { hash: '#base?tab=receipts',     icon: '📥', label: 'Принял' },
        { hash: '#base?tab=dispatches',   icon: '🚚', label: 'Рейс' },
        { hash: '#dashboard',             icon: '📊', label: 'Мой парк' },
      ];
    }
    // operator
    return [
      { hash: '#home',                  icon: '🏠', label: 'Главная' },
      { hash: '#base?tab=receipts',     icon: '📥', label: 'Принял' },
      { hash: '#base?tab=dispatches',   icon: '🚚', label: 'Рейс' },
    ];
  }

  function buildTabbar(role) {
    const tabs = getTabItems(role);
    const tabbar = qs('#tabbar');
    if (!tabbar) return;
    tabbar.innerHTML = tabs.map(t => `
      <div class="tab-item" data-hash="${t.hash}">
        <div class="ti-icon">${t.icon}</div>
        <div class="ti-label">${t.label}</div>
      </div>`).join('');

    tabbar.querySelectorAll('.tab-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.hash));
    });
  }

  function updateActiveNav(hash) {
    // Sidebar
    qsa('.sb-item').forEach(el => {
      el.classList.toggle('active', el.dataset.hash === hash || hash.startsWith(el.dataset.hash + '/'));
    });
    // Tabbar
    qsa('.tab-item').forEach(el => {
      const tabHash = el.dataset.hash.split('?')[0];
      const curHash = hash.split('?')[0];
      el.classList.toggle('active', tabHash === curHash);
    });
    // Topbar title
    const titleEl = qs('#tb-title');
    if (titleEl) {
      titleEl.textContent = PAGE_TITLES[hash.split('?')[0]] || 'DIZELTRADE';
    }
  }

  async function fetchTopbarStats() {
    try {
      const data = await api.get('/api/base/balance');
      const valEl = qs('#tb-base-val');
      const transitEl = qs('#tb-transit-val');
      const baseStatEl = qs('#tb-base-stat');
      const transitStatEl = qs('#tb-transit-stat');
      if (valEl && data) {
        valEl.textContent = fmt(data.balance_cubic, 1);
        if (baseStatEl) baseStatEl.style.display = '';
      }
      if (transitEl && data) {
        transitEl.textContent = data.in_transit_count || 0;
        if (transitStatEl) transitStatEl.style.display = '';
      }
      // Update sidebar badge
      const sbbadge = qs('#sbbadge-base');
      if (sbbadge && data && data.pending_count) {
        sbbadge.textContent = data.pending_count;
        sbbadge.style.display = data.pending_count > 0 ? '' : 'none';
      }
    } catch { /* silent */ }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER DISPATCHER
     ═══════════════════════════════════════════════════════════════════════════ */

  async function render(rawHash) {
    const hash = rawHash || '#home';
    const hashBase = hash.split('?')[0];

    if (hashBase === '#login') {
      renderLogin();
      return;
    }

    if (!window.currentUser) {
      navigate('#login');
      return;
    }

    updateActiveNav(hash);

    const container = qs('#view-container') || qs('#app');
    if (container) container.innerHTML = spinner();

    try {
      switch (hashBase) {
        case '#home':        await renderHome(container); break;
        case '#base':        await renderBase(container, hash); break;
        case '#orders':      await renderOrders(container); break;
        case '#income':      await renderIncome(container); break;
        case '#expenses':    await renderExpenses(container); break;
        case '#hire':        await renderHire(container); break;
        case '#debts':       await renderDebts(container); break;
        case '#dashboard':   await renderDashboard(container); break;
        case '#settings':    renderSettings(container); break;
        default:             await renderHome(container);
      }
    } catch (err) {
      if (container) container.innerHTML = `<div class="view-content">${emptyState('⚠️', err.message || 'Ошибка загрузки')}</div>`;
      toast(err.message || 'Ошибка', 'error');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LOGIN VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  function renderLogin() {
    const app = qs('#app');
    app.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">DIZEL<span>TRADE</span></div>
          <div class="login-title">Войти в систему</div>
          <div id="login-err" class="login-err" style="display:none"></div>
          <div class="form-sheet">
            ${formField('Email или телефон', '<input class="finput" id="li-login" type="text" placeholder="Email или телефон" autocomplete="username">')}
            ${formField('Пароль', '<input class="finput" id="li-pass" type="password" placeholder="••••••••" autocomplete="current-password">')}
            <button class="btn btn-accent btn-full" id="li-btn">Войти</button>
          </div>
        </div>
      </div>`;

    const loginInput = qs('#li-login');
    const passInput = qs('#li-pass');
    const btn = qs('#li-btn');
    const errEl = qs('#login-err');

    async function doLogin() {
      const login = loginInput.value.trim();
      const password = passInput.value;
      if (!login || !password) {
        showErr('Введите логин и пароль');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Вхожу...';
      errEl.style.display = 'none';
      try {
        await api.login(login, password);
        const user = await api.get('/api/auth/me');
        window.currentUser = user;
        buildLayout();
        navigate('#home');
      } catch (e) {
        showErr(e.message || 'Неверный логин или пароль');
        btn.disabled = false;
        btn.textContent = 'Войти';
      }
    }

    function showErr(msg) {
      errEl.textContent = msg;
      errEl.style.display = '';
    }

    btn.addEventListener('click', doLogin);
    passInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') passInput.focus(); });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     HOME VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderHome(container) {
    const role = window.currentUser.role;

    if (role === 'partner') {
      await renderHomePartner(container);
    } else if (role === 'artem') {
      await renderHomeArtem(container);
    } else {
      await renderHomeOperator(container);
    }
  }

  async function renderHomePartner(container) {
    let dashData = null;
    let baseData = null;
    try {
      [dashData, baseData] = await Promise.all([
        api.get('/api/dashboard'),
        api.get('/api/base/balance'),
      ]);
    } catch { /* partial data ok */ }

    const alerts = dashData?.alerts || [];
    const pendingCount = baseData?.pending_count || 0;

    container.innerHTML = `
      <div class="navbar">
        <div class="nav-title">Что записать?</div>
      </div>
      <div class="view-content">
        ${alerts.length ? `
          <div class="alert-banner">
            <span class="ab-icon">⚠️</span>
            <span>${alerts.length} ${plural(alerts.length, 'уведомление', 'уведомления', 'уведомлений')}: ${alerts[0]}</span>
          </div>` : ''}
        <div class="menu-grid">
          ${menuCard('⛽', 'БАЗА', '#base', true, pendingCount)}
          ${menuCard('📦', 'Заказы', '#orders')}
          ${menuCard('💰', 'Доходы', '#income')}
          ${menuCard('📋', 'Расходы', '#expenses')}
          ${menuCard('🔁', 'Найм', '#hire')}
          ${menuCard('📄', 'Долги', '#debts')}
          ${menuCard('📊', 'Дашборд', '#dashboard')}
        </div>
      </div>`;

    container.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.hash));
    });
  }

  function menuCard(icon, title, hash, accent, badgeN) {
    return `
      <div class="menu-card ${accent ? 'accent' : ''}" data-hash="${hash}">
        <div class="mc-icon">${icon}</div>
        <div class="mc-title">${title}</div>
        ${badgeN ? `<div class="mc-badge">${badgeNum(badgeN)}</div>` : ''}
      </div>`;
  }

  async function renderHomeArtem(container) {
    let baseData = null;
    let pendingReceipts = [];
    let ordersData = [];

    try {
      [baseData, pendingReceipts, ordersData] = await Promise.all([
        api.get('/api/base/balance'),
        api.get('/api/base/receipts?status=pending'),
        api.get('/api/orders'),
      ]);
    } catch { /* partial */ }

    const pending = Array.isArray(pendingReceipts) ? pendingReceipts : [];
    const orders = Array.isArray(ordersData) ? ordersData : [];

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">База</div></div>
      <div class="view-content">
        <div class="card">
          ${statBlock(fmt(baseData?.balance_cubic, 1) + ' куб', 'Остаток на базе', 'accent')}
        </div>
        ${pending.length ? `
          <div>
            <div class="sec-header"><div class="sec-title">Ожидают подтверждения</div></div>
            <div class="list-group" id="pending-list">
              ${pending.map(r => pendingReceiptItem(r)).join('')}
            </div>
          </div>` : ''}
        <div class="menu-grid">
          ${menuCard('📥', 'Принял топливо', '#base?tab=receipts')}
          ${menuCard('🚚', 'Рейс на участок', '#base?tab=dispatches')}
          ${menuCard('🏗', 'Мой автопарк', '#dashboard')}
        </div>
        ${orders.length ? `
          <div>
            <div class="sec-header"><div class="sec-title">Заказы (прогресс)</div></div>
            <div class="list-group">
              ${orders.map(o => {
                const pct = o.volume_total > 0 ? (o.volume_delivered / o.volume_total * 100) : 0;
                return `<div class="li">
                  <div class="li-body">
                    <div class="li-title">${esc(o.client_name || 'Заказ')}</div>
                    <div style="margin-top:6px;">${progressBar(pct, 'var(--accent)')}</div>
                    <div class="li-sub" style="margin-top:4px;">${fmt(o.volume_delivered, 1)} / ${fmt(o.volume_total, 1)} куб</div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
      </div>`;

    attachPendingConfirm(container);
    container.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.hash));
    });
  }

  async function renderHomeOperator(container) {
    let baseData = null;
    let pendingReceipts = [];

    try {
      [baseData, pendingReceipts] = await Promise.all([
        api.get('/api/base/balance'),
        api.get('/api/base/receipts?status=pending'),
      ]);
    } catch { /* partial */ }

    const pending = Array.isArray(pendingReceipts) ? pendingReceipts : [];

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">База</div></div>
      <div class="view-content">
        <div class="card">
          ${statBlock(fmt(baseData?.balance_cubic, 1) + ' куб', 'Остаток', 'accent')}
        </div>
        ${pending.length ? `
          <div>
            <div class="sec-header"><div class="sec-title">Ожидают подтверждения</div></div>
            <div class="list-group" id="pending-list">
              ${pending.map(r => pendingReceiptItem(r)).join('')}
            </div>
          </div>` : ''}
        <div class="menu-grid">
          ${menuCard('📥', 'Принял топливо', '#base?tab=receipts')}
          ${menuCard('🚚', 'Рейс на участок', '#base?tab=dispatches')}
        </div>
      </div>`;

    attachPendingConfirm(container);
    container.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.hash));
    });
  }

  function pendingReceiptItem(r) {
    return `
      <div class="confirm-item" data-id="${r.id}">
        <div class="ci-body">
          <div class="ci-title">${esc(r.source || '—')} · ${fmt(r.volume, 1)} куб</div>
          <div class="ci-sub">${fmtDate(r.created_at)} · ТТН ${esc(r.ttn_number || '—')}</div>
        </div>
        <button class="btn btn-green btn-sm confirm-btn" data-id="${r.id}">Принял</button>
      </div>`;
  }

  function attachPendingConfirm(container) {
    container.querySelectorAll('.confirm-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await api.put(`/api/base/receipts/${id}/confirm`, {});
          toast('Подтверждено', 'success');
          fetchTopbarStats();
          // Remove from DOM
          const item = btn.closest('.confirm-item');
          if (item) item.remove();
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          btn.disabled = false;
          btn.textContent = 'Принял';
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BASE VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderBase(container, hash) {
    // Parse tab from query string or hash
    const params = new URLSearchParams(hash.split('?')[1] || '');
    let activeTab = params.get('tab') || 'balance';

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">База Тында</div></div>
      <div class="sub-tabs">
        <button class="sub-tab ${activeTab === 'balance' ? 'active' : ''}" data-tab="balance">Остаток</button>
        <button class="sub-tab ${activeTab === 'receipts' ? 'active' : ''}" data-tab="receipts">Приёмки</button>
        <button class="sub-tab ${activeTab === 'dispatches' ? 'active' : ''}" data-tab="dispatches">Рейсы</button>
      </div>
      <div id="base-tab-content"></div>`;

    const tabContent = qs('#base-tab-content', container);

    async function showTab(tab) {
      activeTab = tab;
      container.querySelectorAll('.sub-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
      });
      tabContent.innerHTML = spinner();
      if (tab === 'balance') await renderBaseBalance(tabContent);
      if (tab === 'receipts') await renderBaseReceipts(tabContent);
      if (tab === 'dispatches') await renderBaseDispatches(tabContent);
    }

    container.querySelectorAll('.sub-tab').forEach(el => {
      el.addEventListener('click', () => showTab(el.dataset.tab));
    });

    await showTab(activeTab);
  }

  async function renderBaseBalance(container) {
    const data = await api.get('/api/base/balance');
    let pendingReceipts = [];
    try { pendingReceipts = await api.get('/api/base/receipts?status=pending') || []; } catch { /* ok */ }

    container.innerHTML = `
      <div class="view-content">
        <div class="card">
          <div class="stats-row">
            ${statBlock(fmt(data.balance_cubic, 1), 'Остаток, куб', 'accent')}
            ${statBlock(data.pending_count || 0, 'Ожидает', 'orange')}
            ${statBlock(data.in_transit_count || 0, 'В пути', 'blue')}
          </div>
        </div>
        ${Array.isArray(pendingReceipts) && pendingReceipts.length ? `
          <div>
            <div class="sec-header"><div class="sec-title">Ожидают подтверждения</div></div>
            <div class="list-group" id="pending-list">
              ${pendingReceipts.map(r => pendingReceiptItem(r)).join('')}
            </div>
          </div>` : ''}
      </div>`;

    attachPendingConfirm(container);
  }

  async function renderBaseReceipts(container) {
    const [receipts] = await Promise.all([api.get('/api/base/receipts')]);
    const list = Array.isArray(receipts) ? receipts : [];

    container.innerHTML = `
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-receipt">+ Принял топливо</button>
        ${list.length ? `
          <div class="list-group">
            ${list.map(r => listItem({
              icon: '⛽',
              iconColor: statusColor(r.status),
              title: `${esc(r.source || '—')} · ${fmt(r.volume, 1)} куб`,
              subtitle: `${fmtDate(r.created_at)} · ТТН ${esc(r.ttn_number || '—')}`,
              rightVal: fmt(r.volume_adjusted, 1) + ' куб*',
              badge: badge(statusLabel(r.status), statusBadgeType(r.status)),
            })).join('')}
          </div>` : emptyState('⛽', 'Нет приёмок')}
      </div>`;

    qs('#btn-add-receipt', container).addEventListener('click', () => openReceiptForm(container));
  }

  function statusColor(s) {
    const map = { pending: 'rgba(255,159,10,0.15)', confirmed: 'rgba(50,215,75,0.15)', cancelled: 'rgba(255,69,58,0.15)' };
    return map[s] || 'var(--card3)';
  }
  function statusLabel(s) {
    const map = { pending: 'Ожидает', confirmed: 'Принято', dispatched: 'В пути', delivered: 'Доставлено', cancelled: 'Отменено' };
    return map[s] || s;
  }
  function statusBadgeType(s) {
    const map = { pending: 'pending', confirmed: 'done', dispatched: 'transit', delivered: 'done', cancelled: 'cancelled' };
    return map[s] || '';
  }

  function openReceiptForm(container) {
    const SOURCES = ['Хабаровск', 'Ангарск', 'Коля', 'Восточка', 'Артём закупил', 'Другое'];
    let selectedSource = null;
    const sourceChips = chipSelector(SOURCES, null, val => { selectedSource = val; });

    const close = modal({
      title: 'Принял топливо',
      content: `
        <div class="form-sheet">
          ${formField('Источник', sourceChips.html)}
          ${formField('Объём (куб)', '<input class="finput" id="rf-volume" type="number" step="0.1" min="0" placeholder="0.0">')}
          ${formField('Температура (°C)', '<input class="finput" id="rf-temp" type="number" step="0.1" placeholder="15">')}
          ${formField('Плотность (г/см³)', '<input class="finput" id="rf-density" type="number" step="0.001" min="0" value="0.840" placeholder="0.840">')}
          <div class="tariff-hint" id="rf-adj-hint" style="display:none">Скорректированный объём: <strong id="rf-adj-val">—</strong> куб</div>
          ${formField('Номер ТТН', '<input class="finput" id="rf-ttn" type="text" placeholder="ТТН-0000">')}
        </div>`,
      confirmLabel: 'Сохранить',
      onConfirm: async (closeModal) => {
        const volume = parseFloat(qs('#rf-volume').value);
        const temperature = parseFloat(qs('#rf-temp').value) || null;
        const density = parseFloat(qs('#rf-density').value) || 0.840;
        const ttn_number = qs('#rf-ttn').value.trim();

        if (!selectedSource) { toast('Выберите источник', 'error'); return; }
        if (!volume || volume <= 0) { toast('Укажите объём', 'error'); return; }

        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = 'Сохранение...'; }

        try {
          await api.post('/api/base/receipts', {
            source: selectedSource,
            volume,
            temperature,
            density,
            ttn_number: ttn_number || null,
          });
          closeModal();
          toast('Приёмка добавлена', 'success');
          fetchTopbarStats();
          await renderBaseReceipts(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Сохранить'; }
        }
      },
    });

    sourceChips.setup();

    // Auto-calc adjusted volume
    function updateAdj() {
      const volume = parseFloat(qs('#rf-volume').value) || 0;
      const density = parseFloat(qs('#rf-density').value) || 0.840;
      if (volume > 0) {
        const adj = volume * density / 0.840;
        qs('#rf-adj-val').textContent = fmt(adj, 2);
        qs('#rf-adj-hint').style.display = '';
      } else {
        qs('#rf-adj-hint').style.display = 'none';
      }
    }
    ['#rf-volume', '#rf-density'].forEach(sel => {
      const el = qs(sel);
      if (el) el.addEventListener('input', updateAdj);
    });
  }

  async function renderBaseDispatches(container) {
    const dispatches = await api.get('/api/base/dispatches');
    const list = Array.isArray(dispatches) ? dispatches : [];
    const canConfirm = hasRole('artem', 'operator', 'partner');

    container.innerHTML = `
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-dispatch">+ Рейс на участок</button>
        ${list.length ? `
          <div class="list-group" id="dispatch-list">
            ${list.map(d => dispatchItem(d, canConfirm)).join('')}
          </div>` : emptyState('🚚', 'Нет рейсов')}
      </div>`;

    qs('#btn-add-dispatch', container).addEventListener('click', () => openDispatchForm(container));
    attachDeliveredButtons(container);
  }

  function dispatchItem(d, canConfirm) {
    return `
      <div class="li" data-id="${d.id}">
        <div class="li-icon" style="background:${statusColor(d.status)};">🚚</div>
        <div class="li-body">
          <div class="li-title">${esc(d.site_name || d.site || '—')}</div>
          <div class="li-sub">${esc(d.driver_name || '—')} · ${esc(d.truck_number || '—')} · ${fmt(d.volume, 1)} куб</div>
          <div class="li-sub">${fmtDate(d.created_at)} · ТТН ${esc(d.ttn_number || '—')}</div>
        </div>
        <div class="li-right">
          ${badge(statusLabel(d.status), statusBadgeType(d.status))}
          ${canConfirm && d.status === 'dispatched' ? `<button class="btn btn-green btn-sm delivered-btn" data-id="${d.id}" style="margin-top:6px;">Доставлено</button>` : ''}
        </div>
      </div>`;
  }

  function attachDeliveredButtons(container) {
    container.querySelectorAll('.delivered-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await api.put(`/api/base/dispatches/${id}/status`, { status: 'delivered' });
          toast('Статус обновлён', 'success');
          fetchTopbarStats();
          await renderBaseDispatches(container.closest('.view') || container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          btn.disabled = false;
          btn.textContent = 'Доставлено';
        }
      });
    });
  }

  async function openDispatchForm(container) {
    let trucks = [], drivers = [], sites = [];
    try {
      [trucks, drivers, sites] = await Promise.all([
        api.get('/api/trucks'),
        api.get('/api/drivers'),
        api.get('/api/reference/sites'),
      ]);
    } catch { /* partial */ }

    trucks = Array.isArray(trucks) ? trucks : [];
    drivers = Array.isArray(drivers) ? drivers : [];
    sites = Array.isArray(sites) ? sites : [];

    let selTruck = null, selDriver = null, selSite = null;
    let tariff = null;

    const truckChips = chipSelector(
      trucks.map(t => ({ value: String(t.id || t), label: t.number || t.name || String(t) })),
      null,
      val => { selTruck = val; }
    );
    const driverChips = chipSelector(
      drivers.map(d => ({ value: String(d.id || d), label: d.name || String(d) })),
      null,
      val => { selDriver = val; }
    );
    const siteChips = chipSelector(
      sites.map(s => ({ value: String(s.id || s), label: s.name || String(s) })),
      null,
      async val => {
        selSite = val;
        // fetch tariff
        const hintEl = qs('#df-tariff-hint');
        if (hintEl) hintEl.style.display = 'none';
        if (val) {
          try {
            const resp = await api.get(`/api/tariffs?site_id=${val}`);
            tariff = Array.isArray(resp) ? resp[0] : resp;
            if (tariff && hintEl) {
              hintEl.textContent = `Тариф: ${fmt(tariff.price_per_km || tariff.tariff || 0)} ₽`;
              hintEl.style.display = '';
            }
          } catch { /* ok */ }
        }
      }
    );

    modal({
      title: 'Рейс на участок',
      content: `
        <div class="form-sheet">
          ${formField('Машина', truckChips.html)}
          ${formField('Водитель', driverChips.html)}
          ${formField('Участок', siteChips.html)}
          <div class="tariff-hint" id="df-tariff-hint" style="display:none"></div>
          ${formField('Объём (куб)', '<input class="finput" id="df-volume" type="number" step="0.1" min="0" placeholder="0.0">')}
          ${formField('Номер ТТН', '<input class="finput" id="df-ttn" type="text" placeholder="ТТН-0000">')}
        </div>`,
      confirmLabel: 'Отправить',
      onConfirm: async (closeModal) => {
        const volume = parseFloat(qs('#df-volume').value);
        const ttn_number = qs('#df-ttn').value.trim();

        if (!selTruck) { toast('Выберите машину', 'error'); return; }
        if (!selDriver) { toast('Выберите водителя', 'error'); return; }
        if (!selSite) { toast('Выберите участок', 'error'); return; }
        if (!volume || volume <= 0) { toast('Укажите объём', 'error'); return; }

        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = 'Сохранение...'; }

        try {
          await api.post('/api/base/dispatches', {
            truck_id: selTruck,
            driver_id: selDriver,
            site_id: selSite,
            volume,
            ttn_number: ttn_number || null,
          });
          closeModal();
          toast('Рейс создан', 'success');
          fetchTopbarStats();
          await renderBaseDispatches(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Отправить'; }
        }
      },
    });

    truckChips.setup();
    driverChips.setup();
    siteChips.setup();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ORDERS VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderOrders(container) {
    const orders = await api.get('/api/orders');
    const list = Array.isArray(orders) ? orders : [];
    const isPartner = hasRole('partner');

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Заказы</div></div>
      <div class="view-content">
        ${isPartner ? '<button class="btn btn-accent btn-full" id="btn-add-order">+ Новый заказ</button>' : ''}
        ${list.length ? list.map(o => orderCard(o, isPartner)).join('') : emptyState('📦', 'Нет заказов')}
      </div>`;

    const addBtn = qs('#btn-add-order', container);
    if (addBtn) addBtn.addEventListener('click', () => openOrderForm(container));

    container.querySelectorAll('.order-report-btn').forEach(btn => {
      btn.addEventListener('click', () => toast('Функция в разработке', 'info'));
    });
  }

  function orderCard(o, isPartner) {
    const pct = o.volume_total > 0 ? (o.volume_delivered / o.volume_total * 100) : 0;
    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-client">${esc(o.client_name || '—')}</div>
            <div class="order-meta">${fmtDate(o.created_at)} · ${esc(o.sites?.join(', ') || '—')}</div>
          </div>
          ${badge(statusLabel(o.status || 'active'), statusBadgeType(o.status || 'active'))}
        </div>
        <div>
          ${progressBar(pct, 'var(--accent)')}
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--text2);">
            <span>${fmt(o.volume_delivered, 1)} / ${fmt(o.volume_total, 1)} куб</span>
            <span>${Math.round(pct)}%</span>
          </div>
        </div>
        ${isPartner ? `
          <div class="stats-row">
            ${statBlock(fmt(o.amount_total, 0) + ' ₽', 'Сумма', '')}
            ${statBlock(fmt(o.price_per_liter, 2) + ' ₽', 'Цена/л', '')}
            ${statBlock(fmt(o.amount_paid, 0) + ' ₽', 'Оплачено', 'green')}
          </div>
          <button class="btn btn-ghost btn-sm order-report-btn">📄 Отчёт</button>` : ''}
      </div>`;
  }

  async function openOrderForm(container) {
    let clients = [];
    try { clients = await api.get('/api/reference/clients') || []; } catch { /* ok */ }
    clients = Array.isArray(clients) ? clients : [];

    let selClient = null;
    const clientChips = chipSelector(
      clients.map(c => ({ value: String(c.id || c), label: c.name || String(c) })),
      null,
      val => { selClient = val; }
    );

    modal({
      title: 'Новый заказ',
      content: `
        <div class="form-sheet">
          ${formField('Клиент', clientChips.html)}
          ${formField('Объём (куб)', '<input class="finput" id="of-volume" type="number" step="0.1" min="0" placeholder="0.0">')}
          ${formField('Цена за литр (₽)', '<input class="finput" id="of-price" type="number" step="0.01" min="0" placeholder="0.00">')}
          ${formField('Дата оплаты', '<input class="finput" id="of-paid-at" type="date">')}
        </div>`,
      confirmLabel: 'Создать',
      onConfirm: async (closeModal) => {
        const volume = parseFloat(qs('#of-volume').value);
        const price_per_liter = parseFloat(qs('#of-price').value);
        const paid_at = qs('#of-paid-at').value || null;

        if (!selClient) { toast('Выберите клиента', 'error'); return; }
        if (!volume || volume <= 0) { toast('Укажите объём', 'error'); return; }
        if (!price_per_liter || price_per_liter <= 0) { toast('Укажите цену', 'error'); return; }

        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = 'Создание...'; }

        try {
          await api.post('/api/orders', { client_id: selClient, volume_total: volume, price_per_liter, paid_at });
          closeModal();
          toast('Заказ создан', 'success');
          await renderOrders(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Создать'; }
        }
      },
    });

    clientChips.setup();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INCOME VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderIncome(container) {
    if (!hasRole('partner')) { container.innerHTML = emptyState('🔒', 'Нет доступа'); return; }
    const income = await api.get('/api/income');
    const list = Array.isArray(income) ? income : [];

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Доходы</div></div>
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-income">+ Добавить доход</button>
        ${list.length ? `<div class="list-group">${list.map(i => listItem({
          icon: '💰',
          iconColor: 'rgba(50,215,75,0.15)',
          title: esc(i.description || 'Доход'),
          subtitle: fmtDate(i.date || i.created_at),
          rightVal: `<span class="rec-amount plus">+${fmt(i.amount, 0)} ₽</span>`,
        })).join('')}</div>` : emptyState('💰', 'Нет доходов')}
      </div>`;

    qs('#btn-add-income', container).addEventListener('click', () => openIncomeForm(container));
  }

  function openIncomeForm(container) {
    modal({
      title: 'Добавить доход',
      content: `
        <div class="form-sheet">
          ${formField('Сумма (₽)', '<input class="finput" id="if-amount" type="number" step="0.01" min="0" placeholder="0.00">')}
          ${formField('Описание', '<input class="finput" id="if-desc" type="text" placeholder="Описание дохода">')}
          ${formField('Дата', '<input class="finput" id="if-date" type="date">')}
        </div>`,
      confirmLabel: 'Сохранить',
      onConfirm: async (closeModal) => {
        const amount = parseFloat(qs('#if-amount').value);
        const description = qs('#if-desc').value.trim();
        const date = qs('#if-date').value || null;
        if (!amount || amount <= 0) { toast('Укажите сумму', 'error'); return; }
        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try {
          await api.post('/api/income', { amount, description, date });
          closeModal();
          toast('Доход добавлен', 'success');
          await renderIncome(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Сохранить'; }
        }
      },
    });
    // Set today as default date
    const dateEl = qs('#if-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     EXPENSES VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderExpenses(container) {
    if (!hasRole('partner')) { container.innerHTML = emptyState('🔒', 'Нет доступа'); return; }
    const expenses = await api.get('/api/expenses');
    const list = Array.isArray(expenses) ? expenses : [];

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Расходы</div></div>
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-expense">+ Добавить расход</button>
        ${list.length ? `<div class="list-group">${list.map(e => listItem({
          icon: '📋',
          iconColor: 'rgba(255,69,58,0.15)',
          title: esc(e.description || 'Расход'),
          subtitle: `${esc(e.category || '')} · ${fmtDate(e.date || e.created_at)}`,
          rightVal: `<span class="rec-amount minus">-${fmt(e.amount, 0)} ₽</span>`,
        })).join('')}</div>` : emptyState('📋', 'Нет расходов')}
      </div>`;

    qs('#btn-add-expense', container).addEventListener('click', () => openExpenseForm(container));
  }

  function openExpenseForm(container) {
    const CATEGORIES = ['Топливо', 'Зарплата', 'Техника', 'Офис', 'Транспорт', 'Другое'];
    let selCat = null;
    const catChips = chipSelector(CATEGORIES, null, val => { selCat = val; });

    modal({
      title: 'Добавить расход',
      content: `
        <div class="form-sheet">
          ${formField('Сумма (₽)', '<input class="finput" id="ef-amount" type="number" step="0.01" min="0" placeholder="0.00">')}
          ${formField('Описание', '<input class="finput" id="ef-desc" type="text" placeholder="Описание расхода">')}
          ${formField('Категория', catChips.html)}
          ${formField('Дата', '<input class="finput" id="ef-date" type="date">')}
        </div>`,
      confirmLabel: 'Сохранить',
      onConfirm: async (closeModal) => {
        const amount = parseFloat(qs('#ef-amount').value);
        const description = qs('#ef-desc').value.trim();
        const date = qs('#ef-date').value || null;
        if (!amount || amount <= 0) { toast('Укажите сумму', 'error'); return; }
        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try {
          await api.post('/api/expenses', { amount, description, category: selCat, date });
          closeModal();
          toast('Расход добавлен', 'success');
          await renderExpenses(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Сохранить'; }
        }
      },
    });
    catChips.setup();
    const dateEl = qs('#ef-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     HIRE VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderHire(container) {
    if (!hasRole('partner')) { container.innerHTML = emptyState('🔒', 'Нет доступа'); return; }
    const hire = await api.get('/api/hire');
    const list = Array.isArray(hire) ? hire : [];

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Найм</div></div>
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-hire">+ Новая сделка</button>
        ${list.length ? `<div style="display:flex;flex-direction:column;gap:12px;" id="hire-list">
          ${list.map(h => hireCard(h)).join('')}
        </div>` : emptyState('🔁', 'Нет сделок')}
      </div>`;

    qs('#btn-add-hire', container).addEventListener('click', () => openHireForm(container));
  }

  function hireCard(h) {
    const volume = h.volume || 0;
    const margin = ((h.price_per_liter_client || 0) - (h.price_per_liter_supplier || 0) - (h.price_per_liter_carrier || 0));
    const profit = margin * volume * 1000; // куб → л
    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-client">${esc(h.supplier_name || h.supplier || '—')}</div>
            <div class="order-meta">${fmtDate(h.date)} · ${esc(h.carrier_name || h.carrier || '—')}</div>
          </div>
          <div>${fmt(volume, 1)} куб</div>
        </div>
        <div class="calc-box">
          <div class="calc-row"><span>Клиент</span><span class="cv">${fmt(h.price_per_liter_client, 2)} ₽/л</span></div>
          <div class="calc-row"><span>Поставщик</span><span>${fmt(h.price_per_liter_supplier, 2)} ₽/л</span></div>
          <div class="calc-row"><span>Перевозчик</span><span>${fmt(h.price_per_liter_carrier, 2)} ₽/л</span></div>
          <div class="divider"></div>
          <div class="calc-row"><span>Маржа</span><span class="cv">${fmt(profit, 0)} ₽</span></div>
        </div>
      </div>`;
  }

  async function openHireForm(container) {
    let suppliers = [], carriers = [];
    try {
      [suppliers, carriers] = await Promise.all([
        api.get('/api/reference/suppliers'),
        api.get('/api/reference/carriers'),
      ]);
    } catch { /* partial */ }
    suppliers = Array.isArray(suppliers) ? suppliers : [];
    carriers = Array.isArray(carriers) ? carriers : [];

    let selSupplier = null, selCarrier = null;
    const supplierChips = chipSelector(
      suppliers.map(s => ({ value: String(s.id || s), label: s.name || String(s) })),
      null, val => { selSupplier = val; }
    );
    const carrierChips = chipSelector(
      carriers.map(c => ({ value: String(c.id || c), label: c.name || String(c) })),
      null, val => { selCarrier = val; }
    );

    modal({
      title: 'Новая сделка',
      content: `
        <div class="form-sheet">
          ${formField('Дата', '<input class="finput" id="hf-date" type="date">')}
          ${formField('Объём (куб)', '<input class="finput" id="hf-volume" type="number" step="0.1" min="0" placeholder="0.0">')}
          ${formField('Цена клиента (₽/л)', '<input class="finput" id="hf-price-client" type="number" step="0.01" placeholder="0.00">')}
          ${formField('Цена поставщика (₽/л)', '<input class="finput" id="hf-price-supplier" type="number" step="0.01" placeholder="0.00">')}
          ${formField('Цена перевозчика (₽/л)', '<input class="finput" id="hf-price-carrier" type="number" step="0.01" placeholder="0.00">')}
          <div class="calc-box" id="hf-calc" style="display:none">
            <div class="calc-row"><span>Маржа/л</span><span class="cv" id="hf-margin-l">—</span></div>
            <div class="calc-row"><span>Итого прибыль</span><span class="cv" id="hf-profit">—</span></div>
          </div>
          ${formField('Поставщик', supplierChips.html)}
          ${formField('Перевозчик', carrierChips.html)}
        </div>`,
      confirmLabel: 'Сохранить',
      onConfirm: async (closeModal) => {
        const date = qs('#hf-date').value;
        const volume = parseFloat(qs('#hf-volume').value);
        const price_per_liter_client = parseFloat(qs('#hf-price-client').value);
        const price_per_liter_supplier = parseFloat(qs('#hf-price-supplier').value);
        const price_per_liter_carrier = parseFloat(qs('#hf-price-carrier').value);
        if (!volume || volume <= 0) { toast('Укажите объём', 'error'); return; }
        if (!price_per_liter_client) { toast('Укажите цену клиента', 'error'); return; }
        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try {
          await api.post('/api/hire', {
            date: date || null,
            volume,
            price_per_liter_client,
            price_per_liter_supplier,
            price_per_liter_carrier,
            supplier_id: selSupplier,
            carrier_id: selCarrier,
          });
          closeModal();
          toast('Сделка добавлена', 'success');
          await renderHire(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Сохранить'; }
        }
      },
    });

    supplierChips.setup();
    carrierChips.setup();

    // Set default date
    const dateEl = qs('#hf-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

    // Auto-calc
    function updateCalc() {
      const volume = parseFloat(qs('#hf-volume').value) || 0;
      const pc = parseFloat(qs('#hf-price-client').value) || 0;
      const ps = parseFloat(qs('#hf-price-supplier').value) || 0;
      const pcar = parseFloat(qs('#hf-price-carrier').value) || 0;
      const margin = pc - ps - pcar;
      const profit = margin * volume * 1000;
      const calcEl = qs('#hf-calc');
      if (calcEl && (volume > 0 || pc > 0)) {
        calcEl.style.display = '';
        qs('#hf-margin-l').textContent = fmt(margin, 2) + ' ₽/л';
        qs('#hf-profit').textContent = fmt(profit, 0) + ' ₽';
      }
    }
    ['#hf-volume', '#hf-price-client', '#hf-price-supplier', '#hf-price-carrier'].forEach(sel => {
      const el = qs(sel);
      if (el) el.addEventListener('input', updateCalc);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DEBTS VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderDebts(container) {
    const debts = await api.get('/api/debts');
    const data = Array.isArray(debts) ? debts : (debts?.records || []);
    const summary = debts?.summary || buildDebtSummary(data);

    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Долги</div></div>
      <div class="view-content">
        <button class="btn btn-accent btn-full" id="btn-add-debt">+ Запись</button>
        ${Object.keys(summary).length ? `
          <div class="card">
            <div class="sec-title" style="margin-bottom:8px;">Балансы</div>
            ${Object.entries(summary).map(([name, bal]) => `
              <div class="debt-row">
                <div class="debt-name">${esc(name)}</div>
                <div class="debt-amount ${bal >= 0 ? 'positive' : 'negative'}">${bal >= 0 ? '+' : ''}${fmt(bal, 0)} ₽</div>
              </div>`).join('')}
          </div>` : ''}
        ${data.length ? `<div class="list-group">${data.map(d => listItem({
          icon: '📄',
          iconColor: d.amount >= 0 ? 'rgba(50,215,75,0.15)' : 'rgba(255,69,58,0.15)',
          title: esc(d.debtor || d.name || '—'),
          subtitle: `${esc(d.description || '')} · ${fmtDate(d.date || d.created_at)}`,
          rightVal: `<span class="rec-amount ${d.amount >= 0 ? 'plus' : 'minus'}">${d.amount >= 0 ? '+' : ''}${fmt(Math.abs(d.amount), 0)} ₽</span>`,
        })).join('')}</div>` : emptyState('📄', 'Нет записей')}
      </div>`;

    qs('#btn-add-debt', container).addEventListener('click', () => openDebtForm(container));
  }

  function buildDebtSummary(records) {
    const s = {};
    records.forEach(r => {
      const key = r.debtor || r.name || '—';
      s[key] = (s[key] || 0) + (r.amount || 0);
    });
    return s;
  }

  function openDebtForm(container) {
    modal({
      title: 'Новая запись',
      content: `
        <div class="form-sheet">
          ${formField('Должник/Контрагент', '<input class="finput" id="df2-debtor" type="text" placeholder="Имя или название">')}
          ${formField('Сумма (₽, минус = долг нам)', '<input class="finput" id="df2-amount" type="number" step="0.01" placeholder="0.00">')}
          ${formField('Описание', '<input class="finput" id="df2-desc" type="text" placeholder="За что">')}
        </div>`,
      confirmLabel: 'Сохранить',
      onConfirm: async (closeModal) => {
        const debtor = qs('#df2-debtor').value.trim();
        const amount = parseFloat(qs('#df2-amount').value);
        const description = qs('#df2-desc').value.trim();
        if (!debtor) { toast('Укажите должника', 'error'); return; }
        if (isNaN(amount)) { toast('Укажите сумму', 'error'); return; }
        const btn = qs('#modal-confirm');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        try {
          await api.post('/api/debts', { debtor, amount, description });
          closeModal();
          toast('Запись добавлена', 'success');
          await renderDebts(container);
        } catch (e) {
          toast(e.message || 'Ошибка', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Сохранить'; }
        }
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DASHBOARD VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  async function renderDashboard(container) {
    const data = await api.get('/api/dashboard');

    const alerts = data?.alerts || [];
    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Дашборд</div></div>
      <div class="view-content">
        ${alerts.length ? `
          <div class="alert-banner">
            <span class="ab-icon">⚠️</span>
            <span>${alerts.join(' · ')}</span>
          </div>` : ''}
        <div class="dash-grid">
          <div class="dash-tile">
            ${statBlock(fmt(data?.base_balance, 1) + ' куб', 'База Тында', 'accent')}
          </div>
          <div class="dash-tile">
            ${statBlock(data?.trips_in_transit ?? '—', 'Рейсов в пути', 'blue')}
          </div>
          <div class="dash-tile">
            ${statBlock(data?.pending_receipts ?? '—', 'Ожидают приёмки', 'orange')}
          </div>
          ${hasRole('partner') ? `
            <div class="dash-tile">
              ${statBlock(fmt(data?.artem_cash_balance, 0) + ' ₽', 'Касса Артёма', '')}
            </div>
            <div class="dash-tile">
              ${statBlock(fmt(data?.artem_debt, 0) + ' ₽', 'Долг Артёма', data?.artem_debt > 0 ? 'red' : 'green')}
            </div>` : ''}
        </div>
        ${alerts.length ? `
          <div class="card">
            <div class="sec-title" style="margin-bottom:8px;">Уведомления</div>
            ${alerts.map(a => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--orange);">⚠️ ${esc(a)}</div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SETTINGS VIEW
     ═══════════════════════════════════════════════════════════════════════════ */

  function renderSettings(container) {
    container.innerHTML = `
      <div class="navbar"><div class="nav-title">Настройки</div></div>
      <div class="settings-placeholder">
        <div style="font-size:48px;">⚙️</div>
        <div style="font-size:18px;font-weight:700;">Настройки</div>
        <div>Раздел в разработке</div>
      </div>`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LOGOUT
     ═══════════════════════════════════════════════════════════════════════════ */

  async function handleLogout() {
    try { await api.logout(); } catch { /* ignore */ }
    window.currentUser = null;
    navigate('#login');
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ESCAPE HTML
     ═══════════════════════════════════════════════════════════════════════════ */

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SERVICE WORKER REGISTRATION
     ═══════════════════════════════════════════════════════════════════════════ */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════════════════ */

  async function boot() {
    const spinner = qs('#init-spinner');

    try {
      // Try to restore session via refresh cookie
      await api.refresh();
      const user = await api.get('/api/auth/me');
      window.currentUser = user;
      buildLayout();

      const hash = location.hash || '#home';
      if (!hash || hash === '#' || hash === '#login') {
        navigate('#home');
      } else {
        await render(hash);
      }
    } catch {
      // No valid session – show login
      if (spinner) spinner.remove();
      renderLogin();
      return;
    }

    if (spinner) spinner.remove();
  }

  // Start
  boot();

})();
