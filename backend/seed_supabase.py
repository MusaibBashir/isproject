"""
Seed Supabase with sample sales data for Prophet forecasting.
Generates 100+ sales records spanning 6 months.

Usage:
    python seed_supabase.py

Environment Variables Required:
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Your Supabase service role key
"""

import os
import random
from datetime import datetime, timedelta
from supabase import create_client

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Sample inventory items with SKUs
SAMPLE_ITEMS = [
    {"sku": "SKU-001234", "item_name": "Wireless Mouse", "price": 29.99},
    {"sku": "SKU-001235", "item_name": "USB-C Cable", "price": 12.99},
    {"sku": "SKU-001236", "item_name": "Mechanical Keyboard", "price": 89.99},
    {"sku": "SKU-001237", "item_name": "Laptop Stand", "price": 49.99},
    {"sku": "SKU-001238", "item_name": "Webcam HD", "price": 79.99},
    {"sku": "SKU-001239", "item_name": "Desk Lamp", "price": 34.99},
    {"sku": "SKU-001240", "item_name": "Phone Case", "price": 19.99},
    {"sku": "SKU-001241", "item_name": "Bluetooth Speaker", "price": 59.99},
]

# Sample customer names
CUSTOMER_NAMES = [
    "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis",
    "David Wilson", "Jessica Martinez", "Christopher Lee", "Amanda Taylor",
    "Daniel Anderson", "Olivia Thomas", "Matthew Garcia", "Sophia Robinson",
    "Andrew White", "Emma Harris", "James Clark", "Ava Lewis",
    "William Hall", "Mia Young", "Alexander King", "Isabella Wright",
]


def generate_sales_data(num_sales=150):
    """Generate sample sales data spanning 6 months."""
    sales = []
    
    # Generate dates from 6 months ago to now
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)
    
    for i in range(num_sales):
        # Random date within the range (weighted towards recent)
        days_ago = int(random.triangular(0, 180, 30))  # More recent sales
        sale_date = end_date - timedelta(days=days_ago)
        
        # Random customer
        customer_name = random.choice(CUSTOMER_NAMES)
        
        # Random number of items in this sale (1-4)
        num_items = random.randint(1, 4)
        items_in_sale = random.sample(SAMPLE_ITEMS, min(num_items, len(SAMPLE_ITEMS)))
        
        sale_items = []
        total = 0
        
        for item in items_in_sale:
            quantity = random.randint(1, 5)
            item_total = item["price"] * quantity
            total += item_total
            
            sale_items.append({
                "sku": item["sku"],
                "item_name": item["item_name"],
                "quantity": quantity,
                "price": item["price"],
            })
        
        sales.append({
            "date": sale_date.isoformat(),
            "customer_name": customer_name,
            "total": round(total, 2),
            "items": sale_items,
        })
    
    # Sort by date
    sales.sort(key=lambda x: x["date"])
    
    return sales


def seed_inventory(supabase):
    """Seed inventory items if they don't exist."""
    print("Seeding inventory items...")
    
    for item in SAMPLE_ITEMS:
        # Check if SKU already exists
        result = supabase.table('inventory').select('sku').eq('sku', item['sku']).execute()
        
        if not result.data:
            supabase.table('inventory').insert({
                "sku": item["sku"],
                "item_name": item["item_name"],
                "category": "Electronics",
                "price": item["price"],
                "quantity": random.randint(50, 200),
                "description": f"Sample {item['item_name']} for testing",
            }).execute()
            print(f"  Added: {item['sku']} - {item['item_name']}")
        else:
            print(f"  Exists: {item['sku']} - {item['item_name']}")


def seed_sales(supabase, sales_data):
    """Seed sales and sale_items tables."""
    print(f"\nSeeding {len(sales_data)} sales records...")
    
    success_count = 0
    
    for i, sale in enumerate(sales_data):
        try:
            # Insert sale
            sale_result = supabase.table('sales').insert({
                "date": sale["date"],
                "customer_name": sale["customer_name"],
                "total": sale["total"],
            }).execute()
            
            if sale_result.data:
                sale_id = sale_result.data[0]["id"]
                
                # Insert sale items
                sale_items = []
                for item in sale["items"]:
                    sale_items.append({
                        "sale_id": sale_id,
                        "sku": item["sku"],
                        "item_name": item["item_name"],
                        "quantity": item["quantity"],
                        "price": item["price"],
                    })
                
                supabase.table('sale_items').insert(sale_items).execute()
                success_count += 1
                
                if (i + 1) % 25 == 0:
                    print(f"  Progress: {i + 1}/{len(sales_data)} sales inserted")
        
        except Exception as e:
            print(f"  Error inserting sale {i + 1}: {e}")
    
    print(f"  Successfully inserted {success_count} sales")


def print_summary(supabase):
    """Print a summary of the seeded data."""
    print("\n" + "=" * 50)
    print("SEED SUMMARY")
    print("=" * 50)
    
    # Count inventory
    inv_result = supabase.table('inventory').select('id', count='exact').execute()
    print(f"Inventory items: {inv_result.count or len(inv_result.data)}")
    
    # Count sales
    sales_result = supabase.table('sales').select('id', count='exact').execute()
    print(f"Sales records: {sales_result.count or len(sales_result.data)}")
    
    # Count sale items
    items_result = supabase.table('sale_items').select('id', count='exact').execute()
    print(f"Sale items: {items_result.count or len(items_result.data)}")
    
    # SKU breakdown
    print("\nSales by SKU:")
    for item in SAMPLE_ITEMS:
        sku_result = supabase.table('sale_items').select('quantity').eq('sku', item['sku']).execute()
        total_qty = sum([r['quantity'] for r in sku_result.data]) if sku_result.data else 0
        print(f"  {item['sku']}: {total_qty} units sold")


def main():
    # Validate environment variables
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERROR: Missing environment variables!")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_KEY")
        print("\nExample:")
        print('  set SUPABASE_URL=https://your-project.supabase.co')
        print('  set SUPABASE_SERVICE_KEY=your-service-role-key')
        return
    
    print("Connecting to Supabase...")
    print(f"  URL: {SUPABASE_URL[:30]}...")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("  Connected successfully!\n")
    except Exception as e:
        print(f"  Connection failed: {e}")
        return
    
    # Seed inventory first
    seed_inventory(supabase)
    
    # Generate and seed sales data
    sales_data = generate_sales_data(num_sales=150)
    seed_sales(supabase, sales_data)
    
    # Print summary
    print_summary(supabase)
    
    print("\n" + "=" * 50)
    print("SEEDING COMPLETE!")
    print("=" * 50)
    print("\nYou can now test the forecast API:")
    print("  GET https://prophet-forecast-api.onrender.com/api/forecast/refresh")


if __name__ == "__main__":
    main()
