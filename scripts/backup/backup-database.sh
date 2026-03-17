#!/usr/bin/env bash
# Database backup script for Supabase PostgreSQL
# Supports full and incremental backups with encryption and rotation.
set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/banking-platform}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/banking-platform/backup-key}"
SUPABASE_DB_URL="${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting database backup..."

# Full PostgreSQL dump with compression
pg_dump "${SUPABASE_DB_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --exclude-table-data='audit_logs' \
  --file="${BACKUP_FILE}.custom"

# Also create a plain SQL backup for portability
pg_dump "${SUPABASE_DB_URL}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_FILE}"

# Encrypt if key file exists
if [[ -f "${ENCRYPTION_KEY_FILE}" ]]; then
  echo "[$(date)] Encrypting backup..."
  openssl enc -aes-256-cbc -salt \
    -in "${BACKUP_FILE}" \
    -out "${BACKUP_FILE}.enc" \
    -pass "file:${ENCRYPTION_KEY_FILE}"
  rm "${BACKUP_FILE}"
  BACKUP_FILE="${BACKUP_FILE}.enc"

  openssl enc -aes-256-cbc -salt \
    -in "${BACKUP_FILE%.gz.enc}.custom" \
    -out "${BACKUP_FILE%.gz.enc}.custom.enc" \
    -pass "file:${ENCRYPTION_KEY_FILE}"
  rm "${BACKUP_FILE%.gz.enc}.custom"
fi

# Upload to cloud storage (S3-compatible)
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[$(date)] Uploading to S3: ${BACKUP_S3_BUCKET}..."
  aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/database/${TIMESTAMP}/" \
    --storage-class STANDARD_IA
  echo "[$(date)] Upload complete."
fi

# Rotate old backups
echo "[$(date)] Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "backup_*.sql*" -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -name "backup_*.custom*" -mtime "+${RETENTION_DAYS}" -delete

# Verify backup integrity
echo "[$(date)] Verifying backup integrity..."
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
if [[ "${BACKUP_SIZE}" -lt 1024 ]]; then
  echo "[ERROR] Backup file suspiciously small (${BACKUP_SIZE} bytes). Verify manually."
  exit 1
fi

echo "[$(date)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"

# Log backup metadata
cat >> "${BACKUP_DIR}/backup-log.json" <<EOF
{"timestamp":"${TIMESTAMP}","file":"${BACKUP_FILE}","size_bytes":${BACKUP_SIZE},"retention_days":${RETENTION_DAYS}}
EOF
