# GVConnect - Fix: Supabase Configuration Error

## Problem
The app was crashing with a blank white screen and console error:
```
Uncaught Error: supabaseUrl is required
```

## Root Cause
The Supabase client was being initialized without environment variables. The code was using `import.meta.env.VITE_*` (correct for Vite) but the `.env` file was missing or not configured.

## Solution

### 1. Fixed Supabase Client (`src/utils/supabase/client.ts`)
- Added debug logging to show if env vars are set
- Added graceful fallback with placeholder values
- Added helpful error message in console

### 2. Updated AuthContext (`src/context/AuthContext.tsx`)
- Added `error` state to track configuration issues
- Checks if env vars are configured before attempting auth
- Shows helpful error instead of crashing

### 3. Updated App.tsx
- Added `ConfigError` component that shows when Supabase isn't configured
- Displays clear instructions on how to set up the `.env` file
- Prevents blank screen by showing helpful UI

### 4. Updated LoginPage
- Added check before sending OTP
- Shows error message if Supabase isn't configured
- Added try-catch for better error handling

### 5. Created `.env` file
- Template with placeholder values
- Prevents "undefined" errors

## How to Fix

### Step 1: Create `.env` file
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get these values:**
1. Go to https://supabase.com/dashboard/
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

### Step 2: Restart dev server
```bash
npm run dev
```

### Step 3: Verify in console
You should see:
```
Supabase URL: https://your-project-id.supabase.co
Supabase Key: [SET]
```

## Important Notes

### This is Vite, NOT Next.js
- ✅ Uses `import.meta.env.VITE_*` (Vite syntax)
- ❌ NOT `process.env.NEXT_PUBLIC_*` (Next.js syntax)
- ❌ Does NOT need `"use client"` directive (that's Next.js)

### Environment Variable Naming
- Must start with `VITE_` to be exposed to client code
- Case sensitive
- No quotes needed around values

### Security
- Only put the `anon` key in `.env` (it's public anyway)
- Never put the `service_role` key in client code
- Use Row Level Security (RLS) in Supabase to protect data

## Testing

After setting up `.env`:
1. Open browser console
2. Check for "Supabase URL:" and "Supabase Key:" logs
3. Try logging in with your email
4. Should receive OTP code

## Troubleshooting

### Still getting blank screen?
1. Check browser console for errors
2. Verify `.env` file exists in project root
3. Make sure variable names are exactly:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart dev server after creating `.env`

### Getting "Invalid API key" error?
- Double-check you copied the correct keys from Supabase
- Make sure there are no extra spaces or quotes
- Verify the URL format: `https://xxxxx.supabase.co`

### OTP not being sent?
- Check Supabase dashboard → Authentication → Providers → Email
- Make sure "Confirm email" is DISABLED for testing
- Check spam folder for the OTP email

## Next Steps

Once authentication is working:
1. Run the database schema in Supabase SQL Editor
2. Create the `profiles` table
3. Test the full auth flow: Email → OTP → Profile Setup
4. Proceed to Step 3 (Chat Interface)
