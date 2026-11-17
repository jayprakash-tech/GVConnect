import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_OPTIONS,
  parseSupabaseCallbackUrl,
  resolveSessionRouteAction,
  validatePasswordPolicy,
  validateUsernameFormat,
} from './authRules';

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
  assert.equal(validateUsernameFormat('rahul.sharma18').valid, true);
  assert.equal(validateUsernameFormat('ab').valid, false);
  assert.equal(validateUsernameFormat('.badstart').valid, false);
  assert.equal(validateUsernameFormat('bad space').valid, false);
});

test('CLASS_OPTIONS includes PASSOUT', () => {
  assert.equal(CLASS_OPTIONS.includes('PASSOUT'), true);
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
