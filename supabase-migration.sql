-- =================================================
-- SingBid Database Migration Script
-- Run this in your Supabase SQL Editor to add auto user creation
-- =================================================

-- ===================== AUTO USER CREATION FUNCTION =====================
-- Function to automatically create user records when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into user_profiles table with basic info
  INSERT INTO public.user_profiles (
    user_id,
    username,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== CREATE TRIGGER =====================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically call the function when a user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== UPDATE RLS POLICIES =====================
-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;

-- Add policies to allow inserts during user creation
CREATE POLICY "Allow user creation during signup" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

-- ===================== MIGRATION COMPLETE =====================
-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'SingBid auto user creation migration completed successfully!';
    RAISE NOTICE 'New users will now automatically get records in both users and user_profiles tables.';
    RAISE NOTICE 'Existing users in auth.users can be migrated by running the backfill script if needed.';
END
$$;