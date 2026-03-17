# Developer Setup by Region

What each geography needs to get up and running, and what's ready vs. what's not.

---

## Universal Setup (All Regions)

```bash
# 1. Clone and install (Node 20+ required)
git clone <repo-url> && cd Fiducia-
./scripts/setup.sh --demo    # 5 minutes, no backend needed

# 2. Run locally
npm run dev                  # http://localhost:8080 with demo data

# 3. Validate before pushing
npm run validate             # typecheck + lint + test + build

# 4. Full stack (optional)
docker compose up            # React + Supabase + Core Simulator
```

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | `nvm install` (reads `.nvmrc`) |
| npm | 9+ | Bundled with Node |
| Docker | 24+ | For full-stack local dev |
| Supabase CLI | latest | Only for backend development |

---

## US Credit Unions

**Status: Production-ready**

### What Works
- Demo mode defaults to US context (USD, Eastern timezone, US holidays)
- Core banking simulator (port 9090) — mimics CU*Answers, SymXchange, Fineract
- ABA routing number validation
- ACH payment cutoff logic (5 PM ET)
- US federal holiday calendar
- SSN masking (`***-**-1234`)
- FFIEC + NCUA + SOC 2 compliance controls documented

### Region-Specific Setup
```bash
# Provision a US Credit Union tenant
npx tsx scripts/provision-tenant.ts \
  --name "My Credit Union" \
  --subdomain "mycu" \
  --region "us-east-1" \
  --template "us-credit-union" \
  --admin-email "admin@mycu.org"
```

### Recommended Adapters
CU*Answers, Symitar, Mitek (RDC), FIS (bill pay), Alloy (KYC), BioCatch (fraud)

### Gaps
- Sandbox access for Symitar/FIS requires vendor agreements (not self-service)
- No ACH file generation simulator — payment cutoff logic works but can't test full ACH flows
- FedNow/RTP adapters exist but no local payment rail simulator

### Deploy to QA
```bash
./scripts/deploy.sh aws --bucket mycu-qa --region us-east-1
```

---

## US Community Banks

**Status: Production-ready**

### What Works
- Same US defaults as credit unions
- Wire transfer cutoff logic (domestic 4:30 PM ET, international 3 PM ET)
- Dual-approval workflow for international wires
- CRA (Community Reinvestment Act) reporting hooks

### Region-Specific Setup
```bash
npx tsx scripts/provision-tenant.ts \
  --name "Community Bank" \
  --subdomain "commbank" \
  --region "us-east-1" \
  --template "us-community-bank" \
  --admin-email "admin@commbank.com"
```

### Recommended Adapters
FIS, Fineract, FLEX (core), Fiserv (bill pay), Alloy (KYC), Middesk (KYB), LoanVantage (lending), Column/Increase (treasury)

### Gaps
- Same as US Credit Unions, plus:
- Commercial banking features (treasury management, positive pay) are adapter-dependent
- Loan origination adapter (LoanVantage) requires vendor sandbox

---

## UK Digital Banks

**Status: In development — core platform works, UK-specific payment rails are stubs**

### What Works
- GBP currency formatting
- Sort code validation format (`XX-XX-XX`)
- UK bank holiday calendar (partially implemented)
- `Europe/London` timezone handling
- FCA compliance controls documented
- GDPR consent framework

### Region-Specific Setup
```bash
npx tsx scripts/provision-tenant.ts \
  --name "UK Digital Bank" \
  --subdomain "ukbank" \
  --region "eu-west-2" \
  --template "uk-digital-bank" \
  --admin-email "admin@ukbank.co.uk"
```

### Recommended Adapters
Mambu or Thought Machine (core), ClearBank (payments), Alloy (KYC), Lithic (cards)

### Gaps (Action Required Before QA)
| Gap | Impact | Workaround |
|-----|--------|------------|
| SCA (Strong Customer Authentication) | Payment flows use a mock SCA challenge | Test with mock; plan for Entersekt/Tink integration |
| Faster Payments / BACS / CHAPS | No working payment adapter | Use core simulator for basic transfers; real rails need ClearBank |
| Confirmation of Payee | Feature flag exists, no adapter | Disable flag in QA |
| Sort code modulus checking | Vocalink algorithm not implemented | Format validation works; checksum validation is TODO |
| UK holiday calendar | Movable holidays (Easter) may be incomplete | Verify against Gov.uk bank holiday API |

### Deploy to QA
```bash
./scripts/deploy.sh aws --bucket ukbank-qa --region eu-west-2
```

---

## EU Neobanks

**Status: In development — SEPA payment rails and SCA are stubs**

### What Works
- EUR currency formatting
- IBAN validation (ISO 13616 checksum)
- BIC format validation
- TARGET2 holiday calendar (ECB)
- `Europe/Berlin` timezone handling
- GDPR data residency configuration
- Multi-currency type support (EUR, USD, GBP, CHF, SEK, PLN, CZK, DKK, NOK)
- PSD2 compliance controls documented
- AMLD6 / DORA references in compliance matrix

### Region-Specific Setup
```bash
npx tsx scripts/provision-tenant.ts \
  --name "EU Neobank" \
  --subdomain "euneobank" \
  --region "eu-central-1" \
  --template "eu-neobank" \
  --admin-email "admin@euneobank.eu"
```

### Recommended Adapters
Mambu, Thought Machine, or Pismo (core), Alloy (KYC), Lithic (cards), BioCatch (fraud)

### Gaps (Action Required Before QA)
| Gap | Impact | Workaround |
|-----|--------|------------|
| SEPA Credit Transfer (SCT) | ISO 20022 `pain.001` foundation only; SEPA-specific mapping incomplete | Use mock adapter for testing |
| SEPA Instant (SCT Inst) | No adapter | Feature flag can be disabled |
| SEPA Direct Debit | No adapter | Feature flag can be disabled |
| SCA / 3DS | Mock only | Test with mock; plan for certified provider |
| PSD2 Open Banking (AISP/PISP) | Stub | Disable flag; plan for Tink/Yapily |
| Currency conversion | Types exist, no rates/conversion logic | Display only; no FX in QA |
| GDPR data residency enforcement | Documented but no CI guard | Manual verification that EU tenant data stays in `eu-central-1` |
| DORA compliance | Referenced in docs, no code controls | Document-level only |

### Deploy to QA
```bash
./scripts/deploy.sh aws --bucket euneobank-qa --region eu-central-1
```

---

## LATAM — Brazil

**Status: Early — PIX (mandatory) is not yet implemented**

### What Works
- BRL currency formatting (R$)
- CPF validation (11 digits, mod11 checksum)
- CNPJ validation (14 digits, mod11)
- Brazilian banking calendar (Carnival, Corpus Christi, etc.)
- `America/Sao_Paulo` timezone handling
- LGPD references in compliance matrix
- Portuguese (pt-BR) i18n key registered

### Region-Specific Setup
```bash
npx tsx scripts/provision-tenant.ts \
  --name "Banco Digital" \
  --subdomain "bancodigital" \
  --region "sa-east-1" \
  --template "latam-brazil" \
  --admin-email "admin@bancodigital.com.br"
```

### Recommended Adapters
Pismo (core), Alloy (KYC), BioCatch (fraud), Braze (notifications — WhatsApp critical)

### Gaps (Action Required Before QA)
| Gap | Impact | Workaround |
|-----|--------|------------|
| **PIX** | Mandatory for all Brazilian FIs; no adapter | Blocker — needs BCB adapter or Pismo PIX integration |
| Boleto | No generation/payment adapter | Use mock transfers only |
| TED | No adapter | Use core simulator basic transfers |
| LGPD consent flow | Template only; needs pt-BR localization | Use English consent flow |
| LGPD data subject requests | 15-day response timeline not implemented | Use GDPR handler (30-day) as workaround |
| pt-BR translations | Completeness unknown | Run `npm run i18n:check` to verify coverage |
| WhatsApp notifications | Braze adapter exists but WhatsApp channel not configured | Use email/SMS only |

### Deploy to QA
```bash
./scripts/deploy.sh aws --bucket bancodigital-qa --region sa-east-1
```

---

## LATAM — Mexico

**Status: Early — SPEI not yet implemented**

### What Works
- MXN currency formatting ($)
- CLABE validation (18 digits, mod10 checksum)
- Mexican banking calendar
- `America/Mexico_City` timezone handling
- Spanish (es) i18n translations

### Region-Specific Setup
```bash
npx tsx scripts/provision-tenant.ts \
  --name "Banco MX" \
  --subdomain "bancomx" \
  --region "us-east-1" \
  --template "latam-mexico" \
  --admin-email "admin@bancomx.com.mx"
```

### Recommended Adapters
Mambu or Pismo (core), Alloy (KYC), BioCatch (fraud), Braze (notifications)

### Gaps (Action Required Before QA)
| Gap | Impact | Workaround |
|-----|--------|------------|
| **SPEI** | Primary payment rail; no adapter | Use core simulator basic transfers |
| CURP/RFC validation | Types defined, no checksum impl | Format validation only |
| Fintech Law (LRITF) compliance | Referenced but no specific controls | Document-level only |

### Deploy to QA
```bash
./scripts/deploy.sh aws --bucket bancomx-qa --region us-east-1
```

---

## Summary: Regional Readiness for QA

| Region | Core Platform | Payment Rails | Compliance | i18n | QA Readiness |
|--------|:---:|:---:|:---:|:---:|:---:|
| **US Credit Union** | Ready | Ready (via simulator) | Ready | Ready | Ready |
| **US Community Bank** | Ready | Ready (via simulator) | Ready | Ready | Ready |
| **UK Digital Bank** | Ready | Stub | Partial (no SCA) | Ready | Partial |
| **EU Neobank** | Ready | Stub | Partial (no SCA/SEPA) | Ready | Partial |
| **Brazil** | Ready | Not started (PIX) | Partial (LGPD) | Partial | Not ready |
| **Mexico** | Ready | Not started (SPEI) | Partial | Ready | Not ready |

**Bottom line:** US is QA-ready today. UK/EU can do QA with feature flags disabled for payment-specific flows. Brazil and Mexico need payment rail adapters (PIX, SPEI) before meaningful QA.
