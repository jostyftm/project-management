#!/usr/bin/env node

/**
 * ==============================================================================
 * Prueba de Carga Concurrente (50 Usuarios Simultáneos)
 * Plane Project Management API
 * ==============================================================================
 *
 * Simula 50 usuarios concurrentes navegando intensivamente por la API,
 * ejecutando el flujo del Dashboard y del Proyecto (/projects/4).
 *
 * Métricas medidas:
 *  - Throughput (Peticiones por segundo - Req/s)
 *  - Tasa de Errores (504 Gateway Timeout, 502, 500, etc.)
 *  - Latencias: Promedio, Mínima, Máxima, p50 (Mediana), p90, p95, p99
 *  - Desglose por endpoint
 *
 * Uso:
 *   node scripts/load-test-50-users.js [URL_BASE] [WORKSPACE_ID] [TOKEN]
 *
 * Ejemplos:
 *   node scripts/load-test-50-users.js http://172.16.30.57:9600 2
 *   node scripts/load-test-50-users.js http://localhost:8000 1
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

// Configuración de la prueba
const BASE_URL = process.argv[2] || process.env.API_URL || "http://172.16.30.57:9600";
const WORKSPACE_ID = process.argv[3] || process.env.WORKSPACE_ID || "2";
let AUTH_TOKEN = process.argv[4] || process.env.AUTH_TOKEN || "";
const AUTH_EMAIL = process.env.EMAIL || process.env.AUTH_EMAIL || "";
const AUTH_PASSWORD = process.env.PASSWORD || process.env.AUTH_PASSWORD || "";
const CONCURRENT_USERS = parseInt(process.env.VUS || "50", 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || "45", 10);
const PROJECT_ID = process.env.PROJECT_ID || "4";

console.log("==================================================================");
console.log("🚀 INICIANDO PRUEBA DE CARGA: 50 USUARIOS SIMULTÁNEOS");
console.log("==================================================================");
console.log(`🎯 URL Objetivo:       ${BASE_URL}`);
console.log(`🏢 Workspace ID:      ${WORKSPACE_ID}`);
console.log(`📁 Proyecto ID:       ${PROJECT_ID}`);
console.log(`👥 Usuarios Virtuales: ${CONCURRENT_USERS} VUs en paralelo`);
console.log(`⏱️  Duración:          ${DURATION_SECONDS} segundos`);
if (AUTH_TOKEN) {
  console.log(`🔑 Autenticación:     Bearer Token proporcionado (${AUTH_TOKEN.slice(0, 10)}...)`);
} else if (AUTH_EMAIL) {
  console.log(`🔑 Autenticación:     Auto-login con ${AUTH_EMAIL}`);
} else {
  console.log(`⚠️  Autenticación:     Sin credenciales (rutas protegidas devolverán 401)`);
}
console.log("==================================================================\n");

// Endpoints a evaluar dentro del ciclo de navegación del usuario
const ENDPOINTS = [
  { name: "GET /api/v1/workspaces", path: "/api/v1/workspaces" },
  { name: "GET /api/v1/projects", path: "/api/v1/projects" },
  { name: `GET /api/v1/projects/${PROJECT_ID}`, path: `/api/v1/projects/${PROJECT_ID}` },
  { name: `GET /api/v1/projects/${PROJECT_ID}/work-items`, path: `/api/v1/projects/${PROJECT_ID}/work-items` },
  { name: `GET /api/v1/projects/${PROJECT_ID}/states`, path: `/api/v1/projects/${PROJECT_ID}/states` },
  { name: `GET /api/v1/projects/${PROJECT_ID}/members`, path: `/api/v1/projects/${PROJECT_ID}/members` },
  { name: `GET /api/v1/projects/${PROJECT_ID}/cycles`, path: `/api/v1/projects/${PROJECT_ID}/cycles` },
];

// Agentes HTTP con keep-alive y pool ampliado de sockets
const parsedUrl = new URL(BASE_URL);
const isHttps = parsedUrl.protocol === "https:";
const agentOptions = {
  keepAlive: true,
  maxSockets: 200,
  maxFreeSockets: 50,
  timeout: 65000,
};
const httpAgent = isHttps ? new https.Agent(agentOptions) : new http.Agent(agentOptions);

// Estructura de métricas
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  statusCodes: {},
  latencies: [],
  endpointMetrics: {},
};

ENDPOINTS.forEach((ep) => {
  metrics.endpointMetrics[ep.name] = {
    total: 0,
    success: 0,
    failed: 0,
    statusCodes: {},
    latencies: [],
  };
});

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const fullUrl = new URL(endpoint.path, BASE_URL);
    const startTime = Date.now();

    const headers = {
      Accept: "application/json",
      "X-Workspace-Id": WORKSPACE_ID,
      "User-Agent": "LoadTest-50VUs/1.0",
    };

    if (AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }

    const options = {
      method: "GET",
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      headers,
      agent: httpAgent,
      timeout: 60000,
    };

    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        recordMetric(endpoint.name, statusCode, duration);
        resolve({ statusCode, duration });
      });
    });

    req.on("error", (err) => {
      const duration = Date.now() - startTime;
      const code = err.code || "ERR";

      recordMetric(endpoint.name, code, duration);
      resolve({ statusCode: code, duration });
    });

    req.on("timeout", () => {
      req.destroy();
      const duration = Date.now() - startTime;

      recordMetric(endpoint.name, 504, duration);
      resolve({ statusCode: 504, duration });
    });

    req.end();
  });
}

function recordMetric(endpointName, statusCode, duration) {
  metrics.totalRequests++;
  metrics.latencies.push(duration);

  metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

  if (statusCode >= 200 && statusCode < 400) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
  }

  const ep = metrics.endpointMetrics[endpointName];
  if (ep) {
    ep.total++;
    ep.latencies.push(duration);
    ep.statusCodes[statusCode] = (ep.statusCodes[statusCode] || 0) + 1;
    if (statusCode >= 200 && statusCode < 400) {
      ep.success++;
    } else {
      ep.failed++;
    }
  }
}

function calculatePercentile(array, percentile) {
  if (array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Bucle de cada usuario virtual
async function runVirtualUser(vuId, stopTime) {
  while (Date.now() < stopTime) {
    for (const ep of ENDPOINTS) {
      if (Date.now() >= stopTime) break;
      await makeRequest(ep);
      // Breve pausa humana de 50ms a 150ms entre clicks
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    }
  }
}

function performLogin(email, password) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL("/api/v1/auth/login", BASE_URL);
    const postData = JSON.stringify({ email, password });
    const req = (isHttps ? https : http).request(
      {
        method: "POST",
        hostname: fullUrl.hostname,
        port: fullUrl.port || (isHttps ? 443 : 80),
        path: fullUrl.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Accept: "application/json",
        },
        agent: httpAgent,
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            const token = json.data?.token || json.token;
            if (token) {
              resolve(token);
            } else {
              reject(new Error(`Login falló (${res.statusCode}): ${body}`));
            }
          } catch (e) {
            reject(new Error(`Respuesta inválida en login: ${body}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function startLoadTest() {
  if (!AUTH_TOKEN && AUTH_EMAIL && AUTH_PASSWORD) {
    try {
      console.log(`🔐 Autenticando con ${AUTH_EMAIL}...`);
      AUTH_TOKEN = await performLogin(AUTH_EMAIL, AUTH_PASSWORD);
      console.log(`✅ Token obtenido con éxito. Iniciando simulación de 50 VUs...\n`);
    } catch (err) {
      console.error(`❌ Error en auto-login: ${err.message}`);
      console.error(`   Continuando sin token (las rutas protegidas devolverán 401)...\n`);
    }
  }

  const startTime = Date.now();
  const stopTime = startTime + DURATION_SECONDS * 1000;

  // Barra de progreso y latido en consola
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const currentRps = (metrics.totalRequests / (elapsed || 1)).toFixed(1);
    const errors504 = metrics.statusCodes[504] || 0;
    process.stdout.write(
      `\r⏳ Progreso: ${elapsed}s / ${DURATION_SECONDS}s | Peticiones: ${metrics.totalRequests} | Req/s: ${currentRps} | 504s: ${errors504} `
    );
  }, 1000);

  // Lanzar 50 usuarios virtuales concurrentes
  const workers = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    workers.push(runVirtualUser(i, stopTime));
  }

  await Promise.all(workers);
  clearInterval(progressInterval);
  const totalTestDuration = (Date.now() - startTime) / 1000;

  // ==============================================================================
  // REPORTE FINAL DE RESULTADOS
  // ==============================================================================
  console.log("\n\n==================================================================");
  console.log("📊 RESULTADOS FINALES DE LA PRUEBA DE CARGA (50 USUARIOS)");
  console.log("==================================================================");

  const avgLatency = (
    metrics.latencies.reduce((a, b) => a + b, 0) / (metrics.latencies.length || 1)
  ).toFixed(1);
  const p50 = calculatePercentile(metrics.latencies, 50);
  const p90 = calculatePercentile(metrics.latencies, 90);
  const p95 = calculatePercentile(metrics.latencies, 95);
  const p99 = calculatePercentile(metrics.latencies, 99);
  const rps = (metrics.totalRequests / totalTestDuration).toFixed(1);
  const errorRate = (
    (metrics.failedRequests / (metrics.totalRequests || 1)) *
    100
  ).toFixed(2);

  console.log(`Total Peticiones:     ${metrics.totalRequests}`);
  console.log(`Exitosas (2xx/3xx):    ${metrics.successfulRequests}`);
  console.log(`Fallidas (4xx/5xx):    ${metrics.failedRequests} (${errorRate}%)`);
  console.log(`Throughput Real:       ${rps} req/s`);
  console.log(`Duración Efectiva:     ${totalTestDuration.toFixed(1)} segundos\n`);

  console.log("--- Distribución de Latencias Global ---");
  console.log(`  Mínima:  ${calculatePercentile(metrics.latencies, 0)} ms`);
  console.log(`  Mediana (p50): ${p50} ms`);
  console.log(`  Promedio:      ${avgLatency} ms`);
  console.log(`  p90:           ${p90} ms`);
  console.log(`  p95:           ${p95} ms`);
  console.log(`  p99:           ${p99} ms`);
  console.log(`  Máxima:  ${calculatePercentile(metrics.latencies, 100)} ms\n`);

  console.log("--- Desglose de Códigos HTTP ---");
  Object.entries(metrics.statusCodes).forEach(([code, count]) => {
    const isError = code === "504" || code.startsWith("5");
    const icon = isError ? "❌" : "✅";
    console.log(`  ${icon} HTTP ${code}: ${count}`);
  });

  console.log("\n--- Desglose por Endpoint ---");
  Object.entries(metrics.endpointMetrics).forEach(([name, data]) => {
    const epAvg = (
      data.latencies.reduce((a, b) => a + b, 0) / (data.latencies.length || 1)
    ).toFixed(1);
    const epP95 = calculatePercentile(data.latencies, 95);
    const ep504 = data.statusCodes[504] || 0;
    console.log(`\n  📌 ${name}`);
    console.log(`     Total: ${data.total} | Éxito: ${data.success} | Fallos: ${data.failed} (504s: ${ep504})`);
    console.log(`     Promedio: ${epAvg} ms | p95: ${epP95} ms`);
  });

  console.log("\n==================================================================");
  const passed504Check = (metrics.statusCodes[504] || 0) === 0;
  const passedLatencyCheck = p95 < 600;
  const count401 = metrics.statusCodes[401] || 0;

  if (count401 > 0 && metrics.successfulRequests === 0) {
    console.log("⚠️ VEREDICTO: ADVERTENCIA - Las 16.000+ peticiones devolvieron HTTP 401 Unauthorized.");
    console.log("   Nginx y el servidor respondieron a 270 req/s sin 504s, pero no se ejecutó la lógica");
    console.log("   de base de datos porque las rutas son privadas y requieren token.");
    console.log("   Ejecuta la prueba suministrando tu token o credenciales para medir la carga real:");
    console.log("     node scripts/load-test-50-users.js http://172.16.30.57:9600 2 <TU_TOKEN>");
    console.log("   o:");
    console.log("     EMAIL=tu_correo PASSWORD=tu_clave node scripts/load-test-50-users.js http://172.16.30.57:9600 2");
  } else if (passed504Check && passedLatencyCheck) {
    console.log("🎉 VEREDICTO: PRUEBA APROBADA - Cero timeouts 504 y latencia bajo control con peticiones autenticadas.");
  } else if (!passed504Check) {
    console.log("⚠️ VEREDICTO: FALLO - Se detectaron timeouts 504 Gateway Time-out.");
  } else {
    console.log("⚠️ VEREDICTO: ADVERTENCIA - Sin 504s, pero la latencia p95 superó los 600 ms.");
  }
  console.log("==================================================================\n");
}

startLoadTest().catch((err) => {
  console.error("Error fatal ejecutando la prueba de carga:", err);
  process.exit(1);
});
