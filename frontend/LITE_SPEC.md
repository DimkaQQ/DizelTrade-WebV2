# DizelTrade "Lite" UI — Complete Build Specification

Derived from `frontend/js/app.js` (vanilla-JS hash-router SPA) + `frontend/js/api.js`.
This document is the single source of truth: build directly from it. Every endpoint, payload field,
role gate, and client-side calculation is listed.

All money is RUB (`₽`), all fuel volume is cubic meters ("куб"). Backend base URL is same-origin
(empty string) except on `localhost`/`127.0.0.1` where it is `http://localhost:8000`.

---

## 0. API Client conventions (`api.js`)

- `api.get(path)`, `api.post(path, body)`, `api.put(path, body)`, `api.patch(path, body)`, `api.del(path)`.
- All requests: `credentials: 'include'`, `Content-Type: application/json`, and `Authorization: Bearer <token>` when a token is set.
- **GET caching**: GET responses are cached in-memory for 30s (except `/api/auth/*`). Any non-GET request clears the entire cache.
- **401 handling**: on 401 (non-login), it auto-calls `POST /api/auth/refresh`; if refresh ok, retries with new `access_token`; else redirects to `#login`.
- **Error shape**: non-2xx → throws `Error` with message from `body.detail` (string, or array of `{msg}` joined by `; `).
- `204 No Content` returns `null`.
- Auth helpers: `api.login(login, password, totp_code?)` → `POST /api/auth/login` body `{login, password, totp_code?}`. Returns `{requires_2fa}` OR `{access_token}`.
  `api.logout()` → `POST /api/auth/logout`. `api.me()` → `GET /api/auth/me`. `api.refresh()` → `POST /api/auth/refresh` → `{access_token}`.

### Boot sequence
1. `api.refresh()` → set token from `access_token`.
2. `user = api.me()` → user object `{ role: 'partner'|'artem'|'operator', name, email }`.
3. Build layout (desktop sidebar if `innerWidth >= 768`, else mobile tab bar).
4. `render(location.hash || '#home')`.
5. If push permission granted, re-subscribe (see §Push).

---

## 1. Roles & gating helpers

```
isPartner()  → user.role === 'partner'
isArtem()    → user.role === 'artem'
isOp()       → user.role === 'operator'
isDesktop()  → window.innerWidth >= 768
```

### Router (`render(hash)`)
Hash is taken after `#`, default `home`. Query string (`?tab=...`, `?year=...`) parsed via `URLSearchParams`.

| Hash | View | Gate (else action) |
|---|---|---|
| `login` or `!user` | `viewLogin` | — |
| `home` / `''` | `viewHome` → role-specific | any logged-in |
| `base` / `base?tab=X` | `viewBase(tab)` | any |
| `base/receipts/new` | `viewBaseReceiptNew` | any |
| `base/dispatches/new` | `viewBaseDispatchNew` | **operator blocked** → toast "Нет доступа" → `#base?tab=trips` |
| `orders` | `viewOrders` | **operator blocked** → toast "Нет доступа · Только БАЗА" → `#home` |
| `orders/:id` | `viewOrderDetail(id)` | any (operator can deep-link; no extra guard) |
| `income` | `viewIncome` | **partner only** else toast → `#home` |
| `expenses` | `viewExpenses` | **partner only** |
| `hire` | `viewHire` | **partner only** |
| `debts` | `viewDebts` | **partner only** |
| `dashboard` | `viewDashboard` | **partner only** (silent redirect `#home`) |
| `fleet` | `viewFleet` | any (content differs by role) |
| `analytics` / `analytics?...` | `viewAnalytics` | **partner only** |
| `balance` / `balance?...` | `viewBalance` | **partner only** |
| `annual` / `annual?...` | `viewAnnual` | **partner only** |
| `settings` | `viewSettings` | **partner only** |
| `logs` | `viewLogs` | **partner only** |
| fallback | `viewHome` | — |

### Navigation surfaces
- **Desktop sidebar** (`>=768px`): Home always. Partner sees: Дашборд, База, Заказы, Журнал рейсов, Доходы, Расходы, Долги, Автопарк DTL, Найм, Аналитика, Баланс, Год. итоги, Настройки. Artem sees: База, Журнал рейсов, Мой автопарк. Operator sees: База, Журнал рейсов (no Заказы), Парк Артёма.
- **Mobile tab bar** (4 tabs): Partner = Главная / БАЗА / Заказы / Дашборд. Artem = Главная / Принял (`#base/receipts/new`) / Рейс (`#base/dispatches/new`) / Мой парк (`#fleet`). Operator = Главная / Принял / Рейс / Парк.
- **Topbar (desktop)** polls `GET /api/dashboard` every 15s: reads `base_balance`, `trips_in_transit`, `pending_receipts`. AI button shown for partner/artem only.

---

## 2. Reference (dropdown/chip) data endpoints

These populate selects/chips across forms. All return JSON arrays unless noted.

| Endpoint | Used by | Fields read |
|---|---|---|
| `GET /api/clients` | orders, income, hire, debts(via AI), settings | `id`, `name`, `notes` |
| `GET /api/sites` | dispatch form, new-order, settings, tariff modal | `id`, `name`, `is_active` |
| `GET /api/trucks` | dispatch form, own-usage, fleet | `id`, `name`, `status`(`active`/`for_sale`/`archived`), `plate`, `tank_volume`, `trips_month`, `revenue_month`, `owner` |
| `GET /api/trucks?owner=Артём` | fleet (artem/operator) | same |
| `GET /api/trucks?status=archived` (+ `&owner=Артём`) | fleet archive | same |
| `GET /api/drivers` | dispatch form | `id`, `name` |
| `GET /api/suppliers` | hire modal, settings | `id`, `name`, `is_active` |
| `GET /api/carriers` | hire modal, settings | `id`, `name`, `is_active` |
| `GET /api/tariffs` | settings (matrix) | `id`, `site_id`, `site_name`, `truck_owner`(`DTL`/`Артём`/`наёмная`), `amount` |
| `GET /api/tariffs?site_id=X&truck_owner=Y&latest=true` | dispatch tariff lookup | `amount`, `comment` (single object or null) |
| `GET /api/settings` | settings | array of `{key, value}` |
| `GET /api/ai/lookup` | AI form autocomplete | `{ sites:[], trucks:[], drivers:[], suppliers:[], carriers:[], clients:[], site_map:{name→id} }` |

### Tariff lookup logic
- URL: `GET /api/tariffs?site_id=<id>&truck_owner=<owner>&latest=true`.
- `truck_owner` is one of `DTL`, `Артём`, `наёмная` (mapped from chip labels: `Наш DTL`→`DTL`, `Автопарк Артёма`→`Артём`, `Наёмная`→`наёмная`).
- Response: single tariff object with `amount` (₽ per dispatch/куб) and optional `comment`. Used to display the live tariff box on the dispatch form, and as the `tariff` for AI dispatch creation. Reloaded whenever site chip or owner chip changes.

---

## 3. Formatting / calc helpers (replicate these)

```js
esc(s)                         // HTML-escape & < > " '
formatNum(n)                   // n==null||'' → '—'; else Number(n).toLocaleString('ru')  (e.g. 1 234 567)
currentTime()                  // HH:MM ru
new Date(x).toLocaleDateString('ru')   // dd.mm.yyyy
new Date(x).toLocaleString('ru')       // date+time
```

Key client-side calculations:
- **Receipt temperature/density correction (display only)**:
  `converted = volume * density / 0.840` (reference density 0.840 g/cm³). Shown as "Пересчитано: X куб при 20°C". NOTE: the POST still sends raw `volume_nominal`, `density`, `temperature`; backend computes `volume_adjusted`.
- **Order progress**: `pct = round(delivered/total*100)`, `remaining = max(0, total - delivered - inTransit)`. `delivered`/`inTransit` summed from dispatches filtered by status.
- **Hire margin (per-liter)**: `margin = price_client - price_supplier - price_carrier`; `marginPct = margin/price_client*100`; `marginRub = margin * volume_liters`.
- **Hire куб from liters**: `volume_liters / 1000`.
- **Balance**: `netAssets = assets - liabilities`; `liquidity = assets/liabilities`; `netDebt = liabilities - assets*0.3` (display estimate).
- **Annual profit**: `profit = data.profit`; `totalRev = revenue_fleet + revenue_hire`; `totalExp = expenses_fleet + expenses_fuel + expenses_carriers + expenses_general`. Margins: fleet = `revenue_fleet - expenses_fleet`; hire = `revenue_hire - (hire_supplier_cost || expenses_carriers)`.

---

## 4. viewLogin

- **Route**: `#login` or any hash when `!user`.
- No GET. Inputs: `#l-login`, `#l-pass`.
- **Action `doLogin()`**: `api.login(login, pass)` → `POST /api/auth/login` body `{login, password}`.
  - If response `{requires_2fa:true}` → show 2FA step (input `#l-totp`), then `doLogin2FA(login,pass)` → `POST /api/auth/login` body `{login, password, totp_code}`.
  - On success set token from `access_token`, `api.me()`, go `#home`.

---

## 5. viewHome (dispatcher → role-specific)

`viewHome()` calls `viewHomePartner()` / `viewHomeArtem()` / `viewHomeOperator()`.

### 5a. viewHomePartner — partner
- **GET** `/api/dashboard/alerts` → array of `{type, ...}`. Counts `type === 'unconfirmed_receipt'` → shows banner "N поставки ожидают подтверждения" linking `#base`.
- Menu grid (navigation only): База, Заказы, Доходы, Расходы, Найм, Долги, Аналитика, Баланс, Год. итоги, Дашборд, История записей(`#logs`). Plus "Справка".

### 5b. viewHomeArtem — artem
- **GET** `/api/base/balance` → `balance_cubic`.
- **GET** `/api/base/receipts/pending` → array; each `{id, ttn_number, source_custom, supplier_name, volume_nominal, received_at}`. First 3 shown as "Принял" buttons → `confirmReceipt(id)`.
- **GET** `/api/base/dispatches` → filter `status in (dispatched,in_transit)`, slice 3; each `{id, truck_name, site_name, volume, driver_name, created_at}`. Shown as "Доставлено" → `confirmDispatch(id)`.
- **GET** `/api/orders` → find `status==='active'` → renders order card from `{client_name, delivered, volume_ordered, sites}`.
- **GET** `/api/base/artem-debt` → `{debt_rub}`. Shows "Долг DTL перед тобой" if `> 0`.
- Menu: Принял топливо, Рейс на участок (hidden for operator branch — n/a here), Мой автопарк, Наличные Артёму (`#base?tab=cash`).

### 5c. viewHomeOperator — operator
- **GET** `/api/base/balance` → `balance_cubic`.
- **GET** `/api/base/receipts/pending` → each `{id, ttn_number, source_custom, supplier_name, volume_nominal}`; "Принял" → `confirmReceipt(id)`.
- Menu: Принял топливо, Парк Артёма (`#fleet`). No dispatch (operator blocked).

---

## 6. viewBase — `#base` / `#base?tab=X`

Tabs (role-filtered): `main`(Главная), `receipts`(Приёмки), `trips`(Рейсы), `cash`(Наличные — **not** operator), `advances`(Авансы — **not** operator), `recon`(Сверка), `own-usage`(Своя заправка).

### tab=main
- **GET** `/api/base/balance` → `balance_cubic`, `received_today`, `total_received`, `total_dispatched`, `in_transit`.
- **GET** `/api/base/receipts/pending` → pending list (see 5b fields).
- **GET** `/api/base/dispatches` → `in_transit` filter for "Рейсы в пути"; each dispatch `{id, truck_name, site_name, volume, driver_name, created_at, status}`. Click → `showDispatchDetail(id)`.

### tab=receipts
- **GET** `/api/base/receipts?limit=20` → each `{id, source_custom, supplier_name, volume_nominal, ttn_number, received_at, ttn_confirmed}`. Click → `showReceiptDetail(id)`.
- Button "+ Принял топливо" → `#base/receipts/new`.

### tab=trips
- **GET** `/api/base/dispatches` → each `{id, truck_name, site_name, volume, driver_name, tariff, status, paid}`.
  - status `delivered` → badge "Доставлено" (or "✅ Оплачено" if `paid`); `cancelled` → "Отменён" (opacity .5); else "В пути" + inline "Доставлено" button → `confirmDispatch(id)`.
- "+ Рейс" button — **hidden for operator**.

### tab=cash → `buildCashArtemTab()`  (not operator)
- **GET** `/api/base/cash-artem` → each `{id, purpose, given_at, amount_given, amount_spent, fuel_received, is_settled}`.
- **GET** `/api/base/artem-balance` → `{balance}` (остаток у Артёма).
- Per record: artem can press "Отчёт" → `reportCashArtem(id)`; partner can press "✓ Закрыть" → `settleCashArtem(id)`.
- Partner-only "+ Выдать наличные" → `addCashArtemModal()`.

### tab=advances → `buildAdvancesTab()`  (not operator)
- **GET** `/api/base/advances` → each `{id, recipient, given_at, volume, amount, notes, status}` (`open`/`returned`).
- Partner: per open advance "Вернули" → `returnAdvance(id)`. Partner/artem: "+ Новый аванс" → `addAdvanceModal()`.

### tab=recon → `buildReconTab()`
- **GET** `/api/base/reconciliation/<YYYY-MM>` (current period) → `{physical_stock, difference, notes}`.
- **GET** `/api/base/balance` → `balance_cubic` (расчётный остаток).
- Async loads 5 prior months `GET /api/base/reconciliation/<period>` for history; reads `physical_stock`, `difference`.
- Non-operator: physical-measure form → `submitReconciliation(period, calcStock)`.

### tab=own-usage → `buildOwnUsageTab()`
- **GET** `/api/base/own-usage` → each `{truck_name, used_at, notes, volume}`.
- **GET** `/api/trucks` → chip options (filter `status !== 'archived'`).
- Submit `submitOwnUsage()`.

### viewBase write actions

| Action | Method · Endpoint | Body |
|---|---|---|
| `confirmReceipt(id)` | `PUT /api/base/receipts/{id}/confirm` | (none) |
| `confirmDispatch(id)` | `PUT /api/base/dispatches/{id}/status` | `{status:'delivered'}` |
| `submitOwnUsage()` | `POST /api/base/own-usage` | `{ used_at:<today YYYY-MM-DD>, truck_id:<int|null from chip>, volume:<float>, notes:<str|null> }` |
| `returnAdvance(id)` | `PUT /api/base/advances/{id}/return` | `{}` |
| `_submitAdvance()` | `POST /api/base/advances` | `{ given_at:<today>, recipient:<str>, volume:<float|null>, amount:<float|null>, notes:<str|null> }` |
| `_submitCashArtem()` | `POST /api/base/cash-artem` | `{ given_at:<today>, amount_given:<float>, purpose:<str|null> }` |
| `showCashForm()` (alt) | `POST /api/base/cash-artem` | `{ amount_given:<float>, purpose:<str> }` |
| `_submitCashReport(id)` | `PUT /api/base/cash-artem/{id}/report` | `{ amount_spent:<float>, fuel_received:<float>, notes:<str|null> }` |
| `settleCashArtem(id)` | `PUT /api/base/cash-artem/{id}/settle` | `{}` |
| `submitReconciliation(period)` | `POST /api/base/reconciliation` | `{ period:'YYYY-MM', physical_stock:<float>, notes:<str|null> }` |
| `correctReceiptModal` → submit | `PUT /api/base/receipts/{id}/correct` | `{ reason:<str req>, [volume_nominal], [density], [temperature], [ttn_number], [notes] }` (only changed fields) |
| `correctDispatchModal` → submit | `PUT /api/base/dispatches/{id}/correct` | `{ reason:<str req>, [volume], [tariff], [ttn_number], [notes] }` |

> **Correction modal mechanic**: only fields that *changed* from their original value are included; `reason` is always required. Numbers parsed via `parseFloat || null`. Checkboxes only sent when toggled.

---

## 7. viewBaseReceiptNew — `#base/receipts/new` (any role)

- Source chips (`data-group="source"`): `['Хабаровск','Ангарск','Коля','Восточка','Артём закупил','Другое']`, default `Хабаровск`.
- Inputs: `#f-volume`(default 200), `#f-temp`(15), `#f-density`(0.840), `#f-ttn`, photo `#f-photo-r`.
- Live calc `recalcReceipt()`: `converted = volume * density / 0.840`.
- Confirm overlay then `doSubmitReceipt()`.

**Action**: `POST /api/base/receipts`
```json
{ "source_custom": "<chip data-val>", "volume_nominal": <float>, "density": <float>, "temperature": <float>, "ttn_number": "<str>" }
```
Returns `{id}`. If photo selected:
1. `POST /api/upload/ttn` — `multipart/form-data` field `file` → `{url}` (manual fetch, Bearer header, no JSON content-type).
2. `POST /api/base/receipts/{id}/photo?photo_url=<encoded url>` (query param, empty body, Bearer header).

After save: toast, `loadTopbarStats()`, go `#base`.

**TTN scan** (optional, `scanTTN('f-photo-r')`): upload via `/api/upload/ttn` then `POST /api/ai/scan-ttn` body `{image_url:<url>}` → `{data:{ttn_number, temperature, density, volume_cubic}}` auto-fills fields.

---

## 8. viewBaseDispatchNew — `#base/dispatches/new` (NOT operator)

- **GET** `/api/trucks`, `/api/drivers`, `/api/sites` for chips.
- Owner chips (`data-group="owner"`): `['Наш DTL','Автопарк Артёма','Наёмная']` default `Наш DTL`. Mapped to `{DTL, Артём, наёмная}` for payload + tariff.
- Truck chips `data-group="truck"` (value=truck id), Driver chips `data-group="driver"` (value=driver id), Site chips `data-group="site"` (value=site id).
- Volume `#f-vol-d` (default 23.5). TTN `#f-ttn-d`. Photo `#f-photo-d`.
- Tariff box auto-loads via `loadTariff(siteId, owner)` → `GET /api/tariffs?site_id=X&truck_owner=Y&latest=true` → display `amount` ₽.

**Action `doSubmitDispatch()`**: `POST /api/base/dispatches`
```json
{
  "truck_id":  <int|null>,
  "driver_id": <int|null>,
  "site_id":   <int|null>,
  "truck_owner": "DTL"|"Артём"|"наёмная",
  "volume": <float>,
  "ttn_number": "<str>"
}
```
Returns `{id}` → optional photo upload (same 2-step pattern as receipts but `/api/base/dispatches/{id}/photo?photo_url=...`). Then go `#base?tab=trips`.

---

## 9. viewOrders — `#orders` (NOT operator)

- **GET** `/api/orders` → each order: `{ id, client_name, status('active'|other), created_at, closed_at, amount_paid, price_per_liter, delivered, in_transit, volume_ordered, sites:[names], delivery_type('own'|'hire'|'mixed' OR 'до Тынды'/'до участка'), notes }`.
- Partner sees stats + financials (`amount_paid`, `price_per_liter`) and "+ Новый заказ"; artem sees no financials.
- Active orders are clickable → `#orders/{id}`.

**Action `showNewOrderModal()`**:
- **GET** `/api/clients`, `/api/sites`.
- `POST /api/orders`:
```json
{ "client_id": <int>  OR  "client_name": "<str>",
  "paid_at": "YYYY-MM-DD",
  "volume_ordered": <float>,
  "price_per_liter": <float>,
  "amount_paid": <float>,
  "delivery_type": "до Тынды"|"до участка",
  "site_ids": [<int>...] }
```
(`client_id` used when a clients select exists; otherwise free-text `client_name`.)

---

## 10. viewOrderDetail — `#orders/:id`

- **GET** `/api/orders/{id}` → `{ client_name, paid_at, delivery_type, volume_ordered, amount_paid, price_per_liter, notes, status }`.
- **GET** `/api/base/dispatches` → filter `order_id == id`. Dispatch fields: `{id, truck_name, truck_temp, site_name, volume, dispatched_at, driver_name, driver_temp, status}`.
- Computes delivered/inTransit/remaining/pct from dispatches (see §3).

**Actions**:
| Button | Method · Endpoint | Body | Gate |
|---|---|---|---|
| Отчёт для клиента | `GET /api/orders/{id}/report` (returns HTML, opened in new window; Bearer header) | — | any |
| Закрыть заказ | `PUT /api/orders/{id}/close` | `{}` | partner, status active |
| ✅ Сверен | `PUT /api/orders/{id}/reconcile` | `{}` | partner, status≠closed |

---

## 11. viewIncome — `#income` (partner only)

- **GET** `/api/income` → each `{ id, amount, client_name, is_credit, income_at, volume, entered_by_name, comment }`.
- Totals: sum `amount`; this-month subset by `income_at`.

**Actions**:
- `showIncomeModal()`: **GET** `/api/clients`. `POST /api/income`:
  ```json
  { "income_at":"YYYY-MM-DD", "client_id":<int|null>, "amount":<float|null>, "volume":<float|null>, "comment":"<str>", "is_credit":<bool> }
  ```
- `correctIncome(...)` → `PUT /api/income/{id}/correct` body `{reason, [income_at], [amount], [volume], [comment], [is_credit]}` (changed-only).

---

## 12. viewExpenses — `#expenses` (partner only)

- **GET** `/api/expenses` → each `{ id, amount, category, expense_at, entered_by_name, comment }`.

**Actions**:
- `showExpenseModal()`: category chips `['Бухгалтерия','Аренда','Кредиты (тело)','Проценты по кредитам','Налоги/штрафы','Командировочные','Зарплата партнёрам','Финансовые расходы (налоги/вывод)','Прочие']` default `Прочие`. `POST /api/expenses`:
  ```json
  { "expense_at":"YYYY-MM-DD", "category":"<chip>", "amount":<float>, "comment":"<str>" }
  ```
- `correctExpense(...)` → `PUT /api/expenses/{id}/correct` body `{reason, [expense_at], [amount], [category], [comment]}`.

---

## 13. viewHire — `#hire` (partner only)

- **GET** `/api/hire` → each `{ id, client_name, carrier_name, carrier_custom, delivery_at, supplier_name, margin_pct, volume_liters, price_client, price_supplier, price_carrier, amount_client, margin, comment, is_closed }`.
- Stats: count, sum `amount_client` (→ млн), avg margin% = `totalMargin/totalRevenue*100`.

**Actions**:
- `showHireModal()`: **GET** `/api/clients`, `/api/suppliers`, `/api/carriers`. Live `calcHireMargin()`. `POST /api/hire`:
  ```json
  { "client_id":<int>, "supplier_id":<int>, "carrier_id":<int|null>,
    "delivery_at":"YYYY-MM-DD", "volume_liters":<float>,
    "price_client":<float>, "price_supplier":<float>, "price_carrier":<float> }
  ```
  (client_id & supplier_id required client-side.)
- `closeHireDeal(id)` → `POST /api/hire/{id}/close` body `{comment:"<str>"}`.
- `correctHire(...)` → `PUT /api/hire/{id}/correct` body `{reason, [delivery_at], [volume_liters], [price_client], [price_supplier], [price_carrier], [comment]}`.

---

## 14. viewDebts — `#debts` (partner only)

- **GET** `/api/debts` → `{ records:[...], balances:{debtorName: amount} }`. Each record `{ id, type('ДОЛГ'|'ОПЛАТА'), debtor, amount, comment, recorded_at, remaining, parent_id }`.
- **GET** `/api/analytics/client-debts` → each `{ client_name, total_debt, fuel_debt, delivery_debt, delivered_cub, paid_cub, unpaid_cub, open_count }` (rendered as "Задолженность по найму").

**Actions**:
- `showDebtModal()`: type chips `ДОЛГ`/`ОПЛАТА`. `POST /api/debts`:
  ```json
  { "recorded_at":"YYYY-MM-DD", "debtor":"<str>", "type":"ДОЛГ"|"ОПЛАТА", "amount":<float>, "comment":"<str>" }
  ```
- `payDebtModal(debtId, debtor, remaining)`: validates `amount<=remaining`. `POST /api/debts`:
  ```json
  { "recorded_at":"YYYY-MM-DD", "debtor":"<str>", "type":"ОПЛАТА", "amount":<float>, "comment":"<str>", "parent_id":<debtId> }
  ```
- `correctDebt(...)` → `PUT /api/debts/{id}/correct` body `{reason, [recorded_at], [amount], [type], [comment]}`.

---

## 15. viewDashboard — `#dashboard` (partner only)

- **GET** `/api/dashboard` → `{ base_balance, trips_in_transit, pending_receipts, artem_cash_balance, artem_debt, alerts:[{severity('warning'|'critical'|...), message}], client_debts:[{name, debt, total_hire, total_paid}], trucks_month:[{name, status, trips, revenue, expenses}] }`.
- **GET** `/api/orders` (loaded, used minimally).
- No writes. Balance box: "Долг DTL" = `max(0, artem_debt)`.

---

## 16. viewFleet — `#fleet` (all roles, content differs)

- **GET trucks**: partner → `/api/trucks`; artem/operator → `/api/trucks?owner=Артём`.
- Archived (partner & artem only): partner `/api/trucks?status=archived`; artem `/api/trucks?owner=Артём&status=archived`.
- Artem also: **GET** `/api/base/artem-debt` → `{debt_rub}`.
- Truck fields: `{id, name, status, plate, tank_volume, trips_month, revenue_month}`.
- **Role differences**:
  - Partner & artem: add/edit/for-sale/activate/archive/unarchive buttons; "+ Добавить машину".
  - Operator: read-only trucks (Артём park) + can only submit fleet expenses.
  - Artem & operator: "Внести расход" form (truck chip + category chip + amount + note).
  - Artem only: "Долг DTL передо мной" box from `debt_rub`.

**Actions**:
| Action | Method · Endpoint | Body |
|---|---|---|
| `showAddTruckModal` | `POST /api/trucks` | `{ name, tank_volume:<float|null>, plate:<str>, owner: isArtem()?'Артём':'DTL' }` |
| `showEditTruckModal` | `PUT /api/trucks/{id}` | `{ name, tank_volume:<float|null>, plate:<str> }` |
| `archiveTruck` | `PUT /api/trucks/{id}/archive` | (none) |
| `unarchiveTruck` | `PUT /api/trucks/{id}/unarchive` | (none) |
| `setTruckForSale` | `PUT /api/trucks/{id}/for-sale` | (none) |
| `activateTruck` | `PUT /api/trucks/{id}/activate` | (none) |
| `submitFleetExpense` | `POST /api/fleet/expenses` | `{ truck_id:<int>, expense_at:<today>, category:<chip ['Ремонт','ТО','Зарплата','Топливо','Резина','Прочее']>, amount:<float>, comment:<str> }` |

---

## 17. viewLogs — `#logs` (partner only)

- **GET** `/api/logs?limit=500` → each `{ action('INSERT'|'UPDATE'|'CORRECTION'|'DELETE'), table_name, record_id, user_name, user_id, created_at, reason }`.
- `table_name` mapped to RU labels (fuel_receipts→Приёмка, fuel_dispatches→Рейс, income_records→Доход, company_expenses→Расход, debt_records→Долг, hire_deliveries→Найм, orders→Заказ, trucks→Машина). No writes.

---

## 18. viewSettings — `#settings` (partner only route; some sections gated further)

GETs: `/api/sites`, `/api/tariffs`, `/api/suppliers`, `/api/carriers`, `/api/settings`, `/api/clients`. Partner-only extra: `/api/ai/usage`, `/api/tokens`, `/api/auth/sessions`. Always: `/api/auth/2fa/status`, `/api/auth/suspicious-logins`.

Response shapes:
- settings: `[{key,value}]`. Keys used: `base_capacity_cubic`(def 2500), `alert_low_stock_cubic`(100), `alert_unconfirmed_hours`(48), `alert_cash_unsettled_days`(7), `ai_daily_limit_rub`.
- `/api/ai/usage` → `{today_cost_rub, today_tokens, month_cost_rub, month_tokens, daily_limit_rub}`.
- `/api/tokens` → `[{id, name, last_used_at, is_active, scope, daily_cost_limit_usd}]`.
- `/api/auth/sessions` → `[{id, user_agent, ip, created_at}]`.
- `/api/auth/2fa/status` → `{totp_enabled}`.
- `/api/auth/suspicious-logins` → `[{detected_at, ip, prev_ip}]`.

**Actions**:
| Action | Method · Endpoint | Body |
|---|---|---|
| toggleSite | `PUT /api/sites/{id}` | `{ name, is_active:<bool> }` |
| addSiteModal | `POST /api/sites` | `{ name, is_active:true }` |
| addSupplierModal | `POST /api/suppliers` | `{ name }` |
| addCarrierModal | `POST /api/carriers` | `{ name }` |
| addClientModal | `POST /api/clients` | `{ name, notes:<str|null> }` |
| editClientModal | `PUT /api/clients/{id}` | `{ name, notes:<str|null> }` |
| addTariffModal | `POST /api/tariffs` | `{ site_id:<int>, truck_owner:'DTL'|'Артём'|'наёмная', amount:<float>, valid_from:'YYYY-MM-DD', comment:<str|null> }` |
| saveTariff (edit) | `PUT /api/tariffs/{id}` | `{ site_id:<int>, truck_owner:<str>, amount:<float> }` |
| saveSettings | `PUT /api/settings/{key}` (one per changed key) | `{ value:"<str>" }` |
| saveAiLimit | `PUT /api/settings/ai_daily_limit_rub` | `{ value:"<str>" }` |
| createApiToken | `POST /api/tokens` | `{ name, scope:'full'|'write'|'read', daily_cost_limit_usd:<float|null> }` → returns `{token}` |
| revokeApiToken | `DELETE /api/tokens/{id}` | — |
| revokeSession | `DELETE /api/auth/sessions/{id}` | — |
| setup2FA: get QR | `POST /api/auth/2fa/setup` | `{}` → `{qr_svg, secret}` |
| setup2FA: enable | `POST /api/auth/2fa/enable` | `{ code:"<6-digit>" }` |
| disable2FA | `POST /api/auth/2fa/disable` | `{ password:"<str>" }` |

Tariff matrix rendering: groups `tariffs` by `site_id`, columns DTL/Артём/наёмная from `truck_owner`.

---

## 19. viewAnalytics — `#analytics?year=&month=` (partner only)

`month=0` (or 'Год') means full year (omit `month` param in clients/suppliers calls).

GETs:
- `GET /api/analytics/summary?year=Y&month=M` → `{revenue_total, profit, margin_pct}`.
- `GET /api/analytics/clients?year=Y[&month=M]` → `[{client_name, pct_of_total}]`.
- `GET /api/analytics/fleet-pnl?year=Y&month=M` → `{ trucks:[{truck_name, owner, revenue, expenses, margin_pct, trips, avg_per_trip, volume}], own_fleet, dtl_fleet, artem_fleet, hire:{revenue,expenses,margin_pct,trips,volume}, company_expenses, net_profit }` (subtotal objects have same numeric shape).
- `GET /api/analytics/suppliers?year=Y[&month=M]` → `[{supplier_name, pct_of_total}]`.
- `GET /api/analytics/carriers?year=Y&month=M` → `[{carrier_name, trips, cost, pct_cost, pct_volume}]`.

No writes. Year tabs = current..-2; month tabs incl. "Год".

---

## 20. viewBalance — `#balance?year=&month=` (partner only)

GETs:
- `GET /api/balance/monthly?year=Y` → `[{month, assets, liabilities, net_assets}]`.
- `GET /api/balance/current` → `{assets, liabilities}`.
- `GET /api/balance/entries?year=Y&month=M` → `[{object_name, category, entry_type('asset'|'liability'), amount}]`.

**Actions**:
- `showBalanceEntryModal(year, month)` → `POST /api/balance/entry` body `{ year:<int>, month:<int>, assets:<float>, liabilities:<float>, notes:<str> }`.
- `showDetailedBalanceModal(year, month)` → `POST /api/balance` body:
  ```json
  { "period":"YYYY-MM-01", "category":<chip ['Деньги','ОФЗ','Техника','Оборудование','Займы','Обязательства']>,
    "object_name":"<str>", "amount":<float>, "entry_type":"asset"|"liability", "notes":<str|null> }
  ```

---

## 21. viewAnnual — `#annual?year=` (partner only)

- **GET** `/api/annual?year=Y` → `{ revenue_fleet, revenue_hire, expenses_fleet, expenses_fuel, expenses_carriers, expenses_general, hire_supplier_cost, profit, clients:[{client_name, pct_of_total}], suppliers:[{supplier_name, pct_of_total}] }`.
- No writes. See §3 for profit/margin formulas.

---

## 22. Detail overlays (used from multiple lists)

### showReceiptDetail(id)
- **GET** `/api/base/receipts/{id}` → `{ id, source_name, source_custom, supplier_name, volume_nominal, volume_adjusted, temperature, density, ttn_number, ttn_confirmed, received_at, notes, ttn_photo_url }`.
- Confirm (if unconfirmed, any role) → `PUT /api/base/receipts/{id}/confirm` body `{}`.
- Correct (partner/artem) → `correctReceiptModal` (see §6 table).

### showDispatchDetail(id)
- **GET** `/api/base/dispatches/{id}` → `{ id, truck_name, truck_temp, driver_name, driver_temp, site_name, volume, tariff, ttn_number, status, paid, paid_at, dispatched_at, delivered_at, notes, ttn_photo_url }`.
- `updateDispatchStatus(id, status)` → `PUT /api/base/dispatches/{id}/status` body `{status:'delivered'|'cancelled'}` (deliver: any role; cancel: partner only).
- `toggleDispatchPaid(id, paid)` (partner, delivered only) → `PUT /api/base/dispatches/{id}/paid` or `/unpaid` body `{}`.
- Correct (partner/artem) → `correctDispatchModal`.

---

## 23. AI assistant (optional for lite; partner/artem only)

- `POST /api/ai/query` body `{question}` → `{type:'action', action, data, description}` OR `{type:'text', answer}`.
- `POST /api/ai/execute` body `{action, data}` → `{message}`. Action types & field schemas: `create_dispatch`, `create_fuel_receipt`, `create_income`, `create_expense`, `create_hire`, `create_debt`, `create_fleet_expense` (field keys match the corresponding REST payloads above; dispatch tariff via `/api/tariffs?...&latest=true`).
- `GET /api/ai/lookup` for autocomplete; `POST /api/ai/scan-ttn` body `{image_url}` → `{data:{...}}`.

---

## 24. Push & misc

- `GET /api/notifications/vapid-public-key` → `{key}`.
- `POST /api/notifications/subscribe` body `{endpoint, p256dh, auth}`.
- `POST /api/upload/ttn` (multipart `file`) → `{url}`.
- `POST /api/logs/client` body `{level, message, stack, url}` (client error logging; fire-and-forget).
