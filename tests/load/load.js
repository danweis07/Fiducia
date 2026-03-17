/**
 * k6 Load Test
 * Simulates normal traffic — ramp up to 50 VUs over 5 minutes
 * Tests typical production load patterns
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% under 1s
    http_req_failed: ['rate<0.05'],     // <5% failure rate
  },
};

export default function () {
  // Simulate typical user journey
  const pages = ['/', '/login', '/dashboard'];
  const page = pages[Math.floor(Math.random() * pages.length)];

  const res = http.get(`${BASE_URL}${page}`);
  check(res, {
    'status is 200 or 304': (r) => r.status === 200 || r.status === 304,
    'response time OK': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 3 + 1); // 1-4s think time
}
