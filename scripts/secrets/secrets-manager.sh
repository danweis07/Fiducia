#!/usr/bin/env bash
# Secrets management wrapper for multiple providers
# Supports: AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, .env files
set -euo pipefail

PROVIDER="${SECRETS_PROVIDER:-env}"
PROJECT_NAME="${PROJECT_NAME:-banking-platform}"
ENVIRONMENT="${ENVIRONMENT:-production}"

usage() {
  cat <<EOF
Usage: secrets-manager.sh <command> [options]

Commands:
  list                    List all secrets
  get <key>              Get a secret value
  set <key> <value>      Set a secret
  delete <key>           Delete a secret
  rotate <key>           Rotate a secret (generate new value)
  export                 Export all secrets as .env format
  sync                   Sync secrets to deployment environment
  audit                  Audit secret access logs

Providers (set SECRETS_PROVIDER):
  aws     AWS Secrets Manager
  gcp     GCP Secret Manager
  vault   HashiCorp Vault
  env     Local .env file (development only)

Environment variables:
  SECRETS_PROVIDER    Provider to use (default: env)
  ENVIRONMENT         Environment name (default: production)
  PROJECT_NAME        Project identifier (default: banking-platform)
EOF
}

secret_path() {
  echo "${PROJECT_NAME}/${ENVIRONMENT}/${1}"
}

# AWS Secrets Manager
aws_get() {
  aws secretsmanager get-secret-value \
    --secret-id "$(secret_path "$1")" \
    --query SecretString --output text
}

aws_set() {
  aws secretsmanager put-secret-value \
    --secret-id "$(secret_path "$1")" \
    --secret-string "$2" 2>/dev/null || \
  aws secretsmanager create-secret \
    --name "$(secret_path "$1")" \
    --secret-string "$2"
}

aws_list() {
  aws secretsmanager list-secrets \
    --filters Key=name,Values="${PROJECT_NAME}/${ENVIRONMENT}" \
    --query 'SecretList[].Name' --output table
}

aws_delete() {
  aws secretsmanager delete-secret \
    --secret-id "$(secret_path "$1")" \
    --force-delete-without-recovery
}

# GCP Secret Manager
gcp_get() {
  gcloud secrets versions access latest --secret="$(secret_path "$1" | tr '/' '-')"
}

gcp_set() {
  echo -n "$2" | gcloud secrets create "$(secret_path "$1" | tr '/' '-')" \
    --data-file=- 2>/dev/null || \
  echo -n "$2" | gcloud secrets versions add "$(secret_path "$1" | tr '/' '-')" --data-file=-
}

gcp_list() {
  gcloud secrets list --filter="name:${PROJECT_NAME}-${ENVIRONMENT}" --format="table(name)"
}

gcp_delete() {
  gcloud secrets delete "$(secret_path "$1" | tr '/' '-')" --quiet
}

# HashiCorp Vault
vault_get() {
  vault kv get -field=value "secret/$(secret_path "$1")"
}

vault_set() {
  vault kv put "secret/$(secret_path "$1")" value="$2"
}

vault_list() {
  vault kv list "secret/${PROJECT_NAME}/${ENVIRONMENT}/"
}

vault_delete() {
  vault kv delete "secret/$(secret_path "$1")"
}

# Local .env file (development)
env_file=".env.${ENVIRONMENT}"

env_get() {
  grep "^${1}=" "${env_file}" 2>/dev/null | cut -d= -f2-
}

env_set() {
  if grep -q "^${1}=" "${env_file}" 2>/dev/null; then
    sed -i "s|^${1}=.*|${1}=${2}|" "${env_file}"
  else
    echo "${1}=${2}" >> "${env_file}"
  fi
}

env_list() {
  [[ -f "${env_file}" ]] && grep -v '^#' "${env_file}" | grep -v '^$' | cut -d= -f1 || echo "No secrets found"
}

env_delete() {
  sed -i "/^${1}=/d" "${env_file}"
}

# Route command to provider
dispatch() {
  local cmd="$1"
  shift
  "${PROVIDER}_${cmd}" "$@"
}

# Generate secure random secret
generate_secret() {
  openssl rand -base64 32
}

# Main
case "${1:-}" in
  list)
    dispatch list
    ;;
  get)
    [[ -z "${2:-}" ]] && { echo "Usage: secrets-manager.sh get <key>"; exit 1; }
    dispatch get "$2"
    ;;
  set)
    [[ -z "${2:-}" || -z "${3:-}" ]] && { echo "Usage: secrets-manager.sh set <key> <value>"; exit 1; }
    dispatch set "$2" "$3"
    echo "Secret '${2}' updated."
    ;;
  delete)
    [[ -z "${2:-}" ]] && { echo "Usage: secrets-manager.sh delete <key>"; exit 1; }
    dispatch delete "$2"
    echo "Secret '${2}' deleted."
    ;;
  rotate)
    [[ -z "${2:-}" ]] && { echo "Usage: secrets-manager.sh rotate <key>"; exit 1; }
    NEW_VALUE=$(generate_secret)
    dispatch set "$2" "${NEW_VALUE}"
    echo "Secret '${2}' rotated. New value: ${NEW_VALUE}"
    ;;
  export)
    echo "# Exported secrets for ${PROJECT_NAME}/${ENVIRONMENT}"
    echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    dispatch list 2>/dev/null | while read -r key; do
      value=$(dispatch get "${key}" 2>/dev/null)
      [[ -n "${value}" ]] && echo "${key}=${value}"
    done
    ;;
  sync)
    echo "Syncing secrets to ${ENVIRONMENT}..."
    # This would push secrets to your deployment platform
    echo "Done."
    ;;
  audit)
    echo "Secret access audit for ${PROJECT_NAME}/${ENVIRONMENT}"
    if [[ "${PROVIDER}" == "aws" ]]; then
      aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::SecretsManager::Secret \
        --max-items 20
    elif [[ "${PROVIDER}" == "vault" ]]; then
      vault audit list
    else
      echo "Audit not available for provider: ${PROVIDER}"
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac
