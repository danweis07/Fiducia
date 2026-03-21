#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# generate-app.sh — Scaffold a functional mini-app in under 5 minutes
#
# Usage:
#   ./scripts/generate-app.sh <template> [page-name]
#
# Templates:
#   account-dashboard   Account balances + transaction feed
#   payment-form        Bill pay / transfer form
#   card-manager        Card list with lock/unlock controls
#   loan-calculator     Loan product browser with payment calculator
#   spending-dashboard  Spending breakdown + insights
#   custom              Blank page wired to demo data (good starting point)
#
# Examples:
#   ./scripts/generate-app.sh account-dashboard
#   ./scripts/generate-app.sh payment-form MyPayments
#   ./scripts/generate-app.sh custom MyCoolFeature
# =============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES_DIR="$ROOT_DIR/scripts/templates"
PAGES_DIR="$ROOT_DIR/src/pages"
ROUTES_FILE="$ROOT_DIR/src/routes/bankingRoutes.tsx"

TEMPLATES=(
  "account-dashboard"
  "payment-form"
  "card-manager"
  "loan-calculator"
  "spending-dashboard"
  "custom"
)

usage() {
  echo -e "${BOLD}${BLUE}Fiducia App Generator${NC}"
  echo ""
  echo "Usage: $0 <template> [PageName]"
  echo ""
  echo "Templates:"
  for t in "${TEMPLATES[@]}"; do
    echo "  $t"
  done
  echo ""
  echo "Examples:"
  echo "  $0 account-dashboard"
  echo "  $0 payment-form MyPayments"
  echo "  $0 custom MyCoolFeature"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

TEMPLATE="$1"

# Validate template
VALID=false
for t in "${TEMPLATES[@]}"; do
  if [ "$t" = "$TEMPLATE" ]; then
    VALID=true
    break
  fi
done

if [ "$VALID" = false ]; then
  echo -e "${RED}Unknown template: $TEMPLATE${NC}"
  echo ""
  usage
fi

# Derive page name from template or user argument
if [ $# -ge 2 ]; then
  PAGE_NAME="$2"
else
  # Convert kebab-case to PascalCase
  PAGE_NAME=$(echo "$TEMPLATE" | sed -E 's/(^|-)([a-z])/\U\2/g')
fi

# Derive route path from page name (PascalCase → kebab-case)
ROUTE_PATH=$(echo "$PAGE_NAME" | sed -E 's/([A-Z])/-\L\1/g' | sed 's/^-//')

TEMPLATE_FILE="$TEMPLATES_DIR/${TEMPLATE}.tsx"
TARGET_FILE="$PAGES_DIR/${PAGE_NAME}.tsx"

echo -e "${BOLD}${BLUE}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║      Fiducia App Generator           ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check if page already exists
if [ -f "$TARGET_FILE" ]; then
  echo -e "${YELLOW}Warning: $TARGET_FILE already exists.${NC}"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# 1. Copy template
echo -e "  ${GREEN}✓${NC} Copying template: ${TEMPLATE}"
sed "s/__PAGE_NAME__/${PAGE_NAME}/g" "$TEMPLATE_FILE" > "$TARGET_FILE"

# 2. Register route (if not already registered)
if grep -q "/${ROUTE_PATH}" "$ROUTES_FILE" 2>/dev/null; then
  echo -e "  ${YELLOW}⚠${NC} Route /${ROUTE_PATH} already exists in bankingRoutes.tsx — skipping"
else
  echo -e "  ${GREEN}✓${NC} Registering route: /${ROUTE_PATH}"

  # Add lazy import before the function declaration
  IMPORT_LINE="const ${PAGE_NAME} = lazy(() => import('@/pages/${PAGE_NAME}'));"
  sed -i "/^function eb/i\\${IMPORT_LINE}" "$ROUTES_FILE"

  # Add route before the closing fragment tag
  ROUTE_LINE="      <Route path=\"/${ROUTE_PATH}\" element={eb(${PAGE_NAME})} />"
  sed -i "/^    <\/>/i\\${ROUTE_LINE}" "$ROUTES_FILE"
fi

# 3. Ensure demo mode is enabled
ENV_FILE="$ROOT_DIR/.env.local"
if [ -f "$ENV_FILE" ] && grep -q "VITE_DEMO_MODE=true" "$ENV_FILE"; then
  echo -e "  ${GREEN}✓${NC} Demo mode already enabled"
else
  echo -e "  ${GREEN}✓${NC} Enabling demo mode in .env.local"
  if [ -f "$ENV_FILE" ]; then
    if grep -q "VITE_DEMO_MODE" "$ENV_FILE"; then
      sed -i 's/VITE_DEMO_MODE=.*/VITE_DEMO_MODE=true/' "$ENV_FILE"
    else
      echo "VITE_DEMO_MODE=true" >> "$ENV_FILE"
    fi
  else
    echo "VITE_DEMO_MODE=true" > "$ENV_FILE"
  fi
fi

echo ""
echo -e "${BOLD}${GREEN}Done!${NC} Your mini-app is ready:"
echo ""
echo -e "  Page:  ${BOLD}src/pages/${PAGE_NAME}.tsx${NC}"
echo -e "  Route: ${BOLD}/${ROUTE_PATH}${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. ${BOLD}npm run dev${NC}"
echo -e "  2. Open ${BOLD}http://localhost:8080/${ROUTE_PATH}?demo=true${NC}"
echo -e "  3. Edit ${BOLD}src/pages/${PAGE_NAME}.tsx${NC} — HMR updates instantly"
echo ""
echo -e "  Tip: Run ${BOLD}npx tsx scripts/recipes/list-all-actions.ts${NC}"
echo -e "       to see all available gateway actions for your page."
