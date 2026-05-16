/**
 * DTL Management System – API Client
 * All communication with the backend goes through this module.
 * Access token is kept in memory only (never localStorage/sessionStorage).
 */

(function () {
  'use strict';

  // ── Base URL ────────────────────────────────────────────────────────────────
  const BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:8000'
      : '';

  // ── In-memory token ─────────────────────────────────────────────────────────
  let _token = null;
  let _refreshing = null; // in-flight refresh promise

  // ── Core fetch wrapper ──────────────────────────────────────────────────────
  async function _fetch(method, path, body, retry) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    const opts = { method, headers, credentials: 'include' };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (err) {
      throw new Error('Нет соединения с сервером');
    }

    // Token expired – try to refresh once
    if (res.status === 401 && !retry) {
      try {
        await _refresh();
        return _fetch(method, path, body, true); // one retry
      } catch {
        _token = null;
        window.currentUser = null;
        location.hash = '#login';
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      }
    }

    if (!res.ok) {
      let detail = `Ошибка ${res.status}`;
      try {
        const j = await res.clone().json();
        detail = j.detail || j.message || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    // Some endpoints return 204 No Content
    if (res.status === 204) return null;

    return res.json();
  }

  // ── Public auth methods ─────────────────────────────────────────────────────
  async function login(loginStr, password) {
    const data = await _fetch('POST', '/api/auth/login', {
      login: loginStr,
      password,
    }, true);
    _token = data.access_token;
    return data;
  }

  async function logout() {
    try {
      await _fetch('POST', '/api/auth/logout', {}, true);
    } finally {
      _token = null;
      window.currentUser = null;
    }
  }

  async function _refresh() {
    // Deduplicate concurrent refresh calls
    if (_refreshing) return _refreshing;
    _refreshing = (async () => {
      const data = await _fetch('POST', '/api/auth/refresh', undefined, true);
      _token = data.access_token;
      return data;
    })().finally(() => { _refreshing = null; });
    return _refreshing;
  }

  // ── Public HTTP helpers ─────────────────────────────────────────────────────
  function get(path) {
    return _fetch('GET', path, undefined, false);
  }

  function post(path, body) {
    return _fetch('POST', path, body, false);
  }

  function put(path, body) {
    return _fetch('PUT', path, body, false);
  }

  function del(path) {
    return _fetch('DELETE', path, undefined, false);
  }

  // ── Expose ──────────────────────────────────────────────────────────────────
  window.api = {
    login,
    logout,
    refresh: _refresh,
    get,
    post,
    put,
    delete: del,
  };
})();
