import json
from ..database import execute


def log_action(conn, table_name: str, record_id: int, action: str,
               user_id: int, old_data=None, new_data=None, reason: str = None):
    execute("""
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, reason, user_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        table_name, record_id, action,
        json.dumps(old_data) if old_data else None,
        json.dumps(new_data) if new_data else None,
        reason, user_id
    ), conn=conn)
