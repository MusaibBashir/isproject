-- ============================================
-- RESET & SEED DATA
-- Run this in Supabase SQL Editor
-- Clears all products, sales, stock orders
-- Then adds fresh admin warehouse inventory
-- ============================================

-- 1. Clear stock order items first (FK dependency)
DELETE FROM stock_order_items;

-- 2. Clear stock orders
DELETE FROM stock_orders;

-- 3. Clear sale items (FK dependency)
DELETE FROM sale_items;

-- 4. Clear sales
DELETE FROM sales;

-- 5. Clear all inventory (warehouse + franchise)
DELETE FROM inventory;

-- 6. Clear customers
DELETE FROM customers;


-- ============================================
-- SEED: Admin Warehouse Inventory
-- franchise_id = NULL means admin warehouse
-- ============================================

INSERT INTO inventory (sku, barcode, item_name, category, price, quantity, description, franchise_id, date_added, last_updated) VALUES

-- Electronics
('ELEC-LAPTOP-001', '8901234567001', 'Dell Inspiron 15 Laptop', 'Electronics', 55999.00, 50, '15.6" FHD, Intel i5 12th Gen, 8GB RAM, 512GB SSD', NULL, NOW(), NOW()),
('ELEC-LAPTOP-002', '8901234567002', 'HP Pavilion 14 Laptop', 'Electronics', 48999.00, 40, '14" FHD, AMD Ryzen 5, 8GB RAM, 256GB SSD', NULL, NOW(), NOW()),
('ELEC-LAPTOP-003', '8901234567003', 'MacBook Air M2', 'Electronics', 114900.00, 25, '13.6" Liquid Retina, Apple M2, 8GB RAM, 256GB SSD', NULL, NOW(), NOW()),
('ELEC-PHONE-001', '8901234567004', 'Samsung Galaxy S24', 'Electronics', 79999.00, 80, '6.2" FHD+ AMOLED, Snapdragon 8 Gen 3, 128GB', NULL, NOW(), NOW()),
('ELEC-PHONE-002', '8901234567005', 'iPhone 15', 'Electronics', 79900.00, 60, '6.1" Super Retina XDR, A16 Bionic, 128GB', NULL, NOW(), NOW()),
('ELEC-PHONE-003', '8901234567006', 'OnePlus 12', 'Electronics', 64999.00, 70, '6.82" LTPO AMOLED, Snapdragon 8 Gen 3, 256GB', NULL, NOW(), NOW()),
('ELEC-TAB-001', '8901234567007', 'iPad Air (M1)', 'Electronics', 59900.00, 35, '10.9" Liquid Retina, Apple M1, 64GB WiFi', NULL, NOW(), NOW()),
('ELEC-TAB-002', '8901234567008', 'Samsung Galaxy Tab S9', 'Electronics', 74999.00, 30, '11" AMOLED 120Hz, Snapdragon 8 Gen 2, 128GB', NULL, NOW(), NOW()),
('ELEC-WATCH-001', '8901234567009', 'Apple Watch Series 9', 'Electronics', 41900.00, 45, '41mm GPS, Always-On Retina, S9 SiP', NULL, NOW(), NOW()),
('ELEC-EARBUDS-001', '8901234567010', 'AirPods Pro (2nd Gen)', 'Electronics', 24900.00, 100, 'Active Noise Cancellation, USB-C, MagSafe Case', NULL, NOW(), NOW()),

-- Appliances
('APPL-AC-001', '8901234567011', 'LG 1.5 Ton 5-Star Split AC', 'Appliances', 42990.00, 20, 'Inverter, Dual Cool, AI Convertible, R32 Gas', NULL, NOW(), NOW()),
('APPL-AC-002', '8901234567012', 'Daikin 1.5 Ton 3-Star Split AC', 'Appliances', 36990.00, 25, 'Inverter, Copper Condenser, PM 2.5 Filter', NULL, NOW(), NOW()),
('APPL-FRIDGE-001', '8901234567013', 'Samsung 253L Double Door Refrigerator', 'Appliances', 26490.00, 30, 'Frost Free, Digital Inverter, Convertible 5-in-1', NULL, NOW(), NOW()),
('APPL-FRIDGE-002', '8901234567014', 'LG 655L Side-by-Side Refrigerator', 'Appliances', 79990.00, 12, 'Smart Diagnosis, Linear Cooling, Door Cooling+', NULL, NOW(), NOW()),
('APPL-WASH-001', '8901234567015', 'IFB 7kg Front Load Washing Machine', 'Appliances', 28990.00, 18, 'Fully Automatic, 2D Wash, Aqua Energie', NULL, NOW(), NOW()),
('APPL-WASH-002', '8901234567016', 'Samsung 8kg Top Load Washing Machine', 'Appliances', 18990.00, 22, 'Digital Inverter, Wobble Technology, Magic Filter', NULL, NOW(), NOW()),
('APPL-MICRO-001', '8901234567017', 'LG 28L Convection Microwave', 'Appliances', 14490.00, 40, '360° Motorised Rotisserie, 301 Auto Cook Menu', NULL, NOW(), NOW()),
('APPL-PURIF-001', '8901234567018', 'Kent Grand Star RO+UV Water Purifier', 'Appliances', 18500.00, 35, '9L Tank, Digital Display, UV LED in Tank', NULL, NOW(), NOW()),

-- Accessories
('ACC-CASE-001', '8901234567019', 'iPhone 15 Silicone Case', 'Accessories', 1499.00, 200, 'MagSafe compatible, Soft-touch finish, Multiple colors', NULL, NOW(), NOW()),
('ACC-CASE-002', '8901234567020', 'Samsung S24 Clear Cover', 'Accessories', 999.00, 180, 'Transparent, Slim-fit, Anti-yellowing', NULL, NOW(), NOW()),
('ACC-CHARGER-001', '8901234567021', 'Anker 65W USB-C Charger', 'Accessories', 3299.00, 120, 'GaN II, 3-Port, Fast Charging, Foldable Plug', NULL, NOW(), NOW()),
('ACC-CHARGER-002', '8901234567022', 'Apple 20W USB-C Power Adapter', 'Accessories', 1900.00, 150, 'Fast Charge compatible, Compact design', NULL, NOW(), NOW()),
('ACC-CABLE-001', '8901234567023', 'Belkin USB-C to Lightning Cable 1m', 'Accessories', 1499.00, 250, 'MFi Certified, Braided, Fast Charging', NULL, NOW(), NOW()),
('ACC-CABLE-002', '8901234567024', 'Anker USB-C to USB-C Cable 2m', 'Accessories', 899.00, 300, '100W PD, Braided Nylon, USB 2.0', NULL, NOW(), NOW()),
('ACC-SCREEN-001', '8901234567025', 'Spigen Tempered Glass iPhone 15', 'Accessories', 799.00, 200, '9H Hardness, Auto-Align Kit, 2-Pack', NULL, NOW(), NOW()),
('ACC-SCREEN-002', '8901234567026', 'Whitestone Dome Glass Galaxy S24', 'Accessories', 2499.00, 100, 'UV Cured, Full Coverage, Fingerprint Compatible', NULL, NOW(), NOW()),
('ACC-MOUSE-001', '8901234567027', 'Logitech MX Master 3S', 'Accessories', 9495.00, 60, 'Wireless, 8K DPI, Quiet Clicks, USB-C', NULL, NOW(), NOW()),
('ACC-KEYBOARD-001', '8901234567028', 'Keychron K2 Mechanical Keyboard', 'Accessories', 7499.00, 45, '75%, Gateron Brown, Bluetooth + USB-C, RGB', NULL, NOW(), NOW()),

-- Furniture
('FURN-DESK-001', '8901234567029', 'IKEA Bekant Standing Desk', 'Furniture', 34990.00, 15, '160x80cm, Electric Height Adjustable, White', NULL, NOW(), NOW()),
('FURN-CHAIR-001', '8901234567030', 'Herman Miller Aeron Chair', 'Furniture', 129900.00, 8, 'Size B, Graphite, PostureFit SL, Fully Loaded', NULL, NOW(), NOW()),
('FURN-CHAIR-002', '8901234567031', 'IKEA Markus Office Chair', 'Furniture', 14990.00, 20, 'High-back, Mesh, Adjustable Headrest, Armrests', NULL, NOW(), NOW()),
('FURN-SHELF-001', '8901234567032', 'IKEA Kallax Shelf Unit 4x4', 'Furniture', 9990.00, 25, '147x147cm, White, 16 Compartments', NULL, NOW(), NOW()),
('FURN-MONITOR-001', '8901234567033', 'Monitor Arm Dual Mount', 'Furniture', 4999.00, 40, 'Gas Spring, VESA 75/100, Cable Management', NULL, NOW(), NOW()),

-- Audio / Visual
('AV-TV-001', '8901234567034', 'Sony Bravia 55" 4K OLED TV', 'Audio/Visual', 129990.00, 10, 'XR OLED, Cognitive Processor, Google TV', NULL, NOW(), NOW()),
('AV-TV-002', '8901234567035', 'Samsung 43" Crystal 4K UHD TV', 'Audio/Visual', 32990.00, 20, 'Crystal Processor 4K, HDR, Smart TV', NULL, NOW(), NOW()),
('AV-SPEAKER-001', '8901234567036', 'JBL Flip 6 Bluetooth Speaker', 'Audio/Visual', 9999.00, 80, 'IP67, 12hr Battery, PartyBoost, USB-C', NULL, NOW(), NOW()),
('AV-SPEAKER-002', '8901234567037', 'Sonos One SL Smart Speaker', 'Audio/Visual', 19999.00, 30, 'WiFi, AirPlay 2, Multi-room, Trueplay Tuning', NULL, NOW(), NOW()),
('AV-HP-001', '8901234567038', 'Sony WH-1000XM5 Headphones', 'Audio/Visual', 29990.00, 50, 'ANC, 30hr Battery, LDAC, Multipoint', NULL, NOW(), NOW()),
('AV-HP-002', '8901234567039', 'Bose QuietComfort Ultra Headphones', 'Audio/Visual', 34900.00, 35, 'Spatial Audio, 24hr Battery, CustomTune', NULL, NOW(), NOW()),
('AV-PROJECTOR-001', '8901234567040', 'BenQ TH585P Projector', 'Audio/Visual', 59990.00, 10, '1080p, 3500 Lumens, Low Input Lag, HDMI', NULL, NOW(), NOW()),

-- Networking
('NET-ROUTER-001', '8901234567041', 'TP-Link Archer AX73 WiFi 6 Router', 'Networking', 8999.00, 50, 'AX5400, Dual Band, 6 Antennas, USB 3.0', NULL, NOW(), NOW()),
('NET-ROUTER-002', '8901234567042', 'ASUS RT-AX86U Pro Router', 'Networking', 24999.00, 20, 'AX5700, 2.5G Port, Gaming Priority, AiMesh', NULL, NOW(), NOW()),
('NET-MESH-001', '8901234567043', 'Google Nest WiFi Pro (3-Pack)', 'Networking', 29999.00, 15, 'WiFi 6E, Tri-Band, up to 540 sqm, Thread', NULL, NOW(), NOW()),
('NET-SWITCH-001', '8901234567044', 'TP-Link 8-Port Gigabit Switch', 'Networking', 1899.00, 75, 'Unmanaged, Plug & Play, Metal Casing', NULL, NOW(), NOW()),
('NET-EXTENDER-001', '8901234567045', 'TP-Link RE605X WiFi 6 Range Extender', 'Networking', 5499.00, 40, 'AX1800, Dual Band, Gigabit Port, OneMesh', NULL, NOW(), NOW()),

-- Storage
('STOR-SSD-001', '8901234567046', 'Samsung 990 Pro 1TB NVMe SSD', 'Storage', 9999.00, 60, 'PCIe 4.0, 7450/6900 MB/s, V-NAND', NULL, NOW(), NOW()),
('STOR-SSD-002', '8901234567047', 'WD Blue SN580 500GB NVMe SSD', 'Storage', 3999.00, 80, 'PCIe 4.0, 4000/3600 MB/s, TLC NAND', NULL, NOW(), NOW()),
('STOR-HDD-001', '8901234567048', 'Seagate Barracuda 2TB HDD', 'Storage', 5299.00, 45, '7200RPM, 256MB Cache, SATA 6Gb/s', NULL, NOW(), NOW()),
('STOR-EXT-001', '8901234567049', 'WD My Passport 2TB External HDD', 'Storage', 5999.00, 55, 'USB 3.2, Password Protection, Auto Backup', NULL, NOW(), NOW()),
('STOR-FLASH-001', '8901234567050', 'SanDisk Ultra Dual Drive 128GB', 'Storage', 999.00, 150, 'USB-C + USB-A, 150MB/s, Swivel Design', NULL, NOW(), NOW());


-- ============================================
-- Verify: count of items inserted
-- ============================================
SELECT
    category,
    COUNT(*) AS items,
    SUM(quantity) AS total_units,
    SUM(price * quantity) AS total_value
FROM inventory
WHERE franchise_id IS NULL
GROUP BY category
ORDER BY category;
