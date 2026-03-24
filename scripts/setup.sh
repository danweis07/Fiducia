#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Open Banking Platform — One-Command Setup
#
# Usage: ./scripts/setup.sh [--demo] [--docker] [--full]
#   --demo    Quick start in demo mode (default, no backend needed)
#   --docker  Start with Docker Compose (includes local Supabase)
#   --full    Full setup with Supabase CLI
# =============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

MODE="${1:---demo}"

echo -e "${BOLD}${BLUE}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     Open Banking Platform Setup      ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Check prerequisites
check_prereqs() {
    echo -e "${BOLD}Checking prerequisites...${NC}"

    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required. Install from https://nodejs.org (v18+)"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js 18+ required. Current: $(node -v)"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"

    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required."
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} npm $(npm -v)"

    if [ "$MODE" = "--docker" ]; then
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is required for --docker mode."
            exit 1
        fi
        echo -e "  ${GREEN}✓${NC} Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi
}

# Install dependencies
install_deps() {
    echo ""
    echo -e "${BOLD}Installing dependencies...${NC}"
    npm install
    echo -e "  ${GREEN}✓${NC} Dependencies installed"
}

# Setup environment
setup_env() {
    if [ ! -f .env.local ]; then
        cp .env.example .env.local
        # Enable demo mode by default
        tmp="$(mktemp)"
        sed 's/VITE_DEMO_MODE=false/VITE_DEMO_MODE=true/' .env.local > "$tmp" && mv "$tmp" .env.local
        echo -e "  ${GREEN}✓${NC} Created .env.local (demo mode enabled)"
    else
        echo -e "  ${YELLOW}→${NC} .env.local already exists, skipping"
    fi
}

# Verify build
verify_build() {
    echo ""
    echo -e "${BOLD}Verifying build...${NC}"
    npm run build > /dev/null 2>&1
    echo -e "  ${GREEN}✓${NC} Production build successful"
}

# Start in demo mode
start_demo() {
    echo ""
    echo -e "${GREEN}${BOLD}✅ Setup complete!${NC}"
    echo ""
    echo -e "  Start the dev server:  ${BOLD}npm run dev${NC}"
    echo -e "  Run tests:             ${BOLD}npm test${NC}"
    echo -e "  Production build:      ${BOLD}npm run build${NC}"
    echo ""
    echo -e "  ${BLUE}Demo mode is enabled — no backend needed.${NC}"
    echo -e "  Open ${BOLD}http://localhost:8080${NC} to explore."
    echo ""
}

# Start with Docker
start_docker() {
    echo ""
    echo -e "${BOLD}Starting Docker services (full stack)...${NC}"
    echo -e "  Building React app, Supabase, and Core Simulator..."
    docker compose up -d --build
    echo ""
    echo -e "${GREEN}${BOLD}✅ Zero-to-Banking stack is running!${NC}"
    echo ""
    echo -e "  ${BOLD}Services:${NC}"
    echo -e "  Web app:            ${BOLD}http://localhost:8080${NC}"
    echo -e "  Supabase Studio:    ${BOLD}http://localhost:54323${NC}"
    echo -e "  Supabase API:       ${BOLD}http://localhost:54321${NC}"
    echo -e "  Core Simulator:     ${BOLD}http://localhost:9090${NC}"
    echo -e "  Simulator Health:   ${BOLD}http://localhost:9090/health${NC}"
    echo ""
    echo -e "  ${BOLD}Demo credentials:${NC}"
    echo -e "  Email:     demo@fiducia.dev"
    echo -e "  Password:  demo1234"
    echo ""
    echo -e "  ${BOLD}Core Simulator endpoints:${NC}"
    echo -e "  CU*Answers: http://localhost:9090/api/credit_unions/"
    echo -e "  SymXchange: http://localhost:9090/symxchange/"
    echo -e "  Fineract:   http://localhost:9090/fineract-provider/"
    echo ""
    echo -e "  ${YELLOW}Inject errors for resilience testing:${NC}"
    echo -e "  curl -X POST http://localhost:9090/admin/config \\"
    echo -e "    -H 'Content-Type: application/json' \\"
    echo -e "    -d '{\"latencyMs\": 500, \"coreBusyRate\": 0.3}'"
    echo ""
    echo -e "  Stop:   ${BOLD}docker compose down${NC}"
    echo -e "  Reset:  ${BOLD}docker compose down -v${NC}"
    echo ""
}

# Main
check_prereqs
install_deps
setup_env

case "$MODE" in
    --demo)
        verify_build
        start_demo
        ;;
    --docker)
        start_docker
        ;;
    --full)
        verify_build
        echo ""
        echo -e "${YELLOW}For full Supabase setup, follow the docs in README.md${NC}"
        start_demo
        ;;
    *)
        echo "Usage: ./scripts/setup.sh [--demo|--docker|--full]"
        exit 1
        ;;
esac
