[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

# Fiducia — Plateforme Bancaire Ouverte

Plateforme bancaire numérique multi-locataire pour les coopératives de crédit et les banques communautaires. React + TypeScript + backend et adaptateurs de core banking interchangeables.

**Le mode démo fonctionne immédiatement — pas de backend, pas de clés API, pas d'inscription.** Clonez, installez, lancez.

## Démarrage Rapide

```bash
git clone https://github.com/danweis07/Fiducia-.git && cd Fiducia-
./scripts/setup.sh --demo   # installe les dépendances, crée .env.local, vérifie le build
npm run dev                  # http://localhost:8080
```

Ou avec Docker (stack complète — React + Supabase + Simulateur de Core Banking) :

```bash
docker compose up            # http://localhost:8080
```

Identifiants de démonstration : `demo@fiducia.dev` / `demo1234`

## Contenu

| Couche       | Technologie                            | Détails                                                                    |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------- |
| Frontend     | React 19, Vite, TypeScript, Tailwind   | Plus de 60 pages, 50 composants UI (Radix), mode sombre, i18n (33 langues) |
| Backend      | Supabase (PostgreSQL + Edge Functions) | 41 migrations, 11 edge functions, RLS, abonnements en temps réel           |
| Core Banking | Adapter pattern                        | CU\*Answers, Symitar SymXchange, Apache Fineract — ou apportez le vôtre    |
| Simulateur   | Express.js                             | Simule les API de CU\*Answers, Symitar et Fineract localement (port 9090)  |
| Mobile       | Flutter                                | Application compagnon iOS/Android                                          |
| Monitoring   | Prometheus + Grafana + Alertmanager    | Optionnel `--profile monitoring` dans Docker Compose                       |

### Fonctionnalités Clés

- **Multi-locataire** — provisionnez des locataires par région avec `scripts/provision-tenant.ts`
- **Intégrations basées sur des adaptateurs** — chaque service externe (core banking, KYC, paiements, IA) dispose d'un mode de repli simulé
- **Banque aux particuliers** — comptes, virements, paiement de factures, cartes, prêts, RDC, relevés, P2P, virements bancaires
- **Banque aux entreprises** — trésorerie, facturation, paie, balayage de trésorerie, tableau de bord de liquidité
- **Conformité** — KYC/AML, journaux d'audit, consentement RGPD/LGPD, PSD2, SCA, FFIEC, NCUA
- **International** — multi-devises, IBAN/SWIFT, change, paiements internationaux
- **IA** — base de connaissances RAG, analyses financières, recommandations (Google AI / OpenAI / Anthropic)
- **Open Banking** — gestion du consentement, stubs AISP/PISP, passerelle API

## Et Ensuite

Une fois l'application lancée, voici comment vous repérer :

1. **Explorez la démo** — connectez-vous avec `demo@fiducia.dev` / `demo1234` et parcourez les comptes, virements, cartes et le portail d'administration
2. **Lancez les tests** — `npm run test` (unitaires) ou `npm run test:e2e` (de bout en bout)
3. **Lisez l'architecture** — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explique le patron adaptateur, la passerelle API et le modèle multi-locataire
4. **Faites une modification** — essayez de modifier une page dans `src/pages/`, regardez le HMR se mettre à jour instantanément, puis lancez `npm run validate` pour vérifier que tout passe

## Prérequis

| Outil        | Version | Requis pour                                          |
| ------------ | ------- | ---------------------------------------------------- |
| Node.js      | 20+     | Tout développement (`.nvmrc` inclus)                 |
| npm          | 9+      | Fourni avec Node                                     |
| Docker       | 24+     | Développement local full-stack (`docker compose up`) |
| Supabase CLI | latest  | Développement backend/migrations uniquement          |

## Structure du Projet

```
Fiducia-/
├── src/                    # Frontend React
│   ├── pages/              # Composants de pages de routes (60+)
│   ├── components/         # Composants réutilisables (ui/, banking/, admin/, sdui/)
│   ├── contexts/           # Fournisseurs Auth, Theme, Tenant
│   ├── hooks/              # Hooks React personnalisés
│   ├── lib/                # Logique principale : gateway, backend, i18n, demo-data, services
│   ├── integrations/       # Client Supabase et types auto-générés
│   ├── routes/             # Définitions des routes publiques, bancaires, admin
│   ├── services/           # Couche de services du domaine
│   └── types/              # Types de domaine TypeScript (20+ fichiers)
├── supabase/               # Backend
│   ├── migrations/         # 41 migrations SQL (schéma + données d'amorçage)
│   └── functions/          # 11 edge functions Deno (gateway, SSO, OAuth, etc.)
├── core-simulator/         # Serveur mock de core banking (Express, port 9090)
├── mobile/                 # Application mobile Flutter
├── e2e/                    # Tests E2E Playwright (7 fichiers de spécifications)
├── tests/                  # Tests de charge (k6, smoke, soak, stress)
├── load-tests/             # Tests de performance k6 supplémentaires
├── deploy/                 # Configurations cloud (AWS, GCP, Azure, Cloudflare, réseau, secrets)
├── helm/                   # Chart Helm Kubernetes
├── monitoring/             # Configurations Prometheus, Grafana, Alertmanager
├── scripts/                # Setup, déploiement, provisionnement, conformité, sauvegarde
├── docs/                   # Guides pour développeurs
└── docker-compose.yml      # Développement local full-stack
```

## Développement

```bash
npm run dev              # Serveur de développement Vite avec HMR
npm run test             # Vitest en mode watch
npm run test:e2e         # Playwright (Chromium, Firefox, WebKit, mobile Chrome)
npm run lint             # ESLint
npm run typecheck        # Vérification stricte TypeScript
npm run validate         # Tout ce qui précède + build de production
```

### Full Stack avec Docker

```bash
docker compose up                          # React + Supabase + Core Simulator
docker compose --profile monitoring up     # + Prometheus + Grafana
docker compose down -v                     # Arrêter et réinitialiser toutes les données
```

| Service         | URL                    |
| --------------- | ---------------------- |
| React App       | http://localhost:8080  |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Core Simulator  | http://localhost:9090  |

### Simulateur de Core Banking

Le simulateur (port 9090) imite les vraies API de core banking pour le développement local :

- **CU\*Answers :** `http://localhost:9090/api/credit_unions/:cuId/membership/...`
- **SymXchange :** `http://localhost:9090/symxchange/accounts/...`
- **Fineract :** `http://localhost:9090/fineract-provider/api/v1/...`

Injectez des erreurs pour tester la résilience :

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

## Variables d'Environnement

Copiez `.env.example` vers `.env.local` et remplissez les valeurs. Seules deux sont requises pour commencer :

| Variable                 | Requise                        | Description                                                                             |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Oui (ou utilisez le mode démo) | URL du projet Supabase                                                                  |
| `VITE_SUPABASE_ANON_KEY` | Oui (ou utilisez le mode démo) | Clé publique Supabase                                                                   |
| `VITE_DEMO_MODE`         | Non                            | Définir à `true` pour utiliser les données de démo intégrées (par défaut dans le setup) |

Tous les adaptateurs d'intégration (Plaid, Alloy, MX, services IA, etc.) sont optionnels et se replient sur des implémentations simulées. Consultez `.env.example` pour la liste complète avec documentation.

## Déploiement

Des configurations sont fournies pour plusieurs plateformes. Choisissez-en une :

| Plateforme                | Configuration                           | Déploiement                                        |
| ------------------------- | --------------------------------------- | -------------------------------------------------- |
| **Vercel**                | `vercel.json`                           | Connectez le dépôt dans le tableau de bord Vercel  |
| **Netlify**               | `netlify.toml`                          | Connectez le dépôt dans le tableau de bord Netlify |
| **Railway**               | `railway.json`                          | `railway up`                                       |
| **Cloudflare Pages**      | `wrangler.toml`                         | `npx wrangler pages deploy dist`                   |
| **AWS**                   | `deploy/aws/cloudformation.yaml`        | `aws cloudformation deploy`                        |
| **GCP Cloud Run**         | `deploy/gcp/cloud-run.yaml`             | `gcloud run deploy`                                |
| **Azure Static Web Apps** | `deploy/azure/staticwebapp.config.json` | Connectez via le portail Azure                     |
| **Docker**                | `Dockerfile`                            | Build multi-étapes → nginx                         |
| **Kubernetes**            | `helm/banking-platform/`                | `helm install`                                     |

Pour un déploiement multi-locataire : `./scripts/deploy-all-tenants.sh`

## Disponibilité Régionale

| Région                    | Statut                  | Rails de Paiement                                   | Notes                                                  |
| ------------------------- | ----------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Coopératives de crédit US | Prêt pour la production | Le simulateur couvre CU\*Answers, Symitar, Fineract | Heures limites ACH, routage ABA, conformité FFIEC/NCUA |
| Banques communautaires US | Prêt pour la production | Virements bancaires, flux de double approbation     | Hooks de reporting CRA                                 |
| Banques numériques UK     | En développement        | Stubs (Faster Payments, BACS, CHAPS)                | Conformité FCA, validation des sort codes              |
| Néobanques EU             | En développement        | Stubs (SEPA, SCT Inst)                              | Validation IBAN, PSD2, RGPD, calendrier TARGET2        |
| Brésil                    | Précoce                 | Non commencé (bloqueur PIX)                         | Validation CPF/CNPJ, BRL, i18n pt-BR                   |
| Mexique                   | Précoce                 | Non commencé (SPEI)                                 | Validation CLABE, MXN, i18n es                         |

Consultez [docs/DEVELOPER-SETUP-BY-REGION.md](docs/DEVELOPER-SETUP-BY-REGION.md) pour la configuration spécifique à chaque région, les adaptateurs recommandés et les lacunes connues.

## Tests

- **Tests unitaires :** 169 fichiers de tests utilisant Vitest + Testing Library (`npm test`)
- **Tests E2E :** 7 spécifications Playwright — authentification, comptes, tableau de bord, navigation, i18n, accessibilité, performance (`npm run test:e2e`)
- **Tests de charge :** scripts k6 pour les tests smoke, load, stress et soak (`tests/load/`, `load-tests/k6/`)
- **Couverture :** `npm run test:coverage` (seuils : 30% instructions/lignes, 25% branches/fonctions)

## API

Le backend utilise une passerelle de type RPC via une seule Supabase Edge Function :

```
POST /functions/v1/gateway
Authorization: Bearer <supabase-jwt>

{
  "action": "accounts.list",
  "params": { "limit": 10 }
}
```

Spécification API complète : [`openapi.yaml`](openapi.yaml)

## Documentation

| Document                                                      | Description                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Configuration par Région](docs/DEVELOPER-SETUP-BY-REGION.md) | Intégration spécifique à chaque région, adaptateurs et lacunes   |
| [Guide de l'Environnement QA](docs/QA-ENVIRONMENT.md)         | Flux de promotion QA et options d'environnement                  |
| [Vue d'ensemble de l'Architecture](docs/ARCHITECTURE.md)      | Conception du système, flux de données et patron adaptateur      |
| [Spécification OpenAPI](openapi.yaml)                         | Référence API complète                                           |
| [Contribuer](CONTRIBUTING.md)                                 | Comment contribuer, conventions de PR, style de code             |
| [Politique de Sécurité](SECURITY.md)                          | Signalement de vulnérabilités et pratiques de sécurité           |
| [Dépannage](docs/TROUBLESHOOTING.md)                          | Problèmes courants d'installation et de développement            |
| [Intégrations Sandbox](docs/SANDBOX-INTEGRATIONS.md)          | Comment obtenir des identifiants sandbox pour chaque intégration |
| [Guide API](docs/API-GUIDE.md)                                | Exemples d'API gateway avec curl                                 |
| [Checklist de Production](docs/PRODUCTION-CHECKLIST.md)       | Vérification pré et post-déploiement                             |

## Licence

[MIT](LICENSE) — Copyright 2026 Contributeurs de la Plateforme Bancaire Ouverte
