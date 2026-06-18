import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from .config import settings

_pool: ThreadedConnectionPool | None = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=2, maxconn=10,
            dsn=settings.DATABASE_URL,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool


def get_connection():
    return _get_pool().getconn()


def _release(conn):
    _get_pool().putconn(conn)


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _release(conn)


def query(sql, params=None, conn=None):
    """Execute SELECT, return list of dicts."""
    close_after = conn is None
    if conn is None:
        conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
    finally:
        if close_after:
            _release(conn)


def query_one(sql, params=None, conn=None):
    """Execute SELECT, return one dict or None."""
    rows = query(sql, params, conn)
    return rows[0] if rows else None


def execute(sql, params=None, conn=None, returning=False):
    """Execute INSERT/UPDATE. If returning=True, return the first row."""
    close_after = conn is None
    if conn is None:
        conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if returning:
                row = cur.fetchone()
                result = dict(row) if row else None
            else:
                result = None
        if close_after:
            conn.commit()
        return result
    except Exception:
        if close_after:
            conn.rollback()
        raise
    finally:
        if close_after:
            _release(conn)
