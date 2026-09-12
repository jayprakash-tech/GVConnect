# GVConnect — Grizzly Vidyalya Alumni Network

A premium, mobile-first web app for reconnecting Grizzly Vidyalya alumni.

## 🎨 Design Theme

- **Maroon** (primary): `maroon-700` → `maroon-950`
- **Warm Amber/Gold** (accents): `amber-warm-400` → `amber-warm-600`
- **Clean Slate** (backgrounds): `slate-clean-50` → `slate-clean-200`
- **Typography**: Inter (sans-serif)

## 📁 File Structure

```
gvconnect/
├── index.html                      ← Root HTML (title, fonts)
├── vercel.json                     ← Vercel SPA routing config
├── netlify.toml                    ← Netlify SPA routing config
├── public/
│   ├── _redirects                  ← Netlify fallback
│   └── 404.html                    ← GitHub Pages SPA handler
├── src/
│   ├── App.tsx                     ← Router (/ , /auth, /dashboard)
│   ├── main.tsx                    ← React entry
│   ├── index.css                   ← Tailwind theme
│   ├── context/
│   │   └── AuthContext.tsx          ← Auth state (user, signOut)
│   ├── components/
│   │   └── ProtectedRoute.tsx       ← Middleware equivalent
│   ├── pages/
│   │   ├── LandingPage.tsx          ← / (Hero + CTA)
│   │   ├── AuthPage.tsx             ← /auth (Multi-step flow)
│   │   └── DashboardPage.tsx        ← /dashboard (Protected)
│   └── utils/
│       └── supabase/
│           └── client.ts            ← Supabase client
├── .env                            ← Your credentials
└── .env.example                    ← Template
```

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   Create `.env` file:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Database Schema** (run in Supabase SQL Editor):
   ```sql
   CREATE TABLE public.profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     full_name TEXT NOT NULL,
     admission_number TEXT NOT NULL,
     class TEXT NOT NULL,
     batch TEXT NOT NULL,
     email TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Profiles viewable by everyone"
     ON public.profiles FOR SELECT USING (true);

   CREATE POLICY "Users can insert own profile"
     ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can update own profile"
     ON public.profiles FOR UPDATE USING (auth.uid() = id);
   ```

4. **Supabase Auth Settings:**
   - Go to Authentication → Providers → Email
   - Disable "Confirm email" for OTP flow

5. **Run:**
   ```bash
   npm run dev
   ```

## 🎯 Routes

| Path | Description | Protected |
|------|-------------|-----------|
| `/` | Landing page with hero | ❌ |
| `/auth` | Multi-step auth flow | ❌ |
| `/dashboard` | Welcome page | ✅ |

## 🔐 Auth Flow

1. **Email** → Enter email → Send OTP
2. **OTP** → 6-digit verification
3. **Check User** → Query profiles table
   - **New User** → Profile setup (Name, Admission #, Class, Batch, Password)
   - **Existing User** → Password login
4. **Redirect** → `/dashboard`

## 🌐 Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
Build: `npm run build` → Deploy `dist/` folder

### GitHub Pages
Build: `npm run build` → Deploy `dist/` folder (uses 404.html for SPA)

## 📝 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS v4
- **Auth**: Supabase
- **Routing**: React Router v6
- **Icons**: Lucide React

## ✅ Build Status

```
✓ Build successful
✓ No TypeScript errors
✓ SPA routing configured for all hosts
```
