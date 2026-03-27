#!/usr/bin/env bash
#
# Single-Tenant Setup Script
#
# One-command setup for credit unions and community banks deploying Fiducia
# as a self-hosted, single-tenant installation. No Supabase Management API
# or control plane required.
#
# Usage:
#   ./scripts/single-tenant-setup.sh \
#     --name "Arizona Federal Credit Union" \
#     --admin-email "admin@azfcu.org" \
#     --template us-credit-union
#
# Templates: us-credit-union, us-community-bank, uk-digital-bank, eu-neobank
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="us-credit-union"
NAME=""
ADMIN_EMAIL=""
START_DEV=false
SKIP_DOCKER=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)       NAME="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --template)   TEMPLATE="$2"; shift 2 ;;
    --start-dev)  START_DEV=true; shift ;;
    --skip-docker) SKIP_DOCKER=true; shift ;;
    -h|--help)
      echo "Usage: $0 --name <name> --admin-email <email> [options]"
      echo ""
      echo "Options:"
      echo "  --name          Institution name (required)"
      echo "  --admin-email   Admin email address (required)"
      echo "  --template      Template: us-credit-union, us-community-bank, uk-digital-bank, eu-neobank"
      echo "  --start-dev     Start dev server after setup"
      echo "  --skip-docker   Skip Docker Compose (assumes services already running)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$NAME" || -z "$ADMIN_EMAIL" ]]; then
  echo "Error: --name and --admin-email are required"
  echo "Run with --help for usage"
  exit 1
fi

echo ""
echo "  Fiducia Single-Tenant Setup"
echo "  ================================================"
echo "  Institution: $NAME"
echo "  Admin:       $ADMIN_EMAIL"
echo "  Template:    $TEMPLATE"
echo ""

echo "  Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "  Error: Node.js is required (v20+)"; exit 1; }
echo "  [OK] Node.js $(node -v)"

if [[ "$SKIP_DOCKER" == "false" ]]; then
  command -v docker >/dev/null 2>&1 || { echo "  Error: Docker is required"; exit 1; }
  echo "  [OK] Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi

echo ""
echo "  Installing dependencies..."
cd "$ROOT_DIR"
if [[ ! -d "node_modules" ]]; then
  npm ci --quiet 2>/dev/null || npm install --quiet
fi
echo "  [OK] Dependencies installed"

if [[ "$SKIP_DOCKER" == "false" ]]; then
  echo ""
  echo "  Starting Docker services..."
  docker compose -f docker-compose.yml -f docker/docker-compose.single-tenant.yml up -d \
    supabase-db supabase-api core-sim 2>/dev/null

  echo "  Waiting for services..."
  for i in {1..30}; do
    if docker compose exec -T supabase-db pg_isready -U postgres >/dev/null 2>&1; then break; fi
    sleep 2
  done
  echo "  [OK] PostgreSQL ready"

  for i in {1..30}; do
    if curl -sf http://localhost:54321/rest/v1/ >/dev/null 2>&1; then break; fi
    sleep 2
  done
  echo "  [OK] Supabase API ready"

  for i in {1..15}; do
    if curl -sf http://localhost:9090/health >/dev/null 2>&1; then break; fi
    sleep 2
  done
  echo "  [OK] Core Simulator ready"
fi

echo ""
echo "  Provisioning institution..."
TENANT_SLUG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

npx tsx scripts/provision-self-hosted.ts \
  --name "$NAME" \
  --admin-email "$ADMIN_EMAIL" \
  --template "$TEMPLATE" 2>&1 | sed 's/^/  /'

echo "  [OK] Institution provisioned"

ENV_FILE="$ROOT_DIR/apps/web/.env.local"
cat > "$ENV_FILE" <<EOF
# Fiducia Single-Tenant Configuration
# Generated on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
VITE_SINGLE_TENANT=true
VITE_TENANT_ID=${TENANT_SLUG}
VITE_TENANT_NAME=${NAME}
VITE_SUBSCRIPTION_TIER=enterprise
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_d7dUwOZth-HhWG0M3GOwSSswgkzmFV8nGgBxqY0
VITE_CORE_SIM_URL=http://localhost:9090
VITE_FEATURES=rdc,billPay,p2p,cardControls,externalTransfers,wires,mobileDeposit,directDeposit
EOF
echo "  [OK] Generated $ENV_FILE"

echo ""
echo "  ================================================"
echo "  Setup Complete!"
echo "  ================================================"
echo ""
echo "  Institution: $NAME"
echo "  Admin login: $ADMIN_EMAIL"
echo "  Demo login:  demo@fiducia.dev / demo1234"
echo ""
echo "  Start: npm run dev  (http://localhost:8080)"
echo "  Admin: http://localhost:8080/admin"
echo ""

if [[ "$START_DEV" == "true" ]]; then
  echo "  Starting dev server..."
  npm run dev
fi
