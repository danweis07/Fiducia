# Helm Chart — Banking Platform

Kubernetes Helm chart for deploying the Fiducia digital banking platform.

## Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3
- [cert-manager](https://cert-manager.io/) (for automated TLS certificates)
- NGINX Ingress Controller

## Quick Start

```bash
# Install with default values
helm install banking-platform ./helm/banking-platform

# Install with custom values
helm install banking-platform ./helm/banking-platform \
  --set ingress.hosts[0].host=banking.yourdomain.com \
  --set env.VITE_SUPABASE_URL=https://your-project.supabase.co \
  --set env.VITE_SUPABASE_ANON_KEY=your-anon-key

# Upgrade an existing release
helm upgrade banking-platform ./helm/banking-platform -f my-values.yaml
```

## Configuration

Key parameters in `values.yaml`:

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| `replicaCount` | `2` | Number of pod replicas |
| `image.repository` | `banking-platform` | Container image name |
| `image.tag` | `""` (appVersion) | Image tag override |
| `service.type` | `ClusterIP` | Kubernetes service type |
| `service.port` | `80` | Service port |
| `service.targetPort` | `8080` | Container port |
| `ingress.enabled` | `true` | Enable ingress resource |
| `ingress.className` | `nginx` | Ingress class |
| `ingress.hosts[0].host` | `banking.example.com` | Hostname (must customize) |
| `resources.requests.cpu` | `100m` | CPU request |
| `resources.requests.memory` | `128Mi` | Memory request |
| `resources.limits.cpu` | `500m` | CPU limit |
| `resources.limits.memory` | `256Mi` | Memory limit |
| `autoscaling.enabled` | `true` | Enable HPA |
| `autoscaling.minReplicas` | `2` | Minimum replicas |
| `autoscaling.maxReplicas` | `10` | Maximum replicas |
| `autoscaling.targetCPUUtilizationPercentage` | `70` | CPU scale threshold |
| `autoscaling.targetMemoryUtilizationPercentage` | `80` | Memory scale threshold |
| `networkPolicy.enabled` | `true` | Enable network policy |
| `env.VITE_SUPABASE_URL` | `""` | Supabase project URL |
| `env.VITE_SUPABASE_ANON_KEY` | `""` | Supabase anonymous key |
| `secrets.supabaseServiceKey` | `""` | Supabase service role key |
| `secrets.sentryDsn` | `""` | Sentry DSN for error tracking |

## TLS / Ingress

The chart uses cert-manager with a `letsencrypt-prod` ClusterIssuer by default. To use it:

1. Install cert-manager in your cluster
2. Create a `ClusterIssuer` named `letsencrypt-prod`
3. Set your hostname in `ingress.hosts[0].host`

TLS is configured automatically via the `cert-manager.io/cluster-issuer` annotation. The certificate is stored in the `banking-tls` secret.

## Security

The chart enforces security best practices by default:

- **Pod security context**: `runAsNonRoot: true`, `runAsUser: 1000`, `fsGroup: 1000`
- **Container security**: `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, drops all Linux capabilities
- **Network policy**: Only allows ingress from the `ingress-nginx` namespace on port 8080
- **Pod anti-affinity**: Spreads replicas across nodes for high availability

## Connecting to Supabase

Set the Supabase URL and keys either via `values.yaml` or `--set` flags:

```bash
helm install banking-platform ./helm/banking-platform \
  --set env.VITE_SUPABASE_URL=https://your-project.supabase.co \
  --set env.VITE_SUPABASE_ANON_KEY=your-anon-key \
  --set secrets.supabaseServiceKey=your-service-key
```

Secrets are stored in a Kubernetes Secret resource created by the chart.

## Prometheus Metrics

Pods are annotated with `prometheus.io/scrape: "true"` and `prometheus.io/port: "9090"` for automatic discovery by Prometheus.
