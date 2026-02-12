-- ============================================
-- Migration: Stock Orders System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Stock orders table (franchise requests stock from admin)
CREATE TABLE IF NOT EXISTS stock_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES franchises(id) NOT NULL,
    franchise_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stock order line items
CREATE TABLE IF NOT EXISTS stock_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES stock_orders(id) ON DELETE CASCADE NOT NULL,
    sku TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_stock_orders_franchise ON stock_orders(franchise_id);
CREATE INDEX IF NOT EXISTS idx_stock_orders_status ON stock_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_order_items_order ON stock_order_items(order_id);

-- 4. Enable RLS
ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for stock_orders
CREATE POLICY "Admins can do everything with stock_orders" ON stock_orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Franchise users can view own stock_orders" ON stock_orders
    FOR SELECT USING (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

CREATE POLICY "Franchise users can insert own stock_orders" ON stock_orders
    FOR INSERT WITH CHECK (
        franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
    );

-- 6. RLS Policies for stock_order_items
CREATE POLICY "Admins can do everything with stock_order_items" ON stock_order_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Franchise users can view own stock_order_items" ON stock_order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM stock_orders
            WHERE franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
        )
    );

CREATE POLICY "Franchise users can insert own stock_order_items" ON stock_order_items
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM stock_orders
            WHERE franchise_id IN (SELECT id FROM franchises WHERE owner_id = auth.uid())
        )
    );
