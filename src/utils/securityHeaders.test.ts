import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECURITY_HEADER_NAMES,
  buildCspPolicy,
  getSecurityHeaders,
  parseOriginFromUrl,
} from './securityHeaders.ts';

test('getSecurityHeaders emits all five Nikto-required security headers', () => {
  const headers = getSecurityHeaders({ isDev: false });

  for (const name of SECURITY_HEADER_NAMES) {
    assert.ok(headers[name], `Expected header ${name} to be non-empty`);
  }

  assert.equal(
    headers['Strict-Transport-Security'],
    'max-age=31536000; includeSubDomains; preload'
  );
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headers['Permissions-Policy'].includes('camera=()'));
  assert.ok(headers['Permissions-Policy'].includes('geolocation=()'));
  assert.ok(headers['Permissions-Policy'].includes('microphone=()'));
});

test('production CSP locks down scripts without unsafe-inline or unsafe-eval', () => {
  const csp = buildCspPolicy({ isDev: false });
  const scriptDirective = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('script-src '));

  assert.equal(scriptDirective, "script-src 'self'");
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("form-action 'self'"));
  assert.ok(csp.includes('https://cdnjs.cloudflare.com'));
  assert.ok(csp.includes('https://*.supabase.co'));
  assert.ok(csp.includes('wss://*.supabase.co'));
});

test('development CSP permits Vite dev preamble while keeping core origin restrictions', () => {
  const csp = buildCspPolicy({ isDev: true });
  const scriptDirective = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('script-src '));

  assert.ok(scriptDirective?.includes("'self'"));
  assert.ok(scriptDirective?.includes("'unsafe-inline'"));
  assert.ok(csp.includes("object-src 'none'"));
});

test('parseOriginFromUrl and buildCspPolicy safely merge custom Supabase origins', () => {
  assert.deepEqual(parseOriginFromUrl('https://custom.example.com/rest/v1'), {
    httpOrigin: 'https://custom.example.com',
    wsOrigin: 'wss://custom.example.com',
  });
  assert.deepEqual(parseOriginFromUrl('javascript:alert(1)'), {});
  assert.deepEqual(parseOriginFromUrl('not-a-url'), {});

  const csp = buildCspPolicy({
    isDev: false,
    supabaseUrl: 'https://custom-db.example.com/auth/v1',
  });
  assert.ok(csp.includes('https://custom-db.example.com'));
  assert.ok(csp.includes('wss://custom-db.example.com'));
});
