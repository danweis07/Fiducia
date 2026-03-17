/**
 * k6 Soak Test
 * Sustained moderate load for 30 minutes
 * Detects memory leaks, connection pool exhaustion, and stability issues
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '2m', target: 30 },    // Ramp up
    { duration: '26m', target: 30 },   // Sustained load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.02'],     // Tight failure rate for stability
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'stable response time': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 3 + 2); // 2-5s think time (realistic)
}
