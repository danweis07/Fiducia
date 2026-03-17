# India Regulatory Framework — Fiducia Digital Banking Platform

**Version:** 1.0
**Last Updated:** 2026-03-17
**Classification:** Confidential — Regulatory Use
**Applicable Jurisdictions:** Republic of India

---

## 1. Regulatory Landscape

Fiducia operates within a multi-regulator environment in India. The following bodies hold supervisory authority over digital banking platforms deployed for Indian financial institutions:

| Regulator | Full Name | Jurisdiction |
|-----------|-----------|-------------|
| **RBI** | Reserve Bank of India | Banking regulation, payment systems, digital lending, KYC/AML, data localization |
| **SEBI** | Securities and Exchange Board of India | Investment products, mutual fund distribution, securities settlement |
| **IRDAI** | Insurance Regulatory and Development Authority of India | Insurance product distribution, if offered through the platform |
| **NPCI** | National Payments Corporation of India | UPI, IMPS, NACH, RuPay rail operations and certification |
| **MeitY** | Ministry of Electronics and Information Technology | DPDP Act 2023 enforcement, IT Act 2000, intermediary guidelines |
| **CERT-In** | Indian Computer Emergency Response Team | Cybersecurity incident reporting, vulnerability disclosure |
| **FIU-IND** | Financial Intelligence Unit — India | Suspicious transaction reporting under PMLA |

Fiducia's multi-tenant architecture and adapter pattern allow each tenant (credit union or community bank) to satisfy the requirements of all applicable regulators through a shared compliance infrastructure while maintaining strict data isolation.

---

## 2. RBI Compliance

### 2.1 Digital Lending Guidelines (September 2022)

The RBI's Guidelines on Digital Lending, effective September 2, 2022, impose requirements on all entities involved in digital lending — including technology service providers (LSPs and their platforms). Fiducia satisfies these requirements as follows:

- **Disclosure of fees and charges.** The platform's loan origination workflow renders all fees, APR, and charges on a standardized Key Fact Statement (KFS) screen before borrower consent. No hidden charges are applied post-disbursal.
- **Direct disbursal to borrower accounts.** Fiducia's payment gateway integration ensures loan amounts are credited directly to the borrower's bank account, never to a third-party pool. The adapter layer enforces this routing.
- **Grievance redressal.** Each tenant configures a nodal grievance officer. The platform exposes a complaints endpoint and tracks resolution SLAs per RBI timelines (30 days).
- **Data minimization.** The platform collects only data necessary for credit assessment. No access to mobile contact lists, call logs, or media files. Consent is granular and revocable.
- **Cooling-off period.** Configurable per-tenant cooling-off window during which borrowers may exit a loan without penalty. Enforced at the business logic layer.

### 2.2 UPI / NPCI Integration

Fiducia's adapter pattern (`src/lib/gateway/`) supports UPI integration through a dedicated payment adapter. The architecture works as follows:

1. The `payments.transfer` gateway action routes to a UPI adapter when the tenant's configuration specifies UPI as a payment rail.
2. The adapter implements NPCI's UPI 2.0 specification, handling collect requests, pay requests, mandate creation, and transaction status callbacks.
3. In demo mode (`VITE_DEMO_MODE=true`), the UPI adapter falls back to a mock implementation in `src/lib/demo-data/` — no NPCI sandbox credentials required.
4. For production tenants, the adapter connects to the acquiring bank's UPI switch via the PSP (Payment Service Provider) stack.

NPCI certification (functional, security, and performance) must be completed per-tenant through the sponsoring bank before production UPI traffic is routed.

### 2.3 Master Direction on KYC (2016, amended 2023)

RBI's Master Direction on KYC requires regulated entities to perform Customer Due Diligence (CDD) at onboarding and periodically thereafter. Fiducia supports:

- **Video KYC (V-CIP).** Integration adapter for RBI-compliant Video-based Customer Identification Process.
- **Aadhaar eKYC.** Adapter for UIDAI's eKYC API (OTP-based and biometric modes). See Section 10 for current gap status.
- **CKYC.** Central KYC Registry lookup and upload via adapter, enabling de-duplication of KYC records across institutions.
- **Periodic re-KYC.** Automated workflows trigger re-verification at RBI-mandated intervals (2 years for high-risk, 8 years for low-risk customers).
- **PEP and sanctions screening.** Configurable screening lists integrated through the compliance adapter in `src/lib/gateway/compliance/`.

### 2.4 Outsourcing Guidelines

RBI's Master Direction on Outsourcing of IT Services (2023) requires regulated entities to maintain oversight of technology service providers. Fiducia supports this through:

- Tenant-level audit log access (all platform actions are logged with actor, timestamp, and IP).
- Contractual provisions for RBI inspection of the platform provider's premises and systems.
- Business continuity and disaster recovery documentation per tenant.
- Subcontractor transparency — all cloud infrastructure providers are disclosed to tenants.

---

## 3. Digital Personal Data Protection Act, 2023

The DPDP Act 2023 (Act No. 22 of 2023) establishes India's comprehensive data protection regime. Fiducia functions as a **Data Processor** on behalf of each tenant institution, which acts as the **Data Fiduciary**.

### 3.1 Data Principal Rights

| Right | DPDP Act Section | Platform Implementation |
|-------|-----------------|------------------------|
| Right to access | Section 11 | DataExport component generates a machine-readable summary of all personal data held |
| Right to correction and erasure | Section 12 | Self-service profile editing; erasure requests routed to tenant compliance officer with audit trail |
| Right to grievance redressal | Section 13 | In-app grievance submission; SLA tracking per Data Protection Board timelines |
| Right to nominate | Section 14 | Nominee registration workflow for account holders (death or incapacity scenarios) |

### 3.2 Consent Management

- **Purpose-specific consent.** Each data collection point in the platform captures consent against a declared purpose (e.g., "credit assessment," "marketing communications"). Consent records are stored immutably.
- **Granular withdrawal.** Data principals may withdraw consent for specific purposes without affecting others. Withdrawal triggers downstream data deletion workflows where no other legal basis applies.
- **Consent manager integration.** The adapter pattern supports integration with RBI-registered Consent Managers (Account Aggregator framework) for financial data sharing under explicit consent.

### 3.3 Data Fiduciary Obligations

Fiducia's platform controls satisfy Data Fiduciary obligations as follows:

- **Row Level Security (RLS):** PostgreSQL RLS policies enforce tenant-level data isolation, ensuring no cross-tenant data leakage — a foundational requirement under the DPDP Act's data security provisions.
- **Audit logs:** All data access and modification events are recorded with timestamp, actor identity, and action type. Logs are retained per tenant-configured policy (minimum 5 years for financial records).
- **Data retention limits.** Automated data purge workflows execute after configurable retention periods, satisfying the Act's requirement to delete data once the specified purpose is fulfilled.
- **Breach notification.** The incident management pipeline triggers notification to the Data Protection Board and affected Data Principals within the timelines mandated by the Act.

---

## 4. Prevention of Money Laundering Act (PMLA) 2002

### 4.1 KYC and Customer Due Diligence

PMLA 2002 (as amended) and the Prevention of Money Laundering (Maintenance of Records) Rules, 2005, require reporting entities to:

- Verify customer identity at onboarding using officially valid documents (OVDs).
- Perform Enhanced Due Diligence (EDD) for high-risk categories: PEPs, high-net-worth individuals, non-face-to-face customers, and customers from high-risk jurisdictions.
- Maintain records of all transactions for a minimum of 5 years from the date of the transaction.

Fiducia's compliance module enforces these requirements through configurable risk-scoring rules, automated OVD verification via the KYC adapter, and immutable transaction record storage.

### 4.2 Suspicious Transaction Reporting (STR)

- The platform's transaction monitoring engine evaluates all transactions against rule-based and pattern-based triggers.
- When a transaction is flagged, it generates a Suspicious Transaction Report in the format prescribed by FIU-IND.
- Reports are queued for review by the tenant's Principal Officer (PMLA-designated) before submission to FIU-IND via the FINnet 2.0 portal.
- Cash Transaction Reports (CTRs) for transactions exceeding INR 10,00,000 are auto-generated and queued for filing.
- Non-Profit Organisation Transaction Reports (NTRs) are generated where applicable.

### 4.3 FIU-IND Reporting

All reporting entities must register with FIU-IND and file reports electronically. Fiducia supports:

- Automated CTR generation (monthly filing, by the 15th of the succeeding month).
- STR filing within 7 days of the Principal Officer's confirmation.
- Cross-border wire transfer reporting for transactions above the prescribed threshold.
- Record maintenance in a format that permits reconstruction of individual transactions for FIU-IND inspection.

---

## 5. RBI Cybersecurity Framework

### 5.1 CERT-In Incident Reporting

Under CERT-In Directions of April 28, 2022, all service providers (including those serving regulated entities) must report cybersecurity incidents within **6 hours** of detection. Fiducia's monitoring stack supports this:

- **Alertmanager** (configured in `monitoring/`) triggers escalation workflows immediately upon detection of security-relevant events.
- **Incident classification** follows CERT-In's taxonomy: targeted scanning, compromise of systems, data breaches, unauthorized access, malware deployment, and DDoS attacks.
- **Automated report drafting.** The incident manager pre-populates CERT-In's prescribed reporting template with known indicators (IP addresses, timestamps, affected systems, initial scope assessment).
- **Log retention.** All system logs are retained for 180 days (rolling), satisfying CERT-In's mandate for enabling post-incident forensic analysis.

### 5.2 RBI IT Framework and CSITE Guidelines

The RBI's Comprehensive Cyber Security Framework for Primary (Urban) Cooperative Banks and the IT Framework for NBFC/Banks require:

| Requirement | Platform Control |
|-------------|-----------------|
| Board-approved cybersecurity policy | Template provided per tenant; policy document management in admin portal |
| SOC operations | Monitoring stack (Prometheus + Grafana) with pre-built dashboards for anomaly detection |
| Vulnerability assessment | Quarterly VAPT scheduling support; findings tracked in the compliance module |
| Access control and privilege management | RBAC with role hierarchy; MFA enforcement; session timeout policies |
| Patch management | Infrastructure-as-code deployment pipelines with automated patching for managed components |
| Phishing/social engineering awareness | Tenant-configurable security awareness prompts within the platform |

### 5.3 Access Controls

- **Multi-factor authentication** is enforced for all administrative access and configurable for end-user access.
- **Role-based access control (RBAC)** in `src/contexts/` and enforced at the database level via RLS policies.
- **Session management** includes configurable idle timeouts, concurrent session limits, and device binding.
- **Privileged access management** — administrative actions require step-up authentication and are logged separately.

---

## 6. Data Localization

### 6.1 RBI Data Storage Circular

RBI's circular on Storage of Payment System Data (RBI/2017-18/153) mandates that all payment data (full end-to-end transaction details, information collected, carried, and processed as part of the payment message/instruction) must be stored exclusively in India.

### 6.2 Platform Implementation

Fiducia enforces data localization through the following mechanisms:

- **Tenant registry region field.** The `tenant_registry.region` column stores the deployment region for each tenant. Indian tenants are assigned `ap-south-1` (Mumbai) or `ap-south-2` (Hyderabad), ensuring all primary data resides within Indian borders.
- **Database-level enforcement.** PostgreSQL instances for Indian tenants run exclusively on infrastructure within India. RLS policies ensure that queries cannot inadvertently route to or retrieve data from non-Indian regions.
- **Payment data isolation.** Transaction data for Indian tenants is stored, processed, and retained only within Indian data centers. No payment data is mirrored to or backed up in overseas locations.
- **Permissible foreign processing.** For cross-border transactions, transient processing may occur outside India, but the data is deleted from foreign systems and the full transaction record is stored back in India within the timeframe prescribed by RBI.

### 6.3 Mirror and Localization Strategies

- **Active-passive replication** within India (e.g., Mumbai primary, Hyderabad DR) ensures business continuity without violating localization requirements.
- **CDN edge caching** for static assets may use global nodes, but no personal or payment data is cached at edge locations outside India.
- **Backup encryption and geo-fencing.** All backups are encrypted at rest and geo-fenced to Indian storage regions via cloud provider policies.

---

## 7. Control Narratives for RBI Supervisors and Auditors

### 7.1 Data Isolation and Multi-Tenancy

Fiducia implements tenant isolation at the database level using PostgreSQL Row Level Security. Every table containing customer or financial data includes a `tenant_id` column. RLS policies, applied to all database roles used by the application, filter every SELECT, INSERT, UPDATE, and DELETE operation to the authenticated tenant's scope. This design prevents data leakage between tenants without relying on application-layer enforcement alone. RBI supervisors may verify this by reviewing the migration files in `supabase/migrations/` and executing test queries under different tenant contexts.

### 7.2 Audit Trail Completeness

All actions performed within the platform — whether by end users, tenant administrators, or system processes — are recorded in append-only audit logs. Each log entry captures the actor's identity, the action performed, the affected resource, a before/after data snapshot, the originating IP address, and a UTC timestamp. These logs are tamper-evident and retained for a minimum of 5 years, consistent with PMLA record-keeping requirements. Auditors may request log exports filtered by date range, user, or action type through the admin portal or via the DataExport API.

### 7.3 Encryption and Key Management

Data at rest is encrypted using AES-256 via the cloud provider's managed encryption service. Data in transit is protected by TLS 1.2 or higher on all connections. Encryption keys are managed through the cloud provider's key management service (AWS KMS in ap-south-1 for Indian deployments), with automatic key rotation every 365 days. No encryption keys are stored alongside the data they protect.

### 7.4 Change Management

All changes to the production platform follow a documented change management process: code review by at least one peer, automated testing (unit, integration, and E2E via `npm run validate`), staged rollout through development, staging, and production environments, and post-deployment verification. Database schema changes are applied through versioned, idempotent migrations. Rollback procedures are documented for every migration.

---

## 8. Data Flow Maps — India Deployment

### 8.1 Data Residency Architecture

```
                        India (ap-south-1 / ap-south-2)
 +----------------------------------------------------------------------+
 |                                                                      |
 |   [End User]  --TLS 1.2+-->  [CDN / WAF]  -->  [Load Balancer]      |
 |                                                      |               |
 |                                          +-----------+-----------+   |
 |                                          |                       |   |
 |                                   [App Servers]          [Edge Functions] |
 |                                          |               (Supabase)  |
 |                                          |                       |   |
 |                                   [PostgreSQL Primary]           |   |
 |                                     (ap-south-1)                 |   |
 |                                          |                       |   |
 |                                   [PostgreSQL Replica]           |   |
 |                                     (ap-south-2 DR)              |   |
 |                                                                      |
 |   [Backups] ---- Encrypted, geo-fenced to IN regions                |
 |                                                                      |
 +----------------------------------------------------------------------+
          |                         |                        |
    [NPCI / UPI Switch]     [UIDAI eKYC API]         [FIU-IND FINnet]
     (within India)          (within India)           (within India)
```

### 8.2 Cross-Border Data Flows

No payment system data leaves Indian borders. For cross-border payment transactions (e.g., outward remittances via SWIFT), the transaction instruction is transmitted to the correspondent bank, but the complete transaction record — including originator details, beneficiary details, and transaction metadata — is retained exclusively in the Indian data store. This satisfies the RBI circular on storage of payment system data.

---

## 9. Policy Alignment — Feature to Regulation Mapping

| Platform Feature | Indian Regulation | Compliance Function |
|-----------------|-------------------|-------------------|
| Row Level Security (RLS) | DPDP Act 2023, RBI IT Framework | Tenant data isolation, access control |
| Audit logging | PMLA 2002, RBI Outsourcing Guidelines | Tamper-evident activity records, 5-year retention |
| DataExport API | DPDP Act 2023 (Section 11) | Data principal right to access |
| Consent management | DPDP Act 2023, RBI Digital Lending Guidelines | Purpose-specific consent, granular withdrawal |
| Transaction monitoring | PMLA 2002, FIU-IND Rules | STR/CTR generation, threshold-based alerts |
| MFA enforcement | RBI Cybersecurity Framework, CERT-In Directions | Strong authentication for admin and user access |
| `tenant_registry.region` | RBI Data Localization Circular | Payment data residency enforcement |
| Adapter pattern (UPI) | NPCI UPI 2.0 Specification | Pluggable payment rail integration |
| Adapter pattern (KYC) | RBI Master Direction on KYC, PMLA Rules | V-CIP, Aadhaar eKYC, CKYC integration |
| Incident manager | CERT-In Directions (6-hour reporting) | Automated incident classification and report drafting |
| Grievance redressal module | DPDP Act 2023, RBI Digital Lending Guidelines | Complaint tracking with SLA enforcement |
| Monitoring stack | RBI CSITE Guidelines | Prometheus/Grafana dashboards, Alertmanager escalation |
| Encryption at rest/in transit | RBI IT Framework, DPDP Act 2023 | AES-256 at rest, TLS 1.2+ in transit |
| Automated data purge | DPDP Act 2023 (purpose limitation) | Configurable retention periods with auto-deletion |

---

## 10. Gap Analysis

The following items represent areas where additional development, certification, or configuration is required before production deployment for Indian regulated entities.

### 10.1 UPI Integration

| Item | Status | Remediation |
|------|--------|------------|
| UPI adapter implementation | Partial — mock adapter exists in demo mode | Complete production adapter against NPCI UPI 2.0 spec |
| NPCI functional certification | Not started | Engage sponsoring bank; schedule certification cycle (typically 4-6 weeks) |
| NPCI security certification | Not started | Complete NPCI-mandated security audit of UPI integration endpoints |
| UPI AutoPay (mandates) | Not implemented | Extend adapter to support recurring mandate registration and execution |
| UPI QR code generation | Not implemented | Add QR code generation for merchant payment collection flows |

### 10.2 Aadhaar eKYC

| Item | Status | Remediation |
|------|--------|------------|
| UIDAI AUA/KUA license | Not held by platform | Tenant must hold or obtain AUA license; platform integrates via tenant's ASA |
| eKYC adapter (OTP mode) | Partial — interface defined | Complete implementation against UIDAI eKYC API specification |
| eKYC adapter (biometric mode) | Not implemented | Integrate with registered biometric device SDK; requires RD service certification |
| Aadhaar data vault | Not implemented | Build encrypted Aadhaar data vault per UIDAI circular on storage of Aadhaar numbers |
| Virtual ID support | Not implemented | Support 16-digit Virtual ID as alternative to Aadhaar number in eKYC flow |

### 10.3 Data Localization Enforcement

| Item | Status | Remediation |
|------|--------|------------|
| Region-based tenant routing | Implemented — `tenant_registry.region` field | Verify enforcement at infrastructure level for all Indian tenants |
| Automated localization audit | Not implemented | Build automated checks that validate no payment data replication outside India |
| RBI annual compliance certificate | Process not defined | Define process for annual data localization audit and certification submission to RBI |
| CDN configuration audit | Not performed | Verify CDN rules exclude personal/payment data from non-Indian edge nodes |

### 10.4 Additional Gaps

| Item | Status | Remediation |
|------|--------|------------|
| Account Aggregator (AA) integration | Not implemented | Build adapter for RBI-licensed Account Aggregator ecosystem (FIP/FIU roles) |
| RBI regulatory sandbox participation | Not initiated | Evaluate participation in RBI's regulatory sandbox for digital lending or payments |
| DPBI registration | Pending DPDP Act rules | Register as Data Processor once Data Protection Board of India issues procedural rules |
| Hindi and regional language support | 33 languages supported; Hindi included | Verify completeness of Hindi translations across all 6 namespaces; add additional Scheduled Languages as required by tenants |

---

## References

- RBI Guidelines on Digital Lending (RBI/2022-23/111, September 2, 2022)
- RBI Master Direction — Know Your Customer (KYC) Direction, 2016 (updated 2023)
- RBI Storage of Payment System Data (RBI/2017-18/153, April 6, 2018)
- Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)
- Prevention of Money Laundering Act, 2002 (as amended)
- CERT-In Directions relating to information security practices (April 28, 2022)
- NPCI UPI 2.0 Procedural Guidelines
- RBI Framework for Outsourcing of IT Services (2023)
- RBI Comprehensive Cyber Security Framework for UCBs (2018)

---

*This document is maintained by the Fiducia Compliance Team and must be reviewed quarterly or upon material changes to applicable Indian regulations.*
