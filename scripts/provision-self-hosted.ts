/**
 * Self-Hosted Single-Tenant Provisioning Script
 *
 * Simplified provisioning for single-tenant self-hosted deployments.
 * Unlike provision-tenant.ts which creates new Supabase projects via the
 * Management API, this script assumes you already have a Supabase instance
 * (local Docker or cloud) and seeds it for single-tenant operation.
 *
 * Usage:
 *   npx tsx scripts/provision-self-hosted.ts \
 *     --name "Arizona Federal Credit Union" \
 *     --admin-email "admin@azfcu.org" \
 *     --template us-credit-union
 *
 * Prerequisites:
 *   - A running Supabase instance (local Docker or cloud)
 *   - SUPABASE_URL env var (or --supabase-url flag)
 *   - SUPABASE_SERVICE_ROLE_KEY env var (or --supabase-key flag)
 */

import { parseArgs } from "node:util";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    name: { type: "string" },
    "admin-email": { type: "string" },
    template: { type: "string", default: "us-credit-union" },
    "supabase-url": { type: "string" },
    "supabase-key": { type: "string" },
    features: { type: "string" },
    "admin-password": { type: "string" },
    "output-env": { type: "string", default: ".env.local" },
    "dry-run": { type: "boolean", default: false },
  },
});

// ---------------------------------------------------------------------------
// Tenant Templates (mirrors provision-tenant.ts)
// ---------------------------------------------------------------------------

interface TenantTemplate {
  label: string;
  country: string;
  currency: string;
  region: string;
  features: Record<string, boolean>;
}

const TEMPLATES: Record<string, TenantTemplate> = {
  "us-credit-union": {
    label: "US Credit Union",
    country: "US",
    currency: "USD",
    region: "us",
    features: {
      rdc: true, billPay: true, p2p: true, cardControls: true,
      externalTransfers: true, directDeposit: true, openBanking: true,
      mobileDeposit: true, wires: false, sca: false,
      confirmationOfPayee: false, multiCurrency: false,
      internationalPayments: false, instantPayments: true,
    },
  },
  "us-community-bank": {
    label: "US Community Bank",
    country: "US",
    currency: "USD",
    region: "us",
    features: {
      rdc: true, billPay: true, p2p: true, cardControls: true,
      externalTransfers: true, directDeposit: true, openBanking: true,
      wires: true, mobileDeposit: true, sca: false,
      confirmationOfPayee: false, multiCurrency: false,
      internationalPayments: false, instantPayments: true,
    },
  },
  "uk-digital-bank": {
    label: "UK Digital Bank",
    country: "GB",
    currency: "GBP",
    region: "uk",
    features: {
      rdc: false, billPay: true, p2p: true, cardControls: true,
      externalTransfers: true, directDeposit: false, openBanking: true,
      sca: true, confirmationOfPayee: true, multiCurrency: true,
      internationalPayments: true, wires: true, mobileDeposit: false,
      instantPayments: true,
    },
  },
  "eu-neobank": {
    label: "EU Neobank",
    country: "EU",
    currency: "EUR",
    region: "eu",
    features: {
      rdc: false, billPay: true, p2p: true, cardControls: true,
      externalTransfers: true, directDeposit: false, openBanking: true,
      sca: true, confirmationOfPayee: false, multiCurrency: true,
      internationalPayments: true, wires: true, mobileDeposit: false,
      instantPayments: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

if (!args.name) {
  console.error("Missing required argument: --name");
  process.exit(1);
}
if (!args["admin-email"]) {
  console.error("Missing required argument: --admin-email");
  process.exit(1);
}

const supabaseUrl =
  args["supabase-url"] || process.env.SUPABASE_URL || "http://localhost:54321";
const supabaseKey =
  args["supabase-key"] ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error(
    "Missing Supabase service role key. Provide via --supabase-key or SUPABASE_SERVICE_ROLE_KEY env var.",
  );
  process.exit(1);
}

const template = args.template ? TEMPLATES[args.template] : TEMPLATES["us-credit-union"];
if (args.template && !template) {
  console.error(
    `Unknown template: "${args.template}". Available: ${Object.keys(TEMPLATES).join(", ")}`,
  );
  process.exit(1);
}

// Merge explicit --features on top of template features
let features = { ...template!.features };
if (args.features) {
  for (const f of args.features.split(",")) {
    const trimmed = f.trim();
    if (trimmed.startsWith("-")) {
      features[trimmed.slice(1)] = false;
    } else {
      features[trimmed] = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(step: string, msg: string) {
  console.warn(`[${step}] ${msg}`);
}

async function supabaseRpc(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey!,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  return res;
}

// ---------------------------------------------------------------------------
// Step 1: Seed the firms table
// ---------------------------------------------------------------------------

async function seedFirm(): Promise<string> {
  log("1/3", `Seeding institution: ${args.name}`);

  if (args["dry-run"]) {
    log("1/3", "[DRY RUN] Would insert firm record");
    return "dry-run-tenant-id";
  }

  const slug = args.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const res = await supabaseRpc("/rest/v1/firms", {
    method: "POST",
    body: JSON.stringify({
      name: args.name,
      subdomain: slug,
      subscription_tier: "enterprise",
      max_users: 999999,
      max_properties: 999999,
      currency_code: template!.currency,
      country: template!.country,
      features: features,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to seed firm: ${res.status} ${body}`);
  }

  const rows = await res.json();
  const tenantId = rows[0]?.id;
  log("1/3", `Firm created with ID: ${tenantId}`);
  return tenantId;
}

// ---------------------------------------------------------------------------
// Step 2: Create admin user
// ---------------------------------------------------------------------------

async function createAdminUser(tenantId: string): Promise<string> {
  log("2/3", `Creating admin user: ${args["admin-email"]}`);

  const adminPassword = args["admin-password"] || "Admin123!change-me";

  if (args["dry-run"]) {
    log("2/3", "[DRY RUN] Would create admin user");
    return adminPassword;
  }

  // Use Supabase Auth Admin API to create the user
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: supabaseKey!,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args["admin-email"],
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: "owner",
        tenant_id: tenantId,
        display_name: "Admin",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    // If user already exists, that is acceptable
    if (res.status === 422 && body.includes("already")) {
      log("2/3", "Admin user already exists, skipping creation");
    } else {
      throw new Error(`Failed to create admin user: ${res.status} ${body}`);
    }
  } else {
    log("2/3", "Admin user created");
  }

  return adminPassword;
}

// ---------------------------------------------------------------------------
// Step 3: Generate .env file
// ---------------------------------------------------------------------------

function generateEnvFile(tenantId: string) {
  const envPath = resolve(process.cwd(), args["output-env"]!);
  log("3/3", `Generating ${envPath}`);

  if (args["dry-run"]) {
    log("3/3", "[DRY RUN] Would write .env file");
    return;
  }

  const enabledFeatures = Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(",");

  const envContent = `# =============================================================================
# Fiducia — Single-Tenant Self-Hosted Configuration
# Generated by provision-self-hosted.ts on ${new Date().toISOString()}
# =============================================================================

# Backend
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}

# Single-tenant mode
VITE_SINGLE_TENANT=true
VITE_TENANT_ID=${tenantId}
VITE_TENANT_NAME=${args.name}
VITE_SUBSCRIPTION_TIER=enterprise
VITE_TENANT_REGION=${template!.region}
VITE_TENANT_COUNTRY=${template!.country}
VITE_DEFAULT_CURRENCY=${template!.currency}
VITE_FEATURES=${enabledFeatures}

# Core banking simulator
VITE_CORE_SIM_URL=http://localhost:9090

# Demo mode (set to false once real core banking is connected)
VITE_DEMO_MODE=true
`;

  if (existsSync(envPath)) {
    const backup = `${envPath}.bak.${Date.now()}`;
    log("3/3", `Backing up existing file to ${backup}`);
    writeFileSync(backup, require("fs").readFileSync(envPath));
  }

  writeFileSync(envPath, envContent, "utf-8");
  log("3/3", `Environment file written to ${envPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.warn("=".repeat(60));
  console.warn("  Fiducia — Single-Tenant Self-Hosted Provisioning");
  console.warn(`  Institution: ${args.name}`);
  console.warn(`  Template:    ${template!.label}`);
  console.warn(`  Admin:       ${args["admin-email"]}`);
  console.warn(`  Supabase:    ${supabaseUrl}`);
  if (args["dry-run"]) console.warn("  MODE: DRY RUN");
  console.warn("=".repeat(60));
  console.warn();

  const tenantId = await seedFirm();
  const adminPassword = await createAdminUser(tenantId);
  generateEnvFile(tenantId);

  console.warn();
  console.warn("=".repeat(60));
  console.warn("  Single-tenant provisioning complete!");
  console.warn("=".repeat(60));
  console.warn();
  console.warn(`  Tenant ID:      ${tenantId}`);
  console.warn(`  Admin Email:    ${args["admin-email"]}`);
  console.warn(`  Admin Password: ${"*".repeat(adminPassword.length)} (set via CLI arg or default)`);
  console.warn(`  App URL:        http://localhost:8080`);
  console.warn();
  console.warn("  Next steps:");
  console.warn("    1. Start the dev server: npm run dev");
  console.warn(`    2. Log in with ${args["admin-email"]}`);
  console.warn("    3. Change the default admin password immediately");
  console.warn("    4. Configure core banking adapter credentials");
  console.warn();
}

main().catch((err) => {
  console.error("Provisioning failed:", err.message);
  process.exit(1);
});
