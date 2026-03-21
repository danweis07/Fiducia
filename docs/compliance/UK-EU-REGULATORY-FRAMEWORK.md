# UK/EU Regulatory Compliance Framework

**Platform:** Fiducia — Multi-Tenant Digital Banking Platform
**Version:** 2.0
**Last Reviewed:** 2026-03-17
**Classification:** Internal — Regulatory & Compliance
**Owner:** Chief Compliance Officer / Head of Regulatory Affairs

---

## Table of Contents

1. [Regulatory Landscape](#1-regulatory-landscape)
2. [FCA Compliance](#2-fca-compliance)
3. [PSD2 and Payment Services Regulations](#3-psd2-and-payment-services-regulations)
4. [GDPR and Data Protection](#4-gdpr-and-data-protection)
5. [DORA — Digital Operational Resilience Act](#5-dora--digital-operational-resilience-act)
6. [EBA Guidelines](#6-eba-guidelines)
7. [Control Narratives for Supervisors](#7-control-narratives-for-supervisors)
8. [Data Flow Maps](#8-data-flow-maps)
9. [Policy Alignment Matrix](#9-policy-alignment-matrix)
10. [Examination Readiness — FCA Section 166](#10-examination-readiness--fca-section-166)

---

## 1. Regulatory Landscape

Fiducia operates within the overlapping jurisdictions of UK and EU financial regulation. The platform is engineered to satisfy the requirements of the following supervisory authorities and regulatory bodies.

### 1.1 United Kingdom

| Authority                                   | Scope                                                              | Relevance to Fiducia                                 |
| ------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| **Financial Conduct Authority (FCA)**       | Conduct regulation, consumer protection, market integrity          | Conduct rules, operational resilience, consumer duty |
| **Prudential Regulation Authority (PRA)**   | Prudential supervision of banks, building societies, credit unions | Capital adequacy reporting, outsourcing expectations |
| **Bank of England**                         | Financial stability, payment systems oversight                     | Systemic resilience, settlement finality             |
| **Information Commissioner's Office (ICO)** | Data protection enforcement (UK GDPR)                              | Personal data processing, breach notification        |
| **Payment Systems Regulator (PSR)**         | Payment systems access and competition                             | Open banking access, interchange fee compliance      |

### 1.2 European Union

| Authority                                            | Scope                                                  | Relevance to Fiducia                                   |
| ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| **European Banking Authority (EBA)**                 | Prudential standards, ICT risk, outsourcing guidelines | ICT risk management framework, cloud outsourcing       |
| **European Central Bank (ECB)**                      | Monetary policy, banking supervision (SSM)             | Supervisory expectations for digital banking           |
| **European Data Protection Board (EDPB)**            | GDPR guidance and enforcement coordination             | Cross-border data transfer, consent standards          |
| **National Competent Authorities**                   | Member-state-level banking supervision                 | Local licensing, conduct requirements per jurisdiction |
| **European Securities and Markets Authority (ESMA)** | Securities and markets regulation                      | Relevant where platform supports investment services   |

Fiducia's compliance architecture is designed so that tenant institutions can satisfy the requirements of all applicable authorities simultaneously, without requiring separate platform configurations per jurisdiction.

---

## 2. FCA Compliance

### 2.1 Senior Managers & Certification Regime (SMCR)

The SMCR requires that senior individuals within regulated firms are accountable for the areas of the business they manage. Fiducia supports SMCR obligations through the following platform capabilities:

- **Role-based access controls** enforce clear segregation of duties aligned to Senior Management Functions (SMFs). Admin-tier permissions mirror prescribed responsibility maps, ensuring that system access reflects regulatory accountability.
- **Audit logging** captures all material actions taken by certified persons within the platform, providing a contemporaneous record suitable for Section 62A attestations.
- **Approval workflows** within the Control Tower require dual authorisation for high-impact changes (deployment promotions, configuration modifications, access privilege escalations), reinforcing the principle that no single individual can effect a material change without oversight.
- **Conduct rule training records** can be maintained within the platform's compliance module, supporting annual fitness and propriety assessments.

### 2.2 FCA Consumer Duty (PS22/9)

Fiducia's design supports the four outcomes of the Consumer Duty:

1. **Products and services** — Tenant institutions configure product catalogues with clear eligibility criteria; the platform prevents offering unsuitable products to consumers outside defined target markets.
2. **Price and value** — Fee schedules are transparent, auditable, and surfaced to consumers prior to transaction execution.
3. **Consumer understanding** — Multi-language support (33 locales via `src/lib/i18n/`) ensures communications are accessible. Plain-language descriptions are enforced through content review workflows.
4. **Consumer support** — Accessibility features (WCAG 2.1 AA compliance, skip links, screen reader compatibility) ensure equitable access across consumer demographics.

### 2.3 Operational Resilience (FCA PS21/3, PRA PS6/21)

The FCA and PRA operational resilience framework, effective since March 2025, requires firms to identify Important Business Services (IBS), set impact tolerances, and demonstrate the ability to remain within those tolerances during severe but plausible disruption scenarios.

Fiducia directly supports these obligations:

- **Incident Manager** (`src/pages/admin/IncidentManager.tsx`) provides a structured three-panel interface for incident detection, investigation, mitigation, and resolution. Incidents are classified by severity (critical, high, medium, low) and tracked through a full lifecycle: `detected` → `investigating` → `mitigating` → `resolved` → `postmortem`. Each incident maintains a timestamped timeline of actions, actors, and decisions.
- **Automated rollback** capability allows deployment reversions (full, migration-only, or functions-only) to be initiated directly from the Incident Manager. Rollback status is tracked (`pending` → `in_progress` → `completed` or `failed`) with pre- and post-rollback health checks recorded.
- **Control Tower** (`src/pages/admin/ControlTower.tsx`) provides a four-quadrant operational dashboard covering deployments, approval status, test results, and system health. This enables real-time visibility into platform state, directly supporting the FCA's expectation that firms can monitor Important Business Services continuously.
- **Stakeholder notification** is integrated into the incident workflow, ensuring that affected parties — including regulators where required — are notified within impact tolerance windows.
- **Service health monitoring** tracks the status (`healthy`, `degraded`, `down`) and latency of each platform component, providing the evidence base for impact tolerance self-assessments.

These capabilities collectively demonstrate that Fiducia-powered institutions can detect disruptions, respond within defined tolerances, and recover critical services in a manner consistent with PS21/3 and PS6/21 expectations.

---

## 3. PSD2 and Payment Services Regulations

### 3.1 Strong Customer Authentication (SCA)

Fiducia implements SCA in accordance with the Regulatory Technical Standards (RTS) under PSD2 (Commission Delegated Regulation (EU) 2018/389) and the equivalent UK provisions under the Payment Services Regulations 2017 (as amended).

Authentication enforces at least two of the three prescribed factors:

| Factor                                   | Implementation                                                     |
| ---------------------------------------- | ------------------------------------------------------------------ |
| **Knowledge** (something the user knows) | Password, PIN, security questions                                  |
| **Possession** (something the user has)  | TOTP authenticator app, hardware security key (WebAuthn/FIDO2)     |
| **Inherence** (something the user is)    | Biometric verification (delegated to device-native APIs on mobile) |

SCA is triggered for all remote electronic payment transactions, account information access by third parties, and any action that may create a risk of payment fraud. Exemptions (low-value transactions, trusted beneficiaries, recurring payments of the same amount) are applied in accordance with Article 10-18 of the RTS.

### 3.2 Open Banking Consent Management

The platform's consent management infrastructure is implemented at the database layer (`supabase/migrations/20260316_open_banking_consent.sql`) and provides the following capabilities:

- **Granular consent records** track which Third-Party Providers (TPPs) have been authorised, the specific scopes granted (`account_info`, `balances`, `transactions`, `transfer_initiate`, `identity`), and the accounts covered by each consent.
- **Consent lifecycle management** supports statuses of `active`, `revoked`, `expired`, and `suspended`. Revocation requires a timestamp (`consent_revoked_at`), enforced by database constraint. Automatic expiry of stale consents is handled by the `expire_stale_consents()` function, executable via scheduled invocation.
- **Access audit trail** — The `open_banking_access_logs` table records every data access event by a TPP, capturing the provider identity, scope used, endpoint accessed, response code, IP address, and number of data points retrieved. This satisfies the PSD2 requirement that Account Servicing Payment Service Providers (ASPSPs) maintain records of third-party access.
- **Row Level Security (RLS)** ensures that consumers can view only their own consents and access logs, while administrative access is restricted to service-role credentials.

### 3.3 TPP Access Controls

Fiducia supports the ASPSP obligations under PSD2 Articles 65-67:

- **Account Information Service Providers (AISPs)** are granted read-only access to account data scopes (`account_info`, `balances`, `transactions`) upon consumer consent. Access frequency is configurable per consent record.
- **Payment Initiation Service Providers (PISPs)** are authorised via the `transfer_initiate` scope. Payment initiation requests are subject to SCA and are processed through the platform's gateway endpoint (`/functions/v1/gateway`) with action type `payments.transfer`.
- **Consent revocation** is immediately effective. Upon revocation, subsequent API calls from the TPP are rejected, and the revocation event is recorded in the access log.
- **90-day re-authentication** — Consent records track `last_accessed_at` to support the regulatory requirement for periodic SCA re-confirmation on AIS access.

---

## 4. GDPR and Data Protection

### 4.1 Lawful Basis and Data Processing

Fiducia processes personal data on behalf of tenant institutions, each of which acts as the data controller. The platform operates as a data processor under Article 28 GDPR (and UK GDPR equivalent). Processing is governed by Data Processing Agreements (DPAs) executed with each tenant.

### 4.2 Row Level Security as a Technical Measure

PostgreSQL Row Level Security (RLS), enforced at the database engine level, is a core technical measure under Article 32 GDPR (security of processing):

- **Tenant isolation** — Every data row is tagged with a `tenant_id`. RLS policies ensure that queries from one tenant can never return data belonging to another, regardless of application-layer logic. This constitutes data protection by design and by default under Article 25.
- **User-level isolation** — Within each tenant, RLS policies further restrict access so that consumers see only their own records (consents, transactions, account data). Administrative users access only the data within their assigned tenant.
- **Defence in depth** — RLS operates independently of the application layer. Even if application code contains a bug that omits a tenant filter, the database engine enforces isolation. This architectural choice eliminates an entire class of data breach vectors.

### 4.3 Data Subject Rights

| Right                                   | Platform Implementation                                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Right of access (Art. 15)**           | Data Export page (`src/pages/admin/DataExport.tsx`) enables authorised personnel to generate structured exports of a data subject's personal data in machine-readable format. |
| **Right to erasure (Art. 17)**          | Data Export module supports erasure request workflows. Cascading foreign key constraints (`ON DELETE CASCADE`) ensure referential integrity during deletion.                  |
| **Right to data portability (Art. 20)** | Export functionality produces data in JSON format, satisfying the "structured, commonly used, machine-readable" requirement.                                                  |
| **Right to restriction (Art. 18)**      | Account suspension capabilities allow processing to be restricted while a dispute is resolved.                                                                                |
| **Consent withdrawal (Art. 7(3))**      | Open banking consent revocation is effective immediately; withdrawal is as easy as granting consent.                                                                          |

### 4.4 Data Protection Impact Assessments (DPIAs)

Fiducia's multi-tenant architecture requires DPIAs in the following circumstances:

- Onboarding a new tenant institution (new data controller relationship)
- Introducing new categories of personal data processing
- Deploying new third-party integrations that process personal data
- Implementing automated decision-making features (e.g., credit scoring, fraud detection)

The platform's audit logging infrastructure provides the data inventory and processing records (Article 30) needed to conduct and maintain DPIAs.

### 4.5 Breach Notification

The Incident Manager supports the 72-hour breach notification obligation under Article 33 GDPR:

- Incidents classified as data breaches trigger structured notification workflows
- Stakeholder notification records (`notificationSentAt`, `stakeholdersNotified`) provide evidence of timely regulator and data subject communication
- Incident timelines capture the chronology required for supervisory authority notifications

---

## 5. DORA — Digital Operational Resilience Act

The Digital Operational Resilience Act (Regulation (EU) 2022/2554), applicable from January 2025, establishes a comprehensive framework for ICT risk management in the financial sector. Fiducia's platform architecture addresses each of DORA's five pillars.

### 5.1 Pillar I — ICT Risk Management (Articles 5-16)

Fiducia's ICT risk management capabilities include:

- **Asset inventory** — The Control Tower maintains real-time visibility into all platform components, their health status, and interdependencies.
- **Change management** — All deployments are tracked with status (`success`, `failed`, `rolled_back`, `started`), approval records, and test results. The audit narrative links each change to its approval, testing outcome, and post-deployment monitoring.
- **Vulnerability management** — Dependency scanning, static analysis (ESLint strict mode, TypeScript strict mode), and automated test suites (Vitest unit tests, Playwright E2E tests across Chromium, Firefox, WebKit, and mobile Chrome) are integrated into the CI/CD pipeline.
- **Configuration management** — Infrastructure-as-code (Helm charts, Docker Compose, cloud deployment configs for AWS, GCP, Azure, and Cloudflare) ensures reproducible and auditable environment configurations.

### 5.2 Pillar II — ICT Incident Management (Articles 17-23)

The Incident Manager directly satisfies DORA's incident management requirements:

- **Detection** — Incidents are detected via alert rules, health checks, external monitoring integration (Sentry), or manual reporting. Detection source is recorded per incident (`alert_rule`, `health_check`, `sentry`, `manual`).
- **Classification** — Four-tier severity classification (critical, high, medium, low) aligns with DORA's major incident classification criteria.
- **Response** — Structured lifecycle management (`detected` → `investigating` → `mitigating` → `resolved` → `postmortem`) ensures consistent response procedures.
- **Reporting** — Incident records contain all fields required for DORA incident reports to competent authorities: description, severity, affected services, timeline, resolution summary, and root cause (via postmortem).
- **Notification** — Integrated stakeholder notification with timestamp evidence supports the initial notification (within 4 hours), intermediate report, and final report obligations.

### 5.3 Pillar III — Digital Operational Resilience Testing (Articles 24-27)

- **Continuous testing** — The platform's test suite (`npm run validate`) executes linting, type-checking, unit tests, and build verification. Coverage thresholds (50% statements/lines, 40% branches/functions) are enforced.
- **E2E scenario testing** — Playwright tests (`npm run test:e2e`) simulate end-to-end user journeys across multiple browser engines and device profiles.
- **Load testing** — k6 scripts (`tests/load/`, `load-tests/k6/`) support Threat-Led Penetration Testing (TLPT) and capacity planning under stress conditions.
- **Rollback verification** — Pre- and post-rollback health checks validate system integrity after recovery operations.

### 5.4 Pillar IV — Third-Party ICT Risk (Articles 28-44)

Fiducia's adapter pattern architecture provides structural controls for third-party ICT risk:

- **Abstraction layer** — External integrations (core banking, KYC, payments, AI services) are accessed through a provider abstraction (`src/lib/backend/`). This ensures that no third-party dependency is tightly coupled to the platform.
- **Graceful degradation** — The adapter registry auto-detects credentials via environment variables. When third-party credentials are absent, the platform falls back to mock implementations. This ensures service continuity even during third-party outages.
- **Concentration risk mitigation** — The swappable adapter pattern means that any critical third-party provider can be replaced without platform-wide re-engineering, directly addressing DORA's concentration risk provisions.
- **Exit strategies** — The standardised interface contracts defined in `src/types/` ensure that migration to alternative providers is structurally feasible.

### 5.5 Pillar V — Information Sharing (Article 45)

The platform's audit logging and incident management infrastructure produces structured, machine-readable records suitable for information sharing with competent authorities, peer institutions, and Financial Sector Information Sharing and Analysis Centres (FS-ISACs).

---

## 6. EBA Guidelines

### 6.1 EBA Guidelines on ICT and Security Risk Management (EBA/GL/2019/04)

| EBA Requirement                              | Fiducia Control                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| ICT governance and strategy                  | Control Tower provides board-level visibility into ICT operational status       |
| ICT risk management framework                | Structured incident lifecycle, severity classification, and resolution tracking |
| Information security                         | RLS-enforced data isolation, RBAC, SCA, encryption at rest and in transit       |
| ICT operations management                    | Deployment tracking, change approval workflows, health monitoring               |
| ICT project and change management            | Dual-authorisation deployment approvals, pre-deployment test gates              |
| Business continuity management               | Automated rollback, multi-region deployment support, health check monitoring    |
| Payment service user relationship management | Transparent consent management, multi-language consumer communications          |

### 6.2 EBA Guidelines on Outsourcing Arrangements (EBA/GL/2019/02)

For tenant institutions deploying Fiducia as a managed service, the following outsourcing controls are in place:

- **Risk assessment** — The adapter pattern isolates outsourced functions, enabling per-provider risk assessment without systemic exposure.
- **Due diligence** — Provider metadata (name, ID, URL, logo) is recorded in consent and integration records, supporting ongoing due diligence.
- **Contractual requirements** — The platform's DPA and service agreements address sub-processor chains, audit rights, data location, and termination provisions.
- **Monitoring** — Real-time health monitoring of all integrated services provides continuous oversight of outsourced functions.

### 6.3 EBA Guidelines on Cloud Outsourcing

- **Data location** — Deployment configurations (`deploy/`) support region-specific hosting to satisfy data residency requirements.
- **Access and audit rights** — Administrative access controls and comprehensive audit logging ensure that supervisory authorities can exercise access rights.
- **Security measures** — Infrastructure-as-code configurations enforce security baselines across all cloud deployment targets.
- **Exit planning** — The adapter pattern and standardised data formats ensure portability across cloud providers.

---

## 7. Control Narratives for Supervisors

The following narratives are prepared for use in FCA/PRA supervisory engagement, Section 166 skilled person reviews, and regulatory correspondence.

### 7.1 Operational Resilience Narrative

Fiducia maintains a continuous operational resilience posture through integrated incident management and deployment control capabilities. When an anomaly is detected — whether by automated alert rules, health check failures, external monitoring, or manual escalation — the Incident Manager initiates a structured response workflow. The platform classifies incidents by severity and tracks them through investigation, mitigation, and resolution phases. For incidents requiring service restoration, automated rollback capabilities allow the platform to revert to a known-good state within defined impact tolerances. Post-incident, a structured postmortem process captures root cause analysis and remediation actions. The Control Tower provides senior management with real-time visibility into system health, deployment status, and pending approvals, ensuring that operational resilience is maintained at all times and that the board can discharge its oversight responsibilities.

### 7.2 ICT Governance Narrative

ICT governance is embedded into the platform's operational model through mandatory change approval workflows, automated testing gates, and comprehensive audit trails. Every change to the production environment follows a documented lifecycle: request, approval, testing, deployment, and monitoring. The Control Tower aggregates this information into a unified dashboard, enabling senior managers to verify that governance controls are functioning effectively. Role-based access controls enforce segregation of duties, and all privileged actions are logged with actor identity, timestamp, and action detail.

### 7.3 Data Protection Narrative

Personal data processed by the platform is protected through a defence-in-depth architecture. At the database layer, PostgreSQL Row Level Security ensures that data belonging to one tenant institution is inaccessible to any other tenant, regardless of application-layer behaviour. Within each tenant, further RLS policies restrict data access to the owning consumer. Data subject rights — including access, portability, erasure, and consent withdrawal — are supported through dedicated platform functions. All data access by third-party providers is logged in an immutable audit trail, and consumers can view and revoke third-party consents at any time.

### 7.4 Third-Party Management Narrative

Third-party dependencies are managed through a provider abstraction architecture that decouples the platform from any single external service. Each integration is implemented behind a standardised interface contract, ensuring that providers can be substituted without disrupting platform operations. The platform continuously monitors the health and latency of all integrated services. When a third-party service becomes unavailable, the platform degrades gracefully by activating fallback implementations, ensuring continuity of Important Business Services. This architecture directly mitigates concentration risk and supports credible exit strategies for all critical third-party relationships.

---

## 8. Data Flow Maps

### 8.1 Data Residency — EU Region Deployment

```
┌──────────────────────────────────────────────────────────┐
│                    EU DATA BOUNDARY                      │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  Consumer    │───▶│  Application │───▶│ PostgreSQL │  │
│  │  Browser/App │◀───│  (EU Region) │◀───│ (EU Region)│  │
│  └─────────────┘    └──────┬───────┘    └────────────┘  │
│                            │                             │
│                     ┌──────▼───────┐                     │
│                     │  Edge Fns    │                     │
│                     │  (EU Region) │                     │
│                     └──────┬───────┘                     │
│                            │                             │
│  ┌─────────────────────────▼─────────────────────────┐  │
│  │              RLS Enforcement Layer                 │  │
│  │  Tenant A ◀──────────▶ Tenant B (isolated)        │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

All personal data is processed and stored within the EU deployment region. No personal data crosses the EU data boundary unless an explicit cross-border transfer mechanism is in place.

### 8.2 Cross-Border Transfer Controls

Where data transfers outside the EU/EEA or UK are required (e.g., integration with a third-party service hosted outside the region), the following safeguards apply:

| Transfer Mechanism                                  | Application                                                                                                                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standard Contractual Clauses (SCCs)**             | Incorporated into all processor and sub-processor agreements where the recipient is outside the EU/EEA. Module 2 (controller-to-processor) and Module 3 (processor-to-processor) clauses are used as applicable. |
| **UK International Data Transfer Agreement (IDTA)** | Applied for transfers from the UK to jurisdictions without adequacy decisions, in accordance with ICO guidance.                                                                                                  |
| **Supplementary measures**                          | Encryption in transit (TLS 1.3), encryption at rest (AES-256), pseudonymisation of identifiers, and contractual prohibitions on onward transfer without authorisation.                                           |
| **Transfer Impact Assessments (TIAs)**              | Conducted for each cross-border data flow, assessing the legal framework in the recipient country and the effectiveness of supplementary measures.                                                               |

### 8.3 Third-Party Data Flows

```
Consumer ──▶ Fiducia Platform ──▶ Core Banking System (via adapter)
                │                          │
                │                    ┌─────▼──────┐
                │                    │ KYC/AML     │ (adapter)
                │                    │ Provider    │
                │                    └─────────────┘
                │
                ├──▶ TPP (AISP) ──── read-only, scoped by consent
                │
                └──▶ TPP (PISP) ──── payment initiation, SCA-gated
```

All third-party data flows are logged in `open_banking_access_logs` with provider identity, scope, endpoint, response code, and timestamp.

---

## 9. Policy Alignment Matrix

The following table maps Fiducia platform features to specific UK/EU regulatory requirements.

| Fiducia Feature                           | FCA           | PRA    | PSD2/PSR     | GDPR/UK GDPR   | DORA       | EBA GL        |
| ----------------------------------------- | ------------- | ------ | ------------ | -------------- | ---------- | ------------- |
| Row Level Security (tenant isolation)     | —             | —      | —            | Art. 25, 32    | Art. 9     | GL/2019/04 §4 |
| Role-based access control                 | SMCR          | —      | Art. 97      | Art. 32        | Art. 9     | GL/2019/04 §4 |
| Strong Customer Authentication            | Consumer Duty | —      | Art. 97, RTS | —              | —          | GL/2019/04 §4 |
| Open banking consent management           | —             | —      | Art. 64-67   | Art. 6-7       | —          | —             |
| TPP access logging                        | —             | —      | Art. 66-67   | Art. 30        | Art. 17    | —             |
| Incident Manager                          | PS21/3        | PS6/21 | —            | Art. 33-34     | Art. 17-23 | GL/2019/04 §7 |
| Control Tower                             | PS21/3        | PS6/21 | —            | —              | Art. 5-16  | GL/2019/04 §3 |
| Automated rollback                        | PS21/3        | PS6/21 | —            | —              | Art. 12    | GL/2019/04 §7 |
| Data Export / erasure                     | Consumer Duty | —      | —            | Art. 15-17, 20 | —          | —             |
| Multi-language support (33 locales)       | Consumer Duty | —      | —            | Art. 12        | —          | GL/2019/04 §8 |
| Adapter pattern (third-party abstraction) | —             | SS2/21 | —            | Art. 28        | Art. 28-44 | GL/2019/02    |
| Audit logging                             | SMCR, SYSC    | —      | Art. 72      | Art. 30        | Art. 12    | GL/2019/04 §5 |
| Infrastructure-as-code                    | —             | —      | —            | —              | Art. 9     | GL Cloud §3   |
| Automated testing (unit, E2E, load)       | PS21/3        | PS6/21 | —            | —              | Art. 24-27 | GL/2019/04 §6 |
| Stakeholder notification workflow         | PS21/3        | PS6/21 | —            | Art. 33-34     | Art. 19    | GL/2019/04 §7 |
| Health monitoring                         | PS21/3        | PS6/21 | —            | —              | Art. 10    | GL/2019/04 §5 |

---

## 10. Examination Readiness — FCA Section 166

An FCA Section 166 skilled person review may be commissioned to assess the adequacy of a firm's systems and controls. The following preparation checklist ensures that Fiducia-powered institutions can respond promptly and comprehensively.

### 10.1 Pre-Examination Document Pack

Assemble the following materials in advance:

- [ ] **Architecture documentation** — System topology, data flow diagrams (Section 8 above), integration inventory
- [ ] **RLS policy inventory** — Complete listing of Row Level Security policies with their enforcement scope
- [ ] **Incident register** — All incidents from the review period, including timelines, severity classifications, resolution summaries, and postmortem reports
- [ ] **Deployment log** — Complete deployment history with approval records, test results, and rollback events
- [ ] **Change management records** — Change requests, approvals, testing evidence, and post-deployment verification
- [ ] **Third-party register** — Inventory of all integrated third-party services, risk assessments, contractual terms, and monitoring records
- [ ] **Data processing records** — Article 30 records of processing activities, DPAs, TIAs for cross-border transfers
- [ ] **Consent management records** — Open banking consent statistics, revocation rates, TPP access volumes
- [ ] **Business continuity plan** — Documented recovery procedures, impact tolerances, scenario test results
- [ ] **Penetration test reports** — Most recent TLPT and vulnerability assessment results

### 10.2 System Demonstration Readiness

Ensure the following demonstrations can be conducted for the skilled person:

1. **Tenant isolation proof** — Demonstrate that RLS prevents cross-tenant data access, including negative test cases
2. **Incident response walkthrough** — Execute a simulated incident through the full lifecycle in the Incident Manager
3. **Rollback demonstration** — Show automated rollback capability with pre- and post-rollback health verification
4. **SCA flow** — Demonstrate the Strong Customer Authentication journey for remote payment initiation
5. **Consent lifecycle** — Walk through consent granting, TPP access, access log review, and consent revocation
6. **Data subject rights** — Demonstrate data export, portability, and erasure request processing
7. **Control Tower overview** — Present the four-quadrant operational dashboard showing real-time system state
8. **Access control review** — Demonstrate role-based permissions, dual-authorisation workflows, and audit trail retrieval

### 10.3 Key Personnel Availability

Ensure the following individuals are available for skilled person interviews:

- SMF24 (Chief Operations Officer) — operational resilience, incident management
- SMF5 (Head of IT) — ICT governance, change management, infrastructure
- DPO (Data Protection Officer) — GDPR compliance, data processing records, breach notification
- MLRO (Money Laundering Reporting Officer) — KYC/AML integration, suspicious activity reporting
- Head of Information Security — access controls, vulnerability management, penetration testing
- Platform Engineering Lead — architecture decisions, RLS implementation, adapter pattern design

### 10.4 Post-Examination Follow-Up

- Document all findings and recommendations from the skilled person report
- Create remediation plans with assigned owners and target completion dates
- Track remediation progress through the Control Tower's change management workflow
- Report remediation status to the Board Risk Committee at each meeting
- File regulatory returns confirming completion of required actions within FCA-specified timeframes

---

_This document is reviewed quarterly and updated following material regulatory changes, platform architecture modifications, or supervisory feedback. The next scheduled review is 2026-06-17._
