-- ============================================
-- Migration: Admin & Franchise Separation
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'franchise' CHECK (role IN ('admin', 'franchise')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    state TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add franchise_id to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id);

-- 4. Add franchise_id to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_franchise ON inventory(franchise_id);
CREATE INDEX IF NOT EXISTS idx_sales_franchise ON sales(franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchises_owner ON franchises(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 6. Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR auth.uid() = id
    );

-- 8. RLS Policies for franchises
CREATE POLICY "Admins can do everything with franchises" ON franchises
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Franchise owners can view own franchise" ON franchises
    FOR SELECT USING (owner_id = auth.uid());

-- 9. RLS Policies for inventory (update existing)
CREATE POLICY "Admins can access all inventory" ON inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Franchise users access own inventory" ON inventory
    FOR ALL USING (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

-- 10. RLS Policies for sales (update existing)
CREATE POLICY "Admins can access all sales" ON sales
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Franchise users access own sales" ON sales
    FOR ALL USING (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

-- 11. Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'franchise'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
