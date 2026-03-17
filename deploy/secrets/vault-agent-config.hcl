# =============================================================================
# HashiCorp Vault Agent Configuration
# =============================================================================
# Vault Agent runs as a sidecar that auto-fetches and renews secrets,
# writing them as environment variables or files for the application.
#
# Usage:
#   1. Set VAULT_ADDR and VAULT_ROLE environment variables
#   2. Run: vault agent -config=deploy/secrets/vault-agent-config.hcl
#   3. Agent writes secrets to /tmp/secrets/.env which the app reads at startup
#
# Prerequisite: Store secrets in Vault at secret/data/banking-platform/<env>
#   vault kv put secret/banking-platform/production \
#     VITE_SUPABASE_URL=https://xxx.supabase.co \
#     VITE_SUPABASE_ANON_KEY=eyJ... \
#     FINERACT_PASSWORD=... \
#     PLAID_SECRET=...

pid_file = "/tmp/vault-agent.pid"

vault {
  address = "https://vault.example.com:8200"
  retry {
    num_retries = 5
  }
}

# --- Auth Method: Kubernetes (for containerized deploys) ---
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "banking-platform"
    }
  }

  sink "file" {
    config = {
      path = "/tmp/vault-token"
    }
  }
}

# --- Template: Generate .env file from Vault secrets ---
template {
  source      = "deploy/secrets/vault-env.ctmpl"
  destination = "/tmp/secrets/.env"
  perms       = 0600
  error_on_missing_key = true

  # Re-fetch secrets every 5 minutes
  wait {
    min = "5s"
    max = "30s"
  }
}

# --- Template: Generate JSON config for edge functions ---
template {
  source      = "deploy/secrets/vault-supabase.ctmpl"
  destination = "/tmp/secrets/supabase-secrets.json"
  perms       = 0600
}
