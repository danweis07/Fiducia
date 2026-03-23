# Fiducia Platform — US Regulatory Compliance Framework

> Comprehensive mapping of Fiducia platform controls to US regulatory requirements for credit unions and community banks.
> Intended audience: NCUA examiners, state regulators, compliance officers, internal auditors.
> Last updated: 2026-03-17

---

## 1. Regulatory Landscape

Fiducia serves federally insured credit unions and state-chartered community banks. The following agencies have direct supervisory authority over institutions running on the platform:

| Agency               | Jurisdiction                                                             | Relevance to Fiducia                                                                              |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **NCUA**             | Federal credit unions, federally insured state-chartered CUs             | Primary examiner for most Fiducia tenants; AIRES exam methodology                                 |
| **CFPB**             | Consumer financial protection (assets > $10B direct; all via rulemaking) | Reg E, Reg Z, UDAAP — enforced through platform transaction workflows                             |
| **FFIEC**            | Interagency IT examination standards                                     | IT Handbook booklets govern information security, audit, BCP, operations                          |
| **FinCEN**           | BSA/AML enforcement                                                      | SAR/CTR filing, CDD, beneficial ownership — supported via compliance adapter                      |
| **FDIC**             | State-chartered non-Fed-member banks                                     | Examination standards parallel to NCUA for bank tenants                                           |
| **State regulators** | State-chartered CUs and banks                                            | Varying requirements; Fiducia's configurable compliance profiles accommodate state-specific rules |
| **OCC**              | National banks (if applicable)                                           | Heightened standards for third-party risk; Fiducia provides SOC 2 Type II artifacts               |

Fiducia is classified as a Technology Service Provider (TSP) under FFIEC guidelines. The platform maintains examination-ready documentation and supports examiner access to audit logs, system descriptions, and control evidence.

---

## 2. NCUA Examiner Alignment

### 2.1 AIRES Examination Focus Areas

The Automated Integrated Regulatory Examination System (AIRES) structures NCUA exams around risk categories. The following table maps AIRES focus areas to Fiducia platform capabilities:

| AIRES Focus Area     | Examiner Expectation                                  | Fiducia Control                                                          | Evidence Location                                                                   |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Information Security | Access controls, encryption, vulnerability management | RLS tenant isolation, AES-256 encryption at rest/in transit, JWT auth    | `supabase/migrations/*.sql`, infrastructure config                                  |
| Transaction Risk     | Authorization controls, fraud detection               | Approval workflows, MFA escalation for high-value transactions           | `apps/web/src/hooks/useApprovals.ts`, `apps/web/src/pages/admin/TenantSettings.tsx` |
| BSA/AML              | SAR/CTR processes, suspicious activity monitoring     | ComplianceCenter with AML alerts, transaction monitoring adapter         | `apps/web/src/pages/admin/ComplianceCenter.tsx`                                     |
| Vendor Management    | TSP oversight, contract review                        | SOC 2 Type II report, penetration test results, SLA dashboards           | `docs/security/CONTROLS-MATRIX.md`                                                  |
| Business Continuity  | Disaster recovery, backup testing                     | Encrypted backups (AES-256-CBC), deployment rollback, health snapshots   | `scripts/backup/`, `deployment_rollbacks` table                                     |
| Change Management    | Software change controls, testing                     | Change request workflow with approval gates, deployment log with git SHA | `change_requests` table, `tenant_deployment_log` table                              |
| Audit Trail          | Comprehensive logging, log integrity                  | 49+ audited action types, append-only audit log, searchable admin UI     | `apps/web/src/services/auditLogger.ts`, `apps/web/src/pages/admin/AuditLog.tsx`     |

### 2.2 Call Report Alignment

Fiducia's data model aligns with NCUA 5300 Call Report categories. Account types, loan classifications, and share categories are mapped to standard Call Report line items through the core banking adapter layer. Tenants configure their specific Chart of Accounts mapping during onboarding via `apps/web/src/pages/admin/TenantOnboarding.tsx`.

### 2.3 Examiner Access Provisions

- **Read-only examiner role**: Configurable role grants examiners access to audit logs, compliance reports, and system configuration without modification privileges.
- **Audit log export**: CSV and JSON export from the admin Audit Log page for offline analysis.
- **System description packet**: Generated from platform metadata, including architecture diagrams, data flow maps, and control narratives.

---

## 3. CFPB Compliance

### 3.1 Regulation E — Electronic Fund Transfers

| Reg E Requirement                               | Fiducia Implementation                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Initial disclosures (12 CFR 1005.7)             | Tenant-configurable disclosure templates served during account enrollment                                  |
| Periodic statements (12 CFR 1005.9)             | Transaction history with all required data fields; exportable statements                                   |
| Error resolution (12 CFR 1005.11)               | Dispute workflow with 10-business-day provisional credit tracking, 45-day investigation timeline           |
| Unauthorized transfer liability (12 CFR 1005.6) | Fraud alert triggers in transaction monitoring; notification timestamps logged for liability determination |
| Preauthorized transfers (12 CFR 1005.10)        | Recurring payment management with stop-payment capability and member notification                          |
| Receipt requirements (12 CFR 1005.9(a))         | Electronic receipts generated for all POS and ATM transactions via adapter                                 |

Error resolution timelines are enforced programmatically. The platform tracks dispute creation date, provisional credit issuance, investigation milestones, and final resolution with full audit trail.

### 3.2 Regulation Z — Truth in Lending

| Reg Z Requirement   | Fiducia Implementation                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| APR disclosure      | Loan origination workflow calculates and displays APR per Appendix J methodology         |
| Right of rescission | 3-business-day rescission window enforced for applicable transactions; automated notices |
| Periodic statements | Credit card and HELOC statements with minimum payment, late fee, and payoff disclosures  |
| Advertising rules   | Marketing content review workflow in admin portal                                        |
| Ability-to-repay    | Underwriting data captured and retained per ATR/QM requirements via loan adapter         |

### 3.3 UDAAP Compliance

Fiducia supports UDAAP (Unfair, Deceptive, or Abusive Acts or Practices) compliance through:

- **Approval workflows**: Fee changes, product modifications, and marketing content require multi-level approval before deployment to members.
- **Audit trail**: Every member-facing change is logged with actor, timestamp, and business justification.
- **Complaint tracking**: Integrated complaint management feeds into ComplianceCenter for trend analysis and regulatory reporting.
- **Fair lending monitoring**: Demographic data (where collected) supports HMDA reporting and fair lending analysis via configurable reports.

---

## 4. FFIEC IT Handbook Mapping

### 4.1 Information Security Booklet

| FFIEC Control Area       | Fiducia Control ID  | Implementation                                                                               |
| ------------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| Risk Assessment          | AC-01, DP-01        | Tenant data classification; RLS enforcement on all tables                                    |
| Access Controls          | AC-02, AC-04, AC-07 | RBAC with admin/owner/member roles; JWT validation; least privilege with approval escalation |
| Encryption               | CR-01, CR-02, CR-03 | TLS 1.2+ in transit; AES-256 at rest; AES-256-CBC backup encryption with key rotation        |
| Authentication           | IA-01, IA-02        | Email/password, magic link, SSO (SAML/OIDC); TOTP MFA with per-tenant enforcement            |
| Network Security         | SC-01, SC-04        | Rate limiting with circuit breaker; Cloudflare WAF; DDoS protection                          |
| Vulnerability Management | SC-02               | Zod input validation; `npm audit` in CI; Dependabot alerts; 48h critical CVE patch SLA       |

### 4.2 Audit Booklet

| FFIEC Control Area    | Fiducia Control ID | Implementation                                                           |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| Audit Trail           | AU-01, AU-02       | 49+ action types; append-only table with no delete capability            |
| Audit Independence    | AU-03              | Audit logs isolated from operational data; read-only access for auditors |
| Continuous Monitoring | IR-01              | Prometheus alerts, Sentry error tracking, health checks                  |
| Audit Reporting       | AU-03              | Searchable, filterable admin view with export capabilities               |

### 4.3 Business Continuity Planning Booklet

| FFIEC Control Area       | Fiducia Control ID | Implementation                                                         |
| ------------------------ | ------------------ | ---------------------------------------------------------------------- |
| Business Impact Analysis | IR-02              | Incident management with severity classification and impact assessment |
| Recovery Strategy        | IR-03              | Automated deployment rollback with pre/post health snapshots           |
| Backup and Recovery      | CR-03, DP-04       | AES-256-CBC encrypted backups; 30-day retention; S3 storage            |
| Testing                  | CM-01, CM-02       | Change request workflow with testing gates; CI/CD pipeline validation  |
| Crisis Communication     | IR-04              | Multi-channel stakeholder notification (Slack, email, SMS, push)       |

### 4.4 Operations Booklet

| FFIEC Control Area       | Fiducia Control ID | Implementation                                                   |
| ------------------------ | ------------------ | ---------------------------------------------------------------- |
| Change Management        | CM-01, CM-02       | Full lifecycle: request, approve, test, deploy, monitor          |
| Configuration Management | CM-03, CM-04       | Platform version tracking per tenant; per-tenant feature flags   |
| Performance Monitoring   | IR-01              | Prometheus metrics, Grafana dashboards, AlertManager rules       |
| Incident Response        | IR-02, IR-05       | Detect, investigate, resolve lifecycle; postmortem documentation |

---

## 5. BSA/AML Compliance

### 5.1 Program Requirements

The Bank Secrecy Act and anti-money laundering requirements are supported through Fiducia's ComplianceCenter (`apps/web/src/pages/admin/ComplianceCenter.tsx`) and the compliance adapter layer.

| BSA/AML Requirement              | Fiducia Capability                                                                                  | Configuration Required                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SAR Filing**                   | Alert generation, investigation workflow, filing preparation                                        | Tenant must configure FinCEN BSA E-Filing credentials                       |
| **CTR Reporting**                | Automatic flagging of cash transactions at or above $10,000; aggregation of structured transactions | Threshold monitoring enabled by default; filing requires FinCEN credentials |
| **CDD (Customer Due Diligence)** | KYC verification workflow during onboarding; risk rating assignment                                 | Tenant selects KYC provider (Jumio, Onfido, Socure) via adapter             |
| **EDD (Enhanced Due Diligence)** | High-risk customer flagging; periodic re-verification triggers                                      | Risk scoring thresholds configured per tenant                               |
| **Beneficial Ownership**         | Ownership data collection during business account onboarding                                        | CDD Rule compliant data fields; tenant configures verification provider     |
| **OFAC Screening**               | Real-time screening against SDN list via compliance adapter                                         | Requires OFAC screening service credentials                                 |
| **314(a) Requests**              | Secure search capability for law enforcement information requests                                   | Manual workflow supported through ComplianceCenter                          |

### 5.2 Transaction Monitoring

The compliance adapter monitors transactions against configurable rules:

- **Velocity checks**: Unusual transaction frequency relative to account history.
- **Structuring detection**: Multiple cash transactions below $10,000 that aggregate above the CTR threshold within a reporting period.
- **Geographic risk**: Transactions involving high-risk jurisdictions flagged per FATF guidance.
- **Behavioral anomalies**: Deviation from established account activity patterns.

AML alerts surface in ComplianceCenter with severity classification, investigation notes, and disposition tracking. Alerts that warrant regulatory filing are escalated through the SAR preparation workflow.

### 5.3 Recordkeeping

BSA requires retention of transaction records for five years. Fiducia's data retention policies (`DP-04`) support configurable retention periods. The admin UI provides retention period selection, and automated purge processes respect regulatory minimums.

---

## 6. GLBA Compliance

### 6.1 Privacy Rule

| GLBA Privacy Requirement        | Fiducia Implementation                                             |
| ------------------------------- | ------------------------------------------------------------------ |
| Initial privacy notice          | Tenant-configurable privacy notice served at account opening       |
| Annual privacy notice           | Automated annual notice delivery via notification service          |
| Opt-out rights                  | Member preference management in account settings                   |
| Information sharing disclosures | Configurable disclosure categories per tenant's sharing agreements |

### 6.2 Safeguards Rule

The Safeguards Rule requires financial institutions to develop, implement, and maintain a comprehensive information security program. Fiducia's platform controls map to the three categories of safeguards:

**Administrative Safeguards**

| Requirement                     | Fiducia Control                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Designated security coordinator | Tenant admin roles with security oversight permissions                           |
| Risk assessment                 | Platform-level risk assessment documented; tenant-specific assessments supported |
| Employee training               | Audit logs track admin actions for training gap identification                   |
| Vendor oversight                | Adapter pattern with credential isolation; no cross-tenant data exposure         |

**Technical Safeguards**

| Requirement        | Fiducia Control                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Access controls    | PostgreSQL RLS enforces tenant isolation at the database level; RBAC at application level |
| Encryption         | AES-256 at rest, TLS 1.2+ in transit, AES-256-CBC encrypted backups                       |
| Monitoring         | Prometheus metrics, Sentry error tracking, audit logging of all privileged actions        |
| MFA                | TOTP-based MFA with per-tenant enforcement policy                                         |
| Incident detection | AlertManager rules for anomalous activity; real-time Sentry alerts                        |

**Physical Safeguards**

| Requirement          | Fiducia Control                                                                      |
| -------------------- | ------------------------------------------------------------------------------------ |
| Data center security | Managed by cloud infrastructure provider (AWS/GCP/Azure); SOC 2 certified facilities |
| Media disposal       | Cloud provider managed; encrypted storage ensures data is unrecoverable without keys |
| Facility access      | Cloud provider responsibility; documented in shared responsibility model             |

### 6.3 Information Sharing

Fiducia's RLS architecture ensures that no tenant can access another tenant's customer data. The `firm_id` column on every banking table, enforced via PostgreSQL RLS policies, provides database-level assurance that information sharing occurs only through explicit, audited channels (e.g., open banking consent flows tracked in `supabase/migrations/20260316_open_banking_consent.sql`).

---

## 7. Control Narratives

The following prose-format narratives are intended for auditor and examiner consumption.

### 7.1 Access Control

Fiducia enforces access control at multiple layers. At the database level, PostgreSQL Row Level Security policies on every tenant-facing table restrict data access to rows matching the authenticated user's tenant identifier (`firm_id`). This isolation is not implemented in application code where it could be bypassed; it is enforced by the database engine itself. At the application level, role-based access control distinguishes between member, owner, and admin roles. Administrative routes are protected by authentication guards that verify both session validity and role authorization before rendering. API calls are authenticated via JWT tokens validated by Supabase Edge Functions, which extract tenant context and enforce authorization before processing any request. Privileged operations, such as wire transfers above configurable thresholds or administrative configuration changes, require multi-factor authentication escalation and may require approval from a second authorized user. All access decisions are logged in the immutable audit trail.

### 7.2 Change Management

All changes to the Fiducia platform follow a documented change management process. Changes are initiated as change requests that capture the description, risk assessment, rollback plan, and testing requirements. Each change request must be approved by an authorized reviewer before implementation proceeds. The CI/CD pipeline enforces automated validation including linting, type checking, unit tests, and build verification (`npm run validate`). Deployments are recorded in the `tenant_deployment_log` table with the git commit SHA, deployment duration, and resulting status. The platform supports automated rollback with pre-deployment and post-deployment health snapshots, enabling rapid recovery if a change introduces issues. Feature flags allow changes to be deployed but activated incrementally on a per-tenant basis, reducing blast radius.

### 7.3 Incident Response

Fiducia provides a structured incident response capability. Detection is supported through Prometheus alerting rules that monitor latency, error rates, and resource utilization, supplemented by Sentry for application-level error tracking. When an incident is detected, the Incident Manager (`apps/web/src/pages/admin/IncidentManager.tsx`) provides a structured workflow for investigation, tracking, and resolution. Each incident maintains an immutable JSONB timeline capturing detection, investigation steps, mitigation actions, and resolution. Severity classification drives escalation procedures and notification routing. Multi-channel notifications (Slack, email, SMS, push) ensure stakeholders are informed according to the incident severity. Post-incident, the platform supports postmortem documentation with root cause analysis and corrective action tracking. Deployment rollback capabilities enable rapid mitigation when incidents are traced to recent changes.

### 7.4 Data Protection

Member data is protected through defense-in-depth controls. All data is encrypted at rest using AES-256 encryption managed by the database platform. All data in transit is protected by TLS 1.2 or higher. Database backups are encrypted with AES-256-CBC and stored in geographically distributed cloud storage with 30-day retention. Access to member data is restricted by PostgreSQL RLS policies that enforce tenant isolation at the query level. The platform does not store secrets in source code; all credentials are managed through environment variables and, where available, through Supabase Vault for tenant-specific secrets. Data export capabilities support Data Subject Access Requests, and configurable retention policies ensure compliance with both minimum retention requirements (e.g., BSA five-year requirement) and maximum retention limits imposed by privacy regulations.

---

## 8. System Description for Regulators

### 8.1 Architecture Summary

Fiducia is a multi-tenant digital banking platform deployed on cloud infrastructure. The system comprises the following layers:

- **Client layer**: React 19 single-page application served via CDN (Cloudflare), plus a Flutter mobile application for iOS and Android. All client-server communication occurs over TLS 1.2+.
- **API layer**: Supabase Edge Functions (Deno runtime) provide a single RPC gateway endpoint. All requests are authenticated via JWT, authorized against tenant context, and routed to the appropriate action handler.
- **Database layer**: PostgreSQL 15 with Row Level Security enabled on all tenant-facing tables. Every row includes a `firm_id` column; RLS policies restrict access to the authenticated user's tenant. Control plane tables (tenant registry, deployment logs) are accessible only via the service role.
- **Integration layer**: Adapter pattern connects to external systems (core banking, payments, KYC, compliance). Each adapter auto-detects credentials from environment variables. Missing credentials cause a graceful fallback to mock implementations suitable for demonstration and testing.
- **Monitoring layer**: Prometheus metrics collection, Grafana dashboards, and AlertManager notifications. Sentry provides application error tracking with source map support.

### 8.2 Tenant Isolation Model

Tenant isolation is the foundational security control. Each tenant's data is logically separated at the PostgreSQL level through RLS policies keyed on `firm_id`. This isolation covers banking core tables (accounts, transactions, loans, cards), compliance tables (audit logs, compliance incidents), and operational tables (incidents, change requests). The control plane tables that manage tenants themselves are restricted to the service role and are not accessible through the application API. There is no application-level code path that can circumvent RLS; the database rejects unauthorized access regardless of application behavior.

### 8.3 Backup and Recovery

Automated encrypted backups run on a configurable schedule. Backups are encrypted with AES-256-CBC before transmission to cloud storage. Key rotation is supported. Recovery procedures are documented and tested. The platform also supports deployment rollback with automated health verification, providing rapid recovery from software-related incidents.

---

## 9. Gap Analysis

### 9.1 Built-in vs. Tenant-Configured Controls

| Capability                       | Platform Status                  | Tenant Action Required                                                             |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| Tenant data isolation (RLS)      | Built-in, always active          | None                                                                               |
| Encryption at rest / in transit  | Built-in, always active          | None                                                                               |
| Audit logging (49+ action types) | Built-in, always active          | None                                                                               |
| RBAC (admin/owner/member)        | Built-in, always active          | Assign roles to users                                                              |
| MFA support                      | Built-in                         | Enable MFA enforcement policy per tenant                                           |
| Change management workflow       | Built-in                         | Use workflow for all platform changes                                              |
| Incident management              | Built-in                         | Configure notification channels and escalation contacts                            |
| SAR filing                       | Alert generation built-in        | Tenant must configure FinCEN BSA E-Filing credentials and designate filing officer |
| CTR reporting                    | Threshold monitoring built-in    | Tenant must configure FinCEN credentials for automated filing                      |
| OFAC screening                   | Adapter framework built-in       | Tenant must provide OFAC screening service subscription                            |
| KYC/CDD verification             | Workflow built-in                | Tenant must select and configure KYC provider (Jumio, Onfido, Socure)              |
| Privacy notices (GLBA)           | Delivery mechanism built-in      | Tenant must author institution-specific privacy notice content                     |
| Reg E disclosures                | Template framework built-in      | Tenant must configure institution-specific disclosure language                     |
| Reg Z APR calculations           | Calculation engine built-in      | Tenant must verify calculations against their specific product terms               |
| Call Report mapping              | Framework built-in               | Tenant must map Chart of Accounts to 5300 line items                               |
| SSO/SAML integration             | Built-in                         | Tenant must configure their identity provider                                      |
| Backup encryption                | Built-in                         | Tenant should verify backup schedule meets their BCP requirements                  |
| Penetration testing              | Platform-level testing performed | Tenant may require institution-specific penetration test                           |

### 9.2 Items Requiring External Services

The following capabilities require the tenant to contract with external service providers and configure credentials in the platform:

1. **FinCEN BSA E-Filing**: Required for SAR and CTR submission. Platform prepares filing data; submission requires institutional credentials.
2. **KYC identity verification**: Requires subscription to a supported provider (Jumio, Onfido, or Socure).
3. **OFAC screening**: Requires access to an SDN list screening service.
4. **Core banking integration**: Real-time account data requires connection to the institution's core system (CU\*Answers, Symitar, Fineract, or compatible system).
5. **Payment network access**: FedNow, RTP, Zelle, and ACH connectivity require institutional enrollment and credentials.

---

## 10. Examination Readiness Checklist

Use this checklist to prepare for NCUA, FDIC, or state examinations.

### 10.1 Pre-Examination Preparation

- [ ] Generate current audit log export (Admin > Audit Log > Export) covering the examination period
- [ ] Compile list of all system changes during the period from `change_requests` table
- [ ] Export incident history and postmortem reports from Incident Manager
- [ ] Verify MFA enforcement policy is active and documented
- [ ] Confirm backup schedule and test most recent backup restoration
- [ ] Review and update privacy notice delivery records
- [ ] Prepare BSA/AML program documentation including SAR/CTR filing records
- [ ] Verify KYC/CDD completion rates and document any exceptions
- [ ] Confirm RLS policies are active on all tenant tables (run `scripts/validate-rls.sh` if available)
- [ ] Collect vendor management documentation for all active integration adapters

### 10.2 Documentation Packet for Examiners

| Document           | Source                              | Description                                             |
| ------------------ | ----------------------------------- | ------------------------------------------------------- |
| System description | This document, Section 8            | Architecture and security model overview                |
| Controls matrix    | `docs/security/CONTROLS-MATRIX.md`  | All platform controls with evidence pointers            |
| Security posture   | `docs/security/SECURITY-POSTURE.md` | OWASP mapping, RLS coverage, MFA configuration          |
| Data flow map      | `docs/security/DATA-FLOW-MAP.md`    | Data flows between system components                    |
| Audit log extract  | Admin portal export                 | Timestamped record of all platform actions              |
| Change log         | `change_requests` table export      | All system changes with approval documentation          |
| Incident history   | Incident Manager export             | Detection, response, and resolution records             |
| BSA/AML reports    | ComplianceCenter export             | AML alerts, SAR filings, CTR filings                    |
| BCP documentation  | Platform BCP + tenant-specific BCP  | Backup procedures, recovery testing results             |
| Vendor agreements  | Tenant-maintained                   | Contracts with core banking, KYC, and payment providers |

### 10.3 Common Examiner Questions and Fiducia Responses

| Examiner Question                                 | Prepared Response                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How is member data isolated between institutions? | PostgreSQL Row Level Security on every table; `firm_id` column with database-enforced policies. No application-level bypass possible.                      |
| How are system changes controlled?                | Formal change request workflow with approval gates, automated CI/CD validation, deployment logging with git SHA, and rollback capability.                  |
| How are suspicious transactions identified?       | Compliance adapter monitors transactions against configurable velocity, structuring, geographic, and behavioral rules. Alerts surface in ComplianceCenter. |
| How is data encrypted?                            | AES-256 at rest (database), TLS 1.2+ in transit, AES-256-CBC for backups with key rotation support.                                                        |
| What is the incident response process?            | Structured lifecycle: detect (Prometheus/Sentry), investigate, mitigate, resolve, postmortem. Full timeline maintained in immutable log.                   |
| How is access to the system authenticated?        | Supabase Auth with email/password, magic link, or SSO (SAML/OIDC). TOTP MFA configurable per tenant. JWT tokens with configurable expiry.                  |
| How are audit logs protected from tampering?      | Append-only database table with no delete capability exposed through the application. Timestamps are database-generated.                                   |

---

_This document should be reviewed and updated at least annually or whenever significant platform changes affect regulatory compliance posture. Tenant compliance officers are responsible for ensuring institution-specific configurations (SAR filing credentials, KYC provider selection, privacy notice content) are maintained current._
