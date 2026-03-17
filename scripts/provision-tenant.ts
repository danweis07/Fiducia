/**
 * Tenant Provisioning Script
 *
 * Creates a new Supabase project for a tenant using the Management API,
 * runs base migrations, deploys edge functions, and seeds initial data.
 *
 * Usage:
 *   npx tsx scripts/provision-tenant.ts \
 *     --name "Bank Alpha" \
 *     --subdomain "alpha" \
 *     --region "us-east-1" \
 *     --tier "starter" \
 *     --admin-email "admin@example.com"
 *
 * Prerequisites:
 *   - SUPABASE_ACCESS_TOKEN env var (from supabase.com/dashboard/account/tokens)
 *   - CONTROL_PLANE_SUPABASE_URL env var (control plane project URL)
 *   - CONTROL_PLANE_SERVICE_KEY env var (control plane service role key)
 *   - Supabase CLI installed (npx supabase)
 */

import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    name: { type: "string" },
    subdomain: { type: "string" },
    region: { type: "string", default: "us-east-1" },
    tier: { type: "string", default: "starter" },
    "admin-email": { type: "string" },
    "plan-size": { type: "string", default: "micro" },
    template: { type: "string" },
    country: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

// ---------------------------------------------------------------------------
// Tenant Templates
// ---------------------------------------------------------------------------

interface TenantTemplate {
  label: string;
  country: string;
  currency: string;
  features: Record<string, boolean>;
  recommendedAdapters: string[];
}

const TEMPLATES: Record<string, TenantTemplate> = {
  "us-credit-union": {
    label: "US Credit Union",
    country: "US",
    currency: "USD",
    features: {
      rdc: true,
      billPay: true,
      p2p: true,
      cardControls: true,
      externalTransfers: true,
      directDeposit: true,
      openBanking: true,
      mobileDeposit: true,
      wires: false,
      sca: false,
      confirmationOfPayee: false,
      multiCurrency: false,
      internationalPayments: false,
    },
    recommendedAdapters: [
      "core-banking (CU*Answers or Symitar)",
      "rdc (Mitek or CU*Answers)",
      "bill-pay (FIS or Fiserv)",
      "kyc (Alloy or CU*Answers)",
      "account-opening (CU*Answers or built-in)",
      "instant-payments (FedNow, RTP)",
      "fraud (BioCatch)",
      "compliance-audit (Drata or Vanta)",
    ],
  },
  "us-community-bank": {
    label: "US Community Bank",
    country: "US",
    currency: "USD",
    features: {
      rdc: true,
      billPay: true,
      p2p: true,
      cardControls: true,
      externalTransfers: true,
      directDeposit: true,
      openBanking: true,
      wires: true,
      mobileDeposit: true,
      sca: false,
      confirmationOfPayee: false,
      multiCurrency: false,
      internationalPayments: false,
    },
    recommendedAdapters: [
      "core-banking (FIS, Fineract, or FLEX)",
      "rdc (Mitek or JackHenry)",
      "bill-pay (Fiserv or FIS)",
      "kyc (Alloy)",
      "kyb (Middesk)",
      "loan-origination (LoanVantage)",
      "instant-payments (FedNow, RTP)",
      "treasury (Column or Increase)",
      "compliance-audit (Drata or Vanta)",
    ],
  },
  "uk-digital-bank": {
    label: "UK Digital Bank",
    country: "GB",
    currency: "GBP",
    features: {
      rdc: false,
      billPay: true,
      p2p: true,
      cardControls: true,
      externalTransfers: true,
      directDeposit: false,
      openBanking: true,
      sca: true,
      confirmationOfPayee: true,
      multiCurrency: true,
      internationalPayments: true,
      wires: true,
      mobileDeposit: false,
    },
    recommendedAdapters: [
      "core-banking (Mambu or Thought Machine)",
      "baas (Clearbank)",
      "sca (Strong Customer Authentication)",
      "confirmation-of-payee",
      "kyc (Alloy)",
      "aml-screening",
      "fraud (BioCatch)",
      "notifications (Braze)",
      "international-payments (Stripe or Marqeta)",
    ],
  },
  "eu-neobank": {
    label: "EU Neobank",
    country: "EU",
    currency: "EUR",
    features: {
      rdc: false,
      billPay: true,
      p2p: true,
      cardControls: true,
      externalTransfers: true,
      directDeposit: false,
      openBanking: true,
      sca: true,
      confirmationOfPayee: false,
      multiCurrency: true,
      internationalPayments: true,
      wires: true,
      mobileDeposit: false,
    },
    recommendedAdapters: [
      "core-banking (Mambu, Thought Machine, or Pismo)",
      "baas (Solaris)",
      "sca (Strong Customer Authentication)",
      "instant-payments (SEPA Instant)",
      "kyc (Alloy)",
      "aml-screening",
      "fraud (BioCatch)",
      "international-payments (Stripe or Marqeta)",
      "international-bill-pay (Wise)",
    ],
  },
};

const REQUIRED = ["name", "subdomain", "admin-email"] as const;
for (const key of REQUIRED) {
  if (!args[key]) {
    console.error(`Missing required argument: --${key}`);
    process.exit(1);
  }
}

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_SUPABASE_URL;
const CONTROL_PLANE_KEY = process.env.CONTROL_PLANE_SERVICE_KEY;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN environment variable");
  console.error(
    "Generate one at: https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

const MGMT_API = "https://api.supabase.com/v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mgmtApi(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${MGMT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API ${path} failed (${res.status}): ${body}`);
  }
  return res;
}

function log(step: string, msg: string) {
  console.warn(`[${step}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Step 1: Create Supabase Project
// ---------------------------------------------------------------------------

interface NewProject {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  database: {
    host: string;
    password: string;
  };
}

async function createProject(): Promise<NewProject> {
  log("1/5", `Creating Supabase project: ${args.name}`);

  // Get the organization ID (first org by default)
  const orgsRes = await mgmtApi("/organizations");
  const orgs = await orgsRes.json();
  if (!orgs.length) {
    throw new Error("No Supabase organizations found for this access token");
  }
  const orgId = orgs[0].id;

  // Generate a secure database password
  const dbPassword = crypto.randomUUID().replace(/-/g, "") + "!Aa1";

  if (args["dry-run"]) {
    log("1/5", "[DRY RUN] Would create project with:");
    log("1/5", `  Organization: ${orgId}`);
    log("1/5", `  Name: ${args.name}`);
    log("1/5", `  Region: ${args.region}`);
    log("1/5", `  Plan: ${args["plan-size"]}`);
    return {
      id: "dry-run-project-ref",
      name: args.name!,
      organization_id: orgId,
      region: args.region!,
      database: { host: "localhost", password: dbPassword },
    };
  }

  const res = await mgmtApi("/projects", {
    method: "POST",
    body: JSON.stringify({
      name: `vantage-${args.subdomain}`,
      organization_id: orgId,
      region: args.region,
      plan: "pro", // Required for custom domains
      db_pass: dbPassword,
    }),
  });

  const project = (await res.json()) as NewProject;
  log("1/5", `Project created: ${project.id} in ${project.region}`);

  // Wait for project to be ready
  log("1/5", "Waiting for project to initialize...");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    try {
      const statusRes = await mgmtApi(`/projects/${project.id}`);
      const status = await statusRes.json();
      if (status.status === "ACTIVE_HEALTHY") {
        ready = true;
        break;
      }
      log("1/5", `  Status: ${status.status}...`);
    } catch {
      // Project not ready yet
    }
  }

  if (!ready) {
    throw new Error("Project did not become ready within 5 minutes");
  }

  log("1/5", "Project is ready");
  return project;
}

// ---------------------------------------------------------------------------
// Step 2: Run Migrations
// ---------------------------------------------------------------------------

async function runMigrations(projectRef: string) {
  log("2/5", "Applying database migrations...");

  if (args["dry-run"]) {
    log("2/5", "[DRY RUN] Would run: supabase db push");
    return;
  }

  try {
    execSync(
      `npx supabase db push --project-ref ${projectRef}`,
      { stdio: "inherit", cwd: process.cwd() }
    );
    log("2/5", "All migrations applied successfully");
  } catch (error) {
    throw new Error(`Migration failed: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// Step 3: Deploy Edge Functions
// ---------------------------------------------------------------------------

async function deployFunctions(projectRef: string) {
  log("3/5", "Deploying edge functions...");

  if (args["dry-run"]) {
    log("3/5", "[DRY RUN] Would deploy all edge functions");
    return;
  }

  try {
    execSync(
      `npx supabase functions deploy --project-ref ${projectRef}`,
      { stdio: "inherit", cwd: process.cwd() }
    );
    log("3/5", "Edge functions deployed");
  } catch (error) {
    throw new Error(`Function deployment failed: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// Step 4: Configure Tenant
// ---------------------------------------------------------------------------

async function configureTenant(projectRef: string) {
  log("4/5", "Configuring tenant settings...");

  if (args["dry-run"]) {
    log("4/5", "[DRY RUN] Would configure tenant settings");
    return;
  }

  // Get project API keys
  const keysRes = await mgmtApi(`/projects/${projectRef}/api-keys`);
  const keys = await keysRes.json();
  const anonKey = keys.find(
    (k: { name: string }) => k.name === "anon"
  )?.api_key;
  const serviceKey = keys.find(
    (k: { name: string }) => k.name === "service_role"
  )?.api_key;

  // Resolve template configuration
  const template = args.template ? TEMPLATES[args.template] : undefined;
  if (args.template && !template) {
    console.warn(`Warning: Unknown template "${args.template}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
  }

  const country = args.country ?? template?.country ?? "US";
  const currency = template?.currency ?? "USD";
  const features = template?.features ?? {};

  // Seed the firms table with this tenant's info
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const seedSql = `
    INSERT INTO firms (name, subdomain, subscription_tier, max_users, max_properties, currency_code, country, features)
    VALUES (
      '${args.name!.replace(/'/g, "''")}',
      '${args.subdomain!.replace(/'/g, "''")}',
      '${args.tier}',
      CASE '${args.tier}'
        WHEN 'trial' THEN 3
        WHEN 'starter' THEN 5
        WHEN 'professional' THEN 25
        WHEN 'enterprise' THEN 999999
        ELSE 3
      END,
      CASE '${args.tier}'
        WHEN 'trial' THEN 100
        WHEN 'starter' THEN 500
        WHEN 'professional' THEN 5000
        WHEN 'enterprise' THEN 999999
        ELSE 100
      END,
      '${currency}',
      '${country}',
      '${JSON.stringify(features).replace(/'/g, "''")}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  `;

  execSync(
    `npx supabase db execute --project-ref ${projectRef} --sql "${seedSql.replace(/"/g, '\\"')}"`,
    { stdio: "inherit" }
  );

  // Register in control plane (if configured)
  if (CONTROL_PLANE_URL && CONTROL_PLANE_KEY) {
    log("4/5", "Registering tenant in control plane...");
    await fetch(`${CONTROL_PLANE_URL}/rest/v1/tenant_registry`, {
      method: "POST",
      headers: {
        apikey: CONTROL_PLANE_KEY,
        Authorization: `Bearer ${CONTROL_PLANE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        project_ref: projectRef,
        tenant_name: args.name,
        subdomain: args.subdomain,
        supabase_url: supabaseUrl,
        anon_key: anonKey,
        subscription_tier: args.tier,
        status: "provisioning",
      }),
    });
  }

  log("4/5", "Tenant configured");

  return { supabaseUrl, anonKey, serviceKey };
}

// ---------------------------------------------------------------------------
// Step 5: Send Admin Invite
// ---------------------------------------------------------------------------

async function inviteAdmin(projectRef: string) {
  log("5/5", `Inviting admin: ${args["admin-email"]}`);

  if (args["dry-run"]) {
    log("5/5", "[DRY RUN] Would send admin invitation");
    return;
  }

  // Use Supabase Auth Admin API to invite the admin user
  const keysRes = await mgmtApi(`/projects/${projectRef}/api-keys`);
  const keys = await keysRes.json();
  const serviceKey = keys.find(
    (k: { name: string }) => k.name === "service_role"
  )?.api_key;

  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args["admin-email"],
      data: { role: "owner" },
    }),
  });

  if (!inviteRes.ok) {
    const body = await inviteRes.text();
    console.warn(`Warning: Admin invite failed: ${body}`);
    console.warn("You may need to invite the admin manually.");
    return;
  }

  log("5/5", "Admin invitation sent");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const template = args.template ? TEMPLATES[args.template] : undefined;

  console.warn("=".repeat(60));
  console.warn(`  Vantage Tenant Provisioning`);
  console.warn(`  Tenant: ${args.name} (${args.subdomain})`);
  console.warn(`  Region: ${args.region} | Tier: ${args.tier}`);
  if (template) {
    console.warn(`  Template: ${template.label}`);
    console.warn(`  Country: ${template.country} | Currency: ${template.currency}`);
  }
  if (args["dry-run"]) console.warn("  MODE: DRY RUN");
  console.warn("=".repeat(60));
  console.warn();

  const project = await createProject();
  await runMigrations(project.id);
  await deployFunctions(project.id);
  const config = await configureTenant(project.id);
  await inviteAdmin(project.id);

  console.warn();
  console.warn("=".repeat(60));
  console.warn("  Tenant provisioned successfully!");
  console.warn("=".repeat(60));
  console.warn();
  console.warn("  Project Ref:  ", project.id);
  console.warn("  Supabase URL: ", config?.supabaseUrl ?? "N/A (dry run)");
  console.warn("  Admin Email:  ", args["admin-email"]);
  console.warn();
  console.warn("  Next steps:");
  console.warn("  1. Set tenant secrets (AI keys, integration keys):");
  console.warn(
    `     npx supabase secrets set --project-ref ${project.id} VERTEX_PROJECT_ID=...`
  );
  console.warn("  2. Configure custom domain:");
  console.warn(
    `     npx supabase domains create --project-ref ${project.id} --custom-hostname api.${args.subdomain}.com`
  );
  console.warn("  3. Deploy frontend with tenant config:");
  console.warn(
    `     VITE_SUPABASE_URL=${config?.supabaseUrl ?? "https://<ref>.supabase.co"}`
  );

  if (template) {
    console.warn();
    console.warn("  Recommended adapters for this template:");
    for (const adapter of template.recommendedAdapters) {
      console.warn(`    - ${adapter}`);
    }
    console.warn();
    console.warn("  See docs/INTEGRATION-CATALOG.md for sandbox setup instructions.");
  }
  console.warn();
}

main().catch((err) => {
  console.error("Provisioning failed:", err.message);
  process.exit(1);
});
