export interface SecurityHeaderOptions {
  isDev?: boolean;
  supabaseUrl?: string;
}

export const SECURITY_HEADER_NAMES = [
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
] as const;

export function parseOriginFromUrl(rawUrl?: string): {
  httpOrigin?: string;
  wsOrigin?: string;
} {
  if (!rawUrl) return {};
  const trimmed = rawUrl.trim();
  if (!trimmed) return {};
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {};
    }
    const hostLower = parsed.host.toLowerCase();
    if (
      hostLower.includes('placeholder') ||
      hostLower.includes('your-project') ||
      hostLower.includes('your_project') ||
      hostLower.includes('your-supabase') ||
      hostLower === 'example.supabase.co'
    ) {
      return {};
    }
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return {
      httpOrigin: parsed.origin,
      wsOrigin: `${wsProtocol}//${parsed.host}`,
    };
  } catch {
    return {};
  }
}

export function buildCspPolicy(options: SecurityHeaderOptions = {}): string {
  const isDev = Boolean(options.isDev);
  const { httpOrigin, wsOrigin } = parseOriginFromUrl(options.supabaseUrl);

  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'"];

  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ];

  if (httpOrigin && !connectSrc.includes(httpOrigin)) {
    connectSrc.push(httpOrigin);
  }
  if (wsOrigin && !connectSrc.includes(wsOrigin)) {
    connectSrc.push(wsOrigin);
  }
  if (isDev) {
    connectSrc.push('ws://localhost:*', 'ws://127.0.0.1:*');
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "font-src 'self' data: https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com",
    `connect-src ${connectSrc.join(' ')}`,
    "worker-src 'self' blob:",
  ];

  return directives.join('; ');
}

export function getSecurityHeaders(
  options: SecurityHeaderOptions = {}
): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': buildCspPolicy(options),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  };
}
