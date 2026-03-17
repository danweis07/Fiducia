# Production Deployment Checklist

Use this checklist before deploying to a production environment. Not all items apply to every deployment — skip items marked "if applicable".

## Pre-Deployment

### Environment Configuration

- [ ] `VITE_DEMO_MODE` is set to `false`
- [ ] `VITE_SUPABASE_URL` points to production Supabase project
- [ ] `VITE_SUPABASE_ANON_KEY` is the production **public** anon key (never the service role key)
- [ ] Service role key is configured only in edge functions (server-side), never exposed to the client
- [ ] `VITE_APP_ENV` is set to `production`
- [ ] `VITE_APP_VERSION` is set to the release version
- [ ] All secrets are stored in a secrets manager (Vault, AWS Secrets Manager) — not in `.env` files on servers

### Supabase / Database

- [ ] All migrations have been applied (`supabase db push` or via Docker entrypoint)
- [ ] RLS (Row Level Security) is enabled on all tables
- [ ] RLS policies have been reviewed for the tenant configuration
- [ ] Default demo seed data has been removed or replaced with production data
- [ ] Database backups are configured (point-in-time recovery or scheduled dumps)
- [ ] Connection pooling is enabled (PgBouncer or Supabase's built-in pooler)

### Authentication

- [ ] Demo user (`demo@fiducia.dev`) is disabled or removed
- [ ] Password policies are configured per institutional requirements (see `032_password_policies.sql`)
- [ ] Rate limiting is enabled for auth endpoints
- [ ] SSO providers are configured (if applicable)
- [ ] JWT expiry and refresh token lifetimes are set appropriately

### Security

- [ ] Security headers are active — verify with [securityheaders.com](https://securityheaders.com):
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - Content-Security-Policy (tighten to your specific domains)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy
- [ ] HTTPS is enforced (no HTTP fallback)
- [ ] CORS is restricted to your specific domains
- [ ] API rate limiting is configured per tenant
- [ ] Audit logging is active and writes to `audit_logs` table
- [ ] All default passwords/credentials have been rotated

### Monitoring & Observability

- [ ] Sentry DSN is configured (`VITE_SENTRY_DSN`)
- [ ] Sentry trace sample rate is set appropriately for production (0.1 - 0.3 recommended)
- [ ] Prometheus/Grafana monitoring is deployed (or equivalent APM)
- [ ] Alertmanager alerts are configured for:
  - Error rate spikes
  - Latency thresholds
  - Core banking adapter failures
  - Database connection pool exhaustion
- [ ] Logging is structured (JSON) and shipped to a log aggregator

### CI/CD

- [ ] CI workflow is active (`.github/workflows/ci.yml`)
- [ ] Enable additional security workflows as needed:
  - `codeql-analysis.yml` — static code analysis
  - `dependency-audit.yml` — dependency vulnerability scanning
  - `container-scan.yml` — Docker image CVE scanning
  - `secret-scanning.yml` — leaked credential detection
  - `dast-zap.yml` — OWASP ZAP dynamic testing
  - `sbom.yml` — Software Bill of Materials
- [ ] Deploy pipeline has staging/QA gate before production
- [ ] Rollback plan is documented and tested

### Integration Adapters

- [ ] Core banking adapter is configured with production credentials
- [ ] Adapter fallback behavior is set to **fail** (not mock) in production
- [ ] Webhook signing secret is configured (`WEBHOOK_SIGNING_SECRET`)
- [ ] OAuth tokens for integrations are provisioned and refresh is working
- [ ] Payment rail adapters (ACH, wire, FedNow/RTP) are tested end-to-end with the provider's sandbox before going live

### Performance

- [ ] Production build passes (`npm run build`)
- [ ] Assets are served with immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`)
- [ ] CDN is configured in front of static assets
- [ ] Load testing has been run against staging (see `load-tests/k6/`)
- [ ] Image/font assets are optimized

### Compliance (if applicable)

- [ ] Run `./scripts/compliance-check.sh` and address findings
- [ ] GDPR/LGPD consent flow is configured for your region
- [ ] Data residency requirements are met (tenant data stays in the correct region)
- [ ] Privacy policy and terms of service pages are populated
- [ ] Cookie consent provider is configured (`VITE_CONSENT_PROVIDER`)

## Post-Deployment

- [ ] Smoke test core flows: login, view accounts, make a transfer, view statements
- [ ] Verify Sentry is receiving events (trigger a test error)
- [ ] Verify monitoring dashboards show traffic
- [ ] Verify audit logs are being written
- [ ] Verify realtime subscriptions are working (account balance updates)
- [ ] Run E2E tests against production URL (read-only subset)
- [ ] Document the deployment: version, date, config changes, known issues

## Tenant Provisioning

For each new tenant:

```bash
npx tsx scripts/provision-tenant.ts \
  --name "Institution Name" \
  --subdomain "inst" \
  --region "us-east-1" \
  --template "us-credit-union" \
  --admin-email "admin@institution.org"
```

- [ ] Tenant branding (logo, colors, favicon) is configured
- [ ] Tenant-specific feature flags are set
- [ ] Tenant-specific adapter credentials are provisioned
- [ ] Tenant admin user has been created and verified
- [ ] DNS for tenant subdomain is configured
