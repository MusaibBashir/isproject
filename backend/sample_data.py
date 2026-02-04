"""
Sample historical sales data for training Prophet models.
Contains 12 months of daily sales data for each SKU.
"""

import pandas as pd
from datetime import datetime, timedelta
import random

def generate_sample_data():
    """
    Generate synthetic sales data for inventory SKUs.
    Returns a dictionary with SKU as key and DataFrame as value.
    """
    
    # SKUs from the inventory system
    skus = [
        "SKU-001234",  # Wireless Mouse
        "SKU-001235",  # USB-C Cable
        "SKU-001236",  # Mechanical Keyboard
        "SKU-001237",  # Laptop Stand
        "SKU-001238",  # Webcam HD
        "SKU-001239",  # Desk Lamp
        "SKU-001240",  # Phone Case
        "SKU-001241",  # Bluetooth Speaker
    ]
    
    # Base daily sales rates for each SKU (average units per day)
    base_rates = {
        "SKU-001234": 3.5,   # Wireless Mouse - steady seller
        "SKU-001235": 5.0,   # USB-C Cable - high volume
        "SKU-001236": 1.2,   # Mechanical Keyboard - lower volume, higher price
        "SKU-001237": 0.8,   # Laptop Stand - steady but low
        "SKU-001238": 0.6,   # Webcam HD - occasional
        "SKU-001239": 0.4,   # Desk Lamp - low volume
        "SKU-001240": 4.0,   # Phone Case - good seller
        "SKU-001241": 1.5,   # Bluetooth Speaker - moderate
    }
    
    # Generate 12 months of daily data
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 12, 31)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    sample_data = {}
    
    for sku in skus:
        base_rate = base_rates[sku]
        sales = []
        
        for i, date in enumerate(dates):
            # Base sales with some randomness
            daily_sales = max(0, base_rate + random.gauss(0, base_rate * 0.3))
            
            # Add weekly seasonality (higher on weekends)
            if date.weekday() >= 5:  # Saturday, Sunday
                daily_sales *= 1.3
            
            # Add monthly seasonality (higher at month end/start)
            if date.day <= 3 or date.day >= 28:
                daily_sales *= 1.15
            
            # Add yearly seasonality (Q4 boost for electronics)
            if date.month in [10, 11, 12]:
                if sku in ["SKU-001234", "SKU-001235", "SKU-001236", "SKU-001238", "SKU-001241"]:
                    daily_sales *= 1.4
            
            # Black Friday / Cyber Monday boost (late November)
            if date.month == 11 and 22 <= date.day <= 30:
                daily_sales *= 2.0
            
            # Add slight upward trend over time
            trend_factor = 1 + (i / len(dates)) * 0.1
            daily_sales *= trend_factor
            
            sales.append(round(daily_sales))
        
        # Create Prophet-format DataFrame
        df = pd.DataFrame({
            'ds': dates,
            'y': sales
        })
        
        sample_data[sku] = df
    
    return sample_data


def get_sample_data_for_sku(sku: str) -> pd.DataFrame:
    """Get sample data for a specific SKU."""
    all_data = generate_sample_data()
    return all_data.get(sku, pd.DataFrame())


def get_aggregated_sample_data() -> pd.DataFrame:
    """Get aggregated sample data across all SKUs."""
    all_data = generate_sample_data()
    
    # Combine all SKU data
    combined = None
    for sku, df in all_data.items():
        if combined is None:
            combined = df.copy()
        else:
            combined = combined.merge(df, on='ds', how='outer', suffixes=('', f'_{sku}'))
            combined['y'] = combined['y'] + combined.get(f'y_{sku}', 0)
            combined = combined[['ds', 'y']]
    
    return combined


if __name__ == "__main__":
    # Test data generation
    data = generate_sample_data()
    for sku, df in data.items():
        print(f"{sku}: {len(df)} days, total sales: {df['y'].sum()}")
