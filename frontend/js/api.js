/**
 * DTL Management System – API Client v2
 */
const api = (() => {
  const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000' : '';
  let token = null;

  async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try { res = await fetch(BASE + path, opts); }
    catch (e) { throw new Error('Нет соединения с сервером'); }
    if (res.status === 401 && path !== '/api/auth/login') {
      const r = await fetch(BASE + '/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) { token = (await r.json()).access_token; return req(method, path, body); }
      token = null; location.hash = '#login'; throw new Error('Unauthorized');
    }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || res.statusText); }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    setToken(t) { token = t; },
    getToken() { return token; },
    get: (p) => req('GET', p),
    post: (p, b) => req('POST', p, b),
    put: (p, b) => req('PUT', p, b),
    patch: (p, b) => req('PATCH', p, b),
    del: (p) => req('DELETE', p),
    login: async (login, password) => {
      const d = await req('POST', '/api/auth/login', { login, password });
      token = d.access_token;
      return d;
    },
    logout: async () => { await req('POST', '/api/auth/logout'); token = null; },
    me: () => req('GET', '/api/auth/me'),
    refresh: () => req('POST', '/api/auth/refresh'),
  };
})();
window.api = api;
