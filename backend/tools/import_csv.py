#!/usr/bin/env python3
"""
DTL Management System — CSV Import Tool
========================================

Usage:
    python import_csv.py --type <TYPE> --file <PATH> [--dry-run]

Types:
    orders      Import orders (orders table + order_sites junction)
    dispatches  Import fuel dispatches (fuel_dispatches table)
    income      Import income records (income_records table)
    expenses    Import company expenses (company_expenses table)
    debts       Import debt records (debt_records table)

CSV column formats:
    orders:     date, client_name, volume_cubic, price_per_cubic, status, sites, comment
    dispatches: date, truck_name, driver_name, site_name, volume_cubic, ttn_number, status
    income:     date, amount, category, client_name, description
    expenses:   date, amount, category, description
    debts:      date, counterparty, amount, type, description

Options:
    --dry-run   Parse and validate without inserting into database

Environment variables (DB connection):
    DATABASE_URL          Full PostgreSQL URL (postgres://user:pass@host/db)
    or individually:
    POSTGRES_HOST         DB host (default: localhost)
    POSTGRES_PORT         DB port (default: 5432)
    POSTGRES_DB           DB name (default: dtl)
    POSTGRES_USER         DB user (default: dtl)
    POSTGRES_PASSWORD     DB password

Example:
    DATABASE_URL=postgres://dtl:secret@localhost/dtl \\
        python import_csv.py --type orders --file orders_2025.csv --dry-run
"""

import argparse
import csv
import os
import sys
from datetime import datetime
from urllib.parse import urlparse


# ── DB connection ─────────────────────────────────────────────────────────────

def get_connection():
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        parsed = urlparse(db_url)
        import psycopg2
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            dbname=parsed.path.lstrip("/"),
            user=parsed.username,
            password=parsed.password,
        )
    import psycopg2
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
        dbname=os.environ.get("POSTGRES_DB", "dtl"),
        user=os.environ.get("POSTGRES_USER", "dtl"),
        password=os.environ.get("POSTGRES_PASSWORD", ""),
    )


# ── Date parsing ──────────────────────────────────────────────────────────────

def parse_date(s):
    """Parse date from DD.MM.YYYY, YYYY-MM-DD, or DD/MM/YYYY formats."""
    s = s.strip()
    if not s:
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%y", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


# ── CSV reading ───────────────────────────────────────────────────────────────

def read_csv(path):
    """Read CSV file, handling BOM and common encodings."""
    for enc in ("utf-8-sig", "utf-8", "cp1251", "latin-1"):
        try:
            with open(path, newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            return rows
        except (UnicodeDecodeError, FileNotFoundError):
            continue
    raise RuntimeError(f"Cannot read file: {path}")


# ── Lookup helpers ────────────────────────────────────────────────────────────

def lookup_or_create_client(cur, name):
    name = name.strip()
    cur.execute("SELECT id FROM clients WHERE name = %s LIMIT 1", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO clients (name) VALUES (%s) RETURNING id", (name,))
    return cur.fetchone()[0]


def lookup_site(cur, name):
    name = name.strip()
    cur.execute("SELECT id FROM sites WHERE name ILIKE %s LIMIT 1", (name,))
    row = cur.fetchone()
    return row[0] if row else None


def lookup_truck(cur, name):
    name = name.strip()
    cur.execute("SELECT id FROM trucks WHERE name ILIKE %s LIMIT 1", (name,))
    row = cur.fetchone()
    return row[0] if row else None


def lookup_driver(cur, name):
    name = name.strip()
    cur.execute("SELECT id FROM drivers WHERE name ILIKE %s LIMIT 1", (name,))
    row = cur.fetchone()
    return row[0] if row else None


# ── Import functions ──────────────────────────────────────────────────────────

def import_orders(cur, rows, dry_run):
    inserted = skipped = errors = 0
    for i, row in enumerate(rows, 1):
        try:
            date_str = row.get("date", "").strip()
            client_name = row.get("client_name", "").strip()
            volume_str = row.get("volume_cubic", "").strip()
            price_str = row.get("price_per_cubic", "").strip()
            status_raw = row.get("status", "").strip().lower()
            sites_raw = row.get("sites", "").strip()
            comment = row.get("comment", "").strip() or None

            if not client_name or not volume_str:
                skipped += 1
                continue

            date = parse_date(date_str)
            if not date:
                date = datetime.utcnow().date()

            volume_cubic = float(volume_str.replace(",", "."))
            price_per_cubic = float(price_str.replace(",", ".")) if price_str else None

            status_map = {"closed": "closed", "done": "closed", "completed": "closed"}
            status = status_map.get(status_raw, "active")

            if dry_run:
                inserted += 1
                continue

            client_id = lookup_or_create_client(cur, client_name)
            cur.execute(
                """
                INSERT INTO orders (client_id, created_at, volume_ordered, price_per_liter, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (client_id, date, volume_cubic, price_per_cubic, status, comment),
            )
            order_id = cur.fetchone()[0]

            # Insert site associations
            if sites_raw:
                for site_name in sites_raw.split(","):
                    site_id = lookup_site(cur, site_name.strip())
                    if site_id:
                        cur.execute(
                            "INSERT INTO order_sites (order_id, site_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (order_id, site_id),
                        )

            inserted += 1
        except Exception as e:
            errors += 1
            print(f"  Row {i} error: {e}", file=sys.stderr)
    return inserted, skipped, errors


def import_dispatches(cur, rows, dry_run):
    inserted = skipped = errors = 0
    for i, row in enumerate(rows, 1):
        try:
            date_str = row.get("date", "").strip()
            truck_name = row.get("truck_name", "").strip()
            driver_name = row.get("driver_name", "").strip()
            site_name = row.get("site_name", "").strip()
            volume_str = row.get("volume_cubic", "").strip()
            ttn_number = row.get("ttn_number", "").strip() or None
            status_raw = row.get("status", "").strip().lower()

            if not site_name or not volume_str:
                skipped += 1
                continue

            date = parse_date(date_str)
            if not date:
                date = datetime.utcnow().date()

            volume = float(volume_str.replace(",", "."))

            delivered_values = {"доставлено", "done", "delivered"}
            status = "delivered" if status_raw in delivered_values else "in_transit"

            if dry_run:
                inserted += 1
                continue

            truck_id = lookup_truck(cur, truck_name) if truck_name else None
            driver_id = lookup_driver(cur, driver_name) if driver_name else None
            site_id = lookup_site(cur, site_name)

            if not site_id:
                skipped += 1
                continue

            cur.execute(
                """
                INSERT INTO fuel_dispatches
                    (dispatched_at, truck_id, driver_id, site_id, volume,
                     ttn_number, status, truck_owner)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (date, truck_id, driver_id, site_id, volume, ttn_number, status, "DTL"),
            )
            inserted += 1
        except Exception as e:
            errors += 1
            print(f"  Row {i} error: {e}", file=sys.stderr)
    return inserted, skipped, errors


def import_income(cur, rows, dry_run):
    inserted = skipped = errors = 0
    for i, row in enumerate(rows, 1):
        try:
            date_str = row.get("date", "").strip()
            amount_str = row.get("amount", "").strip()
            category = row.get("category", "").strip() or "transport"
            client_name = row.get("client_name", "").strip() or None
            description = row.get("description", "").strip() or None

            if not amount_str:
                skipped += 1
                continue

            date = parse_date(date_str)
            if not date:
                date = datetime.utcnow().date()

            amount = float(amount_str.replace(",", ".").replace(" ", ""))

            if dry_run:
                inserted += 1
                continue

            cur.execute(
                """
                INSERT INTO income_records (income_at, amount, category, client_name, comment)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (date, amount, category, client_name, description),
            )
            inserted += 1
        except Exception as e:
            errors += 1
            print(f"  Row {i} error: {e}", file=sys.stderr)
    return inserted, skipped, errors


def import_expenses(cur, rows, dry_run):
    inserted = skipped = errors = 0
    for i, row in enumerate(rows, 1):
        try:
            date_str = row.get("date", "").strip()
            amount_str = row.get("amount", "").strip()
            category = row.get("category", "").strip() or "прочие"
            description = row.get("description", "").strip() or None

            if not amount_str:
                skipped += 1
                continue

            date = parse_date(date_str)
            if not date:
                date = datetime.utcnow().date()

            amount = float(amount_str.replace(",", ".").replace(" ", ""))

            if dry_run:
                inserted += 1
                continue

            cur.execute(
                """
                INSERT INTO company_expenses (expense_at, amount, category, comment)
                VALUES (%s, %s, %s, %s)
                """,
                (date, amount, category, description),
            )
            inserted += 1
        except Exception as e:
            errors += 1
            print(f"  Row {i} error: {e}", file=sys.stderr)
    return inserted, skipped, errors


def import_debts(cur, rows, dry_run):
    inserted = skipped = errors = 0

    DEBT_KEYWORDS = {"долг", "задолженность", "debt"}
    PAY_KEYWORDS = {"оплата", "погашение", "payment", "pay"}

    for i, row in enumerate(rows, 1):
        try:
            date_str = row.get("date", "").strip()
            counterparty = row.get("counterparty", "").strip()
            amount_str = row.get("amount", "").strip()
            type_raw = row.get("type", "").strip().lower()
            description = row.get("description", "").strip() or None

            if not counterparty or not amount_str:
                skipped += 1
                continue

            date = parse_date(date_str)
            if not date:
                date = datetime.utcnow().date()

            amount = float(amount_str.replace(",", ".").replace(" ", ""))

            if any(kw in type_raw for kw in PAY_KEYWORDS):
                record_type = "ОПЛАТА"
            else:
                record_type = "ДОЛГ"

            if dry_run:
                inserted += 1
                continue

            cur.execute(
                """
                INSERT INTO debt_records (debt_date, counterparty, amount, record_type, comment)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (date, counterparty, amount, record_type, description),
            )
            inserted += 1
        except Exception as e:
            errors += 1
            print(f"  Row {i} error: {e}", file=sys.stderr)
    return inserted, skipped, errors


# ── Main ──────────────────────────────────────────────────────────────────────

IMPORTERS = {
    "orders": import_orders,
    "dispatches": import_dispatches,
    "income": import_income,
    "expenses": import_expenses,
    "debts": import_debts,
}


def main():
    parser = argparse.ArgumentParser(
        description="Import historical data from CSV into DTL PostgreSQL database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--type",
        required=True,
        choices=list(IMPORTERS.keys()),
        help="Type of data to import",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the CSV file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse but do not insert into the database",
    )
    args = parser.parse_args()

    print(f"DTL Import: type={args.type}, file={args.file}, dry_run={args.dry_run}")

    rows = read_csv(args.file)
    if not rows:
        print("No rows found in CSV.")
        sys.exit(0)

    print(f"Loaded {len(rows)} rows from CSV.")

    importer = IMPORTERS[args.type]

    if args.dry_run:
        # Use a dummy cursor in dry-run mode
        conn = None
        cur = None
        inserted, skipped, errors = importer(cur, rows, dry_run=True)
    else:
        conn = get_connection()
        try:
            with conn:
                cur = conn.cursor()
                inserted, skipped, errors = importer(cur, rows, dry_run=False)
        finally:
            conn.close()

    print()
    print("=" * 40)
    print(f"Import summary ({args.type}):")
    print(f"  Inserted : {inserted}")
    print(f"  Skipped  : {skipped}")
    print(f"  Errors   : {errors}")
    print(f"  Total    : {len(rows)}")
    if args.dry_run:
        print("  [DRY RUN — nothing was written to DB]")
    print("=" * 40)

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
