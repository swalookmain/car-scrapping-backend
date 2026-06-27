/**
 * Security audit script — headers, auth, rate limits, validation, npm audit.
 * Usage: node scripts/security-audit.mjs [--base=http://localhost:5000]
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = join(__dirname, '..');

const BASE = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1]
  ?? process.env.SECURITY_TEST_BASE
  ?? 'http://localhost:5000';

const findings = [];
const passes = [];

function finding(severity, title, detail) {
  findings.push({ severity, title, detail });
}

function pass(title) {
  passes.push(title);
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }
  return { res, body };
}

async function checkHeaders() {
  const { res } = await fetch(`${BASE}/`);
  const h = res.headers;
  const securityHeaders = [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY or SAMEORIGIN'],
    ['strict-transport-security', 'HSTS (production only)'],
    ['content-security-policy', 'CSP'],
  ];

  if (h.get('x-content-type-options')) pass('Helmet: X-Content-Type-Options present');
  else finding('MEDIUM', 'Missing X-Content-Type-Options', 'Helmet may not be applied');

  if (h.get('x-frame-options') || h.get('content-security-policy')) {
    pass('Helmet: clickjacking protection present');
  } else {
    finding('MEDIUM', 'Missing frame/CSP headers', 'Add helmet frameguard or CSP');
  }

  if (h.get('content-security-policy')) pass('Helmet: Content-Security-Policy present');

  return h;
}

async function checkAuthEnforcement() {
  const protectedRoutes = [
    { method: 'GET', path: '/dashboard/overview' },
    { method: 'GET', path: '/inventory' },
    { method: 'GET', path: '/users' },
    { method: 'GET', path: '/organizations' },
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(`${BASE}${route.path}`, { method: route.method });
    if (res.status === 401) {
      pass(`${route.method} ${route.path} requires authentication (401)`);
    } else {
      finding('CRITICAL', `Auth bypass risk: ${route.method} ${route.path}`, `Expected 401, got ${res.status}`);
    }
  }

  const res = await fetch(`${BASE}/dashboard/overview`, {
    headers: { Authorization: 'Bearer invalid.token.here' },
  });
  if (res.status === 401) pass('Invalid JWT rejected (401)');
  else finding('HIGH', 'Invalid JWT not rejected', `Got status ${res.status}`);
}

async function checkRateLimiting() {
  let hit429 = false;
  for (let i = 0; i < 8; i++) {
    const { res } = await fetchJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'loadtest@example.com', password: 'wrong' }),
    });
    if (res.status === 429) {
      hit429 = true;
      pass(`Login rate limit triggered after ${i + 1} attempts (429)`);
      break;
    }
  }
  if (!hit429) {
    finding('MEDIUM', 'Login rate limit not observed in 8 attempts', 'Expected 429 on /auth/login after 5 failures per 15min (same IP)');
  }
}

async function checkValidationPipe() {
  const { res, body } = await fetchJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-an-email',
      password: 'x',
      evilField: 'should-be-stripped',
    }),
  });
  if (res.status === 400) {
    pass('ValidationPipe rejects invalid login payload (400)');
  } else if (res.status === 429) {
    pass('Rate limit active (skipped validation check this run)');
  } else {
    finding('MEDIUM', 'Validation may be weak on /auth/login', `Status ${res.status}: ${JSON.stringify(body)?.slice(0, 120)}`);
  }

  const { res: res2 } = await fetchJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', password: 'secret', extraField: 'injection' }),
  });
  if (res2.status === 400 && String(body?.message || '').includes('extraField') === false) {
    pass('forbidNonWhitelisted likely active (extra fields rejected)');
  } else if (res2.status === 429) {
    /* rate limited */
  } else if (res2.status === 400) {
    pass('Invalid/extra login fields rejected (400)');
  }
}

async function checkCors() {
  const res = await fetch(`${BASE}/`, {
    headers: { Origin: 'https://evil.example.com' },
  });
  const acao = res.headers.get('access-control-allow-origin');
  if (acao === 'https://evil.example.com' || acao === '*') {
    finding('HIGH', 'Permissive CORS (origin: true)', `Reflects arbitrary origin: ${acao}. Restrict to ALLOWED_ORIGINS in production.`);
  } else if (acao) {
    finding('LOW', 'CORS allows reflected origin', `Access-Control-Allow-Origin: ${acao}`);
  } else {
    pass('CORS does not reflect arbitrary origin on GET /');
  }
}

async function checkSwaggerExposure() {
  const res = await fetch(`${BASE}/docs`);
  if (res.status === 200) {
    finding('LOW', 'Swagger UI publicly accessible', '/docs is open — disable or protect in production');
  }
}

function runNpmAudit() {
  try {
    const out = execSync('npm audit --json', {
      cwd: BACKEND_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const data = JSON.parse(out);
    const meta = data.metadata?.vulnerabilities ?? {};
    const total = (meta.critical ?? 0) + (meta.high ?? 0) + (meta.moderate ?? 0) + (meta.low ?? 0);
    if (total === 0) pass('npm audit: no known vulnerabilities');
    else {
      finding(
        meta.critical || meta.high ? 'HIGH' : 'MEDIUM',
        `npm audit: ${total} vulnerabilities`,
        `critical=${meta.critical ?? 0} high=${meta.high ?? 0} moderate=${meta.moderate ?? 0} low=${meta.low ?? 0}`,
      );
    }
  } catch (e) {
    const stdout = e.stdout?.toString() ?? '';
    try {
      const data = JSON.parse(stdout);
      const meta = data.metadata?.vulnerabilities ?? {};
      const total = (meta.critical ?? 0) + (meta.high ?? 0) + (meta.moderate ?? 0) + (meta.low ?? 0);
      finding(
        meta.critical || meta.high ? 'HIGH' : 'MEDIUM',
        `npm audit: ${total} dependency vulnerabilities`,
        `critical=${meta.critical ?? 0} high=${meta.high ?? 0} moderate=${meta.moderate ?? 0} low=${meta.low ?? 0}. Run: npm audit fix`,
      );
    } catch {
      finding('LOW', 'npm audit could not run', e.message?.slice(0, 100));
    }
  }
}

async function main() {
  console.log(`\n=== Security audit — ${BASE} ===\n`);

  try {
    await fetch(`${BASE}/`);
  } catch {
    console.error('API not reachable. Start backend first.');
    process.exit(1);
  }

  await checkHeaders();
  await checkAuthEnforcement();
  await checkRateLimiting();
  await checkValidationPipe();
  await checkCors();
  await checkSwaggerExposure();
  runNpmAudit();

  console.log(`\n--- Passed (${passes.length}) ---`);
  passes.forEach((p) => console.log(`  ✓ ${p}`));

  console.log(`\n--- Findings (${findings.length}) ---`);
  if (!findings.length) {
    console.log('  No issues found.\n');
    return;
  }

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.title}`);
    console.log(`         ${f.detail}`);
  }
  console.log('');

  const critical = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  process.exit(critical.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
