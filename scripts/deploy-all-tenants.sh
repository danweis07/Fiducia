#!/usr/bin/env bash
# =============================================================================
# Deploy to All Tenant Projects
#
# Applies pending database migrations and deploys edge functions to every
# active tenant project registered in the control plane.
#
# Usage:
#   ./scripts/deploy-all-tenants.sh                    # Full deploy
#   ./scripts/deploy-all-tenants.sh --migrations-only  # Migrations only
#   ./scripts/deploy-all-tenants.sh --functions-only   # Functions only
#   ./scripts/deploy-all-tenants.sh --dry-run          # Preview only
#   ./scripts/deploy-all-tenants.sh --target <ref>     # Single tenant
#
# Required env vars:
#   SUPABASE_ACCESS_TOKEN         — Management API token
#   CONTROL_PLANE_URL             — Control plane Supabase URL
#   CONTROL_PLANE_SERVICE_KEY     — Control plane service role key
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
MIGRATIONS=true
FUNCTIONS=true
DRY_RUN=false
TARGET=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --migrations-only) FUNCTIONS=false; shift ;;
    --functions-only) MIGRATIONS=false; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate env
for var in SUPABASE_ACCESS_TOKEN CONTROL_PLANE_URL CONTROL_PLANE_SERVICE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}Error: $var is not set${NC}"
    exit 1
  fi
done

PLATFORM_VERSION=$(cat PLATFORM_VERSION | tr -d '[:space:]')
echo "========================================"
echo "  Cross-Tenant Deployment"
echo "  Platform Version: $PLATFORM_VERSION"
echo "  Migrations: $MIGRATIONS | Functions: $FUNCTIONS"
if [ "$DRY_RUN" = true ]; then echo "  MODE: DRY RUN"; fi
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Fetch tenant list
# ---------------------------------------------------------------------------

if [ -n "$TARGET" ]; then
  TENANTS=$(echo "[{\"project_ref\":\"$TARGET\",\"tenant_name\":\"manual\"}]")
else
  TENANTS=$(curl -s \
    -H "apikey: $CONTROL_PLANE_SERVICE_KEY" \
    -H "Authorization: Bearer $CONTROL_PLANE_SERVICE_KEY" \
    "$CONTROL_PLANE_URL/rest/v1/tenant_registry?status=eq.active&select=project_ref,tenant_name")
fi

TENANT_COUNT=$(echo "$TENANTS" | jq length)
echo "Found $TENANT_COUNT active tenant(s)"
echo ""

FAILED=0
SUCCEEDED=0

# ---------------------------------------------------------------------------
# Deploy to each tenant
# ---------------------------------------------------------------------------

for i in $(seq 0 $((TENANT_COUNT - 1))); do
  REF=$(echo "$TENANTS" | jq -r ".[$i].project_ref")
  NAME=$(echo "$TENANTS" | jq -r ".[$i].tenant_name")

  echo -e "${YELLOW}--- $NAME ($REF) ---${NC}"

  # Migrations
  if [ "$MIGRATIONS" = true ]; then
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY RUN] Would run: supabase db push --project-ref $REF"
    else
      echo "  Applying migrations..."
      if npx supabase db push --project-ref "$REF" 2>&1; then
        echo -e "  ${GREEN}Migrations applied${NC}"
      else
        echo -e "  ${RED}Migration FAILED${NC}"
        FAILED=$((FAILED + 1))
        continue
      fi
    fi
  fi

  # Functions
  if [ "$FUNCTIONS" = true ]; then
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY RUN] Would run: supabase functions deploy --project-ref $REF"
    else
      echo "  Deploying functions..."
      if npx supabase functions deploy --project-ref "$REF" 2>&1; then
        echo -e "  ${GREEN}Functions deployed${NC}"
      else
        echo -e "  ${RED}Function deploy FAILED${NC}"
        FAILED=$((FAILED + 1))
        continue
      fi
    fi
  fi

  # Update control plane version tracking
  if [ "$DRY_RUN" = false ] && [ -n "${CONTROL_PLANE_URL:-}" ]; then
    NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    PATCH_DATA="{\"last_deployed_at\": \"$NOW\""
    if [ "$MIGRATIONS" = true ]; then
      PATCH_DATA="$PATCH_DATA, \"last_migration_version\": \"$PLATFORM_VERSION\", \"last_migrated_at\": \"$NOW\""
    fi
    if [ "$FUNCTIONS" = true ]; then
      PATCH_DATA="$PATCH_DATA, \"last_functions_version\": \"$PLATFORM_VERSION\""
    fi
    PATCH_DATA="$PATCH_DATA}"

    curl -s -X PATCH \
      -H "apikey: $CONTROL_PLANE_SERVICE_KEY" \
      -H "Authorization: Bearer $CONTROL_PLANE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "$PATCH_DATA" \
      "$CONTROL_PLANE_URL/rest/v1/tenant_registry?project_ref=eq.$REF" > /dev/null
  fi

  SUCCEEDED=$((SUCCEEDED + 1))
  echo ""
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo "========================================"
echo "  Results"
echo "  Succeeded: $SUCCEEDED / $TENANT_COUNT"
if [ $FAILED -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAILED${NC}"
  echo "========================================"
  exit 1
else
  echo -e "  ${GREEN}All deployments successful${NC}"
  echo "========================================"
fi
