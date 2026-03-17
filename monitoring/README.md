# Monitoring Stack

Observability stack for the Fiducia banking platform: Prometheus for metrics collection, Grafana for dashboards, and AlertManager for alert routing.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus     │───▶│    Grafana       │    │  AlertManager   │
│   :9090          │    │    :3000         │    │    :9093         │
│                  │◀───│                  │    │                  │
│  Scrapes targets │    │  Visualizes data │    │  Routes alerts   │
│  every 15s       │───▶│                  │    │                  │
│  30-day retention│    │                  │    │                  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │
        ▼ scrapes
┌──────────────────────────────────────┐
│  banking-platform  :80               │
│  supabase-gateway  :54321            │
│  nginx-exporter    :9113             │
│  postgres-exporter :9187             │
└──────────────────────────────────────┘
```

## Quick Start

```bash
# From the repo root
docker compose -f monitoring/docker-compose.monitoring.yml up
```

Or, if the main `docker-compose.yml` includes a monitoring profile:

```bash
docker compose --profile monitoring up
```

## Access Points

| Service      | URL                      | Notes                              |
| ------------ | ------------------------ | ---------------------------------- |
| Grafana      | http://localhost:3000    | Default password: value of `GRAFANA_PASSWORD` env var (defaults to `admin`) |
| Prometheus   | http://localhost:9090    | Query UI and target status         |
| AlertManager | http://localhost:9093    | Alert status and silences          |

## Prometheus

**Version**: 2.51.0

**Scrape targets** (configured in `prometheus/prometheus.yml`):

| Job Name           | Target                     | Metrics Path |
| ------------------ | -------------------------- | ------------ |
| `banking-platform` | `banking-platform:80`      | `/metrics`   |
| `supabase-gateway` | `supabase-gateway:54321`   | `/metrics`   |
| `nginx`            | `nginx-exporter:9113`      | default      |
| `postgres`         | `postgres-exporter:9187`   | default      |

**Alert rules** are loaded from `prometheus/alerts/*.yml`.

**Data retention**: 30 days.

## Grafana

**Version**: 10.4.0

**Datasources** (auto-provisioned via `grafana/provisioning/datasources.yml`):
- **Prometheus** (default) — connected to `http://prometheus:9090`
- **PostgreSQL** — direct database queries (requires `POSTGRES_PASSWORD`)

**Pre-built dashboards**:
- `grafana/dashboards/banking-overview.json` — banking platform overview

### Adding Custom Dashboards

1. Create a JSON dashboard file in `grafana/dashboards/`
2. Restart Grafana — dashboards in this directory are auto-loaded
3. Alternatively, create dashboards in the Grafana UI and export as JSON

## AlertManager

**Version**: 0.27.0

Configured in `alertmanager/alertmanager.yml`:

- **Routing**: Alerts grouped by `alertname` and `severity`
- **Default receiver**: webhook at `http://localhost:9095/webhook`
- **Critical alerts**: Separate receiver with 1-hour repeat interval

### Production Alert Receivers

The `alertmanager.yml` includes commented-out templates for:
- **Slack**: Configure `SLACK_WEBHOOK_URL` and target channel
- **Email**: Configure SMTP sender and recipient addresses

Uncomment and configure the appropriate section for your production environment.

## Customization

### Adding a Prometheus Scrape Target

Edit `prometheus/prometheus.yml` and add a new job under `scrape_configs`:

```yaml
- job_name: "your-service"
  static_configs:
    - targets: ["your-service:port"]
```

### Adding Alert Rules

Create a new `.yml` file in `prometheus/alerts/`:

```yaml
groups:
  - name: your-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          description: "Error rate above 10% for 5 minutes"
```
