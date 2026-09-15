# Email Not Sending - Troubleshooting Guide

## Issue
OTP emails are not being sent to new users.

## ✅ Code Fixes Applied

### 1. Removed `shouldCreateUser: false`
**Problem:** This option was preventing emails from being sent.

**Fix:** Removed the option from both `handleSendOTP` and `handleResendOTP` functions.

```typescript
// BEFORE (WRONG)
const { error } = await supabase.auth.signInWithOtp({
  email: email.trim().toLowerCase(),
  options: {
    shouldCreateUser: false  // ❌ This prevents emails
  }
});

// AFTER (CORRECT)
const { error } = await supabase.auth.signInWithOtp({
  email: email.trim().toLowerCase(),
  options: {
    emailRedirectTo: `${window.location.origin}/auth`
  }
});
```

### 2. Added Cache-Busting Headers
**Problem:** Browser caching old JavaScript bundles.

**Fix:** Added meta tags to `index.html`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### 3. Enhanced Error Logging
**Problem:** Hard to diagnose email sending issues.

**Fix:** Added detailed console logging:
```typescript
console.log('Attempting to send OTP to:', normalizedEmail);
console.log('OTP sent successfully!');
console.log('Response data:', data);
console.log('Email:', normalizedEmail);

// On error
console.error('OTP Error:', error);
console.error('Error details:', {
  message: error.message,
  status: error.status,
  name: error.name
});
```

---

## 🔧 Supabase Configuration Checklist

### Step 1: Check Email Provider
1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Verify:
   - ✅ **Enable Email provider** is ON
   - ✅ **Confirm email** is configured
   - ✅ Email template is set up

### Step 2: Disable Email Confirmations (For OTP Flow)
1. Go to **Authentication** → **Providers** → **Email**
2. Find **Confirm email** setting
3. **Turn OFF** "Confirm email" (we use OTP instead)
4. Save changes

### Step 3: Check Email Template
1. Go to **Authentication** → **Email Templates**
2. Select **Magic Link** template
3. Verify it contains the OTP code placeholder: `{{ .Token }}`
4. Test the template

### Step 4: Check Rate Limits
1. Go to **Authentication** → **Rate Limits**
2. Verify OTP rate limits:
   - Should allow at least 5 OTP requests per hour per email
   - Adjust if needed

### Step 5: Check Project Status
1. Go to **Project Settings** → **General**
2. Verify project is **Active**
3. Check if you've exceeded free tier limits

---

## 🧪 Testing Steps

### Test 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Enter email and click "Send Verification Code"
4. Look for these logs:
   ```
   Attempting to send OTP to: your@email.com
   OTP sent successfully!
   Response data: {...}
   Email: your@email.com
   ```

### Test 2: Check for Errors
If you see errors in console:
- **429 Too Many Requests**: Rate limit exceeded, wait 1 hour
- **400 Bad Request**: Invalid email format
- **401 Unauthorized**: Supabase credentials issue
- **500 Internal Server Error**: Supabase server issue

### Test 3: Check Supabase Logs
1. Go to **Supabase Dashboard** → **Logs**
2. Filter by **Auth** logs
3. Look for OTP-related entries
4. Check for any error messages

### Test 4: Check Email Delivery
1. Check inbox for OTP email
2. Check spam/junk folder
3. Check other email folders
4. Try a different email address

### Test 5: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select **"Empty Cache and Hard Reload"**
4. Try sending OTP again

---

## 🚨 Common Issues & Solutions

### Issue 1: "Email provider not configured"
**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email provider
3. Configure email settings
4. Save changes

### Issue 2: "Rate limit exceeded"
**Solution:**
1. Wait 1 hour before trying again
2. Or increase rate limits in Supabase settings
3. Or upgrade to Pro plan for higher limits

### Issue 3: "Invalid email format"
**Solution:**
1. Check email format is valid
2. Remove any spaces or special characters
3. Use a real email address (not test@localhost)

### Issue 4: Email not arriving
**Solution:**
1. Check spam/junk folder
2. Verify email provider is configured
3. Check Supabase logs for delivery status
4. Try a different email provider (Gmail, Outlook, etc.)
5. Check if email domain is blocked

### Issue 5: "User already registered"
**Solution:**
This is expected for existing users. They should use the Login tab instead.

### Issue 6: Cache issues
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Try incognito/private mode
4. Check cache-busting meta tags in index.html

---

## 🔍 Debug Checklist

Run through this checklist to diagnose the issue:

- [ ] Supabase project is active
- [ ] Email provider is enabled
- [ ] Email confirmations are disabled (for OTP flow)
- [ ] Email template is configured correctly
- [ ] Rate limits are not exceeded
- [ ] Browser console shows "OTP sent successfully"
- [ ] No errors in browser console
- [ ] No errors in Supabase logs
- [ ] Email is not in spam folder
- [ ] Tried different email address
- [ ] Cleared browser cache
- [ ] Tried incognito mode
- [ ] Checked network tab for API calls
- [ ] Verified Supabase URL and anon key are correct

---

## 📞 If Still Not Working

### 1. Check Supabase Configuration
```typescript
// In src/utils/supabase/client.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Not set');
```

### 2. Test Supabase Connection
```typescript
// Add this temporarily to test
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data);
console.log('Error:', error);
```

### 3. Check Environment Variables
Make sure `.env` file has:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Verify Supabase Project
- Project ID matches URL
- Project is not paused
- Project is within free tier limits

---

## 🎯 Quick Fix Steps

If emails are still not sending, try these steps in order:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard reload** (Ctrl+Shift+R)
3. **Check Supabase dashboard** for any alerts
4. **Verify email provider** is enabled
5. **Disable email confirmations** in Supabase settings
6. **Check Supabase logs** for errors
7. **Try a different email** address
8. **Check spam folder**
9. **Wait 1 hour** (rate limit reset)
10. **Restart Supabase project** (Settings → Restart project)

---

## 📊 Build Status

```
✓ Build successful
✓ Cache-busting headers added
✓ Enhanced error logging added
✓ shouldCreateUser option removed
✓ All TypeScript errors resolved
```

---

## 📝 Next Steps

1. **Test the OTP flow** with a new email address
2. **Check browser console** for detailed logs
3. **Check Supabase logs** for delivery status
4. **Verify email arrives** in inbox (not spam)
5. **Enter OTP** and verify it works
6. **Complete profile creation**
7. **Test login** with created account

---

## 🔗 Useful Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Email Provider](https://supabase.com/docs/guides/auth/auth-helpers/email)
- [Supabase OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase Rate Limits](https://supabase.com/docs/guides/platform/rate-limits)

---

**Status: ✅ Code fixes applied, awaiting Supabase configuration verification**
