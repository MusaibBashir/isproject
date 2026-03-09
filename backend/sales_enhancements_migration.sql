-- ============================================
-- Migration: Sales Page Enhancements
-- Adds support for subtotal, discounts, tax, and payment methods
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add new columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- 2. Add new columns to sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2);

-- 3. Update existing sales to have subtotal equal to total (for backward compatibility)
UPDATE sales SET subtotal = total WHERE subtotal IS NULL;
