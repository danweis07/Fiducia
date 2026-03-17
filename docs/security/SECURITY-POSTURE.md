# Fiducia Platform — Security Posture Assessment

> Living document covering the platform's security controls, OWASP alignment, and operational security practices.
> Last updated: 2026-03-17

## 1. OWASP Top 10 (2021) Mapping

### A01: Broken Access Control
| Control | Implementation | Evidence |
|---|---|---|
| Tenant isolation | PostgreSQL RLS on every banking table via `firm_id` | `supabase/migrations/` — all tables include `ENABLE ROW LEVEL SECURITY` |
| Role-based access | `AdminProtectedRoute` component, RBAC roles in `profiles.role` | `src/components/admin/AdminProtectedRoute.tsx` |
| Route protection | Lazy-loaded admin routes behind auth guard | `src/routes/adminRoutes.tsx` |
| API authorization | Edge function gateway validates JWT + tenant context | `supabase/functions/gateway/` |
| Service-role tables | Control plane tables (`tenant_registry`, `tenant_deployment_log`) restricted to service role | `supabase/migrations/035_tenant_registry.sql` |

### A02: Cryptographic Failures
| Control | Implementation |
|---|---|
| Encryption at rest | Supabase-managed PostgreSQL encryption (AES-256) |
| Encryption in transit | TLS 1.2+ enforced on all endpoints |
| Backup encryption | AES-256-CBC with key rotation, per `scripts/backup/` |
| Secrets storage | Environment variables only; `.env.local` in `.gitignore`; no secrets in codebase |
| JWT tokens | Supabase Auth issues short-lived JWTs with audience scoping |

### A03: Injection
| Control | Implementation |
|---|---|
| SQL injection | Supabase client uses parameterized queries; no raw SQL in frontend |
| Input validation | Zod schemas on all form inputs via `react-hook-form` integration |
| XSS prevention | React's automatic JSX escaping; no `dangerouslySetInnerHTML` in banking components |
| Command injection | Edge functions run in Deno isolates with restricted permissions |

### A04: Insecure Design
| Control | Implementation |
|---|---|
| Adapter pattern | External integrations auto-detect credentials; missing creds → safe mock fallback |
| Feature flags | Per-tenant experiment system (`src/pages/admin/Experiments.tsx`) |
| Approval workflows | JIT permission escalation requires approval for high-value operations |
| Rate limiting | Client-side throttle + circuit breaker in `src/lib/gateway/throttle.ts` |

### A05: Security Misconfiguration
| Control | Implementation |
|---|---|
| Environment config | All secrets via env vars; demo mode uses zero external dependencies |
| CORS | Configured per-tenant at Supabase project level |
| Default credentials | No default admin accounts; all users created through onboarding flow |
| Error exposure | Sentry captures errors server-side; frontend shows generic messages via ErrorBoundary |

### A06: Vulnerable and Outdated Components
| Control | Implementation |
|---|---|
| Dependency scanning | `npm audit` in CI pipeline |
| Lock file integrity | `package-lock.json` committed; deterministic installs |
| Runtime isolation | Deno edge functions sandboxed; Node.js dev server |
| Update cadence | Quarterly dependency review; critical CVEs patched within 48h |

### A07: Identification and Authentication Failures
| Control | Implementation |
|---|---|
| Authentication | Supabase Auth with email/password, magic link, and SSO |
| MFA | TOTP-based MFA configurable per tenant (`src/pages/admin/TenantSettings.tsx`) |
| Session management | JWT refresh tokens with configurable expiry |
| SSO | SAML/OIDC configuration via `src/pages/admin/SSOConfiguration.tsx` |
| SCA (EU) | Strong Customer Authentication support for PSD2 compliance |

### A08: Software and Data Integrity Failures
| Control | Implementation |
|---|---|
| Audit logging | 49+ action types tracked in `audit_logs` table (`src/services/auditLogger.ts`) |
| Approval gates | Change requests require approval before deployment |
| Deployment checksums | Git SHA recorded in `tenant_deployment_log` for every deployment |
| Incident rollback | Automated rollback capability with pre/post health snapshots |

### A09: Security Logging and Monitoring Failures
| Control | Implementation |
|---|---|
| Error tracking | Sentry integration with source maps (`src/lib/services/errors/`) |
| Distributed tracing | OpenTelemetry instrumentation |
| Metrics | Prometheus exporters + Grafana dashboards (`monitoring/`) |
| Alerting | AlertManager rules for latency, error rates, resource usage |
| Audit trail | Immutable audit log with batch insert optimization |

### A10: Server-Side Request Forgery (SSRF)
| Control | Implementation |
|---|---|
| Edge function isolation | Deno runtime with explicit permissions |
| Allowlisted endpoints | External API calls restricted to configured adapter URLs |
| No user-controlled URLs | File uploads go through Supabase Storage, not arbitrary URLs |

## 2. Secrets Management

- **Zero secrets in code**: All credentials loaded from environment variables
- **Supabase Vault**: Available for tenant-specific secret storage
- **Git guardrails**: `.env.local`, `.env.*.local` in `.gitignore`
- **Demo mode**: `VITE_DEMO_MODE=true` requires zero external credentials
- **Edge function secrets**: Set via `supabase secrets set` CLI, never committed

## 3. Row-Level Security (RLS) Coverage

Every tenant-facing table enforces RLS with `firm_id` scoping:

| Layer | Tables | Policy |
|---|---|---|
| Banking core | accounts, transactions, beneficiaries, loans, cards | `firm_id = current_setting('app.current_tenant')` |
| Compliance | compliance_incidents, compliance_sync_log, audit_logs | Same tenant policy |
| Business | invoices, sweep_rules, approval_requests, treasury_vaults | Same tenant policy |
| Operations | incidents, deployment_rollbacks, change_requests | Same tenant policy |
| Control plane | tenant_registry, tenant_deployment_log | Service role only (no app-level access) |

## 4. Multi-Factor Authentication

- **Implementation**: Supabase Auth MFA (TOTP factors)
- **Tenant configuration**: Admins can require MFA for all users or specific roles
- **Approval workflows**: `requireMfa` flag on approval policies for high-value operations
- **Session escalation**: MFA challenge before sensitive operations (wire transfers, limit changes)

## 5. KYC/AML Completeness

### KYC (Know Your Customer)
- Onboarding verification workflow in `src/pages/admin/TenantOnboarding.tsx`
- Adapter pattern supports multiple KYC providers (Jumio, Onfido, Socure)
- Document verification + liveness check capabilities
- Demo mode provides mock KYC verification flow

### AML (Anti-Money Laundering)
- Transaction monitoring via compliance adapter
- SAR (Suspicious Activity Report) filing support
- CTR (Currency Transaction Report) threshold monitoring
- CDD/EDD (Customer Due Diligence) workflows
- Compliance dashboard: `src/pages/admin/ComplianceCenter.tsx`

## 6. CVE Response Process

1. **Detection**: Automated `npm audit` in CI; GitHub Dependabot alerts
2. **Triage**: Within 24h — assess severity and exploitability in our context
3. **Critical CVEs**: Patch within 48h; emergency deployment via `scripts/deploy.sh`
4. **High CVEs**: Patch within 1 week; standard deployment cycle
5. **Medium/Low**: Batch with next quarterly dependency update
6. **Tracking**: CVE responses logged in `compliance_incidents` table

## 7. Infrastructure Security

| Layer | Provider | Controls |
|---|---|---|
| CDN/Edge | Cloudflare | WAF rules, DDoS protection, TLS termination |
| Compute | Supabase Edge Functions (Deno) | Sandboxed runtime, no filesystem access |
| Database | Supabase PostgreSQL | RLS, encrypted at rest, automated backups |
| Storage | Supabase Storage | Bucket policies, signed URLs, virus scanning |
| Monitoring | Prometheus + Grafana | `monitoring/` config files |
| Alerting | AlertManager + PagerDuty/Slack | `monitoring/alertmanager/` |
| Backup | AES-256-CBC encrypted, S3 | 30-day retention, `scripts/backup/` |
