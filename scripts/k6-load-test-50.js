import http from "k6/http";
import { check, sleep } from "k6";

/**
 * ==============================================================================
 * K6 Load Test: 50 Concurrent Virtual Users (VUs)
 * Plane Project Management API
 * ==============================================================================
 *
 * Ejecución vía Docker:
 *   docker run --rm -i --network=host grafana/k6 run - < scripts/k6-load-test-50.js
 */

export const options = {
  stages: [
    { duration: "15s", target: 50 }, // Ramp-up: 0 a 50 usuarios en 15s
    { duration: "60s", target: 50 }, // Sostenimiento: 50 usuarios durante 1 minuto
    { duration: "10s", target: 0 },  // Ramp-down: 50 a 0 usuarios en 10s
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],     // Menos del 1% de errores
    http_req_duration: ["p(95)<500"],   // 95% de las peticiones en < 500ms
    "http_req_duration{status:504}": ["count===0"], // Cero timeouts 504
  },
};

const BASE_URL = __ENV.API_URL || "http://172.16.30.57:9600";
const WORKSPACE_ID = __ENV.WORKSPACE_ID || "2";
const PROJECT_ID = __ENV.PROJECT_ID || "4";
const TOKEN = __ENV.AUTH_TOKEN || "";

export default function () {
  const params = {
    headers: {
      Accept: "application/json",
      "X-Workspace-Id": WORKSPACE_ID,
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    timeout: "60s",
  };

  // 1. Workspaces
  const resWs = http.get(`${BASE_URL}/api/v1/workspaces`, params);
  check(resWs, { "workspaces 200": (r) => r.status === 200 });

  // 2. Projects list
  const resProjList = http.get(`${BASE_URL}/api/v1/projects`, params);
  check(resProjList, { "projects 200": (r) => r.status === 200 });

  // 3. Project detail (Endpoint que fallaba con 504)
  const resProj = http.get(`${BASE_URL}/api/v1/projects/${PROJECT_ID}`, params);
  check(resProj, {
    "project detail 200": (r) => r.status === 200,
    "no 504 timeout": (r) => r.status !== 504,
  });

  // 4. Work Items
  const resItems = http.get(`${BASE_URL}/api/v1/projects/${PROJECT_ID}/work-items`, params);
  check(resItems, { "work-items 200": (r) => r.status === 200 });

  // 5. States
  const resStates = http.get(`${BASE_URL}/api/v1/projects/${PROJECT_ID}/states`, params);
  check(resStates, { "states 200": (r) => r.status === 200 });

  // 6. Members
  const resMembers = http.get(`${BASE_URL}/api/v1/projects/${PROJECT_ID}/members`, params);
  check(resMembers, { "members 200": (r) => r.status === 200 });

  sleep(Math.random() * 0.2 + 0.05); // Pausa humana
}
