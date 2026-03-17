# Core Banking Simulator
# Mimics CU*Answers / Symitar / Fineract REST endpoints for local dev & CI
#
# mTLS mode: mount certs to /certs and set MTLS_ENABLED=true
#   docker run -v ./certs/generated:/certs -e MTLS_ENABLED=true core-sim
FROM node:20-alpine

# OpenSSL is included in Alpine base — needed for cert generation
RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .

# Default cert directory (mount your certs here for mTLS)
RUN mkdir -p /certs
VOLUME /certs

EXPOSE 9090

# Health check works for both HTTP and HTTPS modes.
# When MTLS_ENABLED=true, we use --no-check-certificate to skip TLS
# verification in the healthcheck probe (the probe itself doesn't need mTLS).
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD if [ "$MTLS_ENABLED" = "true" ]; then \
        wget --no-verbose --tries=1 --spider --no-check-certificate https://localhost:9090/health || exit 1; \
      else \
        wget --no-verbose --tries=1 --spider http://localhost:9090/health || exit 1; \
      fi

CMD ["node", "server.js"]
