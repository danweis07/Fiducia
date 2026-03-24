#!/bin/bash
# Create GitHub Releases for v1.0.1 and v1.1.0
# Run this locally where you have gh CLI authenticated:
#   chmod +x scripts/create-releases.sh && ./scripts/create-releases.sh

set -euo pipefail

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI is required. Install from https://cli.github.com/"
  exit 1
fi

echo "Creating v1.0.1 release..."
gh release create v1.0.1 \
  --target 8ef6021 \
  --title "v1.0.1 — Testing & Reliability" \
  --notes "$(cat <<'EOF'
## Testing & Reliability

- 3,700+ tests across unit, integration, and E2E
- Circuit breaker, throttle, and cache infrastructure fully tested
- Backend provider abstraction (Supabase, Ably, Kafka) fully tested
- Coverage thresholds raised to 50%/40%
- Fixed Zod v4 compatibility bug in password reset flow
EOF
)"

echo "v1.0.1 release created"

echo ""
echo "Creating v1.1.0 release..."
gh release create v1.1.0 \
  --target a4be7e4 \
  --title "v1.1.0 — Security, Monorepo & Vendor Integrations" \
  --notes "$(cat <<'EOF'
## Security
- Fix high severity XSS: sanitize logoUrl before use in img src
- Resolve 22 CodeQL security alerts (critical, high, medium)
- Fix command injection vulnerability

## Features
- Add Algolia search, Storyblok CMS, and Neo4j fraud graph adapters

## Infrastructure
- Restructure as monorepo with npm workspaces (`apps/web/`)
- Restore .devcontainer for one-click Codespaces setup
- Make security scan workflows advisory to prevent red checks

## Developer Experience
- Add quickstart demo, scaffold generator, and recipe scripts
- Add changelog and contributing docs
- Clean up repo structure, remove translated root files

## Dependencies
- Bump flatted 3.4.1 → 3.4.2
EOF
)"

echo "v1.1.0 release created"
echo ""
echo "Done! Both releases created successfully."
