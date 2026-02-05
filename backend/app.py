"""
Prophet Forecasting API with Supabase Integration
Flask backend for time series forecasting using Facebook Prophet.
Fetches real sales data from Supabase and caches predictions.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from prophet import Prophet

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for development

# Supabase client (initialized lazily)
_supabase_client = None


def get_supabase_client():
    """Get Supabase client, initializing if needed."""
    global _supabase_client
    if _supabase_client is None:
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
        
        if supabase_url and supabase_key:
            try:
                from supabase import create_client
                _supabase_client = create_client(supabase_url, supabase_key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase: {e}")
                _supabase_client = None
        else:
            logger.warning("Supabase credentials not found in environment")
    
    return _supabase_client


def fetch_sales_data_from_supabase():
    """Fetch real sales data from Supabase sale_items table."""
    supabase = get_supabase_client()
    if not supabase:
        return None
    
    try:
        # Fetch sale_items with their sale date
        response = supabase.table('sale_items').select(
            'sku, quantity, price, sales(date)'
        ).execute()
        
        if not response.data:
            logger.info("No sales data found in Supabase")
            return None
        
        # Process data into daily sales per SKU
        sales_by_sku = {}
        
        for item in response.data:
            sku = item.get('sku')
            quantity = item.get('quantity', 0)
            sale_date = item.get('sales', {}).get('date') if item.get('sales') else None
            
            if not sku or not sale_date:
                continue
            
            # Parse date (just the date part)
            date_str = sale_date[:10]  # YYYY-MM-DD
            
            if sku not in sales_by_sku:
                sales_by_sku[sku] = {}
            
            if date_str not in sales_by_sku[sku]:
                sales_by_sku[sku][date_str] = 0
            
            sales_by_sku[sku][date_str] += quantity
        
        # Convert to DataFrames
        result = {}
        for sku, daily_sales in sales_by_sku.items():
            if len(daily_sales) >= 2:  # Need at least 2 data points
                df = pd.DataFrame([
                    {'ds': date, 'y': qty}
                    for date, qty in sorted(daily_sales.items())
                ])
                df['ds'] = pd.to_datetime(df['ds'])
                result[sku] = df
        
        logger.info(f"Fetched sales data for {len(result)} SKUs")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching sales data: {e}")
        return None


def get_cached_forecast(sku=None):
    """Get cached forecasts from Supabase."""
    supabase = get_supabase_client()
    if not supabase:
        return None
    
    try:
        if sku:
            response = supabase.table('forecast_cache').select('*').eq('sku', sku).execute()
        else:
            response = supabase.table('forecast_cache').select('*').execute()
        
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error fetching cached forecast: {e}")
        return None


def save_forecast_to_cache(sku, predictions):
    """Save forecast to Supabase cache."""
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    try:
        # Upsert (insert or update)
        response = supabase.table('forecast_cache').upsert({
            'sku': sku,
            'predictions': predictions,
            'generated_at': datetime.utcnow().isoformat()
        }, on_conflict='sku').execute()
        
        return True
    except Exception as e:
        logger.error(f"Error saving forecast to cache: {e}")
        return False


def generate_forecast_for_sku(df, periods=90, frequency='D'):
    """Generate Prophet forecast for a single SKU."""
    try:
        df = df.copy()
        df['ds'] = pd.to_datetime(df['ds'])
        df['y'] = pd.to_numeric(df['y'])
        
        if len(df) < 2:
            return None
        
        # Create and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            interval_width=0.80
        )
        model.fit(df)
        
        # Generate future dates
        future = model.make_future_dataframe(periods=periods, freq=frequency)
        forecast = model.predict(future)
        
        # Extract only future predictions
        last_date = df['ds'].max()
        future_forecast = forecast[forecast['ds'] > last_date]
        
        # Format response
        forecast_data = []
        for _, row in future_forecast.iterrows():
            forecast_data.append({
                "ds": row['ds'].strftime('%Y-%m-%d'),
                "yhat": round(max(0, row['yhat']), 2),
                "yhat_lower": round(max(0, row['yhat_lower']), 2),
                "yhat_upper": round(max(0, row['yhat_upper']), 2)
            })
        
        return forecast_data
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        return None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    supabase = get_supabase_client()
    return jsonify({
        "status": "healthy",
        "service": "prophet-forecast-api",
        "version": "2.0.0",
        "supabase_connected": supabase is not None
    })


@app.route('/api/forecast/cached', methods=['GET'])
def get_cached_forecasts():
    """
    Get cached forecasts from Supabase.
    Returns immediately with cached data for instant page load.
    """
    sku = request.args.get('sku')
    
    cached = get_cached_forecast(sku)
    
    if cached:
        return jsonify({
            "success": True,
            "cached": True,
            "forecasts": {item['sku']: item['predictions'] for item in cached},
            "generated_at": {item['sku']: item['generated_at'] for item in cached}
        })
    else:
        return jsonify({
            "success": True,
            "cached": False,
            "forecasts": {},
            "message": "No cached forecasts available"
        })


@app.route('/api/forecast/refresh', methods=['GET', 'POST'])
def refresh_forecasts():
    """
    Generate fresh forecasts from real Supabase sales data.
    This endpoint fetches actual sales, runs Prophet, and caches results.
    """
    try:
        data = {}
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            
        periods = data.get('periods', 90)
        frequency = data.get('frequency', 'D')
        target_skus = data.get('skus', [])  # Optional: specific SKUs to refresh
        
        # Fetch real sales data from Supabase
        sales_data = fetch_sales_data_from_supabase()
        
        if not sales_data:
            return jsonify({
                "success": False,
                "error": "No sales data available in Supabase",
                "message": "Add some sales records to generate forecasts"
            }), 400
        
        forecasts = {}
        errors = {}
        
        # Filter to target SKUs if specified
        skus_to_process = target_skus if target_skus else list(sales_data.keys())
        
        for sku in skus_to_process:
            if sku not in sales_data:
                errors[sku] = "No sales data for this SKU"
                continue
            
            df = sales_data[sku]
            forecast_data = generate_forecast_for_sku(df, periods, frequency)
            
            if forecast_data:
                forecasts[sku] = forecast_data
                # Save to cache
                save_forecast_to_cache(sku, forecast_data)
            else:
                errors[sku] = "Failed to generate forecast"
        
        return jsonify({
            "success": True,
            "cached": False,
            "forecasts": forecasts,
            "errors": errors if errors else None,
            "model_info": {
                "forecast_periods": periods,
                "frequency": frequency,
                "skus_processed": len(forecasts),
                "generated_at": datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Refresh forecast error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/forecast', methods=['POST'])
def forecast():
    """
    Generate forecast for a single time series.
    Supports both custom data and fetching from Supabase by SKU.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        periods = data.get('periods', 90)
        frequency = data.get('frequency', 'D')
        
        # Get sales data
        if 'sales_data' in data and data['sales_data']:
            df = pd.DataFrame(data['sales_data'])
        elif 'sku' in data:
            # Try to fetch from Supabase
            sales_data = fetch_sales_data_from_supabase()
            if sales_data and data['sku'] in sales_data:
                df = sales_data[data['sku']]
            else:
                return jsonify({
                    "success": False,
                    "error": f"No sales data for SKU: {data['sku']}"
                }), 400
        else:
            return jsonify({
                "success": False,
                "error": "Must provide either 'sales_data' or 'sku'"
            }), 400
        
        forecast_data = generate_forecast_for_sku(df, periods, frequency)
        
        if forecast_data:
            # Cache the result
            if 'sku' in data:
                save_forecast_to_cache(data['sku'], forecast_data)
            
            return jsonify({
                "success": True,
                "forecast": forecast_data,
                "model_info": {
                    "training_points": len(df),
                    "forecast_periods": periods,
                    "frequency": frequency
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to generate forecast"
            }), 500
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/skus', methods=['GET'])
def get_available_skus():
    """Get list of SKUs with sales data available."""
    sales_data = fetch_sales_data_from_supabase()
    
    if not sales_data:
        return jsonify({
            "success": True,
            "skus": [],
            "message": "No sales data available"
        })
    
    sku_info = []
    for sku, df in sales_data.items():
        sku_info.append({
            "sku": sku,
            "data_points": len(df),
            "start_date": df['ds'].min().strftime('%Y-%m-%d'),
            "end_date": df['ds'].max().strftime('%Y-%m-%d'),
            "total_sales": int(df['y'].sum()),
            "avg_daily_sales": round(df['y'].mean(), 2)
        })
    
    return jsonify({
        "success": True,
        "skus": sku_info
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Prophet Forecast API v2.0 on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
