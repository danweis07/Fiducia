# Security Policy

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

This is a financial services platform. We take security seriously and ask that you report vulnerabilities responsibly.

### How to Report

1. **Preferred:** Use [GitHub Security Advisories](https://github.com/danweis07/Fiducia/security/advisories/new) to report privately.
2. **Alternative:** Email security concerns to the repository maintainers listed in [CODEOWNERS](CODEOWNERS).

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected components (frontend, edge functions, database, adapters, etc.)
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 5 business days
- **Fix or mitigation:** depends on severity, but we aim for:
  - Critical/High: patch within 7 days
  - Medium: patch within 30 days
  - Low: next scheduled release

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest `main` | Yes |
| Older releases | Best effort |

## Security Practices

### What's in Place

- **Authentication:** Supabase Auth with JWT, RLS (Row Level Security) on all tables
- **Authorization:** Role-based access control, tenant isolation via RLS policies
- **Input validation:** Zod schemas for form inputs, server-side validation in edge functions
- **Security headers:** X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy (configured in nginx, Vercel, and edge middleware)
- **Dependency scanning:** Dependabot enabled for npm and GitHub Actions
- **Static analysis:** CodeQL workflow available for code scanning
- **Secret scanning:** GitHub secret scanning workflow available
- **Container scanning:** Trivy/Grype workflow available for Docker images
- **DAST:** OWASP ZAP workflow available for dynamic testing
- **Audit logging:** All sensitive operations logged to `audit_logs` table
- **Rate limiting:** Configurable per-tenant rate limits
- **Pre-commit hooks:** Husky + lint-staged to catch issues before push

### For Deployers

When deploying to production, ensure:

- [ ] `VITE_DEMO_MODE` is set to `false`
- [ ] All Supabase RLS policies are verified for your tenant configuration
- [ ] Supabase anon key is the *public* key (not the service role key) in frontend code
- [ ] Service role key is only used in edge functions, never exposed to the client
- [ ] Security headers are active (check with [securityheaders.com](https://securityheaders.com))
- [ ] Enable the security scanning workflows in `.github/workflows-available/`:
  - `codeql-analysis.yml` — static analysis
  - `dependency-audit.yml` — dependency vulnerabilities
  - `container-scan.yml` — Docker image CVEs
  - `secret-scanning.yml` — leaked credentials
  - `dast-zap.yml` — runtime vulnerability scanning
- [ ] Rotate all default credentials and secrets
- [ ] Configure Sentry DSN for error monitoring
- [ ] Review and tighten CSP for your specific domain

### Sensitive Files

The following are excluded from version control via `.gitignore`:

- `.env`, `.env.local`, `.env.*.local` — environment variables and secrets
- `coverage/` — test coverage reports
- `node_modules/` — dependencies

Never commit API keys, passwords, or tokens to the repository.

## SBOM (Software Bill of Materials)

An SBOM generation workflow is available at `.github/workflows-available/sbom.yml`. Enable it to produce CycloneDX or SPDX SBOMs for compliance and supply chain auditing.
