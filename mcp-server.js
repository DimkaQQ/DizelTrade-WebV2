#!/usr/bin/env node
/**
 * DTL MCP Server for Cursor
 * Exposes DTL Management System API as AI tools
 *
 * Setup in Cursor → Settings → MCP:
 * {
 *   "dtl": {
 *     "command": "node",
 *     "args": ["/path/to/mcp-server.js"],
 *     "env": {
 *       "DTL_API_URL": "https://dimkaprojects.xyz",
 *       "DTL_API_TOKEN": "dtl_your_token_here"
 *     }
 *   }
 * }
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const API_URL = process.env.DTL_API_URL || 'https://dimkaprojects.xyz';
const API_TOKEN = process.env.DTL_API_TOKEN || '';

if (!API_TOKEN) {
  process.stderr.write('ERROR: DTL_API_TOKEN not set\n');
  process.exit(1);
}

async function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => {
        try { resolve(JSON.parse(out)); } catch { resolve({ raw: out }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const TOOLS = [
  {
    name: 'get_balance',
    description: 'Получить текущий остаток топлива на базе DTL и рейсы в пути',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_dispatch',
    description: 'Записать рейс с базы на участок',
    inputSchema: {
      type: 'object',
      required: ['site_name', 'volume'],
      properties: {
        site_name:    { type: 'string', description: 'Название участка (Акурдан, Дипкун ближний, и т.д.)' },
        volume:       { type: 'number', description: 'Объём в кубометрах' },
        truck_name:   { type: 'string', description: 'Название машины (МАН, и т.д.)' },
        driver_name:  { type: 'string', description: 'ФИО водителя' },
        tariff:       { type: 'number', description: 'Тариф ₽/куб' },
        dispatched_at:{ type: 'string', description: 'Дата YYYY-MM-DD (по умолч. сегодня)' },
        ttn_number:   { type: 'string', description: 'Номер ТТН' },
      },
    },
  },
  {
    name: 'create_fuel_receipt',
    description: 'Записать приёмку топлива на базу',
    inputSchema: {
      type: 'object',
      required: ['volume_nominal'],
      properties: {
        volume_nominal: { type: 'number', description: 'Объём в кубометрах' },
        supplier_name:  { type: 'string', description: 'Название поставщика' },
        received_at:    { type: 'string', description: 'Дата YYYY-MM-DD' },
        ttn_number:     { type: 'string', description: 'Номер ТТН' },
        notes:          { type: 'string' },
      },
    },
  },
  {
    name: 'create_income',
    description: 'Записать поступление денег от клиента',
    inputSchema: {
      type: 'object',
      required: ['client_name', 'amount'],
      properties: {
        client_name: { type: 'string' },
        amount:      { type: 'number', description: 'Сумма в рублях' },
        income_at:   { type: 'string', description: 'Дата YYYY-MM-DD' },
        volume:      { type: 'number', description: 'Объём в тоннах (опционально)' },
        comment:     { type: 'string' },
      },
    },
  },
  {
    name: 'create_expense',
    description: 'Записать расход компании',
    inputSchema: {
      type: 'object',
      required: ['amount'],
      properties: {
        amount:     { type: 'number', description: 'Сумма в рублях' },
        category:   { type: 'string', enum: ['Топливо','Зарплата','Ремонт','ТО','Аренда','Прочие'] },
        expense_at: { type: 'string', description: 'Дата YYYY-MM-DD' },
        comment:    { type: 'string' },
      },
    },
  },
  {
    name: 'create_fleet_expense',
    description: 'Записать расход по конкретной машине',
    inputSchema: {
      type: 'object',
      required: ['truck_name', 'amount'],
      properties: {
        truck_name: { type: 'string' },
        amount:     { type: 'number' },
        category:   { type: 'string', enum: ['Ремонт','ТО','Зарплата','Топливо','Резина','Страховка','Прочие'] },
        expense_at: { type: 'string' },
        comment:    { type: 'string' },
      },
    },
  },
  {
    name: 'create_debt',
    description: 'Записать долг или оплату долга',
    inputSchema: {
      type: 'object',
      required: ['debtor', 'amount'],
      properties: {
        debtor:      { type: 'string', description: 'Имя должника' },
        amount:      { type: 'number' },
        type:        { type: 'string', enum: ['ДОЛГ', 'ОПЛАТА'] },
        recorded_at: { type: 'string' },
        comment:     { type: 'string' },
      },
    },
  },
  {
    name: 'ask_ai',
    description: 'Задать вопрос ИИ-ассистенту DTL (данные, статистика, помощь)',
    inputSchema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: { type: 'string', description: 'Вопрос на русском языке' },
      },
    },
  },
  {
    name: 'get_lookup',
    description: 'Получить списки машин, участков, клиентов, поставщиков, перевозчиков из системы',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name, args) {
  if (name === 'get_balance') {
    const d = await apiCall('GET', '/api/dashboard');
    return { balance_cubic: d.balance_cubic, trips_in_transit: d.trips_in_transit, month_revenue: d.month_revenue };
  }
  if (name === 'ask_ai') {
    const d = await apiCall('POST', '/api/ai/query', { question: args.question });
    return d;
  }
  if (name === 'get_lookup') {
    return await apiCall('GET', '/api/ai/lookup');
  }
  // Write actions go through /api/ai/execute
  const writeActions = ['create_dispatch','create_fuel_receipt','create_income','create_expense','create_fleet_expense','create_debt','create_hire'];
  if (writeActions.includes(name)) {
    return await apiCall('POST', '/api/ai/execute', { action: name, data: args });
  }
  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }

  let result, error;
  try {
    if (req.method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'dtl-mcp', version: '1.0.0', description: 'DTL Management System API' },
      };
    } else if (req.method === 'tools/list') {
      result = { tools: TOOLS };
    } else if (req.method === 'tools/call') {
      const toolResult = await callTool(req.params.name, req.params.arguments || {});
      result = { content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }] };
    } else if (req.method === 'notifications/initialized') {
      return; // no response needed
    } else {
      result = {};
    }
  } catch (e) {
    error = { code: -32603, message: e.message };
  }

  const resp = error
    ? { jsonrpc: '2.0', id: req.id, error }
    : { jsonrpc: '2.0', id: req.id, result };
  process.stdout.write(JSON.stringify(resp) + '\n');
});

process.stderr.write(`DTL MCP Server ready — ${API_URL}\n`);
