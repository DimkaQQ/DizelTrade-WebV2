#!/usr/bin/env python3
"""
Apply a .sql migration using the app's own DATABASE_URL (from .env / env).
Avoids psql peer-auth issues.

Run from /opt/dtl:
  source backend/venv/bin/activate
  python3 backend/tools/run_migration.py backend/migrations/021_income_is_credit.sql
"""
import sys, os

# Make `app` importable and load .env from the backend dir (same as the app does)
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)  # so pydantic finds backend/.env

if len(sys.argv) < 2:
    print(__doc__); sys.exit(1)

sql_path = sys.argv[1]
if not os.path.isabs(sql_path):
    sql_path = os.path.join(os.getcwd(), os.path.relpath(sql_path, BACKEND)) \
        if sql_path.startswith("backend/") else os.path.abspath(sql_path)
# Fallback: try as given and relative to repo root
candidates = [sys.argv[1], os.path.join(BACKEND, sys.argv[1].replace("backend/", "")),
              os.path.join(os.path.dirname(BACKEND), sys.argv[1])]
sql_file = next((p for p in candidates if os.path.isfile(p)), None)
if not sql_file:
    print(f"SQL file not found. Tried: {candidates}"); sys.exit(1)

with open(sql_file, encoding="utf-8") as f:
    sql = f.read()

import psycopg2, psycopg2.extras
from app.config import settings

print(f"Applying: {sql_file}")
conn = psycopg2.connect(settings.DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
try:
    with conn.cursor() as cur:
        cur.execute(sql)
        # Print any result rows from the final SELECT (verification)
        try:
            rows = cur.fetchall()
            if rows:
                print(f"\n— Результат проверки ({len(rows)} строк) —")
                for r in rows[:60]:
                    print("  ", dict(r))
        except psycopg2.ProgrammingError:
            pass
    conn.commit()
    print("\n✅ Migration applied & committed.")
except Exception as e:
    conn.rollback()
    print(f"\n❌ Migration failed (rolled back): {e}")
    sys.exit(1)
finally:
    conn.close()
