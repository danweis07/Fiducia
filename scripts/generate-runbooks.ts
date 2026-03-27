/**
 * Runbook / SOP Generator
 *
 * Reads codebase artifacts (Prometheus alert definitions, backup scripts)
 * and generates Markdown operational runbooks.
 *
 * Usage:
 *   npx tsx scripts/generate-runbooks.ts --output docs/generated/
 *   npx tsx scripts/generate-runbooks.ts --tenant azfcu --output docs/generated/
 *   npx tsx scripts/generate-runbooks.ts --all
 */

import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// CLI Arguments
// ---------------------------------------------------------------------------

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
  --all            Generate all runbooks including tenant template
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
// Alert Parser
// ---------------------------------------------------------------------------

interface ParsedAlert {
  name: string;
  severity: string;
  summary: string;
  description: string;
  expr: string;
  forDuration: string;
}

function parseAlerts(yamlContent: string): ParsedAlert[] {
  const alertBlocks = yamlContent.split("- alert:").slice(1);

  return alertBlocks.map((block) => {
    const nameMatch = block.match(/^\s*(\S+)/);
    const severityMatch = block.match(/severity:\s*(\w+)/);
    const summaryMatch = block.match(/summary:\s*"([^"]+)"/);
    const descMatch = block.match(/description:\s*"([^"]+)"/);
    const exprMatch = block.match(/expr:\s*(.+)/);
    const forMatch = block.match(/for:\s*(\S+)/);

    return {
      name: nameMatch?.[1] ?? "Unknown",
      severity: severityMatch?.[1] ?? "unknown",
      summary: summaryMatch?.[1] ?? "",
      description: descMatch?.[1] ?? "",
      expr: exprMatch?.[1]?.trim() ?? "",
      forDuration: forMatch?.[1] ?? "",
    };
  });
}

function triageSteps(alert: ParsedAlert): string {
  const name = alert.name;

  if (name === "HighErrorRate") {
    return `1. Open Grafana HTTP overview dashboard and filter to 5xx responses
2. Identify the failing endpoints from access logs
3. Check recent deployments: \`kubectl rollout history deployment/banking-platform\`
4. Review application logs for stack traces: \`kubectl logs -l app=banking-platform --tail=200\`
5. If caused by a bad deploy, rollback: \`kubectl rollout undo deployment/banking-platform\`
6. If caused by downstream dependency, check adapter health via gateway`;
  }
  if (name === "HighLatency") {
    return `1. Check Grafana latency dashboard — identify slow endpoints
2. Review database query performance: check \`pg_stat_statements\` for slow queries
3. Check connection pool usage: \`SELECT count(*) FROM pg_stat_activity;\`
4. Look for lock contention: \`SELECT * FROM pg_locks WHERE NOT granted;\`
5. If query-related, consider adding indexes or optimizing the query
6. If load-related, scale horizontally or enable read replicas`;
  }
  if (name === "GatewayDown") {
    return `1. Verify Supabase project status at https://status.supabase.com
2. Check edge function deployment status: \`npx supabase functions list\`
3. Review edge function logs in Supabase dashboard
4. Attempt redeployment: \`npx supabase functions deploy gateway\`
5. If Supabase infra issue, check for ongoing incidents and notify stakeholders`;
  }
  if (name === "DatabaseConnectionPoolExhausted") {
    return `1. Check active connections: \`SELECT count(*), state FROM pg_stat_activity GROUP BY state;\`
2. Identify long-running queries: \`SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;\`
3. Terminate idle-in-transaction connections older than 5 minutes
4. Review application connection pooling settings (PgBouncer / Supavisor)
5. If persistent, increase \`max_connections\` or add PgBouncer`;
  }
  if (name === "HighTransferFailureRate") {
    return `1. Check recent failed transfers in \`banking_transactions\` table
2. Identify error patterns — are failures from a specific adapter or account type?
3. Verify core banking adapter connectivity via health check endpoint
4. Check for upstream provider outages (FedNow, RTP, ACH processor)
5. If adapter-related, review credentials and rate limits in \`firm_integrations\`
6. Notify affected institutions if outage exceeds 15 minutes`;
  }
  if (name === "RDCProcessingBacklog") {
    return `1. Check RDC queue depth in monitoring dashboard
2. Verify RDC adapter connectivity and API key validity
3. Review processing worker logs for errors
4. Check if upstream provider (Mitek, etc.) has degraded performance
5. If backlog is growing, scale processing workers or pause new submissions`;
  }
  if (name === "WebhookDeliveryBacklog") {
    return `1. Check webhook queue metrics in Grafana
2. Identify failing webhook endpoints (check HTTP status codes in logs)
3. Review retry policies — are retries accumulating?
4. Temporarily pause delivery to failing endpoints
5. Notify affected integration partners of delivery delays`;
  }
  if (name === "KYCVerificationSlow") {
    return `1. Check KYC provider status page for degraded performance
2. Review KYC adapter logs for timeout or error patterns
3. Check if verification volume has spiked (new tenant onboarding?)
4. Consider switching to fallback KYC provider if configured
5. Notify member-facing teams about potential delays in account opening`;
  }
  if (name === "DiskSpaceRunningLow") {
    return `1. Identify largest consumers: \`du -sh /var/lib/postgresql/data/*\`
2. Check for WAL accumulation: \`SELECT pg_wal_size();\`
3. Rotate old backups: review retention in scripts/backup/backup-database.sh
4. Vacuum and analyze tables: \`VACUUM FULL ANALYZE;\`
5. If urgent, expand disk volume or move old data to archive storage`;
  }
  if (name === "MemoryPressure") {
    return `1. Identify high-memory containers: \`kubectl top pods --sort-by=memory\`
2. Check for memory leaks — review container restart count
3. Review recent code changes that may have increased memory usage
4. Adjust resource limits in Helm values if workload has legitimately grown
5. If leak suspected, capture heap dump and analyze`;
  }

  // Generic fallback
  return `1. Check the Grafana dashboard for the affected metric
2. Review recent deployments or configuration changes
3. Check application logs: \`kubectl logs -l app=banking-platform --tail=100\`
4. Verify database connectivity: \`pg_isready -h <db-host>\``;
}

// ---------------------------------------------------------------------------
// 1. Incident Response Runbook
// ---------------------------------------------------------------------------

function generateIncidentResponse(): string {
  const alertsPath = path.join(ROOT, "monitoring/prometheus/alerts/banking.yml");
  let alertsYaml = "";
  try {
    alertsYaml = fs.readFileSync(alertsPath, "utf-8");
  } catch {
    return "# Incident Response Runbook\n\nNo alert rules found at monitoring/prometheus/alerts/banking.yml.\n";
  }

  const alerts = parseAlerts(alertsYaml);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const renderAlert = (alert: ParsedAlert) => `## ${alert.name}

**Severity:** ${alert.severity}
**Summary:** ${alert.summary}
${alert.description ? `**Description:** ${alert.description}` : ""}
**Fires after:** ${alert.forDuration || "immediately"}

### Detection

\`\`\`promql
${alert.expr}
\`\`\`

### Triage & Response

${triageSteps(alert)}

### Escalation

${alert.severity === "critical" ? "- **Immediate:** Page on-call engineer via PagerDuty\n- Notify engineering lead and affected institution contacts\n- Open incident channel in Slack (#incident-YYYYMMDD)" : "- Create incident ticket and assign to platform operations\n- Notify team in #ops channel\n- Schedule review if not resolved within 2 hours"}

### Resolution Checklist

- [ ] Root cause identified
- [ ] Fix deployed or rollback completed
- [ ] Monitoring confirms metrics back to normal
- [ ] Affected institutions notified of resolution
${alert.severity === "critical" ? "- [ ] Post-incident review scheduled within 48 hours" : "- [ ] Findings logged for next standup"}
`;

  return `# Incident Response Runbook

> Auto-generated from \`monitoring/prometheus/alerts/banking.yml\`
> Generated: ${new Date().toISOString()}
> Total alerts: ${alerts.length} (${criticalAlerts.length} critical, ${warningAlerts.length} warning)

## Quick Reference

| Alert | Severity | Summary |
|-------|----------|---------|
${alerts.map((a) => `| ${a.name} | ${a.severity} | ${a.summary} |`).join("\n")}

---

# Critical Alerts

${criticalAlerts.map(renderAlert).join("\n---\n\n")}

---

# Warning Alerts

${warningAlerts.map(renderAlert).join("\n---\n\n")}`;
}

// ---------------------------------------------------------------------------
// 2. Backup & Restore SOP
// ---------------------------------------------------------------------------

function generateBackupSOP(): string {
  const backupDir = path.join(ROOT, "scripts/backup");
  const scripts: { file: string; role: string }[] = [
    { file: "backup-database.sh", role: "backup" },
    { file: "restore-database.sh", role: "restore" },
    { file: "verify-backup.sh", role: "verify" },
  ];

  const sections = scripts.map(({ file, role }) => {
    const scriptPath = path.join(backupDir, file);
    let content = "";
    let exists = false;
    try {
      content = fs.readFileSync(scriptPath, "utf-8");
      exists = true;
    } catch {
      exists = false;
    }

    // Extract environment variables from the script
    const envVars: string[] = [];
    if (exists) {
      const envMatches = content.match(/\$\{(\w+)[\}:]/g);
      if (envMatches) {
        const unique = [...new Set(envMatches.map((m) => m.replace(/[${}:]/g, "")))];
        envVars.push(...unique);
      }
    }

    const whenToUse: Record<string, string> = {
      backup: `- Before any go-live deployment
- Before running data migrations
- As part of nightly automated backup schedule (cron)
- Before major version upgrades
- Before running destructive schema changes`,
      restore: `- When recovering from data corruption
- When rolling back a failed migration
- When restoring from a specific point in time
- After a security incident requiring data recovery
- During disaster recovery drills`,
      verify: `- After every backup to confirm integrity
- As part of quarterly disaster recovery testing
- When validating backup strategy or encryption changes
- After restoring to a staging environment`,
    };

    return `## ${file}

**Status:** ${exists ? "Available" : "Not found"}
${envVars.length > 0 ? `**Required Env Vars:** \`${envVars.join("`, `")}\`` : ""}

### Usage

\`\`\`bash
./scripts/backup/${file}${role === "verify" ? " <backup-file>" : ""}${role === "restore" ? " <backup-file>" : ""}
\`\`\`

### When to Use

${whenToUse[role] ?? ""}

### Pre-Execution Checklist

- [ ] Confirm target environment and credentials
- [ ] Notify team in #ops channel before executing
- [ ] Verify disk space / storage availability
- [ ] For restores: confirm you have a current backup first

### Post-Execution Checklist

- [ ] Verify output for errors
- [ ] ${role === "backup" ? "Run verify-backup.sh against the new backup" : role === "restore" ? "Run verify-backup.sh to confirm data integrity" : "Confirm all critical tables are present and row counts are reasonable"}
- [ ] Update backup log / incident ticket
`;
  });

  return `# Backup & Restore SOP

> Auto-generated from \`scripts/backup/\`
> Generated: ${new Date().toISOString()}

## Overview

The backup system uses \`pg_dump\` for PostgreSQL backups with optional AES-256
encryption and S3 upload. Backups are rotated based on the configured retention
period (default: 30 days).

### Critical Tables

These tables must be present and populated after any restore:

- \`firms\` — tenant configuration
- \`banking_accounts\` — member accounts
- \`banking_transactions\` — transaction history
- \`banking_users\` — member profiles
- \`audit_logs\` — compliance audit trail

---

${sections.join("\n---\n\n")}`;
}

// ---------------------------------------------------------------------------
// 3. Support Escalation Playbook
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
- **Handle:** Password resets, account lockouts, basic navigation
- **Tools:** Admin console, audit log, user management
- **Escalate to Tier 2 if:** Technical issue, data discrepancy, integration error

### Tier 2 — Platform Operations
- **Handle:** Adapter issues, data migration problems, configuration changes
- **Tools:** Supabase dashboard, Grafana, edge function logs
- **Escalate to Tier 3 if:** Infrastructure issue, security concern, code change required

### Tier 3 — Engineering
- **Handle:** Bug fixes, infrastructure changes, security incidents
- **Tools:** Full codebase access, CI/CD, cloud console

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
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("\nRunbook / SOP Generator");
  console.log("=".repeat(40));

  ensureDir(OUTPUT_DIR);

  writeRunbook("incident-response.md", generateIncidentResponse());
  writeRunbook("backup-restore-sop.md", generateBackupSOP());
  writeRunbook("support-escalation.md", generateEscalationPlaybook());

  if (args.tenant) {
    console.log(`\n  Tenant-specific runbook for: ${args.tenant}`);
    writeRunbook(
      `tenant-runbook-${args.tenant}.md`,
      `# Tenant Runbook — ${args.tenant}\n\n> Generated: ${new Date().toISOString()}\n\nRefer to the incident-response.md and backup-restore-sop.md runbooks for operational procedures.\n`
    );
  }

  if (args.all) {
    writeRunbook(
      "tenant-runbook-template.md",
      `# Tenant Runbook — TEMPLATE\n\n> Generated: ${new Date().toISOString()}\n\nCopy this file and fill in tenant-specific details when onboarding a new institution.\n`
    );
  }

  const generatedCount = 3 + (args.tenant ? 1 : 0) + (args.all ? 1 : 0);
  console.log(`\nDone. ${generatedCount} runbooks written to ${OUTPUT_DIR}/`);
}

main();
