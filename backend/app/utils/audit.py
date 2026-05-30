import json
from datetime import datetime, date
from decimal import Decimal
from ..database import execute


def _serial(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _dumps(data):
    if data is None:
        return None
    if isinstance(data, dict):
        data = {k: v for k, v in data.items() if not callable(v)}
    return json.dumps(data, default=_serial)


def log_action(conn, table_name: str, record_id: int, action: str,
               user_id: int, old_data=None, new_data=None, reason: str = None,
               source: str = 'web'):
    execute("""
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, reason, user_id, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        table_name, record_id, action,
        _dumps(old_data),
        _dumps(new_data),
        reason, user_id, source
    ), conn=conn)
