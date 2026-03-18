#!/usr/bin/env bash
# cleanup-branches-and-runs.sh
# Deletes all stale remote branches (keeps main + current branch)
# and purges all GitHub Actions workflow run histories.
#
# Prerequisites: gh CLI authenticated (gh auth login)
# Usage: ./scripts/cleanup-branches-and-runs.sh [--dry-run]

set -euo pipefail

REPO="danweis07/Fiducia"
KEEP_BRANCHES="main"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE — no changes will be made ==="
fi

###############################################################################
# Part 1: Delete stale remote branches
###############################################################################
echo ""
echo "========================================="
echo " Part 1: Deleting stale remote branches"
echo "========================================="

BRANCHES=$(gh api "repos/${REPO}/branches" --paginate -q '.[].name')
TOTAL=$(echo "$BRANCHES" | wc -l)
echo "Found $TOTAL remote branches."

DELETED=0
SKIPPED=0

while IFS= read -r branch; do
  # Skip protected branches
  if [[ "$branch" == "main" || "$branch" == "master" ]]; then
    echo "  KEEP: $branch (protected)"
    ((SKIPPED++))
    continue
  fi

  if $DRY_RUN; then
    echo "  WOULD DELETE: $branch"
  else
    echo "  DELETING: $branch"
    if gh api -X DELETE "repos/${REPO}/git/refs/heads/${branch}" 2>/dev/null; then
      ((DELETED++))
    else
      echo "    FAILED to delete: $branch"
    fi
  fi
done <<< "$BRANCHES"

echo ""
echo "Branches: deleted=$DELETED, skipped=$SKIPPED, total=$TOTAL"

###############################################################################
# Part 2: Delete all GitHub Actions workflow runs
###############################################################################
echo ""
echo "========================================="
echo " Part 2: Deleting workflow run histories"
echo "========================================="

# Get all workflow IDs
WORKFLOW_IDS=$(gh api "repos/${REPO}/actions/workflows" -q '.workflows[].id')

for wf_id in $WORKFLOW_IDS; do
  WF_NAME=$(gh api "repos/${REPO}/actions/workflows/${wf_id}" -q '.name')
  echo ""
  echo "--- Workflow: $WF_NAME (id: $wf_id) ---"

  # Paginate through all runs for this workflow
  PAGE=1
  RUN_COUNT=0
  while true; do
    RUN_IDS=$(gh api "repos/${REPO}/actions/workflows/${wf_id}/runs?per_page=100&page=${PAGE}" -q '.workflow_runs[].id')
    if [[ -z "$RUN_IDS" ]]; then
      break
    fi

    for run_id in $RUN_IDS; do
      if $DRY_RUN; then
        echo "  WOULD DELETE run: $run_id"
      else
        echo "  DELETING run: $run_id"
        gh api -X DELETE "repos/${REPO}/actions/runs/${run_id}" 2>/dev/null || echo "    FAILED"
      fi
      ((RUN_COUNT++))
    done

    ((PAGE++))
  done

  echo "  Processed $RUN_COUNT runs for $WF_NAME"
done

###############################################################################
# Summary
###############################################################################
echo ""
echo "========================================="
echo " Cleanup complete!"
echo "========================================="
if $DRY_RUN; then
  echo "This was a dry run. Re-run without --dry-run to apply changes."
fi
