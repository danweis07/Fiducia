#!/usr/bin/env bash
# Database restore script
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-database.sh <backup-file>}"
SUPABASE_DB_URL="${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/banking-platform/backup-key}"
TEMP_DIR=$(mktemp -d)

echo "[$(date)] Starting database restore from: ${BACKUP_FILE}"

# Decrypt if encrypted
RESTORE_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.enc ]]; then
  if [[ ! -f "${ENCRYPTION_KEY_FILE}" ]]; then
    echo "[ERROR] Encrypted backup requires ENCRYPTION_KEY_FILE"
    exit 1
  fi
  echo "[$(date)] Decrypting backup..."
  RESTORE_FILE="${TEMP_DIR}/decrypted.sql.gz"
  openssl enc -aes-256-cbc -d \
    -in "${BACKUP_FILE}" \
    -out "${RESTORE_FILE}" \
    -pass "file:${ENCRYPTION_KEY_FILE}"
fi

# Decompress if needed
if [[ "${RESTORE_FILE}" == *.gz ]]; then
  echo "[$(date)] Decompressing..."
  gunzip -k "${RESTORE_FILE}"
  RESTORE_FILE="${RESTORE_FILE%.gz}"
fi

# Confirm before restore
echo ""
echo "WARNING: This will overwrite the current database."
echo "Target: ${SUPABASE_DB_URL}"
echo "Source: ${BACKUP_FILE}"
echo ""
read -p "Type 'RESTORE' to confirm: " CONFIRM
if [[ "${CONFIRM}" != "RESTORE" ]]; then
  echo "Aborted."
  rm -rf "${TEMP_DIR}"
  exit 0
fi

# Restore
echo "[$(date)] Restoring database..."
if [[ "${RESTORE_FILE}" == *.custom ]]; then
  pg_restore --dbname="${SUPABASE_DB_URL}" \
    --clean --if-exists \
    --no-owner --no-privileges \
    "${RESTORE_FILE}"
else
  psql "${SUPABASE_DB_URL}" < "${RESTORE_FILE}"
fi

# Cleanup
rm -rf "${TEMP_DIR}"

echo "[$(date)] Restore complete. Verify data integrity manually."
