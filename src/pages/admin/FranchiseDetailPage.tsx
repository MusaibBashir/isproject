import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { PageContainer } from "../../components/layout/PageContainer";
import {
    Store, ArrowLeft, TrendingUp, Package, IndianRupee,
    MapPin, Users, ShoppingBag
} from "lucide-react";

export function FranchiseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { getAllFranchises } = useAuth();
    const { salesHistory, inventory } = useInventory();
    const [franchise, setFranchise] = useState<Franchise | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const all = await getAllFranchises();
            const found = all.find((f: Franchise) => f.id === id);
            setFranchise(found || null);
            setIsLoading(false);
        };
        load();
    }, [id, getAllFranchises]);

    const stats = useMemo(() => {
        if (!franchise) return null;
        const fSales = salesHistory.filter((s: any) => s.franchiseId === franchise.id);
        const fRevenue = fSales.reduce((sum: number, s: any) => sum + s.total, 0);
        const fInventory = inventory.filter((i: any) => i.franchiseId === franchise.id);
        const fStock = fInventory.reduce((sum: number, i: any) => sum + i.quantity, 0);

        // Top products for this franchise
        const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
        fSales.forEach((sale: any) => {
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

        // Recent sales
        const recentSales = fSales.slice(0, 10);

        return { fSales, fRevenue, fInventory, fStock, topProducts, recentSales };
    }, [franchise, salesHistory, inventory]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (!franchise) {
        return (
            <PageContainer title="Franchise Not Found">
                <div className="text-center py-16">
                    <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500">The requested franchise could not be found.</p>
                    <Link to="/admin/franchises">
                        <Button variant="outline" className="mt-4">← Back to Franchises</Button>
                    </Link>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title={franchise.name}
            subtitle={`${franchise.region}, ${franchise.state}`}
            icon={<Store className="w-5 h-5 text-purple-600" />}
            iconBgColor="bg-purple-100"
        >
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Link to="/admin/franchises">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back to Franchises
                        </Button>
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${franchise.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                        {franchise.is_active ? "Active" : "Inactive"}
                    </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">₹{(stats?.fRevenue || 0).toFixed(0)}</p>
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
                                    <p className="text-xs font-medium text-gray-500 uppercase">Total Sales</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.fSales.length || 0}</p>
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
                                    <p className="text-xs font-medium text-gray-500 uppercase">Inventory Items</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.fInventory.length || 0}</p>
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
                                    <p className="text-xs font-medium text-gray-500 uppercase">Stock Units</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{(stats?.fStock || 0).toLocaleString()}</p>
                                </div>
                                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5 text-cyan-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Top Products */}
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold">Top Products</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {(stats?.topProducts || []).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No sales data</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats?.topProducts.map((p: any, i: number) => (
                                        <div key={p.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {i + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                                    <p className="text-xs text-gray-500">{p.qty} units</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold">₹{p.revenue.toFixed(0)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Sales */}
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold">Recent Sales</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {(stats?.recentSales || []).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No sales yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {stats?.recentSales.map((sale: any) => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{sale.customerName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(sale.date).toLocaleDateString()} · {sale.items?.length || 0} items
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">₹{sale.total.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
