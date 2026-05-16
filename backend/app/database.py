import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from .config import settings


def get_connection():
    return psycopg2.connect(settings.DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


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
        conn.close()


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
            conn.close()


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
                return dict(cur.fetchone())
            if close_after:
                conn.commit()
    except Exception:
        if close_after:
            conn.rollback()
        raise
    finally:
        if close_after:
            conn.close()
