#!/usr/bin/env bash
# Creates GitHub issues for the first batch of contributor tasks.
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/create-github-issues.sh
# Or:    GH_TOKEN=ghp_xxx gh auth login && ./scripts/create-github-issues.sh

set -euo pipefail

REPO="danweis07/Fiducia"
API="https://api.github.com"

if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH="Authorization: Bearer $GITHUB_TOKEN"
elif command -v gh &>/dev/null && gh auth status &>/dev/null; then
  GITHUB_TOKEN=$(gh auth token)
  AUTH="Authorization: Bearer $GITHUB_TOKEN"
else
  echo "Error: Set GITHUB_TOKEN or authenticate with 'gh auth login'" >&2
  exit 1
fi

create_label() {
  local name="$1" color="$2" desc="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/repos/$REPO/labels" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$desc\"}")
  if [ "$status" = "201" ]; then echo "  Created label: $name"
  elif [ "$status" = "422" ]; then echo "  Label exists: $name"
  else echo "  Label error ($status): $name"; fi
}

create_issue() {
  local title="$1" labels="$2" body_file="$3"
  local body
  body=$(cat "$body_file")
  local result
  result=$(curl -s -X POST "$API/repos/$REPO/issues" \
    -H "$AUTH" -H "Content-Type: application/json" \
    --data-binary @- <<PAYLOAD
{
  "title": $(echo "$title" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))'),
  "labels": $labels,
  "body": $(echo "$body" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
}
PAYLOAD
  )
  local num
  num=$(echo "$result" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("number","ERROR"))' 2>/dev/null || echo "ERROR")
  if [ "$num" != "ERROR" ]; then echo "  Created issue #$num: $title"
  else echo "  Failed: $title - $(echo "$result" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("message","unknown"))' 2>/dev/null)"; fi
}

echo "=== Creating Labels ==="
create_label "region: uk"     "1D76DB" "United Kingdom regional feature"
create_label "region: brazil" "009B3A" "Brazil regional feature"
create_label "region: mexico" "CE1126" "Mexico regional feature"

echo ""
echo "=== Creating Issues ==="

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Issue 1
cat > "$TMPDIR/1.md" << 'BODY'
## Description

The gateway action handlers in `src/lib/gateway/` are currently undocumented. Each handler file needs JSDoc comments with parameter and return type descriptions.

## Why

Better documentation helps new contributors understand the codebase and improves IDE intellisense support.

## Scope

- Add JSDoc comments to every exported function in `src/lib/gateway/`
- Include `@param` and `@returns` annotations with type descriptions
- Document any side effects or error conditions

## Notes

This is naturally parallelizable — a contributor can pick one file at a time. Each file can be a separate PR if preferred.
BODY
create_issue "Add JSDoc comments to all gateway action handlers in src/lib/gateway/" '["good first issue", "documentation"]' "$TMPDIR/1.md"

# Issue 2
cat > "$TMPDIR/2.md" << 'BODY'
## Description

Cross-reference all `VITE_*` references in the codebase against `.env.example` and ensure every variable is listed with a description comment.

## Steps

1. Search the codebase for all `VITE_*` and other environment variable references
2. Compare against the current `.env.example`
3. Add any missing variables with sensible defaults or placeholder values
4. Add a description comment above each variable explaining its purpose
5. Remove any variables that are no longer referenced

## Why

A complete and accurate `.env.example` is essential for onboarding new developers and ensuring consistent local setup.
BODY
create_issue "Audit .env.example for missing or outdated variables" '["good first issue", "documentation"]' "$TMPDIR/2.md"

# Issue 3
cat > "$TMPDIR/3.md" << 'BODY'
## Description

The current developer documentation assumes a Mac/Linux environment. Contributors on Windows encounter specific pain points that should be documented.

## Scope

- Add a `TROUBLESHOOTING.md` or a section in existing docs covering Windows-specific issues
- Document known issues with path separators, line endings, and shell compatibility
- Include workarounds for common setup failures on Windows
- Cover WSL2 setup as a recommended alternative

## Why

Lowering the barrier for Windows contributors expands the potential contributor base.
BODY
create_issue "Add a TROUBLESHOOTING entry for Windows dev setup" '["good first issue", "documentation"]' "$TMPDIR/3.md"

# Issue 4
cat > "$TMPDIR/4.md" << 'BODY'
## Description

Run a link checker across all markdown files in the `docs/` folder and fix any dead or broken references.

## Steps

1. Use a markdown link checker tool (e.g., `markdown-link-check`) to scan all `.md` files in `docs/`
2. Identify broken internal links (wrong paths, renamed files)
3. Identify broken external links (404s, moved pages)
4. Fix or remove all broken links
5. Consider adding a CI check to prevent future broken links

## Why

Broken links erode trust in documentation and waste contributor time. This is a pure find-and-fix task that requires no deep code knowledge.
BODY
create_issue "Fix any broken links in the docs/ folder" '["good first issue", "documentation"]' "$TMPDIR/4.md"

# Issue 5
cat > "$TMPDIR/5.md" << 'BODY'
## Description

Perform a quick accessibility audit to find icon-only buttons that are missing `aria-label` attributes, and add appropriate labels.

## Steps

1. Search for `<Button` or `<button` elements that contain only an icon (no visible text)
2. Verify each has an `aria-label` or `aria-labelledby` attribute
3. Add descriptive `aria-label` values where missing
4. Run an accessibility linter (e.g., `eslint-plugin-jsx-a11y`) to catch any remaining issues

## Why

Screen reader users cannot interact with icon-only buttons that lack accessible labels. This is a straightforward a11y improvement.
BODY
create_issue "Add missing aria-label attributes to icon-only buttons" '["good first issue", "enhancement"]' "$TMPDIR/5.md"

# Issue 13
cat > "$TMPDIR/13.md" << 'BODY'
## Description

Implement a pure TypeScript utility function that validates UK bank sort codes.

## Requirements

- Validate format: 6 digits, optionally formatted as `XX-XX-XX`
- Implement modulus weight check (standard modulus checking algorithm)
- Return a typed result indicating valid/invalid with error reason
- No backend dependency — pure client-side logic

## Suggested location

`src/lib/validation/sort-code.ts`

## Testing

- Add Vitest tests covering valid sort codes, invalid formats, and failed modulus checks
- Include edge cases: leading zeros, boundary values

## References

- [Vocalink Modulus Checking Specification](https://www.vocalink.com/tools/modulus-checking/)
BODY
create_issue "[UK] Implement sort code validation utility" '["good first issue", "region: uk"]' "$TMPDIR/13.md"

# Issue 17
cat > "$TMPDIR/17.md" << 'BODY'
## Description

Implement a TypeScript utility for validating Brazilian tax identification numbers: CPF (individuals, 11 digits) and CNPJ (companies, 14 digits).

## Requirements

- `validateCPF(value: string): ValidationResult` — validate CPF with check digit algorithm
- `validateCNPJ(value: string): ValidationResult` — validate CNPJ with check digit algorithm
- Handle formatting (e.g., `123.456.789-09` for CPF, `12.345.678/0001-95` for CNPJ)
- Strip non-numeric characters before validation
- Reject known invalid sequences (e.g., all same digits)
- No backend dependency — pure client-side logic

## Suggested location

`src/lib/validation/brazil-tax-id.ts`

## Testing

- Full Vitest test coverage: valid IDs, invalid check digits, malformed input, edge cases
- Test both formatted and unformatted inputs
BODY
create_issue "[Brazil] Implement CPF/CNPJ validation utility" '["good first issue", "region: brazil"]' "$TMPDIR/17.md"

# Issue 19
cat > "$TMPDIR/19.md" << 'BODY'
## Description

Implement a TypeScript utility for validating Mexican CLABE (Clave Bancaria Estandarizada) account numbers.

## Requirements

- Validate the 18-digit CLABE format
- Implement the check digit algorithm (weighted sum modulo 10)
- Extract and validate the 3-digit bank code
- Extract and validate the 3-digit city code
- Return structured result with bank code, city code, account number, and validity
- No backend dependency — pure client-side logic

## Suggested location

`src/lib/validation/clabe.ts`

## Testing

- Vitest tests covering: valid CLABEs, invalid check digits, wrong length, non-numeric input
- Test extraction of bank/city codes

## References

- [CLABE on Wikipedia](https://en.wikipedia.org/wiki/CLABE)
BODY
create_issue "[Mexico] Implement CLABE validation" '["good first issue", "region: mexico"]' "$TMPDIR/19.md"

echo ""
echo "Done! Check https://github.com/$REPO/issues"
