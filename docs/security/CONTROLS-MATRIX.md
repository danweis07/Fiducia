# Fiducia Platform — Security Controls Matrix

> Maps control objectives to implementations with evidence pointers and compliance status.

## Control Categories

### AC — Access Control

| ID    | Control Objective         | Implementation                                                    | Evidence Location                                       | Status   |
| ----- | ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| AC-01 | Tenant data isolation     | PostgreSQL RLS on all tables with `firm_id` policy                | `supabase/migrations/*.sql`                             | Complete |
| AC-02 | Role-based access control | Admin/Owner/Member roles enforced at route and API level          | `apps/web/src/components/admin/AdminProtectedRoute.tsx` | Complete |
| AC-03 | Admin route protection    | Lazy-loaded routes behind authentication guard                    | `apps/web/src/routes/adminRoutes.tsx`                   | Complete |
| AC-04 | API authorization         | JWT validation + tenant context in edge functions                 | `supabase/functions/gateway/`                           | Complete |
| AC-05 | Service-role separation   | Control plane tables restricted to service role only              | `supabase/migrations/035_tenant_registry.sql`           | Complete |
| AC-06 | Session management        | Short-lived JWT with refresh token rotation                       | Supabase Auth configuration                             | Complete |
| AC-07 | Least privilege           | Users start with minimal permissions; elevation requires approval | `apps/web/src/hooks/useApprovals.ts`                    | Complete |

### AU — Audit and Accountability

| ID    | Control Objective       | Implementation                                                 | Evidence Location                         | Status   |
| ----- | ----------------------- | -------------------------------------------------------------- | ----------------------------------------- | -------- |
| AU-01 | Action audit logging    | 49+ action types tracked with structured metadata              | `apps/web/src/services/auditLogger.ts`    | Complete |
| AU-02 | Audit log integrity     | Append-only table with timestamp; no delete capability exposed | `supabase/migrations/` (audit_logs table) | Complete |
| AU-03 | Audit log UI            | Searchable, filterable admin view with CSV/JSON export         | `apps/web/src/pages/admin/AuditLog.tsx`   | Complete |
| AU-04 | Deployment tracking     | Every deployment recorded with git SHA, duration, status       | `tenant_deployment_log` table             | Complete |
| AU-05 | Change request tracking | Full lifecycle: request → approve → test → deploy → monitor    | `change_requests` table                   | Complete |
| AU-06 | Incident timeline       | Immutable JSONB timeline entries for each incident             | `incidents` table                         | Complete |

### CR — Cryptography

| ID    | Control Objective     | Implementation                                   | Evidence Location       | Status   |
| ----- | --------------------- | ------------------------------------------------ | ----------------------- | -------- |
| CR-01 | Encryption in transit | TLS 1.2+ on all external connections             | Infrastructure config   | Complete |
| CR-02 | Encryption at rest    | Supabase-managed AES-256 database encryption     | Supabase platform       | Complete |
| CR-03 | Backup encryption     | AES-256-CBC with configurable key rotation       | `scripts/backup/`       | Complete |
| CR-04 | Token security        | JWT with RS256 signatures, configurable expiry   | Supabase Auth           | Complete |
| CR-05 | Secret management     | Environment variables only; no hardcoded secrets | `.gitignore`, CLAUDE.md | Complete |

### IA — Identification and Authentication

| ID    | Control Objective              | Implementation                                        | Evidence Location                                               | Status   |
| ----- | ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- | -------- |
| IA-01 | User authentication            | Email/password, magic link, SSO (SAML/OIDC)           | Supabase Auth + `apps/web/src/pages/admin/SSOConfiguration.tsx` | Complete |
| IA-02 | Multi-factor authentication    | TOTP-based MFA with per-tenant enforcement            | `apps/web/src/pages/admin/TenantSettings.tsx`                   | Complete |
| IA-03 | Strong Customer Authentication | SCA support for EU PSD2 payment authorization         | Payment adapter layer                                           | Complete |
| IA-04 | API authentication             | Service account tokens with rate limiting             | `apps/web/src/pages/admin/ApiTokens.tsx`                        | Complete |
| IA-05 | KYC verification               | Identity verification workflow with provider adapters | Adapter pattern in `apps/web/src/lib/`                          | Complete |

### IR — Incident Response

| ID    | Control Objective        | Implementation                                           | Evidence Location                                  | Status   |
| ----- | ------------------------ | -------------------------------------------------------- | -------------------------------------------------- | -------- |
| IR-01 | Incident detection       | Prometheus alerts + Sentry + health checks               | `monitoring/`, `apps/web/src/lib/services/errors/` | Complete |
| IR-02 | Incident management      | Full lifecycle tracking (detect → investigate → resolve) | `apps/web/src/pages/admin/IncidentManager.tsx`     | Complete |
| IR-03 | Deployment rollback      | Automated rollback with health snapshots                 | `deployment_rollbacks` table                       | Complete |
| IR-04 | Stakeholder notification | Multi-channel notification (Slack, email, SMS, push)     | Notification service integration                   | Complete |
| IR-05 | Post-incident review     | Postmortem URL tracking, timeline reconstruction         | `incidents.postmortem_url`, `incidents.timeline`   | Complete |

### CM — Configuration Management

| ID    | Control Objective      | Implementation                                 | Evidence Location                                                     | Status   |
| ----- | ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------- | -------- |
| CM-01 | Change management      | Change request workflow with approval gates    | `change_requests` table, `apps/web/src/pages/admin/ChangeTracker.tsx` | Complete |
| CM-02 | Deployment management  | CI/CD with multi-tenant deployment scripts     | `scripts/deploy.sh`, `scripts/deploy-all-tenants.sh`                  | Complete |
| CM-03 | Version tracking       | Platform version tracked per tenant            | `tenant_registry.last_migration_version`                              | Complete |
| CM-04 | Feature flags          | Per-tenant experiment system                   | `apps/web/src/pages/admin/Experiments.tsx`                            | Complete |
| CM-05 | Infrastructure as code | Helm charts, cloud configs, monitoring configs | `helm/`, `deploy/`, `monitoring/`                                     | Complete |

### SC — System and Communications Protection

| ID    | Control Objective  | Implementation                            | Evidence Location                                                                     | Status   |
| ----- | ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| SC-01 | Rate limiting      | Client-side throttle + circuit breaker    | `apps/web/src/lib/gateway/throttle.ts`, `apps/web/src/lib/gateway/circuit-breaker.ts` | Complete |
| SC-02 | Input validation   | Zod schemas for all form inputs           | Various form components                                                               | Complete |
| SC-03 | Error handling     | ErrorBoundary components + Sentry capture | `apps/web/src/components/ErrorBoundary.tsx`                                           | Complete |
| SC-04 | DDoS protection    | Cloudflare WAF + rate limiting            | Infrastructure config                                                                 | Complete |
| SC-05 | CORS configuration | Per-tenant CORS at Supabase project level | Supabase configuration                                                                | Complete |

### DP — Data Protection

| ID    | Control Objective   | Implementation                                | Evidence Location                                       | Status   |
| ----- | ------------------- | --------------------------------------------- | ------------------------------------------------------- | -------- |
| DP-01 | Data classification | PII, financial, operational data categorized  | Architecture documentation                              | Complete |
| DP-02 | Data residency      | Per-tenant region configuration               | `tenant_registry.region`                                | Complete |
| DP-03 | Data export (DSAR)  | Admin data export functionality               | `apps/web/src/pages/admin/DataExport.tsx`               | Complete |
| DP-04 | Data retention      | Configurable retention policies per data type | Backup and retention scripts                            | Complete |
| DP-05 | Consent management  | Open banking consent tracking with revocation | `supabase/migrations/20260316_open_banking_consent.sql` | Complete |

## Compliance Framework Mapping

| Control                   | SOC 2 | ISO 27001 | PCI DSS | NIST 800-53 |
| ------------------------- | ----- | --------- | ------- | ----------- |
| AC-01 Tenant isolation    | CC6.1 | A.9.4     | 7.1     | AC-3        |
| AU-01 Audit logging       | CC7.2 | A.12.4    | 10.2    | AU-2        |
| CR-01 Encryption transit  | CC6.7 | A.10.1    | 4.1     | SC-8        |
| CR-02 Encryption rest     | CC6.1 | A.10.1    | 3.4     | SC-28       |
| IA-01 Authentication      | CC6.1 | A.9.2     | 8.1     | IA-2        |
| IA-02 MFA                 | CC6.1 | A.9.4     | 8.3     | IA-2(1)     |
| IR-01 Incident detection  | CC7.3 | A.16.1    | 12.10   | IR-4        |
| CM-01 Change management   | CC8.1 | A.12.1    | 6.4     | CM-3        |
| SC-01 Rate limiting       | CC6.6 | A.13.1    | 6.6     | SC-5        |
| DP-01 Data classification | CC6.5 | A.8.2     | 9.6     | RA-2        |
