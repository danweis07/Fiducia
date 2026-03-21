#!/usr/bin/env npx tsx
/**
 * Recipe: Admin Portal
 *
 * Exercises admin-only endpoints — user management, account overview,
 * audit logs, and integration health monitoring.
 *
 * Run:  npx tsx scripts/recipes/admin-portal.ts
 */

import { call, show, heading } from "./helpers";

heading("Admin Portal Recipe");

// 1. List all users (admin view)
const users = call("admin.users");
show("admin.users — All platform users", users);

// 2. All accounts across tenants (admin view)
const accounts = call("admin.accounts");
show("admin.accounts — All accounts (admin)", accounts);

// 3. Audit log
const auditLog = call("admin.audit-log");
show("admin.audit-log — Recent audit events", auditLog);

// 4. Integration health status
const integrations = call("admin.integrations");
show("admin.integrations — Integration health", integrations);

// 5. Compliance / KYC status
const kyc = call("compliance.kyc-status");
show("compliance.kyc-status — KYC verification", kyc);

// 6. Incident management
const incidents = call("incidents.list");
show("incidents.list — Security incidents", incidents);

console.log("\nDone! Admin panel data shapes are ready for your dashboards.\n");
