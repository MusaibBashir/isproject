import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import {
    BarChart3, Store, TrendingUp, Package, IndianRupee,
    MapPin, LogOut, Plus, ArrowUpRight, Users
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CHART_COLORS = {
    revenue: "#6366f1",
    revenueFill: "#6366f114",
    sales: "#f97316",
    bar1: "#6366f1",
    bar2: "#f97316",
    bar3: "#10b981",
    bar4: "#3b82f6",
    bar5: "#ec4899",
};

const REGION_PALETTE = [
    "#6366f1", "#f97316", "#10b981", "#3b82f6", "#ec4899",
    "#a855f7", "#14b8a6", "#eab308", "#f43f5e",
];

function fmt(n: number) {
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
}

// Custom tooltip shared styling
const tooltipStyle = {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    padding: "10px 14px",
    fontSize: 12,
    color: "#1f2937", // Explicitly setting color to fix white text issue
};

// ── Component ─────────────────────────────────────────────────────────────────
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

    const analytics = useMemo(() => {
        const totalRevenue = salesHistory.reduce((s: number, sale: any) => s + sale.total, 0);
        const totalSales = salesHistory.length;
        const totalItems = inventory.length;
        const totalStock = inventory.reduce((s: number, i: any) => s + i.quantity, 0);
        const activeFranchises = franchises.filter((f: Franchise) => f.is_active).length;

        // Monthly revenue for the past 12 months
        const now = new Date();
        const monthBuckets: Record<string, { label: string; revenue: number; sales: number }> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            monthBuckets[key] = { label: MONTHS[d.getMonth()], revenue: 0, sales: 0 };
        }
        salesHistory.forEach((sale: any) => {
            const d = new Date(sale.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (monthBuckets[key]) {
                monthBuckets[key].revenue += sale.total;
                monthBuckets[key].sales += 1;
            }
        });
        const monthlyTrend = Object.values(monthBuckets);

        // Top 6 products by revenue
        const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
        salesHistory.forEach((sale: any) => {
            (sale.items || []).forEach((item: any) => {
                if (!productSales[item.sku]) productSales[item.sku] = { name: item.itemName, qty: 0, revenue: 0 };
                productSales[item.sku].qty += item.quantity;
                productSales[item.sku].revenue += item.quantity * item.price;
            });
        });
        const topProducts = Object.entries(productSales)
            .map(([sku, d]) => ({ sku, ...d }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6);

        // Franchise stats
        const franchiseStats = franchises.map((f: Franchise) => {
            const fSales = salesHistory.filter((s: any) => s.franchiseId === f.id);
            const fRevenue = fSales.reduce((sum: number, s: any) => sum + s.total, 0);
            const fInventory = inventory.filter((i: any) => i.franchiseId === f.id);
            const fStock = fInventory.reduce((sum: number, i: any) => sum + i.quantity, 0);
            return { ...f, salesCount: fSales.length, revenue: fRevenue, inventoryCount: fInventory.length, stockCount: fStock };
        }).sort((a: any, b: any) => b.revenue - a.revenue);

        // Region breakdown
        const regionMap: Record<string, { revenue: number; franchises: number; sales: number }> = {};
        franchises.forEach((f: Franchise) => {
            if (!regionMap[f.region]) regionMap[f.region] = { revenue: 0, franchises: 0, sales: 0 };
            regionMap[f.region].franchises += 1;
            const fs = salesHistory.filter((s: any) => s.franchiseId === f.id);
            regionMap[f.region].sales += fs.length;
            regionMap[f.region].revenue += fs.reduce((sum: number, s: any) => sum + s.total, 0);
        });
        const regionData = Object.entries(regionMap)
            .map(([region, d]) => ({ region, ...d }))
            .sort((a, b) => b.revenue - a.revenue);

        // MoM growth
        const lastTwo = monthlyTrend.slice(-2);
        const momGrowth = lastTwo.length === 2 && lastTwo[0].revenue > 0
            ? ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100
            : 0;

        return { totalRevenue, totalSales, totalItems, totalStock, activeFranchises, monthlyTrend, topProducts, franchiseStats, regionData, momGrowth };
    }, [salesHistory, inventory, franchises]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    const maxRegionRevenue = Math.max(...analytics.regionData.map(r => r.revenue), 1);

    return (
        <div className="min-h-screen bg-[#f8f9fb] font-inter">
            <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <HamburgerMenu />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                                <BarChart3 className="w-8 h-8 text-indigo-600" />
                                <span className="font-serif italic font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md text-2xl tracking-wide select-none">Mercanta</span>
                                <span className="text-gray-300 font-light hidden sm:inline">|</span>
                                <span className="text-2xl hidden sm:inline">Core KPIs</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Welcome, {profile?.full_name || "Admin"} · All figures live</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/admin/franchises">
                            <Button variant="outline" className="gap-2 border-gray-300 text-sm">
                                <Store className="w-4 h-4" /> Manage Franchises
                            </Button>
                        </Link>
                        <Button variant="ghost" onClick={async () => { await signOut(); toast.success("Signed out"); }} className="gap-2 text-gray-600 text-sm">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </Button>
                    </div>
                </div>

                {/* ── KPI Strip ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: "Total Revenue", value: fmt(analytics.totalRevenue), sub: `${analytics.momGrowth >= 0 ? "+" : ""}${analytics.momGrowth.toFixed(1)}% MoM`, icon: IndianRupee, accent: "bg-indigo-50 text-indigo-600", positive: analytics.momGrowth >= 0 },
                        { label: "Total Sales", value: analytics.totalSales.toLocaleString(), sub: "transactions", icon: TrendingUp, accent: "bg-emerald-50 text-emerald-600", positive: true },
                        { label: "Active Franchises", value: analytics.activeFranchises, sub: `${franchises.length} total`, icon: Store, accent: "bg-orange-50 text-orange-600", positive: true },
                        { label: "SKUs in Warehouse", value: analytics.totalItems, sub: "unique products", icon: Package, accent: "bg-blue-50 text-blue-600", positive: true },
                        { label: "Total Stock Units", value: analytics.totalStock.toLocaleString(), sub: "across all", icon: Users, accent: "bg-pink-50 text-pink-600", positive: true },
                    ].map(kpi => (
                        <Card key={kpi.label} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                                        <p className={`text-sm mt-1.5 font-medium ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>{kpi.sub}</p>
                                    </div>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.accent}`}>
                                        <kpi.icon className="w-4 h-4" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── Row 2: Revenue Trend + Top Products ── */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Revenue Trend – spans 2/3 */}
                    <Card className="col-span-2 bg-white border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold text-gray-900">Revenue Trend</CardTitle>
                                    <p className="text-xs text-gray-400 mt-0.5">Total, last 12 months</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-gray-900">{fmt(analytics.totalRevenue)}</p>
                                    <p className={`text-xs font-medium ${analytics.momGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                        {analytics.momGrowth >= 0 ? "▲" : "▼"} {Math.abs(analytics.momGrowth).toFixed(1)}% vs prev month
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2 pb-4 px-4">
                            {analytics.monthlyTrend.some(m => m.revenue > 0) ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={analytics.monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.18} />
                                                <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.sales} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={CHART_COLORS.sales} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={60} />
                                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [name === "revenue" ? fmt(v) : v, name === "revenue" ? "Revenue" : "Sales"]} />
                                        <Legend formatter={v => v === "revenue" ? "Revenue" : "Sales"} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                        <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                                        <Area type="monotone" dataKey="sales" stroke={CHART_COLORS.sales} strokeWidth={2} fill="url(#salesGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No sales data yet</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Products by Revenue – spans 1/3 */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-900">Top Products</CardTitle>
                                <p className="text-xs text-gray-400 mt-0.5">By revenue · All time</p>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-4 pb-4">
                            {analytics.topProducts.length === 0 ? (
                                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No sales data yet</div>
                            ) : (
                                <div className="space-y-3 mt-2">
                                    {analytics.topProducts.map((p: any, i: number) => {
                                        const pct = analytics.topProducts[0].revenue > 0
                                            ? (p.revenue / analytics.topProducts[0].revenue) * 100 : 0;
                                        const colors = [CHART_COLORS.bar1, CHART_COLORS.bar2, CHART_COLORS.bar3, CHART_COLORS.bar4, CHART_COLORS.bar5, "#a855f7"];
                                        return (
                                            <div key={p.sku}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]" title={p.name}>{p.name}</span>
                                                    <span className="text-xs font-bold text-gray-900 ml-2">{fmt(p.revenue)}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{p.qty} units sold</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Row 3: Regional Revenue + Franchise Table ── */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Regional Revenue Bar Chart – 1/3 */}
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-900">Revenue by Region</CardTitle>
                                <p className="text-xs text-gray-400 mt-0.5">All time · Ranked</p>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-4 pb-4">
                            {analytics.regionData.length === 0 ? (
                                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No regional data yet</div>
                            ) : (
                                <div className="space-y-3 mt-2">
                                    {analytics.regionData.map((r, i) => {
                                        const pct = (r.revenue / maxRegionRevenue) * 100;
                                        return (
                                            <div key={r.region}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-700">{r.region}</span>
                                                        <span className="text-[11px] text-gray-400">{r.franchises}f · {r.sales}s</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-900">{fmt(r.revenue)}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, backgroundColor: REGION_PALETTE[i % REGION_PALETTE.length] }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Franchise Performance Table – 2/3 */}
                    <Card className="col-span-2 bg-white border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold text-gray-900">Franchise Performance</CardTitle>
                                    <p className="text-xs text-gray-400 mt-0.5">Ranked by revenue · All franchises</p>
                                </div>
                                <Link to="/admin/franchises">
                                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600 hover:text-indigo-700 -mt-1">
                                        Manage <ArrowUpRight className="w-3 h-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {analytics.franchiseStats.length === 0 ? (
                                <div className="h-[240px] flex flex-col items-center justify-center gap-3 text-sm text-gray-400">
                                    <Store className="w-10 h-10 text-gray-200" />
                                    <p>No franchises yet</p>
                                    <Link to="/admin/franchises">
                                        <Button size="sm" className="bg-gray-900 gap-1"><Plus className="w-4 h-4" /> Create Franchise</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">#</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Franchise</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Region</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Revenue</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Sales</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Stock</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.franchiseStats.slice(0, 8).map((f: any, i: number) => (
                                                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-400">#{i + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{f.region}, {f.state}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{fmt(f.revenue)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{f.salesCount}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{f.stockCount}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                                            {f.is_active ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Row 4: Monthly Sales Bar Chart ── */}
                {analytics.monthlyTrend.some(m => m.sales > 0) && (
                    <Card className="bg-white border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Monthly Transaction Volume</CardTitle>
                            <p className="text-xs text-gray-400">Number of sales transactions per month · Last 12 months</p>
                        </CardHeader>
                        <CardContent className="pr-6 pb-4 pl-2 pt-0">
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={analytics.monthlyTrend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Transactions"]} />
                                    <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                                        {analytics.monthlyTrend.map((_: any, idx: number) => (
                                            <Cell key={idx} fill={idx === analytics.monthlyTrend.length - 1 ? CHART_COLORS.revenue : "#e0e7ff"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}
