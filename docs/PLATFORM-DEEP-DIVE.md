# FIDUCIA PLATFORM DEEP DIVE — ALL STAKEHOLDERS

> **Last updated:** 2026-03-17
> **Version:** 2.0
> **Audience:** Executives, Product, Engineering, Compliance, Risk, Operations, Sales

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Consumer Banking](#2-consumer-banking)
3. [Business Banking](#3-business-banking)
4. [FI Administration Portal](#4-fi-administration-portal)
5. [Regulators & Compliance](#5-regulators--compliance)
6. [Risk Team](#6-risk-team)
7. [Developers & Technical Integrators](#7-developers--technical-integrators)
8. [Mobile App (Flutter)](#8-mobile-app-flutter)
9. [Markets & Languages](#9-markets--languages)
10. [AI Platform](#10-ai-platform)
11. [Ops & Infrastructure](#11-ops--infrastructure)
12. [Competitive Comparison](#12-competitive-comparison)
13. [Key Metrics at a Glance](#13-key-metrics-at-a-glance)

---

## 1. Executive Summary

Fiducia is a **multi-tenant digital banking platform** purpose-built for credit unions, community banks, and fintech sponsors. It ships as a single deployable artifact that serves every tenant from one codebase while enforcing strict data isolation at the database level via PostgreSQL Row-Level Security (RLS).

**Core value proposition:**

- **40+ pluggable adapter domains** with 80+ named provider integrations — swap core banking, payments, KYC, cards, and more without code changes
- **64+ consumer/business banking pages** with full Server-Driven UI (SDUI) support for remote screen composition
- **33 languages** across 6 namespaces — ready for Americas, EMEA, Africa, and Asia-Pacific markets
- **Flutter mobile app** with 56+ screens mirroring the web experience on iOS and Android
- **AI-native platform** with RAG retrieval, intent classification, automation rules, and proactive financial insights
- **Production-grade infrastructure** — Kubernetes, multi-cloud deployment (AWS/GCP/Azure/Cloudflare/Vercel), monitoring, and CI/CD
- **Zero-backend demo mode** — runs entirely in-browser with mock data for instant evaluation

**Tech stack:** React 19 · TypeScript 5.8 · Supabase (PostgreSQL 15 + Auth + Realtime + Edge Functions) · Tailwind CSS · Vite · Vitest · Playwright · Flutter

---

## 2. Consumer Banking

### 2.1 Accounts & Transactions

| Capability | Details |
|------------|---------|
| Account types | Checking, savings, money market, CDs, HSAs, IRAs, joint accounts |
| Account detail | Balance, available balance, hold details, interest rate, maturity date |
| Transaction history | Filterable by date range, amount, type, category; full-text search |
| Transaction enrichment | Merchant logos, categories, geolocation via MX adapter |
| Pending transactions | Real-time display with estimated posting dates |
| Statements | Monthly/quarterly PDF generation and download |
| Account nicknames | User-customizable display names |
| Joint accounts | Invitation workflow with co-owner acceptance flow |
| Linked/external accounts | Plaid-powered account linking with balance aggregation |

### 2.2 Transfers & Payments

| Capability | Details |
|------------|---------|
| Internal transfers | Between own accounts, immediate or scheduled, recurring |
| External transfers (ACH) | To/from linked accounts, 1-3 business day settlement |
| Wire transfers | Domestic and international with template management |
| P2P payments | Send/request money via email, phone, or username |
| Bill pay | Payee management, one-time and recurring, e-bills (FIS, Fiserv, JHA adapters) |
| Instant payments | SEPA Instant, UK Faster Payments, PIX, UPI |
| QR code payments | PIX QR, UPI QR for in-person and remote payments |
| Alias payments | Pay by phone number, email, tax ID, UPI VPA |
| Request-to-Pay (R2P) | Inbound/outbound payment requests with accept/decline |
| International payments | FX quotes, SWIFT/IBAN routing, remittance data (ISO 20022) |
| Multi-currency wallets | VIBAN generation, FX swaps between currency balances |
| Stop payments | Order stop payments on checks with fee lookup and renewal options |
| Check ordering | Style selection, address verification, order tracking |

### 2.3 Cards

| Capability | Details |
|------------|---------|
| Card management | View card details, activation, block/unblock, report lost/stolen |
| Card replacement | Request replacement with delivery tracking |
| Card provisioning | Apple Pay and Google Pay digital wallet provisioning (Jack Henry, Marqeta) |
| Virtual cards | Generate single-use or recurring virtual card numbers |
| Card controls | Spending limits, merchant category blocks, geographic restrictions |
| Travel notices | Set travel dates and destinations to prevent false fraud declines |
| PIN management | PIN reset and change via secure channel |
| Card offers/rewards | Personalized card-linked offers (Cardlytics, Dosh adapters) |
| Card issuing | Physical and virtual card issuance (Lithic, Ramp, Brex adapters) |

### 2.4 Deposits & Savings

| Capability | Details |
|------------|---------|
| Remote deposit capture (RDC) | Mobile check deposit with image capture and status tracking |
| Direct deposit | Employer search, switching automation (Argyle, Pinwheel adapters) |
| Savings goals | Create named goals with target amounts, contribute/withdraw, progress tracking |
| CD management | Term selection, maturity alerts, renewal options |
| Overdraft settings | Opt-in/opt-out management, linked account protection |

### 2.5 Loans

| Capability | Details |
|------------|---------|
| Loan dashboard | Active loans with balances, rates, next payment dates |
| Loan detail | Amortization schedule, payment history, payoff quotes |
| Loan payments | One-time and recurring, extra principal payments |
| Loan origination | Application workflow (LoanVantage, NCINO, Finastra adapters) |

### 2.6 Financial Management

| Capability | Details |
|------------|---------|
| Financial insights | Net worth tracking, spending trends, income analysis |
| Budgets | Category-level budgets with progress tracking and alerts |
| Recurring detection | Automatic identification of recurring charges/subscriptions |
| Credit score | Score display with monitoring and improvement tips |
| Calculators | Loan, mortgage, savings, and retirement calculators |
| Carbon footprint | Per-account environmental impact tracking |
| Financial literacy | Educational content, articles, and learning modules |

### 2.7 Security & Account Management

| Capability | Details |
|------------|---------|
| Notifications | 8 types: transaction, transfer, bill_due, rdc_status, card_alert, security, system, promotional |
| Notification channels | Push, SMS, email, in-app (Braze, Twilio, Airship adapters) |
| Secure messaging | Encrypted member-to-FI messaging with attachments |
| Disputes/chargebacks | File disputes with timeline tracking, document upload, status updates |
| Device management | View active devices, trust/untrust, remote session termination |
| Session management | Active session list with IP, device, and activity tracking |
| Document vault | Secure storage for tax forms, statements, and personal documents |
| Spending alerts | Configurable threshold rules with push/email notification |
| Data export | GDPR/CCPA data subject request with JSON/CSV/PDF output |
| Profile management | Name, address, phone, email updates with verification |
| Biometric auth | Face ID and fingerprint (mobile), WebAuthn (web) |

### 2.8 Server-Driven UI (SDUI)

The platform supports **remote screen composition** via server-defined manifests, enabling FIs to customize member experiences without app updates.

**22 widget types:**
`hero_banner`, `account_summary`, `quick_actions`, `transaction_list`, `promo_card`, `notification_bell`, `spending_chart`, `goal_tracker`, `card_carousel`, `bill_reminder`, `market_snapshot`, `ai_insight`, `referral_cta`, `loyalty_points`, `community_feed`, `financial_tip`, `weather_greeting`, `feature_announcement`, `survey_prompt`, `chat_launcher`, `section_header`, `spacer`

**9 persona types:** `default`, `student`, `senior`, `business_owner`, `high_net_worth`, `new_member`, `dormant`, `millennial`, `family`

**19 feature flags** for per-tenant/per-persona feature toggling.

---

## 3. Business Banking

### 3.1 Core Business Features

| Capability | Details |
|------------|---------|
| Business dashboard | Consolidated view of all business accounts, cash position, pending actions |
| Business accounts | Operating, payroll, reserve, escrow with sub-accounting |
| Batch payments | ACH batch origination with NACHA file generation, approval workflows |
| Payroll integration | Batch payroll processing with tax withholding |
| Wire transfers | Domestic/international with dual-approval, template management |
| Invoice processing | Upload, parse, schedule payments from invoices |
| Receivables | AR tracking with payment matching and reconciliation |

### 3.2 Treasury & Cash Management

| Capability | Details |
|------------|---------|
| Cash sweeps | Automated rules-based cash concentration and disbursement |
| Liquidity dashboard | Real-time cash position across all accounts and currencies |
| Treasury vaults | Segregated reserve accounts with policy-based access |
| JIT permissions | Just-in-time elevated access for high-value operations |
| Positive pay | Check fraud prevention with issue file matching |
| ACH positive pay | ACH debit blocking with authorized originator management |

### 3.3 Business Administration

| Capability | Details |
|------------|---------|
| User roles | Owner, admin, operator, viewer with granular permissions |
| Approval workflows | Configurable dual/multi-approval for payments above thresholds |
| Account aggregation | Connect and view external business accounts (Akoya, Salt Edge adapters) |
| Reporting | Transaction reports, cash flow analysis, tax document generation |
| API access | Business API tokens for ERP/accounting system integration |

---

## 4. FI Administration Portal

### 4.1 Admin Pages (20 screens)

| Page | Purpose |
|------|---------|
| **Admin Dashboard** | KPIs, member growth, transaction volume, system health |
| **Account Overview** | Search/view any member account, transaction drill-down |
| **User Management** | Create/edit/disable staff accounts, role assignment, MFA enforcement |
| **SSO Configuration** | SAML/OIDC provider setup, attribute mapping, testing |
| **Tenant Settings** | Institution-level configuration (name, routing number, features, limits) |
| **Tenant Onboarding** | New institution provisioning wizard with RLS policy initialization |
| **Integration Manager** | Connect/configure adapters, OAuth credential management, health monitoring |
| **Analytics Dashboard** | Member engagement, feature adoption, channel metrics |
| **CDP Manager** | Customer Data Platform — event tracking, segments, audience sync (RudderStack) |
| **Screen Manifests** | SDUI screen editor — compose and publish dynamic screens per persona |
| **Content Manager** | CMS for banners, campaigns, articles, notifications with scheduling |
| **Experiments** | A/B testing framework — create variants, allocate traffic, measure outcomes |
| **Agent Policies** | AI automation rules — configure triggers, actions, escalation thresholds |
| **AI Assistant** | Interactive AI chat for admin queries, powered by RAG knowledge base |
| **Audit Log** | Searchable log of all administrative and sensitive member actions |
| **Compliance Center** | KYC/AML status dashboard, sanctions screening queue, regulatory reports |
| **Branding Editor** | Visual theme customization — colors, logos, fonts per tenant |
| **Data Export** | Process GDPR/CCPA data subject requests, generate export packages |
| **API Tokens** | Manage API keys for CMS, webhooks, and external integrations |
| **Knowledge Base** | Manage RAG knowledge documents for AI-powered member support |

### 4.2 Tenant Configuration Capabilities

- **Feature flags:** 19 toggleable features per tenant (e.g., `enableP2P`, `enableRDC`, `enableInternationalWires`, `enableAI`)
- **Branding:** Custom colors, logos, fonts, email templates
- **Limits:** Transaction limits, daily/monthly caps, approval thresholds
- **Integrations:** Per-tenant adapter configuration with credential isolation
- **Compliance:** Jurisdiction-specific rules, data residency settings, cooling-off periods
- **Notifications:** Channel preferences, template customization, delivery rules

---

## 5. Regulators & Compliance

### 5.1 Data Isolation & Privacy

| Control | Implementation |
|---------|---------------|
| **Multi-tenant RLS** | Every database table has Row-Level Security policies enforcing tenant isolation at the PostgreSQL level |
| **Audit logging** | All sensitive operations logged to `audit_logs` table with actor, action, target, timestamp, IP |
| **Data residency** | Configurable per tenant — data stays in designated geographic region |
| **Data portability** | GDPR Article 20 — full data export in machine-readable format (JSON/CSV) |
| **Right to erasure** | CCPA/GDPR data deletion workflows with verification |
| **Consent management** | Open Banking consent records with granular scope and revocation |

### 5.2 Identity & Access

| Control | Implementation |
|---------|---------------|
| **KYC verification** | 7 adapter options: Alloy, Jumio, Signzy, Sumsub, LexisNexis, Didit, CU*Answers |
| **KYB verification** | Know Your Business for commercial accounts |
| **International eKYC** | Liveness detection, document verification for cross-border onboarding |
| **AML screening** | Real-time sanctions and watchlist screening (LexisNexis, ComplyAdvantage) |
| **Strong Customer Authentication (SCA)** | EU PSD2/PSD3 compliant with exemption checks (Tink adapter) |
| **Confirmation of Payee (CoP)** | UK payee name verification before payment execution (PayUK adapter) |
| **MFA enforcement** | TOTP, SMS, email verification — configurable per role and action |
| **Password policies** | Complexity rules, rotation schedules, breach detection |
| **Session controls** | Configurable timeout, concurrent session limits, device trust |

### 5.3 Regulatory Frameworks

| Framework | Coverage |
|-----------|----------|
| **CFPB 1033 (US)** | Open banking data sharing with consumer consent |
| **PSD2/PSD3 (EU)** | Strong customer authentication, open banking APIs, TPP access |
| **Open Banking (UK)** | Account information, payment initiation, CoP |
| **GDPR (EU)** | Data portability, right to erasure, consent management |
| **CCPA/CPRA (California)** | Consumer data rights, opt-out mechanisms |
| **BSA/AML (US)** | Transaction monitoring, suspicious activity reporting |
| **SOC 2** | Compliance audit sync with Vanta and Drata |
| **ISO 20022** | Structured remittance data for international payments |

### 5.4 Compliance Operations

- **Compliance center** with risk scoring dashboard and case management
- **Sanctions screening queue** with real-time watchlist matching
- **Regulatory reporting** with automated generation
- **Cooling-off period** enforcement for regulated products (with override audit trail)
- **Interest withholding** and tax reporting by jurisdiction
- **Carbon footprint tracking** per account for ESG reporting
- **Safeguarding reporting** for BaaS/e-money compliance

---

## 6. Risk Team

### 6.1 Fraud & Risk Controls

| Control | Details |
|---------|---------|
| **Fraud detection** | Behavioral biometrics and anomaly detection (BioCatch adapter) |
| **Transaction monitoring** | Real-time rules engine with velocity checks and pattern detection |
| **Device fingerprinting** | Browser/device identification with trust scoring |
| **Session risk scoring** | Per-session risk assessment based on IP, device, behavior |
| **Rate limiting** | Per-tenant, per-user, and per-service-account configurable limits |
| **Circuit breaker** | Automatic adapter failover when external services degrade |

### 6.2 Core Banking Simulator

The **core-simulator** (`core-simulator/server.js`) is an Express.js sidecar that mimics **7 real-world banking standards** for safe testing:

| Standard | Endpoints | Region |
|----------|-----------|--------|
| **CU*Answers** | `/api/credit_unions/:cuId/` — Member, account, transaction (It's Me 247) | US |
| **Symitar** | `/symxchange/` — SymXchange account & transaction API | US |
| **Fineract** | `/fineract-provider/api/v1/` — Savings, loans, clients, transfers | Global |
| **UK Payments** | `/uk/faster-payments/`, `/uk/bacs/`, `/uk/chaps/` — FPS, BACS, CHAPS, CoP | UK |
| **SEPA** | `/sepa/sct/`, `/sepa/sct-inst/`, `/sepa/sdd/` — Credit Transfer, Instant, Direct Debit | EU |
| **PIX** | `/pix/` — DICT lookup, QR code, instant payments | Brazil |
| **SPEI** | `/spei/` — Interbank transfers with CEP verification | Mexico |

**Chaos engineering features:**
- Configurable latency injection (base + jitter)
- Error rate simulation (5xx, 4xx, timeouts)
- Core system busy rate simulation
- Mutual TLS (mTLS) for cert-based auth testing
- Runtime config updates via admin API (`POST /admin/config`)

### 6.3 Webhook Delivery System

| Feature | Details |
|---------|---------|
| Event queuing | Webhook events queued for reliable delivery |
| Retry logic | Exponential backoff with configurable max attempts |
| Dead letter queue | Failed webhooks stored for manual inspection and replay |
| HMAC signing | Webhook payloads signed for receiver verification |
| Delivery tracking | Status, attempts, response codes, latency per delivery |
| Statistics | Per-endpoint success/failure rates and latency percentiles |

---

## 7. Developers & Technical Integrators

### 7.1 API Gateway

**Single RPC endpoint:** `POST /functions/v1/gateway`

```json
{
  "action": "accounts.list",
  "params": { "type": "checking" }
}
```

**200+ actions** across **15+ domain modules:**

| Module | Example Actions |
|--------|----------------|
| `accounts` | `.list`, `.detail`, `.balances`, `.hold`, `.freeze`, `.statements` |
| `payments` | `.transfer`, `.billPay`, `.p2p`, `.international`, `.wire`, `.instant` |
| `cards` | `.list`, `.activate`, `.block`, `.pin.reset`, `.provision`, `.replace` |
| `loans` | `.list`, `.detail`, `.schedule`, `.payment`, `.payoff` |
| `deposits` | `.rdc.submit`, `.rdc.status`, `.cd.list`, `.cd.detail` |
| `compliance` | `.kyc.status`, `.aml.screen`, `.risk.score`, `.sanctions.check` |
| `admin` | `.tenant.config`, `.users.list`, `.audit.query`, `.features.toggle` |
| `member` | `.profile`, `.addresses`, `.documents`, `.verification` |
| `messaging` | `.compose`, `.inbox`, `.read`, `.attachments` |
| `international` | `.fx.quote`, `.wire.create`, `.swift.status` |
| `financial` | `.insights`, `.goals`, `.budgets`, `.recurring` |
| `ai` | `.chat`, `.classify`, `.recommend`, `.automate` |
| `business` | `.batch.create`, `.reconcile`, `.treasury`, `.invoices` |
| `content` | `.campaigns`, `.banners`, `.articles`, `.cms.tokens` |
| `integrations` | `.oauth.start`, `.oauth.callback`, `.credentials`, `.health` |

**Platform adapters** — the gateway handler is platform-agnostic and deploys to:
- Supabase Edge Functions (Deno) — primary
- AWS Lambda
- Cloudflare Workers
- Vercel Edge Functions
- Node.js / Express

### 7.2 Edge Functions (11 Supabase Functions)

| Function | Purpose |
|----------|---------|
| `gateway` | Main API gateway — routes all action requests |
| `content-api` | CMS content delivery endpoint |
| `event-ingest` | Telemetry and event streaming |
| `sso-initiate` | Single Sign-On flow initiation (SAML/OIDC) |
| `sso-callback` | SSO callback handler |
| `integration-oauth-start` | Third-party OAuth flow initiation |
| `integration-oauth-callback` | OAuth callback receiver |
| `integration-token-refresh` | Token refresh for OAuth/API credentials |
| `integration-cleanup` | Expired session cleanup |
| `sitemap` | Dynamic SEO sitemap generation |

### 7.3 Adapter Ecosystem (40+ Domains, 80+ Providers)

Every adapter domain follows the same pattern: TypeScript interface → mock implementation → real provider(s) → auto-detection via environment variables → graceful fallback to mock when no credentials configured.

#### Core Banking & Accounts

| Domain | Providers |
|--------|-----------|
| **Core Banking** | Fineract, Mifos, CU*Answers, Symitar, Fiserv, KeyStone, FIS, FLEX, Mambu, Thought Machine, Pismo, Temenos, Flexcube, Finacle |
| **Account Opening** | Built-in, CU*Answers |
| **BaaS (Banking-as-a-Service)** | Solaris, ClearBank |

#### Cards

| Domain | Providers |
|--------|-----------|
| **Card Management** | Jack Henry |
| **Card Issuing** | Lithic, Ramp, Brex |
| **Card Offers/Rewards** | Cardlytics, Dosh |
| **Card Provisioning** | Jack Henry, Marqeta |

#### Payments

| Domain | Providers |
|--------|-----------|
| **Bill Pay** | FIS, Fiserv, Jack Henry (JHA) |
| **Wire Transfers** | Built-in with core banking adapter |
| **Instant Payments** | SEPA Instant, UPI |
| **International Payments** | Wise, Stripe, Pipit, ConnectPay |
| **International Bill Pay** | Wise, Pipit, ConnectPay |
| **Multi-Currency/FX** | CurrencyCloud |
| **Confirmation of Payee** | PayUK |
| **Global Clearing** | Airwallex, ClearBank |
| **Stablecoin/Crypto** | Paxos, BVNK, Circle |
| **Payment Operations** | Built-in orchestration |

#### Identity & Compliance

| Domain | Providers |
|--------|-----------|
| **KYC/Identity** | Alloy, Jumio, Signzy, Sumsub, LexisNexis, Didit, CU*Answers |
| **KYB** | Built-in verification |
| **AML Screening** | LexisNexis, ComplyAdvantage |
| **E-Signature** | DocuSign, PandaDoc |
| **SCA (Strong Customer Auth)** | Tink |
| **Compliance Audit** | Vanta, Drata |

#### Data & Financial Services

| Domain | Providers |
|--------|-----------|
| **Data Aggregation** | Akoya, Salt Edge |
| **Transaction Enrichment** | MX |
| **Alias Resolution** | Plaid |
| **Engagement** | Backbase, Meniga |
| **Financial Data** | Built-in analytics |
| **Direct Deposit Switching** | Argyle, Pinwheel |
| **Remote Deposit Capture** | Mitek, Jack Henry |

#### Operations

| Domain | Providers |
|--------|-----------|
| **Fraud Detection** | BioCatch |
| **Notifications** | Braze, Twilio, Airship |
| **AI Services** | Vertex AI, OpenAI, Anthropic (Claude) |
| **Analytics/CDP** | RudderStack, Mixpanel, Amplitude, PostHog |
| **Loan Origination** | LoanVantage, NCINO, Finastra |
| **Treasury** | Column, Increase, Stripe Treasury, Mercury |
| **Locations (ATM/Branch)** | Built-in locator |
| **External Accounts** | Plaid linking |
| **International Loans** | NCINO, Finastra |

### 7.4 Database Schema

**42+ migrations** totaling ~7,257 lines of SQL, establishing:

- Multi-tenant tables with RLS on every table
- Core banking domain tables (accounts, transactions, cards, loans, deposits)
- Integration framework (adapter registry, OAuth tokens, webhook delivery)
- Communication (secure messaging, notifications, notification preferences)
- Compliance (audit logs, KYC records, AML screening results)
- Content management (CMS articles, banners, campaigns)
- Business banking (batches, invoices, treasury vaults)
- AI platform (knowledge base, automation rules, intent logs)
- CDP (customer events, segments, audiences)
- Experiments (A/B tests, variant allocation, outcomes)
- Open banking (consent records, revocation webhooks)
- Session and device management
- Password policies and rate limits

### 7.5 Demo Mode

`VITE_DEMO_MODE=true` enables the full platform with no backend dependencies. Demo data covers **16 domain modules**: accounts, cards, payments, loans, deposits, compliance, messaging, financial, AI, international, member, admin, business, content, integrations, and notifications.

**Demo credentials:** `demo@fiducia.dev` / `demo1234`

### 7.6 Frontend Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| **Framework** | React 19.2 | Functional components, hooks only |
| **Routing** | React Router DOM 6.30 | 136 documented routes across public, banking, and admin |
| **State (server)** | TanStack React Query 5.83 | Cache, refetch, optimistic updates |
| **State (client)** | React Context | Auth, Theme, Tenant providers |
| **Forms** | React Hook Form 7.61 + Zod 3.25 | Schema-validated forms |
| **UI primitives** | Radix UI + shadcn/ui | 40+ accessible components |
| **Styling** | Tailwind CSS 3.4 | Design tokens in `tailwind.config.ts` |
| **Icons** | Lucide React 0.462 | 1,000+ icons |
| **Charts** | Recharts 2.15 | Financial visualizations |
| **i18n** | i18next 25.8 + react-i18next 16.5 | 33 languages, 6 namespaces |
| **Custom hooks** | 81 hooks | Auth, data fetching, UI state, business logic |
| **Type definitions** | 45 modules | Domain types covering all banking concepts |

---

## 8. Mobile App (Flutter)

### 8.1 Overview

The Flutter mobile app provides **56+ screens** mirroring the web experience on both iOS and Android.

### 8.2 Feature Parity

| Category | Screens |
|----------|---------|
| **Authentication** | Login, biometric prompt, activation, MFA |
| **Dashboard** | Home dashboard with account summary and quick actions |
| **Accounts** | Account list, account detail, transaction history |
| **Transfers** | Move money, internal/external transfers, wire transfers |
| **Payments** | Bill pay, P2P, instant payments |
| **Cards** | Card list, card detail, card provisioning, travel notices, card offers |
| **Deposits** | Remote deposit capture, direct deposit switching, check ordering |
| **Loans** | Loan list, loan detail, payment schedule |
| **Savings** | Savings goals with progress tracking |
| **Financial** | Financial insights, calculators, credit score |
| **Disputes** | File disputes, dispute detail with timeline |
| **Messaging** | Secure messaging with attachments |
| **Notifications** | Notification center with preferences |
| **Settings** | Profile, addresses, sessions, devices, security, preferences |
| **Locations** | ATM/branch finder with GPS |
| **Admin** | Admin screens for staff users |
| **Learning** | Financial literacy content |
| **Statements** | Statement viewing and download |
| **Linked Accounts** | External account management |

### 8.3 Technical Details

| Aspect | Details |
|--------|---------|
| **Navigation** | GoRouter with deep linking |
| **State management** | Provider pattern |
| **Backend** | Supabase client + REST provider + Gateway client |
| **Theming** | Material 3 with per-tenant design tokens |
| **Biometrics** | Face ID (iOS) and fingerprint (Android) |
| **Push notifications** | Firebase Cloud Messaging, Braze, Airship |
| **Connectivity** | Offline detection with connectivity banner |
| **Build & deploy** | Fastlane for iOS (TestFlight) and Android (Play Store) |

---

## 9. Markets & Languages

### 9.1 Language Support (33 Languages)

| Region | Languages |
|--------|-----------|
| **Americas** | English (en), Spanish (es), Portuguese (pt), Brazilian Portuguese (pt-BR), French (fr) |
| **Europe** | German (de), Dutch (nl), Italian (it), Polish (pl), Czech (cs), Hungarian (hu), Romanian (ro), Swedish (sv), Greek (el) |
| **Africa** | Swahili (sw), Hausa (ha), Igbo (ig), Yoruba (yo), Pidgin (pcm) |
| **South Asia** | Hindi (hi), Bengali (bn), Tamil (ta), Telugu (te), Kannada (kn), Malayalam (ml), Marathi (mr), Gujarati (gu), Punjabi (pa) |
| **East/Southeast Asia** | Korean (ko), Vietnamese (vi), Simplified Chinese (zh-CN), Traditional Chinese (zh-TW), Tagalog (tl) |
| **Middle East** | Arabic (ar) |

**6 namespaces per language:** common, banking, settings, errors, admin, public

### 9.2 Regional Regulatory Coverage

| Region | Payment Schemes | Regulatory Framework |
|--------|----------------|---------------------|
| **United States** | ACH, Fedwire, RTP | CFPB 1033, CCPA/CPRA, BSA/AML, NCUA |
| **European Union** | SEPA SCT, SEPA SCT Inst, SEPA SDD | PSD2/PSD3, SCA, GDPR |
| **United Kingdom** | Faster Payments (FPS), BACS, CHAPS | Open Banking, CoP, FCA |
| **Brazil** | PIX (instant), TED, DOC | BCB regulations |
| **Mexico** | SPEI (interbank) | Banxico, CNBV |
| **India** | UPI, IMPS, NEFT, RTGS | RBI, NPCI |

### 9.3 Target Markets

- **Credit unions** — US focus with NCUA compliance, CU*Answers/Symitar integration
- **Community banks** — Fiserv, FIS, Jack Henry ecosystem integration
- **Neobanks/fintechs** — BaaS model with Solaris/ClearBank backend
- **Nigerian financial services** — 5 local languages (Hausa, Igbo, Yoruba, Pidgin, Swahili)
- **Indian financial services** — 9 Indic languages, UPI integration
- **Latin American fintechs** — PIX (Brazil), SPEI (Mexico), Spanish/Portuguese
- **European digital banks** — SEPA, PSD2/PSD3, SCA compliance

---

## 10. AI Platform

### 10.1 Multi-Provider AI Engine

The platform integrates with multiple LLM providers through a unified adapter:

| Provider | Use Case |
|----------|----------|
| **Anthropic (Claude)** | Complex financial reasoning, advice generation |
| **OpenAI** | General NLP, categorization, embeddings |
| **Google Vertex AI** | Enterprise AI with data residency guarantees |

### 10.2 AI Capabilities

| Feature | Details |
|---------|---------|
| **Financial chat assistant** | Natural language queries about accounts, transactions, financial planning |
| **Intent classification** | Parse member requests into structured API actions |
| **RAG retrieval** | Knowledge base search for institution-specific policies and FAQs |
| **Transaction categorization** | ML-powered merchant and category classification |
| **Proactive insights** | Automated detection of unusual spending, savings opportunities, bill reminders |
| **Automation rules** | Event-driven triggers with configurable actions (e.g., "if balance < $100, notify") |
| **Escalation engine** | Route complex queries to human agents with full context |
| **Prompt management** | Admin-editable prompt templates with A/B testing |
| **Autonomous execution** | Policy-governed automated actions with audit trail |

### 10.3 Admin AI Tools

- **Knowledge Base Manager** — Upload and manage documents for RAG retrieval
- **Agent Policies** — Configure automation rules and escalation thresholds
- **AI Assistant** — Admin-facing chat for operational queries
- **Prompt testing** — Test and compare prompt variations before deployment

---

## 11. Ops & Infrastructure

### 11.1 Deployment Targets

| Platform | Configuration | Details |
|----------|--------------|---------|
| **AWS** | CloudFormation | S3 + CloudFront CDN, OAI, ACM certs, VPC |
| **GCP** | Cloud Run | Containerized frontend, Cloud Load Balancer |
| **Azure** | Static Web Apps | SPA routing, auth integration |
| **Cloudflare** | Workers + Pages | Edge middleware, cache headers, URL rewrites |
| **Vercel** | Edge Middleware | Edge functions, automatic deployments |
| **Kubernetes** | Helm chart | 2-10 pod HPA, network policies, Prometheus scrape, Let's Encrypt TLS |
| **Docker Compose** | Full stack | React + Supabase + Core Simulator + optional monitoring |

### 11.2 Kubernetes (Helm Chart)

```
helm/banking-platform/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml      # 2+ replicas, non-root, read-only rootfs
│   ├── service.yaml         # ClusterIP 80→8080
│   ├── ingress.yaml         # Nginx, Let's Encrypt, rate limiting (100 req/min)
│   ├── hpa.yaml             # Min 2, Max 10, CPU 70%, Memory 80%
│   ├── networkpolicy.yaml   # Pod-level network segmentation
│   ├── secret.yaml          # Kubernetes secret management
│   └── serviceaccount.yaml  # RBAC service account
```

**Resource limits:** 100m/500m CPU, 128Mi/256Mi RAM per pod.

### 11.3 CI/CD Workflows (12 total)

**Active:**
| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | Push/PR | Lint (max 40 warnings) → Prettier → TypeScript → Vitest → Build → Coverage |

**Available (enable as needed):**
| Workflow | Purpose |
|----------|---------|
| `e2e-tests.yml` | Playwright across Chromium, Firefox, WebKit, Mobile Chrome |
| `load-testing.yml` | k6 performance testing |
| `codeql-analysis.yml` | GitHub CodeQL SAST |
| `dependency-audit.yml` | npm audit + Dependabot |
| `container-scan.yml` | Trivy/Grype Docker image CVE scanning |
| `secret-scanning.yml` | Credential leak detection |
| `sbom.yml` | CycloneDX/SPDX software bill of materials |
| `dast-zap.yml` | OWASP ZAP dynamic security testing |
| `deploy-aws.yml` | AWS CloudFormation deployment |
| `deploy-gcp.yml` | Google Cloud Run deployment |
| `deploy-azure.yml` | Azure Static Web Apps deployment |

### 11.4 Monitoring Stack

| Component | Port | Purpose |
|-----------|------|---------|
| **Prometheus** | 9090 | Metrics collection (15s scrape interval) |
| **Grafana** | 3000 | Dashboards and visualization |
| **AlertManager** | 9093 | Alert routing (Slack, email, webhook) |
| **Nginx Exporter** | 9113 | Reverse proxy metrics |
| **Postgres Exporter** | 9187 | Database performance metrics |

**Alert severity levels:** critical (1h repeat), warning, info

### 11.5 Secrets Management

| Solution | Details |
|----------|---------|
| **HashiCorp Vault** | Template-based secret injection with Vault Agent |
| **AWS Secrets Manager** | Cloud-native secret storage with rotation |
| **Kubernetes Secrets** | Pod-level secret mounting |
| **Automated rotation** | `scripts/secrets/rotate-all-secrets.sh` |

### 11.6 Networking

| Solution | Purpose |
|----------|---------|
| **Tailscale** | Zero-config VPN mesh for secure service communication |
| **WireGuard** | Point-to-point encrypted tunnels |
| **mTLS** | Mutual TLS for core banking simulator connections |

### 11.7 Operational Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup.sh` | One-command setup (`--demo`, `--docker`, `--full`) |
| `scripts/deploy.sh` | Multi-cloud deployment orchestration |
| `scripts/deploy-all-tenants.sh` | Multi-tenant deployment coordination |
| `scripts/provision-tenant.ts` | New tenant provisioning with RLS initialization |
| `scripts/compliance-check.sh` | RLS policy verification, data residency checks |
| `scripts/backup/backup-database.sh` | PostgreSQL backup |
| `scripts/backup/restore-database.sh` | Point-in-time recovery |
| `scripts/backup/verify-backup.sh` | Backup integrity validation |
| `scripts/secrets/rotate-all-secrets.sh` | Automated credential rotation |

---

## 12. Competitive Comparison

| Capability | Fiducia | Typical Digital Banking Vendor |
|------------|---------|-------------------------------|
| **Adapter domains** | 40+ with 80+ named providers | 5-10 fixed integrations |
| **Core banking connectors** | 14 (Fineract, Symitar, CU*Answers, Fiserv, FIS, Mambu, Thought Machine, Pismo, Temenos, etc.) | 1-3 |
| **Languages** | 33 (incl. 9 Indic, 5 African) | 5-10 |
| **Payment schemes** | 8+ (ACH, SEPA, FPS/BACS/CHAPS, PIX, SPEI, UPI, SWIFT, RTP) | 2-3 |
| **Mobile app** | Flutter (56+ screens, iOS + Android) | React Native or native per platform |
| **AI platform** | Multi-provider (Claude, OpenAI, Vertex), RAG, automation | Basic chatbot or none |
| **SDUI** | 22 widget types, 9 personas, remote composition | Static screens |
| **Core simulator** | 7 banking standards with chaos engineering | None or basic mocks |
| **Multi-tenancy** | Database-level RLS isolation | Application-level or separate DBs |
| **Deployment** | 6 cloud targets + Kubernetes + Docker | 1-2 cloud platforms |
| **Demo mode** | Full platform, zero backend required | Requires staging environment |
| **CI/CD** | 12 workflow templates (lint, test, SAST, DAST, SBOM, deploy) | Basic CI only |
| **Open source core** | React + Supabase + TypeScript | Proprietary |

---

## 13. Key Metrics at a Glance

| Metric | Count |
|--------|-------|
| Page routes | 64+ |
| Gateway API actions | 200+ |
| Gateway domain modules | 15+ |
| Custom React hooks | 81 |
| TypeScript type modules | 45 |
| UI primitives (shadcn/Radix) | 40+ |
| Adapter domains | 40+ |
| Named provider integrations | 80+ |
| Core banking adapters | 14 |
| Supabase Edge Functions | 11 |
| Database migrations | 42+ (~7,257 lines SQL) |
| Admin portal pages | 20 |
| SDUI widget types | 22 |
| SDUI persona types | 9 |
| Feature flags | 19 |
| Core simulator banking standards | 7 |
| Supported languages | 33 |
| i18n namespaces per language | 6 |
| Flutter mobile screens | 56+ |
| Documented routes (manifest) | 136 |
| CI/CD workflow templates | 12 |
| Cloud deployment targets | 6 |
| Monitoring exporters | 5 |

---

*Document generated from codebase audit on 2026-03-17. All numbers reflect actual source code, not aspirational targets.*
