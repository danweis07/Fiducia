# Brazil Regulatory Framework

This document describes how the Fiducia digital banking platform aligns with Brazilian financial regulations. It covers the supervisory landscape, data protection obligations under LGPD, anti-money-laundering requirements, Open Finance Brasil participation, and cybersecurity controls mandated by the Banco Central do Brasil (BCB). All references assume a tenant configured with the `latam_digital` regional profile (`country: "BR"`, `currency: "BRL"`, `timezone: "America/Sao_Paulo"`).

---

## 1. Regulatory Landscape

Brazilian financial institutions operate under a multi-authority supervisory model:

| Authority                                                 | Scope                                                    | Relevance to Fiducia                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **BCB** (Banco Central do Brasil)                         | Monetary policy, payment systems, prudential supervision | Pix rules, Open Finance, Resolution 4.893 cybersecurity, Resolution 4.658 cloud/outsourcing |
| **CMN** (Conselho Monetario Nacional)                     | Overarching financial-system norms                       | CMN Resolution 2.025 (formerly 2.852) on CDD/KYC, data-retention minimums                   |
| **CVM** (Comissao de Valores Mobiliarios)                 | Securities regulation                                    | Relevant if a tenant offers investment products; out of scope for core banking              |
| **COAF** (Conselho de Controle de Atividades Financeiras) | Financial intelligence unit, AML/CFT                     | STR (Suspicious Transaction Report) filings, COAF data formats                              |
| **ANPD** (Autoridade Nacional de Protecao de Dados)       | Data protection enforcement                              | LGPD compliance, breach notifications, international data transfers                         |

Fiducia tenants operating in Brazil must satisfy requirements from all five authorities. The platform provides configurable controls so that each obligation maps to an auditable technical measure.

---

## 2. BCB Compliance

### 2.1 Pix Instant Payments

Pix is the BCB-mandated instant-payment rail. In the Fiducia market template for Brazil, Pix is enabled through the `aliasPayments` feature flag (set to `true` by default in the Brazil Digital Bank template). The adapter pattern in `apps/web/src/lib/gateway/` allows the gateway action `payments.transfer` to route Pix transactions to a connected SPI (Sistema de Pagamentos Instantaneos) participant or PSP provider.

**Key integration points:**

- **Alias resolution** -- Pix keys (CPF, CNPJ, phone, email, EVP) are resolved via the DICT (Diretorio de Identificadores de Contas Transacionais). The adapter calls the participant's DICT proxy.
- **QR codes** -- Static and dynamic QR code generation uses the Pix payload specification (BR Code). The frontend renders QR codes via the existing `aliasPayments` UI components.
- **Settlement** -- Transactions settle in real time through the SPI. The adapter receives confirmation callbacks and updates ledger state via `accounts.syncBalance`.
- **Fraud prevention** -- BCB Pix fraud-marker rules (marcacao de fraude) are enforced at the adapter layer. The `amlScreening` feature flag enables real-time checks before transfer execution.

### 2.2 Open Finance Brasil

See Section 5 for full details on Open Finance participation.

### 2.3 Resolution 4.658 -- Cloud Computing and Outsourcing

Resolution 4.658 (and successor Circular 3.909) govern the use of cloud services by regulated institutions. Requirements and Fiducia coverage:

| Requirement                              | Platform Control                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Data must be accessible to BCB on demand | Audit logs stored in PostgreSQL with `tenant_id` isolation; exportable via DataExport |
| Cloud provider must allow BCB inspection | Deployment docs specify contractual clauses for AWS/GCP/Azure (see `deploy/`)         |
| Incident communication to BCB within 24h | Incident Manager triggers notification workflows                                      |
| Business continuity plan                 | Helm chart supports multi-AZ; monitoring stack provides failover alerting             |

### 2.4 Resolution 4.893 -- Cybersecurity

See Section 6 for detailed mapping.

---

## 3. LGPD (Lei Geral de Protecao de Dados)

Brazil's LGPD (Law 13.709/2018) closely mirrors GDPR in structure but has distinct requirements enforced by the ANPD.

### 3.1 Lawful Bases for Processing

Fiducia supports configurable lawful-basis tracking per data-processing activity. For Brazilian tenants, common bases include:

- **Consent** (Art. 7, I) -- Managed through the consent tables used by Open Banking; see `apps/web/src/pages/OpenBankingConsents.tsx`.
- **Legal obligation** (Art. 7, II) -- AML/KYC data retained under CMN rules; retention period set in `complianceSettings.dataRetentionYears` (default 5 years for BR).
- **Legitimate interest** (Art. 7, IX) -- Fraud prevention and security monitoring.

### 3.2 Mapping to Platform Controls

| LGPD Obligation                                     | Fiducia Feature                                             | Implementation                                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Technical and administrative measures** (Art. 46) | Row Level Security (RLS)                                    | Every database row scoped to `tenant_id`; PostgreSQL policies enforce isolation at query time                |
| **Data subject access requests** (Art. 18)          | DataExport page (`apps/web/src/pages/admin/DataExport.tsx`) | Admins generate full data packages for a given user; supports JSON and CSV output                            |
| **Right to deletion** (Art. 18, VI)                 | DataExport + retention policies                             | Soft-delete with configurable hard-delete after retention period expires                                     |
| **Accountability and governance** (Art. 50)         | Audit logs (`apps/web/src/services/auditLogger.ts`)         | All state-changing operations logged with actor, timestamp, tenant, and action metadata                      |
| **Breach notification** (Art. 48)                   | Incident Manager + alerting                                 | ANPD must be notified within a "reasonable time"; Incident Manager templates include ANPD notification steps |
| **Data Protection Officer** (Art. 41)               | Tenant settings                                             | DPO contact information configurable per tenant in admin panel                                               |

### 3.3 ANPD Requirements

- **Records of processing activities** -- The audit log, combined with the compliance dashboard in ComplianceCenter, provides a continuously updated processing inventory.
- **Data protection impact assessments (DPIA)** -- Not automated; tenant compliance teams perform DPIAs externally. Fiducia provides data-flow documentation (Section 8) as input.
- **Cookie consent** -- Handled at the frontend layer; the platform supports a configurable consent banner.

### 3.4 International Data Transfers

LGPD restricts transfers of personal data outside Brazil (Art. 33). Fiducia supports this through:

- **Data residency configuration** -- `complianceSettings.dataResidencyRegion` set to `"latam"` for Brazilian tenants, ensuring primary data storage remains in a LATAM region.
- **Global control plane** -- Tenant management metadata (non-PII) may traverse the global control plane. PII and transaction data remain within the configured residency region.
- **Standard contractual clauses** -- When data must cross borders (e.g., international wire metadata), the platform logs the transfer purpose and legal basis in the audit trail.

---

## 4. AML/CFT (Anti-Money Laundering / Counter-Financing of Terrorism)

### 4.1 COAF Reporting

COAF requires regulated institutions to file Suspicious Transaction Reports (STRs) for transactions that may indicate money laundering, terrorism financing, or proliferation financing. The ComplianceCenter (`apps/web/src/pages/admin/ComplianceCenter.tsx`) provides:

- **AML alerts dashboard** -- Real-time display of flagged transactions with severity, status, and investigation notes.
- **STR generation** -- Alert data can be exported in the format required for COAF's SISCOAF electronic filing system.
- **Automatic thresholds** -- Transactions above BRL 50,000 (cash) or BRL 10,000 (transfers from high-risk jurisdictions) trigger automatic review flags.

### 4.2 Customer Due Diligence (CDD)

CMN Resolution 2.025 (consolidating earlier norms including 2.852 and 4.753) requires CDD procedures including:

| CDD Level      | Trigger                                                    | Fiducia Implementation                                                     |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Simplified** | Low-risk products, accounts below BRL 5,000/month          | Basic identity verification via KYC adapter                                |
| **Standard**   | All account holders                                        | Full KYC flow: document verification + CPF/CNPJ validation via adapter     |
| **Enhanced**   | PEPs (Pessoas Expostas Politicamente), high-value accounts | Additional screening through AML adapter; PEP lists refreshed periodically |

The KYC adapter pattern allows integration with Brazilian identity verification providers (e.g., Serpro for CPF validation, Receita Federal for CNPJ lookups) without changing core platform code.

### 4.3 Transaction Monitoring

The `amlScreening` feature flag (enabled by default in the Brazil template) activates:

- **Rule-based monitoring** -- Configurable rules for structuring detection, rapid movement of funds, and unusual patterns.
- **Velocity checks** -- Per-account transaction velocity tracked against configurable thresholds.
- **Sanctions screening** -- Adapter integrates with sanctions-list providers; matches generate AML alerts in ComplianceCenter.

---

## 5. Open Finance Brasil

Open Finance Brasil, mandated by the BCB, extends beyond PSD2-style open banking to include insurance, investments, foreign exchange, and pensions. Fiducia supports participation through existing open-banking infrastructure.

### 5.1 Phase Coverage

| Phase       | Scope                                                  | Platform Support                                                 |
| ----------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| **Phase 1** | Institution data, products, and channels               | Public API endpoints; no authentication required                 |
| **Phase 2** | Customer data sharing (accounts, transactions, credit) | Consent-managed API access via `openBanking` feature flag        |
| **Phase 3** | Payment initiation, Pix forwarding                     | `aliasPayments` + `payments.transfer` gateway action             |
| **Phase 4** | Insurance, investments, foreign exchange, pensions     | Adapter extension points; tenant-specific configuration required |

### 5.2 Consent Management

The consent framework (`apps/web/src/pages/OpenBankingConsents.tsx`, hooks in `apps/web/src/hooks/useOpenBanking.ts`) implements:

- **Granular consent** -- Customers grant or revoke access per data category and per third-party institution.
- **Consent lifecycle** -- Creation, renewal (max 12 months per BCB rules), and revocation tracked with timestamps and audit logs.
- **Consent dashboard** -- End-users view all active consents, access logs, and can revoke with one action.
- **FAPI compliance** -- The OAuth/OIDC layer (edge functions `sso-init`, `sso-callback`, `oauth-start`, `oauth-callback`) supports Financial-grade API (FAPI) security profiles required by Open Finance Brasil.

### 5.3 API Standards

Open Finance Brasil mandates specific API specifications managed by the Open Finance Brasil governance structure. Fiducia's adapter pattern allows the gateway to expose conformant endpoints:

- **Response format** -- Adapters transform internal data models to the Open Finance Brasil JSON schema.
- **Mutual TLS** -- Edge-function deployment supports mTLS for institution-to-institution API calls.
- **Rate limiting** -- Tenant-level `rateLimits` configuration enforces BCB-mandated API call quotas.

---

## 6. Cybersecurity -- Resolution 4.893

BCB Resolution 4.893 (replacing Circular 3.909) establishes cybersecurity requirements for financial institutions. The table below maps each requirement area to Fiducia's controls.

### 6.1 Requirement Mapping

| Res. 4.893 Requirement                       | Fiducia Control                                                                                   | Evidence                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Cybersecurity policy** (Art. 2)            | Tenant-level compliance settings; documented security policies                                    | `complianceSettings` in tenant config                       |
| **Incident detection and response** (Art. 3) | Monitoring stack (Prometheus + Grafana + Alertmanager); Incident Manager                          | `monitoring/` configs, alert rules                          |
| **Vulnerability management** (Art. 6)        | CI/CD pipeline includes dependency scanning; Dependabot enabled                                   | `.github/` workflows                                        |
| **Access controls** (Art. 8)                 | RBAC with tenant-scoped roles (`owner`, `admin`, `member`, `viewer`); MFA enforced for BR tenants | `TenantUserRole` type, `mfaRequired: true`                  |
| **Data classification** (Art. 10)            | Four-tier classification: `public`, `internal`, `confidential`, `restricted`                      | `DataClassification` type in `apps/web/src/types/tenant.ts` |
| **Audit trail** (Art. 12)                    | Immutable audit logs with actor, action, timestamp, tenant context                                | `apps/web/src/services/auditLogger.ts`                      |
| **Third-party risk** (Art. 14)               | Adapter pattern isolates integrations; each adapter independently testable                        | `apps/web/src/lib/gateway/` adapter registry                |
| **BCB notification** (Art. 16)               | Incident Manager includes BCB notification template; 24-hour reporting window                     | Incident response runbook                                   |
| **Business continuity** (Art. 17)            | Multi-AZ deployments via Helm; automated failover                                                 | `helm/`, `deploy/` configs                                  |
| **Penetration testing** (Art. 20)            | Annual pentest scope documented; findings tracked in ComplianceCenter                             | External engagement; results uploaded to tenant             |

### 6.2 Incident Response Timeline

Resolution 4.893 requires institutions to report relevant cyber incidents to BCB within specific windows:

1. **Detection** -- Monitoring stack alerts on-call team (Alertmanager, PagerDuty integration).
2. **Triage (T+0 to T+1h)** -- Incident Manager creates incident record; severity classified.
3. **Containment (T+1h to T+4h)** -- Affected tenant isolation via feature flags; compromised sessions revoked.
4. **BCB notification (T+0 to T+24h)** -- Mandatory notification submitted through BCB's incident reporting channel.
5. **ANPD notification (if personal data involved)** -- Filed within "reasonable time" per LGPD Art. 48.
6. **Post-incident report** -- Root cause analysis documented; ComplianceCenter stores report.

---

## 7. Control Narratives for BCB Supervisors

### 7.1 Data Isolation

Fiducia enforces tenant data isolation at the database level using PostgreSQL Row Level Security. Every table containing customer or transaction data includes a `tenant_id` column. RLS policies ensure that queries, regardless of origin, only return rows belonging to the authenticated tenant. This architecture satisfies BCB requirements for logical separation of customer data in multi-tenant environments.

### 7.2 Authentication and Session Management

Brazilian tenants are configured with `mfaRequired: true` and a 10-minute session idle timeout (versus 15 minutes for other markets). The authentication layer, powered by Supabase GoTrue, supports TOTP-based MFA. Session tokens are short-lived and automatically refreshed; the grace period before forced logout is 2 minutes. These settings align with BCB guidance on strong customer authentication for digital channels.

### 7.3 Audit and Traceability

All material actions within the platform (login, transfers, consent grants, administrative changes) are recorded in an immutable audit log. Each entry includes the acting user, the target resource, the tenant context, a timestamp, and the action performed. Audit data is retained for a minimum of 5 years, matching both LGPD record-keeping obligations and CMN data-retention requirements. The logs are queryable by compliance officers through the admin portal and exportable for regulatory review.

### 7.4 Payment Integrity

Pix transactions flow through a dedicated adapter that validates the Pix key, checks AML screening results, and confirms sufficient funds before submitting to the SPI. Each step is logged. Failed validations halt the transaction and generate an AML alert when applicable. The adapter is independently testable via the core simulator (`core-simulator/`), allowing institutions to verify payment integrity without connecting to production SPI infrastructure.

---

## 8. Data Flow Maps

### 8.1 Brazil-Specific Data Residency

```
┌─────────────────────────────────────────────────────────┐
│                   LATAM Region (Primary)                │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Supabase    │    │  Edge Fns    │    │  Storage   │  │
│  │  PostgreSQL  │◄──►│  (Gateway)   │◄──►│  (Files)   │  │
│  │  + RLS       │    │              │    │            │  │
│  └──────┬───────┘    └──────┬───────┘    └───────────┘  │
│         │                   │                           │
│         │    PII, transactions, audit logs               │
│         │    remain in-region                            │
└─────────┼───────────────────┼───────────────────────────┘
          │                   │
          │ Non-PII metadata  │ Adapter calls
          ▼                   ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│  Global Control     │  │  External Services            │
│  Plane              │  │  (SPI/Pix, DICT, COAF,       │
│  (tenant config,    │  │   KYC providers, sanctions)   │
│   feature flags)    │  │                               │
└─────────────────────┘  └──────────────────────────────┘
```

### 8.2 Data Classification by Flow

| Data Category                     | Classification | Residency            | Retention                    |
| --------------------------------- | -------------- | -------------------- | ---------------------------- |
| Customer PII (CPF, name, address) | Restricted     | LATAM region only    | 5 years post account closure |
| Transaction records               | Confidential   | LATAM region only    | 5 years minimum (CMN)        |
| Pix key mappings                  | Restricted     | LATAM region only    | Duration of key registration |
| Audit logs                        | Confidential   | LATAM region only    | 5 years minimum              |
| Consent records                   | Confidential   | LATAM region only    | 5 years post expiry          |
| Tenant configuration              | Internal       | Global control plane | Active tenant lifetime       |
| Aggregated analytics              | Internal       | Global control plane | 2 years                      |

---

## 9. Policy Alignment Matrix

| Platform Feature         | BCB/CMN                       | LGPD                          | COAF/AML               | Open Finance           | Res. 4.893              |
| ------------------------ | ----------------------------- | ----------------------------- | ---------------------- | ---------------------- | ----------------------- |
| Row Level Security       | --                            | Art. 46 (technical measures)  | --                     | Data isolation         | Art. 8 (access control) |
| Audit Logger             | Resolution 4.658 (BCB access) | Art. 50 (accountability)      | Transaction trail      | Consent audit          | Art. 12 (audit trail)   |
| DataExport               | --                            | Art. 18 (DSAR)                | --                     | --                     | --                      |
| ComplianceCenter         | --                            | --                            | STR filing             | --                     | Incident tracking       |
| MFA enforcement          | --                            | Art. 46                       | --                     | FAPI profile           | Art. 8                  |
| Consent management       | --                            | Art. 7-8 (consent basis)      | --                     | Phase 2-3 consent      | --                      |
| `aliasPayments` flag     | Pix regulation                | --                            | Transaction monitoring | Phase 3 (payment init) | --                      |
| `amlScreening` flag      | --                            | --                            | CMN 2.025 CDD          | --                     | --                      |
| KYC adapter              | --                            | Art. 7, II (legal obligation) | CMN 2.025 CDD          | --                     | Art. 14 (third-party)   |
| Incident Manager         | Res. 4.658 (24h notify)       | Art. 48 (breach notify)       | --                     | --                     | Art. 3, Art. 16         |
| Data classification      | --                            | Art. 46                       | --                     | --                     | Art. 10                 |
| Session timeout (10 min) | BCB digital channel guidance  | --                            | --                     | FAPI session rules     | Art. 8                  |
| Data residency config    | Res. 4.658 (data access)      | Art. 33 (intl transfers)      | --                     | --                     | --                      |

---

## 10. Gap Analysis -- Tenant-Specific Configuration for Brazil

The following items require tenant-level configuration or additional development when deploying Fiducia for a Brazilian institution.

### 10.1 Required Configuration (Supported, Needs Tenant Setup)

| Item                                       | Action Required                                                                  | Effort              |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------- |
| Pix adapter credentials                    | Connect SPI participant or PSP; configure DICT proxy URL                         | Configuration       |
| CPF/CNPJ validation provider               | Register with Serpro or equivalent; configure KYC adapter                        | Configuration       |
| COAF SISCOAF credentials                   | Obtain institutional access; configure STR export format                         | Configuration       |
| Open Finance Brasil directory registration | Register with governance body; configure mTLS certificates                       | Configuration + Ops |
| ANPD DPO registration                      | Appoint DPO; configure contact in tenant settings                                | Configuration       |
| Portuguese (pt-BR) locale                  | Already supported in `supportedLanguages`; verify all 6 i18n namespaces complete | Validation          |

### 10.2 Gaps Requiring Development

| Gap                            | Description                                                                                     | Priority | Estimated Effort |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | -------- | ---------------- |
| **DICT integration adapter**   | Direct integration with BCB's DICT for Pix key resolution (currently requires PSP intermediary) | High     | 2-3 sprints      |
| **SISCOAF report format**      | Automated STR generation in COAF's specific XML schema                                          | High     | 1-2 sprints      |
| **Open Finance Phase 4 APIs**  | Insurance, investment, and pension data sharing endpoints                                       | Medium   | 3-4 sprints      |
| **Pix QR code standards**      | Full BR Code specification compliance (dynamic QR with merchant data)                           | Medium   | 1 sprint         |
| **LGPD cookie consent banner** | Brazil-specific consent language and ANPD-compliant opt-in flow                                 | Medium   | 1 sprint         |
| **PEP list integration**       | Automated ingestion of Brazilian PEP lists from official sources                                | Medium   | 1 sprint         |
| **BACEN STAR reporting**       | Automated generation of BCB's STAR regulatory reports                                           | Low      | 2 sprints        |
| **Pix Garantias**              | Support for Pix-based collateral/guarantee flows                                                | Low      | 2-3 sprints      |

### 10.3 Operational Prerequisites

Before going live in Brazil, the deploying institution must:

1. Obtain BCB authorization as a payment institution or partner with an authorized SPI participant.
2. Complete Open Finance Brasil onboarding and directory registration.
3. Register with COAF and establish STR filing procedures.
4. Appoint a DPO and register with ANPD.
5. Execute a penetration test scoped to the Brazilian deployment and remediate findings.
6. Validate that all infrastructure resides in a LATAM data center (or has approved cross-border transfer mechanisms).
7. Run `npm run i18n:check` to confirm pt-BR translation completeness across all namespaces.
8. Configure the tenant using the Brazil Digital Bank market template and verify all feature flags via `npm run validate`.
