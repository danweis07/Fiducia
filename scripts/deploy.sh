#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Deploy the Digital Banking Platform to any supported cloud
# =============================================================================
#
# Usage:
#   ./scripts/deploy.sh <provider> [options]
#
# Providers:
#   gcp       Deploy to GCP Cloud Run (requires gcloud + Docker)
#   aws       Deploy to AWS S3 + CloudFront (requires aws CLI)
#   azure     Deploy to Azure Static Web Apps (requires az CLI)
#   docker    Build and run the Docker image locally
#
# Examples:
#   ./scripts/deploy.sh gcp --project my-gcp-project --region us-central1
#   ./scripts/deploy.sh aws --bucket my-bucket --distribution-id EXYZ123
#   ./scripts/deploy.sh azure --token <deployment-token>
#   ./scripts/deploy.sh docker --port 8080
#
# Environment variables (set these or pass via .env.local):
#   VITE_SUPABASE_URL       — Your Supabase project URL
#   VITE_SUPABASE_ANON_KEY  — Your Supabase anon key
#
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn ]${NC} $*"; }
err()   { echo -e "${RED}[error ]${NC} $*" >&2; }

usage() {
  sed -n '/^# Usage:/,/^# ====/{ /^# ====/d; s/^# //; s/^#//; p }' "$0"
  exit 1
}

# Load .env.local if present
if [[ -f .env.local ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "Required command not found: $1"
    err "Install it and try again."
    exit 1
  fi
}

build_frontend() {
  log "Installing dependencies..."
  npm ci --silent

  log "Building frontend..."
  npm run build

  ok "Frontend built successfully (dist/)"
}

# ---------------------------------------------------------------------------
# GCP Cloud Run
# ---------------------------------------------------------------------------
deploy_gcp() {
  local project="${GCP_PROJECT_ID:-}"
  local region="${GCP_REGION:-us-central1}"
  local service="open-banking-platform"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project)  project="$2"; shift 2 ;;
      --region)   region="$2"; shift 2 ;;
      --service)  service="$2"; shift 2 ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  [[ -z "$project" ]] && { err "--project or GCP_PROJECT_ID required"; exit 1; }

  require_cmd gcloud
  require_cmd docker

  local image="gcr.io/${project}/${service}:$(git rev-parse --short HEAD)"

  log "Building Docker image: $image"
  docker build \
    --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
    --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}" \
    --build-arg VITE_DEMO_MODE=false \
    -t "$image" .

  log "Pushing image to GCR..."
  docker push "$image"

  log "Deploying to Cloud Run ($region)..."
  gcloud run deploy "$service" \
    --image "$image" \
    --region "$region" \
    --project "$project" \
    --platform managed \
    --allow-unauthenticated

  local url
  url=$(gcloud run services describe "$service" --region "$region" --project "$project" --format='value(status.url)')
  ok "Deployed to Cloud Run: $url"
}

# ---------------------------------------------------------------------------
# AWS S3 + CloudFront
# ---------------------------------------------------------------------------
deploy_aws() {
  local bucket="${AWS_S3_BUCKET:-}"
  local distribution="${AWS_CLOUDFRONT_DISTRIBUTION_ID:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --bucket)           bucket="$2"; shift 2 ;;
      --distribution-id)  distribution="$2"; shift 2 ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  [[ -z "$bucket" ]] && { err "--bucket or AWS_S3_BUCKET required"; exit 1; }

  require_cmd aws

  build_frontend

  log "Uploading to S3 (s3://${bucket})..."
  aws s3 sync dist/ "s3://${bucket}" --delete

  if [[ -n "$distribution" ]]; then
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
      --distribution-id "$distribution" \
      --paths "/*" > /dev/null
    ok "CloudFront cache invalidated"
  else
    warn "No CloudFront distribution ID provided — skipping cache invalidation"
  fi

  ok "Deployed to AWS S3: s3://${bucket}"
}

# ---------------------------------------------------------------------------
# Azure Static Web Apps
# ---------------------------------------------------------------------------
deploy_azure() {
  local token="${AZURE_STATIC_WEB_APPS_API_TOKEN:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --token) token="$2"; shift 2 ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  [[ -z "$token" ]] && { err "--token or AZURE_STATIC_WEB_APPS_API_TOKEN required"; exit 1; }

  require_cmd npx

  build_frontend

  log "Deploying to Azure Static Web Apps..."
  npx --yes @azure/static-web-apps-cli deploy \
    --app-location dist \
    --deployment-token "$token"

  ok "Deployed to Azure Static Web Apps"
}

# ---------------------------------------------------------------------------
# Local Docker
# ---------------------------------------------------------------------------
deploy_docker() {
  local port=8080
  local name="banking-platform"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --port) port="$2"; shift 2 ;;
      --name) name="$2"; shift 2 ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  require_cmd docker

  log "Building Docker image: $name"
  docker build \
    --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
    --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}" \
    --build-arg VITE_DEMO_MODE="${VITE_DEMO_MODE:-true}" \
    -t "$name" .

  # Stop existing container if running
  docker rm -f "$name" 2>/dev/null || true

  log "Starting container on port $port..."
  docker run -d --name "$name" -p "${port}:8080" "$name"

  ok "Running at http://localhost:${port}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
[[ $# -lt 1 ]] && usage

provider="$1"; shift

case "$provider" in
  gcp)    deploy_gcp "$@" ;;
  aws)    deploy_aws "$@" ;;
  azure)  deploy_azure "$@" ;;
  docker) deploy_docker "$@" ;;
  -h|--help) usage ;;
  *)
    err "Unknown provider: $provider"
    echo "Supported: gcp, aws, azure, docker"
    exit 1
    ;;
esac
