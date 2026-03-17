/**
 * k6 Stress Test
 * Pushes the system to find breaking points — ramp to 200 VUs
 * Identifies performance degradation and failure thresholds
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Below normal load
    { duration: '2m', target: 100 },   // Normal load
    { duration: '2m', target: 150 },   // Above normal
    { duration: '2m', target: 200 },   // Breaking point?
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // Relaxed threshold for stress
    http_req_failed: ['rate<0.15'],     // Allow higher failure under stress
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is not 5xx': (r) => r.status < 500,
    'response time under 5s': (r) => r.timings.duration < 5000,
  });

  sleep(Math.random() * 2 + 0.5);
}
