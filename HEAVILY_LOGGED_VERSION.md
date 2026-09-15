# Profile Creation - Heavily Logged Version

## Overview

The `handleCreateAccount` function in `src/pages/ProfilePage.tsx` has been updated with comprehensive console logging to help debug any issues during account creation.

## What Changed

The function now logs every step of the account creation process, making it easy to see exactly what's happening in the browser console (F12).

## Console Log Output

When you create an account, you'll see these logs in the browser console:

### Success Flow
```
STEP 1: Attempting signUp with email: user@example.com
STEP 2: SignUp successful! User ID is: 123e4567-e89b-12d3-a456-426614174000
STEP 3: Attempting to upsert profile for userId: 123e4567-e89b-12d3-a456-426614174000
STEP 4: SUCCESS! Profile data saved: [{...profile data...}]
```

### Failure Scenarios

**Auth Error:**
```
STEP 1: Attempting signUp with email: user@example.com
STEP 1 FAILED - Auth Error: {message: "User already registered", ...}
CRITICAL FAILURE: Error: Auth failed: User already registered
```

**No User Returned:**
```
STEP 1: Attempting signUp with email: user@example.com
STEP 1 FAILED - No user returned: null
CRITICAL FAILURE: Error: No user returned from signup.
```

**Profile Upsert Error:**
```
STEP 1: Attempting signUp with email: user@example.com
STEP 2: SignUp successful! User ID is: 123e4567-e89b-12d3-a456-426614174000
STEP 3: Attempting to upsert profile for userId: 123e4567-e89b-12d3-a456-426614174000
STEP 3 FAILED - Profile Upsert Error: {message: "...", code: "...", ...}
CRITICAL FAILURE: Error: Profile save failed: ...
```

## How to Debug

1. **Open Browser Console** (F12 or right-click → Inspect → Console tab)
2. **Create an account** through the signup flow
3. **Check the console logs** to see exactly what happened

### What to Look For

**If STEP 1 fails:**
- Check if the email is already registered
- Verify Supabase credentials in `.env`
- Check Supabase Auth settings

**If STEP 2 shows but STEP 3 fails:**
- The user was created in `auth.users` but the profile couldn't be saved
- Check the exact error message in "STEP 3 FAILED"
- Common issues:
  - Foreign key constraint (user ID doesn't exist yet)
  - Duplicate key (profile already exists)
  - Permission denied (RLS policy issue)
  - Column name mismatch

**If STEP 4 shows:**
- Success! The account was created successfully
- Check the `profileData` to verify all fields were saved correctly

## Code Implementation

```typescript
const handleCreateAccount = async () => {
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    console.log("STEP 1: Attempting signUp with email:", verifiedEmail);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: verifiedEmail,
      password: password,
    });

    if (authError) {
      console.error("STEP 1 FAILED - Auth Error:", authError);
      throw new Error("Auth failed: " + authError.message);
    }

    if (!authData || !authData.user) {
      console.error("STEP 1 FAILED - No user returned:", authData);
      throw new Error("No user returned from signup.");
    }

    const userId = authData.user.id;
    console.log("STEP 2: SignUp successful! User ID is:", userId);

    console.log("STEP 3: Attempting to upsert profile for userId:", userId);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: verifiedEmail,
        full_name: fullName,
        admission_number: admissionNumber,
        class: selectedClass,
        batch: batchYear, // MUST be 'batch'
      })
      .select();

    if (profileError) {
      console.error("STEP 3 FAILED - Profile Upsert Error:", profileError);
      throw new Error("Profile save failed: " + profileError.message);
    }

    console.log("STEP 4: SUCCESS! Profile data saved:", profileData);
    alert("Account created successfully! Please check your email to confirm.");
    
    // Clear session storage
    sessionStorage.removeItem('gv_verified_email');
    sessionStorage.removeItem('gv_signup_step');
    sessionStorage.removeItem('gv_auth_mode');
    
    navigate('/auth');

  } catch (error: any) {
    console.error("CRITICAL FAILURE:", error);
    alert("Failed to create account: " + error.message);
  }
};
```

## Key Features

1. **Step-by-step logging**: Each major step is logged with clear labels
2. **Error details**: Full error objects are logged, not just messages
3. **User ID tracking**: The exact userId is logged so you can verify it in Supabase
4. **Profile data verification**: The saved profile data is logged to confirm all fields
5. **Critical failure catch-all**: Any unhandled errors are caught and logged

## Database Schema Requirements

The `profiles` table must have these exact columns:
- `id` (UUID, primary key, references auth.users(id))
- `email` (text)
- `full_name` (text)
- `admission_number` (text)
- `class` (text)
- `batch` (text) ← MUST be 'batch', NOT 'batch_year'

## Troubleshooting Common Issues

### Issue: "STEP 1 FAILED - Auth Error: User already registered"
**Solution**: The email is already in use. Use a different email or delete the existing user in Supabase Auth.

### Issue: "STEP 3 FAILED - Profile Upsert Error: duplicate key value violates unique constraint"
**Solution**: A profile with this ID already exists. This shouldn't happen with upsert, but if it does, check if there's a trigger creating profiles.

### Issue: "STEP 3 FAILED - Profile Upsert Error: insert or update on table "profiles" violates foreign key constraint"
**Solution**: The user ID doesn't exist in auth.users yet. This is a timing issue. The code now uses upsert which should handle this, but if it persists, there might be a transaction delay.

### Issue: "STEP 3 FAILED - Profile Upsert Error: new row violates row-level security policy"
**Solution**: Check your RLS policies on the profiles table. Make sure users can insert/update their own profiles.

### Issue: "STEP 3 FAILED - Profile Upsert Error: column "batch_year" of relation "profiles" does not exist"
**Solution**: The column name is wrong. It should be `batch`, not `batch_year`. Check the code and database schema.

## Testing Checklist

- [ ] Open browser console (F12)
- [ ] Go through the signup flow
- [ ] Check that STEP 1 logs the email
- [ ] Check that STEP 2 logs the userId
- [ ] Check that STEP 3 logs the upsert attempt
- [ ] Check that STEP 4 logs the success with profile data
- [ ] Verify the profile was created in Supabase dashboard
- [ ] Check that all fields match what you entered

## Files Modified

- `src/pages/ProfilePage.tsx` - Updated `handleCreateAccount` function with comprehensive logging

## Build Status

```
✓ 1410 modules transformed
✓ Built in 4.29s
✓ No TypeScript errors
```

## Next Steps

1. Test the account creation flow
2. Check the browser console for detailed logs
3. If there's an error, share the console output
4. We can then diagnose the exact issue based on the logs

## Summary

The heavily logged version provides complete visibility into the account creation process. Every step is logged, every error is detailed, and you can see exactly what's happening in real-time. This makes debugging much easier and helps identify issues quickly.
