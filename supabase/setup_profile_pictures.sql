-- ============================================
-- Profile Picture & Password Change Setup
-- ============================================

-- 1. Add avatar_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create storage bucket for profile images
-- Run this in Supabase Dashboard → Storage → New Bucket
-- Bucket name: profile-images
-- Public bucket: YES (so images can be displayed)

-- 3. Set up Storage Policies for profile-images bucket

-- Policy 1: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Allow anyone to view avatars (public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- 4. Update existing profiles to have NULL avatar_url (optional)
-- This is just to ensure the column exists for all users
UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url IS NULL;

-- ============================================
-- Setup Instructions:
-- ============================================
-- 
-- 1. Run this SQL in Supabase SQL Editor
-- 
-- 2. Go to Supabase Dashboard → Storage
--    - Click "New Bucket"
--    - Name: profile-images
--    - Check "Public bucket"
--    - Click "Create bucket"
-- 
-- 3. The policies above will automatically allow:
--    - Users to upload their own profile pictures
--    - Users to update/delete their own pictures
--    - Anyone to view profile pictures (public)
-- 
-- 4. Test the feature:
--    - Go to Dashboard
--    - Click on your profile avatar
--    - Upload a profile picture
--    - Try changing your password
-- 
-- ============================================
