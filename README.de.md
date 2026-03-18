[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

[![CI](https://github.com/danweis07/Fiducia-/actions/workflows/ci.yml/badge.svg)](https://github.com/danweis07/Fiducia-/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Fiducia — Open-Banking-Plattform

Mandantenfähige digitale Bankplattform für Kreditgenossenschaften und Genossenschaftsbanken. React + TypeScript + austauschbares Backend und Core-Banking-Adapter.

**Der Demo-Modus funktioniert sofort — kein Backend, keine API-Schlüssel, keine Registrierung.** Klonen, installieren, starten.

## Schnellstart

```bash
git clone https://github.com/danweis07/Fiducia-.git && cd Fiducia-
./scripts/setup.sh --demo   # installs deps, creates .env.local, verifies build
npm run dev                  # http://localhost:8080
```

Oder mit Docker (vollständiger Stack — React + Supabase + Core-Banking-Simulator):

```bash
docker compose up            # http://localhost:8080
```

Demo-Zugangsdaten: `demo@fiducia.dev` / `demo1234`

## Projektinhalt

| Schicht      | Technologie                            | Details                                                                |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------- |
| Frontend     | React 19, Vite, TypeScript, Tailwind   | 60+ Seiten, 50 UI-Komponenten (Radix), Dark Mode, i18n (33 Sprachen)   |
| Backend      | Supabase (PostgreSQL + Edge Functions) | 41 Migrationen, 11 Edge Functions, RLS, Echtzeit-Subscriptions         |
| Core Banking | Adapter-Pattern                        | CU\*Answers, Symitar SymXchange, Apache Fineract — oder eigene Adapter |
| Simulator    | Express.js                             | Simuliert CU\*Answers-, Symitar- und Fineract-APIs lokal (Port 9090)   |
| Mobil        | Flutter                                | iOS/Android-Begleit-App                                                |
| Monitoring   | Prometheus + Grafana + Alertmanager    | Optional `--profile monitoring` in Docker Compose                      |

### Hauptfunktionen

- **Mandantenfähig** — Mandanten regional bereitstellen mit `scripts/provision-tenant.ts`
- **Adapterbasierte Integrationen** — jeder externe Dienst (Core Banking, KYC, Zahlungen, KI) hat einen Mock-Fallback
- **Privatkundenbanking** — Konten, Überweisungen, Rechnungszahlung, Karten, Kredite, RDC, Kontoauszüge, P2P, Banküberweisungen
- **Firmenkundenbanking** — Treasury, Rechnungsstellung, Gehaltsabrechnung, Cash Sweeps, Liquiditäts-Dashboard
- **Compliance** — KYC/AML, Audit-Logs, GDPR/LGPD-Einwilligung, PSD2, SCA, FFIEC, NCUA
- **International** — Mehrwährungs-Unterstützung, IBAN/SWIFT, Devisenhandel, internationale Zahlungen
- **KI** — RAG-Wissensdatenbank, finanzielle Einblicke, Empfehlungen (Google AI / OpenAI / Anthropic)
- **Open Banking** — Einwilligungsverwaltung, AISP/PISP-Stubs, API-Gateway

## Nächste Schritte

Sobald die App läuft, hier eine Orientierungshilfe:

1. **Demo erkunden** — Melden Sie sich mit `demo@fiducia.dev` / `demo1234` an und durchstöbern Sie Konten, Überweisungen, Karten und das Admin-Portal
2. **Tests ausführen** — `npm run test` (Unit) oder `npm run test:e2e` (End-to-End)
3. **Architektur lesen** — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) erklärt das Adapter-Pattern, das API-Gateway und das Mandantenfähigkeitsmodell
4. **Etwas ändern** — Bearbeiten Sie eine Seite in `src/pages/`, beobachten Sie die sofortige HMR-Aktualisierung und führen Sie dann `npm run validate` aus, um zu prüfen, ob alles besteht

## Voraussetzungen

| Werkzeug     | Version | Benötigt für                                        |
| ------------ | ------- | --------------------------------------------------- |
| Node.js      | 20+     | Gesamte Entwicklung (`.nvmrc` enthalten)            |
| npm          | 9+      | Im Lieferumfang von Node                            |
| Docker       | 24+     | Full-Stack lokale Entwicklung (`docker compose up`) |
| Supabase CLI | latest  | Nur für Backend-/Migrationsentwicklung              |

## Projektstruktur

```
Fiducia-/
├── src/                    # React-Frontend
│   ├── pages/              # Routen-Seitenkomponenten (60+)
│   ├── components/         # Wiederverwendbare Komponenten (ui/, banking/, admin/, sdui/)
│   ├── contexts/           # Auth-, Theme-, Tenant-Provider
│   ├── hooks/              # Eigene React-Hooks
│   ├── lib/                # Kernlogik: Gateway, Backend, i18n, Demo-Daten, Dienste
│   ├── integrations/       # Supabase-Client & automatisch generierte Typen
│   ├── routes/             # Öffentliche, Banking-, Admin-Routendefinitionen
│   ├── services/           # Domänen-Service-Schicht
│   └── types/              # TypeScript-Domänentypen (20+ Dateien)
├── supabase/               # Backend
│   ├── migrations/         # 41 SQL-Migrationen (Schema + Seed-Daten)
│   └── functions/          # 11 Deno Edge Functions (Gateway, SSO, OAuth usw.)
├── core-simulator/         # Mock-Core-Banking-Server (Express, Port 9090)
├── mobile/                 # Flutter-Mobile-App
├── e2e/                    # Playwright-E2E-Tests (7 Spec-Dateien)
├── tests/                  # Lasttests (k6, Smoke, Soak, Stress)
├── load-tests/             # Zusätzliche k6-Performance-Tests
├── deploy/                 # Cloud-Konfigurationen (AWS, GCP, Azure, Cloudflare, Netzwerk, Secrets)
├── helm/                   # Kubernetes Helm Chart
├── monitoring/             # Prometheus-, Grafana-, Alertmanager-Konfigurationen
├── scripts/                # Setup, Deployment, Bereitstellung, Compliance, Backup
├── docs/                   # Entwicklerhandbücher
└── docker-compose.yml      # Full-Stack lokale Entwicklung
```

## Entwicklung

```bash
npm run dev              # Vite Dev-Server mit HMR
npm run test             # Vitest im Watch-Modus
npm run test:e2e         # Playwright (Chromium, Firefox, WebKit, mobile Chrome)
npm run lint             # ESLint
npm run typecheck        # TypeScript Strict-Prüfung
npm run validate         # Alle obigen + Produktions-Build
```

### Full Stack mit Docker

```bash
docker compose up                          # React + Supabase + Core Simulator
docker compose --profile monitoring up     # + Prometheus + Grafana
docker compose down -v                     # Stoppen und alle Daten zurücksetzen
```

| Dienst          | URL                    |
| --------------- | ---------------------- |
| React App       | http://localhost:8080  |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Core Simulator  | http://localhost:9090  |

### Core-Banking-Simulator

Der Simulator (Port 9090) simuliert echte Core-Banking-APIs für die lokale Entwicklung:

- **CU\*Answers:** `http://localhost:9090/api/credit_unions/:cuId/membership/...`
- **SymXchange:** `http://localhost:9090/symxchange/accounts/...`
- **Fineract:** `http://localhost:9090/fineract-provider/api/v1/...`

Fehler für Resilienztests einschleusen:

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

## Umgebungsvariablen

Kopieren Sie `.env.example` nach `.env.local` und füllen Sie die Werte aus. Nur zwei sind für den Anfang erforderlich:

| Variable                 | Erforderlich                   | Beschreibung                                                                   |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Ja (oder Demo-Modus verwenden) | Supabase-Projekt-URL                                                           |
| `VITE_SUPABASE_ANON_KEY` | Ja (oder Demo-Modus verwenden) | Öffentlicher Supabase-Schlüssel                                                |
| `VITE_DEMO_MODE`         | Nein                           | Auf `true` setzen, um eingebaute Demo-Daten zu verwenden (Standard beim Setup) |

Alle Integrationsadapter (Plaid, Alloy, MX, KI-Dienste usw.) sind optional und greifen auf Mock-Implementierungen zurück. Die vollständige Liste mit Dokumentation finden Sie in `.env.example`.

## Deployment

Konfigurationen werden für mehrere Plattformen bereitgestellt. Wählen Sie eine:

| Plattform                 | Konfiguration                           | Deployment                                |
| ------------------------- | --------------------------------------- | ----------------------------------------- |
| **Vercel**                | `vercel.json`                           | Repository im Vercel-Dashboard verbinden  |
| **Netlify**               | `netlify.toml`                          | Repository im Netlify-Dashboard verbinden |
| **Railway**               | `railway.json`                          | `railway up`                              |
| **Cloudflare Pages**      | `wrangler.toml`                         | `npx wrangler pages deploy dist`          |
| **AWS**                   | `deploy/aws/cloudformation.yaml`        | `aws cloudformation deploy`               |
| **GCP Cloud Run**         | `deploy/gcp/cloud-run.yaml`             | `gcloud run deploy`                       |
| **Azure Static Web Apps** | `deploy/azure/staticwebapp.config.json` | Über Azure Portal verbinden               |
| **Docker**                | `Dockerfile`                            | Multi-Stage-Build → nginx                 |
| **Kubernetes**            | `helm/banking-platform/`                | `helm install`                            |

Für mandantenfähiges Deployment: `./scripts/deploy-all-tenants.sh`

## Regionale Bereitschaft

| Region                    | Status            | Zahlungsinfrastruktur                             | Anmerkungen                                            |
| ------------------------- | ----------------- | ------------------------------------------------- | ------------------------------------------------------ |
| US-Kreditgenossenschaften | Produktionsbereit | Simulator deckt CU\*Answers, Symitar, Fineract ab | ACH-Annahmeschluss, ABA-Routing, FFIEC/NCUA-Compliance |
| US-Genossenschaftsbanken  | Produktionsbereit | Banküberweisungen, Dual-Approval-Workflows        | CRA-Berichts-Hooks                                     |
| UK-Digitalbanken          | In Entwicklung    | Stubs (Faster Payments, BACS, CHAPS)              | FCA-Compliance, Bankleitzahl-Validierung               |
| EU-Neobanken              | In Entwicklung    | Stubs (SEPA, SCT Inst)                            | IBAN-Validierung, PSD2, GDPR, TARGET2-Kalender         |
| Brasilien                 | Frühe Phase       | Noch nicht begonnen (PIX-Blocker)                 | CPF/CNPJ-Validierung, BRL, pt-BR i18n                  |
| Mexiko                    | Frühe Phase       | Noch nicht begonnen (SPEI)                        | CLABE-Validierung, MXN, es i18n                        |

Siehe [docs/DEVELOPER-SETUP-BY-REGION.md](docs/DEVELOPER-SETUP-BY-REGION.md) für regionsspezifisches Setup, empfohlene Adapter und bekannte Lücken.

## Testen

- **Unit-Tests:** 169 Testdateien mit Vitest + Testing Library (`npm test`)
- **E2E-Tests:** 7 Playwright-Specs — Auth, Konten, Dashboard, Navigation, i18n, Barrierefreiheit, Performance (`npm run test:e2e`)
- **Lasttests:** k6-Skripte für Smoke-, Last-, Stress- und Soak-Tests (`tests/load/`, `load-tests/k6/`)
- **Abdeckung:** `npm run test:coverage` (Schwellenwerte: 30% Anweisungen/Zeilen, 25% Verzweigungen/Funktionen)

## API

Das Backend verwendet ein RPC-ähnliches Gateway über eine einzelne Supabase Edge Function:

```
POST /functions/v1/gateway
Authorization: Bearer <supabase-jwt>

{
  "action": "accounts.list",
  "params": { "limit": 10 }
}
```

Vollständige API-Spezifikation: [`openapi.yaml`](openapi.yaml)

## Dokumentation

| Dokument                                                          | Beschreibung                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| [Entwickler-Setup nach Region](docs/DEVELOPER-SETUP-BY-REGION.md) | Regionsspezifisches Onboarding, Adapter und Lücken         |
| [QA-Umgebungshandbuch](docs/QA-ENVIRONMENT.md)                    | QA-Promotion-Ablauf und Umgebungsoptionen                  |
| [Architekturübersicht](docs/ARCHITECTURE.md)                      | Systemdesign, Datenfluss und Adapter-Pattern               |
| [OpenAPI-Spezifikation](openapi.yaml)                             | Vollständige API-Referenz                                  |
| [Mitwirken](CONTRIBUTING.de.md)                                   | Wie man beiträgt, PR-Konventionen, Code-Stil               |
| [Sicherheitsrichtlinie](SECURITY.de.md)                           | Schwachstellenmeldung und Sicherheitspraktiken             |
| [Fehlerbehebung](docs/TROUBLESHOOTING.md)                         | Häufige Setup- und Entwicklungsprobleme                    |
| [Sandbox-Integrationen](docs/SANDBOX-INTEGRATIONS.md)             | Wie Sie Sandbox-Zugangsdaten für jede Integration erhalten |
| [API-Handbuch](docs/API-GUIDE.md)                                 | Gateway-API-Beispiele mit curl                             |
| [Produktions-Checkliste](docs/PRODUCTION-CHECKLIST.md)            | Vor- und Nach-Deployment-Überprüfung                       |

## Lizenz

[MIT](LICENSE) — Copyright 2026 Open Banking Platform Contributors
