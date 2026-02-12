-- ============================================
-- Fix: RLS Policies for profiles table
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate with simpler, working policies

-- 1. Any authenticated user can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 2. Admins can view ALL profiles (uses security definer function to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 3. Allow profile creation (for trigger and admin)
CREATE POLICY "Allow profile insert" ON profiles
    FOR INSERT
    WITH CHECK (true);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 5. Admins can update any profile
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());
