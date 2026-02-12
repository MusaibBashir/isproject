-- Fix: Allow same SKU to exist for different franchises
-- The old constraint only allowed one row per SKU globally,
-- which prevents franchise-specific inventory rows.

-- 1. Drop the old unique constraint on sku alone
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_sku_key;

-- 2. Add a new composite unique constraint on (sku, franchise_id)
-- This allows: SKU "ABC-001" with franchise_id=NULL (warehouse)
--          AND: SKU "ABC-001" with franchise_id='some-uuid' (franchise copy)
-- But prevents duplicate SKUs within the same franchise.
CREATE UNIQUE INDEX inventory_sku_franchise_unique 
ON inventory (sku, COALESCE(franchise_id, '00000000-0000-0000-0000-000000000000'));
