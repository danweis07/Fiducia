# Sandbox Integration Setup

All integrations fall back to mock adapters when no credentials are configured. This guide explains how to get sandbox/test credentials for each integration if you want to test against real APIs.

## Quick Reference

| Integration        | Free Sandbox?      | Signup                                                                             | Time to Get Credentials |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------- | ----------------------- |
| Apache Fineract    | Yes (self-hosted)  | No signup needed                                                                   | 5 min (Docker)          |
| Plaid              | Yes                | [dashboard.plaid.com](https://dashboard.plaid.com)                                 | 5 min                   |
| MX                 | Yes                | [mx.com/products/developer](https://www.mx.com/products/developer-api)             | 1-2 days (approval)     |
| Alloy              | By request         | [alloy.com](https://www.alloy.com)                                                 | 1-2 days (approval)     |
| Symitar SymXchange | No (partner only)  | Requires Jack Henry partnership                                                    | N/A                     |
| CU\*Answers        | No (partner only)  | Requires CU\*Answers membership                                                    | N/A                     |
| Google AI          | Yes                | [aistudio.google.com](https://aistudio.google.com)                                 | 5 min                   |
| OpenAI             | Yes (paid)         | [platform.openai.com](https://platform.openai.com)                                 | 5 min                   |
| Anthropic          | Yes (paid)         | [console.anthropic.com](https://console.anthropic.com)                             | 5 min                   |
| Twilio             | Yes                | [twilio.com/console](https://www.twilio.com/console)                               | 5 min                   |
| SendGrid           | Yes (100/day free) | [signup.sendgrid.com](https://signup.sendgrid.com)                                 | 5 min                   |
| SWIFT gpi          | Yes                | [developer.swift.com](https://developer.swift.com)                                 | 10 min                  |
| FedWire            | Yes                | [frbservices.org](https://www.frbservices.org/fedline-solutions/fedline-developer) | Application required    |

## Core Banking

### Apache Fineract (Open Source, Self-Hosted)

The easiest real core banking integration to test. Run it locally:

```bash
docker run -p 8443:8443 apache/fineract:latest
```

Add to `.env.local`:

```env
FINERACT_BASE_URL=https://localhost:8443/fineract-provider/api/v1
FINERACT_TENANT_ID=default
FINERACT_USERNAME=mifos
FINERACT_PASSWORD=password
```

**Verify:** The core simulator (port 9090) also mimics the Fineract API — you can use it for development without running the real Fineract instance.

### Core Banking Simulator (Built-In)

For most development, use the built-in core simulator instead of real APIs:

```bash
docker compose up    # starts simulator on port 9090 automatically
```

The simulator mimics CU\*Answers, Symitar SymXchange, and Fineract endpoints. You can inject errors for resilience testing:

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

### Symitar SymXchange / CU\*Answers

These require a partnership with Jack Henry or CU\*Answers respectively. For development, use the core simulator which mimics their APIs. Contact your account representative for sandbox access if you're a partner institution.

## Financial Data

### Plaid

1. Create a free account at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Get your sandbox credentials from the dashboard (Keys section)
3. Add to `.env.local`:
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   PLAID_ENV=sandbox
   ```
4. **Verify:** Plaid sandbox includes test institutions and credentials documented at [plaid.com/docs/sandbox](https://plaid.com/docs/sandbox/)

### MX

1. Apply for developer access at [mx.com](https://www.mx.com/products/developer-api)
2. Once approved, get API credentials from the developer portal
3. Add to `.env.local`:
   ```env
   MX_API_KEY=your_api_key
   MX_CLIENT_ID=your_client_id
   MX_BASE_URL=https://int-api.mx.com
   ```
4. **Auth:** HTTP Basic with `MX_CLIENT_ID:MX_API_KEY`

## Identity / KYC

### Alloy

1. Request sandbox access at [alloy.com](https://www.alloy.com)
2. Once approved, get sandbox API credentials
3. Add to `.env.local`:
   ```env
   ALLOY_API_KEY=your_sandbox_key
   ALLOY_SECRET=your_sandbox_secret
   ALLOY_BASE_URL=https://sandbox.alloy.co/v1
   ```
4. **Auth:** HTTP Basic with `ALLOY_API_KEY:ALLOY_SECRET`

## AI Services

All AI integrations are optional. The platform auto-detects which API key is available and uses that provider. Set one or more:

```env
# Google AI (free tier via AI Studio — recommended for getting started)
GOOGLE_AI_API_KEY=your_key

# OpenAI (paid, usage-based)
OPENAI_API_KEY=your_key

# Anthropic Claude (paid, usage-based)
ANTHROPIC_API_KEY=your_key
```

If no AI keys are set, the AI features use mock responses.

## Communications

### Twilio (SMS)

1. Sign up at [twilio.com/console](https://www.twilio.com/console)
2. Use the test credentials from the console (no real SMS sent)
3. Add to `.env.local`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_FROM_NUMBER=+15551234567
   ```

### SendGrid (Email)

1. Sign up at [signup.sendgrid.com](https://signup.sendgrid.com) (free: 100 emails/day)
2. Create an API key in Settings → API Keys
3. Add to `.env.local`:
   ```env
   SENDGRID_API_KEY=your_sendgrid_key
   SENDGRID_FROM_EMAIL=noreply@yourcu.com
   SENDGRID_FROM_NAME=Your Credit Union
   ```

## Wire Transfers

### SWIFT gpi (International)

1. Create account at [developer.swift.com](https://developer.swift.com)
2. Get sandbox credentials (OAuth 2.0 + JWT-Bearer grant)
3. Add to `.env.local`:
   ```env
   WIRE_PROVIDER=swift
   SWIFT_BASE_URL=https://sandbox.swift.com
   SWIFT_API_KEY=your_key
   SWIFT_CONSUMER_KEY=your_consumer_key
   SWIFT_CONSUMER_SECRET=your_consumer_secret
   SWIFT_BIC=your_bic
   ```

### FedWire (Domestic)

FedWire developer access requires an application through the Federal Reserve:

- [FedLine Developer Portal](https://www.frbservices.org/fedline-solutions/fedline-developer)
- Uses ISO 20022 (pacs.008) format

For development, set `WIRE_PROVIDER=mock` (the default).

## Verifying an Integration

After configuring credentials, restart the dev server and check:

1. **Console logs:** The app logs which adapter is active for each integration on startup
2. **Demo mode off:** Set `VITE_DEMO_MODE=false` to use real adapters instead of demo data
3. **Network tab:** Check that requests go to the real API endpoint, not the mock

If an integration falls back to mock unexpectedly, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md#integration-issues).
