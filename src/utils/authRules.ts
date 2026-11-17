export interface PasswordValidationResult {
  valid: boolean;
  length: number;
  meetsLongRule: boolean; // >= 15 chars
  hasMin8: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  meetsCompositeRule: boolean; // >= 8 chars + lowercase + number
}

export const CLASS_OPTIONS = [
  'PASSOUT',
  'Nursery',
  'LKG',
  'UKG',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsernameFormat(username: string): { valid: boolean; message?: string } {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { valid: false, message: 'Username is required' };
  }
  if (normalized.length < 3 || normalized.length > 24) {
    return { valid: false, message: 'Username must be 3–24 characters' };
  }
  if (!/^[a-z0-9][a-z0-9_.]{2,23}$/.test(normalized)) {
    return {
      valid: false,
      message:
        'Start with a letter/number and use only lowercase letters, numbers, dots, or underscores',
    };
  }
  return { valid: true };
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const length = password.length;
  const meetsLongRule = length >= 15;
  const hasMin8 = length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const meetsCompositeRule = hasMin8 && hasLowercase && hasNumber;

  return {
    valid: meetsLongRule || meetsCompositeRule,
    length,
    meetsLongRule,
    hasMin8,
    hasLowercase,
    hasNumber,
    meetsCompositeRule,
  };
}

export interface ParsedAuthCallback {
  hasCallback: boolean;
  pkceCode: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  callbackType: string | null;
  authCallback: string | null;
  verifyToken: string | null;
  errorDescription: string | null;
}

/**
 * Extracts Supabase email confirmation / OAuth callback parameters from either
 * `window.location.search` (PKCE `?code=`) or `window.location.hash`
 * (Implicit `#access_token=...&type=signup` or HashRouter `#/auth?...`).
 */
export function parseSupabaseCallbackUrl(search: string, hash: string): ParsedAuthCallback {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);

  // Support both `#access_token=...` and `#/auth?verified=true#access_token=...`
  let fragmentParams = new URLSearchParams();
  let hashQueryParams = new URLSearchParams();

  if (hash) {
    const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const secondHashIdx = rawHash.indexOf('#');
    if (secondHashIdx !== -1) {
      const beforeSecond = rawHash.slice(0, secondHashIdx);
      const afterSecond = rawHash.slice(secondHashIdx + 1);
      const qIdx = beforeSecond.indexOf('?');
      if (qIdx !== -1) {
        hashQueryParams = new URLSearchParams(beforeSecond.slice(qIdx + 1));
      }
      fragmentParams = new URLSearchParams(afterSecond);
    } else if (rawHash.includes('access_token=') || rawHash.includes('error_description=') || rawHash.includes('type=')) {
      const qIdx = rawHash.indexOf('?');
      if (qIdx !== -1 && rawHash.startsWith('/')) {
        hashQueryParams = new URLSearchParams(rawHash.slice(qIdx + 1));
      } else {
        fragmentParams = new URLSearchParams(rawHash.startsWith('/') ? rawHash.slice(1) : rawHash);
      }
    } else {
      const qIdx = rawHash.indexOf('?');
      if (qIdx !== -1) {
        hashQueryParams = new URLSearchParams(rawHash.slice(qIdx + 1));
      }
    }
  }

  const pkceCode = searchParams.get('code') || hashQueryParams.get('code');
  const accessToken = fragmentParams.get('access_token') || searchParams.get('access_token');
  const refreshToken = fragmentParams.get('refresh_token') || searchParams.get('refresh_token');
  const callbackType = fragmentParams.get('type') || searchParams.get('type') || hashQueryParams.get('type');
  const authCallback = searchParams.get('auth_callback') || hashQueryParams.get('auth_callback');
  const verifyToken = hashQueryParams.get('verify_token') || searchParams.get('verify_token');
  const errorDescription =
    fragmentParams.get('error_description') ||
    searchParams.get('error_description') ||
    hashQueryParams.get('error_description');

  const hasCallback = Boolean(
    pkceCode || accessToken || authCallback || verifyToken || errorDescription
  );

  return {
    hasCallback,
    pkceCode,
    accessToken,
    refreshToken,
    callbackType,
    authCallback,
    verifyToken,
    errorDescription,
  };
}

/**
 * Returns true only when required alumni onboarding fields are populated.
 * Blank rows auto-created by a Supabase auth.users trigger must return false.
 */
export function isProfileComplete(
  profile:
    | {
        full_name?: string | null;
        admission_number?: string | null;
        class?: string | null;
        batch?: string | null;
      }
    | null
    | undefined
): boolean {
  return Boolean(
    profile &&
      profile.full_name?.trim() &&
      profile.admission_number?.trim() &&
      profile.class?.trim() &&
      profile.batch?.trim()
  );
}

/**
 * Detects PostgREST / Postgres errors caused by optional columns (e.g. avatar_url, username)
 * not yet present in the target Supabase table or schema cache.
 */
export function isMissingColumnSchemaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; message?: unknown; details?: unknown };
  const code = String(record.code || '');
  const msg = `${String(record.message || '')} ${String(record.details || '')}`.toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

export type AuthTabRouteAction =
  | { action: 'none' }
  | { action: 'prompt_signout' }
  | { action: 'signup_verify_email' }
  | { action: 'signup_onboarding' }
  | { action: 'login_device_otp' }
  | { action: 'redirect_dashboard' };

/**
 * Pure state resolver enforcing strict isolation between Sign Up and Login:
 * - On Sign Up (`activeTab === 'signup'`):
 *   - Unverified session -> stays in signup email verification step (never OTP / login / dashboard).
 *   - Verified session without completed profile -> opens Complete Profile setup.
 *   - Verified session WITH completed profile -> prompts user to sign out first before creating another account.
 * - On Login (`activeTab === 'login'`):
 *   - Unverified session -> routes to signup email verification step.
 *   - Verified session without completed profile -> routes to Complete Profile setup.
 *   - Untrusted device -> triggers 6-digit new-device OTP challenge.
 *   - Trusted device + completed profile -> redirects to dashboard.
 */
export function resolveSessionRouteAction(params: {
  activeTab: 'signup' | 'login';
  user: { email_verified?: boolean } | null;
  hasProfile: boolean;
  deviceVerified: boolean;
}): AuthTabRouteAction {
  const { activeTab, user, hasProfile, deviceVerified } = params;
  if (!user) return { action: 'none' };

  if (!user.email_verified) {
    return { action: 'signup_verify_email' };
  }

  if (!hasProfile) {
    return { action: 'signup_onboarding' };
  }

  if (activeTab === 'signup') {
    return { action: 'prompt_signout' };
  }

  if (!deviceVerified) {
    return { action: 'login_device_otp' };
  }

  return { action: 'redirect_dashboard' };
}
