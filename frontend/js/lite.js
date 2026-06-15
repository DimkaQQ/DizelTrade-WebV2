/**
 * DIZELTRADE · ЛЁГКАЯ ВЕРСИЯ
 * Упрощённый интерфейс поверх того же backend API (см. /js/api.js).
 * Цель: просто записывать и просматривать данные, с понятными ролями.
 *
 * Структура: один роутер по hash, для каждого раздела — функция screen*().
 * Формы открываются через openSheet() — единый компонент всплывающего окна.
 */
(async () => {
  'use strict';

  let user = null;

  /* ═══════════════════════════ ХЕЛПЕРЫ ═══════════════════════════ */
  const $root = () => document.getElementById('root');
  const $content = () => document.getElementById('app-content');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Роли
  const isPartner = () => user && user.role === 'partner';
  const isArtem = () => user && user.role === 'artem';
  const isOp = () => user && user.role === 'operator';
  function roleLabel(r) {
    return r === 'partner' ? 'Партнёр · полный доступ'
      : r === 'artem' ? 'Артём · свой парк'
      : r === 'operator' ? 'Оператор · приём и расходы' : r;
  }

  // Форматирование
  function fmtNum(n) {
    if (n == null || n === '') return '—';
    return Number(n).toLocaleString('ru');
  }
  function fmtMoney(n) {
    if (n == null || n === '') return '—';
    return Math.round(Number(n)).toLocaleString('ru') + ' ₽';
  }
  function fmtCub(n) {
    if (n == null || n === '') return '—';
    return Number(n).toLocaleString('ru', { maximumFractionDigits: 1 }) + ' куб';
  }
  function fmtDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return esc(s);
    return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function fmtDateTime(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return esc(s);
    return d.toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function navigate(hash) { location.hash = hash; }

  /* ═══════════════════════════ TOAST ═══════════════════════════ */
  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'error' || type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const dur = (type === 'error' || type === 'err') ? 5000 : 2600;
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, dur);
  }

  /* ═══════════════════════════ КОМПОНЕНТЫ ═══════════════════════════ */
  const spinner = () => `<div class="spin-wrap"><div class="spin"></div></div>`;

  function empty(text, icon = '📭') {
    return `<div class="empty"><div class="ei">${icon}</div><div class="et">${esc(text)}</div></div>`;
  }

  function note(text, kind = 'info') {
    return `<div class="note ${kind}">${text}</div>`;
  }

  function badge(text, kind = 'gray') {
    return `<span class="badge ${kind}">${esc(text)}</span>`;
  }

  function stat(label, value, kind = '', extra = '') {
    return `<div class="stat ${kind}"><div class="sl">${esc(label)}</div>`
      + `<div class="sv">${value}</div>`
      + (extra ? `<div class="sx">${extra}</div>` : '') + `</div>`;
  }

  function pageHead(title, sub, actionHtml = '') {
    return `<div class="page-head"><div class="pt"><h1>${esc(title)}</h1>`
      + (sub ? `<div class="psub">${esc(sub)}</div>` : '') + `</div>`
      + (actionHtml || '') + `</div>`;
  }

  // Строка списка. opts: {icon, iconKind, title, sub, val, valKind, vsub, onClick, badge}
  function row(opts) {
    const tap = opts.onClick ? ' tap' : '';
    const click = opts.onClick ? ` onclick="${opts.onClick}"` : '';
    return `<div class="row${tap}"${click}>`
      + (opts.icon ? `<div class="ricon ${opts.iconKind || ''}">${opts.icon}</div>` : '')
      + `<div class="rmain"><div class="rtitle">${opts.title}</div>`
      + (opts.sub ? `<div class="rsub">${opts.sub}</div>` : '') + `</div>`
      + (opts.val != null || opts.badge || opts.vsub
        ? `<div class="rright">`
          + (opts.badge ? opts.badge : '')
          + (opts.val != null ? `<div class="rval ${opts.valKind || ''}">${opts.val}</div>` : '')
          + (opts.vsub ? `<div class="rvsub">${opts.vsub}</div>` : '')
          + `</div>` : '')
      + `</div>`;
  }

  /* ═══════════════════════════ ФОРМА-ШИТ ═══════════════════════════
     openSheet({title, fields, submitLabel}) -> Promise(values | null)
     Каждое поле: {name, label, type, required, value, placeholder, options, hint, half}
       type: text | number | date | select | chips | textarea
     Для select/chips: options = [{value,label}] или [string]
     onChange(values, setField) — пересчёт (например авто-расчёт) можно навесить отдельно.
  ════════════════════════════════════════════════════════════════ */
  function fieldHtml(f) {
    const id = 'f_' + f.name;
    const req = f.required ? ' <span class="req">*</span>' : '';
    let inner = '';
    if (f.type === 'select') {
      const opts = (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        const sel = String(v) === String(f.value ?? '') ? ' selected' : '';
        return `<option value="${esc(v)}"${sel}>${esc(l)}</option>`;
      }).join('');
      const ph = f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : '';
      inner = `<select id="${id}" data-name="${esc(f.name)}">${ph}${opts}</select>`;
    } else if (f.type === 'chips') {
      inner = `<div class="chips" data-name="${esc(f.name)}">` + (f.options || []).map(o => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        const sel = String(v) === String(f.value ?? '') ? ' sel' : '';
        return `<div class="chip${sel}" data-val="${esc(v)}">${esc(l)}</div>`;
      }).join('') + `</div>`;
    } else if (f.type === 'textarea') {
      inner = `<textarea id="${id}" data-name="${esc(f.name)}" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
    } else {
      const t = f.type || 'text';
      const step = t === 'number' ? ' step="any" inputmode="decimal"' : '';
      inner = `<input id="${id}" data-name="${esc(f.name)}" type="${t}"${step} value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}">`;
    }
    return `<div class="field" data-field="${esc(f.name)}">`
      + (f.label ? `<label for="${id}">${esc(f.label)}${req}</label>` : '')
      + inner
      + (f.hint ? `<div class="hint">${f.hint}</div>` : '')
      + (f.calcId ? `<div class="calc" id="${f.calcId}" style="display:none"></div>` : '')
      + `</div>`;
  }

  function readSheetValues(sheetEl) {
    const vals = {};
    sheetEl.querySelectorAll('input[data-name],select[data-name],textarea[data-name]').forEach(el => {
      vals[el.dataset.name] = el.value;
    });
    sheetEl.querySelectorAll('.chips[data-name]').forEach(g => {
      const sel = g.querySelector('.chip.sel');
      vals[g.dataset.name] = sel ? sel.dataset.val : '';
    });
    return vals;
  }

  function openSheet(cfg) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      const half = cfg.fields.map(f => f.half);
      // Группируем половинные поля парами
      let body = '';
      for (let i = 0; i < cfg.fields.length; i++) {
        const f = cfg.fields[i];
        if (f.half && cfg.fields[i + 1] && cfg.fields[i + 1].half) {
          body += `<div class="field-row">${fieldHtml(f)}${fieldHtml(cfg.fields[i + 1])}</div>`;
          i++;
        } else {
          body += fieldHtml(f);
        }
      }
      ov.innerHTML = `<div class="sheet">
        <div class="sheet-head"><h2>${esc(cfg.title)}</h2><span class="x">×</span></div>
        <div class="sheet-body">${body}</div>
        <div class="sheet-foot"><button class="btn btn-primary" id="sheet-submit">${esc(cfg.submitLabel || 'Сохранить')}</button></div>
      </div>`;
      document.body.appendChild(ov);

      const close = (result) => { ov.remove(); resolve(result); };
      ov.querySelector('.x').onclick = () => close(null);
      ov.onclick = (e) => { if (e.target === ov) close(null); };

      // Чипсы
      ov.querySelectorAll('.chips').forEach(g => g.addEventListener('click', e => {
        const chip = e.target.closest('.chip'); if (!chip) return;
        g.querySelectorAll('.chip').forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        if (cfg.onChange) cfg.onChange(readSheetValues(ov), ov);
      }));
      // Изменения
      if (cfg.onChange) {
        ov.querySelectorAll('input,select,textarea').forEach(el =>
          el.addEventListener('input', () => cfg.onChange(readSheetValues(ov), ov)));
        cfg.onChange(readSheetValues(ov), ov);
      }

      ov.querySelector('#sheet-submit').onclick = async () => {
        const vals = readSheetValues(ov);
        // Проверка обязательных
        for (const f of cfg.fields) {
          if (f.required && (vals[f.name] == null || vals[f.name] === '')) {
            toast('Заполните: ' + (f.label || f.name), 'err'); return;
          }
        }
        const btn = ov.querySelector('#sheet-submit');
        btn.disabled = true;
        try {
          if (cfg.onSubmit) {
            const ok = await cfg.onSubmit(vals, ov);
            if (ok === false) { btn.disabled = false; return; }
          }
          close(vals);
        } catch (e) {
          toast(e.message || 'Ошибка', 'err');
          btn.disabled = false;
        }
      };
    });
  }

  // Простое подтверждение действия
  function confirmAction({ title, text, okLabel = 'Подтвердить', danger = false }) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'overlay center';
      ov.innerHTML = `<div class="confirm">
        <h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn-sec" id="c-no">Отмена</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="c-yes">${esc(okLabel)}</button>
        </div></div>`;
      document.body.appendChild(ov);
      const close = (v) => { ov.remove(); resolve(v); };
      ov.querySelector('#c-no').onclick = () => close(false);
      ov.querySelector('#c-yes').onclick = () => close(true);
      ov.onclick = e => { if (e.target === ov) close(false); };
    });
  }

  /* ═══════════════════════════ НАВИГАЦИЯ ═══════════════════════════
     Пункты меню по ролям. Каждый: {hash, icon, label}
  ════════════════════════════════════════════════════════════════ */
  function navItems() {
    if (isPartner()) {
      return [
        { hash: 'home', icon: '🏠', label: 'Главная' },
        { hash: 'base', icon: '🛢️', label: 'База' },
        { hash: 'orders', icon: '📦', label: 'Заказы' },
        { hash: 'finance', icon: '💰', label: 'Финансы' },
        { hash: 'fleet', icon: '🚚', label: 'Парк' },
        { hash: 'reports', icon: '📊', label: 'Отчёты' },
      ];
    }
    if (isArtem()) {
      return [
        { hash: 'home', icon: '🏠', label: 'Главная' },
        { hash: 'fleet', icon: '🚚', label: 'Парк' },
        { hash: 'base', icon: '🛢️', label: 'База' },
      ];
    }
    // operator
    return [
      { hash: 'home', icon: '🏠', label: 'Главная' },
      { hash: 'base', icon: '🛢️', label: 'Приём' },
      { hash: 'fleet', icon: '🏗️', label: 'Парк Артёма' },
    ];
  }

  function renderNav(activeHash) {
    const items = navItems();
    const base = (activeHash || 'home').split('?')[0].split('/')[0];
    return `<div class="nav">` + items.map(it =>
      `<div class="nav-item ${it.hash === base ? 'active' : ''}" onclick="location.hash='#${it.hash}'">
        <div class="ni">${it.icon}</div><div class="nl">${esc(it.label)}</div></div>`).join('') + `</div>`;
  }

  function switchToFull() {
    try { localStorage.setItem('dtl_ui', 'full'); } catch (e) {}
    location.href = '/';
  }
  window._liteSwitchFull = switchToFull;

  async function doLogout() {
    try { await api.logout(); } catch (e) {}
    user = null;
    location.hash = '';
    renderApp();
  }
  window._liteLogout = doLogout;

  /* ═══════════════════════════ ОБОЛОЧКА ═══════════════════════════ */
  function renderShell(activeHash) {
    $root().innerHTML = `<div class="shell">
      <div class="topbar">
        <div class="logo">DIZEL<span>TRADE</span></div>
        <div class="spacer"></div>
        <button class="btn-ghost" onclick="_liteSwitchFull()">⚙ Полная версия</button>
        <div class="who"><b>${esc(user.name || user.login || '')}</b>${esc(roleLabel(user.role))}</div>
        <button class="btn-ghost danger" onclick="_liteLogout()" title="Выйти">⎋</button>
      </div>
      <div class="main">
        ${renderNav(activeHash)}
        <div class="content" id="app-content">${spinner()}</div>
      </div>
    </div>`;
  }

  function setContent(html) {
    const c = $content();
    if (c) c.innerHTML = html;
  }

  /* ═══════════════════════════ РОУТЕР ═══════════════════════════ */
  let _shellHash = null;
  async function renderApp() {
    if (!user) { screenLogin(); return; }
    const h = (location.hash || '').replace(/^#/, '') || 'home';
    const base = h.split('?')[0];
    // Перерисовываем оболочку только при смене основного раздела
    const navBase = base.split('/')[0];
    if (_shellHash !== navBase) { renderShell(h); _shellHash = navBase; }
    else {
      // обновим активный пункт навигации
      const nav = $root().querySelector('.nav');
      if (nav) nav.outerHTML = renderNav(h);
      setContent(spinner());
    }

    try {
      await route(h, base);
    } catch (e) {
      if (e && e.message === 'Unauthorized') { user = null; screenLogin(); return; }
      setContent(pageHead('Ошибка', '') + note('Не удалось загрузить: ' + esc(e.message || e), 'warn'));
    }
  }

  async function route(h, base) {
    const params = new URLSearchParams(h.split('?')[1] || '');
    switch (base) {
      case 'home': return screenHome();
      case 'base': return screenBase(params.get('tab') || 'receipts');
      case 'orders': return screenOrders();
      case 'finance': return screenFinance(params.get('tab') || 'income');
      case 'fleet': return screenFleet();
      case 'reports': return screenReports(params.get('tab') || 'dashboard');
      default:
        if (base.startsWith('order/')) return screenOrderDetail(base.split('/')[1]);
        return screenHome();
    }
  }

  /* ═══════════════════════════ ВХОД ═══════════════════════════ */
  function screenLogin(errMsg) {
    _shellHash = null;
    $root().innerHTML = `<div class="login-wrap"><div class="login-card">
      <div class="login-logo">DIZEL<span>TRADE</span></div>
      <div class="login-sub">Лёгкая версия · вход</div>
      ${errMsg ? `<div class="login-err">${esc(errMsg)}</div>` : ''}
      <div class="field"><label>Логин</label><input id="li-login" type="text" autocomplete="username"></div>
      <div class="field"><label>Пароль</label><input id="li-pass" type="password" autocomplete="current-password"></div>
      <div class="field" id="li-2fa-wrap" style="display:none"><label>Код 2FA</label><input id="li-2fa" type="text" inputmode="numeric" placeholder="000000"></div>
      <button class="btn btn-primary" id="li-btn">Войти</button>
      <button class="btn btn-sec" style="margin-top:10px" onclick="_liteSwitchFull()">Полная версия</button>
    </div></div>`;

    const btn = document.getElementById('li-btn');
    const submit = async () => {
      const login = document.getElementById('li-login').value.trim();
      const pass = document.getElementById('li-pass').value;
      const code = (document.getElementById('li-2fa') || {}).value;
      if (!login || !pass) { toast('Введите логин и пароль', 'err'); return; }
      btn.disabled = true;
      try {
        const d = await api.login(login, pass, code || undefined);
        if (d && d.requires_2fa) {
          document.getElementById('li-2fa-wrap').style.display = '';
          document.getElementById('li-2fa').focus();
          btn.disabled = false;
          toast('Введите код 2FA', 'ok');
          return;
        }
        user = await api.me();
        window.currentUser = user;
        location.hash = '#home';
        renderApp();
      } catch (e) {
        btn.disabled = false;
        screenLogin(e.message || 'Ошибка входа');
      }
    };
    btn.onclick = submit;
    document.getElementById('li-pass').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    const f2 = document.getElementById('li-2fa');
    if (f2) f2.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  /* ═══════════════════════════ ОБЩИЕ ХЕЛПЕРЫ ДАННЫХ ═══════════════════════════ */
  function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
  function str(v) { v = (v == null ? '' : String(v)).trim(); return v || null; }

  // Кэш справочников на время сессии (сбрасывается после изменений)
  let ref = {};
  const REF_URL = {
    clients: '/api/clients', sites: '/api/sites', trucks: '/api/trucks',
    drivers: '/api/drivers', suppliers: '/api/suppliers', carriers: '/api/carriers',
  };
  async function loadRef(keys) {
    await Promise.all(keys.map(async k => { if (!ref[k]) ref[k] = await api.get(REF_URL[k]); }));
    return ref;
  }
  function clearRef() { ref = {}; }

  // После любого изменения данных: сброс кэша справочников + перерисовка
  async function afterWrite(msg) { clearRef(); if (msg) toast(msg, 'ok'); renderApp(); }

  function subTabs(items, active, hashBase) {
    return `<div class="tabs">` + items.map(it =>
      `<div class="tab ${it.v === active ? 'active' : ''}" onclick="location.hash='#${hashBase}?tab=${it.v}'">${esc(it.l)}</div>`
    ).join('') + `</div>`;
  }

  const truckOpts = (list, archived = false) => (list || [])
    .filter(t => archived ? true : t.status !== 'archived')
    .map(t => ({ value: t.id, label: t.name + (t.plate ? ' · ' + t.plate : '') }));
  const listOpts = (list, labelKey = 'name') => (list || []).map(o => ({ value: o.id, label: o[labelKey] }));

  async function openOrders(clientId) {
    try {
      const url = clientId ? `/api/orders?status=active&client_id=${clientId}` : '/api/orders?status=active';
      const orders = await api.get(url) || [];
      return orders.map(o => ({ value: String(o.id), label: `#${o.id} ${o.client_name || ''} · ${o.volume_ordered || 0} куб` }));
    } catch(e) { return []; }
  }

  // window.L — действия, вызываемые из inline onclick
  const L = {};
  window.L = L;

  /* ═══════════════════════════ ГЛАВНАЯ ═══════════════════════════ */
  async function screenHome() {
    if (isPartner()) return homePartner();
    if (isArtem()) return homeArtem();
    return homeOperator();
  }

  async function homePartner() {
    setContent(pageHead('Главная', 'Партнёр DTL') + spinner());
    const d = await api.get('/api/dashboard');
    const alerts = (d.alerts || []).map(a =>
      note('⚠ ' + esc(a.message), a.severity === 'critical' ? 'warn' : 'warn')).join('');
    const stats = `<div class="stat-grid">
      ${stat('Остаток базы', fmtNum(Math.round(d.base_balance)) + ' <small>куб</small>', 'accent')}
      ${stat('Рейсов в пути', fmtNum(d.trips_in_transit), 'blue')}
      ${stat('Ждут подтверждения', fmtNum(d.pending_receipts), d.pending_receipts > 0 ? 'orange' : '')}
      ${stat('Долг DTL Артёму', fmtMoney(Math.max(0, d.artem_debt)), d.artem_debt > 0 ? 'red' : 'green')}
    </div>`;
    const debts = (d.client_debts || []).filter(c => c.debt > 0).slice(0, 6);
    const debtsHtml = debts.length ? `<div class="section-title">Долги клиентов</div><div class="list">` +
      debts.map(c => row({ icon: '👤', title: esc(c.name), sub: 'Оплачено ' + fmtMoney(c.total_paid),
        val: fmtMoney(c.debt), valKind: 'red' })).join('') + `</div>` : '';
    setContent(
      pageHead('Главная', 'Партнёр DTL') +
      quickActions([
        ['🛢️ Приёмка', 'L.formReceipt()'],
        ['🚚 Рейс', 'L.formDispatch()'],
        ['💵 Доход', 'L.formIncome()'],
        ['💸 Расход', 'L.formExpense()'],
      ]) +
      alerts + stats + debtsHtml
    );
  }

  async function homeArtem() {
    setContent(pageHead('Главная', 'Артём') + spinner());
    const [bal, pending, disp, debt] = await Promise.all([
      api.get('/api/base/balance'),
      api.get('/api/base/receipts/pending'),
      api.get('/api/base/dispatches'),
      api.get('/api/base/artem-debt').catch(() => ({ debt_rub: 0 })),
    ]);
    const inTransit = (disp || []).filter(x => ['dispatched', 'in_transit'].includes(x.status)).slice(0, 5);
    setContent(
      pageHead('Главная', 'Артём') +
      quickActions([['🛢️ Принял топливо', 'L.formReceipt()'], ['🚚 Рейс на участок', 'L.formDispatch()']]) +
      `<div class="stat-grid">
        ${stat('Остаток базы', fmtNum(Math.round(bal.balance_cubic)) + ' <small>куб</small>', 'accent')}
        ${stat('Долг DTL передо мной', fmtMoney(Math.max(0, debt.debt_rub)), debt.debt_rub > 0 ? 'green' : '')}
      </div>` +
      pendingReceiptsBlock(pending) +
      (inTransit.length ? `<div class="section-title">Рейсы в пути</div><div class="list">` +
        inTransit.map(x => row({ icon: '🚚', iconKind: 'blue', title: esc(x.truck_name || '—'),
          sub: esc(x.site_name || '') + ' · ' + fmtCub(x.volume),
          badge: `<button class="btn-add" style="padding:8px 12px;font-size:13px" onclick="event.stopPropagation();L.confirmDispatch(${x.id})">Доставлено</button>` })).join('') + `</div>` : '')
    );
  }

  async function homeOperator() {
    setContent(pageHead('Главная', 'Оператор') + spinner());
    const [bal, pending] = await Promise.all([
      api.get('/api/base/balance'),
      api.get('/api/base/receipts/pending'),
    ]);
    setContent(
      pageHead('Главная', 'Оператор') +
      quickActions([['🛢️ Принял топливо', 'L.formReceipt()'], ['🏗️ Парк Артёма', "location.hash='#fleet'"]]) +
      `<div class="stat-grid">${stat('Остаток базы', fmtNum(Math.round(bal.balance_cubic)) + ' <small>куб</small>', 'accent')}</div>` +
      pendingReceiptsBlock(pending)
    );
  }

  function quickActions(actions) {
    return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">` +
      actions.map(([label, onClick]) => `<button class="btn-add" onclick="${onClick}">${label}</button>`).join('') + `</div>`;
  }

  function pendingReceiptsBlock(pending) {
    if (!pending || !pending.length) return '';
    return `<div class="section-title">Ждут подтверждения (${pending.length})</div><div class="list">` +
      pending.slice(0, 8).map(p => row({
        icon: '🛢️', iconKind: 'orange',
        title: esc(p.source_custom || p.supplier_name || 'Приёмка'),
        sub: fmtCub(p.volume_nominal) + (p.ttn_number ? ' · ТТН ' + esc(p.ttn_number) : ''),
        badge: `<button class="btn-add" style="padding:8px 14px;font-size:13px" onclick="event.stopPropagation();L.confirmReceipt(${p.id})">Принял</button>`,
      })).join('') + `</div>`;
  }

  /* ═══════════════════════════ БАЗА ═══════════════════════════ */
  function baseTabs() {
    const t = [{ v: 'receipts', l: 'Приёмки' }, { v: 'trips', l: 'Рейсы' }];
    if (!isOp()) { t.push({ v: 'cash', l: 'Наличные' }); t.push({ v: 'advances', l: 'Авансы' }); }
    t.push({ v: 'recon', l: 'Сверка' });
    t.push({ v: 'own', l: 'Своя заправка' });
    return t;
  }

  async function screenBase(tab) {
    const tabs = baseTabs();
    if (!tabs.find(t => t.v === tab)) tab = 'receipts';
    const head = pageHead('База', 'Тында') + subTabs(tabs, tab, 'base');
    setContent(head + spinner());
    let body = '';
    if (tab === 'receipts') body = await baseReceipts();
    else if (tab === 'trips') body = await baseTrips();
    else if (tab === 'cash') body = await baseCash();
    else if (tab === 'advances') body = await baseAdvances();
    else if (tab === 'recon') body = await baseRecon();
    else if (tab === 'own') body = await baseOwnUsage();
    setContent(head + body);
  }

  async function baseReceipts() {
    const list = await api.get('/api/base/receipts?limit=20');
    const add = `<button class="btn-add" onclick="L.formReceipt()">+ Принял топливо</button>`;
    if (!list.length) return add + empty('Пока нет приёмок', '🛢️');
    return `<div style="margin-bottom:16px">${add}</div><div class="list">` +
      list.map(r => row({
        icon: '🛢️', iconKind: r.ttn_confirmed ? 'green' : 'orange',
        title: esc(r.source_custom || r.supplier_name || 'Приёмка'),
        sub: fmtDate(r.received_at) + (r.ttn_number ? ' · ТТН ' + esc(r.ttn_number) : ''),
        val: fmtCub(r.volume_nominal),
        badge: r.ttn_confirmed ? badge('Принято', 'green') : badge('Ждёт', 'orange'),
        onClick: `L.receiptDetail(${r.id})`,
      })).join('') + `</div>`;
  }

  async function baseTrips() {
    const list = await api.get('/api/base/dispatches');
    const add = isOp() ? '' : `<button class="btn-add" onclick="L.formDispatch()">+ Рейс</button>`;
    if (!list.length) return (add ? add : '') + empty('Пока нет рейсов', '🚚');
    return (add ? `<div style="margin-bottom:16px">${add}</div>` : '') + `<div class="list">` +
      list.map(x => {
        let bdg, ik = 'blue';
        if (x.status === 'delivered') { bdg = badge(x.paid ? '✅ Оплачено' : 'Доставлено', x.paid ? 'green' : 'accent'); ik = 'green'; }
        else if (x.status === 'cancelled') { bdg = badge('Отменён', 'red'); ik = 'red'; }
        else bdg = `<button class="btn-add" style="padding:7px 12px;font-size:13px" onclick="event.stopPropagation();L.confirmDispatch(${x.id})">Доставлено</button>`;
        return row({
          icon: '🚚', iconKind: ik, title: esc(x.truck_name || '—') + ' → ' + esc(x.site_name || '—'),
          sub: fmtCub(x.volume) + (x.driver_name ? ' · ' + esc(x.driver_name) : ''),
          badge: bdg, onClick: `L.dispatchDetail(${x.id})`,
        });
      }).join('') + `</div>`;
  }

  async function baseCash() {
    const [list, bal] = await Promise.all([
      api.get('/api/base/cash-artem'),
      api.get('/api/base/artem-balance').catch(() => ({ balance: 0 })),
    ]);
    const add = isPartner() ? `<button class="btn-add" onclick="L.formCashGive()">+ Выдать наличные</button>` : '';
    let html = `<div class="stat-grid">${stat('Остаток у Артёма', fmtMoney(bal.balance), bal.balance > 0 ? 'orange' : '')}</div>`;
    if (add) html += `<div style="margin-bottom:16px">${add}</div>`;
    if (!list.length) return html + empty('Нет выдач наличных', '💵');
    html += `<div class="list">` + list.map(c => {
      let action = '';
      if (!c.is_settled) {
        if (isArtem()) action = `<button class="btn-add" style="padding:7px 12px;font-size:13px" onclick="event.stopPropagation();L.formCashReport(${c.id})">Отчёт</button>`;
        else if (isPartner()) action = `<button class="btn-add" style="padding:7px 12px;font-size:13px" onclick="event.stopPropagation();L.settleCash(${c.id})">✓ Закрыть</button>`;
      }
      return row({
        icon: '💵', iconKind: c.is_settled ? 'green' : 'orange',
        title: esc(c.purpose || 'Наличные Артёму'),
        sub: fmtDate(c.given_at) + ' · потрачено ' + fmtMoney(c.amount_spent) + ' · топливо ' + fmtCub(c.fuel_received),
        val: fmtMoney(c.amount_given),
        badge: c.is_settled ? badge('Закрыто', 'green') : (action || badge('Открыто', 'orange')),
      });
    }).join('') + `</div>`;
    return html;
  }

  async function baseAdvances() {
    const list = await api.get('/api/base/advances');
    const add = (isPartner() || isArtem()) ? `<button class="btn-add" onclick="L.formAdvance()">+ Новый аванс</button>` : '';
    let html = add ? `<div style="margin-bottom:16px">${add}</div>` : '';
    if (!list.length) return html + empty('Нет авансов (топливо в долг)', '💸');
    html += `<div class="list">` + list.map(a => {
      const open = a.status === 'open';
      const ret = (open && isPartner()) ? `<button class="btn-add" style="padding:7px 12px;font-size:13px" onclick="event.stopPropagation();L.returnAdvance(${a.id})">Вернули</button>` : '';
      return row({
        icon: '💸', iconKind: open ? 'orange' : 'green',
        title: esc(a.recipient || 'Аванс'),
        sub: fmtDate(a.given_at) + (a.notes ? ' · ' + esc(a.notes) : ''),
        val: a.amount ? fmtMoney(a.amount) : fmtCub(a.volume),
        badge: open ? (ret || badge('Открыт', 'orange')) : badge('Возвращён', 'green'),
      });
    }).join('') + `</div>`;
    return html;
  }

  async function baseRecon() {
    const period = new Date().toISOString().slice(0, 7);
    const [bal, rec] = await Promise.all([
      api.get('/api/base/balance'),
      api.get('/api/base/reconciliation/' + period).catch(() => null),
    ]);
    const calc = bal.balance_cubic;
    let html = `<div class="stat-grid">
      ${stat('Расчётный остаток', fmtNum(Math.round(calc)) + ' <small>куб</small>', 'accent')}
      ${rec ? stat('Факт. замер', fmtNum(Math.round(rec.physical_stock)) + ' <small>куб</small>') : ''}
      ${rec ? stat('Разница', (rec.difference > 0 ? '+' : '') + fmtNum(Math.round(rec.difference)), Math.abs(rec.difference) > 5 ? 'red' : 'green') : ''}
    </div>`;
    if (!isOp()) {
      html += `<button class="btn-add" onclick="L.formRecon('${period}', ${calc})">📋 Внести замер за ${period}</button>`;
    }
    if (rec && rec.notes) html += note('Примечание: ' + esc(rec.notes), 'blue');
    return html;
  }

  async function baseOwnUsage() {
    const [list, trucks] = await Promise.all([
      api.get('/api/base/own-usage'),
      loadRef(['trucks']).then(r => r.trucks),
    ]);
    let html = `<button class="btn-add" onclick="L.formOwnUsage()">+ Своя заправка</button>`;
    if (!list.length) return html + empty('Нет записей о своей заправке', '⛽');
    html = `<div style="margin-bottom:16px">${html}</div><div class="list">` +
      list.map(u => row({
        icon: '⛽', iconKind: 'accent', title: esc(u.truck_name || 'Своя заправка'),
        sub: fmtDate(u.used_at) + (u.notes ? ' · ' + esc(u.notes) : ''), val: fmtCub(u.volume),
      })).join('') + `</div>`;
    return html;
  }

  /* ═══════════════════════════ ЗАКАЗЫ ═══════════════════════════ */
  async function screenOrders() {
    if (isOp()) { location.hash = '#home'; return; }
    setContent(pageHead('Заказы', '') + spinner());
    const list = await api.get('/api/orders');
    const add = isPartner() ? `<button class="btn-add" onclick="L.formOrder()">+ Новый заказ</button>` : '';
    let html = add ? `<div style="margin-bottom:16px">${add}</div>` : '';
    if (!list.length) { setContent(pageHead('Заказы', '') + html + empty('Нет заказов', '📦')); return; }
    html += `<div class="list">` + list.map(o => {
      const active = o.status === 'active';
      const pct = o.volume_ordered ? Math.round((o.delivered || 0) / o.volume_ordered * 100) : 0;
      return row({
        icon: '📦', iconKind: active ? 'accent' : 'green',
        title: esc(o.client_name || 'Заказ #' + o.id),
        sub: fmtNum(Math.round(o.delivered || 0)) + ' / ' + fmtNum(Math.round(o.volume_ordered || 0)) + ' куб · ' + pct + '%' +
          ((o.sites && o.sites.length) ? ' · ' + esc(o.sites.join(', ')) : ''),
        val: isPartner() && o.amount_paid ? fmtMoney(o.amount_paid) : null,
        badge: active ? badge('Активен', 'accent') : badge('Закрыт', 'green'),
        onClick: active ? `location.hash='#order/${o.id}'` : `location.hash='#order/${o.id}'`,
      });
    }).join('') + `</div>`;
    setContent(pageHead('Заказы', '') + html);
  }

  async function screenOrderDetail(id) {
    setContent(pageHead('Заказ', '') + spinner());
    const o = await api.get('/api/orders/' + id);
    const disp = (o.dispatches || []);
    let delivered = 0, inTransit = 0;
    disp.forEach(d => { if (d.status === 'delivered') delivered += d.volume || 0; else if (d.status !== 'cancelled') inTransit += d.volume || 0; });
    const total = o.volume_ordered || 0;
    const pct = total ? Math.round(delivered / total * 100) : 0;
    const remaining = Math.max(0, total - delivered - inTransit);
    const back = `<button class="btn-ghost" onclick="location.hash='#orders'">‹ Назад</button>`;
    let actions = '';
    if (isPartner()) {
      if (o.status === 'active') actions += `<button class="btn btn-primary" onclick="L.closeOrder(${id})">Закрыть заказ</button>`;
      if (o.status !== 'closed') actions += `<button class="btn btn-sec" style="margin-top:10px" onclick="L.reconcileOrder(${id})">✅ Отметить сверенным</button>`;
    }
    const dispHtml = disp.length ? `<div class="section-title">Рейсы по заказу (${disp.length})</div><div class="list">` +
      disp.map(d => row({ icon: '🚚', iconKind: d.status === 'delivered' ? 'green' : 'blue',
        title: esc(d.truck_name || '—') + ' → ' + esc(d.site_name || '—'),
        sub: fmtDate(d.dispatched_at) + (d.driver_name ? ' · ' + esc(d.driver_name) : ''),
        val: fmtCub(d.volume), badge: badge(d.status === 'delivered' ? 'Доставлен' : d.status === 'cancelled' ? 'Отменён' : 'В пути', d.status === 'delivered' ? 'green' : d.status === 'cancelled' ? 'red' : 'blue'),
        onClick: `L.dispatchDetail(${d.id})` })).join('') + `</div>` : empty('Нет рейсов по заказу', '🚚');
    setContent(
      pageHead(esc(o.client_name || 'Заказ'), 'Заказ #' + id, back) +
      `<div class="stat-grid">
        ${stat('Заказано', fmtNum(Math.round(total)) + ' <small>куб</small>')}
        ${stat('Доставлено', fmtNum(Math.round(delivered)) + ' <small>куб</small>', 'green', pct + '%')}
        ${stat('В пути', fmtNum(Math.round(inTransit)) + ' <small>куб</small>', 'blue')}
        ${stat('Осталось', fmtNum(Math.round(remaining)) + ' <small>куб</small>', remaining > 0 ? 'orange' : 'green')}
      </div>` +
      (isPartner() && o.amount_paid ? note('Оплачено: ' + fmtMoney(o.amount_paid) + ' · цена ' + fmtMoney(o.price_per_liter) + '/л', 'info') : '') +
      (o.notes ? note('Примечание: ' + esc(o.notes), 'blue') : '') +
      (actions ? `<div style="margin:16px 0">${actions}</div>` : '') +
      dispHtml
    );
  }

  // Заглушки экранов «Финансы / Парк / Отчёты» — реализованы ниже отдельным блоком
  async function screenFinance(tab) { return financeScreen(tab); }
  async function screenFleet() { return fleetScreen(); }
  async function screenReports(tab) { return reportsScreen(tab); }

  window.lite = { toast, openSheet, confirmAction, navigate };

  /* ═══════════════════════════ ВСПОМОГАТЕЛЬНЫЕ ═══════════════════════════ */
  async function fetchTrucks() { return api.get(isPartner() ? '/api/trucks' : '/api/trucks?owner=Артём'); }

  // Чистка всех всплывающих окон + перерисовка (расширяет afterWrite)
  const _afterWrite = afterWrite;
  afterWrite = async function (msg) {
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    return _afterWrite(msg);
  };

  // Окно с деталями записи (только чтение) + кнопки действий
  function detailOverlay(title, rows, actions) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="sheet">
      <div class="sheet-head"><h2>${esc(title)}</h2><span class="x">×</span></div>
      <div class="sheet-body"><div class="list">` +
      rows.filter(r => r[1] != null && r[1] !== '').map(([k, v]) =>
        `<div class="row"><div class="rmain"><div class="rsub">${esc(k)}</div><div class="rtitle" style="font-weight:600">${v}</div></div></div>`).join('') +
      `</div></div>` + (actions ? `<div class="sheet-foot">${actions}</div>` : '') + `</div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.x').onclick = close;
    ov.onclick = e => { if (e.target === ov) close(); };
  }

  // Универсальная форма «коррекции» — отправляет только изменённые поля + причину
  function correctForm(title, endpoint, fields, orig) {
    const ff = fields.map(f => ({ ...f, value: orig[f.name] }));
    return openSheet({
      title, submitLabel: 'Сохранить изменения',
      fields: [...ff, { name: 'reason', label: 'Причина изменения', type: 'text', required: true }],
      onSubmit: async (v) => {
        const body = { reason: str(v.reason) };
        let changed = false;
        for (const f of fields) {
          const nv = f.type === 'number' ? num(v[f.name]) : str(v[f.name]);
          const ov = f.type === 'number' ? num(orig[f.name]) : str(orig[f.name]);
          if (String(ov ?? '') !== String(nv ?? '')) { body[f.name] = nv; changed = true; }
        }
        if (!changed) { toast('Нет изменений', 'err'); return false; }
        await api.put(endpoint, body);
        afterWrite('Изменено');
      },
    });
  }

  /* ═══════════════════════════ ДЕЙСТВИЯ: БАЗА ═══════════════════════════ */
  L.confirmReceipt = async (id) => { try { await api.put(`/api/base/receipts/${id}/confirm`); afterWrite('Приёмка подтверждена'); } catch (e) { toast(e.message, 'err'); } };
  L.confirmDispatch = async (id) => { try { await api.put(`/api/base/dispatches/${id}/status`, { status: 'delivered' }); afterWrite('Рейс доставлен'); } catch (e) { toast(e.message, 'err'); } };
  L.settleCash = async (id) => { try { await api.put(`/api/base/cash-artem/${id}/settle`, {}); afterWrite('Закрыто'); } catch (e) { toast(e.message, 'err'); } };
  L.returnAdvance = async (id) => { try { await api.put(`/api/base/advances/${id}/return`, {}); afterWrite('Возвращено'); } catch (e) { toast(e.message, 'err'); } };
  L.toggleDispatchPaid = async (id, paid) => { try { await api.put(`/api/base/dispatches/${id}/${paid ? 'unpaid' : 'paid'}`, {}); afterWrite(paid ? 'Оплата снята' : 'Отмечено оплаченным'); } catch (e) { toast(e.message, 'err'); } };
  L.cancelDispatch = async (id) => { if (!await confirmAction({ title: 'Отменить рейс?', danger: true, okLabel: 'Отменить' })) return; await api.put(`/api/base/dispatches/${id}/status`, { status: 'cancelled' }); afterWrite('Рейс отменён'); };

  L.formReceipt = async () => {
    const allOrders = await openOrders(null);
    await openSheet({
      title: 'Приёмка топлива', submitLabel: 'Записать приёмку',
      fields: [
        { name: 'source_custom', label: 'Откуда', type: 'chips', value: 'Хабаровск', options: ['Хабаровск', 'Ангарск', 'Коля', 'Восточка', 'Артём закупил', 'Другое'] },
        { name: 'volume_nominal', label: 'Объём (литры)', type: 'number', value: 200, required: true, half: true },
        { name: 'ttn_number', label: 'Номер ТТН', type: 'text', half: true },
        { name: 'temperature', label: 'Температура °C', type: 'number', value: 15, half: true },
        { name: 'density', label: 'Плотность', type: 'number', value: 0.840, half: true, calcId: 'rec-calc' },
        { name: 'purchase_amount', label: 'Сумма закупки ₽', type: 'number', half: true },
        { name: 'price_per_liter', label: 'Цена ₽/л', type: 'number', half: true },
        { name: 'order_id', label: 'Заказ (необязательно)', type: 'select', placeholder: '— не указан —', options: allOrders },
      ],
      onChange: (v, sheet) => {
        const box = sheet.querySelector('#rec-calc'); const vol = num(v.volume_nominal), den = num(v.density);
        if (box && vol && den) { box.style.display = ''; box.textContent = 'Пересчитано при 20°C: ' + (vol * den / 0.840).toFixed(1) + ' куб'; }
      },
      onSubmit: async (v) => {
        await api.post('/api/base/receipts', { source_custom: v.source_custom, volume_nominal: num(v.volume_nominal), density: num(v.density), temperature: num(v.temperature), ttn_number: str(v.ttn_number), purchase_amount: num(v.purchase_amount) || null, price_per_liter: num(v.price_per_liter) || null, order_id: num(v.order_id) || null });
        afterWrite('Приёмка записана');
      },
    });
  };

  L.formDispatch = async () => {
    const [trucks, r, allOrders] = await Promise.all([fetchTrucks(), loadRef(['drivers', 'sites', 'clients']), openOrders(null)]);
    await openSheet({
      title: 'Рейс на участок', submitLabel: 'Создать рейс',
      fields: [
        { name: 'client_id', label: 'Клиент', type: 'select', placeholder: '— выбрать клиента —', options: listOpts(r.clients) },
        { name: 'order_id', label: 'Заказ клиента', type: 'select', placeholder: allOrders.length ? '— выбрать заказ —' : '⚠ Нет открытых заказов', required: true, options: allOrders, calcId: 'disp-order-hint' },
        { name: 'owner', label: 'Чья машина', type: 'chips', value: 'DTL', options: [{ value: 'DTL', label: 'Наш DTL' }, { value: 'Артём', label: 'Автопарк Артёма' }, { value: 'наёмная', label: 'Наёмная' }] },
        { name: 'truck_id', label: 'Машина', type: 'select', placeholder: '— выбрать —', options: truckOpts(trucks) },
        { name: 'driver_id', label: 'Водитель', type: 'select', placeholder: '— выбрать —', options: listOpts(r.drivers), half: true },
        { name: 'site_id', label: 'Участок', type: 'select', placeholder: '— выбрать —', options: listOpts(r.sites), half: true, calcId: 'disp-tariff' },
        { name: 'volume', label: 'Объём (куб)', type: 'number', value: 23.5, required: true, half: true },
        { name: 'ttn_number', label: 'Номер ТТН', type: 'text', half: true },
      ],
      onChange: async (v, sheet) => {
        // Tariff display
        const box = sheet.querySelector('#disp-tariff');
        if (box && v.site_id && v.owner) {
          const key = v.site_id + '|' + v.owner; if (box._k !== key) { box._k = key;
            try { const t = await api.get(`/api/tariffs?site_id=${v.site_id}&truck_owner=${encodeURIComponent(v.owner)}&latest=true`); box.style.display = ''; box.textContent = (t && t.amount) ? 'Тариф: ' + fmtMoney(t.amount) : 'Тариф не задан'; } catch (e) {}
          }
        }
        // Client → filter orders
        const hintBox = sheet.querySelector('#disp-order-hint');
        const clientId = num(v.client_id);
        const clientKey = 'c' + clientId;
        if (hintBox && hintBox._ck !== clientKey) {
          hintBox._ck = clientKey;
          const clientOrders = await openOrders(clientId || null);
          const orderSel = sheet.querySelector('[data-name="order_id"]');
          if (orderSel) {
            orderSel.innerHTML = clientOrders.length
              ? `<option value="">— выбрать заказ —</option>` + clientOrders.map(o => `<option value="${o.value}">${o.label}</option>`).join('')
              : `<option value="">⚠ Нет открытых заказов</option>`;
          }
          if (hintBox) {
            if (!clientOrders.length && clientId) {
              hintBox.innerHTML = `→ Нет заказов. <a href="#" onclick="return L._quickCreateOrder(${clientId})">Создать заказ</a>`;
              hintBox.style.color = 'var(--red, #ff3b30)'; hintBox.style.display = '';
            } else { hintBox.textContent = ''; hintBox.style.display = 'none'; }
          }
        }
      },
      onSubmit: async (v) => {
        await api.post('/api/base/dispatches', { order_id: num(v.order_id), truck_id: num(v.truck_id), driver_id: num(v.driver_id), site_id: num(v.site_id), truck_owner: v.owner, volume: num(v.volume), ttn_number: str(v.ttn_number) });
        afterWrite('Рейс создан');
      },
    });
  };

  L.formCashGive = async () => {
    const orders = await openOrders(null);
    await openSheet({
      title: 'Выдать наличные Артёму', submitLabel: 'Выдать',
      fields: [
        { name: 'order_id', label: 'Заказ клиента', type: 'select', placeholder: orders.length ? '— выбрать заказ —' : '⚠ Нет открытых заказов', required: true, options: orders },
        { name: 'given_at', label: 'Дата', type: 'date', value: todayISO(), half: true },
        { name: 'amount_given', label: 'Сумма ₽', type: 'number', required: true, half: true },
        { name: 'purpose', label: 'Назначение', type: 'text' },
      ],
      onSubmit: async (v) => { await api.post('/api/base/cash-artem', { given_at: v.given_at, amount_given: num(v.amount_given), purpose: str(v.purpose), order_id: num(v.order_id) }); afterWrite('Выдано'); },
    });
  };
  L.formCashReport = async (id) => {
    await openSheet({
      title: 'Отчёт по наличным', submitLabel: 'Отправить отчёт',
      fields: [{ name: 'amount_spent', label: 'Потрачено ₽', type: 'number', required: true, half: true }, { name: 'fuel_received', label: 'Получено топлива куб', type: 'number', half: true }, { name: 'notes', label: 'Примечание', type: 'text' }],
      onSubmit: async (v) => { await api.put(`/api/base/cash-artem/${id}/report`, { amount_spent: num(v.amount_spent), fuel_received: num(v.fuel_received), notes: str(v.notes) }); afterWrite('Отчёт отправлен'); },
    });
  };
  L.formAdvance = async () => {
    await openSheet({
      title: 'Аванс (топливо в долг)', submitLabel: 'Записать',
      fields: [{ name: 'given_at', label: 'Дата', type: 'date', value: todayISO() }, { name: 'recipient', label: 'Кому', type: 'text', required: true }, { name: 'volume', label: 'Объём куб', type: 'number', half: true }, { name: 'amount', label: 'Сумма ₽', type: 'number', half: true }, { name: 'notes', label: 'Примечание', type: 'text' }],
      onSubmit: async (v) => { await api.post('/api/base/advances', { given_at: v.given_at, recipient: str(v.recipient), volume: num(v.volume), amount: num(v.amount), notes: str(v.notes) }); afterWrite('Аванс записан'); },
    });
  };
  L.formRecon = async (period, calc) => {
    await openSheet({
      title: 'Замер за ' + period, submitLabel: 'Сохранить',
      fields: [{ name: 'physical_stock', label: 'Фактический остаток (куб)', type: 'number', value: Math.round(calc), required: true, hint: 'Расчётный: ' + fmtNum(Math.round(calc)) + ' куб' }, { name: 'notes', label: 'Примечание', type: 'text' }],
      onSubmit: async (v) => { await api.post('/api/base/reconciliation', { period, physical_stock: num(v.physical_stock), notes: str(v.notes) }); afterWrite('Замер сохранён'); },
    });
  };
  L.formOwnUsage = async () => {
    const trucks = await fetchTrucks();
    await openSheet({
      title: 'Своя заправка', submitLabel: 'Записать',
      fields: [{ name: 'truck_id', label: 'Машина', type: 'select', placeholder: '— не указана —', options: truckOpts(trucks) }, { name: 'volume', label: 'Объём куб', type: 'number', required: true }, { name: 'notes', label: 'Примечание', type: 'text' }],
      onSubmit: async (v) => { await api.post('/api/base/own-usage', { used_at: todayISO(), truck_id: num(v.truck_id), volume: num(v.volume), notes: str(v.notes) }); afterWrite('Записано'); },
    });
  };

  L.receiptDetail = async (id) => {
    const r = await api.get('/api/base/receipts/' + id);
    const rows = [
      ['Источник', esc(r.source_custom || r.source_name || '—')],
      ['Поставщик', esc(r.supplier_name)],
      ['Объём (номинал)', fmtCub(r.volume_nominal)],
      ['Объём при 20°C', fmtCub(r.volume_adjusted)],
      ['Температура', r.temperature != null ? r.temperature + ' °C' : null],
      ['Плотность', r.density],
      ['ТТН', esc(r.ttn_number)],
      ['Дата', fmtDateTime(r.received_at)],
      ['Статус', r.ttn_confirmed ? '✅ Подтверждено' : '⏳ Ждёт подтверждения'],
      ['Примечание', esc(r.notes)],
    ];
    let actions = '';
    if (!r.ttn_confirmed) actions += `<button class="btn btn-primary" onclick="L.confirmReceipt(${id})">Подтвердить приёмку</button>`;
    if (isPartner() || isArtem()) actions += `<button class="btn btn-sec" style="margin-top:10px" onclick="L.correctReceipt(${id})">Изменить</button>`;
    detailOverlay('Приёмка', rows, actions);
  };
  L.correctReceipt = async (id) => {
    const r = await api.get('/api/base/receipts/' + id);
    correctForm('Изменить приёмку', `/api/base/receipts/${id}/correct`, [
      { name: 'volume_nominal', label: 'Объём (литры)', type: 'number' },
      { name: 'density', label: 'Плотность', type: 'number', half: true },
      { name: 'temperature', label: 'Температура °C', type: 'number', half: true },
      { name: 'ttn_number', label: 'ТТН', type: 'text' },
      { name: 'notes', label: 'Примечание', type: 'text' },
    ], { volume_nominal: r.volume_nominal, density: r.density, temperature: r.temperature, ttn_number: r.ttn_number, notes: r.notes });
  };

  L.dispatchDetail = async (id) => {
    const d = await api.get('/api/base/dispatches/' + id);
    const rows = [
      ['Машина', esc(d.truck_name)],
      ['Водитель', esc(d.driver_name)],
      ['Участок', esc(d.site_name)],
      ['Объём', fmtCub(d.volume)],
      ['Тариф', d.tariff ? fmtMoney(d.tariff) : null],
      ['ТТН', esc(d.ttn_number)],
      ['Статус', d.status === 'delivered' ? '✅ Доставлено' : d.status === 'cancelled' ? '❌ Отменён' : '🚚 В пути'],
      ['Оплата', d.status === 'delivered' ? (d.paid ? 'Оплачено ' + fmtDate(d.paid_at) : 'Не оплачено') : null],
      ['Отправлен', fmtDateTime(d.dispatched_at)],
      ['Доставлен', d.delivered_at ? fmtDateTime(d.delivered_at) : null],
      ['Примечание', esc(d.notes)],
    ];
    let actions = '';
    if (d.status !== 'delivered' && d.status !== 'cancelled') actions += `<button class="btn btn-primary" onclick="L.confirmDispatch(${id})">Доставлено</button>`;
    if (isPartner() && d.status === 'delivered') actions += `<button class="btn ${d.paid ? 'btn-sec' : 'btn-primary'}" style="margin-top:10px" onclick="L.toggleDispatchPaid(${id},${d.paid ? 1 : 0})">${d.paid ? 'Снять оплату' : 'Отметить оплаченным'}</button>`;
    if (isPartner() && d.status !== 'cancelled' && d.status !== 'delivered') actions += `<button class="btn btn-danger" style="margin-top:10px" onclick="L.cancelDispatch(${id})">Отменить рейс</button>`;
    if (isPartner() || isArtem()) actions += `<button class="btn btn-sec" style="margin-top:10px" onclick="L.correctDispatch(${id})">Изменить</button>`;
    detailOverlay('Рейс', rows, actions);
  };
  L.correctDispatch = async (id) => {
    const d = await api.get('/api/base/dispatches/' + id);
    correctForm('Изменить рейс', `/api/base/dispatches/${id}/correct`, [
      { name: 'volume', label: 'Объём (куб)', type: 'number', half: true },
      { name: 'tariff', label: 'Тариф ₽', type: 'number', half: true },
      { name: 'ttn_number', label: 'ТТН', type: 'text' },
      { name: 'notes', label: 'Примечание', type: 'text' },
    ], { volume: d.volume, tariff: d.tariff, ttn_number: d.ttn_number, notes: d.notes });
  };

  /* ═══════════════════════════ ДЕЙСТВИЯ: ЗАКАЗЫ ═══════════════════════════ */
  L.formOrder = async () => {
    const r = await loadRef(['clients', 'sites']);
    await openSheet({
      title: 'Новый заказ', submitLabel: 'Создать заказ',
      fields: [
        { name: 'client_id', label: 'Клиент', type: 'select', placeholder: '— выбрать —', required: true, options: listOpts(r.clients) },
        { name: 'paid_at', label: 'Дата оплаты', type: 'date', value: todayISO(), half: true },
        { name: 'delivery_type', label: 'Доставка', type: 'chips', value: 'до участка', options: ['до Тынды', 'до участка'], half: true },
        { name: 'volume_ordered', label: 'Объём (куб)', type: 'number', required: true, half: true },
        { name: 'price_per_liter', label: 'Цена ₽/л', type: 'number', half: true },
        { name: 'amount_paid', label: 'Оплачено ₽', type: 'number', half: true },
        { name: 'site_id', label: 'Участок', type: 'select', placeholder: '— не указан —', options: listOpts(r.sites), half: true },
      ],
      onSubmit: async (v) => {
        await api.post('/api/orders', { client_id: num(v.client_id), paid_at: v.paid_at, volume_ordered: num(v.volume_ordered), price_per_liter: num(v.price_per_liter), amount_paid: num(v.amount_paid), delivery_type: v.delivery_type, site_ids: v.site_id ? [num(v.site_id)] : [] });
        afterWrite('Заказ создан');
      },
    });
  };
  L.closeOrder = async (id) => { if (!await confirmAction({ title: 'Закрыть заказ?', okLabel: 'Закрыть' })) return; await api.put(`/api/orders/${id}/close`, {}); afterWrite('Заказ закрыт'); };
  L.reconcileOrder = async (id) => { await api.put(`/api/orders/${id}/reconcile`, {}); afterWrite('Отмечено сверенным'); };

  /* ═══════════════════════════ ФИНАНСЫ ═══════════════════════════ */
  async function financeScreen(tab) {
    if (!isPartner()) { location.hash = '#home'; return; }
    const tabs = [{ v: 'income', l: 'Доходы' }, { v: 'expenses', l: 'Расходы' }, { v: 'hire', l: 'Найм' }, { v: 'debts', l: 'Долги' }];
    if (!tabs.find(t => t.v === tab)) tab = 'income';
    const head = pageHead('Финансы', '') + subTabs(tabs, tab, 'finance');
    setContent(head + spinner());
    let body = '';
    if (tab === 'income') body = await finIncome();
    else if (tab === 'expenses') body = await finExpenses();
    else if (tab === 'hire') body = await finHire();
    else body = await finDebts();
    setContent(head + body);
  }

  async function finIncome() {
    const list = await api.get('/api/income');
    const now = new Date();
    const sum = a => a.reduce((s, r) => s + (r.amount || 0), 0);
    const month = list.filter(r => { const d = new Date(r.income_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    let html = `<div class="stat-grid">${stat('Всего', fmtMoney(sum(list)), 'green')}${stat('За месяц', fmtMoney(sum(month)), 'accent')}</div>`;
    html += `<button class="btn-add" onclick="L.formIncome()">+ Доход</button>`;
    html += `<div class="list" style="margin-top:16px">` + list.slice(0, 80).map(r => row({
      icon: r.is_credit ? '📝' : '💵', iconKind: r.is_credit ? 'orange' : 'green',
      title: esc(r.client_name || 'Доход') + (r.is_credit ? ' · в долг' : ''),
      sub: fmtDate(r.income_at) + (r.comment ? ' · ' + esc(r.comment) : ''),
      val: fmtMoney(r.amount), valKind: 'green', onClick: `L.correctIncome(${r.id})`,
    })).join('') + `</div>`;
    return html;
  }
  L.formIncome = async () => {
    const [r, allOrders] = await Promise.all([loadRef(['clients']), openOrders(null)]);
    await openSheet({
      title: 'Доход', submitLabel: 'Записать доход',
      fields: [
        { name: 'income_at', label: 'Дата', type: 'date', value: todayISO(), half: true },
        { name: 'is_credit', label: 'Тип', type: 'chips', value: 'false', options: [{ value: 'false', label: 'Оплата' }, { value: 'true', label: 'В долг' }], half: true },
        { name: 'client_id', label: 'Клиент', type: 'select', placeholder: '— не указан —', options: listOpts(r.clients) },
        { name: 'order_id', label: 'Заказ (необязательно)', type: 'select', placeholder: '— не указан —', options: allOrders },
        { name: 'amount', label: 'Сумма ₽', type: 'number', half: true },
        { name: 'volume', label: 'Объём куб', type: 'number', half: true },
        { name: 'comment', label: 'Комментарий', type: 'text' },
      ],
      onSubmit: async (v) => { await api.post('/api/income', { income_at: v.income_at, client_id: num(v.client_id), order_id: num(v.order_id) || null, amount: num(v.amount), volume: num(v.volume), comment: str(v.comment), is_credit: v.is_credit === 'true' }); afterWrite('Доход записан'); },
    });
  };
  L.correctIncome = async (id) => {
    const r = (await api.get('/api/income')).find(x => x.id === id); if (!r) return;
    correctForm('Изменить доход', `/api/income/${id}/correct`, [
      { name: 'income_at', label: 'Дата', type: 'date', half: true },
      { name: 'amount', label: 'Сумма ₽', type: 'number', half: true },
      { name: 'volume', label: 'Объём куб', type: 'number' },
      { name: 'comment', label: 'Комментарий', type: 'text' },
    ], { income_at: (r.income_at || '').slice(0, 10), amount: r.amount, volume: r.volume, comment: r.comment });
  };

  async function finExpenses() {
    const list = await api.get('/api/expenses');
    const sum = a => a.reduce((s, r) => s + (r.amount || 0), 0);
    let html = `<div class="stat-grid">${stat('Всего расходов', fmtMoney(sum(list)), 'red')}</div>`;
    html += `<button class="btn-add" onclick="L.formExpense()">+ Расход</button>`;
    html += `<div class="list" style="margin-top:16px">` + list.slice(0, 80).map(r => row({
      icon: '💸', iconKind: 'red', title: esc(r.category || 'Расход'),
      sub: fmtDate(r.expense_at) + (r.comment ? ' · ' + esc(r.comment) : ''),
      val: fmtMoney(r.amount), valKind: 'red', onClick: `L.correctExpense(${r.id})`,
    })).join('') + `</div>`;
    return html;
  }
  L.formExpense = async () => {
    const allOrders = await openOrders(null);
    await openSheet({
      title: 'Расход', submitLabel: 'Записать расход',
      fields: [
        { name: 'expense_at', label: 'Дата', type: 'date', value: todayISO(), half: true },
        { name: 'amount', label: 'Сумма ₽', type: 'number', required: true, half: true },
        { name: 'category', label: 'Категория', type: 'select', value: 'Прочие', options: ['Бухгалтерия', 'Аренда', 'Кредиты (тело)', 'Проценты по кредитам', 'Налоги/штрафы', 'Командировочные', 'Зарплата партнёрам', 'Финансовые расходы (налоги/вывод)', 'Прочие'] },
        { name: 'order_id', label: 'Заказ (необязательно)', type: 'select', placeholder: '— не указан —', options: allOrders },
        { name: 'comment', label: 'Комментарий', type: 'text' },
      ],
      onSubmit: async (v) => { await api.post('/api/expenses', { expense_at: v.expense_at, category: v.category, amount: num(v.amount), comment: str(v.comment), order_id: num(v.order_id) || null }); afterWrite('Расход записан'); },
    });
  };
  L.correctExpense = async (id) => {
    const r = (await api.get('/api/expenses')).find(x => x.id === id); if (!r) return;
    correctForm('Изменить расход', `/api/expenses/${id}/correct`, [
      { name: 'expense_at', label: 'Дата', type: 'date', half: true },
      { name: 'amount', label: 'Сумма ₽', type: 'number', half: true },
      { name: 'category', label: 'Категория', type: 'text' },
      { name: 'comment', label: 'Комментарий', type: 'text' },
    ], { expense_at: (r.expense_at || '').slice(0, 10), amount: r.amount, category: r.category, comment: r.comment });
  };

  async function finDebts() {
    const cd = await api.get('/api/analytics/client-debts').catch(() => []);
    const hd = (cd || []).filter(c => c.total_debt > 0);
    const total = hd.reduce((s, c) => s + c.total_debt, 0);
    let html = `<div class="stat-grid">${stat('Должников', fmtNum(hd.length), hd.length ? 'red' : '')}${stat('Итого долг', fmtMoney(total), total > 0 ? 'red' : 'green')}</div>`;
    if (!hd.length) return html + empty('Все клиенты рассчитались', '✅');
    html += `<div class="section-title">По клиентам</div><div class="list">` + hd.map(c => row({
      icon: '🚛', iconKind: 'red',
      title: esc(c.client_name),
      sub: 'Отгружено ' + fmtCub(c.delivered_cub) + ' · оплачено ' + fmtCub(c.paid_cub) + ' · неоплачено ' + fmtCub(c.unpaid_cub),
      val: fmtMoney(c.total_debt), valKind: 'red',
    })).join('') + `</div>`;
    return html;
  }

  async function finHire() {
    const list = await api.get('/api/hire');
    const rev = list.reduce((s, r) => s + (r.amount_client || 0), 0);
    const mar = list.reduce((s, r) => s + (r.margin || 0), 0);
    let html = `<div class="stat-grid">${stat('Сделок', fmtNum(list.length))}${stat('Оборот', fmtMoney(rev), 'accent')}${stat('Маржа', rev ? (mar / rev * 100).toFixed(1) + ' %' : '—', mar >= 0 ? 'green' : 'red')}</div>`;
    html += `<button class="btn-add" onclick="L.formHire()">+ Сделка найма</button>`;
    html += `<div class="list" style="margin-top:16px">` + list.slice(0, 80).map(r => row({
      icon: '🔄', iconKind: r.is_closed ? 'green' : 'accent',
      title: esc(r.client_name || 'Найм') + ' ← ' + esc(r.supplier_name || ''),
      sub: fmtDate(r.delivery_at) + ' · ' + fmtNum(r.volume_liters) + ' л · маржа ' + (r.margin_pct != null ? r.margin_pct + '%' : '—'),
      val: fmtMoney(r.amount_client), badge: r.is_closed ? badge('Закрыта', 'green') : `<button class="btn-add" style="padding:6px 10px;font-size:12px" onclick="event.stopPropagation();L.closeHire(${r.id})">Закрыть</button>`,
      onClick: `L.correctHire(${r.id})`,
    })).join('') + `</div>`;
    return html;
  }
  L.formHire = async () => {
    const [r, allOrders] = await Promise.all([loadRef(['clients', 'suppliers', 'carriers']), openOrders(null)]);
    await openSheet({
      title: 'Найм (перепродажа)', submitLabel: 'Создать сделку',
      fields: [
        { name: 'client_id', label: 'Клиент', type: 'select', placeholder: '— выбрать —', required: true, options: listOpts(r.clients) },
        { name: 'order_id', label: 'Заказ клиента', type: 'select', placeholder: '— выбрать заказ —', required: true, options: allOrders, calcId: 'hire-order-hint' },
        { name: 'delivery_at', label: 'Дата', type: 'date', value: todayISO(), half: true },
        { name: 'volume_liters', label: 'Объём (литры)', type: 'number', required: true, half: true },
        { name: 'supplier_id', label: 'Поставщик', type: 'select', placeholder: '— выбрать —', required: true, options: listOpts(r.suppliers), half: true },
        { name: 'carrier_id', label: 'Перевозчик', type: 'select', placeholder: '— нет —', options: listOpts(r.carriers), half: true },
        { name: 'price_client', label: 'Клиенту ₽/л', type: 'number', half: true },
        { name: 'price_supplier', label: 'Поставщик ₽/л', type: 'number', half: true },
        { name: 'price_carrier', label: 'Перевозка ₽/л', type: 'number', half: true, calcId: 'hire-calc' },
        { name: 'cash_record_id', label: 'Оплачено с наличных', type: 'select', placeholder: '— не указано —', options: [] },
      ],
      onChange: async (v, sheet) => {
        const calcBox = sheet.querySelector('#hire-calc');
        if (calcBox) {
          const pc = num(v.price_client)||0, ps = num(v.price_supplier)||0, pk = num(v.price_carrier)||0, vol = num(v.volume_liters)||0;
          const m = pc - ps - pk; calcBox.style.display = '';
          calcBox.textContent = 'Маржа: ' + m.toFixed(2) + ' ₽/л · итого ' + fmtMoney(m * vol) + (pc ? ' · ' + (m/pc*100).toFixed(1) + '%' : '');
        }
        const hintBox = sheet.querySelector('#hire-order-hint');
        if (v.client_id && hintBox) {
          const clientOrders = await openOrders(num(v.client_id));
          const orderSel = sheet.querySelector('[data-name="order_id"]');
          if (orderSel) {
            orderSel.innerHTML = clientOrders.length
              ? `<option value="">— выбрать заказ —</option>` + clientOrders.map(o => `<option value="${o.value}">${o.label}</option>`).join('')
              : `<option value="">⚠ Нет заказов для этого клиента</option>`;
          }
          hintBox.style.display = '';
          if (clientOrders.length) {
            hintBox.textContent = '';
          } else {
            hintBox.innerHTML = `→ Нет заказов. <a href="#" onclick="return L._quickCreateOrder(${num(v.client_id)})">Создать заказ</a>`;
          }
          hintBox.style.color = clientOrders.length ? '' : 'var(--red, #ff3b30)';
        }
      },
      onSubmit: async (v) => { await api.post('/api/hire', { client_id: num(v.client_id), order_id: num(v.order_id), supplier_id: num(v.supplier_id), carrier_id: num(v.carrier_id), delivery_at: v.delivery_at, volume_liters: num(v.volume_liters), price_client: num(v.price_client), price_supplier: num(v.price_supplier), price_carrier: num(v.price_carrier), cash_record_id: num(v.cash_record_id) || null }); afterWrite('Сделка создана'); },
    });
  };
  L._quickCreateOrder = async (clientId) => {
    // Find parent sheet to update its order dropdown after creation
    const overlays = document.querySelectorAll('.overlay');
    const parentSheet = overlays.length > 0 ? overlays[overlays.length - 1] : null;
    await openSheet({
      title: 'Новый заказ для клиента',
      submitLabel: 'Создать заказ',
      fields: [
        { name: 'paid_at', label: 'Дата', type: 'date', value: todayISO(), half: true },
        { name: 'volume_ordered', label: 'Объём (куб)', type: 'number', required: true, half: true },
        { name: 'price_per_liter', label: 'Цена ₽/л', type: 'number', half: true },
        { name: 'amount_paid', label: 'Предоплата ₽', type: 'number', half: true },
      ],
      onSubmit: async (v) => {
        const ord = await api.post('/api/orders', {
          client_id: clientId,
          paid_at: v.paid_at || todayISO(),
          volume_ordered: num(v.volume_ordered),
          price_per_liter: num(v.price_per_liter) || null,
          amount_paid: num(v.amount_paid) || 0,
          delivery_type: 'до участка',
        });
        // Update parent sheet's order dropdown
        if (parentSheet && ord && ord.id) {
          const orderSel = parentSheet.querySelector('[data-name="order_id"]');
          if (orderSel) {
            const opt = document.createElement('option');
            opt.value = ord.id; opt.selected = true;
            opt.textContent = `#${ord.id} — ${fmtMoney(ord.amount_paid || 0)} · ${ord.volume_ordered || 0} куб`;
            orderSel.appendChild(opt);
          }
          const hintEl = parentSheet.querySelector('#hire-order-hint, #disp-order-hint');
          if (hintEl) { hintEl.textContent = ''; hintEl.style.display = 'none'; }
        }
        toast('✅ Заказ создан');
        // Don't call afterWrite — keep parent sheet open
      }
    });
    return false;
  };
  L.closeHire = async (id) => {
    await openSheet({ title: 'Закрыть сделку', submitLabel: 'Закрыть', fields: [{ name: 'comment', label: 'Комментарий', type: 'text' }], onSubmit: async (v) => { await api.post(`/api/hire/${id}/close`, { comment: str(v.comment) || '' }); afterWrite('Сделка закрыта'); } });
  };
  L.correctHire = async (id) => {
    const r = (await api.get('/api/hire')).find(x => x.id === id); if (!r) return;
    correctForm('Изменить сделку', `/api/hire/${id}/correct`, [
      { name: 'delivery_at', label: 'Дата', type: 'date', half: true },
      { name: 'volume_liters', label: 'Литры', type: 'number', half: true },
      { name: 'price_client', label: 'Клиенту ₽/л', type: 'number', half: true },
      { name: 'price_supplier', label: 'Поставщик ₽/л', type: 'number', half: true },
      { name: 'price_carrier', label: 'Перевозка ₽/л', type: 'number', half: true },
      { name: 'comment', label: 'Комментарий', type: 'text' },
    ], { delivery_at: (r.delivery_at || '').slice(0, 10), volume_liters: r.volume_liters, price_client: r.price_client, price_supplier: r.price_supplier, price_carrier: r.price_carrier, comment: r.comment });
  };

  /* ═══════════════════════════ ПАРК ═══════════════════════════ */
  async function fleetScreen() {
    setContent(pageHead('Парк', '') + spinner());
    const partner = isPartner();
    const [trucks, debt] = await Promise.all([
      fetchTrucks(),
      isArtem() ? api.get('/api/base/artem-debt').catch(() => ({ debt_rub: 0 })) : Promise.resolve(null),
    ]);
    window._fleetTrucks = trucks;
    const active = trucks.filter(t => t.status !== 'archived');
    let html = '';
    if (isArtem() && debt) html += `<div class="stat-grid">${stat('Долг DTL передо мной', fmtMoney(Math.max(0, debt.debt_rub)), debt.debt_rub > 0 ? 'green' : '')}</div>`;
    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">`;
    if (partner || isArtem()) html += `<button class="btn-add" onclick="L.formTruckAdd()">+ Машина</button>`;
    html += `<button class="btn-add" onclick="L.formFleetExpense()">+ Расход по машине</button></div>`;
    const canManage = partner || isArtem();
    html += `<div class="section-title">Машины (${active.length})</div><div class="list">` +
      (active.length ? active.map(t => truckRow(t, canManage)).join('') : empty('Нет машин', '🚚')) + `</div>`;
    setContent(pageHead('Парк', partner ? 'Автопарк DTL' : 'Парк Артёма') + html);
  }
  function truckRow(t, canManage) {
    const st = t.status === 'for_sale' ? badge('На продажу', 'orange') : badge('Активна', 'green');
    let actions = '';
    if (canManage) {
      actions = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">` +
        `<button class="btn-ghost" onclick="L.formTruckEdit(${t.id})">Изменить</button>` +
        (t.status === 'active' ? `<button class="btn-ghost" onclick="L.truckAction(${t.id},'for-sale')">На продажу</button>` : '') +
        (t.status === 'for_sale' ? `<button class="btn-ghost" onclick="L.truckAction(${t.id},'activate')">Вернуть в работу</button>` : '') +
        `<button class="btn-ghost" onclick="L.truckAction(${t.id},'archive')">В архив</button></div>`;
    }
    return `<div class="row" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;align-items:center;gap:13px">
        <div class="ricon accent">🚚</div>
        <div class="rmain"><div class="rtitle">${esc(t.name)}${t.plate ? ' · ' + esc(t.plate) : ''}</div>
          <div class="rsub">Рейсов/мес: ${fmtNum(t.trips_month || 0)} · выручка ${fmtMoney(t.revenue_month || 0)}</div></div>
        <div class="rright">${st}</div>
      </div>${actions}</div>`;
  }
  L.truckAction = async (id, action) => { try { await api.put(`/api/trucks/${id}/${action}`, {}); afterWrite('Готово'); } catch (e) { toast(e.message, 'err'); } };
  L.formTruckAdd = async () => {
    await openSheet({
      title: 'Новая машина', submitLabel: 'Добавить',
      fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, { name: 'plate', label: 'Гос. номер', type: 'text', half: true }, { name: 'tank_volume', label: 'Объём цистерны', type: 'number', half: true }],
      onSubmit: async (v) => { await api.post('/api/trucks', { name: str(v.name), plate: str(v.plate), tank_volume: num(v.tank_volume), owner: isArtem() ? 'Артём' : 'DTL' }); afterWrite('Машина добавлена'); },
    });
  };
  L.formTruckEdit = async (id) => {
    const t = (window._fleetTrucks || []).find(x => x.id === id) || {};
    await openSheet({
      title: 'Изменить машину', submitLabel: 'Сохранить',
      fields: [{ name: 'name', label: 'Название', type: 'text', value: t.name, required: true }, { name: 'plate', label: 'Гос. номер', type: 'text', value: t.plate, half: true }, { name: 'tank_volume', label: 'Объём цистерны', type: 'number', value: t.tank_volume, half: true }],
      onSubmit: async (v) => { await api.put(`/api/trucks/${id}`, { name: str(v.name), plate: str(v.plate), tank_volume: num(v.tank_volume) }); afterWrite('Сохранено'); },
    });
  };
  L.formFleetExpense = async () => {
    const trucks = await fetchTrucks();
    const list = isPartner() ? trucks : trucks.filter(t => t.owner === 'Артём');
    await openSheet({
      title: 'Расход по машине', submitLabel: 'Записать',
      fields: [
        { name: 'truck_id', label: 'Машина', type: 'select', placeholder: '— выбрать —', required: true, options: truckOpts(list) },
        { name: 'category', label: 'Категория', type: 'chips', value: 'Прочее', options: ['Ремонт', 'ТО', 'Зарплата', 'Топливо', 'Резина', 'Прочее'] },
        { name: 'amount', label: 'Сумма ₽', type: 'number', required: true, half: true },
        { name: 'comment', label: 'Комментарий', type: 'text', half: true },
      ],
      onSubmit: async (v) => { await api.post('/api/fleet/expenses', { truck_id: num(v.truck_id), expense_at: todayISO(), category: v.category, amount: num(v.amount), comment: str(v.comment) }); afterWrite('Расход записан'); },
    });
  };

  /* ═══════════════════════════ ОТЧЁТЫ (partner) ═══════════════════════════ */
  async function reportsScreen(tab) {
    if (!isPartner()) { location.hash = '#home'; return; }
    const tabs = [{ v: 'dashboard', l: 'Сводка' }, { v: 'analytics', l: 'Аналитика' }, { v: 'balance', l: 'Баланс' }, { v: 'annual', l: 'Год' }, { v: 'logs', l: 'Журнал' }, { v: 'settings', l: 'Настройки' }];
    if (!tabs.find(t => t.v === tab)) tab = 'dashboard';
    const head = pageHead('Отчёты', '') + subTabs(tabs, tab, 'reports');
    setContent(head + spinner());
    let body = '';
    try {
      if (tab === 'dashboard') body = await repDashboard();
      else if (tab === 'analytics') body = await repAnalytics();
      else if (tab === 'balance') body = await repBalance();
      else if (tab === 'annual') body = await repAnnual();
      else if (tab === 'logs') body = await repLogs();
      else body = await repSettings();
    } catch (e) { body = note('Ошибка: ' + esc(e.message), 'warn'); }
    setContent(head + body);
  }

  async function repDashboard() {
    const d = await api.get('/api/dashboard');
    let html = `<div class="stat-grid">
      ${stat('Остаток базы', fmtNum(Math.round(d.base_balance)) + ' <small>куб</small>', 'accent')}
      ${stat('В пути', fmtNum(d.trips_in_transit), 'blue')}
      ${stat('Ждут ТТН', fmtNum(d.pending_receipts), d.pending_receipts > 0 ? 'orange' : '')}
      ${stat('Нал у Артёма', fmtMoney(d.artem_cash_balance), d.artem_cash_balance > 0 ? 'orange' : '')}
      ${stat('Долг DTL Артёму', fmtMoney(Math.max(0, d.artem_debt)), d.artem_debt > 0 ? 'red' : 'green')}
    </div>`;
    if (d.alerts && d.alerts.length) html += d.alerts.map(a => note('⚠ ' + esc(a.message), 'warn')).join('');
    const tm = d.trucks_month || [];
    if (tm.length) html += `<div class="section-title">Машины за месяц</div><div class="tbl-wrap"><table><thead><tr><th>Машина</th><th class="num">Рейсы</th><th class="num">Выручка</th><th class="num">Расходы</th></tr></thead><tbody>` +
      tm.map(t => `<tr><td>${esc(t.name)}</td><td class="num">${fmtNum(t.trips)}</td><td class="num">${fmtMoney(t.revenue)}</td><td class="num">${fmtMoney(t.expenses)}</td></tr>`).join('') + `</tbody></table></div>`;
    return html;
  }

  async function repAnalytics() {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    const nowY = new Date().getFullYear();
    const year = parseInt(p.get('year')) || nowY;
    const month = p.get('month') != null ? parseInt(p.get('month')) : (new Date().getMonth() + 1);
    const years = [0, 1, 2].map(i => nowY - i);
    const yearTabs = `<div class="tabs">` + years.map(y => `<div class="tab ${y === year ? 'active' : ''}" onclick="location.hash='#reports?tab=analytics&year=${y}&month=${month}'">${y}</div>`).join('') + `</div>`;
    const months = ['Год', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthTabs = `<div class="tabs">` + months.map(m => { const mv = m === 'Год' ? 0 : m; return `<div class="tab ${mv === month ? 'active' : ''}" onclick="location.hash='#reports?tab=analytics&year=${year}&month=${mv}'">${m}</div>`; }).join('') + `</div>`;
    const mq = month > 0 ? `&month=${month}` : '';
    const mForPnl = month > 0 ? month : (new Date().getMonth() + 1);
    const [summary, pnl, clients] = await Promise.all([
      api.get(`/api/analytics/summary?year=${year}&month=${month || 1}`).catch(() => ({})),
      api.get(`/api/analytics/fleet-pnl?year=${year}&month=${mForPnl}`).catch(() => ({})),
      api.get(`/api/analytics/clients?year=${year}${mq}`).catch(() => []),
    ]);
    let html = yearTabs + monthTabs;
    html += `<div class="stat-grid">
      ${stat('Выручка', fmtMoney(summary.revenue_total), 'accent')}
      ${stat('Прибыль', fmtMoney(summary.profit), summary.profit >= 0 ? 'green' : 'red')}
      ${stat('Маржа', summary.margin_pct != null ? summary.margin_pct + ' %' : '—')}
    </div>`;
    if (pnl.trucks && pnl.trucks.length) {
      html += `<div class="section-title">P&amp;L по машинам</div><div class="tbl-wrap"><table><thead><tr><th>Машина</th><th class="num">Рейсы</th><th class="num">Выручка</th><th class="num">Расходы</th><th class="num">Маржа</th></tr></thead><tbody>` +
        pnl.trucks.map(t => `<tr><td>${esc(t.truck_name)} <span style="color:var(--text2);font-size:11px">${esc(t.owner)}</span></td><td class="num">${fmtNum(t.trips)}</td><td class="num">${fmtMoney(t.revenue)}</td><td class="num">${fmtMoney(t.expenses)}</td><td class="num">${t.margin_pct}%</td></tr>`).join('') + `</tbody></table></div>`;
      if (pnl.net_profit != null) html += `<div class="stat-grid" style="margin-top:16px">${stat('Чистая прибыль', fmtMoney(pnl.net_profit), pnl.net_profit >= 0 ? 'green' : 'red')}</div>`;
    }
    if (clients && clients.length) html += `<div class="section-title">Клиенты (доля)</div><div class="list">` + clients.slice(0, 10).map(c => row({ title: esc(c.client_name), val: c.pct_of_total != null ? c.pct_of_total + ' %' : '' })).join('') + `</div>`;
    return html;
  }

  async function repBalance() {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    const year = parseInt(p.get('year')) || new Date().getFullYear();
    const [cur, monthly] = await Promise.all([api.get('/api/balance/current').catch(() => ({})), api.get(`/api/balance/monthly?year=${year}`).catch(() => [])]);
    const net = (cur.assets || 0) - (cur.liabilities || 0);
    let html = `<div class="stat-grid">
      ${stat('Активы', fmtMoney(cur.assets), 'green')}
      ${stat('Обязательства', fmtMoney(cur.liabilities), 'red')}
      ${stat('Чистые активы', fmtMoney(net), net >= 0 ? 'accent' : 'red')}
    </div>`;
    html += `<button class="btn-add" onclick="L.formBalanceEntry(${year})">+ Запись баланса</button>`;
    if (monthly && monthly.length) html += `<div class="section-title">${year} по месяцам</div><div class="tbl-wrap"><table><thead><tr><th>Мес</th><th class="num">Активы</th><th class="num">Обязат.</th><th class="num">Чистые</th></tr></thead><tbody>` +
      monthly.map(m => `<tr><td>${m.month}</td><td class="num">${fmtMoney(m.assets)}</td><td class="num">${fmtMoney(m.liabilities)}</td><td class="num">${fmtMoney(m.net_assets)}</td></tr>`).join('') + `</tbody></table></div>`;
    return html;
  }
  L.formBalanceEntry = async (year) => {
    await openSheet({
      title: 'Запись баланса', submitLabel: 'Сохранить',
      fields: [{ name: 'month', label: 'Месяц (1-12)', type: 'number', value: new Date().getMonth() + 1, required: true, half: true }, { name: 'assets', label: 'Активы ₽', type: 'number', half: true }, { name: 'liabilities', label: 'Обязательства ₽', type: 'number', half: true }, { name: 'notes', label: 'Примечание', type: 'text' }],
      onSubmit: async (v) => { await api.post('/api/balance/entry', { year, month: num(v.month), assets: num(v.assets) || 0, liabilities: num(v.liabilities) || 0, notes: str(v.notes) || '' }); afterWrite('Сохранено'); },
    });
  };

  async function repAnnual() {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    const nowY = new Date().getFullYear();
    const year = parseInt(p.get('year')) || nowY;
    const years = [0, 1, 2].map(i => nowY - i);
    const yearTabs = `<div class="tabs">` + years.map(y => `<div class="tab ${y === year ? 'active' : ''}" onclick="location.hash='#reports?tab=annual&year=${y}'">${y}</div>`).join('') + `</div>`;
    const d = await api.get(`/api/annual?year=${year}`);
    const totalRev = (d.revenue_fleet || 0) + (d.revenue_hire || 0);
    let html = yearTabs + `<div class="stat-grid">${stat('Выручка год', fmtMoney(totalRev), 'accent')}${stat('Прибыль', fmtMoney(d.profit), d.profit >= 0 ? 'green' : 'red')}</div>`;
    html += `<div class="section-title">Разбивка</div><div class="list">` + [
      ['Выручка · автопарк', d.revenue_fleet], ['Выручка · найм', d.revenue_hire],
      ['Расходы · автопарк', d.expenses_fleet], ['Топливо', d.expenses_fuel], ['Перевозчики', d.expenses_carriers], ['Общие расходы', d.expenses_general],
    ].map(([k, v]) => row({ title: k, val: fmtMoney(v) })).join('') + `</div>`;
    return html;
  }

  async function repLogs() {
    const list = await api.get('/api/logs?limit=500');
    const tbl = { fuel_receipts: 'Приёмка', fuel_dispatches: 'Рейс', income_records: 'Доход', company_expenses: 'Расход', debt_records: 'Долг', hire_deliveries: 'Найм', orders: 'Заказ', trucks: 'Машина' };
    const act = { INSERT: 'Создание', UPDATE: 'Изменение', CORRECTION: 'Коррекция', DELETE: 'Удаление' };
    if (!list.length) return empty('Журнал пуст', '📜');
    return `<div class="list">` + list.slice(0, 200).map(r => row({
      icon: '📝', title: (act[r.action] || r.action) + ' · ' + (tbl[r.table_name] || r.table_name),
      sub: fmtDateTime(r.created_at) + ' · ' + esc(r.user_name || '') + (r.reason ? ' · ' + esc(r.reason) : ''),
    })).join('') + `</div>`;
  }

  async function repSettings() {
    const [sites, suppliers, carriers, clients, tariffs, settings, tokens, twofa] = await Promise.all([
      api.get('/api/sites'), api.get('/api/suppliers'), api.get('/api/carriers'), api.get('/api/clients'),
      api.get('/api/tariffs'), api.get('/api/settings'),
      api.get('/api/tokens').catch(() => []), api.get('/api/auth/2fa/status').catch(() => ({ totp_enabled: false })),
    ]);
    window._settings = settings;
    let html = `<div class="section-title">Параметры</div><button class="btn-add" onclick="L.formThresholds()">⚙ Пороги оповещений</button>`;
    const refBlock = (title, list, addFn) => `<div class="section-title">${title} (${list.length})</div>` +
      `<button class="btn-add" onclick="${addFn}">+ Добавить</button>` +
      `<div class="list" style="margin-top:12px">` + (list.length ? list.map(o => row({ title: esc(o.name), badge: o.is_active === false ? badge('Выкл', 'gray') : '' })).join('') : empty('Пусто', '∅')) + `</div>`;
    html += refBlock('Клиенты', clients, 'L.formAddRef(\'clients\')');
    html += refBlock('Участки', sites, 'L.formAddRef(\'sites\')');
    html += refBlock('Поставщики', suppliers, 'L.formAddRef(\'suppliers\')');
    html += refBlock('Перевозчики', carriers, 'L.formAddRef(\'carriers\')');
    html += `<div class="section-title">Тарифы (${tariffs.length})</div>`;
    if (tariffs.length) html += `<div class="tbl-wrap"><table><thead><tr><th>Участок</th><th>Чья машина</th><th class="num">Тариф</th></tr></thead><tbody>` +
      tariffs.map(t => `<tr><td>${esc(t.site_name)}</td><td>${esc(t.truck_owner)}</td><td class="num">${fmtMoney(t.amount)}</td></tr>`).join('') + `</tbody></table></div>`;
    html += `<button class="btn-add" style="margin-top:12px" onclick="L.formAddTariff()">+ Тариф</button>`;
    html += `<div class="section-title">API-токены</div><button class="btn-add" onclick="L.formAddToken()">+ Создать токен</button>`;
    if (tokens.length) html += `<div class="list" style="margin-top:12px">` + tokens.map(t => row({ title: esc(t.name), sub: 'Доступ: ' + esc(t.scope) + (t.last_used_at ? ' · использован ' + fmtDate(t.last_used_at) : ' · не использован'), badge: `<button class="btn-ghost danger" onclick="L.revokeToken(${t.id})">Отозвать</button>` })).join('') + `</div>`;
    html += `<div class="section-title">Безопасность</div>` + note(twofa.totp_enabled ? '🔒 Двухфакторная аутентификация включена' : '⚠ Двухфакторная аутентификация выключена', twofa.totp_enabled ? 'info' : 'warn');
    return html;
  }
  L.formThresholds = async () => {
    const s = window._settings || []; const g = (k, d) => { const x = s.find(i => i.key === k); return x ? x.value : d; };
    await openSheet({
      title: 'Пороги оповещений', submitLabel: 'Сохранить',
      fields: [
        { name: 'alert_low_stock_cubic', label: 'Низкий остаток (куб)', type: 'number', value: g('alert_low_stock_cubic', '100') },
        { name: 'alert_unconfirmed_hours', label: 'Неподтв. ТТН (часов)', type: 'number', value: g('alert_unconfirmed_hours', '48') },
        { name: 'alert_cash_unsettled_days', label: 'Несверенные нал. (дней)', type: 'number', value: g('alert_cash_unsettled_days', '7') },
        { name: 'base_capacity_cubic', label: 'Ёмкость базы (куб)', type: 'number', value: g('base_capacity_cubic', '2500') },
      ],
      onSubmit: async (v) => { for (const k of ['alert_low_stock_cubic', 'alert_unconfirmed_hours', 'alert_cash_unsettled_days', 'base_capacity_cubic']) await api.put('/api/settings/' + k, { value: String(v[k]) }); afterWrite('Сохранено'); },
    });
  };
  L.formAddRef = async (kind) => {
    const titles = { clients: 'Клиент', sites: 'Участок', suppliers: 'Поставщик', carriers: 'Перевозчик' };
    await openSheet({
      title: 'Новый: ' + titles[kind], submitLabel: 'Добавить',
      fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, ...(kind === 'clients' ? [{ name: 'notes', label: 'Заметки', type: 'text' }] : [])],
      onSubmit: async (v) => { const body = { name: str(v.name) }; if (kind === 'clients') body.notes = str(v.notes); if (kind === 'sites') body.is_active = true; await api.post('/api/' + kind, body); afterWrite('Добавлено'); },
    });
  };
  L.formAddTariff = async () => {
    const sites = await api.get('/api/sites');
    await openSheet({
      title: 'Новый тариф', submitLabel: 'Сохранить',
      fields: [{ name: 'site_id', label: 'Участок', type: 'select', required: true, placeholder: '— выбрать —', options: listOpts(sites) }, { name: 'truck_owner', label: 'Чья машина', type: 'chips', value: 'DTL', options: [{ value: 'DTL', label: 'DTL' }, { value: 'Артём', label: 'Артём' }, { value: 'наёмная', label: 'Наёмная' }] }, { name: 'amount', label: 'Тариф ₽', type: 'number', required: true }, { name: 'comment', label: 'Комментарий', type: 'text' }],
      onSubmit: async (v) => { await api.post('/api/tariffs', { site_id: num(v.site_id), truck_owner: v.truck_owner, amount: num(v.amount), valid_from: todayISO(), comment: str(v.comment) }); afterWrite('Тариф добавлен'); },
    });
  };
  L.formAddToken = async () => {
    await openSheet({
      title: 'Новый API-токен', submitLabel: 'Создать',
      fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, { name: 'scope', label: 'Доступ', type: 'chips', value: 'read', options: [{ value: 'read', label: 'Чтение' }, { value: 'write', label: 'Запись' }, { value: 'full', label: 'Полный' }] }],
      onSubmit: async (v) => { const r = await api.post('/api/tokens', { name: str(v.name), scope: v.scope, daily_cost_limit_usd: null }); afterWrite(null); if (r && r.token) await confirmAction({ title: 'Токен создан', text: 'Скопируйте сейчас — позже не покажем:\n\n' + r.token, okLabel: 'Скопировал' }); },
    });
  };
  L.revokeToken = async (id) => { if (!await confirmAction({ title: 'Отозвать токен?', danger: true, okLabel: 'Отозвать' })) return; await api.del('/api/tokens/' + id); afterWrite('Токен отозван'); };

  /* ═══════════════════════════ ЗАГРУЗКА ═══════════════════════════ */
  window.addEventListener('hashchange', renderApp);

  async function boot() {
    try {
      const r = await api.refresh();
      if (r && r.access_token) api.setToken(r.access_token);
      user = await api.me();
      window.currentUser = user;
    } catch (e) { user = null; }
    renderApp();
  }
  boot();
})();
