import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Activity, AlertCircle, Search, X } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { PageContainer } from "../components/layout/PageContainer";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";

// Helper function to generate sales history from salesHistory context
function generateHistoricalSales(salesHistory: any[], inventory: any[]) {
    const salesByQuarter: { [key: string]: { [sku: string]: number } } = {};
    const quarterLabels = ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"];

    // Initialize quarters
    quarterLabels.forEach((q) => {
        salesByQuarter[q] = {};
        inventory.forEach((item) => {
            salesByQuarter[q][item.sku] = 0;
        });
    });

    // Aggregate sales from history
    salesHistory.forEach((sale) => {
        const date = new Date(sale.date);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear();
        const quarterLabel = `Q${quarter} ${year}`;

        if (salesByQuarter[quarterLabel]) {
            sale.items.forEach((item: any) => {
                if (salesByQuarter[quarterLabel][item.sku] !== undefined) {
                    salesByQuarter[quarterLabel][item.sku] += item.quantity;
                }
            });
        }
    });

    // Generate mock historical data for demonstration
    inventory.forEach((item) => {
        const baseRate = Math.floor(Math.random() * 30) + 10;
        quarterLabels.forEach((q, idx) => {
            const variation = Math.random() * 0.3 - 0.15;
            const growth = idx * 0.1;
            salesByQuarter[q][item.sku] +=
                Math.floor(baseRate * (1 + variation + growth));
        });
    });

    return salesByQuarter;
}

// Helper function to predict future sales
function predictFutureSales(
    historicalSales: { [key: string]: { [sku: string]: number } },
    inventory: any[]
) {
    const futureQuarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
    const predictions: { [key: string]: { [sku: string]: number } } = {};

    futureQuarters.forEach((q) => {
        predictions[q] = {};
    });

    inventory.forEach((item) => {
        const historicalData = Object.values(historicalSales).map(
            (quarter) => quarter[item.sku] || 0
        );

        const n = historicalData.length;
        const avgSales =
            historicalData.reduce((a, b) => a + b, 0) / n || 0;
        const trend =
            (historicalData[n - 1] - historicalData[0]) / n || 0;

        futureQuarters.forEach((q, idx) => {
            const variation = Math.random() * 0.2 - 0.1;
            const predicted = Math.max(
                0,
                Math.floor(avgSales + trend * (n + idx) * (1 + variation))
            );
            predictions[q][item.sku] = predicted;
        });
    });

    return predictions;
}

// Helper function to analyze trends and provide insights
function analyzeTrends(
    historicalSales: { [key: string]: { [sku: string]: number } },
    predictions: { [key: string]: { [sku: string]: number } },
    sku: string
) {
    const historical = Object.values(historicalSales).map(
        (quarter) => quarter[sku] || 0
    );
    const future = Object.values(predictions).map(
        (quarter) => quarter[sku] || 0
    );

    const avgHistorical =
        historical.reduce((a, b) => a + b, 0) / historical.length || 0;
    const avgFuture = future.reduce((a, b) => a + b, 0) / future.length || 0;

    const growth = avgHistorical > 0
        ? ((avgFuture - avgHistorical) / avgHistorical) * 100
        : 0;

    const recentTrend = historical[historical.length - 1] > historical[0];
    const volatility =
        Math.max(...historical) - Math.min(...historical);
    const isVolatile = volatility > avgHistorical * 0.5;

    const insights: string[] = [];

    if (growth > 20) {
        insights.push("Strong growth trend expected");
    } else if (growth > 5) {
        insights.push("Moderate growth anticipated");
    } else if (growth < -5) {
        insights.push("Declining sales trend");
    } else {
        insights.push("Stable sales pattern");
    }

    if (isVolatile) {
        insights.push("High demand variability");
    }

    if (recentTrend) {
        insights.push("Upward momentum in recent quarters");
    } else {
        insights.push("Recent sales softening");
    }

    const maxIdx = historical.indexOf(Math.max(...historical));
    if (maxIdx === 3 || maxIdx === 0) {
        insights.push("Q4/Q1 seasonal peak observed");
    }

    return {
        growth: growth.toFixed(1),
        trend: growth > 5 ? "up" : growth < -5 ? "down" : "stable",
        insights,
        avgHistorical: avgHistorical.toFixed(1),
        avgFuture: avgFuture.toFixed(1),
    };
}

export function ForecastPage() {
    const { inventory, salesHistory } = useInventory();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSku, setSelectedSku] = useState<string | null>(null);

    // Generate historical and predicted sales data
    const { historicalSales, predictions } = useMemo(() => {
        const historical = generateHistoricalSales(salesHistory, inventory);
        const predicted = predictFutureSales(historical, inventory);
        return { historicalSales: historical, predictions: predicted };
    }, [salesHistory, inventory]);

    // Calculate overall totals
    const overallData = useMemo(() => {
        const allQuarters = [
            ...Object.keys(historicalSales),
            ...Object.keys(predictions),
        ];
        return allQuarters.map((quarter) => {
            const isHistorical = historicalSales[quarter];
            const data = isHistorical ? historicalSales : predictions;
            const total = Object.values(data[quarter] || {}).reduce(
                (sum: number, val) => sum + (val as number),
                0
            );
            return {
                quarter,
                sales: total,
                type: isHistorical ? "historical" : "forecast",
            };
        });
    }, [historicalSales, predictions]);

    // Calculate overall insights
    const overallInsights = useMemo(() => {
        const historicalTotal = Object.values(historicalSales).reduce(
            (sum, quarter) =>
                sum +
                Object.values(quarter).reduce(
                    (qSum: number, val) => qSum + (val as number),
                    0
                ),
            0
        );
        const forecastTotal = Object.values(predictions).reduce(
            (sum, quarter) =>
                sum +
                Object.values(quarter).reduce(
                    (qSum: number, val) => qSum + (val as number),
                    0
                ),
            0
        );

        const avgHistorical =
            historicalTotal / Object.keys(historicalSales).length;
        const avgForecast =
            forecastTotal / Object.keys(predictions).length;
        const growth = ((avgForecast - avgHistorical) / avgHistorical) * 100;

        return {
            historicalTotal,
            forecastTotal,
            growth: growth.toFixed(1),
            avgHistorical: avgHistorical.toFixed(0),
            avgForecast: avgForecast.toFixed(0),
        };
    }, [historicalSales, predictions]);

    // Filter inventory based on search
    const filteredInventory = useMemo(() => {
        if (!searchQuery) return inventory;
        const query = searchQuery.toLowerCase();
        return inventory.filter(
            (item) =>
                item.sku.toLowerCase().includes(query) ||
                item.itemName.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
        );
    }, [inventory, searchQuery]);

    // Get data for selected SKU
    const selectedSkuData = useMemo(() => {
        if (!selectedSku) return null;

        const allQuarters = [
            ...Object.keys(historicalSales),
            ...Object.keys(predictions),
        ];
        const data = allQuarters.map((quarter) => {
            const isHistorical = historicalSales[quarter];
            const salesData = isHistorical ? historicalSales : predictions;
            return {
                quarter,
                sales: salesData[quarter]?.[selectedSku] || 0,
                type: isHistorical ? "historical" : "forecast",
            };
        });

        const item = inventory.find((i) => i.sku === selectedSku);
        const analysis = analyzeTrends(
            historicalSales,
            predictions,
            selectedSku
        );

        return { data, item, analysis };
    }, [selectedSku, historicalSales, predictions, inventory]);

    return (
        <PageContainer
            title="Sales Forecast"
            subtitle="Predicted sales trends and insights"
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            iconBgColor="bg-blue-100"
        >
            {/* Overall Forecast */}
            <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Overall Inventory Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                                Historical Avg/Quarter
                            </p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {overallInsights.avgHistorical}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">units sold</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                                Forecast Avg/Quarter
                            </p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {overallInsights.avgForecast}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">units projected</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                                Expected Growth
                            </p>
                            <p
                                className={`text-2xl font-semibold ${parseFloat(overallInsights.growth) > 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                {overallInsights.growth}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                quarter over quarter
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                                Total Forecast (2025)
                            </p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {overallInsights.forecastTotal}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">units</p>
                        </div>
                    </div>

                    {/* Overall Timeline Chart */}
                    <div className="bg-white p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-4">
                            Sales Timeline: Historical & Forecast
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={overallData}>
                                <defs>
                                    <linearGradient
                                        id="colorHistorical"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#3b82f6"
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#3b82f6"
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="quarter"
                                    stroke="#6b7280"
                                    fontSize={12}
                                />
                                <YAxis stroke="#6b7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#colorHistorical)"
                                    fillOpacity={1}
                                    name="Sales"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm text-gray-600">
                                    Historical (2024)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-sm text-gray-600">
                                    Forecast (2025)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-white p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            Key Insights & Recommendations
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                                <p className="text-sm text-gray-700">
                                    Overall inventory sales are projected to{" "}
                                    {parseFloat(overallInsights.growth) > 0
                                        ? "grow"
                                        : "decline"}{" "}
                                    by{" "}
                                    <span className="font-semibold">
                                        {Math.abs(parseFloat(overallInsights.growth))}%
                                    </span>{" "}
                                    in 2025
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                                <p className="text-sm text-gray-700">
                                    Expected average quarterly sales:{" "}
                                    <span className="font-semibold">
                                        {overallInsights.avgForecast} units
                                    </span>
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                                <p className="text-sm text-gray-700">
                                    Plan inventory levels to support forecasted demand while
                                    maintaining optimal stock levels
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Per-SKU Forecast */}
            <Card>
                <CardHeader>
                    <CardTitle>Per-SKU Forecast Analysis</CardTitle>
                    <div className="mt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by SKU, name, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* SKU List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredInventory.map((item) => {
                            const analysis = analyzeTrends(
                                historicalSales,
                                predictions,
                                item.sku
                            );
                            const isSelected = selectedSku === item.sku;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() =>
                                        setSelectedSku(isSelected ? null : item.sku)
                                    }
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {item.itemName}
                                            </p>
                                            <p className="text-xs text-gray-500">{item.sku}</p>
                                        </div>
                                        {analysis.trend === "up" ? (
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                        ) : analysis.trend === "down" ? (
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                        ) : (
                                            <Activity className="w-4 h-4 text-gray-600" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {item.category}
                                        </Badge>
                                        <Badge
                                            variant={
                                                analysis.trend === "up"
                                                    ? "default"
                                                    : analysis.trend === "down"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                            className="text-xs"
                                        >
                                            {analysis.growth}%
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Avg: {analysis.avgHistorical} → {analysis.avgFuture}{" "}
                                        units/quarter
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected SKU Details */}
                    {selectedSkuData && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900">
                                        {selectedSkuData.item?.itemName}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        {selectedSkuData.item?.sku} •{" "}
                                        {selectedSkuData.item?.category}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedSku(null)}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>

                            {/* SKU Timeline Chart */}
                            <div className="bg-white p-4 rounded-lg mb-4">
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={selectedSkuData.data}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#e5e7eb"
                                        />
                                        <XAxis
                                            dataKey="quarter"
                                            stroke="#6b7280"
                                            fontSize={12}
                                        />
                                        <YAxis stroke="#6b7280" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                            name="Sales (units)"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* SKU Insights */}
                            <div className="bg-white p-4 rounded-lg">
                                <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-600" />
                                    Trend Analysis & Insights
                                </h5>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 bg-gray-50 rounded">
                                        <p className="text-xs text-gray-600 mb-1">
                                            Historical Avg
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {selectedSkuData.analysis.avgHistorical}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            units/quarter
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded">
                                        <p className="text-xs text-gray-600 mb-1">
                                            Forecast Avg
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {selectedSkuData.analysis.avgFuture}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            units/quarter
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {selectedSkuData.analysis.insights.map(
                                        (insight, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2"></div>
                                                <p className="text-sm text-gray-700">{insight}</p>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Recommendations */}
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                                    <p className="text-sm font-medium text-amber-900 mb-2">
                                        Recommendations
                                    </p>
                                    <div className="space-y-1">
                                        {parseFloat(selectedSkuData.analysis.growth) > 15 && (
                                            <p className="text-xs text-amber-800">
                                                • Increase stock levels to meet growing demand
                                            </p>
                                        )}
                                        {parseFloat(selectedSkuData.analysis.growth) < -10 && (
                                            <p className="text-xs text-amber-800">
                                                • Consider reducing inventory or promotional
                                                activities
                                            </p>
                                        )}
                                        {selectedSkuData.item &&
                                            selectedSkuData.item.quantity <
                                            parseFloat(
                                                selectedSkuData.analysis.avgFuture
                                            ) && (
                                                <p className="text-xs text-amber-800">
                                                    • Current stock (
                                                    {selectedSkuData.item.quantity}) is below
                                                    forecasted demand
                                                </p>
                                            )}
                                        <p className="text-xs text-amber-800">
                                            • Monitor sales trends weekly to validate forecasts
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}
