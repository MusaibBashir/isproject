import { useMemo } from "react";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    BarChart3, IndianRupee, TrendingUp, Store, MapPin, ArrowUpRight
} from "lucide-react";
import { useState, useEffect } from "react";

export function FinancialReportsPage() {
    const { profile, getAllFranchises } = useAuth();
    const { salesHistory } = useInventory();
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getAllFranchises();
            setFranchises(data);
            setIsLoading(false);
        };
        load();
    }, [getAllFranchises]);

    const reports = useMemo(() => {
        // Total revenue
        const totalRevenue = salesHistory.reduce((sum: number, s: any) => sum + s.total, 0);
        const totalSales = salesHistory.length;

        // Revenue by franchise
        const franchiseRevenue = franchises.map((f: Franchise) => {
            const fSales = salesHistory.filter((s: any) => s.franchiseId === f.id);
            const revenue = fSales.reduce((sum: number, s: any) => sum + s.total, 0);
            return {
                id: f.id,
                name: f.name,
                region: f.region,
                state: f.state,
                revenue,
                salesCount: fSales.length,
                avgOrderValue: fSales.length > 0 ? revenue / fSales.length : 0,
            };
        }).sort((a, b) => b.revenue - a.revenue);

        // Revenue by region
        const regionRevenue: Record<string, { revenue: number; sales: number; franchises: number }> = {};
        franchises.forEach((f: Franchise) => {
            if (!regionRevenue[f.region]) {
                regionRevenue[f.region] = { revenue: 0, sales: 0, franchises: 0 };
            }
            regionRevenue[f.region].franchises += 1;
            const fSales = salesHistory.filter((s: any) => s.franchiseId === f.id);
            regionRevenue[f.region].sales += fSales.length;
            regionRevenue[f.region].revenue += fSales.reduce((sum: number, s: any) => sum + s.total, 0);
        });

        // Monthly trends (last 6 months)
        const monthlyRevenue: Record<string, number> = {};
        salesHistory.forEach((sale: any) => {
            if (!sale.date) return;
            const month = sale.date.substring(0, 7); // YYYY-MM
            if (!monthlyRevenue[month]) monthlyRevenue[month] = 0;
            monthlyRevenue[month] += sale.total;
        });
        const sortedMonths = Object.entries(monthlyRevenue)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6);

        return { totalRevenue, totalSales, franchiseRevenue, regionRevenue, sortedMonths };
    }, [salesHistory, franchises]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <div className="w-full max-w-[1400px] mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <HamburgerMenu />
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Financial Reports</h1>
                        <p className="text-gray-600 text-sm">Revenue analytics across all franchises</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-6">
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">₹{(reports.totalRevenue / 1000).toFixed(1)}K</p>
                                    <p className="text-xs text-gray-500 mt-1">Across all franchises</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <IndianRupee className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50 to-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{reports.totalSales}</p>
                                    <p className="text-xs text-gray-500 mt-1">Sales completed</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Order Value</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        ₹{reports.totalSales > 0 ? (reports.totalRevenue / reports.totalSales).toFixed(0) : "0"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Per transaction</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Store className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Monthly Trends */}
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" /> Monthly Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {reports.sortedMonths.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No revenue data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {reports.sortedMonths.map(([month, revenue]) => {
                                        const maxRevenue = Math.max(...reports.sortedMonths.map(m => m[1] as number));
                                        const percentage = maxRevenue > 0 ? ((revenue as number) / maxRevenue) * 100 : 0;
                                        return (
                                            <div key={month} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 font-medium">{month}</span>
                                                    <span className="text-gray-900 font-semibold">₹{(revenue as number).toFixed(0)}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Regional Revenue */}
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-indigo-600" /> Revenue by Region
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {Object.keys(reports.regionRevenue).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No regional data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(reports.regionRevenue)
                                        .sort(([, a], [, b]) => b.revenue - a.revenue)
                                        .map(([region, stats]) => (
                                            <div key={region} className="p-4 bg-gray-50 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{region}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {stats.franchises} franchise{stats.franchises !== 1 ? "s" : ""} · {stats.sales} sales
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900">₹{stats.revenue.toFixed(0)}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Franchise Revenue Table */}
                <Card className="border border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Store className="w-5 h-5 text-purple-600" /> Revenue by Franchise
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {reports.franchiseRevenue.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No franchise data yet</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200">
                                        <tr className="text-left">
                                            <th className="pb-3 text-sm font-semibold text-gray-900">#</th>
                                            <th className="pb-3 text-sm font-semibold text-gray-900">Franchise</th>
                                            <th className="pb-3 text-sm font-semibold text-gray-900">Region</th>
                                            <th className="pb-3 text-sm font-semibold text-gray-900 text-right">Sales</th>
                                            <th className="pb-3 text-sm font-semibold text-gray-900 text-right">Revenue</th>
                                            <th className="pb-3 text-sm font-semibold text-gray-900 text-right">Avg. Order</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.franchiseRevenue.map((f, i) => (
                                            <tr key={f.id} className="border-b border-gray-100">
                                                <td className="py-3 text-sm text-gray-500">{i + 1}</td>
                                                <td className="py-3">
                                                    <p className="text-sm font-medium text-gray-900">{f.name}</p>
                                                </td>
                                                <td className="py-3">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {f.region}, {f.state}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-sm text-gray-900 text-right">{f.salesCount}</td>
                                                <td className="py-3 text-sm font-semibold text-gray-900 text-right">₹{f.revenue.toFixed(0)}</td>
                                                <td className="py-3 text-sm text-gray-700 text-right">₹{f.avgOrderValue.toFixed(0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
