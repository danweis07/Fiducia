# Africa Regulatory Framework — Fiducia Digital Banking Platform

> Revision 2026-03-17 | Classification: Internal — Regulatory & Compliance

## 1. Regulatory Landscape

Africa's digital banking environment spans dozens of distinct regulatory regimes. Fiducia targets four primary markets — South Africa, Nigeria, Kenya, and Ghana — while maintaining an extensible compliance architecture that supports pan-African expansion under the African Continental Free Trade Area (AfCFTA).

### 1.1 Key Regulators by Market

| Country | Primary Regulator | Prudential Authority | Data Protection | Payment Systems |
|---|---|---|---|---|
| South Africa | SARB | Prudential Authority (PA) | Information Regulator (POPIA) | PASA / NPS Act |
| Nigeria | Central Bank of Nigeria (CBN) | CBN | NDPR / NITDA | NIBSS |
| Kenya | Central Bank of Kenya (CBK) | CBK | ODPC (DPA 2019) | NPS Act 2011 |
| Ghana | Bank of Ghana (BoG) | BoG | Data Protection Commission | GhIPSS |

### 1.2 Cross-Cutting Themes

Across all four markets, regulators share common priorities that shape Fiducia's compliance posture:

- **Financial inclusion mandates** requiring tiered KYC and low-barrier account opening.
- **Mobile-first expectations** driven by high smartphone penetration and low desktop usage.
- **Data sovereignty** rules that restrict or condition cross-border data transfers.
- **Agent banking frameworks** that extend formal banking to unbanked populations.
- **FATF alignment** as each country progresses through mutual evaluation cycles.

## 2. South Africa

### 2.1 Twin Peaks Regulatory Model

South Africa's Twin Peaks model splits oversight between the Prudential Authority (PA), housed within SARB for safety and soundness, and the Financial Sector Conduct Authority (FSCA) for market conduct and consumer protection. Fiducia's tenant configuration for South African deployments must satisfy both pillars simultaneously.

The PA requires that digital banking platforms maintain capital adequacy reporting hooks, liquidity risk dashboards, and automated prudential returns. Fiducia's gateway layer (`src/lib/gateway/`) exposes dedicated action handlers for regulatory reporting that institutions can map to PA submission formats.

The FSCA's Treating Customers Fairly (TCF) outcomes require transparent fee disclosure, clear product terms, and accessible complaint mechanisms. Fiducia enforces these through configurable fee-disclosure components in `src/components/banking/` and tenant-level complaint-routing workflows.

### 2.2 National Payment System (NPS) Act

The NPS Act, administered by the Payments Association of South Africa (PASA), governs all payment clearing and settlement. Fiducia integrates with South African payment rails through the adapter pattern:

- **EFT (Electronic Funds Transfer):** Batch and real-time EFT via the BankservAfrica clearing house.
- **RTC (Real-Time Clearing):** Sub-ten-second interbank transfers aligned with PASA's RTC rules.
- **Card schemes:** Domestic card processing through BankservAfrica's card switch.

Each adapter auto-detects credentials from environment variables. When South African payment credentials are absent, the platform falls back to mock implementations in `src/lib/demo-data/`, allowing development without live rail access.

### 2.3 POPIA Compliance

The Protection of Personal Information Act (POPIA) imposes obligations analogous to GDPR but with South Africa-specific enforcement by the Information Regulator. Fiducia satisfies POPIA through several architectural controls:

**Row-Level Security (RLS):** Every database row carries a `tenant_id` column. PostgreSQL RLS policies enforce tenant isolation at the query level, preventing cross-tenant data leakage — a core POPIA requirement for responsible parties acting as operators for multiple institutions.

**Encryption:** All personal information is encrypted at rest (AES-256 via Supabase's storage encryption) and in transit (TLS 1.3). Fiducia's edge functions in `supabase/functions/` enforce TLS termination for all API traffic.

**Data subject rights:** POPIA grants data subjects the right to access, correct, and delete their personal information. Fiducia provides self-service data export and account deletion flows in `src/pages/`, with audit trails stored in immutable append-only tables protected by RLS.

**Cross-border transfers:** POPIA Section 72 restricts transfers of personal information outside South Africa unless the recipient country provides adequate protection. Fiducia's deployment architecture supports in-country data residency through region-locked Supabase projects and CDN configurations in `deploy/`.

### 2.4 SARB Directives on Digital Banking

SARB Directive 3/2022 establishes requirements for banks offering digital-only services, including mandatory physical address registration, biometric authentication support, and real-time fraud monitoring. Fiducia's authentication layer supports biometric passkeys via WebAuthn, and the fraud monitoring adapter integrates with local providers such as TransUnion Africa and Experian South Africa.

## 3. Nigeria

### 3.1 CBN Licensing and the Cashless Policy

The CBN's cashless policy, active since 2012 and progressively tightened, limits daily cash withdrawals and incentivizes digital payment adoption. Fiducia supports CBN-licensed institutions across three tiers:

- **Commercial banks** with full CBN licenses.
- **Microfinance banks (MFBs)** operating under tiered MFB licenses.
- **Payment Service Banks (PSBs)** created by CBN's 2018 framework for financial inclusion.

Tenant configuration in Fiducia reflects the institution's license tier, automatically enforcing transaction limits, product restrictions, and reporting obligations appropriate to each category.

### 3.2 BVN Integration

The Bank Verification Number system, managed by NIBSS, assigns a unique biometric identity to every bank customer in Nigeria. Fiducia's KYC adapter pattern supports BVN verification through the following flow:

1. Customer provides an eleven-digit BVN during onboarding.
2. The KYC adapter calls the NIBSS BVN validation API to retrieve biometric and demographic data.
3. The platform performs a liveness check and facial match against the BVN photo.
4. Verification status is recorded in the customer profile with an immutable audit entry.

When NIBSS credentials are not configured, the demo adapter in `src/lib/demo-data/` returns synthetic BVN responses for development and testing.

### 3.3 NIBSS Instant Payment (NIP)

NIP is Nigeria's real-time interbank transfer system, processing the majority of electronic fund transfers in the country. Fiducia's payment adapter for Nigeria implements the NIP protocol, supporting:

- Real-time name enquiry before transfer initiation.
- Transaction status callbacks and reconciliation.
- Daily transaction volume reporting to the CBN.
- Automatic retry with idempotency keys for network-resilient transfers.

### 3.4 CBN Cybersecurity Framework

The CBN's Risk-Based Cybersecurity Framework and Guidelines (2022) mandate specific controls for all financial institutions. Fiducia addresses these through:

| CBN Requirement | Fiducia Control |
|---|---|
| Multi-factor authentication | WebAuthn + TOTP support in auth context (`src/contexts/`) |
| Encryption of data at rest and in transit | AES-256 storage encryption, TLS 1.3 for all API traffic |
| Security incident reporting within 24 hours | Alertmanager integration in `monitoring/` with CBN-formatted templates |
| Annual penetration testing | CI/CD pipeline includes DAST scanning; results exportable for CBN review |
| Business continuity planning | Multi-region failover documented in `deploy/` configurations |

### 3.5 Nigeria Data Protection Regulation (NDPR)

The NDPR, enforced by NITDA, requires data controllers to conduct Data Protection Impact Assessments (DPIAs) and appoint Data Protection Officers. Fiducia supports NDPR compliance through configurable data retention policies per tenant, consent management flows, and automated DPIA templates that map platform features to NDPR obligations.

## 4. Kenya

### 4.1 CBK Digital Lending Regulations

The CBK's Digital Credit Providers Regulations (2022) require all digital lenders to be licensed and to comply with transparency, pricing disclosure, and data-use restrictions. Fiducia's lending module enforces:

- APR disclosure before loan acceptance, rendered through standardized UI components.
- Cooling-off period logic configurable per tenant to match CBK requirements.
- Prohibition on accessing customer contact lists or social media — enforced at the API permission layer.
- Mandatory credit bureau reporting to TransUnion Kenya and Metropol CRB.

### 4.2 Mobile Money Integration Patterns

Kenya's mobile money ecosystem, led by M-Pesa, is foundational to digital banking. Fiducia implements mobile money integration through a dedicated adapter:

**M-Pesa Daraja API adapter:** Supports C2B (Customer to Business), B2C (Business to Customer), and B2B payment flows. The adapter handles M-Pesa's callback-driven architecture with webhook endpoints deployed as Supabase edge functions.

**Float management:** Agent banking and mobile money operations require float tracking. Fiducia's accounting module supports real-time float balance monitoring with configurable low-balance alerts.

**USSD fallback:** For feature phone users, Fiducia provides a USSD session gateway that maps menu-driven interactions to the same backend services used by the web and mobile clients. The USSD adapter is registered alongside REST and Supabase providers in `src/lib/backend/`.

### 4.3 National Payment System Act (2011)

The NPS Act and its 2014 regulations govern payment service providers in Kenya. Fiducia supports compliance with PesaLink (real-time interbank transfers via IPSL), RTGS integration for high-value settlements, and EFT batch processing through the Kenya Bankers Association automated clearing house.

### 4.4 Data Protection Act 2019

Kenya's DPA 2019, enforced by the Office of the Data Protection Commissioner (ODPC), requires lawful processing, data minimization, and breach notification within 72 hours. Fiducia's breach detection pipeline — powered by Alertmanager rules in `monitoring/` — triggers automated notifications to the ODPC-designated contact when anomalous data access patterns are detected.

## 5. Ghana

### 5.1 Bank of Ghana (BoG) Digital Financial Services Policy

The BoG's 2020 Cyber and Information Security Directive applies to all regulated entities. Fiducia's deployment for Ghanaian institutions maps to BoG requirements for dedicated security operations, vulnerability management, and quarterly security assessments.

### 5.2 Ghana Interbank Payment and Settlement Systems (GhIPSS)

Fiducia integrates with GhIPSS through adapters for GhIPSS Instant Pay (GIP) for real-time transfers, the Automated Clearing House for batch payments, and the e-zwich biometric payment system for financial inclusion use cases.

### 5.3 Mobile Money Interoperability

Ghana's mobile money interoperability platform, managed by GhIPSS, allows transfers between mobile money wallets and bank accounts. Fiducia's adapter supports this bidirectional flow, enabling bank customers to send and receive funds from MTN MoMo, Vodafone Cash, and AirtelTigo Money wallets.

## 6. Pan-African Considerations

### 6.1 AfCFTA Digital Trade Protocol

The African Continental Free Trade Area's Protocol on Digital Trade, under negotiation, will establish rules for cross-border data flows, digital payments, and electronic transactions across the continent. Fiducia's multi-tenant architecture positions institutions to comply by supporting per-tenant data residency rules and cross-border payment routing that respects bilateral and multilateral agreements.

### 6.2 Mobile-First Design Requirements

African markets require mobile-first interfaces as the primary access channel. Fiducia enforces this through responsive Tailwind CSS layouts optimized for low-bandwidth conditions, progressive image loading, offline-capable service workers, and lightweight bundle sizes achieved through React lazy loading in route definitions (`src/routes/`).

### 6.3 Agent Banking Support

Agent banking extends formal financial services through third-party agents in underserved areas. Fiducia supports agent banking through dedicated agent user roles with configurable transaction limits, float management dashboards, and real-time commission tracking. The agent banking module uses the same RLS-enforced multi-tenancy as all other platform features.

### 6.4 Financial Inclusion Mandates

Regulators across Africa mandate tiered KYC to reduce barriers for low-income customers. Fiducia supports three KYC tiers:

| Tier | Verification | Daily Limit | Balance Cap |
|---|---|---|---|
| Tier 1 | Phone number + name | Country-specific | Country-specific |
| Tier 2 | National ID + photo | Higher threshold | Higher threshold |
| Tier 3 | Full KYC + address + BVN/equivalent | Unrestricted | Unrestricted |

Tier thresholds are configurable per tenant and per country to match local regulatory requirements.

## 7. AML/CFT Compliance

### 7.1 FATF Mutual Evaluation Status

Each target market undergoes periodic FATF or FATF-Style Regional Body (FSRB) mutual evaluations. Fiducia's AML controls are calibrated to the risk profile assigned by the relevant FSRB:

- **South Africa (ESAAMLG):** Grey-listed in 2023; enhanced due diligence controls are enabled by default for SA tenants.
- **Nigeria (GIABA):** Subject to strategic deficiency action plans; Fiducia enforces enhanced transaction monitoring thresholds.
- **Kenya (ESAAMLG):** Compliant on most recommendations; standard AML controls apply.
- **Ghana (GIABA):** Largely compliant; standard controls with enhanced PEP screening.

### 7.2 Currency Transaction Reporting (CTR) Thresholds

| Country | CTR Threshold | Reporting Authority | Deadline |
|---|---|---|---|
| South Africa | ZAR 25,000 | Financial Intelligence Centre (FIC) | Within 15 days |
| Nigeria | NGN 5,000,000 (individual) / NGN 10,000,000 (corporate) | NFIU | Within 24 hours |
| Kenya | KES 1,000,000 | Financial Reporting Centre (FRC) | Within 7 days |
| Ghana | GHS 20,000 | Financial Intelligence Centre | Within 15 days |

Fiducia's transaction monitoring engine automatically flags transactions exceeding these thresholds and generates pre-formatted reports for the relevant financial intelligence unit.

### 7.3 PEP Screening

Politically Exposed Person screening is mandatory across all four markets. Fiducia integrates with PEP databases through the compliance adapter pattern, supporting providers such as Refinitiv World-Check, Dow Jones Risk & Compliance, and locally sourced PEP lists maintained by each country's financial intelligence unit. Screening runs at onboarding and on a configurable periodic basis thereafter.

### 7.4 Suspicious Transaction Reports (STRs)

All four jurisdictions require institutions to file STRs when transactions exhibit indicators of money laundering or terrorist financing. Fiducia's rule engine supports configurable STR triggers including structuring detection, rapid movement of funds, and geographic risk scoring based on counterparty jurisdiction.

## 8. Control Narratives

### 8.1 Narrative for South African Regulators (PA and FSCA)

Fiducia enforces tenant isolation through PostgreSQL Row-Level Security policies applied to every table containing customer or financial data. Each tenant's data is logically separated at the database level, and no application-layer query can bypass this enforcement. Authentication is managed through Supabase Auth with support for multi-factor authentication including TOTP and WebAuthn. All personal information is encrypted at rest using AES-256 and in transit using TLS 1.3, satisfying both POPIA's security safeguard requirements and the PA's operational resilience expectations. Audit logs are maintained in append-only tables with tamper-evident hashing, and all administrative actions are attributable to individual users.

### 8.2 Narrative for CBN (Nigeria)

The platform implements the CBN's Risk-Based Cybersecurity Framework through layered controls. Access to banking functions requires multi-factor authentication. BVN verification is performed during onboarding through direct integration with NIBSS APIs, ensuring identity assurance consistent with CBN Circular FPR/DIR/GEN/CIR/07/009. Transaction limits are enforced at the application layer based on the institution's CBN license tier, and all transactions are monitored against AML thresholds defined by the NFIU. Cybersecurity incident detection is automated through monitoring infrastructure with alerting configured to meet the CBN's 24-hour notification requirement.

### 8.3 Narrative for CBK (Kenya)

Fiducia supports compliance with the CBK Prudential Guidelines through automated regulatory reporting, capital adequacy monitoring, and real-time liquidity dashboards. Digital lending operations comply with the Digital Credit Providers Regulations through mandatory APR disclosure, cooling-off period enforcement, and credit bureau reporting. Mobile money integration through the M-Pesa Daraja API follows CBK's agent banking guidelines, with float management controls and transaction reconciliation. Data protection obligations under the DPA 2019 are met through encryption, access controls, and automated breach notification workflows.

## 9. Data Flow Maps

### 9.1 Data Residency by Country

```
South Africa                Nigeria                   Kenya
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Supabase Project│      │ Supabase Project│      │ Supabase Project│
│ (AF-South)      │      │ (AF-West)       │      │ (AF-East)       │
│                 │      │                 │      │                 │
│ - Customer PII  │      │ - Customer PII  │      │ - Customer PII  │
│ - Transactions  │      │ - Transactions  │      │ - Transactions  │
│ - KYC records   │      │ - BVN data      │      │ - M-Pesa logs   │
│ - Audit logs    │      │ - Audit logs    │      │ - Audit logs    │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Shared Services (Non-PII Only)                    │
│  - Anonymized analytics    - Feature flags    - UI configuration    │
│  - Translation bundles     - Rate definitions - Product catalog     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Cross-Border Transfer Flow (Intra-Africa)

```
Sending Institution (Country A)          Receiving Institution (Country B)
┌──────────────────────┐                ┌──────────────────────┐
│ Fiducia Tenant       │                │ Fiducia Tenant       │
│                      │   Gateway      │                      │
│ 1. Initiate transfer ├───────────────►│ 5. Credit recipient  │
│ 2. AML screening     │   RPC Action   │ 6. Notify customer   │
│ 3. FX rate lookup    │                │ 7. Log audit trail   │
│ 4. Debit sender      │                │                      │
└──────────┬───────────┘                └──────────┬───────────┘
           │                                       │
           ▼                                       ▼
    Country A FIU Report                    Country B FIU Report
    (if threshold met)                      (if threshold met)
```

### 9.3 Data Residency Rules

| Data Category | Residency Rule | Justification |
|---|---|---|
| Customer PII | Must remain in-country | POPIA s72, NDPR, DPA 2019 |
| Transaction records | Must remain in-country | Central bank regulations |
| BVN biometric data | Nigeria only | NIBSS data sharing agreement |
| Anonymized analytics | May cross borders | No PII; exempt from residency rules |
| System configuration | May cross borders | Non-personal operational data |
| Audit logs | Must remain in-country | Regulatory examination requirements |

## 10. Policy Alignment Matrix

| Fiducia Feature | South Africa | Nigeria | Kenya | Ghana |
|---|---|---|---|---|
| Row-Level Security | POPIA s19 (security safeguards) | NDPR 2.1 (data security) | DPA 2019 s41 | DPA 2012 s28 |
| Multi-factor auth | PA Directive 3/2022 | CBN Cybersecurity Framework | CBK Prudential Guidelines | BoG Cyber Directive |
| BVN/national ID KYC | FICA s21 | CBN KYC Regs / BVN mandate | CBK KYC Guidelines | BoG AML/CFT |
| Tiered KYC | SARB Directive 7 | CBN 3-tier KYC | CBK tiered approach | BoG e-money guidelines |
| Mobile money adapter | N/A (limited) | CBN mobile money regs | CBK M-Pesa guidelines | BoG e-money directive |
| Agent banking module | SARB agent banking guidance | CBN agent banking guidelines | CBK agent banking regs | BoG agent guidelines |
| Transaction monitoring | FIC Act (FICA) | NFIU Act | POCAMLA | AML Act 2020 |
| Fee disclosure | FSCA TCF outcomes | CBN consumer protection | CBK transparency rules | BoG market conduct |
| Data export/deletion | POPIA s24 (data subject rights) | NDPR 3.1 (individual rights) | DPA 2019 s26 | DPA 2012 s18 |
| Breach notification | POPIA s22 (72 hours) | NDPR (72 hours) | DPA 2019 s43 (72 hours) | DPA 2012 (48 hours) |
| Audit logging | PA operational resilience | CBN examination readiness | CBK supervisory requirements | BoG reporting requirements |
| Encryption at rest | POPIA s19 | CBN Cybersecurity s4.3 | DPA 2019 s41 | BoG Cyber Directive s5 |

## 11. Gap Analysis

### 11.1 Mobile Money Integration

| Gap | Impact | Priority | Remediation Path |
|---|---|---|---|
| USSD session management at scale | Feature phone users may experience timeouts | High | Implement session persistence in edge functions with 120-second timeout |
| M-Pesa STK Push error handling | Failed push notifications leave transactions in limbo | High | Add reconciliation cron job and manual retry flow |
| Ghana mobile money interop testing | GhIPSS sandbox availability is limited | Medium | Build comprehensive mock adapter using production message formats |
| Airtel Money integration | Missing adapter for East Africa's second-largest MNO | Medium | Extend mobile money adapter interface; implement Airtel API client |

### 11.2 Agent Banking

| Gap | Impact | Priority | Remediation Path |
|---|---|---|---|
| Offline transaction queuing | Agents in low-connectivity areas cannot transact | High | Implement service worker with IndexedDB queue; sync on reconnect |
| Agent float reconciliation | End-of-day float mismatches require manual resolution | Medium | Add automated reconciliation comparing agent ledger to bank ledger |
| Agent device management | No MDM integration for agent terminals | Low | Integrate with third-party MDM; enforce app version and OS policies |

### 11.3 Local Payment Rails

| Gap | Impact | Priority | Remediation Path |
|---|---|---|---|
| NIBSS direct debit mandate | Cannot originate direct debits in Nigeria | High | Implement NIBSS direct debit API adapter with mandate management |
| PesaLink bulk payments | No batch API for Kenya interbank transfers | Medium | Build batch processor wrapping individual PesaLink API calls |
| e-zwich biometric integration | Ghana biometric card payments not supported | Medium | Integrate e-zwich SDK for biometric authentication at point of sale |
| SARB SAMOS integration | No direct RTGS access for South African high-value | Low | Partner with settlement bank; implement SWIFT message adapter |

### 11.4 Regulatory Reporting

| Gap | Impact | Priority | Remediation Path |
|---|---|---|---|
| CBN automated returns | Prudential returns require manual data extraction | High | Build report generator mapping Fiducia data to CBN return templates |
| FIC goAML integration | South African STR filing is manual | Medium | Implement goAML XML export from transaction monitoring engine |
| CBK digital lending reports | Quarterly DCP reports assembled manually | Medium | Automate report generation from lending module transaction data |
| Cross-border payment reporting | AfCFTA reporting formats not yet defined | Low | Monitor AfCFTA protocol developments; prepare flexible report schema |

---

*This document should be reviewed quarterly against regulatory developments in each market. Country-specific addenda may be appended as new regulations are promulgated. All control implementations reference Fiducia's architecture as documented in `docs/ARCHITECTURE.md` and security controls in `docs/security/CONTROLS-MATRIX.md`.*
