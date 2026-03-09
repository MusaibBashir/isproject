import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    BarChart3, TrendingUp, Package, IndianRupee, ShoppingCart,
    Users, AlertCircle, LogOut, Store, MapPin, Truck
} from "lucide-react";
import { toast } from "sonner";

export function FranchiseDashboard() {
    const { profile, franchise, signOut } = useAuth();
    const { salesHistory, inventory, getLowStockItems } = useInventory();

    // Only count this franchise's OWN inventory (exclude warehouse items)
    const myInventory = useMemo(() =>
        inventory.filter((item: any) => item.franchiseId && item.franchiseId === franchise?.id),
        [inventory, franchise?.id]
    );

    const analytics = useMemo(() => {
        const totalRevenue = salesHistory.reduce((sum: number, s: any) => sum + s.total, 0);
        const totalSales = salesHistory.length;
        const totalItems = myInventory.length;
        const totalStock = myInventory.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const lowStockItems = getLowStockItems(20).filter((i: any) => i.franchiseId === franchise?.id);
        const inventoryValue = myInventory.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

        // Top products
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

        // Recent sales
        const recentSales = salesHistory.slice(0, 5);

        // Today's sales
        const today = new Date().toISOString().split("T")[0];
        const todaySales = salesHistory.filter((s: any) => s.date?.startsWith(today));
        const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + s.total, 0);

        return {
            totalRevenue, totalSales, totalItems, totalStock, lowStockItems,
            inventoryValue, topProducts, recentSales, todaySales, todayRevenue
        };
    }, [salesHistory, myInventory, getLowStockItems, franchise?.id]);

    const handleSignOut = async () => {
        await signOut();
        toast.success("Signed out");
    };

    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <div className="w-full max-w-[1400px] mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <HamburgerMenu />
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Store className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                                {franchise?.name || "My Franchise"}
                            </h1>
                            <p className="text-gray-600 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {franchise?.region}, {franchise?.state} · Welcome, {profile?.full_name}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-gray-600">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>

                {/* Today's Summary Banner */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-300 font-medium">Today's Performance</p>
                            <div className="flex items-baseline gap-4 mt-2">
                                <p className="text-3xl font-bold">₹{analytics.todayRevenue.toFixed(0)}</p>
                                <p className="text-sm text-gray-400">{analytics.todaySales.length} sales today</p>
                            </div>
                        </div>
                        <Link to="/sales">
                            <Button className="bg-white text-gray-900 hover:bg-gray-100 gap-2">
                                <ShoppingCart className="w-4 h-4" /> New Sale
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4">
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
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalItems}</p>
                                    <p className="text-xs text-gray-500">{analytics.totalStock} units</p>
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
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Low Stock</p>
                                    <p className="text-2xl font-bold text-red-600 mt-1">{analytics.lowStockItems.length}</p>
                                    <p className="text-xs text-gray-500">items ≤20 units</p>
                                </div>
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Top Products */}
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-lg font-semibold text-gray-900">Top Products</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {analytics.topProducts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No sales data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {analytics.topProducts.map((p: any, i: number) => (
                                        <div key={p.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" :
                                                    i === 1 ? "bg-gray-200 text-gray-600" :
                                                        "bg-gray-100 text-gray-500"
                                                    }`}>
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
                    <Card className="border border-gray-200 shadow-sm bg-white col-span-2">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold text-gray-900">Recent Sales</CardTitle>
                                <Link to="/sales-history">
                                    <Button variant="ghost" size="sm" className="text-xs">View All →</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {analytics.recentSales.length === 0 ? (
                                <div className="text-center py-8">
                                    <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No sales yet</p>
                                    <Link to="/sales">
                                        <Button size="sm" className="mt-3 gap-1 bg-gray-900">
                                            <ShoppingCart className="w-4 h-4" /> Make First Sale
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {analytics.recentSales.map((sale: any) => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{sale.customerName}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(sale.date).toLocaleDateString()} · {sale.items?.length || 0} items
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">₹{sale.total.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { to: "/sales", icon: ShoppingCart, label: "New Sale", color: "bg-blue-100 text-blue-600" },
                        { to: "/order-stock", icon: Truck, label: "Order Stock", color: "bg-green-100 text-green-600" },
                        { to: "/inventory", icon: BarChart3, label: "View Inventory", color: "bg-orange-100 text-orange-600" },
                        { to: "/customers", icon: Users, label: "Customers", color: "bg-purple-100 text-purple-600" },
                    ].map((link) => (
                        <Link key={link.to} to={link.to}>
                            <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                                        <link.icon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{link.label}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
