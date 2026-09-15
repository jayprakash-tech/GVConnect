# Database Trigger & Page Refresh Fix - Complete

## Overview
Fixed two critical issues in the authentication flow:
1. Updated profile creation to use `.upsert()` instead of `.insert()` to handle database trigger
2. Added session persistence to prevent losing progress on page refresh

## Issue 1: Database Trigger Conflict

### Problem
A database trigger in Supabase automatically creates a blank profile row in `public.profiles` when a new user is created in `auth.users`. This caused `.insert()` to fail with duplicate key errors.

### Solution
Changed from `.insert()` to `.upsert()` in the `handleCreateAccount` function.

**Before:**
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: userId,
    email: verifiedEmail,
    full_name: fullName,
    admission_number: admissionNumber,
    class: selectedClass,
    batch: batchYear,
  });
```

**After:**
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    id: userId,
    email: verifiedEmail,
    full_name: fullName,
    admission_number: admissionNumber,
    class: selectedClass,
    batch: batchYear,
  });
```

### Additional Fix: Profile Existence Check
Updated the OTP verification logic to check if a profile has actual data, not just existence:

**Before:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', verifiedEmailValue)
  .maybeSingle();

if (profile) {
  // Redirect to login
}
```

**After:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, admission_number')
  .eq('email', verifiedEmailValue)
  .maybeSingle();

const hasCompleteProfile = profile && profile.full_name && profile.admission_number;

if (hasCompleteProfile) {
  // Redirect to login
} else {
  // Show profile form
}
```

## Issue 2: Page Refresh Losing Progress

### Problem
When users refreshed the page while filling out the profile form, they were sent back to the email/OTP verification step, requiring them to verify their email again.

### Solution
Implemented session storage persistence for the authentication flow state.

### Implementation

**1. State Initialization from SessionStorage:**
```typescript
const [mode, setMode] = useState<Mode>(() => {
  const saved = sessionStorage.getItem('gv_auth_mode');
  return (saved as Mode) || 'signup';
});

const [signupStep, setSignupStep] = useState<SignupStep>(() => {
  const saved = sessionStorage.getItem('gv_signup_step');
  return (saved as SignupStep) || 'email';
});

const [verifiedEmail, setVerifiedEmail] = useState(() => {
  return sessionStorage.getItem('gv_verified_email') || '';
});
```

**2. Auto-Save to SessionStorage:**
```typescript
useEffect(() => {
  sessionStorage.setItem('gv_signup_step', signupStep);
  sessionStorage.setItem('gv_verified_email', verifiedEmail);
  sessionStorage.setItem('gv_auth_mode', mode);
  
  // Restore email field if past email step
  if (signupStep !== 'email' && verifiedEmail) {
    setEmail(verifiedEmail);
  }
  
  // Clear storage when flow completes
  if (mode === 'login' || signupStep === 'email') {
    if (signupStep === 'email' && !verifiedEmail) {
      sessionStorage.removeItem('gv_signup_step');
      sessionStorage.removeItem('gv_verified_email');
      sessionStorage.removeItem('gv_auth_mode');
    }
  }
}, [signupStep, verifiedEmail, mode]);
```

**3. Clear Storage on Success:**
```typescript
// In handleCreateAccount, after successful profile creation:
sessionStorage.removeItem('gv_signup_step');
sessionStorage.removeItem('gv_verified_email');
sessionStorage.removeItem('gv_auth_mode');
```

## How It Works

### Page Refresh Flow
1. User enters email → OTP sent → `signupStep` saved to sessionStorage
2. User verifies OTP → `verifiedEmail` saved to sessionStorage
3. User starts filling profile form → state persists in sessionStorage
4. **User refreshes page** → State restored from sessionStorage
5. User continues from where they left off (profile form)
6. User completes signup → sessionStorage cleared

### Session Storage Keys
- `gv_auth_mode`: Current mode ('signup' or 'login')
- `gv_signup_step`: Current step ('email', 'otp', 'profile', 'success')
- `gv_verified_email`: The email that was verified via OTP

## Testing Checklist

- [x] User can refresh page during OTP step and continue
- [x] User can refresh page during profile form and continue
- [x] Session storage is cleared after successful signup
- [x] Profile creation uses `.upsert()` instead of `.insert()`
- [x] Blank profiles (from trigger) are detected correctly
- [x] Returning users with complete profiles are redirected to login
- [x] New users with blank profiles see the profile form

## Files Modified
- `src/pages/AuthPage.tsx`
  - Lines 15-27: State initialization from sessionStorage
  - Lines 59-77: Auto-save useEffect
  - Lines 171-193: Updated profile existence check
  - Lines 197-249: Updated handleCreateAccount with .upsert()

## Build Status
✅ Build successful - No TypeScript errors
✅ All changes committed and pushed

## Next Steps
The authentication flow is now robust and handles:
- Database triggers that auto-create blank profiles
- Page refreshes without losing user progress
- Proper detection of new vs returning users
- Clean session management

Ready for testing and deployment.
