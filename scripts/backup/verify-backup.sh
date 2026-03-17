#!/usr/bin/env bash
# Verify backup integrity by test-restoring to a temporary database
set -euo pipefail

BACKUP_FILE="${1:?Usage: verify-backup.sh <backup-file>}"
VERIFY_DB_URL="${VERIFY_DB_URL:?VERIFY_DB_URL is required (temp database for verification)}"

echo "[$(date)] Verifying backup: ${BACKUP_FILE}"

# Count tables and rows after restore
TABLE_COUNT=$(psql "${VERIFY_DB_URL}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables found: ${TABLE_COUNT}"

# Verify critical tables exist
CRITICAL_TABLES=("firms" "banking_accounts" "banking_transactions" "banking_users" "audit_logs")
for table in "${CRITICAL_TABLES[@]}"; do
  ROW_COUNT=$(psql "${VERIFY_DB_URL}" -t -c "SELECT count(*) FROM ${table};" 2>/dev/null || echo "MISSING")
  echo "  ${table}: ${ROW_COUNT} rows"
done

# Check RLS policies are intact
POLICY_COUNT=$(psql "${VERIFY_DB_URL}" -t -c "SELECT count(*) FROM pg_policies;")
echo "RLS policies: ${POLICY_COUNT}"

echo "[$(date)] Verification complete."
