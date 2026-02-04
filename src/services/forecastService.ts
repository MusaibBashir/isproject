/**
 * Forecast Service
 * Communicates with the Prophet forecasting backend API.
 * Supports cached forecasts for instant page loads and background refresh.
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient';

// Backend URL - can be overridden via environment variable
const FORECAST_API_URL = import.meta.env.VITE_FORECAST_API_URL || 'http://localhost:5000';

export interface ForecastDataPoint {
    ds: string;  // Date string
    yhat: number;  // Predicted value
    yhat_lower: number;  // Lower confidence bound
    yhat_upper: number;  // Upper confidence bound
}

export interface ForecastResponse {
    success: boolean;
    forecast?: ForecastDataPoint[];
    error?: string;
    model_info?: {
        training_points: number;
        forecast_periods: number;
        frequency: string;
    };
}

export interface CachedForecastResponse {
    success: boolean;
    cached: boolean;
    forecasts: Record<string, ForecastDataPoint[]>;
    generated_at?: Record<string, string>;
    error?: string;
    message?: string;
}

export interface RefreshForecastResponse {
    success: boolean;
    cached: boolean;
    forecasts: Record<string, ForecastDataPoint[]>;
    errors?: Record<string, string>;
    model_info?: {
        forecast_periods: number;
        frequency: string;
        skus_processed: number;
        generated_at: string;
    };
    error?: string;
}

export interface SkuInfo {
    sku: string;
    data_points: number;
    start_date: string;
    end_date: string;
    total_sales: number;
    avg_daily_sales: number;
}

export interface SkusResponse {
    success: boolean;
    skus: SkuInfo[];
    message?: string;
}

/**
 * Check if the forecast backend is available
 */
export async function checkBackendHealth(): Promise<{ healthy: boolean; supabaseConnected?: boolean }> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        return {
            healthy: data.status === 'healthy',
            supabaseConnected: data.supabase_connected
        };
    } catch (error) {
        console.error('Backend health check failed:', error);
        return { healthy: false };
    }
}

/**
 * Get cached forecasts from Supabase directly (instant load)
 * This bypasses the backend for faster initial page load
 */
export async function getCachedForecasts(): Promise<CachedForecastResponse> {
    // Try fetching directly from Supabase for instant access
    if (isSupabaseAvailable() && supabase) {
        try {
            const { data, error } = await supabase
                .from('forecast_cache')
                .select('sku, predictions, generated_at');

            if (error) throw error;

            if (data && data.length > 0) {
                const forecasts: Record<string, ForecastDataPoint[]> = {};
                const generated_at: Record<string, string> = {};

                for (const item of data) {
                    forecasts[item.sku] = item.predictions as ForecastDataPoint[];
                    generated_at[item.sku] = item.generated_at;
                }

                return {
                    success: true,
                    cached: true,
                    forecasts,
                    generated_at
                };
            }
        } catch (error) {
            console.error('Direct Supabase cache fetch failed:', error);
        }
    }

    // Fallback: fetch via backend
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/forecast/cached`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error('Backend cache fetch failed:', error);
        return {
            success: false,
            cached: false,
            forecasts: {},
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Trigger backend to refresh forecasts with fresh data from Supabase
 */
export async function refreshForecasts(
    skus?: string[],
    periods: number = 90,
    frequency: string = 'D'
): Promise<RefreshForecastResponse> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/forecast/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus, periods, frequency }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Refresh forecast request failed:', error);
        return {
            success: false,
            cached: false,
            forecasts: {},
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get forecast for a single SKU using Prophet model
 */
export async function getForecast(
    sku: string,
    periods: number = 90,
    frequency: string = 'D'
): Promise<ForecastResponse> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku, periods, frequency }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Forecast request failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get list of available SKUs with sales data
 */
export async function getAvailableSkus(): Promise<SkusResponse> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/skus`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get SKUs request failed:', error);
        return {
            success: false,
            skus: [],
        };
    }
}

/**
 * Get forecast with custom sales data
 */
export async function getForecastWithData(
    salesData: Array<{ ds: string; y: number }>,
    periods: number = 90,
    frequency: string = 'D'
): Promise<ForecastResponse> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sales_data: salesData, periods, frequency }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Forecast request failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
