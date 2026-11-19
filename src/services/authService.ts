import { isSupabaseConfigured, supabase } from '../utils/supabase/client';
import {
  isMissingColumnSchemaError,
  isProfileComplete,
  normalizeEmail,
  normalizeUsername,
  PasswordValidationResult,
  validatePasswordPolicy,
  validateUsernameFormat,
} from '../utils/authRules';

export type { PasswordValidationResult };
export {
  normalizeEmail,
  normalizeUsername,
  validatePasswordPolicy,
  validateUsernameFormat,
};

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  email_verified?: boolean;
  providers?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  admission_number: string;
  class: string;
  batch: string;
  compliance_accepted: boolean;
  compliance_accepted_at?: string;
  onboarding_goal?: string;
  onboarding_bio?: string;
  avatar_url?: string | null;
}

export interface TrustedDevice {
  id: string;
  label: string;
  addedAt: string;
  lastUsedAt: string;
}

export interface PasskeyCredentialRecord {
  id: string;
  label: string;
  createdAt: string;
  rawId?: string;
}

interface DemoStoredUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  providers: string[];
  trustedDevices: TrustedDevice[];
  passkeys: PasskeyCredentialRecord[];
  profile?: UserProfile;
}

interface DemoSessionRecord {
  userId: string;
  deviceVerified: boolean;
}

const DEMO_USERS_KEY = 'gv_demo_users_v2';
const DEMO_SESSION_KEY = 'gv_demo_session_v2';
const DEVICE_ID_KEY = 'gv_device_id';
const TRUSTED_DEVICES_PREFIX = 'gv_trusted_devices_';
const PASSKEYS_PREFIX = 'gv_passkeys_';
const PASSKEY_DIRECTORY_KEY = 'gv_passkey_directory_v1';
const USERNAME_EMAIL_MAP_KEY = 'gv_username_email_map_v1';
const AWAITING_LINK_PREFIX = 'gv_awaiting_email_link_';
const PENDING_DEVICE_OTP_KEY = 'gv_pending_device_otp';
const PENDING_DEVICE_OTP_USER_KEY = 'gv_pending_device_otp_user';
const AUTH_EVENT_NAME = 'gv-auth-changed';

let supabaseUnreachable = false;
let authBroadcastSuppressionDepth = 0;

export function isAuthBroadcastSuppressed(): boolean {
  return authBroadcastSuppressionDepth > 0;
}

async function withSuppressedAuthBroadcast<T>(fn: () => Promise<T>): Promise<T> {
  authBroadcastSuppressionDepth += 1;
  try {
    return await fn();
  } finally {
    authBroadcastSuppressionDepth = Math.max(0, authBroadcastSuppressionDepth - 1);
  }
}

function useLiveSupabase(): boolean {
  return isSupabaseConfigured && !supabaseUnreachable;
}

export function isUsingDemoFallback(): boolean {
  return !useLiveSupabase();
}

function rememberUsernameEmail(username?: string | null, email?: string | null) {
  const cleanUser = username ? normalizeUsername(username) : '';
  const cleanEmail = email ? normalizeEmail(email) : '';
  if (!cleanUser || !cleanEmail) return;
  try {
    const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[cleanUser] = cleanEmail;
    localStorage.setItem(USERNAME_EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function lookupCachedEmailForUsername(username: string): string | null {
  try {
    const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[normalizeUsername(username)] || null;
  } catch {
    return null;
  }
}

function setAwaitingEmailLink(email: string) {
  const clean = normalizeEmail(email);
  if (!clean) return;
  try {
    localStorage.setItem(`${AWAITING_LINK_PREFIX}${clean}`, '1');
  } catch {
    // Ignore storage errors
  }
}

function clearAwaitingEmailLink(email?: string | null) {
  if (!email) return;
  try {
    localStorage.removeItem(`${AWAITING_LINK_PREFIX}${normalizeEmail(email)}`);
  } catch {
    // Ignore storage errors
  }
}

function isAwaitingEmailLink(email?: string | null): boolean {
  if (!email) return false;
  try {
    return localStorage.getItem(`${AWAITING_LINK_PREFIX}${normalizeEmail(email)}`) === '1';
  } catch {
    return false;
  }
}

interface PasskeyDirectoryEntry extends PasskeyCredentialRecord {
  userId: string;
  email: string;
  username?: string;
}

function getPasskeyDirectory(): PasskeyDirectoryEntry[] {
  try {
    const raw = localStorage.getItem(PASSKEY_DIRECTORY_KEY);
    return raw ? (JSON.parse(raw) as PasskeyDirectoryEntry[]) : [];
  } catch {
    return [];
  }
}

function upsertPasskeyDirectory(entry: PasskeyDirectoryEntry) {
  try {
    const next = getPasskeyDirectory().filter((p) => p.id !== entry.id);
    next.push(entry);
    localStorage.setItem(PASSKEY_DIRECTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}

function removeFromPasskeyDirectory(credentialId: string) {
  try {
    const next = getPasskeyDirectory().filter((p) => p.id !== credentialId);
    localStorage.setItem(PASSKEY_DIRECTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}

function isNetworkFetchFailure(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    err?.name === 'AuthRetryableFetchError'
  );
}

// Directory queries return only registered alumni accounts (live Supabase or local accounts).

function emitAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
}

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  let os = 'Device';
  if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

function getDemoUsers(): DemoStoredUser[] {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    return raw ? (JSON.parse(raw) as DemoStoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveDemoUsers(users: DemoStoredUser[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function getDemoSession(): DemoSessionRecord | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSessionRecord) : null;
  } catch {
    return null;
  }
}

function setDemoSession(session: DemoSessionRecord | null) {
  if (session) {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(DEMO_SESSION_KEY);
  }
  emitAuthChanged();
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${input.length}`;
}

function generateSixDigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getLocalTrustedDevices(userId: string): TrustedDevice[] {
  try {
    const raw = localStorage.getItem(`${TRUSTED_DEVICES_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as TrustedDevice[]) : [];
  } catch {
    return [];
  }
}

function saveLocalTrustedDevices(userId: string, devices: TrustedDevice[]) {
  localStorage.setItem(`${TRUSTED_DEVICES_PREFIX}${userId}`, JSON.stringify(devices));
}

function getLocalPasskeys(userId: string): PasskeyCredentialRecord[] {
  try {
    const raw = localStorage.getItem(`${PASSKEYS_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as PasskeyCredentialRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalPasskeys(userId: string, passkeys: PasskeyCredentialRecord[]) {
  localStorage.setItem(`${PASSKEYS_PREFIX}${userId}`, JSON.stringify(passkeys));
}

export async function isCurrentDeviceTrusted(userId: string): Promise<boolean> {
  const currentDeviceId = getOrCreateDeviceId();

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (!error) {
        const metaDevices = (data.user?.user_metadata?.trusted_devices || []) as TrustedDevice[];
        const localDevices = getLocalTrustedDevices(userId);
        const combined = [...metaDevices, ...localDevices];
        return combined.some((d) => d.id === currentDeviceId);
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    return user.trustedDevices.some((d) => d.id === currentDeviceId);
  }
  return getLocalTrustedDevices(userId).some((d) => d.id === currentDeviceId);
}

export async function trustCurrentDevice(userId: string): Promise<void> {
  const currentDeviceId = getOrCreateDeviceId();
  const now = new Date().toISOString();
  const entry: TrustedDevice = {
    id: currentDeviceId,
    label: getDeviceLabel(),
    addedAt: now,
    lastUsedAt: now,
  };

  const localDevices = getLocalTrustedDevices(userId).filter((d) => d.id !== currentDeviceId);
  localDevices.push(entry);
  saveLocalTrustedDevices(userId, localDevices);

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        const existing = ((data.user?.user_metadata?.trusted_devices || []) as TrustedDevice[]).filter(
          (d) => d.id !== currentDeviceId
        );
        existing.push(entry);
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            trusted_devices: existing,
          },
        });
        if (updateError && isNetworkFetchFailure(updateError)) {
          supabaseUnreachable = true;
        } else {
          return;
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    users[idx].trustedDevices = users[idx].trustedDevices.filter((d) => d.id !== currentDeviceId);
    users[idx].trustedDevices.push(entry);
    saveDemoUsers(users);
  }
}

export async function listTrustedDevices(userId: string): Promise<TrustedDevice[]> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (!error) {
        const metaDevices = (data.user?.user_metadata?.trusted_devices || []) as TrustedDevice[];
        return metaDevices.length > 0 ? metaDevices : getLocalTrustedDevices(userId);
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const user = users.find((u) => u.id === userId);
  return user?.trustedDevices || getLocalTrustedDevices(userId);
}

export async function revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  const localDevices = getLocalTrustedDevices(userId).filter((d) => d.id !== deviceId);
  saveLocalTrustedDevices(userId, localDevices);

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        const existing = ((data.user?.user_metadata?.trusted_devices || []) as TrustedDevice[]).filter(
          (d) => d.id !== deviceId
        );
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            trusted_devices: existing,
          },
        });
        if (updateError && isNetworkFetchFailure(updateError)) {
          supabaseUnreachable = true;
        } else {
          return;
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    users[idx].trustedDevices = users[idx].trustedDevices.filter((d) => d.id !== deviceId);
    saveDemoUsers(users);
  }
}

export async function getAuthSessionState(): Promise<{
  user: AuthUser | null;
  deviceVerified: boolean;
}> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        const sbUser = data.session?.user;
        if (!sbUser) {
          return { user: null, deviceVerified: false };
        }
        const provider = sbUser.app_metadata?.provider || 'email';
        const isOAuthProvider = provider !== 'email';
        const awaitingSignupLink = !isOAuthProvider && isAwaitingEmailLink(sbUser.email);
        const emailVerified = Boolean(
          !awaitingSignupLink &&
            (sbUser.email_confirmed_at || sbUser.confirmed_at || isOAuthProvider)
        );
        const trusted = await isCurrentDeviceTrusted(sbUser.id);
        const pendingDeviceCheck =
          sessionStorage.getItem('gv_device_otp_verified_user') === sbUser.id;
        return {
          user: {
            id: sbUser.id,
            email: sbUser.email || '',
            username: sbUser.user_metadata?.username,
            email_verified: emailVerified,
            providers: sbUser.app_metadata?.providers || [provider],
          },
          deviceVerified: trusted || pendingDeviceCheck,
        };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const session = getDemoSession();
  if (!session) {
    return { user: null, deviceVerified: false };
  }
  const user = getDemoUsers().find((u) => u.id === session.userId);
  if (!user) {
    setDemoSession(null);
    return { user: null, deviceVerified: false };
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      email_verified: user.emailVerified,
      providers: user.providers,
    },
    deviceVerified: session.deviceVerified,
  };
}

export function subscribeAuthChanges(
  callback: (state: { user: AuthUser | null; deviceVerified: boolean }) => void
): () => void {
  const handleLocalChange = () => {
    if (isAuthBroadcastSuppressed()) return;
    getAuthSessionState().then(callback);
  };

  window.addEventListener(AUTH_EVENT_NAME, handleLocalChange);
  window.addEventListener('storage', handleLocalChange);

  let unsubscribeSupabase: (() => void) | undefined;
  if (useLiveSupabase()) {
    const { data } = supabase.auth.onAuthStateChange(() => {
      if (isAuthBroadcastSuppressed()) return;
      getAuthSessionState().then(callback);
    });
    unsubscribeSupabase = () => data.subscription.unsubscribe();
  }

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handleLocalChange);
    window.removeEventListener('storage', handleLocalChange);
    unsubscribeSupabase?.();
  };
}

export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; message: string }> {
  const format = validateUsernameFormat(username);
  if (!format.valid) {
    return { available: false, message: format.message || 'Invalid username' };
  }
  const normalized = normalizeUsername(username);

  if (useLiveSupabase()) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('is_username_available', {
        candidate_username: normalized,
      });
      if (!rpcError && typeof rpcData === 'boolean') {
        return {
          available: rpcData,
          message: rpcData ? 'Username is available' : 'This username is already taken',
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', normalized)
        .maybeSingle();

      if (!error) {
        const available = !data;
        return {
          available,
          message: available ? 'Username is available' : 'This username is already taken',
        };
      }
      if (isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (isMissingColumnSchemaError(error)) {
        // Optional username column hasn't been added to profiles yet; allow client-side check
        return {
          available: true,
          message: 'Username is available',
        };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const takenInUsers = users.some((u) => u.username.toLowerCase() === normalized);
  const available = !takenInUsers;

  return {
    available,
    message: available ? 'Username is available' : 'This username is already taken',
  };
}

export async function registerWithEmail(params: {
  email: string;
  username: string;
  password: string;
}): Promise<{
  userId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  needsEmailVerification: boolean;
  demoVerifyUrl?: string;
}> {
  const email = normalizeEmail(params.email);
  const username = normalizeUsername(params.username);

  const policy = validatePasswordPolicy(params.password);
  if (!policy.valid) {
    throw new Error(
      'Password must be at least 15 characters, or 8+ characters with at least one lowercase letter and one number.'
    );
  }

  const usernameCheck = await checkUsernameAvailability(username);
  if (!usernameCheck.available) {
    throw new Error(usernameCheck.message);
  }

  if (useLiveSupabase()) {
    try {
      return await withSuppressedAuthBroadcast(async () => {
        // Clean root callback URL avoids HashRouter fragment collisions with #access_token=...
        const redirectTo = `${window.location.origin}/?auth_callback=signup`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password: params.password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              username,
            },
          },
        });

        if (error) {
          if (isNetworkFetchFailure(error)) {
            supabaseUnreachable = true;
            throw error;
          }
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('Could not create user account. Please try again.');
        }

        // Supabase returns empty identities array if the email is already registered when email confirmation is enabled
        if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please log in instead.');
        }

        rememberUsernameEmail(username, email);

        // Never leave a live session active during Sign Up before the user clicks the email verification link.
        // If Confirm Email is disabled in Supabase, signUp immediately returns a session: revoke it,
        // flag awaiting email link, and send a verification link so the user still clicks the email link first.
        if (data.session) {
          setAwaitingEmailLink(email);
          await supabase.auth.signOut().catch(() => null);
          await supabase.auth
            .signInWithOtp({
              email,
              options: {
                emailRedirectTo: redirectTo,
                shouldCreateUser: false,
              },
            })
            .catch(() => null);
        }

        return {
          userId: data.user.id,
          email,
          username,
          emailVerified: false,
          needsEmailVerification: true,
        };
      });
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  // Local demo fallback
  const users = getDemoUsers();
  const existingEmail = users.find((u) => u.email === email);
  if (existingEmail && existingEmail.emailVerified) {
    throw new Error('An account with this email already exists. Please log in instead.');
  }

  const token = `vfy_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const userId = existingEmail?.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newUser: DemoStoredUser = {
    id: userId,
    email,
    username,
    passwordHash: simpleHash(params.password),
    emailVerified: false,
    verificationToken: token,
    providers: ['email'],
    trustedDevices: existingEmail?.trustedDevices || [],
    passkeys: existingEmail?.passkeys || [],
    profile: existingEmail?.profile,
  };

  const nextUsers = users.filter((u) => u.id !== userId);
  nextUsers.push(newUser);
  saveDemoUsers(nextUsers);

  const demoVerifyUrl = `${window.location.origin}/#/auth?mode=signup&verify_token=${encodeURIComponent(token)}`;

  return {
    userId,
    email,
    username,
    emailVerified: false,
    needsEmailVerification: true,
    demoVerifyUrl,
  };
}

export async function checkLiveEmailVerification(
  pkceCode?: string,
  accessToken?: string,
  refreshToken?: string,
  fromLinkCallback = false
): Promise<{
  verified: boolean;
  user?: AuthUser;
}> {
  if (!useLiveSupabase()) {
    const state = await getAuthSessionState();
    return {
      verified: Boolean(state.user?.email_verified),
      user: state.user || undefined,
    };
  }

  try {
    // Wait for detectSessionInUrl if active before attempting manual code/token exchange
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session && pkceCode) {
      await supabase.auth.exchangeCodeForSession(pkceCode).catch(() => null);
    } else if (!sessionData.session && accessToken && refreshToken) {
      await supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .catch(() => null);
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      }
      return { verified: false };
    }
    const sbUser = data.user;
    if (!sbUser) return { verified: false };

    if (fromLinkCallback || pkceCode || accessToken) {
      clearAwaitingEmailLink(sbUser.email);
    }

    const provider = sbUser.app_metadata?.provider || 'email';
    const isOAuthProvider = provider !== 'email';
    const awaitingSignupLink = !isOAuthProvider && isAwaitingEmailLink(sbUser.email);
    const verified = Boolean(
      !awaitingSignupLink &&
        (sbUser.email_confirmed_at || sbUser.confirmed_at || isOAuthProvider)
    );
    return {
      verified,
      user: {
        id: sbUser.id,
        email: sbUser.email || '',
        username: sbUser.user_metadata?.username,
        email_verified: verified,
        providers: sbUser.app_metadata?.providers || [provider],
      },
    };
  } catch (err) {
    if (isNetworkFetchFailure(err)) {
      supabaseUnreachable = true;
    }
    return { verified: false };
  }
}

export async function verifyEmailWithToken(token: string): Promise<AuthUser> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (data.user && (data.user.email_confirmed_at || data.user.confirmed_at)) {
        return {
          id: data.user.id,
          email: data.user.email || '',
          username: data.user.user_metadata?.username,
          email_verified: true,
        };
      } else {
        throw new Error('Email is not verified yet. Please click the verification link in your email.');
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.verificationToken === token);
  if (idx === -1) {
    throw new Error('Verification link is invalid or has already been used.');
  }

  users[idx].emailVerified = true;
  users[idx].verificationToken = undefined;
  saveDemoUsers(users);

  // Establish session for onboarding
  setDemoSession({ userId: users[idx].id, deviceVerified: true });

  return {
    id: users[idx].id,
    email: users[idx].email,
    username: users[idx].username,
    email_verified: true,
    providers: users[idx].providers,
  };
}

export async function resendVerificationLink(email: string): Promise<{ demoVerifyUrl?: string }> {
  const normalized = normalizeEmail(email);

  if (useLiveSupabase()) {
    try {
      const redirectTo = `${window.location.origin}/?auth_callback=signup`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalized,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else if (isAwaitingEmailLink(normalized) || error.message?.toLowerCase().includes('already')) {
          const { error: otpLinkError } = await supabase.auth.signInWithOtp({
            email: normalized,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: false,
            },
          });
          if (otpLinkError) {
            if (isNetworkFetchFailure(otpLinkError)) {
              supabaseUnreachable = true;
            } else {
              throw new Error(otpLinkError.message);
            }
          } else {
            return {};
          }
        } else {
          throw new Error(error.message);
        }
      } else {
        return {};
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.email === normalized);
  if (idx === -1) {
    throw new Error('Pending registration not found. Please start sign up again.');
  }
  const token = `vfy_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  users[idx].verificationToken = token;
  saveDemoUsers(users);

  return {
    demoVerifyUrl: `${window.location.origin}/#/auth?mode=signup&verify_token=${encodeURIComponent(token)}`,
  };
}

export async function completeProfileSetup(
  userId: string,
  payload: {
    email: string;
    username: string;
    full_name: string;
    admission_number: string;
    class: string;
    batch: string;
    compliance_accepted: boolean;
    onboarding_goal: string;
    onboarding_bio: string;
  }
): Promise<UserProfile> {
  if (!payload.compliance_accepted) {
    throw new Error('Please confirm your Batch selection for alumni compliance.');
  }

  const now = new Date().toISOString();
  const username = normalizeUsername(payload.username || payload.email.split('@')[0]);

  const profile: UserProfile = {
    id: userId,
    email: normalizeEmail(payload.email),
    username,
    full_name: payload.full_name.trim(),
    admission_number: payload.admission_number.trim(),
    class: payload.class,
    batch: payload.batch,
    compliance_accepted: true,
    compliance_accepted_at: now,
    onboarding_goal: payload.onboarding_goal,
    onboarding_bio: payload.onboarding_bio.trim(),
  };

  rememberUsernameEmail(profile.username, profile.email);
  clearAwaitingEmailLink(profile.email);

  if (useLiveSupabase()) {
    try {
      const corePayload = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        admission_number: profile.admission_number,
        class: profile.class,
        batch: profile.batch,
      };
      const extendedPayload = {
        ...corePayload,
        username: profile.username,
        compliance_accepted: profile.compliance_accepted,
        compliance_accepted_at: profile.compliance_accepted_at,
        onboarding_goal: profile.onboarding_goal,
        onboarding_bio: profile.onboarding_bio,
      };

      let { error } = await supabase.from('profiles').upsert(extendedPayload);

      if (error && !isNetworkFetchFailure(error)) {
        // Retry with core schema columns when optional columns (username, compliance, onboarding) aren't migrated
        const retryCore = await supabase.from('profiles').upsert(corePayload);
        error = retryCore.error;

        // If trigger inserted the row and RLS allows UPDATE but denies INSERT via upsert, update directly
        if (error && !isNetworkFetchFailure(error)) {
          const updateRetry = await supabase
            .from('profiles')
            .update({
              email: profile.email,
              full_name: profile.full_name,
              admission_number: profile.admission_number,
              class: profile.class,
              batch: profile.batch,
            })
            .eq('id', profile.id);
          error = updateRetry.error;
        }
      }

      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      }

      if (useLiveSupabase()) {
        await supabase.auth.updateUser({
          data: {
            username: profile.username,
            batch: profile.batch,
            compliance_accepted: true,
            onboarding_goal: profile.onboarding_goal,
            onboarding_bio: profile.onboarding_bio,
          },
        });

        await trustCurrentDevice(userId);
        sessionStorage.setItem('gv_device_otp_verified_user', userId);
        emitAuthChanged();
        return profile;
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  // Local demo fallback
  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('User account session expired. Please register again.');
  }

  users[idx].username = profile.username;
  users[idx].profile = profile;
  saveDemoUsers(users);
  await trustCurrentDevice(userId);
  setDemoSession({ userId, deviceVerified: true });

  return profile;
}

async function resolveIdentifierToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }

  if (useLiveSupabase()) {
    try {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('resolve_login_email', {
        login_identifier: trimmed,
      });
      if (!rpcError && rpcEmail) {
        return String(rpcEmail).toLowerCase();
      }
      if (rpcError && isNetworkFetchFailure(rpcError)) {
        supabaseUnreachable = true;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', trimmed)
          .maybeSingle();

        if (error && isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else if (data?.email) {
          return data.email.toLowerCase();
        } else {
          const cached = lookupCachedEmailForUsername(trimmed);
          if (cached) return cached;
          if (error && isMissingColumnSchemaError(error)) {
            throw new Error(
              'Username login on a new device requires setup_auth_v2.sql or entering your email address.'
            );
          }
          throw new Error('No account found with that username. Try entering your email address.');
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const cached = lookupCachedEmailForUsername(trimmed);
  if (cached) {
    return cached;
  }

  const users = getDemoUsers();
  const matched = users.find((u) => u.username.toLowerCase() === trimmed);
  if (!matched) {
    throw new Error('No account found with that username.');
  }
  return matched.email;
}

export async function loginWithPassword(params: {
  identifier: string;
  password: string;
}): Promise<{
  status: 'authenticated' | 'otp_required' | 'needs_onboarding' | 'email_verification_required';
  email: string;
  userId: string;
  username?: string;
  demoOtp?: string;
  demoVerifyUrl?: string;
  otpNotice?: string;
}> {
  const email = await resolveIdentifierToEmail(params.identifier);

  if (useLiveSupabase()) {
    try {
      return await withSuppressedAuthBroadcast(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: params.password,
        });

        if (error) {
          if (isNetworkFetchFailure(error)) {
            supabaseUnreachable = true;
            throw error;
          }
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            return {
              status: 'email_verification_required' as const,
              email,
              userId: '',
            };
          }
          throw new Error(error.message || 'Invalid username/email or password');
        }

        if (!data.user) {
          throw new Error('Invalid username/email or password');
        }

        const userId = data.user.id;
        const username = data.user.user_metadata?.username;
        const emailVerified = Boolean(
          !isAwaitingEmailLink(email) &&
            (data.user.email_confirmed_at || data.user.confirmed_at)
        );

        if (!emailVerified) {
          await supabase.auth.signOut().catch(() => null);
          return {
            status: 'email_verification_required' as const,
            email,
            userId,
            username,
          };
        }

        rememberUsernameEmail(username, email);

        const profile = await getUserProfile(userId);
        if (!profile || !isProfileComplete(profile)) {
          return {
            status: 'needs_onboarding' as const,
            email,
            userId,
            username,
          };
        }

        const trusted = await isCurrentDeviceTrusted(userId);
        if (!trusted) {
          try {
            const otpResult = await sendNewDeviceOtp(email, userId);
            return {
              status: 'otp_required' as const,
              email,
              userId,
              username: profile.username,
              demoOtp: otpResult.demoOtp,
            };
          } catch (otpErr: any) {
            const msg = String(otpErr?.message || '').toLowerCase();
            if (msg.includes('rate') || msg.includes('seconds') || msg.includes('429')) {
              sessionStorage.setItem(PENDING_DEVICE_OTP_USER_KEY, userId);
              return {
                status: 'otp_required' as const,
                email,
                userId,
                username: profile.username,
                otpNotice: otpErr.message,
              };
            }
            await supabase.auth.signOut().catch(() => null);
            throw otpErr;
          }
        }

        sessionStorage.setItem('gv_device_otp_verified_user', userId);
        emitAuthChanged();
        return {
          status: 'authenticated' as const,
          email,
          userId,
          username: profile.username,
        };
      });
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  // Local demo fallback
  const users = getDemoUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error('Invalid username/email or password.');
  }
  if (user.passwordHash !== simpleHash(params.password)) {
    throw new Error('Invalid username/email or password.');
  }
  if (!user.emailVerified) {
    const token = user.verificationToken || `vfy_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    if (!user.verificationToken) {
      user.verificationToken = token;
      saveDemoUsers(users);
    }
    return {
      status: 'email_verification_required',
      email: user.email,
      userId: user.id,
      username: user.username,
      demoVerifyUrl: `${window.location.origin}/#/auth?mode=signup&verify_token=${encodeURIComponent(token)}`,
    };
  }

  rememberUsernameEmail(user.username, user.email);

  if (!isProfileComplete(user.profile)) {
    setDemoSession({ userId: user.id, deviceVerified: true });
    return {
      status: 'needs_onboarding',
      email: user.email,
      userId: user.id,
      username: user.username,
    };
  }

  const trusted = await isCurrentDeviceTrusted(user.id);
  if (!trusted) {
    setDemoSession({ userId: user.id, deviceVerified: false });
    const otpResult = await sendNewDeviceOtp(user.email, user.id);
    return {
      status: 'otp_required',
      email: user.email,
      userId: user.id,
      username: user.username,
      demoOtp: otpResult.demoOtp,
    };
  }

  setDemoSession({ userId: user.id, deviceVerified: true });
  return {
    status: 'authenticated',
    email: user.email,
    userId: user.id,
    username: user.username,
  };
}

export async function loginWithOAuthProvider(
  provider: 'google' | 'apple',
  mode: 'signup' | 'login',
  demoEmailInput?: string
): Promise<{
  status: 'redirecting' | 'authenticated' | 'needs_onboarding' | 'otp_required';
  email?: string;
  userId?: string;
  username?: string;
  demoOtp?: string;
}> {
  if (useLiveSupabase()) {
    try {
      const redirectTo = `${window.location.origin}/?auth_callback=oauth&mode=${mode}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });
      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      } else {
        return { status: 'redirecting' };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  // Local fallback for OAuth when Supabase env is not configured
  const cleanEmail = normalizeEmail(demoEmailInput || '');
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address to continue with OAuth.');
  }
  const users = getDemoUsers();
  let user = users.find((u) => u.email === cleanEmail);

  if (!user) {
    const baseUsername = normalizeUsername(cleanEmail.split('@')[0].replace(/[^a-z0-9_.]/g, '')) || 'grizzlian';
    let candidate = baseUsername.slice(0, 20);
    if (users.some((u) => u.username === candidate)) {
      candidate = `${candidate.slice(0, 16)}_${Math.floor(100 + Math.random() * 900)}`;
    }

    user = {
      id: `oauth_${provider}_${Date.now()}`,
      email: cleanEmail,
      username: candidate,
      passwordHash: simpleHash(`oauth_${provider}_${Math.random()}`),
      emailVerified: true,
      providers: [provider],
      trustedDevices: [],
      passkeys: [],
    };
    users.push(user);
    saveDemoUsers(users);
  } else if (!user.providers.includes(provider)) {
    user.providers.push(provider);
    user.emailVerified = true;
    saveDemoUsers(users);
  }

  rememberUsernameEmail(user.username, user.email);

  if (!isProfileComplete(user.profile)) {
    setDemoSession({ userId: user.id, deviceVerified: true });
    return {
      status: 'needs_onboarding',
      email: user.email,
      userId: user.id,
      username: user.username,
    };
  }

  const trusted = await isCurrentDeviceTrusted(user.id);
  if (!trusted) {
    setDemoSession({ userId: user.id, deviceVerified: false });
    const otpResult = await sendNewDeviceOtp(user.email, user.id);
    return {
      status: 'otp_required',
      email: user.email,
      userId: user.id,
      username: user.username,
      demoOtp: otpResult.demoOtp,
    };
  }

  setDemoSession({ userId: user.id, deviceVerified: true });
  return {
    status: 'authenticated',
    email: user.email,
    userId: user.id,
    username: user.username,
  };
}

function randomChallengeBytes(length = 32): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export async function listPasskeys(userId: string): Promise<PasskeyCredentialRecord[]> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (!error) {
        const metaPasskeys = (data.user?.user_metadata?.passkey_credentials || []) as PasskeyCredentialRecord[];
        return metaPasskeys.length > 0 ? metaPasskeys : getLocalPasskeys(userId);
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }
  const users = getDemoUsers();
  const user = users.find((u) => u.id === userId);
  return user?.passkeys || getLocalPasskeys(userId);
}

export async function registerPasskey(
  userId: string,
  email: string,
  displayName: string,
  username?: string
): Promise<PasskeyCredentialRecord> {
  let credentialId = `pk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  let rawId: string | undefined;

  if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials?.create) {
    try {
      const challenge = randomChallengeBytes(32);
      const userBytes = new TextEncoder().encode(userId).slice(0, 64);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challenge as BufferSource,
          rp: {
            name: 'GVConnect Alumni Network',
            id: window.location.hostname,
          },
          user: {
            id: userBytes as BufferSource,
            name: email,
            displayName: displayName || email,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (cred) {
        credentialId = cred.id;
        rawId = bufferToBase64Url(cred.rawId);
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' && !window.isSecureContext) {
        throw new Error('Passkey registration was canceled.');
      }
    }
  }

  const record: PasskeyCredentialRecord = {
    id: credentialId,
    rawId: rawId || credentialId,
    label: `${getDeviceLabel()} Passkey`,
    createdAt: new Date().toISOString(),
  };

  upsertPasskeyDirectory({
    ...record,
    userId,
    email: normalizeEmail(email),
    username: username ? normalizeUsername(username) : undefined,
  });

  const existingLocal = getLocalPasskeys(userId).filter((p) => p.id !== record.id);
  existingLocal.push(record);
  saveLocalPasskeys(userId, existingLocal);

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        const existing = ((data.user?.user_metadata?.passkey_credentials || []) as PasskeyCredentialRecord[]).filter(
          (p) => p.id !== record.id
        );
        existing.push(record);
        const { error: updateErr } = await supabase.auth.updateUser({
          data: {
            passkey_credentials: existing,
          },
        });
        if (updateErr && isNetworkFetchFailure(updateErr)) {
          supabaseUnreachable = true;
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  if (!useLiveSupabase()) {
    const users = getDemoUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].passkeys = users[idx].passkeys.filter((p) => p.id !== record.id);
      users[idx].passkeys.push(record);
      if (!users[idx].providers.includes('passkey')) {
        users[idx].providers.push('passkey');
      }
      saveDemoUsers(users);
    }
  }

  return record;
}

export async function removePasskey(userId: string, credentialId: string): Promise<void> {
  removeFromPasskeyDirectory(credentialId);
  const nextLocal = getLocalPasskeys(userId).filter((p) => p.id !== credentialId);
  saveLocalPasskeys(userId, nextLocal);

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        const existing = ((data.user?.user_metadata?.passkey_credentials || []) as PasskeyCredentialRecord[]).filter(
          (p) => p.id !== credentialId
        );
        const { error: updateErr } = await supabase.auth.updateUser({
          data: {
            passkey_credentials: existing,
          },
        });
        if (updateErr && isNetworkFetchFailure(updateErr)) {
          supabaseUnreachable = true;
        } else {
          return;
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    users[idx].passkeys = users[idx].passkeys.filter((p) => p.id !== credentialId);
    saveDemoUsers(users);
  }
}

export async function loginWithPasskey(identifier?: string): Promise<{
  status: 'authenticated' | 'otp_required' | 'needs_onboarding';
  email: string;
  userId: string;
  username?: string;
  demoOtp?: string;
}> {
  const users = getDemoUsers();
  const directory = getPasskeyDirectory();
  const cleanIdentifier = identifier?.trim().toLowerCase() || '';

  let matchedPasskey: PasskeyDirectoryEntry | undefined;
  if (cleanIdentifier) {
    matchedPasskey = directory.find(
      (p) =>
        p.email === cleanIdentifier ||
        (p.username && p.username.toLowerCase() === cleanIdentifier)
    );
  } else {
    matchedPasskey = directory[0];
  }

  let matchedDemoUser: DemoStoredUser | undefined;
  if (cleanIdentifier) {
    matchedDemoUser = users.find(
      (u) =>
        (u.email === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier) &&
        u.passkeys.length > 0
    );
  } else {
    matchedDemoUser = users.find((u) => u.passkeys.length > 0);
  }

  const targetUserId = matchedPasskey?.userId || matchedDemoUser?.id || '';
  const targetEmail = matchedPasskey?.email || matchedDemoUser?.email || '';
  const targetUsername = matchedPasskey?.username || matchedDemoUser?.username;
  const primaryPasskey: PasskeyCredentialRecord | undefined =
    matchedPasskey || matchedDemoUser?.passkeys[0];

  if (!targetUserId || !targetEmail || !primaryPasskey) {
    throw new Error(
      'No Passkey is configured for this account on this browser yet. Sign in with your password or Google first and add a Passkey in Dashboard → Passkeys & Devices.'
    );
  }

  // Attempt native WebAuthn assertion when supported and credential has rawId
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials?.get &&
    primaryPasskey?.rawId &&
    !primaryPasskey.id.startsWith('pk_')
  ) {
    try {
      const challenge = randomChallengeBytes(32);
      const allowId = base64UrlToUint8Array(primaryPasskey.rawId);
      await navigator.credentials.get({
        publicKey: {
          challenge: challenge as BufferSource,
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: 'public-key',
              id: allowId as BufferSource,
            },
          ],
          userVerification: 'preferred',
          timeout: 60000,
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
        throw new Error('Passkey verification was canceled.');
      }
    }
  }

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else if (data.session?.user && data.session.user.id === targetUserId) {
        const trusted = await isCurrentDeviceTrusted(targetUserId);
        if (!trusted) {
          const otpResult = await sendNewDeviceOtp(targetEmail, targetUserId);
          return {
            status: 'otp_required',
            email: targetEmail,
            userId: targetUserId,
            username: targetUsername,
            demoOtp: otpResult.demoOtp,
          };
        }
        sessionStorage.setItem('gv_device_otp_verified_user', targetUserId);
        emitAuthChanged();
        return {
          status: 'authenticated',
          email: targetEmail,
          userId: targetUserId,
          username: targetUsername,
        };
      } else {
        // Signed out in live Supabase: complete session authentication via email OTP challenge
        const otpResult = await sendNewDeviceOtp(targetEmail, targetUserId);
        return {
          status: 'otp_required',
          email: targetEmail,
          userId: targetUserId,
          username: targetUsername,
          demoOtp: otpResult.demoOtp,
        };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  if (matchedDemoUser && !isProfileComplete(matchedDemoUser.profile)) {
    setDemoSession({ userId: matchedDemoUser.id, deviceVerified: true });
    return {
      status: 'needs_onboarding',
      email: matchedDemoUser.email,
      userId: matchedDemoUser.id,
      username: matchedDemoUser.username,
    };
  }

  const trusted = await isCurrentDeviceTrusted(targetUserId);
  if (!trusted) {
    setDemoSession({ userId: targetUserId, deviceVerified: false });
    const otpResult = await sendNewDeviceOtp(targetEmail, targetUserId);
    return {
      status: 'otp_required',
      email: targetEmail,
      userId: targetUserId,
      username: targetUsername,
      demoOtp: otpResult.demoOtp,
    };
  }

  setDemoSession({ userId: targetUserId, deviceVerified: true });
  return {
    status: 'authenticated',
    email: targetEmail,
    userId: targetUserId,
    username: targetUsername,
  };
}

export async function sendNewDeviceOtp(
  email: string,
  userId?: string,
  forceNew = false
): Promise<{ demoOtp?: string }> {
  const normalized = normalizeEmail(email);
  if (userId) {
    sessionStorage.setItem(PENDING_DEVICE_OTP_USER_KEY, userId);
  }

  if (useLiveSupabase()) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/?auth_callback=device_otp`,
        },
      });
      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      } else {
        return {};
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  if (!forceNew) {
    const rawExisting = sessionStorage.getItem(PENDING_DEVICE_OTP_KEY);
    if (rawExisting) {
      try {
        const existing = JSON.parse(rawExisting) as {
          email: string;
          userId: string;
          code: string;
          expiresAt: number;
        };
        if (existing.email === normalized && Date.now() < existing.expiresAt) {
          return { demoOtp: existing.code };
        }
      } catch {
        // Ignore malformed cache and generate a fresh OTP
      }
    }
  }

  const code = generateSixDigitOtp();
  sessionStorage.setItem(
    PENDING_DEVICE_OTP_KEY,
    JSON.stringify({
      email: normalized,
      userId: userId || '',
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
  );

  return { demoOtp: code };
}

export async function verifyNewDeviceOtp(params: {
  email: string;
  userId: string;
  code: string;
  trustDevice: boolean;
}): Promise<void> {
  const normalized = normalizeEmail(params.email);
  const cleanCode = params.code.trim();

  if (cleanCode.length !== 6) {
    throw new Error('Please enter the complete 6-digit verification code.');
  }

  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalized,
        token: cleanCode,
        type: 'email',
      });
      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      } else {
        const verifiedUserId = data.user?.id || params.userId;
        sessionStorage.removeItem(PENDING_DEVICE_OTP_USER_KEY);
        if (params.trustDevice && verifiedUserId) {
          await trustCurrentDevice(verifiedUserId);
        }
        if (verifiedUserId) {
          sessionStorage.setItem('gv_device_otp_verified_user', verifiedUserId);
        }
        emitAuthChanged();
        return;
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const rawPending = sessionStorage.getItem(PENDING_DEVICE_OTP_KEY);
  if (!rawPending) {
    throw new Error('Verification code expired. Please request a new code.');
  }
  const pending = JSON.parse(rawPending) as {
    email: string;
    userId: string;
    code: string;
    expiresAt: number;
  };

  if (Date.now() > pending.expiresAt) {
    sessionStorage.removeItem(PENDING_DEVICE_OTP_KEY);
    throw new Error('Verification code has expired. Please resend a new code.');
  }
  if (pending.email !== normalized || pending.code !== cleanCode) {
    throw new Error('Invalid verification code. Please check and try again.');
  }

  sessionStorage.removeItem(PENDING_DEVICE_OTP_KEY);
  sessionStorage.removeItem(PENDING_DEVICE_OTP_USER_KEY);

  if (params.trustDevice) {
    await trustCurrentDevice(params.userId);
  }
  setDemoSession({ userId: params.userId, deviceVerified: true });
}

export async function sendPasswordReset(identifier: string): Promise<string> {
  const email = await resolveIdentifierToEmail(identifier);

  if (useLiveSupabase()) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/auth?mode=login`,
      });
      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      } else {
        return email;
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const users = getDemoUsers();
  const exists = users.some((u) => u.email === email);
  if (!exists) {
    throw new Error('No registered account was found for that username or email.');
  }
  return email;
}

export async function resetLocalDemoPassword(identifier: string, newPassword: string): Promise<string> {
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    throw new Error(
      'New password must be at least 15 characters, or 8+ characters with a lowercase letter and number.'
    );
  }
  const email = await resolveIdentifierToEmail(identifier);
  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) {
    throw new Error('No registered account was found for that username or email.');
  }
  users[idx].passwordHash = simpleHash(newPassword);
  saveDemoUsers(users);
  return email;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          return null;
        }
      } else if (!data) {
        return null;
      } else {
        const authUserData = await supabase.auth.getUser().catch(() => null);
        const meta = authUserData?.data?.user?.user_metadata || {};
        return {
          id: data.id,
          email: data.email || authUserData?.data?.user?.email || '',
          username: data.username || meta.username || data.email?.split('@')[0] || 'grizzlian',
          full_name: data.full_name || '',
          admission_number: data.admission_number || '',
          class: data.class || '',
          batch: data.batch || '',
          compliance_accepted: Boolean(data.compliance_accepted ?? meta.compliance_accepted ?? false),
          compliance_accepted_at: data.compliance_accepted_at,
          onboarding_goal: data.onboarding_goal || meta.onboarding_goal,
          onboarding_bio: data.onboarding_bio || meta.onboarding_bio,
          avatar_url: data.avatar_url || meta.avatar_url || null,
        };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        return null;
      }
    }
  }

  const users = getDemoUsers();
  const user = users.find((u) => u.id === userId);
  return user?.profile || null;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name: string;
    admission_number: string;
    class: string;
    batch: string;
    onboarding_goal?: string;
    onboarding_bio?: string;
    avatar_url?: string | null;
    avatarFile?: File | null;
  }
): Promise<UserProfile> {
  let finalAvatarUrl = updates.avatar_url || null;

  if (updates.avatarFile) {
    let uploadedViaSupabase = false;
    if (useLiveSupabase()) {
      try {
        const fileExt = updates.avatarFile.name.split('.').pop();
        const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, updates.avatarFile, { upsert: true });
        if (uploadError) {
          if (isNetworkFetchFailure(uploadError)) {
            supabaseUnreachable = true;
          } else {
            throw new Error('Failed to upload profile picture');
          }
        } else {
          const { data } = supabase.storage.from('profile-images').getPublicUrl(filePath);
          finalAvatarUrl = data.publicUrl;
          uploadedViaSupabase = true;
        }
      } catch (err) {
        if (isNetworkFetchFailure(err)) {
          supabaseUnreachable = true;
        } else {
          throw err;
        }
      }
    }

    if (!uploadedViaSupabase) {
      finalAvatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(updates.avatarFile!);
      });
    }
  }

  if (useLiveSupabase()) {
    try {
      const corePayload = {
        full_name: updates.full_name,
        admission_number: updates.admission_number,
        class: updates.class,
        batch: updates.batch,
      };
      const extendedPayload = {
        ...corePayload,
        ...(updates.onboarding_goal !== undefined ? { onboarding_goal: updates.onboarding_goal } : {}),
        ...(updates.onboarding_bio !== undefined ? { onboarding_bio: updates.onboarding_bio } : {}),
        ...(updates.avatarFile || updates.avatar_url ? { avatar_url: finalAvatarUrl } : {}),
      };

      let { data, error } = await supabase
        .from('profiles')
        .update(extendedPayload)
        .eq('id', userId)
        .select('*')
        .single();

      if (error && isMissingColumnSchemaError(error)) {
        const retry = await supabase
          .from('profiles')
          .update(corePayload)
          .eq('id', userId)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        if (isNetworkFetchFailure(error)) {
          supabaseUnreachable = true;
        } else {
          throw new Error(error.message);
        }
      } else {
        await supabase.auth
          .updateUser({
            data: {
              ...(finalAvatarUrl !== undefined ? { avatar_url: finalAvatarUrl } : {}),
              ...(updates.onboarding_goal !== undefined ? { onboarding_goal: updates.onboarding_goal } : {}),
              ...(updates.onboarding_bio !== undefined ? { onboarding_bio: updates.onboarding_bio } : {}),
            },
          })
          .catch(() => null);
        return {
          ...(data as UserProfile),
          onboarding_goal: (data as UserProfile)?.onboarding_goal ?? updates.onboarding_goal,
          onboarding_bio: (data as UserProfile)?.onboarding_bio ?? updates.onboarding_bio,
          avatar_url: (data as UserProfile)?.avatar_url ?? finalAvatarUrl,
        };
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1 || !users[idx].profile) {
    throw new Error('Profile not found');
  }

  const updated: UserProfile = {
    ...users[idx].profile!,
    full_name: updates.full_name,
    admission_number: updates.admission_number,
    class: updates.class,
    batch: updates.batch,
    onboarding_goal:
      updates.onboarding_goal !== undefined
        ? updates.onboarding_goal
        : users[idx].profile!.onboarding_goal,
    onboarding_bio:
      updates.onboarding_bio !== undefined
        ? updates.onboarding_bio.trim()
        : users[idx].profile!.onboarding_bio,
    avatar_url: finalAvatarUrl,
  };
  users[idx].profile = updated;
  saveDemoUsers(users);
  emitAuthChanged();
  return updated;
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    throw new Error(
      'New password must be at least 15 characters, or 8+ characters with a lowercase letter and number.'
    );
  }

  if (useLiveSupabase()) {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr && isNetworkFetchFailure(userErr)) {
        supabaseUnreachable = true;
      } else {
        const email = userData.user?.email || '';
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (signInError) {
          if (isNetworkFetchFailure(signInError)) {
            supabaseUnreachable = true;
          } else {
            throw new Error('Current password is incorrect');
          }
        } else {
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });
          if (updateError) {
            if (isNetworkFetchFailure(updateError)) {
              supabaseUnreachable = true;
            } else {
              throw new Error(updateError.message);
            }
          } else {
            return;
          }
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        throw err;
      }
    }
  }

  const users = getDemoUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('Account not found');
  if (users[idx].passwordHash !== simpleHash(currentPassword)) {
    throw new Error('Current password is incorrect');
  }
  users[idx].passwordHash = simpleHash(newPassword);
  saveDemoUsers(users);
}

export async function getBatchStats(userId: string, batch: string): Promise<{ connections: number; messages: number }> {
  if (useLiveSupabase()) {
    try {
      let connections = 0;
      let messages = 0;
      const { count: connCount, error: connErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('batch', batch)
        .neq('id', userId);
      if (connErr && isNetworkFetchFailure(connErr)) {
        supabaseUnreachable = true;
      } else {
        connections = connCount || 0;

        const { data: batchUsers, error: batchErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('batch', batch);

        if (batchErr && isNetworkFetchFailure(batchErr)) {
          supabaseUnreachable = true;
        } else {
          if (batchUsers && batchUsers.length > 0) {
            const userIds = batchUsers.map((u) => u.id);
            const { count: msgCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('sender_id', userIds);
            messages = msgCount || 0;
          }
          return { connections, messages };
        }
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      }
    }
  }

  const allProfiles = await listAlumniDirectory();
  const connections = allProfiles.filter((p) => p.batch === batch && p.id !== userId).length;
  return { connections, messages: 0 };
}

export async function listAlumniDirectory(): Promise<UserProfile[]> {
  if (useLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (!error && data) {
        return (data as any[])
          .filter((row) => isProfileComplete(row))
          .map((row) => ({
            id: row.id,
            email: row.email || '',
            username: row.username || row.email?.split('@')[0] || 'grizzlian',
            full_name: row.full_name || '',
            admission_number: row.admission_number || '',
            class: row.class || '',
            batch: row.batch || '',
            compliance_accepted: Boolean(row.compliance_accepted ?? true),
            compliance_accepted_at: row.compliance_accepted_at,
            onboarding_goal: row.onboarding_goal,
            onboarding_bio: row.onboarding_bio,
            avatar_url: row.avatar_url || null,
          }));
      }
      if (error && isNetworkFetchFailure(error)) {
        supabaseUnreachable = true;
      } else {
        return [];
      }
    } catch (err) {
      if (isNetworkFetchFailure(err)) {
        supabaseUnreachable = true;
      } else {
        return [];
      }
    }
  }

  const registered = getDemoUsers()
    .map((u) => u.profile)
    .filter((p): p is UserProfile => isProfileComplete(p));

  return registered;
}

export async function signOutUser(): Promise<void> {
  sessionStorage.removeItem('gv_device_otp_verified_user');
  sessionStorage.removeItem(PENDING_DEVICE_OTP_USER_KEY);
  sessionStorage.removeItem(PENDING_DEVICE_OTP_KEY);
  if (useLiveSupabase()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on sign out
    }
  }
  setDemoSession(null);
}
