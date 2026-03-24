#!/bin/bash
# Create the v1.1.0 release on GitHub
# Run this locally where you have gh CLI authenticated:
#   chmod +x scripts/create-v1.1.0-release.sh && ./scripts/create-v1.1.0-release.sh

set -euo pipefail

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI is required. Install from https://cli.github.com/"
  exit 1
fi

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

echo "✓ v1.1.0 release created successfully"
