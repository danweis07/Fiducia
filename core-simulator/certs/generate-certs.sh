#!/bin/sh
# =============================================================================
# Generate self-signed mTLS certificates for local development
#
# Creates a CA, server cert, and client cert — everything needed for
# mutual TLS between the app and the Core Banking Simulator.
#
# Usage:
#   ./generate-certs.sh          # Generates into ./generated/
#   ./generate-certs.sh /output  # Generates into /output/
#
# Output:
#   ca.crt            — Certificate Authority (trust anchor)
#   ca.key            — CA private key
#   server.crt        — Core Simulator server certificate
#   server.key        — Core Simulator server private key
#   client.crt        — Client certificate (for app → core-sim calls)
#   client.key        — Client private key
# =============================================================================
set -e

OUT_DIR="${1:-./generated}"
mkdir -p "$OUT_DIR"

DAYS=825
SUBJ_CA="/C=US/ST=Dev/L=Local/O=Fiducia Dev CA/CN=fiducia-dev-ca"
SUBJ_SERVER="/C=US/ST=Dev/L=Local/O=Fiducia Core Sim/CN=core-sim"
SUBJ_CLIENT="/C=US/ST=Dev/L=Local/O=Fiducia App/CN=fiducia-app"

echo "==> Generating CA..."
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$OUT_DIR/ca.key" \
  -out "$OUT_DIR/ca.crt" \
  -days "$DAYS" \
  -subj "$SUBJ_CA" 2>/dev/null

echo "==> Generating server certificate..."
openssl req -newkey rsa:2048 -nodes \
  -keyout "$OUT_DIR/server.key" \
  -out "$OUT_DIR/server.csr" \
  -subj "$SUBJ_SERVER" 2>/dev/null

# SAN extension so the cert is valid for both "core-sim" (Docker DNS) and localhost
cat > "$OUT_DIR/server-ext.cnf" <<EOF
subjectAltName=DNS:core-sim,DNS:localhost,IP:127.0.0.1
EOF

openssl x509 -req \
  -in "$OUT_DIR/server.csr" \
  -CA "$OUT_DIR/ca.crt" -CAkey "$OUT_DIR/ca.key" -CAcreateserial \
  -out "$OUT_DIR/server.crt" \
  -days "$DAYS" \
  -extfile "$OUT_DIR/server-ext.cnf" 2>/dev/null

echo "==> Generating client certificate..."
openssl req -newkey rsa:2048 -nodes \
  -keyout "$OUT_DIR/client.key" \
  -out "$OUT_DIR/client.csr" \
  -subj "$SUBJ_CLIENT" 2>/dev/null

openssl x509 -req \
  -in "$OUT_DIR/client.csr" \
  -CA "$OUT_DIR/ca.crt" -CAkey "$OUT_DIR/ca.key" -CAcreateserial \
  -out "$OUT_DIR/client.crt" \
  -days "$DAYS" 2>/dev/null

# Clean up intermediates
rm -f "$OUT_DIR"/*.csr "$OUT_DIR"/*.cnf "$OUT_DIR"/*.srl

echo "==> mTLS certificates generated in $OUT_DIR/"
echo "    ca.crt / ca.key"
echo "    server.crt / server.key"
echo "    client.crt / client.key"
