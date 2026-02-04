/**
 * Forecast Service
 * Communicates with the Prophet forecasting backend API.
 */

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

export interface BatchForecastResponse {
    success: boolean;
    forecasts?: Record<string, ForecastDataPoint[]>;
    errors?: Record<string, string>;
    model_info?: {
        forecast_periods: number;
        frequency: string;
        skus_processed: number;
    };
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
}

/**
 * Check if the forecast backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        console.error('Backend health check failed:', error);
        return false;
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
 * Get forecasts for multiple SKUs at once
 */
export async function getBatchForecast(
    skus: string[],
    periods: number = 90,
    frequency: string = 'D'
): Promise<BatchForecastResponse> {
    try {
        const response = await fetch(`${FORECAST_API_URL}/api/forecast/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skus, periods, frequency }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Batch forecast request failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get list of available SKUs with sample data
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
