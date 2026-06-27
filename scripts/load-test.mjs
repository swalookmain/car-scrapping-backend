/**
 * Load test runner — Node fetch (no k6 required).
 * Respects global rate limit (100/15min) by using short bursts.
 *
 * Usage:
 *   node scripts/load-test.mjs
 *   node scripts/load-test.mjs --token=<JWT>
 *   node scripts/load-test.mjs --base=http://localhost:5000
 */
const BASE = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1]
  ?? process.env.LOAD_TEST_BASE
  ?? 'http://localhost:5000';
const TOKEN = process.argv.find((a) => a.startsWith('--token='))?.split('=')[1]
  ?? process.env.LOAD_TEST_TOKEN;

/** App limiter: 100 req / 15 min per IP (see main.ts) */
const GLOBAL_RATE_LIMIT = 100;

const SCENARIOS = [
  {
    name: 'Health (GET /)',
    path: '/',
    method: 'GET',
    auth: false,
    bursts: [
      { concurrency: 5, durationSec: 3 },
      { concurrency: 10, durationSec: 3 },
      { concurrency: 20, durationSec: 3 },
      { concurrency: 50, durationSec: 3 },
    ],
  },
  {
    name: 'Dashboard (GET /dashboard/overview)',
    path: '/dashboard/overview',
    method: 'GET',
    auth: true,
    skipIfNoToken: true,
    bursts: [
      { concurrency: 5, durationSec: 3 },
      { concurrency: 10, durationSec: 3 },
      { concurrency: 20, durationSec: 3 },
    ],
  },
  {
    name: 'Inventory list (GET /inventory)',
    path: '/inventory',
    method: 'GET',
    auth: true,
    skipIfNoToken: true,
    bursts: [
      { concurrency: 5, durationSec: 3 },
      { concurrency: 10, durationSec: 3 },
      { concurrency: 20, durationSec: 3 },
    ],
  },
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runBurst(baseUrl, scenario, concurrency, durationSec) {
  const endAt = Date.now() + durationSec * 1000;
  const latencies = [];
  let completed = 0;
  let status2xx = 0;
  let status401 = 0;
  let status403 = 0;
  let status429 = 0;
  let status5xx = 0;
  let networkErrors = 0;

  const headers = { Accept: 'application/json' };
  if (scenario.auth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  async function worker() {
    while (Date.now() < endAt) {
      const start = performance.now();
      try {
        const res = await fetch(`${baseUrl}${scenario.path}`, { method: scenario.method, headers });
        latencies.push(performance.now() - start);
        completed++;
        if (res.status >= 200 && res.status < 300) status2xx++;
        else if (res.status === 401) status401++;
        else if (res.status === 403) status403++;
        else if (res.status === 429) status429++;
        else if (res.status >= 500) status5xx++;
      } catch {
        networkErrors++;
        completed++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  latencies.sort((a, b) => a - b);

  const successRate = status2xx / Math.max(completed, 1);
  const rateLimited = status429 > completed * 0.1;

  let grade = 'GOOD';
  if (networkErrors > completed * 0.05 || status5xx > 0) grade = 'FAIL';
  else if (rateLimited) grade = 'RATE_LIMITED';
  else if (percentile(latencies, 95) > 2000) grade = 'SLOW';
  else if (percentile(latencies, 95) > 500) grade = 'OK';

  return {
    concurrency,
    durationSec,
    total: completed,
    rps: Math.round((completed / durationSec) * 10) / 10,
    latency: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      p99: Math.round(percentile(latencies, 99)),
    },
    status: { status2xx, status401, status403, status429, status5xx, networkErrors },
    successRate: Math.round(successRate * 100),
    grade,
  };
}

async function main() {
  console.log(`\n=== Load test — ${BASE} ===`);
  console.log(`Global rate limit: ${GLOBAL_RATE_LIMIT} req / 15 min per IP (express-rate-limit)\n`);

  try {
    const ping = await fetch(`${BASE}/`);
    if (!ping.ok) throw new Error(`Health returned ${ping.status}`);
  } catch (e) {
    console.error('API not reachable. Start backend: npm run start:dev');
    process.exit(1);
  }

  if (!TOKEN) {
    console.log('No JWT — authenticated routes skipped. Use: --token=<JWT>\n');
  }

  const allResults = [];
  let requestsUsed = 0;

  for (const scenario of SCENARIOS) {
    if (scenario.skipIfNoToken && !TOKEN) {
      console.log(`--- ${scenario.name} [SKIPPED — no token] ---\n`);
      continue;
    }

    console.log(`--- ${scenario.name} ---`);
    let maxHealthyConcurrency = 0;

    for (const burst of scenario.bursts) {
      if (requestsUsed >= GLOBAL_RATE_LIMIT - 10) {
        console.log('  (stopped — approaching global rate limit for this IP)\n');
        break;
      }

      const result = await runBurst(BASE, scenario, burst.concurrency, burst.durationSec);
      requestsUsed += result.total;
      allResults.push({ scenario: scenario.name, ...result });

      const extra = result.status.status429
        ? ` | 429=${result.status.status429} (rate limit)`
        : '';
      console.log(
        `  ${burst.concurrency} users × ${burst.durationSec}s → ${result.rps} req/s | p50=${result.latency.p50}ms p95=${result.latency.p95}ms | success=${result.successRate}%${extra} [${result.grade}]`,
      );

      if (result.grade === 'GOOD' || result.grade === 'OK') {
        maxHealthyConcurrency = burst.concurrency;
      }
      if (result.grade === 'FAIL') break;
    }

    if (maxHealthyConcurrency) {
      console.log(`  → Stable up to ~${maxHealthyConcurrency} concurrent users (before rate limit).\n`);
    } else {
      console.log(`  → See rate limit / error notes above.\n`);
    }
  }

  console.log('=== Capacity summary ===');
  const health = allResults.filter((r) => r.scenario.includes('Health') && r.grade !== 'RATE_LIMITED');
  if (health.length) {
    const peak = health.reduce((a, b) => (a.rps > b.rps ? a : b));
    console.log(`Peak burst (health): ~${peak.rps} req/s at ${peak.concurrency} users, p95=${peak.latency.p95}ms`);
  }
  console.log(`Sustained cap (this IP): ~${GLOBAL_RATE_LIMIT} requests / 15 min due to rate limiter`);
  console.log('For production load testing: raise limit temporarily or use multiple IPs / staging env.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
