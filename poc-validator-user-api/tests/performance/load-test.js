import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics with clean naming (must use underscores for k6 naming rules)
const createTrend = new Trend('rt_create_user');
const listTrend = new Trend('rt_list_users');
const getTrend = new Trend('rt_get_user');
const deleteTrend = new Trend('rt_delete_user');

export const options = {
  vus: 5,
  iterations: 300,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    'rt_create_user': ['p(95)<1200'], 
    'rt_list_users': ['p(95)<800'],
    'rt_get_user': ['p(95)<500'],
    'rt_delete_user': ['p(95)<500'],
    http_req_failed: ['rate<0.01'], 
  },
};

const BASE_URL = __ENV.API_BASE_URL;
const API_KEY = __ENV.API_KEY;

export default function () {
  if (!BASE_URL || !API_KEY) {
    throw new Error('API_BASE_URL and API_KEY environment variables are required. Use -e API_BASE_URL=... -e API_KEY=...');
  }
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  let userId;

  // 1. Create User
  group('Step 01 - Create User', function () {
    const uniqueEmail = `perf-${Date.now()}-${Math.floor(Math.random() * 1000000)}@example.com`;
    const payload = JSON.stringify({
      name: 'Perf Test User',
      email: uniqueEmail,
    });

    const createRes = http.post(`${BASE_URL}/users`, payload, { 
      headers,
      tags: { name: 'CreateUser' } 
    });
    createTrend.add(createRes.timings.duration);
    
    check(createRes, {
      'status is 201': (r) => r.status === 201,
      'has userId': (r) => r.json().UserId !== undefined,
    });

    if (createRes.status === 201) {
      userId = createRes.json().UserId;
    }
  });

  if (!userId) return;

  // 2. List Users
  group('Step 02 - List All Users', function () {
    const listRes = http.get(`${BASE_URL}/users`, { 
      headers,
      tags: { name: 'ListUsers' }
    });
    listTrend.add(listRes.timings.duration);

    check(listRes, {
      'status is 200': (r) => r.status === 200,
      'response is array': (r) => Array.isArray(r.json()),
    });
  });

  // 3. Get User by ID
  group('Step 03 - Get User Details', function () {
    const getRes = http.get(`${BASE_URL}/users/${userId}`, { 
      headers,
      tags: { name: 'GetUser' }
    });
    getTrend.add(getRes.timings.duration);

    check(getRes, {
      'status is 200': (r) => r.status === 200,
      'correct UserId returned': (r) => r.json().UserId === userId,
    });
  });

  // 4. Delete User
  group('Step 04 - Cleanup (Delete User)', function () {
    const deleteRes = http.del(`${BASE_URL}/users/${userId}`, null, { 
      headers,
      tags: { name: 'DeleteUser' }
    });
    deleteTrend.add(deleteRes.timings.duration);

    check(deleteRes, {
      'status is 204': (r) => r.status === 204,
    });
  });

  sleep(0.1); // Small sleep between iterations
}

export function handleSummary(data) {
  return {
    "tests/performance/reports/load-test-summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
