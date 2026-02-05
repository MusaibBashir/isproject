# Prophet Forecasting Backend

Flask API for time series forecasting using Facebook Prophet.

## Quick Start (Local)

```bash
# Requires Python 3.10-3.12
pip install -r requirements.txt
python app.py
```

Server runs on `http://localhost:5000`

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/forecast` | POST | Single SKU forecast |
| `/api/forecast/refresh` | GET/POST | Refresh cached forecasts from Supabase |
| `/api/forecast/cached` | GET | Get cached forecasts |
| `/api/skus` | GET | List available SKUs |

## Deploy to Render

1. **Push to GitHub** (this `backend/` folder)

2. **Go to [render.com](https://render.com)** and sign in

3. **New → Web Service** → Connect your GitHub repo

4. **Configure:**
   - **Name:** `prophet-forecast-api`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

5. **Click "Create Web Service"**

6. **Copy your Render URL** (e.g., `https://prophet-forecast-api.onrender.com`)

7. **Update Netlify:**
   - Go to Site Settings → Environment Variables
   - Add: `VITE_FORECAST_API_URL=https://prophet-forecast-api.onrender.com`
   - Trigger a redeploy

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `FLASK_DEBUG` | Enable debug mode | false |
