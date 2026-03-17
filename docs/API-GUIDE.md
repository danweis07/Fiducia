# API Guide

The Fiducia backend uses an RPC-style gateway through a single Supabase Edge Function. All requests go to one endpoint with an `action` and `params`.

## Endpoint

```
POST /functions/v1/gateway
```

## Authentication

All requests require a Supabase JWT in the `Authorization` header:

```bash
# First, sign in to get a JWT
TOKEN=$(curl -s -X POST \
  'https://your-project.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@fiducia.dev","password":"demo1234"}' \
  | jq -r '.access_token')
```

## Request Format

Every request sends a JSON body with `action` (string) and `params` (object):

```json
{
  "action": "module.method",
  "params": { ... }
}
```

## Examples

### List Accounts

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gateway \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accounts.list",
    "params": { "limit": 10, "offset": 0 }
  }'
```

**Response:**

```json
{
  "data": [
    {
      "id": "acc_01",
      "name": "Primary Checking",
      "type": "checking",
      "balance": 5432.1,
      "currency": "USD",
      "status": "active"
    }
  ],
  "total": 1
}
```

### Get Single Account

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gateway \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accounts.get",
    "params": { "id": "acc_01" }
  }'
```

### Transfer Funds

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gateway \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payments.transfer",
    "params": {
      "from_account_id": "acc_01",
      "to_account_id": "acc_02",
      "amount": 100.00,
      "currency": "USD",
      "memo": "Rent payment"
    }
  }'
```

**Response:**

```json
{
  "data": {
    "id": "txn_abc123",
    "status": "completed",
    "amount": 100.0,
    "currency": "USD",
    "from_account_id": "acc_01",
    "to_account_id": "acc_02",
    "created_at": "2026-03-17T10:30:00Z"
  }
}
```

### Bill Pay

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gateway \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payments.billpay",
    "params": {
      "from_account_id": "acc_01",
      "payee_name": "Electric Company",
      "amount": 85.50,
      "scheduled_date": "2026-03-20"
    }
  }'
```

### Get Financial Statements

```bash
curl -X POST https://your-project.supabase.co/functions/v1/gateway \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "financial.statements",
    "params": {
      "account_id": "acc_01",
      "from": "2026-01-01",
      "to": "2026-03-17"
    }
  }'
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Account does not have sufficient funds for this transfer",
    "status": 400
  }
}
```

Common error codes:

| Code                 | HTTP Status | Meaning                                              |
| -------------------- | ----------- | ---------------------------------------------------- |
| `AUTH_REQUIRED`      | 401         | Missing or expired JWT                               |
| `FORBIDDEN`          | 403         | User lacks permission for this action                |
| `NOT_FOUND`          | 404         | Resource does not exist or belongs to another tenant |
| `VALIDATION_ERROR`   | 400         | Invalid params (details in message)                  |
| `INSUFFICIENT_FUNDS` | 400         | Not enough balance for transfer                      |
| `RATE_LIMITED`       | 429         | Too many requests                                    |
| `INTERNAL_ERROR`     | 500         | Server error                                         |

## Available Actions

Actions are organized by module. See the [OpenAPI spec](../openapi.yaml) for the full reference.

| Module          | Actions                                                 |
| --------------- | ------------------------------------------------------- |
| `accounts`      | `accounts.list`, `accounts.get`, `accounts.create`      |
| `payments`      | `payments.transfer`, `payments.billpay`, `payments.p2p` |
| `financial`     | `financial.statements`, `financial.analytics`           |
| `compliance`    | `compliance.kyc`, `compliance.audit`                    |
| `international` | `international.wire`, `international.fx`                |
| `cards`         | `cards.list`, `cards.activate`, `cards.freeze`          |
| `loans`         | `loans.list`, `loans.apply`, `loans.schedule`           |
| `member`        | `member.profile`, `member.preferences`                  |
| `messaging`     | `messaging.send`, `messaging.inbox`                     |
| `admin`         | `admin.tenants`, `admin.users`, `admin.config`          |
| `ai`            | `ai.insights`, `ai.recommend`, `ai.search`              |

## Testing with the Core Simulator

When running with Docker Compose, the core simulator (port 9090) handles core banking actions. You can inject errors:

```bash
# Add 500ms latency and 30% failure rate
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 500, "coreBusyRate": 0.3}'

# Reset to defaults
curl -X POST http://localhost:9090/admin/config \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 0, "coreBusyRate": 0}'
```
