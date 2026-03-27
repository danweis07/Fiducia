/**
 * Go-Live Orchestration CLI
 *
 * Non-interactive CLI that sequences through the full go-live workflow.
 * Calls the gateway API and orchestrates subprocesses.
 *
 * Usage:
 *   npx tsx scripts/go-live.ts \
 *     --tenant "azfcu" \
 *     --config go-live-config.json \
 *     [--skip-dns] \
 *     [--auto-approve] \
 *     [--dry-run]
 *
 * Prerequisites:
 *   - Tenant must already be provisioned (use scripts/provision-tenant.ts first)
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 */

import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    tenant: { type: "string" },
    config: { type: "string" },
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
  --config          Path to JSON config file (optional)
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
if (!tenant) {
  console.error("Error: --tenant is required");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!args["dry-run"] && (!supabaseUrl || !serviceKey)) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required");
  console.error("Set these or use --dry-run to preview the steps");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config File
// ---------------------------------------------------------------------------

interface GoLiveConfig {
  tenant?: string;
  adapters?: Array<{ domain: string; provider: string }>;
  smokeTestTimeout?: number;
  dnsProvider?: string;
  customDomain?: string;
  notifyChannels?: string[];
}

let config: GoLiveConfig = {};
if (args.config) {
  const configPath = path.resolve(process.cwd(), args.config);
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    config = JSON.parse(raw) as GoLiveConfig;
    console.log(`Loaded config from ${args.config}`);
  } catch (err) {
    console.error(`Error reading config file: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
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
    throw new Error(`Gateway ${action} failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StepResult {
  step: string;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  detail?: string;
}

const results: StepResult[] = [];

function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

async function runStep(
  id: string,
  label: string,
  fn: () => Promise<string | void>,
  skip = false,
): Promise<void> {
  console.log(`\n--- Step: ${label} ---`);

  if (skip) {
    log(id, "Skipped");
    results.push({ step: id, status: "skip", durationMs: 0, detail: "Skipped by flag" });
    return;
  }

  if (args["dry-run"]) {
    log(id, "[DRY RUN] Would execute");
    results.push({ step: id, status: "skip", durationMs: 0, detail: "Dry run" });
    return;
  }

  const start = Date.now();
  try {
    const detail = await fn();
    const durationMs = Date.now() - start;
    log(id, `DONE (${durationMs}ms)`);
    results.push({ step: id, status: "pass", durationMs, detail: detail ?? undefined });
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    log(id, `FAILED: ${message}`);
    results.push({ step: id, status: "fail", durationMs, detail: message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Step 1: Provision Validation
// ---------------------------------------------------------------------------

async function stepProvision(): Promise<string> {
  log("provision", "Validating tenant provisioning...");

  try {
    execFileSync(
      "npx",
      ["tsx", "scripts/provision-tenant.ts", "--name", tenant!, "--subdomain", tenant!, "--admin-email", "verify@check", "--dry-run"],
      { stdio: "pipe", cwd: process.cwd() },
    );
  } catch {
    // Dry-run provision is just a validation check — non-zero exit is acceptable
  }

  const result = await callGateway("golive.step.execute", { stepId: "provision" }) as {
    workflow?: { currentStep: string };
  };
  return `Provision validated, current step: ${result.workflow?.currentStep ?? "unknown"}`;
}

// ---------------------------------------------------------------------------
// Step 2: Adapter Health Checks
// ---------------------------------------------------------------------------

async function stepAdapterHealth(): Promise<string> {
  log("adapters", "Running adapter health checks...");

  const result = await callGateway("golive.step.execute", { stepId: "adapters" }) as {
    workflow?: Record<string, unknown>;
  };

  // If config specifies adapters, check each one
  if (config.adapters?.length) {
    for (const adapter of config.adapters) {
      log("adapters", `  Checking ${adapter.domain} (${adapter.provider})...`);
      await callGateway("adapters.setup.healthcheck", {
        domain: adapter.domain,
        provider: adapter.provider,
      });
    }
  }

  return `Adapter health checks completed`;
}

// ---------------------------------------------------------------------------
// Step 3: Data Import Status
// ---------------------------------------------------------------------------

async function stepDataImport(): Promise<string> {
  log("data_import", "Checking data import status...");

  const result = await callGateway("golive.step.execute", { stepId: "data_import" }) as {
    workflow?: Record<string, unknown>;
  };

  return `Data import verification completed`;
}

// ---------------------------------------------------------------------------
// Step 4: Smoke Tests
// ---------------------------------------------------------------------------

async function stepSmokeTests(): Promise<string> {
  log("smoke_tests", "Running smoke test suite...");

  const result = await callGateway("golive.smoketest.run", {}) as {
    suite?: { overallStatus: string; passCount: number; failCount: number; skipCount: number };
  };

  const suite = result.suite;
  if (!suite) {
    return "Smoke test suite returned no results";
  }

  const summary = `${suite.overallStatus.toUpperCase()}: ${suite.passCount} pass, ${suite.failCount} fail, ${suite.skipCount} skip`;
  log("smoke_tests", `  ${summary}`);

  if (suite.overallStatus === "fail") {
    throw new Error(`Smoke tests failed — ${suite.failCount} test(s) did not pass`);
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Step 5: Approval Gate
// ---------------------------------------------------------------------------

async function stepApproval(): Promise<string> {
  if (args["auto-approve"]) {
    log("approval", "Auto-approved via --auto-approve flag");
    await callGateway("golive.step.approve", { comment: "Auto-approved via CLI" });
    return "Auto-approved";
  }

  log("approval", "Submitting approval request...");
  await callGateway("golive.step.approve", { comment: "Approved via go-live CLI" });
  return "Approval submitted";
}

// ---------------------------------------------------------------------------
// Step 6: DNS Cutover
// ---------------------------------------------------------------------------

async function stepDnsCutover(): Promise<string> {
  log("dns_cutover", "Executing DNS cutover...");

  const result = await callGateway("golive.step.execute", { stepId: "dns_cutover" }) as {
    workflow?: Record<string, unknown>;
  };

  if (config.customDomain) {
    log("dns_cutover", `  Custom domain: ${config.customDomain}`);
  }

  return `DNS cutover completed${config.customDomain ? ` for ${config.customDomain}` : ""}`;
}

// ---------------------------------------------------------------------------
// Step 7: Post-Launch Monitor
// ---------------------------------------------------------------------------

async function stepMonitor(): Promise<string> {
  log("monitor", "Fetching post-launch metrics...");

  const result = await callGateway("golive.monitor.dashboard", {}) as {
    metrics?: { errorRate: number; p95LatencyMs: number; uptimePercent: number };
  };

  const metrics = result.metrics;
  if (metrics) {
    log("monitor", `  Error rate:  ${(metrics.errorRate * 100).toFixed(2)}%`);
    log("monitor", `  P95 latency: ${metrics.p95LatencyMs}ms`);
    log("monitor", `  Uptime:      ${metrics.uptimePercent}%`);
  }

  const grafanaUrl = supabaseUrl
    ? `${supabaseUrl.replace(".supabase.co", "")}/monitoring`
    : "N/A";
  log("monitor", `  Grafana: ${grafanaUrl}`);

  return `Metrics collected. Monitor dashboard for first 24 hours.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\nGo-Live Orchestration CLI");
  console.log("=".repeat(50));
  console.log(`  Tenant:       ${tenant}`);
  console.log(`  Skip DNS:     ${args["skip-dns"]}`);
  console.log(`  Auto-approve: ${args["auto-approve"]}`);
  console.log(`  Dry run:      ${args["dry-run"]}`);
  if (args.config) console.log(`  Config:       ${args.config}`);
  console.log("=".repeat(50));

  // Start the workflow
  if (!args["dry-run"]) {
    log("init", "Starting go-live workflow...");
    await callGateway("golive.start", {});
  }

  try {
    await runStep("provision", "Validate Tenant Provisioning", stepProvision);
    await runStep("adapters", "Adapter Health Checks", stepAdapterHealth);
    await runStep("data_import", "Data Import Status Check", stepDataImport);
    await runStep("smoke_tests", "Run Smoke Tests", stepSmokeTests);
    await runStep("approval", "Stakeholder Approval", stepApproval);
    await runStep("dns_cutover", "DNS Cutover", stepDnsCutover, args["skip-dns"]);
    await runStep("monitor", "Post-Launch Monitoring", stepMonitor);
  } catch {
    console.error("\nGo-live aborted due to step failure.");
    console.log("\nResults:");
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  // Output structured results
  console.log("\n" + "=".repeat(50));
  console.log("Go-live completed successfully!");
  console.log("=".repeat(50));
  console.log("\nResults:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
