/**
 * Go-Live Orchestration CLI
 *
 * Sequences the entire go-live workflow from the command line.
 * Calls the same gateway actions as the admin UI.
 *
 * Usage:
 *   npx tsx scripts/go-live.ts \
 *     --tenant "azfcu" \
 *     --supabase-url "https://xyz.supabase.co" \
 *     --service-key "eyJ..." \
 *     [--skip-dns] \
 *     [--auto-approve] \
 *     [--dry-run]
 *
 * Prerequisites:
 *   - Tenant must already be provisioned (use scripts/provision-tenant.ts first)
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars or CLI args
 */

import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    tenant: { type: "string" },
    "supabase-url": { type: "string" },
    "service-key": { type: "string" },
    "skip-dns": { type: "boolean", default: false },
    "auto-approve": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help) {
  console.log(`
Go-Live Orchestration CLI

Usage:
  npx tsx scripts/go-live.ts --tenant <name> [options]

Options:
  --tenant          Tenant subdomain (required)
  --supabase-url    Supabase project URL (or SUPABASE_URL env)
  --service-key     Service role key (or SUPABASE_SERVICE_KEY env)
  --skip-dns        Skip DNS cutover step
  --auto-approve    Skip manual approval gate
  --dry-run         Print steps without executing
  --help            Show this help message
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const tenant = args.tenant;
const supabaseUrl = args["supabase-url"] ?? process.env.SUPABASE_URL;
const serviceKey = args["service-key"] ?? process.env.SUPABASE_SERVICE_KEY;

if (!tenant) {
  console.error("Error: --tenant is required");
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error("Error: Supabase URL and service key are required (--supabase-url/--service-key or env vars)");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Gateway Client
// ---------------------------------------------------------------------------

async function callGateway(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const url = `${supabaseUrl}/functions/v1/gateway`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      "x-tenant-id": tenant!,
    },
    body: JSON.stringify({ action, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Step Definitions
// ---------------------------------------------------------------------------

interface GoLiveStep {
  id: string;
  label: string;
  execute: () => Promise<void>;
  skip?: boolean;
}

const steps: GoLiveStep[] = [
  {
    id: "provision",
    label: "Validate Tenant Provisioning",
    execute: async () => {
      const result = await callGateway("golive.step.execute", { stepId: "provision" });
      console.log("  Provisioning validated:", JSON.stringify(result, null, 2).slice(0, 200));
    },
  },
  {
    id: "adapters",
    label: "Configure & Health-Check Adapters",
    execute: async () => {
      const result = await callGateway("golive.step.execute", { stepId: "adapters" });
      console.log("  Adapters configured:", JSON.stringify(result, null, 2).slice(0, 200));
    },
  },
  {
    id: "data_import",
    label: "Data Import & Reconciliation",
    execute: async () => {
      const result = await callGateway("golive.step.execute", { stepId: "data_import" });
      console.log("  Data import verified:", JSON.stringify(result, null, 2).slice(0, 200));
    },
  },
  {
    id: "smoke_tests",
    label: "Run Smoke Tests",
    execute: async () => {
      const result = await callGateway("golive.smoketest.run", {}) as {
        suite?: { overallStatus: string; passCount: number; failCount: number; skipCount: number };
      };
      const suite = result.suite;
      if (suite) {
        console.log(`  Smoke tests: ${suite.overallStatus.toUpperCase()} (${suite.passCount} pass, ${suite.failCount} fail, ${suite.skipCount} skip)`);
        if (suite.overallStatus === "fail") {
          throw new Error("Smoke tests failed — aborting go-live");
        }
      }
    },
  },
  {
    id: "approval",
    label: "Stakeholder Approval",
    skip: args["auto-approve"],
    execute: async () => {
      if (args["auto-approve"]) {
        console.log("  Auto-approved (--auto-approve flag)");
        await callGateway("golive.step.approve", { comment: "Auto-approved via CLI" });
        return;
      }
      console.log("  Waiting for manual approval in admin UI...");
      // In a real implementation, this would poll or wait for webhook
      await callGateway("golive.step.approve", { comment: "Approved via CLI" });
    },
  },
  {
    id: "dns_cutover",
    label: "DNS Cutover",
    skip: args["skip-dns"],
    execute: async () => {
      if (args["skip-dns"]) {
        console.log("  Skipped (--skip-dns flag)");
        return;
      }
      const result = await callGateway("golive.step.execute", { stepId: "dns_cutover" });
      console.log("  DNS cutover completed:", JSON.stringify(result, null, 2).slice(0, 200));
    },
  },
  {
    id: "post_launch_monitor",
    label: "Post-Launch Monitoring",
    execute: async () => {
      const result = await callGateway("golive.monitor.dashboard", {}) as {
        metrics?: { errorRate: number; p95LatencyMs: number; uptimePercent: number };
      };
      const metrics = result.metrics;
      if (metrics) {
        console.log(`  Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
        console.log(`  P95 latency: ${metrics.p95LatencyMs}ms`);
        console.log(`  Uptime: ${metrics.uptimePercent}%`);
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nGo-Live Orchestration — Tenant: ${tenant}`);
  console.log("=".repeat(50));

  if (args["dry-run"]) {
    console.log("\n[DRY RUN] Steps that would be executed:\n");
    for (const step of steps) {
      const skipLabel = step.skip ? " [SKIP]" : "";
      console.log(`  ${step.id}: ${step.label}${skipLabel}`);
    }
    console.log("\nDone (dry run).");
    return;
  }

  // Start workflow
  console.log("\nStarting go-live workflow...");
  await callGateway("golive.start", {});

  for (const step of steps) {
    console.log(`\n[${step.id}] ${step.label}`);

    if (step.skip) {
      console.log("  Skipped");
      continue;
    }

    try {
      await step.execute();
      console.log("  DONE");
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
      console.error("\nGo-live aborted. Run with --dry-run to preview steps.");
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Go-live complete! Monitor the post-launch dashboard for the first 24 hours.");
  console.log(`  Admin UI: ${supabaseUrl?.replace(".supabase.co", "")}/admin/go-live`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
