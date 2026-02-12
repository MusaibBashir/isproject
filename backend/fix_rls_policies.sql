-- ============================================
-- COMPREHENSIVE FIX: RLS Policies for ALL tables
-- Run this in Supabase SQL Editor
-- This drops ALL old policies and creates clean ones
-- ============================================

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile insert" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function (bypasses RLS for admin check)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Allow profile insert" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin());

-- ==========================================
-- 2. FRANCHISES TABLE
-- ==========================================
DROP POLICY IF EXISTS "Admins can do everything with franchises" ON franchises;
DROP POLICY IF EXISTS "Franchise owners can view own franchise" ON franchises;

ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with franchises" ON franchises
    FOR ALL TO authenticated
    USING (public.is_admin());

CREATE POLICY "Franchise owners can view own franchise" ON franchises
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

-- ==========================================
-- 3. INVENTORY TABLE — drop ALL old policies
-- ==========================================
-- Drop any pre-existing policies (common names)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'inventory'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON inventory', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Admins see everything
CREATE POLICY "Admins can access all inventory" ON inventory
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Franchise users only see their own franchise's inventory
CREATE POLICY "Franchise users access own inventory" ON inventory
    FOR ALL TO authenticated
    USING (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

-- ==========================================
-- 4. SALES TABLE — drop ALL old policies
-- ==========================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'sales'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Admins see everything
CREATE POLICY "Admins can access all sales" ON sales
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Franchise users only see their own franchise's sales
CREATE POLICY "Franchise users access own sales" ON sales
    FOR ALL TO authenticated
    USING (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

-- ==========================================
-- 5. SALE_ITEMS TABLE — drop ALL old policies
-- ==========================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'sale_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sale_items', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Admins see everything
CREATE POLICY "Admins can access all sale_items" ON sale_items
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Franchise users: sale_items linked to their sales
CREATE POLICY "Franchise users access own sale_items" ON sale_items
    FOR ALL TO authenticated
    USING (
        sale_id IN (
            SELECT id FROM sales 
            WHERE franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
        )
    );

-- ==========================================
-- 6. CUSTOMERS TABLE — shared for now (no franchise_id)
-- ==========================================
-- Customers are shared across franchises. 
-- If you want per-franchise customers later, add franchise_id column.
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'customers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON customers', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can access customers
CREATE POLICY "Authenticated users can access customers" ON customers
    FOR ALL TO authenticated
    USING (true);

-- ==========================================
-- DONE! Verify policies
-- ==========================================
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
