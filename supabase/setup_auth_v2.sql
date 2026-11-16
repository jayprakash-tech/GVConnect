-- ============================================
-- GVConnect Auth v2: Usernames, Batch Compliance & Onboarding
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS compliance_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compliance_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_goal TEXT,
ADD COLUMN IF NOT EXISTS onboarding_bio TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL;

-- Check username availability safely from client
CREATE OR REPLACE FUNCTION public.is_username_available(candidate_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(TRIM(candidate_username))
  );
$$;

-- Resolve username or email to login email safely
CREATE OR REPLACE FUNCTION public.resolve_login_email(login_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email FROM public.profiles
  WHERE LOWER(username) = LOWER(TRIM(login_identifier))
     OR LOWER(email) = LOWER(TRIM(login_identifier))
  LIMIT 1;
$$;
