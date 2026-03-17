#!/usr/bin/env bash
# =============================================================================
# compliance-check.sh — Automated compliance checks for the banking platform
# =============================================================================
#
# Validates that the codebase meets security and compliance requirements:
#   1. No PII in logs (account numbers, SSNs, personal data)
#   2. Monetary values use integer cents (no floating-point dollars)
#   3. Tenant isolation (queries scoped by tenant_id/firm_id)
#   4. Audit logging for financial actions
#   5. Input validation with Zod schemas
#   6. Account numbers always masked in responses
#
# Usage:
#   ./scripts/compliance-check.sh          # Run all checks
#   ./scripts/compliance-check.sh --fix    # Show suggested fixes
#
# Exit codes:
#   0 — All checks passed
#   1 — One or more checks failed
#
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

pass()  { echo -e "  ${GREEN}✓${NC} $*"; }
fail()  { echo -e "  ${RED}✗${NC} $*"; ERRORS=$((ERRORS + 1)); }
warn()  { echo -e "  ${YELLOW}!${NC} $*"; WARNINGS=$((WARNINGS + 1)); }
info()  { echo -e "${BLUE}━━━ $* ━━━${NC}"; }

# =============================================================================
# CHECK 1: No PII in log statements
# =============================================================================
info "Check 1: No PII in log statements"

# Look for console.log/warn/error with account/ssn/password patterns
PII_IN_LOGS=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E 'console\.(log|warn|error|info)\(.*\b(ssn|socialSecurity|accountNumber|password|pin|cardNumber|dateOfBirth|dob)\b' \
  src/ supabase/ 2>/dev/null || true)

if [ -z "$PII_IN_LOGS" ]; then
  pass "No PII field names found in console.log statements"
else
  fail "Possible PII in log statements:"
  echo "$PII_IN_LOGS" | head -10 | while read -r line; do
    echo "      $line"
  done
fi

# Check for raw account numbers in log strings (4+ consecutive digits without masking)
RAW_ACCT_LOGS=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E 'console\.(log|warn|error).*\$\{.*account.*\}' \
  src/ supabase/ 2>/dev/null | grep -v 'mask\|****\|slice(-4)' || true)

if [ -z "$RAW_ACCT_LOGS" ]; then
  pass "No unmasked account references in log statements"
else
  warn "Possible unmasked account numbers in logs:"
  echo "$RAW_ACCT_LOGS" | head -5 | while read -r line; do
    echo "      $line"
  done
fi

# =============================================================================
# CHECK 2: Monetary values in integer cents
# =============================================================================
info "Check 2: Monetary values in integer cents (no floats)"

# Look for suspicious float math on money-like variables
FLOAT_MONEY=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E '(amount|balance|price|total|payment|fee|interest)\s*[*/]\s*100\b' \
  src/ supabase/ 2>/dev/null | grep -v 'test\|spec\|__tests__\|\.test\.' || true)

if [ -z "$FLOAT_MONEY" ]; then
  pass "No suspicious float-to-cents conversion found"
else
  warn "Possible float-to-cents conversion (should use integer cents throughout):"
  echo "$FLOAT_MONEY" | head -5 | while read -r line; do
    echo "      $line"
  done
fi

# Check for parseFloat on monetary values
PARSE_FLOAT_MONEY=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E 'parseFloat\(.*\b(amount|balance|price|total|payment)\b' \
  src/ supabase/ 2>/dev/null | grep -v 'test\|spec\|__tests__' || true)

if [ -z "$PARSE_FLOAT_MONEY" ]; then
  pass "No parseFloat on monetary variables"
else
  warn "parseFloat used on monetary variables (prefer integer cents):"
  echo "$PARSE_FLOAT_MONEY" | head -5 | while read -r line; do
    echo "      $line"
  done
fi

# =============================================================================
# CHECK 3: Tenant isolation
# =============================================================================
info "Check 3: Tenant isolation (queries scoped by tenant/firm ID)"

# Check that Supabase queries include firm_id/tenant_id filtering
UNSCOPED_QUERIES=$(grep -rn --include="*.ts" \
  -E '\.from\(' \
  supabase/functions/gateway/handlers/ 2>/dev/null | \
  grep -v 'firmId\|firm_id\|tenant_id\|ctx\.firmId\|\.eq.*firm\|test\|spec' || true)

# This is a heuristic — won't catch everything
if [ -z "$UNSCOPED_QUERIES" ]; then
  pass "All handler queries appear to include tenant scoping"
else
  warn "Queries that may lack tenant scoping (verify manually):"
  echo "$UNSCOPED_QUERIES" | head -10 | while read -r line; do
    echo "      $line"
  done
fi

# =============================================================================
# CHECK 4: Audit logging for financial actions
# =============================================================================
info "Check 4: Audit logging for financial actions"

# Check that transfer/payment handlers include audit log calls
FINANCIAL_HANDLERS=$(grep -rln --include="*.ts" \
  -E 'transfer|payment|withdraw|deposit' \
  supabase/functions/gateway/handlers/ 2>/dev/null || true)

if [ -n "$FINANCIAL_HANDLERS" ]; then
  MISSING_AUDIT=""
  for handler in $FINANCIAL_HANDLERS; do
    if ! grep -q 'audit\|auditLog\|audit_log' "$handler" 2>/dev/null; then
      MISSING_AUDIT="$MISSING_AUDIT\n      $handler"
    fi
  done
  if [ -z "$MISSING_AUDIT" ]; then
    pass "All financial handlers include audit logging"
  else
    warn "Financial handlers possibly missing audit logging:$MISSING_AUDIT"
  fi
else
  pass "No financial handlers found to check"
fi

# =============================================================================
# CHECK 5: Input validation with Zod
# =============================================================================
info "Check 5: Input validation (Zod schemas)"

# Check that POST/PUT handlers validate input
HANDLER_COUNT=$(find supabase/functions/gateway/handlers/ -name "*.ts" -not -name "*.test.*" 2>/dev/null | wc -l | tr -d ' ')
ZOD_FILES=$(grep -rln --include="*.ts" \
  -E 'import.*zod|from.*zod|z\.object|z\.string|z\.number|\.safeParse|\.parse\(' \
  supabase/functions/gateway/handlers/ 2>/dev/null || true)
if [ -n "$ZOD_FILES" ]; then
  HANDLERS_WITH_ZOD=$(echo "$ZOD_FILES" | wc -l | tr -d ' ')
else
  HANDLERS_WITH_ZOD=0
fi

if [ "$HANDLER_COUNT" -gt 0 ]; then
  COVERAGE=$((HANDLERS_WITH_ZOD * 100 / HANDLER_COUNT))
  if [ "$COVERAGE" -ge 50 ]; then
    pass "Zod validation found in ${HANDLERS_WITH_ZOD}/${HANDLER_COUNT} handlers (${COVERAGE}%)"
  else
    warn "Only ${HANDLERS_WITH_ZOD}/${HANDLER_COUNT} handlers use Zod validation (${COVERAGE}%)"
  fi
else
  pass "No handlers to check"
fi

# =============================================================================
# CHECK 6: Account masking in responses
# =============================================================================
info "Check 6: Account number masking"

# Verify that masking utilities exist and are imported
MASK_IMPORTS=$(grep -rln --include="*.ts" --include="*.tsx" \
  'maskAccountNumber\|maskSSN\|maskCardNumber' \
  src/ 2>/dev/null | wc -l)

if [ "$MASK_IMPORTS" -ge 3 ]; then
  pass "Masking utilities are used in ${MASK_IMPORTS} files"
else
  warn "Masking utilities used in only ${MASK_IMPORTS} files — verify coverage"
fi

# Check that response objects don't include raw account fields
RAW_RESPONSES=$(grep -rn --include="*.ts" \
  -E 'accountNumber[^:]*:\s*[^m][^a][^s]' \
  supabase/functions/gateway/handlers/ 2>/dev/null | \
  grep -v 'mask\|****\|slice\|hidden\|test\|spec\|type' || true)

if [ -z "$RAW_RESPONSES" ]; then
  pass "No unmasked account numbers in handler responses"
else
  warn "Possible unmasked account numbers in responses:"
  echo "$RAW_RESPONSES" | head -5 | while read -r line; do
    echo "      $line"
  done
fi

# =============================================================================
# CHECK 7: No hardcoded secrets
# =============================================================================
info "Check 7: No hardcoded secrets"

HARDCODED_SECRETS=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
  -E "(api[_-]?key|secret|token|password)\s*[:=]\s*[\"'][a-zA-Z0-9]{20,}[\"']" \
  src/ supabase/ 2>/dev/null | grep -v 'test\|spec\|mock\|example\|placeholder\|demo\|__tests__\|\.env\|type\|interface' || true)

if [ -z "$HARDCODED_SECRETS" ]; then
  pass "No hardcoded secrets detected"
else
  fail "Possible hardcoded secrets found:"
  echo "$HARDCODED_SECRETS" | head -5 | while read -r line; do
    echo "      $line"
  done
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Summary ━━━${NC}"
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "  ${GREEN}All compliance checks passed!${NC}"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}${NC} 0 errors, ${YELLOW}${WARNINGS} warnings${NC}"
  echo -e "  Warnings should be reviewed but do not block CI."
  exit 0
else
  echo -e "  ${RED}${ERRORS} errors${NC}, ${YELLOW}${WARNINGS} warnings${NC}"
  echo -e "  Fix errors before committing. See SECURITY_CONTROLS.md for guidance."
  exit 1
fi
