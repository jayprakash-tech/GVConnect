import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_OPTIONS,
  isMissingColumnSchemaError,
  isProfileComplete,
  parseSupabaseCallbackUrl,
  resolveSessionRouteAction,
  resolveSignupVerificationOutcome,
  validatePasswordPolicy,
  validateUsernameFormat,
} from './authRules';

test('resolveSignupVerificationOutcome requires verification link when Confirm Email is enabled', () => {
  const res = resolveSignupVerificationOutcome({
    hasSession: false,
    emailConfirmedAt: null,
    confirmedAt: null,
  });
  assert.deepEqual(res, {
    emailVerified: false,
    needsEmailVerification: true,
    dispatchOtpFallback: false,
  });
});

test('resolveSignupVerificationOutcome never triggers OTP fallback even when server auto-confirms signup', () => {
  const res = resolveSignupVerificationOutcome({
    hasSession: true,
    emailConfirmedAt: '2026-11-21T12:00:00Z',
  });
  assert.deepEqual(res, {
    emailVerified: true,
    needsEmailVerification: false,
    dispatchOtpFallback: false,
  });
});

test('parseSupabaseCallbackUrl extracts device_otp callback and magiclink type', () => {
  const parsed = parseSupabaseCallbackUrl(
    '?auth_callback=device_otp&code=dev-code-99',
    '#type=magiclink'
  );
  assert.equal(parsed.hasCallback, true);
  assert.equal(parsed.authCallback, 'device_otp');
  assert.equal(parsed.pkceCode, 'dev-code-99');
  assert.equal(parsed.callbackType, 'magiclink');
});

test('password policy accepts >= 15 chars without numbers', () => {
  const res = validatePasswordPolicy('verylongpassphrase');
  assert.equal(res.valid, true);
  assert.equal(res.meetsLongRule, true);
});

test('password policy accepts >= 8 chars with lowercase and number', () => {
  const res = validatePasswordPolicy('grizzlian9');
  assert.equal(res.valid, true);
  assert.equal(res.meetsCompositeRule, true);
});

test('password policy rejects short or missing-number passwords under 15 chars', () => {
  assert.equal(validatePasswordPolicy('short1a').valid, false);
  assert.equal(validatePasswordPolicy('onlyletterspwd').valid, false);
  assert.equal(validatePasswordPolicy('1234567890').valid, false);
});

test('username format enforces lowercase alphanumeric/dot/underscore and length', () => {
  assert.equal(validateUsernameFormat('alumni.member18').valid, true);
  assert.equal(validateUsernameFormat('ab').valid, false);
  assert.equal(validateUsernameFormat('.badstart').valid, false);
  assert.equal(validateUsernameFormat('bad space').valid, false);
});

test('CLASS_OPTIONS includes PASSOUT', () => {
  assert.equal(CLASS_OPTIONS.includes('PASSOUT'), true);
});

test('isProfileComplete rejects blank trigger-created profile rows', () => {
  assert.equal(isProfileComplete(null), false);
  assert.equal(
    isProfileComplete({
      full_name: '',
      admission_number: '',
      class: '',
      batch: '',
    }),
    false
  );
  assert.equal(
    isProfileComplete({
      full_name: 'Alumni Member',
      admission_number: 'GV-2020-108',
      class: 'PASSOUT',
      batch: '2020',
    }),
    true
  );
});

test('isMissingColumnSchemaError detects PostgREST schema cache missing column errors', () => {
  assert.equal(
    isMissingColumnSchemaError({
      code: 'PGRST204',
      message: "Could not find the 'avatar_url' column of 'profiles' in the schema cache",
    }),
    true
  );
  assert.equal(
    isMissingColumnSchemaError({
      message: 'duplicate key value violates unique constraint',
    }),
    false
  );
});

test('parseSupabaseCallbackUrl extracts PKCE code and auth_callback cleanly', () => {
  const parsed = parseSupabaseCallbackUrl('?auth_callback=signup&code=pkce-12345', '');
  assert.equal(parsed.hasCallback, true);
  assert.equal(parsed.pkceCode, 'pkce-12345');
  assert.equal(parsed.authCallback, 'signup');
});

test('parseSupabaseCallbackUrl extracts implicit access_token from hash fragment', () => {
  const parsed = parseSupabaseCallbackUrl(
    '?auth_callback=signup',
    '#access_token=abc.def&refresh_token=r1&type=signup'
  );
  assert.equal(parsed.hasCallback, true);
  assert.equal(parsed.accessToken, 'abc.def');
  assert.equal(parsed.refreshToken, 'r1');
  assert.equal(parsed.callbackType, 'signup');
});

test('resolveSessionRouteAction prompts sign out when already-onboarded user opens Sign Up', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'signup',
      user: { email_verified: true },
      hasProfile: true,
      deviceVerified: false, // Even if device isn't trusted, Sign Up must NOT switch to Login OTP!
    }),
    { action: 'prompt_signout' }
  );
});

test('resolveSessionRouteAction keeps unverified user on email verification step', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'signup',
      user: { email_verified: false },
      hasProfile: false,
      deviceVerified: false,
    }),
    { action: 'signup_verify_email' }
  );
});

test('resolveSessionRouteAction routes verified user without profile to onboarding', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'signup',
      user: { email_verified: true },
      hasProfile: false,
      deviceVerified: false,
    }),
    { action: 'signup_onboarding' }
  );
});

test('resolveSessionRouteAction triggers new-device OTP only on Login for untrusted device', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'login',
      user: { email_verified: true },
      hasProfile: true,
      deviceVerified: false,
    }),
    { action: 'login_device_otp' }
  );
});

test('resolveSessionRouteAction redirects to dashboard on Login when verified + onboarded + trusted', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'login',
      user: { email_verified: true },
      hasProfile: true,
      deviceVerified: true,
    }),
    { action: 'redirect_dashboard' }
  );
});

test('resolveSessionRouteAction allows existing OAuth user returning via Google on Sign Up tab to log in or trigger new-device OTP', () => {
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'signup',
      user: { email_verified: true },
      hasProfile: true,
      deviceVerified: false,
      allowExistingAccountLogin: true,
    }),
    { action: 'login_device_otp' }
  );
  assert.deepEqual(
    resolveSessionRouteAction({
      activeTab: 'signup',
      user: { email_verified: true },
      hasProfile: true,
      deviceVerified: true,
      allowExistingAccountLogin: true,
    }),
    { action: 'redirect_dashboard' }
  );
});
