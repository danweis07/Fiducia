/**
 * Runbook / SOP Generator
 *
 * Reads codebase artifacts and generates Markdown operational runbooks:
 *   - Incident response runbooks from Prometheus alert definitions
 *   - Adapter troubleshooting guides from adapter registry
 *   - Backup/restore SOPs from scripts/backup/
 *   - Support escalation playbooks
 *   - Tenant-specific runbooks (only enabled features/adapters)
 *
 * Usage:
 *   npx tsx scripts/generate-runbooks.ts --output docs/generated/
 *   npx tsx scripts/generate-runbooks.ts --tenant azfcu --output docs/generated/
 *   npx tsx scripts/generate-runbooks.ts --all
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const { values: args } = parseArgs({
  options: {
    output: { type: "string", default: "docs/generated" },
    tenant: { type: "string" },
    all: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help) {
  console.log(`
Runbook / SOP Generator

Usage:
  npx tsx scripts/generate-runbooks.ts [options]

Options:
  --output <dir>   Output directory (default: docs/generated)
  --tenant <name>  Generate tenant-specific runbook
  --all            Generate all runbooks including tenant-specific
  --help           Show this help
`);
  process.exit(0);
}

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "..");
const OUTPUT_DIR = path.resolve(ROOT, args.output ?? "docs/generated");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeRunbook(filename: string, content: string) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, content, "utf-8");
  const stats = fs.statSync(filepath);
  console.log(`  Generated: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------------
// 1. Incident Response Runbook (from Prometheus alerts)
// ---------------------------------------------------------------------------

function generateIncidentResponse(): string {
  const alertsPath = path.join(ROOT, "monitoring/prometheus/alerts/banking.yml");
  let alertsYaml = "";
  try {
    alertsYaml = fs.readFileSync(alertsPath, "utf-8");
  } catch {
    return "# Incident Response Runbook\n\nNo alert rules found at monitoring/prometheus/alerts/banking.yml.\n";
  }

  // Parse alert names and annotations from YAML
  const alertBlocks = alertsYaml.split("- alert:").slice(1);

  const sections = alertBlocks.map((block) => {
    const nameMatch = block.match(/^\s*(\S+)/);
    const name = nameMatch?.[1] ?? "Unknown";
    const severityMatch = block.match(/severity:\s*(\w+)/);
    const severity = severityMatch?.[1] ?? "unknown";
    const summaryMatch = block.match(/summary:\s*"([^"]+)"/);
    const summary = summaryMatch?.[1] ?? "";
    const descMatch = block.match(/description:\s*"([^"]+)"/);
    const description = descMatch?.[1] ?? "";
    const exprMatch = block.match(/expr:\s*(.+)/);
    const expr = exprMatch?.[1]?.trim() ?? "";

    return `## ${name}

**Severity:** ${severity}
**Summary:** ${summary}
${description ? `**Description:** ${description}` : ""}

### Detection

\`\`\`promql
${expr}
\`\`\`

### Immediate Actions

1. Check the Grafana dashboard for the affected metric
2. Review recent deployments or configuration changes
3. Check application logs: \`kubectl logs -l app=banking-platform --tail=100\`
4. Verify database connectivity: \`pg_isready -h <db-host>\`

### Escalation

- **P1 (critical):** Page on-call engineer immediately, notify engineering lead
- **P2 (warning):** Create incident ticket, notify team in #ops channel
- **P3 (info):** Log for review in next standup

### Resolution Checklist

- [ ] Root cause identified
- [ ] Fix deployed or rollback completed
- [ ] Monitoring confirms metrics back to normal
- [ ] Post-incident review scheduled (for P1/P2)
`;
  });

  return `# Incident Response Runbook

> Auto-generated from \`monitoring/prometheus/alerts/banking.yml\`
> Generated: ${new Date().toISOString()}

${sections.join("\n---\n\n")}`;
}

// ---------------------------------------------------------------------------
// 2. Adapter Troubleshooting Guide
// ---------------------------------------------------------------------------

function generateAdapterGuide(): string {
  const adaptersDir = path.join(ROOT, "supabase/functions/_shared/adapters");
  let domains: string[] = [];
  try {
    domains = fs.readdirSync(adaptersDir).filter((f) => {
      const fullPath = path.join(adaptersDir, f);
      return fs.statSync(fullPath).isDirectory() && f !== "node_modules";
    });
  } catch {
    return "# Adapter Troubleshooting Guide\n\nNo adapters directory found.\n";
  }

  const sections = domains.map((domain) => {
    const registryPath = path.join(adaptersDir, domain, "registry.ts");
    const typesPath = path.join(adaptersDir, domain, "types.ts");
    const hasRegistry = fs.existsSync(registryPath);
    const hasTypes = fs.existsSync(typesPath);

    // Try to extract provider names from registry
    let providers: string[] = [];
    if (hasRegistry) {
      try {
        const content = fs.readFileSync(registryPath, "utf-8");
        const providerMatches = content.match(/['"](\w+-adapter)['"]/g);
        if (providerMatches) {
          providers = providerMatches.map((m) => m.replace(/['"]/g, ""));
        }
      } catch {
        // Ignore read errors
      }
    }

    return `## ${domain}

**Registry:** ${hasRegistry ? "Yes" : "No"}
**Types:** ${hasTypes ? "Yes" : "No"}
${providers.length > 0 ? `**Known Providers:** ${providers.join(", ")}` : ""}

### Health Check

\`\`\`bash
curl -X POST <SUPABASE_URL>/functions/v1/gateway \\
  -H "Authorization: Bearer <SERVICE_KEY>" \\
  -d '{"action": "adapters.setup.healthcheck", "params": {"domain": "${domain}"}}'
\`\`\`

### Common Issues

1. **Connection timeout:** Verify network connectivity and firewall rules to provider API
2. **Authentication failure:** Check API credentials in \`firm_integrations\` table
3. **Rate limiting:** Review provider rate limits, check \`rate_limits\` table
4. **Data format mismatch:** Compare request/response with provider API docs

### Environment Variables

Check for \`${domain.toUpperCase().replace(/-/g, "_")}_*\` environment variables.

### Escalation

- Check provider status page
- Contact provider support with request IDs
- Review adapter logs in Supabase dashboard
`;
  });

  return `# Adapter Troubleshooting Guide

> Auto-generated from \`supabase/functions/_shared/adapters/\`
> Generated: ${new Date().toISOString()}
> Adapter domains: ${domains.length}

${sections.join("\n---\n\n")}`;
}

// ---------------------------------------------------------------------------
// 3. Backup/Restore SOP
// ---------------------------------------------------------------------------

function generateBackupSOP(): string {
  const backupDir = path.join(ROOT, "scripts/backup");
  const scripts = ["backup-database.sh", "restore-database.sh", "verify-backup.sh"];

  const sections = scripts.map((script) => {
    const scriptPath = path.join(backupDir, script);
    let exists = false;
    try {
      fs.accessSync(scriptPath);
      exists = true;
    } catch {
      exists = false;
    }

    return `## ${script}

**Status:** ${exists ? "Available" : "Not found"}

### Usage

\`\`\`bash
./scripts/backup/${script}
\`\`\`

### When to Use

${script.includes("backup") ? "- Before any go-live deployment\n- Before running data migrations\n- As part of nightly automated backup schedule\n- Before major version upgrades" : ""}
${script.includes("restore") ? "- When recovering from data corruption\n- When rolling back a failed migration\n- When restoring from a specific point in time\n- After a security incident requiring data recovery" : ""}
${script.includes("verify") ? "- After every backup to confirm integrity\n- As part of quarterly disaster recovery testing\n- When validating backup strategy changes" : ""}

### Checklist

- [ ] Confirm target environment and credentials
- [ ] Notify team in #ops channel before executing
- [ ] Verify disk space / storage availability
- [ ] Execute and monitor output
- [ ] Confirm success and update runbook log
`;
  });

  return `# Backup & Restore SOP

> Auto-generated from \`scripts/backup/\`
> Generated: ${new Date().toISOString()}

${sections.join("\n---\n\n")}`;
}

// ---------------------------------------------------------------------------
// 4. Support Escalation Playbook
// ---------------------------------------------------------------------------

function generateEscalationPlaybook(): string {
  return `# Support Escalation Playbook

> Auto-generated
> Generated: ${new Date().toISOString()}

## Severity Levels

| Level | Response Time | Examples |
|-------|--------------|---------|
| P1 — Critical | 15 minutes | Platform down, data breach, payment processing failure |
| P2 — High | 1 hour | Degraded performance, adapter failure, partial outage |
| P3 — Medium | 4 hours | Feature malfunction, UI bugs, non-critical errors |
| P4 — Low | 24 hours | Enhancement requests, cosmetic issues, documentation |

## Escalation Path

### Tier 1 — Institution Support
- Handle: Password resets, account lockouts, basic navigation
- Tools: Admin console, audit log, user management
- Escalate to Tier 2 if: Technical issue, data discrepancy, integration error

### Tier 2 — Platform Operations
- Handle: Adapter issues, data migration problems, configuration changes
- Tools: Supabase dashboard, Grafana, edge function logs
- Escalate to Tier 3 if: Infrastructure issue, security concern, code change required

### Tier 3 — Engineering
- Handle: Bug fixes, infrastructure changes, security incidents
- Tools: Full codebase access, CI/CD, cloud console

## Contact Channels

- **Slack:** #support-escalation (Tier 1), #platform-ops (Tier 2), #engineering-oncall (Tier 3)
- **PagerDuty:** Tier 2+ for P1/P2 incidents
- **Email:** support@fiducia.dev (non-urgent)

## Decision Tree

\`\`\`
Is the platform accessible?
├── No → P1: Page on-call, check infrastructure
└── Yes
    ├── Is a core feature broken (accounts, transfers, auth)?
    │   ├── Yes → P2: Create incident, notify Tier 2
    │   └── No
    │       ├── Is it affecting multiple members?
    │       │   ├── Yes → P3: Create ticket, assign to Tier 2
    │       │   └── No → P4: Log ticket, schedule for review
    └── Is it a security concern?
        └── Yes → P1: Page security team immediately
\`\`\`
`;
}

// ---------------------------------------------------------------------------
// 5. Tenant-Specific Runbook
// ---------------------------------------------------------------------------

function generateTenantRunbook(tenantName: string): string {
  return `# Tenant Runbook — ${tenantName}

> Auto-generated for tenant: ${tenantName}
> Generated: ${new Date().toISOString()}

## Tenant Overview

- **Name:** ${tenantName}
- **Type:** Credit Union / Community Bank
- **Template:** (configured at provisioning)

## Enabled Features

Review the \`firms.features\` JSONB column for this tenant to see which features are active.
Only active adapters and features are relevant for this institution's operations.

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| Institution Admin | (configured) | (configured) |
| Platform Operations | On-call | #platform-ops |
| Engineering | On-call | PagerDuty |

## Go-Live Checklist

- [ ] Tenant provisioned via \`scripts/provision-tenant.ts\`
- [ ] Adapters configured and health-checked
- [ ] Data migration completed and reconciled
- [ ] Smoke tests passed
- [ ] Stakeholder approval obtained
- [ ] DNS cutover completed
- [ ] Post-launch monitoring active (first 24h)
- [ ] Member activation emails sent
- [ ] Support team briefed on institution specifics

## Adapter Configuration

Query current adapter status:

\`\`\`sql
SELECT domain, provider, is_connected, health, last_sync_at
FROM firm_integrations
WHERE firm_id = (SELECT id FROM firms WHERE slug = '${tenantName}');
\`\`\`

## Data Migration History

\`\`\`sql
SELECT label, entity_type, status, total_rows, valid_rows, error_rows, completed_at
FROM migration_batches
WHERE firm_id = (SELECT id FROM firms WHERE slug = '${tenantName}')
ORDER BY created_at DESC;
\`\`\`

## Monitoring

- Grafana dashboard: filter by \`tenant="${tenantName}"\`
- Sentry: filter by tag \`tenant:${tenantName}\`
- Audit log: Admin Console → Audit Log

## Incident History

Document incidents here after resolution:

| Date | Severity | Summary | Resolution |
|------|----------|---------|------------|
| | | | |
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("\nRunbook / SOP Generator");
  console.log("=".repeat(40));

  ensureDir(OUTPUT_DIR);

  writeRunbook("incident-response.md", generateIncidentResponse());
  writeRunbook("adapter-troubleshooting.md", generateAdapterGuide());
  writeRunbook("backup-restore-sop.md", generateBackupSOP());
  writeRunbook("support-escalation.md", generateEscalationPlaybook());

  if (args.tenant) {
    writeRunbook(`tenant-runbook-${args.tenant}.md`, generateTenantRunbook(args.tenant));
  }

  if (args.all) {
    // Generate a generic tenant template
    writeRunbook("tenant-runbook-template.md", generateTenantRunbook("TEMPLATE"));
  }

  console.log(`\nDone. Runbooks written to ${OUTPUT_DIR}/`);
}

main();
