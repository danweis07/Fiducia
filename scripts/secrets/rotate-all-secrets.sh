#!/usr/bin/env bash
# Rotate all integration secrets with zero-downtime approach
set -euo pipefail

SECRETS_SCRIPT="$(dirname "$0")/secrets-manager.sh"

echo "[$(date)] Starting secret rotation..."

# Define all secrets that should be rotated
SECRETS_TO_ROTATE=(
  "SUPABASE_SERVICE_KEY"
  "FINERACT_API_KEY"
  "PLAID_SECRET"
  "MITEK_API_KEY"
  "FISERV_API_KEY"
  "MX_API_KEY"
  "ALLOY_API_KEY"
  "SENTRY_DSN"
)

for secret in "${SECRETS_TO_ROTATE[@]}"; do
  echo "  Rotating: ${secret}"
  ${SECRETS_SCRIPT} rotate "${secret}"
done

echo "[$(date)] All secrets rotated. Restart services to pick up new values."
echo ""
echo "Next steps:"
echo "  1. Deploy updated secrets to edge functions"
echo "  2. Restart affected services"
echo "  3. Verify integration health: curl /functions/v1/gateway -d '{\"action\":\"system.health\"}'"
