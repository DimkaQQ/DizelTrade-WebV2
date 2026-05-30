#!/usr/bin/env bash
# DTL PostgreSQL backup: pg_dump → gzip → optional AES-256 encryption
# Usage:
#   ./backup.sh                    — plain gzip to BACKUP_DIR
#   BACKUP_ENCRYPT=1 ./backup.sh   — gzip + AES-256 (requires BACKUP_KEY env var)
#
# Cron example (daily at 03:00, keep 30 days):
#   0 3 * * * /home/dtl/app/scripts/backup.sh >> /var/log/dtl_backup.log 2>&1
#
# Required env vars (or set defaults below):
#   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
#   BACKUP_DIR    — where to store backups (default: /var/backups/dtl)
#   BACKUP_KEEP   — how many days to keep (default: 30)
#   BACKUP_ENCRYPT — set to "1" to encrypt; also requires BACKUP_KEY
#   BACKUP_KEY    — passphrase for AES-256 encryption

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-dtl}"
PGUSER="${PGUSER:-dtl}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dtl}"
BACKUP_KEEP="${BACKUP_KEEP:-30}"
BACKUP_ENCRYPT="${BACKUP_ENCRYPT:-0}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="dtl_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup of $PGDATABASE → $BACKUP_DIR/$FILENAME"

PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip -9 > "$BACKUP_DIR/$FILENAME"

if [[ "$BACKUP_ENCRYPT" == "1" ]]; then
    if [[ -z "${BACKUP_KEY:-}" ]]; then
        echo "ERROR: BACKUP_KEY is not set but BACKUP_ENCRYPT=1" >&2
        exit 1
    fi
    ENC_FILE="${BACKUP_DIR}/${FILENAME}.enc"
    openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
        -pass "pass:${BACKUP_KEY}" \
        -in "$BACKUP_DIR/$FILENAME" \
        -out "$ENC_FILE"
    rm "$BACKUP_DIR/$FILENAME"
    FILENAME="${FILENAME}.enc"
    echo "Encrypted → $ENC_FILE"
fi

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: $FILENAME ($SIZE)"

# Rotate old backups
find "$BACKUP_DIR" -maxdepth 1 \( -name "dtl_*.sql.gz" -o -name "dtl_*.sql.gz.enc" \) \
    -mtime "+${BACKUP_KEEP}" -delete
echo "Rotation done (kept last $BACKUP_KEEP days)"
