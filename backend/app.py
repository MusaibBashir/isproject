"""
Prophet Forecasting API
Flask backend for time series forecasting using Facebook Prophet.
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from prophet import Prophet
from sample_data import generate_sample_data, get_sample_data_for_sku

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow all origins for development

# Cache for sample data
_sample_data_cache = None


def get_cached_sample_data():
    """Get cached sample data to avoid regenerating on each request."""
    global _sample_data_cache
    if _sample_data_cache is None:
        _sample_data_cache = generate_sample_data()
    return _sample_data_cache


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "prophet-forecast-api",
        "version": "1.0.0"
    })


@app.route('/api/forecast', methods=['POST'])
def forecast():
    """
    Generate forecast for a single time series.
    
    Request body:
    {
        "sales_data": [{"ds": "2024-01-01", "y": 10}, ...],  # Optional: custom data
        "sku": "SKU-001234",  # Optional: use sample data for this SKU
        "periods": 90,  # Number of days to forecast
        "frequency": "D"  # Frequency: D=daily, W=weekly, M=monthly
    }
    
    Response:
    {
        "success": true,
        "forecast": [
            {"ds": "2025-01-01", "yhat": 15.5, "yhat_lower": 12.0, "yhat_upper": 19.0},
            ...
        ],
        "model_info": {
            "training_points": 365,
            "forecast_periods": 90
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Get parameters
        periods = data.get('periods', 90)  # Default: 90 days
        frequency = data.get('frequency', 'D')
        
        # Get sales data - either from request or sample data
        if 'sales_data' in data and data['sales_data']:
            df = pd.DataFrame(data['sales_data'])
        elif 'sku' in data:
            sample_data = get_cached_sample_data()
            if data['sku'] not in sample_data:
                return jsonify({
                    "success": False, 
                    "error": f"Unknown SKU: {data['sku']}"
                }), 400
            df = sample_data[data['sku']].copy()
        else:
            return jsonify({
                "success": False, 
                "error": "Must provide either 'sales_data' or 'sku'"
            }), 400
        
        # Ensure correct column types
        df['ds'] = pd.to_datetime(df['ds'])
        df['y'] = pd.to_numeric(df['y'])
        
        # Validate data
        if len(df) < 2:
            return jsonify({
                "success": False, 
                "error": "Need at least 2 data points for forecasting"
            }), 400
        
        # Create and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            interval_width=0.80  # 80% confidence interval
        )
        
        # Suppress Prophet's verbose logging
        model.fit(df)
        
        # Generate future dates
        future = model.make_future_dataframe(periods=periods, freq=frequency)
        
        # Make predictions
        forecast = model.predict(future)
        
        # Extract only future predictions (not historical)
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
        
        return jsonify({
            "success": True,
            "forecast": forecast_data,
            "model_info": {
                "training_points": len(df),
                "forecast_periods": periods,
                "frequency": frequency
            }
        })
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        return jsonify({
            "success": False, 
            "error": str(e)
        }), 500


@app.route('/api/forecast/batch', methods=['POST'])
def forecast_batch():
    """
    Generate forecasts for multiple SKUs at once.
    
    Request body:
    {
        "skus": ["SKU-001234", "SKU-001235"],  # Use sample data
        "periods": 90,
        "frequency": "D"
    }
    
    Response:
    {
        "success": true,
        "forecasts": {
            "SKU-001234": [...],
            "SKU-001235": [...]
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        skus = data.get('skus', [])
        periods = data.get('periods', 90)
        frequency = data.get('frequency', 'D')
        
        if not skus:
            # If no SKUs specified, forecast all
            sample_data = get_cached_sample_data()
            skus = list(sample_data.keys())
        
        forecasts = {}
        errors = {}
        
        for sku in skus:
            try:
                sample_data = get_cached_sample_data()
                if sku not in sample_data:
                    errors[sku] = f"Unknown SKU: {sku}"
                    continue
                
                df = sample_data[sku].copy()
                df['ds'] = pd.to_datetime(df['ds'])
                df['y'] = pd.to_numeric(df['y'])
                
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
                
                forecasts[sku] = forecast_data
                
            except Exception as e:
                logger.error(f"Error forecasting {sku}: {str(e)}")
                errors[sku] = str(e)
        
        return jsonify({
            "success": True,
            "forecasts": forecasts,
            "errors": errors if errors else None,
            "model_info": {
                "forecast_periods": periods,
                "frequency": frequency,
                "skus_processed": len(forecasts)
            }
        })
        
    except Exception as e:
        logger.error(f"Batch forecast error: {str(e)}")
        return jsonify({
            "success": False, 
            "error": str(e)
        }), 500


@app.route('/api/skus', methods=['GET'])
def get_available_skus():
    """Get list of SKUs with sample data available."""
    sample_data = get_cached_sample_data()
    
    sku_info = []
    for sku, df in sample_data.items():
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
    
    logger.info(f"Starting Prophet Forecast API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
