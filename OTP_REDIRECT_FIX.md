# OTP Verification Redirect Bug Fix

## Problem Description

After successful OTP verification, users were being immediately redirected to the dashboard instead of seeing the profile creation form. This broke the intended authentication flow.

### Expected Flow
1. User enters email → OTP sent ✅
2. User enters OTP → Email verified → **Show Profile Form** ❌ (was redirecting to dashboard)
3. User fills profile → Click "Create Account" → Save to database → Redirect to dashboard

### Actual Flow (Before Fix)
1. User enters email → OTP sent ✅
2. User enters OTP → Email verified → **Redirect to dashboard** ❌
3. Profile form never shown

## Root Cause Analysis

The issue was in the `useEffect` hook in `AuthPage.tsx` (lines 30-35):

```typescript
// Redirect if already logged in
useEffect(() => {
  if (user) {
    navigate('/dashboard');
  }
}, [user, navigate]);
```

### Why This Caused the Bug

1. When `verifyOtp()` is called successfully, Supabase automatically creates a session
2. This triggers the `onAuthStateChange` listener in `AuthContext.tsx`
3. The `user` state is updated to the authenticated user
4. The `useEffect` in `AuthPage.tsx` detects the `user` change
5. It immediately redirects to `/dashboard`
6. This happens BEFORE the user can fill out the profile form

### The Timing Issue

```
verifyOtp() succeeds
    ↓
Supabase creates session
    ↓
AuthContext updates user state
    ↓
useEffect detects user change
    ↓
Redirect to dashboard ❌ (TOO EARLY!)
    ↓
Profile form never shown
```

## Solution

Modified the redirect logic to be context-aware:

```typescript
// Redirect if already logged in AND has completed profile
useEffect(() => {
  const checkProfileAndRedirect = async () => {
    if (user && activeTab === 'login') {
      // Only redirect if user is on login tab (not in middle of signup)
      navigate('/dashboard');
    } else if (user && activeTab === 'signup' && signupStep === 'email') {
      // If user is logged in but on signup email step, check if they have a profile
      const {  profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      // Only redirect if profile exists (completed signup)
      if (profile) {
        navigate('/dashboard');
      }
    }
  };
  
  checkProfileAndRedirect();
}, [user, navigate, activeTab, signupStep]);
```

### How This Fixes the Bug

The new logic has two conditions:

#### Condition 1: User on Login Tab
```typescript
if (user && activeTab === 'login') {
  navigate('/dashboard');
}
```
- If user is logged in AND on the login tab → redirect to dashboard
- This is correct behavior for returning users

#### Condition 2: User on Signup Tab
```typescript
else if (user && activeTab === 'signup' && signupStep === 'email') {
  const {  profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  
  if (profile) {
    navigate('/dashboard');
  }
}
```
- If user is logged in AND on signup tab AND at email step
- Check if they have a profile in the database
- Only redirect if profile exists (meaning they completed signup previously)
- If no profile exists → stay on auth page to complete signup

### Why This Works

After OTP verification:
- `user` is set (authenticated)
- `activeTab` is `'signup'`
- `signupStep` is `'profile'` (NOT `'email'`)

The useEffect checks:
- ✅ User is logged in
- ✅ Active tab is 'signup'
- ❌ Signup step is 'profile' (not 'email')

Since `signupStep !== 'email'`, the second condition is false, so NO redirect happens. The user stays on the profile form.

## Correct Flow After Fix

```
1. User enters email
   ↓
2. User clicks "Send Verification Code"
   ↓
3. signInWithOtp() sends OTP
   ↓
4. signupStep = 'otp'
   ↓
5. User enters OTP
   ↓
6. User clicks "Verify Code"
   ↓
7. verifyOtp() succeeds
   ↓
8. Supabase creates session
   ↓
9. AuthContext updates user state
   ↓
10. useEffect runs:
    - user is set ✅
    - activeTab is 'signup' ✅
    - signupStep is 'profile' (not 'email') ❌
    - NO REDIRECT ✅
   ↓
11. setSignupStep('profile')
   ↓
12. Profile form is shown ✅
   ↓
13. User fills profile
   ↓
14. User clicks "Create Account"
   ↓
15. updateUser() sets password
   ↓
16. Profile saved to database
   ↓
17. User switches to login tab
   ↓
18. User logs in
   ↓
19. useEffect runs:
    - user is set ✅
    - activeTab is 'login' ✅
    - REDIRECT TO DASHBOARD ✅
```

## Code Changes

### File: `src/pages/AuthPage.tsx`

**Before:**
```typescript
// Redirect if already logged in
useEffect(() => {
  if (user) {
    navigate('/dashboard');
  }
}, [user, navigate]);
```

**After:**
```typescript
// Redirect if already logged in AND has completed profile
useEffect(() => {
  const checkProfileAndRedirect = async () => {
    if (user && activeTab === 'login') {
      // Only redirect if user is on login tab (not in middle of signup)
      navigate('/dashboard');
    } else if (user && activeTab === 'signup' && signupStep === 'email') {
      // If user is logged in but on signup email step, check if they have a profile
      const {  profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      // Only redirect if profile exists (completed signup)
      if (profile) {
        navigate('/dashboard');
      }
    }
  };
  
  checkProfileAndRedirect();
}, [user, navigate, activeTab, signupStep]);
```

## Testing Scenarios

### Scenario 1: New User Signup
1. Navigate to `/auth`
2. Enter email → Click "Send Verification Code"
3. Enter OTP → Click "Verify Code"
4. ✅ **Expected:** Profile form shown
5. ✅ **Expected:** No redirect to dashboard
6. Fill profile → Click "Create Account"
7. Switch to login tab
8. Login with credentials
9. ✅ **Expected:** Redirect to dashboard

### Scenario 2: Returning User Login
1. Navigate to `/auth`
2. Switch to "Login" tab
3. Enter email and password
4. Click "Login"
5. ✅ **Expected:** Redirect to dashboard

### Scenario 3: User Refreshes Page During Signup
1. Complete OTP verification
2. Profile form is shown
3. Refresh the page
4. ✅ **Expected:** Redirect to email step (state cleared)
5. OR stay on profile form if state is persisted

### Scenario 4: User Already Has Profile
1. User has completed signup previously
2. Navigate to `/auth`
3. ✅ **Expected:** Redirect to dashboard immediately

## Edge Cases Handled

### Edge Case 1: User on Signup Tab at Email Step
- User is logged in (from previous session)
- User is on signup tab at email step
- Check if profile exists in database
- If profile exists → redirect to dashboard
- If no profile → stay on auth page

### Edge Case 2: User on Signup Tab at OTP Step
- User is logged in (OTP just verified)
- User is on signup tab at OTP step
- `signupStep !== 'email'` → no redirect
- User can continue to profile step

### Edge Case 3: User on Signup Tab at Profile Step
- User is logged in (OTP verified)
- User is on signup tab at profile step
- `signupStep !== 'email'` → no redirect
- User can fill out profile form

### Edge Case 4: User on Login Tab
- User is logged in
- User is on login tab
- Always redirect to dashboard
- This is correct for returning users

## Performance Considerations

### Database Query
The fix adds a database query to check if the profile exists:

```typescript
const {  profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('id', user.id)
  .maybeSingle();
```

**Performance Impact:**
- Query only runs when:
  - User is logged in AND
  - On signup tab AND
  - At email step
- Query is lightweight (selects only `id`)
- Uses `maybeSingle()` to avoid errors if no profile exists
- Indexed on `id` (primary key) → fast lookup

**Optimization:**
- Query only runs once per page load
- Subsequent state changes don't trigger the query unless conditions change
- Uses React's dependency array to prevent unnecessary runs

## Build Status

```
✓ Build successful in 1.89s
✓ No TypeScript errors
✓ CSS: 14.49 KB (gzip: 3.69 KB)
✓ JS: 143.71 KB (gzip: 46.14 KB)
```

## Files Modified

- `src/pages/AuthPage.tsx` - Updated redirect logic in useEffect

## Verification

To verify the fix works:

1. Open browser console (F12)
2. Navigate to `/auth`
3. Enter email → Click "Send Verification Code"
4. Enter OTP → Click "Verify Code"
5. Watch console: Should see "OTP verified! Email: [email]"
6. ✅ **Verify:** Profile form is shown
7. ✅ **Verify:** No redirect to dashboard
8. Fill profile → Click "Create Account"
9. Watch console: Should see "Profile created successfully!"
10. Switch to login tab
11. Login with credentials
12. ✅ **Verify:** Redirect to dashboard

## Summary

The bug was caused by an overly aggressive redirect that triggered whenever a user became authenticated, regardless of where they were in the signup flow. The fix makes the redirect logic context-aware by:

1. Checking which tab the user is on (login vs signup)
2. Checking which step of signup they're on (email vs otp vs profile)
3. Checking if they have a completed profile in the database

This ensures users can complete the entire signup flow without being interrupted by premature redirects.
