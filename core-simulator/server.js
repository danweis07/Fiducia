/**
 * Core Banking Simulator
 *
 * A sidecar container that mimics CU*Answers (It's Me 247 API), Symitar
 * (SymXchange), and Fineract REST endpoints. Returns realistic mock data
 * with configurable latency, error injection, and rate limiting.
 *
 * Plugins are dynamically loaded from the plugins/ directory. Control which
 * simulators are active via the SIMULATORS env var (default: all).
 *
 * Environment variables:
 *   PORT                    — Server port (default: 9090)
 *   SIMULATED_LATENCY_MS    — Base latency per request (default: 50)
 *   LATENCY_JITTER_MS       — Random jitter added to latency (default: 30)
 *   ERROR_RATE              — Fraction of requests that return errors (default: 0)
 *   CORE_BUSY_RATE          — Fraction of requests that return 503 (default: 0)
 *   SIMULATORS              — Comma-separated list of plugins to load (default: cuanswers,symitar,fineract)
 *   MTLS_ENABLED            — Enable mutual TLS (default: false)
 *   MTLS_CERT_DIR           — Directory containing ca.crt, server.crt, server.key (default: /certs)
 *   MTLS_REJECT_UNAUTHORIZED — Reject clients without valid cert (default: true)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '9090', 10);
const BASE_LATENCY = parseInt(process.env.SIMULATED_LATENCY_MS || '50', 10);
const JITTER = parseInt(process.env.LATENCY_JITTER_MS || '30', 10);
const ERROR_RATE = parseFloat(process.env.ERROR_RATE || '0');
const CORE_BUSY_RATE = parseFloat(process.env.CORE_BUSY_RATE || '0');
const SIMULATORS = (process.env.SIMULATORS || 'cuanswers,symitar,fineract').split(',');

// =============================================================================
// MIDDLEWARE — latency simulation + error injection
// =============================================================================

async function simulateLatency(_req, _res, next) {
  const delay = BASE_LATENCY + Math.floor(Math.random() * JITTER);
  await new Promise((r) => setTimeout(r, delay));
  next();
}

function injectErrors(req, res, next) {
  if (req.path === '/health') return next();

  if (Math.random() < CORE_BUSY_RATE) {
    return res.status(503).json({
      error: 'Core Busy',
      message: 'The core banking system is temporarily unavailable. Please retry.',
      code: 'CORE_BUSY',
      retryAfterMs: 2000,
    });
  }

  if (Math.random() < ERROR_RATE) {
    const errors = [
      { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred in the core system' },
      { status: 408, code: 'TIMEOUT', message: 'Core request timed out after 30000ms' },
      { status: 502, code: 'BAD_GATEWAY', message: 'Failed to reach upstream core processor' },
      { status: 429, code: 'RATE_LIMITED', message: 'Too many requests — throttled by core' },
    ];
    const err = errors[Math.floor(Math.random() * errors.length)];
    return res.status(err.status).json({ error: err.code, message: err.message });
  }

  next();
}

app.use(simulateLatency);
app.use(injectErrors);

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// SHARED DATA
// =============================================================================

const data = require('./lib/demo-data');

// =============================================================================
// HEALTH ENDPOINT
// =============================================================================

const MTLS_ENABLED = process.env.MTLS_ENABLED === 'true';
const MTLS_CERT_DIR = process.env.MTLS_CERT_DIR || '/certs';
const MTLS_REJECT_UNAUTHORIZED = process.env.MTLS_REJECT_UNAUTHORIZED !== 'false';

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    simulator: 'fiducia-core-simulator',
    version: '1.0.0',
    uptime: process.uptime(),
    config: {
      latencyMs: BASE_LATENCY,
      jitterMs: JITTER,
      errorRate: ERROR_RATE,
      coreBusyRate: CORE_BUSY_RATE,
    },
    mtls: {
      enabled: MTLS_ENABLED,
      clientAuthenticated: req.client && req.client.authorized === true,
    },
    simulators: SIMULATORS,
  });
});

// =============================================================================
// ADMIN / CONTROL ENDPOINTS
// =============================================================================

app.post('/admin/config', (req, res) => {
  if (req.body.latencyMs !== undefined) process.env.SIMULATED_LATENCY_MS = String(req.body.latencyMs);
  if (req.body.jitterMs !== undefined) process.env.LATENCY_JITTER_MS = String(req.body.jitterMs);
  if (req.body.errorRate !== undefined) process.env.ERROR_RATE = String(req.body.errorRate);
  if (req.body.coreBusyRate !== undefined) process.env.CORE_BUSY_RATE = String(req.body.coreBusyRate);

  res.json({
    message: 'Configuration updated',
    config: {
      latencyMs: process.env.SIMULATED_LATENCY_MS,
      jitterMs: process.env.LATENCY_JITTER_MS,
      errorRate: process.env.ERROR_RATE,
      coreBusyRate: process.env.CORE_BUSY_RATE,
    },
  });
});

app.post('/admin/reset', (_req, res) => {
  Object.keys(data.txnCache).forEach((k) => delete data.txnCache[k]);
  res.json({ message: 'Transaction cache cleared' });
});

// =============================================================================
// LOAD PLUGINS
// =============================================================================

const pluginsDir = path.join(__dirname, 'plugins');

console.log(`Loading simulators: ${SIMULATORS.join(', ')}`);

for (const name of SIMULATORS) {
  const pluginPath = path.join(pluginsDir, `${name.trim()}.js`);
  if (fs.existsSync(pluginPath)) {
    const register = require(pluginPath);
    register(app, data);
  } else {
    console.warn(`  [warn] Plugin not found: ${pluginPath}`);
  }
}

// =============================================================================
// START
// =============================================================================

function startServer() {
  const protocol = MTLS_ENABLED ? 'https' : 'http';

  const banner = `
╔══════════════════════════════════════════════════════════════╗
║              Fiducia Core Banking Simulator                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  CU*Answers API:  ${protocol}://localhost:${PORT}/api/credit_unions/  ║
║  SymXchange API:  ${protocol}://localhost:${PORT}/symxchange/          ║
║  Fineract/Mifos:  ${protocol}://localhost:${PORT}/fineract-provider/   ║
║  Health:          ${protocol}://localhost:${PORT}/health               ║
║  Admin:           POST ${protocol}://localhost:${PORT}/admin/config    ║
║                                                              ║
║  Latency: ${BASE_LATENCY}ms + ${JITTER}ms jitter                              ║
║  Error rate: ${(ERROR_RATE * 100).toFixed(1)}%  |  Core busy rate: ${(CORE_BUSY_RATE * 100).toFixed(1)}%          ║
║  mTLS: ${MTLS_ENABLED ? 'ENABLED (reject unauthorized: ' + MTLS_REJECT_UNAUTHORIZED + ')' : 'disabled'}                                          ║
║  Simulators: ${SIMULATORS.join(', ')}                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

  if (MTLS_ENABLED) {
    const https = require('https');

    const caCert = path.join(MTLS_CERT_DIR, 'ca.crt');
    const serverCert = path.join(MTLS_CERT_DIR, 'server.crt');
    const serverKey = path.join(MTLS_CERT_DIR, 'server.key');

    // Validate that cert files exist before starting
    for (const f of [caCert, serverCert, serverKey]) {
      if (!fs.existsSync(f)) {
        console.error('mTLS error: required certificate file not found');
        console.error('Generate certs with: ./certs/generate-certs.sh /certs');
        process.exit(1);
      }
    }

    const tlsOptions = {
      ca: fs.readFileSync(caCert),
      cert: fs.readFileSync(serverCert),
      key: fs.readFileSync(serverKey),
      requestCert: true,
      rejectUnauthorized: MTLS_REJECT_UNAUTHORIZED,
    };

    https.createServer(tlsOptions, app).listen(PORT, '0.0.0.0', () => {
      console.log(banner);
    });
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(banner);
    });
  }
}

startServer();
