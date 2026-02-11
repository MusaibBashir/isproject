import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    BarChart3, Store, TrendingUp, Package, Users, IndianRupee,
    MapPin, LogOut, Plus, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";

export function AdminDashboard() {
    const { profile, signOut, getAllFranchises } = useAuth();
    const { salesHistory, inventory } = useInventory();
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

    // Collective analytics
    const analytics = useMemo(() => {
        const totalRevenue = salesHistory.reduce((sum: number, s: any) => sum + s.total, 0);
        const totalSales = salesHistory.length;
        const totalItems = inventory.length;
        const totalStock = inventory.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const activeFranchises = franchises.filter((f: Franchise) => f.is_active).length;

        // Top products across all franchises
        const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
        salesHistory.forEach((sale: any) => {
            (sale.items || []).forEach((item: any) => {
                if (!productSales[item.sku]) {
                    productSales[item.sku] = { name: item.itemName, qty: 0, revenue: 0 };
                }
                productSales[item.sku].qty += item.quantity;
                productSales[item.sku].revenue += item.quantity * item.price;
            });
        });
        const topProducts = Object.entries(productSales)
            .map(([sku, data]) => ({ sku, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Per-franchise breakdown
        const franchiseStats = franchises.map((f: Franchise) => {
            const fSales = salesHistory.filter((s: any) => s.franchiseId === f.id);
            const fRevenue = fSales.reduce((sum: number, s: any) => sum + s.total, 0);
            const fInventory = inventory.filter((i: any) => i.franchiseId === f.id);
            const fStock = fInventory.reduce((sum: number, i: any) => sum + i.quantity, 0);
            return {
                ...f,
                salesCount: fSales.length,
                revenue: fRevenue,
                inventoryCount: fInventory.length,
                stockCount: fStock,
            };
        });

        // Region breakdown
        const regionStats: Record<string, { revenue: number; franchises: number; sales: number }> = {};
        franchises.forEach((f: Franchise) => {
            if (!regionStats[f.region]) {
                regionStats[f.region] = { revenue: 0, franchises: 0, sales: 0 };
            }
            regionStats[f.region].franchises += 1;
            const fSales = salesHistory.filter((s: any) => s.franchiseId === f.id);
            regionStats[f.region].sales += fSales.length;
            regionStats[f.region].revenue += fSales.reduce((sum: number, s: any) => sum + s.total, 0);
        });

        return { totalRevenue, totalSales, totalItems, totalStock, activeFranchises, topProducts, franchiseStats, regionStats };
    }, [salesHistory, inventory, franchises]);

    const handleSignOut = async () => {
        await signOut();
        toast.success("Signed out");
    };

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <HamburgerMenu />
                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Admin Dashboard</h1>
                            <p className="text-gray-600 text-sm">Welcome, {profile?.full_name || "Admin"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/admin/franchises">
                            <Button variant="outline" className="gap-2 border-gray-300">
                                <Store className="w-4 h-4" />
                                Manage Franchises
                            </Button>
                        </Link>
                        <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-gray-600">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-5 gap-4">
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">₹{(analytics.totalRevenue / 1000).toFixed(1)}K</p>
                                </div>
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <IndianRupee className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalSales}</p>
                                </div>
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Franchises</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.activeFranchises}</p>
                                    <p className="text-xs text-gray-500">{franchises.length} total</p>
                                </div>
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Store className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory Items</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalItems}</p>
                                </div>
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stock</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalStock.toLocaleString()}</p>
                                </div>
                                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-cyan-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Top Products */}
                    <Card className="border border-gray-200 shadow-sm bg-white col-span-1">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold text-gray-900">Top Products</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {analytics.topProducts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No sales data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {analytics.topProducts.map((product: any, index: number) => (
                                        <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? "bg-yellow-100 text-yellow-700" :
                                                        index === 1 ? "bg-gray-200 text-gray-600" :
                                                            index === 2 ? "bg-orange-100 text-orange-700" :
                                                                "bg-gray-100 text-gray-500"
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.qty} units sold</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">₹{product.revenue.toFixed(0)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Franchise Performance */}
                    <Card className="border border-gray-200 shadow-sm bg-white col-span-2">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold text-gray-900">Franchise Performance</CardTitle>
                                <Link to="/admin/franchises">
                                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                                        View All <ArrowUpRight className="w-3 h-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {analytics.franchiseStats.length === 0 ? (
                                <div className="text-center py-8">
                                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No franchises yet</p>
                                    <Link to="/admin/franchises">
                                        <Button size="sm" className="mt-3 gap-1 bg-gray-900">
                                            <Plus className="w-4 h-4" /> Create Franchise
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {analytics.franchiseStats
                                        .sort((a: any, b: any) => b.revenue - a.revenue)
                                        .slice(0, 6)
                                        .map((f: any, i: number) => (
                                            <div key={f.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">
                                                        #{i + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{f.name}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> {f.region}, {f.state}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 text-right">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">₹{f.revenue.toFixed(0)}</p>
                                                        <p className="text-xs text-gray-500">{f.salesCount} sales</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">{f.stockCount}</p>
                                                        <p className="text-xs text-gray-500">stock</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        }`}>
                                                        {f.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Region Breakdown */}
                <Card className="border border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-600" /> Regional Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {Object.keys(analytics.regionStats).length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No regional data yet</p>
                        ) : (
                            <div className="grid grid-cols-5 gap-4">
                                {Object.entries(analytics.regionStats).map(([region, stats]: [string, any]) => (
                                    <div key={region} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100">
                                        <p className="text-sm font-semibold text-gray-900">{region}</p>
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Franchises</span>
                                                <span className="font-medium text-gray-700">{stats.franchises}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Sales</span>
                                                <span className="font-medium text-gray-700">{stats.sales}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Revenue</span>
                                                <span className="font-semibold text-gray-900">₹{stats.revenue.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
