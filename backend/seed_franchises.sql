-- ============================================
-- Seed Data: Admin with 2 Franchises
-- Run this in Supabase SQL Editor AFTER migration.sql
-- ============================================

-- STEP 0: Get the admin user ID
-- Replace 'your-admin-email@example.com' with the actual admin email
-- or just hardcode the UUID from the "Profile Not Found" screen

DO $$
DECLARE
    admin_id UUID;
    franchise1_id UUID := gen_random_uuid();
    franchise2_id UUID := gen_random_uuid();
    sale1_id UUID;
    sale2_id UUID;
    sale3_id UUID;
    sale4_id UUID;
    sale5_id UUID;
    sale6_id UUID;
    cust1_id UUID;
    cust2_id UUID;
    cust3_id UUID;
    cust4_id UUID;
BEGIN
    -- Get admin user (first admin in profiles)
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found in profiles table. Please create an admin profile first.';
    END IF;

    RAISE NOTICE 'Using admin ID: %', admin_id;

    -- ========================================
    -- 1. Create 2 Franchises
    -- ========================================
    INSERT INTO franchises (id, name, region, state, owner_id, created_by, is_active, created_at)
    VALUES
        (franchise1_id, 'Mumbai Central Store', 'West India', 'Maharashtra', admin_id, admin_id, TRUE, NOW() - INTERVAL '30 days'),
        (franchise2_id, 'Bangalore Tech Hub', 'South India', 'Karnataka', admin_id, admin_id, TRUE, NOW() - INTERVAL '20 days');

    RAISE NOTICE 'Created franchises: % and %', franchise1_id, franchise2_id;

    -- ========================================
    -- 2. Add Inventory Items for Franchise 1 (Mumbai)
    -- ========================================
    INSERT INTO inventory (sku, barcode, item_name, category, price, quantity, description, franchise_id, date_added, last_updated)
    VALUES
        ('MUM-PHONE-001', '8901234567001', 'iPhone 15 Pro',        'Electronics',   134900, 25, 'Apple iPhone 15 Pro 256GB',           franchise1_id, NOW() - INTERVAL '25 days', NOW()),
        ('MUM-PHONE-002', '8901234567002', 'Samsung Galaxy S24',   'Electronics',    79999, 40, 'Samsung Galaxy S24 Ultra 256GB',       franchise1_id, NOW() - INTERVAL '25 days', NOW()),
        ('MUM-LAP-001',   '8901234567003', 'MacBook Air M3',       'Electronics',   114900, 15, 'Apple MacBook Air 15" M3 chip',       franchise1_id, NOW() - INTERVAL '20 days', NOW()),
        ('MUM-ACC-001',   '8901234567004', 'AirPods Pro 2',        'Accessories',    24900, 60, 'Apple AirPods Pro 2nd Gen',           franchise1_id, NOW() - INTERVAL '20 days', NOW()),
        ('MUM-ACC-002',   '8901234567005', 'Samsung Charger 45W',  'Accessories',     2499, 100,'Samsung 45W Super Fast Charger',      franchise1_id, NOW() - INTERVAL '18 days', NOW()),
        ('MUM-TAB-001',   '8901234567006', 'iPad Air M2',          'Electronics',    69900, 18, 'Apple iPad Air 11" M2 chip',          franchise1_id, NOW() - INTERVAL '15 days', NOW()),
        ('MUM-ACC-003',   '8901234567007', 'Boat Airdopes 141',    'Accessories',     1299, 80, 'Boat wireless earbuds',               franchise1_id, NOW() - INTERVAL '15 days', NOW()),
        ('MUM-WRB-001',   '8901234567008', 'Galaxy Watch 6',       'Wearables',      26999, 12, 'Samsung Galaxy Watch 6 Classic 47mm', franchise1_id, NOW() - INTERVAL '10 days', NOW());

    -- ========================================
    -- 3. Add Inventory Items for Franchise 2 (Bangalore)
    -- ========================================
    INSERT INTO inventory (sku, barcode, item_name, category, price, quantity, description, franchise_id, date_added, last_updated)
    VALUES
        ('BLR-PHONE-001', '8902345678001', 'iPhone 15',             'Electronics',    79900, 30, 'Apple iPhone 15 128GB',              franchise2_id, NOW() - INTERVAL '18 days', NOW()),
        ('BLR-PHONE-002', '8902345678002', 'OnePlus 12',            'Electronics',    64999, 35, 'OnePlus 12 256GB',                   franchise2_id, NOW() - INTERVAL '18 days', NOW()),
        ('BLR-LAP-001',   '8902345678003', 'Dell XPS 15',           'Electronics',   149900, 10, 'Dell XPS 15 i7 16GB RAM',            franchise2_id, NOW() - INTERVAL '15 days', NOW()),
        ('BLR-ACC-001',   '8902345678004', 'Sony WH-1000XM5',      'Accessories',    29990, 22, 'Sony noise-cancelling headphones',    franchise2_id, NOW() - INTERVAL '15 days', NOW()),
        ('BLR-ACC-002',   '8902345678005', 'Anker PowerBank 20K',   'Accessories',     3499, 50, 'Anker 20000mAh fast-charge powerbank',franchise2_id, NOW() - INTERVAL '12 days', NOW()),
        ('BLR-TAB-001',   '8902345678006', 'Samsung Tab S9',        'Electronics',    74999, 14, 'Samsung Galaxy Tab S9+ 256GB',        franchise2_id, NOW() - INTERVAL '10 days', NOW()),
        ('BLR-ACC-003',   '8902345678007', 'Apple Watch SE',        'Wearables',      29900,  8, 'Apple Watch SE 2nd Gen 44mm',         franchise2_id, NOW() - INTERVAL '8 days', NOW());

    -- ========================================
    -- 4. Create Customers
    -- ========================================
    INSERT INTO customers (id, name, phone, email) VALUES
        (gen_random_uuid(), 'Rahul Sharma',    '9876543001', 'rahul.sharma@email.com')    RETURNING id INTO cust1_id;
    INSERT INTO customers (id, name, phone, email) VALUES
        (gen_random_uuid(), 'Priya Patel',     '9876543002', 'priya.patel@email.com')     RETURNING id INTO cust2_id;
    INSERT INTO customers (id, name, phone, email) VALUES
        (gen_random_uuid(), 'Arjun Reddy',     '9876543003', 'arjun.reddy@email.com')     RETURNING id INTO cust3_id;
    INSERT INTO customers (id, name, phone, email) VALUES
        (gen_random_uuid(), 'Kavitha Nair',    '9876543004', 'kavitha.nair@email.com')     RETURNING id INTO cust4_id;

    -- ========================================
    -- 5. Sales for Franchise 1 (Mumbai) — 4 sales
    -- ========================================

    -- Sale 1: Rahul buys iPhone + AirPods
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust1_id, 'Rahul Sharma', 159800, NOW() - INTERVAL '20 days', franchise1_id)
    RETURNING id INTO sale1_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale1_id, 'MUM-PHONE-001', 'iPhone 15 Pro',   1, 134900),
        (sale1_id, 'MUM-ACC-001',   'AirPods Pro 2',   1,  24900);

    -- Sale 2: Priya buys MacBook + Charger
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust2_id, 'Priya Patel', 117399, NOW() - INTERVAL '15 days', franchise1_id)
    RETURNING id INTO sale2_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale2_id, 'MUM-LAP-001',   'MacBook Air M3',       1, 114900),
        (sale2_id, 'MUM-ACC-002',   'Samsung Charger 45W',  1,   2499);

    -- Sale 3: Rahul comes back for Galaxy Watch
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust1_id, 'Rahul Sharma', 28298, NOW() - INTERVAL '5 days', franchise1_id)
    RETURNING id INTO sale3_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale3_id, 'MUM-WRB-001',   'Galaxy Watch 6',       1,  26999),
        (sale3_id, 'MUM-ACC-003',   'Boat Airdopes 141',    1,   1299);

    -- Sale 4: Today — Priya buys Samsung phone
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust2_id, 'Priya Patel', 79999, NOW(), franchise1_id)
    RETURNING id INTO sale4_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale4_id, 'MUM-PHONE-002', 'Samsung Galaxy S24',   1,  79999);

    -- ========================================
    -- 6. Sales for Franchise 2 (Bangalore) — 2 sales
    -- ========================================

    -- Sale 5: Arjun buys Dell + Sony headphones
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust3_id, 'Arjun Reddy', 179890, NOW() - INTERVAL '10 days', franchise2_id)
    RETURNING id INTO sale5_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale5_id, 'BLR-LAP-001',   'Dell XPS 15',          1, 149900),
        (sale5_id, 'BLR-ACC-001',   'Sony WH-1000XM5',      1,  29990);

    -- Sale 6: Kavitha buys OnePlus + PowerBank + Tab
    INSERT INTO sales (customer_id, customer_name, total, date, franchise_id)
    VALUES (cust4_id, 'Kavitha Nair', 143497, NOW() - INTERVAL '3 days', franchise2_id)
    RETURNING id INTO sale6_id;

    INSERT INTO sale_items (sale_id, sku, item_name, quantity, price) VALUES
        (sale6_id, 'BLR-PHONE-002', 'OnePlus 12',           1,  64999),
        (sale6_id, 'BLR-TAB-001',   'Samsung Tab S9',       1,  74999),
        (sale6_id, 'BLR-ACC-002',   'Anker PowerBank 20K',  1,   3499);

    -- ========================================
    -- Done!
    -- ========================================
    RAISE NOTICE '✅ Seed data complete!';
    RAISE NOTICE '   Franchise 1 (Mumbai): 8 items, 4 sales, ~₹3.85L revenue';
    RAISE NOTICE '   Franchise 2 (Bangalore): 7 items, 2 sales, ~₹3.23L revenue';
    RAISE NOTICE '   4 customers created';

END $$;
