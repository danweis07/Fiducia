import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const gatewayLatency = new Trend('gateway_latency', true);

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '3m', target: 50 },   // Steady state
    { duration: '2m', target: 100 },  // Peak load
    { duration: '1m', target: 50 },   // Scale down
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.05'],
    gateway_latency: ['p(95)<1500'],
  },
  ext: {
    loadimpact: {
      projectID: 0,
      name: 'Banking Platform Load Test',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:54321/functions/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${AUTH_TOKEN}`,
};

function gateway(action, params = {}) {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/gateway`,
    JSON.stringify({ action, params }),
    { headers }
  );
  gatewayLatency.add(Date.now() - start);
  return res;
}

export default function () {
  // Simulate realistic user journey
  group('Dashboard Load', () => {
    const accounts = gateway('accounts.list', { limit: 10 });
    check(accounts, {
      'accounts listed': (r) => r.status === 200,
    });
    errorRate.add(accounts.status !== 200);

    const summary = gateway('accounts.summary');
    check(summary, {
      'summary loaded': (r) => r.status === 200,
    });
    errorRate.add(summary.status !== 200);

    const notifications = gateway('notifications.unreadCount');
    check(notifications, {
      'notifications counted': (r) => r.status === 200,
    });
    errorRate.add(notifications.status !== 200);
  });

  sleep(1);

  group('Transaction History', () => {
    const txns = gateway('transactions.list', { limit: 25, offset: 0 });
    check(txns, {
      'transactions loaded': (r) => r.status === 200,
      'has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(txns.status !== 200);
  });

  sleep(0.5);

  group('Financial Insights', () => {
    const spending = gateway('financial.spending', { period: 'month' });
    check(spending, {
      'spending loaded': (r) => r.status === 200,
    });
    errorRate.add(spending.status !== 200);

    const trends = gateway('financial.trends', { months: 6 });
    check(trends, {
      'trends loaded': (r) => r.status === 200,
    });
    errorRate.add(trends.status !== 200);
  });

  sleep(0.5);

  group('Cards & Offers', () => {
    const cards = gateway('cards.list');
    check(cards, {
      'cards loaded': (r) => r.status === 200,
    });
    errorRate.add(cards.status !== 200);

    const offers = gateway('offers.list', { limit: 10 });
    check(offers, {
      'offers loaded': (r) => r.status === 200,
    });
    errorRate.add(offers.status !== 200);
  });

  sleep(1);

  // Occasional write operations (lower frequency)
  if (Math.random() < 0.1) {
    group('Transfer (10% of users)', () => {
      const transfer = gateway('transfers.create', {
        fromAccountId: 'test-checking-001',
        toAccountId: 'test-savings-001',
        amountCents: 1000,
        memo: 'k6 load test',
      });
      check(transfer, {
        'transfer created': (r) => r.status === 200 || r.status === 201,
      });
      errorRate.add(transfer.status !== 200 && transfer.status !== 201);
    });
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-tests/results/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const metrics = data.metrics;
  return `
=== Banking Platform Load Test Results ===

Requests:     ${metrics.http_reqs?.values?.count || 0}
Duration:     ${data.state?.testRunDurationMs ? (data.state.testRunDurationMs / 1000).toFixed(1) + 's' : 'N/A'}
VUs (peak):   ${metrics.vus_max?.values?.value || 0}

HTTP Req Duration:
  avg: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(0)}ms
  p95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
  p99: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(0)}ms

Gateway Latency:
  avg: ${(metrics.gateway_latency?.values?.avg || 0).toFixed(0)}ms
  p95: ${(metrics.gateway_latency?.values?.['p(95)'] || 0).toFixed(0)}ms

Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%

Checks Passed: ${((metrics.checks?.values?.passes || 0) / Math.max((metrics.checks?.values?.passes || 0) + (metrics.checks?.values?.fails || 0), 1) * 100).toFixed(1)}%
`;
}
