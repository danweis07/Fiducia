# Core Banking Simulator

An Express.js sidecar that mimics real core banking REST APIs, returning realistic mock data with configurable latency, error injection, and optional mutual TLS. Used for local development and CI testing without connecting to a live core system.

## Supported Core Systems

| Provider    | Route Prefix                              | Description                        |
| ----------- | ----------------------------------------- | ---------------------------------- |
| CU*Answers  | `/api/credit_unions/:cuId/...`            | It's Me 247 member/account API     |
| Symitar     | `/symxchange/...`                         | SymXchange account & transaction API |
| Fineract    | `/fineract-provider/api/v1/...`           | Apache Fineract savings, loans, clients, groups, centers |
| UK Payments | `/uk/faster-payments/`, `/uk/bacs/`, `/uk/chaps/` | FPS, BACS, CHAPS, Confirmation of Payee |
| SEPA        | `/sepa/sct/`, `/sepa/sct-inst/`, `/sepa/sdd/` | SCT, SCT Inst, SDD mandates & collections |
| PIX         | `/pix/...`                                | Brazilian instant payments (DICT, QR codes) |
| SPEI        | `/spei/...`                               | Mexican interbank transfers (CEP verification) |
| Admin       | `/admin/...`                              | Runtime config and state reset     |

## Quick Start

### npm

```bash
cd core-simulator
npm install
npm start        # Starts on port 9090
```

### Docker

```bash
docker build -t core-simulator ./core-simulator
docker run -p 9090:9090 core-simulator
```

### Docker Compose

The simulator is included in the project's `docker-compose.yml` and starts automatically with `docker compose up`.

## Environment Variables

| Variable                 | Default   | Description                                                |
| ------------------------ | --------- | ---------------------------------------------------------- |
| `PORT`                   | `9090`    | Server listen port                                         |
| `SIMULATED_LATENCY_MS`  | `50`      | Base latency added to every request (ms)                   |
| `LATENCY_JITTER_MS`     | `30`      | Random jitter added on top of base latency (ms)            |
| `ERROR_RATE`             | `0`       | Fraction of requests that return random errors (0.0–1.0)   |
| `CORE_BUSY_RATE`         | `0`       | Fraction of requests that return 503 Core Busy (0.0–1.0)   |
| `MTLS_ENABLED`           | `false`   | Enable mutual TLS mode                                     |
| `MTLS_CERT_DIR`          | `/certs`  | Directory containing `ca.crt`, `server.crt`, `server.key`  |
| `MTLS_REJECT_UNAUTHORIZED` | `true` | Reject clients without a valid certificate                 |

Example — simulate a flaky core system:

```bash
ERROR_RATE=0.05 CORE_BUSY_RATE=0.02 SIMULATED_LATENCY_MS=200 npm start
```

## mTLS Mode

To test mutual TLS locally:

```bash
# Generate self-signed certs (example)
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt \
  -days 365 -nodes -subj "/CN=localhost"
cp certs/server.crt certs/ca.crt

# Run with mTLS
MTLS_ENABLED=true MTLS_CERT_DIR=./certs npm start

# Docker
docker run -p 9090:9090 \
  -v $(pwd)/certs:/certs \
  -e MTLS_ENABLED=true \
  core-simulator
```

## Key Endpoints

### Health Check

```
GET /health
```

Returns server status, uptime, and current configuration (latency, error rate, mTLS state).

### Admin

```
POST /admin/config   — Update latency, error rate, and busy rate at runtime
POST /admin/reset    — Clear transaction caches and reset to defaults
```

### CU*Answers

```
GET  /api/credit_unions/:cuId/available
GET  /api/credit_unions/:cuId/membership/members/:memberId
GET  /api/credit_unions/:cuId/membership/members/:memberId/accounts
GET  /api/credit_unions/:cuId/membership/members/:memberId/accounts/:accountId/transactions
POST /api/credit_unions/:cuId/membership/members/:memberId/trackers
```

### Fineract

```
GET  /fineract-provider/api/v1/savingsaccounts
GET  /fineract-provider/api/v1/savingsaccounts/:id/transactions
GET  /fineract-provider/api/v1/loans
GET  /fineract-provider/api/v1/loans/:id
GET  /fineract-provider/api/v1/loans/:id/transactions
GET  /fineract-provider/api/v1/clients
GET  /fineract-provider/api/v1/clients/:clientId/accounts
GET  /fineract-provider/api/v1/groups
GET  /fineract-provider/api/v1/centers
POST /fineract-provider/api/v1/accounttransfers
GET  /fineract-provider/api/v1/authentication
```

### UK Payments

```
POST /uk/faster-payments/send
POST /uk/bacs/send
POST /uk/chaps/send
GET  /uk/payments/:paymentId
POST /uk/confirmation-of-payee
```

### SEPA

```
POST /sepa/sct/send
POST /sepa/sct-inst/send
POST /sepa/sdd/mandate
POST /sepa/sdd/collect
GET  /sepa/payments/:paymentId
```

### PIX (Brazil)

```
GET  /pix/dict/:keyType/:key
POST /pix/payment
POST /pix/qrcode
GET  /pix/payment/:endToEndId
```

### SPEI (Mexico)

```
POST /spei/transfer
GET  /spei/cep/:trackingId
GET  /spei/transfer/:trackingId
```

## Extending

To add new endpoints, edit `server.js` and add a route handler in the appropriate section. The simulator uses plain Express.js with no build step. All mock data is defined inline — add new members, accounts, or response shapes directly in the data objects at the top of the file.
