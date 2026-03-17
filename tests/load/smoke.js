/**
 * k6 Smoke Test
 * Quick sanity check — 1 virtual user, 30 seconds
 * Verifies the application is up and responding correctly
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function () {
  // Homepage load
  const home = http.get(`${BASE_URL}/`);
  check(home, {
    'homepage returns 200': (r) => r.status === 200,
    'homepage loads under 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
