import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  const res = http.get(`${baseUrl}/api/laptops`);

  responseTime.add(res.timings.duration);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  const brandRes = http.get(`${baseUrl}/api/laptops/brands`);
  check(brandRes, {
    'brands status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  const healthRes = http.get(`${baseUrl}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  const filteredRes = http.get(`${baseUrl}/api/laptops?brand=Dell&priceMax=100000`);
  check(filteredRes, {
    'filtered request status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}