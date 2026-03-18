[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

[![CI](https://github.com/danweis07/Fiducia-/actions/workflows/ci.yml/badge.svg)](https://github.com/danweis07/Fiducia-/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Fiducia — Plataforma de Open Banking

Plataforma de banco digital multi-tenant para cooperativas de crédito e bancos comunitários. React + TypeScript + backend e adaptadores de core banking intercambiáveis.

**O modo demo funciona imediatamente — sem backend, sem chaves de API, sem cadastro.** Clone, instale e execute.

## Início Rápido

```bash
git clone https://github.com/danweis07/Fiducia-.git && cd Fiducia-
./scripts/setup.sh --demo   # instala dependências, cria .env.local, verifica o build
npm run dev                  # http://localhost:8080
```

Ou com Docker (stack completa — React + Supabase + Core Banking Simulator):

```bash
docker compose up            # http://localhost:8080
```

Credenciais de demonstração: `demo@fiducia.dev` / `demo1234`

## O Que Está Incluído

| Camada        | Tecnologia                             | Detalhes                                                                  |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Frontend      | React 19, Vite, TypeScript, Tailwind   | 60+ páginas, 50 componentes de UI (Radix), modo escuro, i18n (33 idiomas) |
| Backend       | Supabase (PostgreSQL + Edge Functions) | 41 migrações, 11 edge functions, RLS, assinaturas em tempo real           |
| Core Banking  | Adapter pattern                        | CU\*Answers, Symitar SymXchange, Apache Fineract — ou traga o seu próprio |
| Simulator     | Express.js                             | Simula as APIs do CU\*Answers, Symitar e Fineract localmente (porta 9090) |
| Mobile        | Flutter                                | Aplicativo companheiro para iOS/Android                                   |
| Monitoramento | Prometheus + Grafana + Alertmanager    | Opcional `--profile monitoring` no Docker Compose                         |

### Funcionalidades Principais

- **Multi-tenant** — provisionamento de tenants por região com `scripts/provision-tenant.ts`
- **Integrações baseadas em adaptadores** — todo serviço externo (core banking, KYC, pagamentos, IA) possui um fallback mock
- **Banco para pessoa física** — contas, transferências, pagamento de contas, cartões, empréstimos, RDC, extratos, P2P, transferências bancárias
- **Banco para pessoa jurídica** — tesouraria, faturamento, folha de pagamento, cash sweeps, painel de liquidez
- **Conformidade** — KYC/AML, logs de auditoria, consentimento GDPR/LGPD, PSD2, SCA, FFIEC, NCUA
- **Internacional** — multi-moeda, IBAN/SWIFT, câmbio, pagamentos internacionais
- **IA** — base de conhecimento RAG, insights financeiros, recomendações (Google AI / OpenAI / Anthropic)
- **Open Banking** — gerenciamento de consentimento, stubs AISP/PISP, API gateway

## Próximos Passos

Quando o aplicativo estiver rodando, veja como se orientar:

1. **Explore a demo** — faça login com `demo@fiducia.dev` / `demo1234` e navegue pelas contas, transferências, cartões e o portal de administração
2. **Execute os testes** — `npm run test` (unitários) ou `npm run test:e2e` (ponta a ponta)
3. **Leia a arquitetura** — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explica o adapter pattern, o API gateway e o modelo de multi-tenancy
4. **Faça uma alteração** — experimente editar uma página em `src/pages/`, veja o HMR atualizar instantaneamente, depois execute `npm run validate` para verificar se tudo passa

## Pré-requisitos

| Ferramenta   | Versão | Necessária para                                        |
| ------------ | ------ | ------------------------------------------------------ |
| Node.js      | 20+    | Todo o desenvolvimento (`.nvmrc` incluído)             |
| npm          | 9+     | Incluído com o Node                                    |
| Docker       | 24+    | Desenvolvimento local full-stack (`docker compose up`) |
| Supabase CLI | latest | Apenas desenvolvimento de backend/migrações            |

## Estrutura do Projeto

```
Fiducia-/
├── src/                    # Frontend React
│   ├── pages/              # Componentes de página de rota (60+)
│   ├── components/         # Componentes reutilizáveis (ui/, banking/, admin/, sdui/)
│   ├── contexts/           # Provedores de Auth, Theme, Tenant
│   ├── hooks/              # Hooks React customizados
│   ├── lib/                # Lógica central: gateway, backend, i18n, demo-data, services
│   ├── integrations/       # Cliente Supabase e tipos auto-gerados
│   ├── routes/             # Definições de rotas públicas, banking, admin
│   ├── services/           # Camada de serviços de domínio
│   └── types/              # Tipos de domínio TypeScript (20+ arquivos)
├── supabase/               # Backend
│   ├── migrations/         # 41 migrações SQL (schema + dados de seed)
│   └── functions/          # 11 edge functions Deno (gateway, SSO, OAuth, etc.)
├── core-simulator/         # Servidor mock de core banking (Express, porta 9090)
├── mobile/                 # Aplicativo móvel Flutter
├── e2e/                    # Testes E2E com Playwright (7 arquivos de spec)
├── tests/                  # Testes de carga (k6, smoke, soak, stress)
├── load-tests/             # Testes de performance adicionais com k6
├── deploy/                 # Configurações de nuvem (AWS, GCP, Azure, Cloudflare, networking, secrets)
├── helm/                   # Chart Helm para Kubernetes
├── monitoring/             # Configurações do Prometheus, Grafana, Alertmanager
├── scripts/                # Setup, deploy, provisionamento, conformidade, backup
├── docs/                   # Guias para desenvolvedores
└── docker-compose.yml      # Desenvolvimento local full-stack
```

## Desenvolvimento

```bash
npm run dev              # Servidor de desenvolvimento Vite com HMR
npm run test             # Vitest em modo watch
npm run test:e2e         # Playwright (Chromium, Firefox, WebKit, mobile Chrome)
npm run lint             # ESLint
npm run typecheck        # Verificação estrita do TypeScript
npm run validate         # Todos os anteriores + build de produção
```

### Full Stack com Docker

```bash
docker compose up                          # React + Supabase + Core Simulator
docker compose --profile monitoring up     # + Prometheus + Grafana
docker compose down -v                     # Para e reseta todos os dados
```

| Serviço         | URL                    |
| --------------- | ---------------------- |
| React App       | http://localhost:8080  |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Core Simulator  | http://localhost:9090  |

### Core Banking Simulator

O simulador (porta 9090) imita APIs reais de core banking para desenvolvimento local:

- **CU\*Answers:** `http://localhost:9090/api/credit_unions/:cuId/membership/...`
- **SymXchange:** `http://localhost:9090/symxchange/accounts/...`
- **Fineract:** `http://localhost:9090/fineract-provider/api/v1/...`

Injete erros para testes de resiliência:

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha os valores. Apenas duas são necessárias para começar:

| Variável                 | Obrigatória              | Descrição                                                                       |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Sim (ou use o modo demo) | URL do projeto Supabase                                                         |
| `VITE_SUPABASE_ANON_KEY` | Sim (ou use o modo demo) | Chave pública do Supabase                                                       |
| `VITE_DEMO_MODE`         | Não                      | Defina como `true` para usar dados de demonstração integrados (padrão no setup) |

Todos os adaptadores de integração (Plaid, Alloy, MX, serviços de IA, etc.) são opcionais e utilizam implementações mock como fallback. Consulte `.env.example` para a lista completa com documentação.

## Implantação

Configurações são fornecidas para múltiplas plataformas. Escolha uma:

| Plataforma                | Configuração                            | Implantação                                |
| ------------------------- | --------------------------------------- | ------------------------------------------ |
| **Vercel**                | `vercel.json`                           | Conecte o repositório no painel do Vercel  |
| **Netlify**               | `netlify.toml`                          | Conecte o repositório no painel do Netlify |
| **Railway**               | `railway.json`                          | `railway up`                               |
| **Cloudflare Pages**      | `wrangler.toml`                         | `npx wrangler pages deploy dist`           |
| **AWS**                   | `deploy/aws/cloudformation.yaml`        | `aws cloudformation deploy`                |
| **GCP Cloud Run**         | `deploy/gcp/cloud-run.yaml`             | `gcloud run deploy`                        |
| **Azure Static Web Apps** | `deploy/azure/staticwebapp.config.json` | Conecte via Portal do Azure                |
| **Docker**                | `Dockerfile`                            | Build multi-estágio → nginx                |
| **Kubernetes**            | `helm/banking-platform/`                | `helm install`                             |

Para implantação multi-tenant: `./scripts/deploy-all-tenants.sh`

## Prontidão Regional

| Região                          | Status               | Trilhos de Pagamento                                | Observações                                                    |
| ------------------------------- | -------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| Cooperativas de Crédito dos EUA | Pronto para produção | O simulador cobre CU\*Answers, Symitar, Fineract    | Horários de corte ACH, roteamento ABA, conformidade FFIEC/NCUA |
| Bancos Comunitários dos EUA     | Pronto para produção | Transferências bancárias, fluxos de aprovação dupla | Hooks de relatórios CRA                                        |
| Bancos Digitais do Reino Unido  | Em desenvolvimento   | Stubs (Faster Payments, BACS, CHAPS)                | Conformidade FCA, validação de sort code                       |
| Neobancos da UE                 | Em desenvolvimento   | Stubs (SEPA, SCT Inst)                              | Validação de IBAN, PSD2, GDPR, calendário TARGET2              |
| Brasil                          | Inicial              | Não iniciado (bloqueado por PIX)                    | Validação CPF/CNPJ, BRL, i18n pt-BR                            |
| México                          | Inicial              | Não iniciado (SPEI)                                 | Validação CLABE, MXN, i18n es                                  |

Consulte [docs/DEVELOPER-SETUP-BY-REGION.md](docs/DEVELOPER-SETUP-BY-REGION.md) para configuração específica por região, adaptadores recomendados e lacunas conhecidas.

## Testes

- **Testes unitários:** 169 arquivos de teste usando Vitest + Testing Library (`npm test`)
- **Testes E2E:** 7 specs Playwright — autenticação, contas, dashboard, navegação, i18n, acessibilidade, performance (`npm run test:e2e`)
- **Testes de carga:** scripts k6 para testes smoke, load, stress e soak (`tests/load/`, `load-tests/k6/`)
- **Cobertura:** `npm run test:coverage` (limites: 30% statements/lines, 25% branches/functions)

## API

O backend utiliza um gateway no estilo RPC através de uma única Supabase Edge Function:

```
POST /functions/v1/gateway
Authorization: Bearer <supabase-jwt>

{
  "action": "accounts.list",
  "params": { "limit": 10 }
}
```

Especificação completa da API: [`openapi.yaml`](openapi.yaml)

## Documentação

| Documento                                                    | Descrição                                               |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [Configuração por Região](docs/DEVELOPER-SETUP-BY-REGION.md) | Onboarding específico por região, adaptadores e lacunas |
| [Guia do Ambiente de QA](docs/QA-ENVIRONMENT.md)             | Fluxo de promoção de QA e opções de ambiente            |
| [Visão Geral da Arquitetura](docs/ARCHITECTURE.md)           | Design do sistema, fluxo de dados e adapter pattern     |
| [Especificação OpenAPI](openapi.yaml)                        | Referência completa da API                              |
| [Contribuição](CONTRIBUTING.md)                              | Como contribuir, convenções de PR, estilo de código     |
| [Política de Segurança](SECURITY.md)                         | Relatório de vulnerabilidades e práticas de segurança   |
| [Solução de Problemas](docs/TROUBLESHOOTING.md)              | Problemas comuns de setup e desenvolvimento             |
| [Integrações Sandbox](docs/SANDBOX-INTEGRATIONS.md)          | Como obter credenciais sandbox para cada integração     |
| [Guia da API](docs/API-GUIDE.md)                             | Exemplos de API do gateway com curl                     |
| [Checklist de Produção](docs/PRODUCTION-CHECKLIST.md)        | Verificação pré e pós-implantação                       |

## Licença

[MIT](LICENSE) — Copyright 2026 Open Banking Platform Contributors
