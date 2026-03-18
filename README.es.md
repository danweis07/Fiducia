[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

[![CI](https://github.com/danweis07/Fiducia/actions/workflows/ci.yml/badge.svg)](https://github.com/danweis07/Fiducia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

# Fiducia — Plataforma de Banca Abierta

Plataforma de banca digital multi-tenant para cooperativas de crédito y bancos comunitarios. React + TypeScript + backend y adaptadores de core bancario intercambiables.

**El modo demo funciona de inmediato — sin backend, sin claves de API, sin registro.** Clonar, instalar, ejecutar.

## Inicio Rápido

```bash
git clone https://github.com/danweis07/Fiducia.git && cd Fiducia
./scripts/setup.sh --demo   # instala dependencias, crea .env.local, verifica la compilación
npm run dev                  # http://localhost:8080
```

O con Docker (pila completa — React + Supabase + Simulador de Core Bancario):

```bash
docker compose up            # http://localhost:8080
```

Credenciales de demostración: `demo@fiducia.dev` / `demo1234`

## Qué Incluye

| Capa          | Tecnología                             | Detalles                                                                    |
| ------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| Frontend      | React 19, Vite, TypeScript, Tailwind   | 60+ páginas, 50 componentes de UI (Radix), modo oscuro, i18n (33 idiomas)   |
| Backend       | Supabase (PostgreSQL + Edge Functions) | 41 migraciones, 11 edge functions, RLS, suscripciones en tiempo real        |
| Core Bancario | Patrón adaptador                       | CU\*Answers, Symitar SymXchange, Apache Fineract — o trae el tuyo propio    |
| Simulador     | Express.js                             | Simula las APIs de CU\*Answers, Symitar y Fineract localmente (puerto 9090) |
| Móvil         | Flutter                                | Aplicación complementaria para iOS/Android                                  |
| Monitoreo     | Prometheus + Grafana + Alertmanager    | Opcional `--profile monitoring` en Docker Compose                           |

### Características Principales

- **Multi-tenant** — aprovisiona tenants por región con `scripts/provision-tenant.ts`
- **Integraciones basadas en adaptadores** — cada servicio externo (core bancario, KYC, pagos, IA) tiene un respaldo mock
- **Banca de consumo** — cuentas, transferencias, pago de facturas, tarjetas, préstamos, RDC, estados de cuenta, P2P, transferencias bancarias
- **Banca empresarial** — tesorería, facturación, nómina, barridos de efectivo, panel de liquidez
- **Cumplimiento normativo** — KYC/AML, registros de auditoría, consentimiento GDPR/LGPD, PSD2, SCA, FFIEC, NCUA
- **Internacional** — multi-moneda, IBAN/SWIFT, FX, pagos internacionales
- **IA** — base de conocimiento RAG, análisis financiero, recomendaciones (Google AI / OpenAI / Anthropic)
- **Banca Abierta** — gestión de consentimientos, stubs AISP/PISP, API gateway

## Próximos Pasos

Una vez que la aplicación esté en ejecución, así puedes orientarte:

1. **Explora la demo** — inicia sesión con `demo@fiducia.dev` / `demo1234` y navega por cuentas, transferencias, tarjetas y el portal de administración
2. **Ejecuta las pruebas** — `npm run test` (unitarias) o `npm run test:e2e` (de extremo a extremo)
3. **Lee la arquitectura** — [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explica el patrón adaptador, el API gateway y el modelo multi-tenancy
4. **Haz un cambio** — prueba editando una página en `src/pages/`, observa cómo HMR actualiza instantáneamente, luego ejecuta `npm run validate` para verificar que todo pasa

## Requisitos Previos

| Herramienta  | Versión | Necesaria para                                          |
| ------------ | ------- | ------------------------------------------------------- |
| Node.js      | 20+     | Todo el desarrollo (`.nvmrc` incluido)                  |
| npm          | 9+      | Incluido con Node                                       |
| Docker       | 24+     | Desarrollo local de pila completa (`docker compose up`) |
| Supabase CLI | latest  | Solo desarrollo de backend/migraciones                  |

## Estructura del Proyecto

```
Fiducia/
├── src/                    # Frontend React
│   ├── pages/              # Componentes de página por ruta (60+)
│   ├── components/         # Componentes reutilizables (ui/, banking/, admin/, sdui/)
│   ├── contexts/           # Proveedores de Auth, Theme, Tenant
│   ├── hooks/              # Hooks personalizados de React
│   ├── lib/                # Lógica central: gateway, backend, i18n, demo-data, services
│   ├── integrations/       # Cliente Supabase y tipos auto-generados
│   ├── routes/             # Definiciones de rutas públicas, bancarias, admin
│   ├── services/           # Capa de servicios de dominio
│   └── types/              # Tipos de dominio TypeScript (20+ archivos)
├── supabase/               # Backend
│   ├── migrations/         # 41 migraciones SQL (esquema + datos semilla)
│   └── functions/          # 11 edge functions en Deno (gateway, SSO, OAuth, etc.)
├── core-simulator/         # Servidor mock de core bancario (Express, puerto 9090)
├── mobile/                 # Aplicación móvil Flutter
├── e2e/                    # Pruebas E2E con Playwright (7 archivos spec)
├── tests/                  # Pruebas de carga (k6, smoke, soak, stress)
├── load-tests/             # Pruebas de rendimiento adicionales con k6
├── deploy/                 # Configuraciones cloud (AWS, GCP, Azure, Cloudflare, networking, secrets)
├── helm/                   # Chart de Helm para Kubernetes
├── monitoring/             # Configuraciones de Prometheus, Grafana, Alertmanager
├── scripts/                # Setup, deploy, aprovisionamiento, cumplimiento, respaldos
├── docs/                   # Guías para desarrolladores
└── docker-compose.yml      # Desarrollo local de pila completa
```

## Desarrollo

```bash
npm run dev              # Servidor de desarrollo Vite con HMR
npm run test             # Vitest en modo observación
npm run test:e2e         # Playwright (Chromium, Firefox, WebKit, mobile Chrome)
npm run lint             # ESLint
npm run typecheck        # Verificación estricta de TypeScript
npm run validate         # Todo lo anterior + compilación de producción
```

### Pila Completa con Docker

```bash
docker compose up                          # React + Supabase + Core Simulator
docker compose --profile monitoring up     # + Prometheus + Grafana
docker compose down -v                     # Detener y restablecer todos los datos
```

| Servicio        | URL                    |
| --------------- | ---------------------- |
| React App       | http://localhost:8080  |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Core Simulator  | http://localhost:9090  |

### Simulador de Core Bancario

El simulador (puerto 9090) imita las APIs reales de core bancario para el desarrollo local:

- **CU\*Answers:** `http://localhost:9090/api/credit_unions/:cuId/membership/...`
- **SymXchange:** `http://localhost:9090/symxchange/accounts/...`
- **Fineract:** `http://localhost:9090/fineract-provider/api/v1/...`

Inyectar errores para pruebas de resiliencia:

```bash
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'
```

## Variables de Entorno

Copia `.env.example` a `.env.local` y completa los valores. Solo dos son necesarias para comenzar:

| Variable                 | Requerida             | Descripción                                                                            |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Sí (o usar modo demo) | URL del proyecto Supabase                                                              |
| `VITE_SUPABASE_ANON_KEY` | Sí (o usar modo demo) | Clave pública de Supabase                                                              |
| `VITE_DEMO_MODE`         | No                    | Establecer `true` para usar datos de demostración integrados (predeterminado en setup) |

Todos los adaptadores de integración (Plaid, Alloy, MX, servicios de IA, etc.) son opcionales y recurren a implementaciones mock. Consulta `.env.example` para la lista completa con documentación.

## Despliegue

Se proporcionan configuraciones para múltiples plataformas. Elige una:

| Plataforma                | Configuración                           | Desplegar                                   |
| ------------------------- | --------------------------------------- | ------------------------------------------- |
| **Vercel**                | `vercel.json`                           | Conectar repositorio en el panel de Vercel  |
| **Netlify**               | `netlify.toml`                          | Conectar repositorio en el panel de Netlify |
| **Railway**               | `railway.json`                          | `railway up`                                |
| **Cloudflare Pages**      | `wrangler.toml`                         | `npx wrangler pages deploy dist`            |
| **AWS**                   | `deploy/aws/cloudformation.yaml`        | `aws cloudformation deploy`                 |
| **GCP Cloud Run**         | `deploy/gcp/cloud-run.yaml`             | `gcloud run deploy`                         |
| **Azure Static Web Apps** | `deploy/azure/staticwebapp.config.json` | Conectar a través del Portal de Azure       |
| **Docker**                | `Dockerfile`                            | Compilación multi-etapa → nginx             |
| **Kubernetes**            | `helm/banking-platform/`                | `helm install`                              |

Para despliegue multi-tenant: `./scripts/deploy-all-tenants.sh`

## Disponibilidad Regional

| Región                             | Estado                | Rieles de Pago                                       | Notas                                                 |
| ---------------------------------- | --------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Cooperativas de crédito de EE. UU. | Listo para producción | El simulador cubre CU\*Answers, Symitar, Fineract    | Cortes ACH, enrutamiento ABA, cumplimiento FFIEC/NCUA |
| Bancos comunitarios de EE. UU.     | Listo para producción | Transferencias bancarias, flujos de doble aprobación | Hooks de informes CRA                                 |
| Bancos digitales del Reino Unido   | En desarrollo         | Stubs (Faster Payments, BACS, CHAPS)                 | Cumplimiento FCA, validación de sort code             |
| Neobancos de la UE                 | En desarrollo         | Stubs (SEPA, SCT Inst)                               | Validación IBAN, PSD2, GDPR, calendario TARGET2       |
| Brasil                             | Temprano              | No iniciado (bloqueador PIX)                         | Validación CPF/CNPJ, BRL, i18n pt-BR                  |
| México                             | Temprano              | No iniciado (SPEI)                                   | Validación CLABE, MXN, i18n es                        |

Consulta [docs/DEVELOPER-SETUP-BY-REGION.md](docs/DEVELOPER-SETUP-BY-REGION.md) para configuración específica por región, adaptadores recomendados y brechas conocidas.

## Pruebas

- **Pruebas unitarias:** 169 archivos de prueba usando Vitest + Testing Library (`npm test`)
- **Pruebas E2E:** 7 specs de Playwright — autenticación, cuentas, dashboard, navegación, i18n, accesibilidad, rendimiento (`npm run test:e2e`)
- **Pruebas de carga:** scripts k6 para pruebas de smoke, carga, estrés y resistencia (`tests/load/`, `load-tests/k6/`)
- **Cobertura:** `npm run test:coverage` (umbrales: 30% sentencias/líneas, 25% ramas/funciones)

## API

El backend utiliza un gateway estilo RPC a través de una única Supabase Edge Function:

```
POST /functions/v1/gateway
Authorization: Bearer <supabase-jwt>

{
  "action": "accounts.list",
  "params": { "limit": 10 }
}
```

Especificación completa de la API: [`openapi.yaml`](openapi.yaml)

## Documentación

| Documento                                                           | Descripción                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Configuración por Región](docs/DEVELOPER-SETUP-BY-REGION.md)       | Incorporación específica por región, adaptadores y brechas |
| [Guía del Entorno QA](docs/QA-ENVIRONMENT.md)                       | Flujo de promoción QA y opciones de entorno                |
| [Descripción de la Arquitectura](docs/ARCHITECTURE.md)              | Diseño del sistema, flujo de datos y patrón adaptador      |
| [Especificación OpenAPI](openapi.yaml)                              | Referencia completa de la API                              |
| [Contribuir](CONTRIBUTING.md)                                       | Cómo contribuir, convenciones de PR, estilo de código      |
| [Política de Seguridad](SECURITY.md)                                | Reporte de vulnerabilidades y prácticas de seguridad       |
| [Solución de Problemas](docs/TROUBLESHOOTING.md)                    | Problemas comunes de configuración y desarrollo            |
| [Integraciones Sandbox](docs/SANDBOX-INTEGRATIONS.md)               | Cómo obtener credenciales sandbox para cada integración    |
| [Guía de la API](docs/API-GUIDE.md)                                 | Ejemplos de la API gateway con curl                        |
| [Lista de Verificación de Producción](docs/PRODUCTION-CHECKLIST.md) | Verificación previa y posterior al despliegue              |

## Licencia

[MIT](LICENSE) — Copyright 2026 Open Banking Platform Contributors
