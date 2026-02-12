import { useState, useEffect, useMemo } from "react";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory, InventoryItem } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    Package, Warehouse, Store, Search, MapPin
} from "lucide-react";
import { Input } from "../../components/ui/input";

type ViewTab = "warehouse" | "all-franchises" | "per-franchise";

export function AdminInventoryPage() {
    const { getAllFranchises } = useAuth();
    const { inventory, getTotalInventoryValue } = useInventory();
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ViewTab>("warehouse");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const load = async () => {
            const data = await getAllFranchises();
            setFranchises(data);
            setIsLoading(false);
        };
        load();
    }, [getAllFranchises]);

    // Separate admin warehouse vs franchise inventory
    const warehouseInventory = useMemo(() =>
        inventory.filter((item: InventoryItem) => !item.franchiseId),
        [inventory]
    );

    const franchiseInventory = useMemo(() =>
        inventory.filter((item: InventoryItem) => !!item.franchiseId),
        [inventory]
    );

    // Per-franchise breakdown
    const franchiseBreakdown = useMemo(() => {
        return franchises.map((f: Franchise) => {
            const items = inventory.filter((item: InventoryItem) => item.franchiseId === f.id);
            const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);
            const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            return { ...f, items, totalStock, totalValue };
        });
    }, [franchises, inventory]);

    // Get items for current view
    const currentItems = useMemo(() => {
        let items: InventoryItem[] = [];
        if (activeTab === "warehouse") {
            items = warehouseInventory;
        } else if (activeTab === "all-franchises") {
            items = franchiseInventory;
        } else if (activeTab === "per-franchise" && selectedFranchiseId) {
            items = inventory.filter((item: InventoryItem) => item.franchiseId === selectedFranchiseId);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(item =>
                item.itemName.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q)
            );
        }
        return items;
    }, [activeTab, warehouseInventory, franchiseInventory, inventory, selectedFranchiseId, searchQuery]);

    const warehouseTotal = warehouseInventory.reduce((sum, i) => sum + i.quantity, 0);
    const warehouseValue = warehouseInventory.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const getStockStatus = (quantity: number) => {
        if (quantity === 0) return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
        if (quantity <= 10) return { label: "Critical", color: "text-red-600 bg-red-50" };
        if (quantity <= 20) return { label: "Low Stock", color: "text-orange-600 bg-orange-50" };
        if (quantity <= 50) return { label: "Medium", color: "text-yellow-600 bg-yellow-50" };
        return { label: "Good Stock", color: "text-green-600 bg-green-50" };
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
                <div className="flex items-center gap-4">
                    <HamburgerMenu />
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Inventory Management</h1>
                        <p className="text-gray-600 text-sm">Admin warehouse and franchise inventories</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-6">
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Warehouse</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{warehouseTotal.toLocaleString()} units</p>
                                    <p className="text-xs text-gray-500">{warehouseInventory.length} SKUs · ₹{warehouseValue.toFixed(0)}</p>
                                </div>
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Warehouse className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Franchise Stock</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {franchiseInventory.reduce((s, i) => s + i.quantity, 0).toLocaleString()} units
                                    </p>
                                    <p className="text-xs text-gray-500">{franchiseInventory.length} SKUs across {franchises.length} franchises</p>
                                </div>
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Store className="w-5 h-5 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Inventory</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {inventory.reduce((s: number, i: InventoryItem) => s + i.quantity, 0).toLocaleString()} units
                                    </p>
                                    <p className="text-xs text-gray-500">₹{getTotalInventoryValue().toFixed(0)} total value</p>
                                </div>
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm w-fit">
                    {([
                        { key: "warehouse" as ViewTab, label: "Admin Warehouse", icon: Warehouse },
                        { key: "all-franchises" as ViewTab, label: "All Franchises", icon: Store },
                        { key: "per-franchise" as ViewTab, label: "Per Franchise", icon: MapPin },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2
                                ${activeTab === tab.key
                                    ? "bg-gray-900 text-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Per-franchise selector */}
                {activeTab === "per-franchise" && (
                    <div className="flex gap-3 flex-wrap">
                        {franchiseBreakdown.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setSelectedFranchiseId(f.id)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all
                                    ${selectedFranchiseId === f.id
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Store className="w-4 h-4" />
                                    <span>{f.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedFranchiseId === f.id ? "bg-white/20" : "bg-gray-100"}`}>
                                        {f.totalStock} units
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Franchise overview cards (when All Franchises tab) */}
                {activeTab === "all-franchises" && (
                    <div className="grid grid-cols-4 gap-4">
                        {franchiseBreakdown.map(f => (
                            <Card key={f.id} className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {f.region}, {f.state}
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Items</span>
                                            <span className="font-medium text-gray-700">{f.items.length} SKUs</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Stock</span>
                                            <span className="font-medium text-gray-700">{f.totalStock} units</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Value</span>
                                            <span className="font-semibold text-gray-900">₹{f.totalValue.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Search */}
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or SKU..."
                        className="pl-9"
                    />
                </div>

                {/* Inventory Table */}
                <Card className="border border-gray-200 bg-white">
                    <CardHeader className="border-b border-gray-100">
                        <CardTitle className="text-lg">
                            {activeTab === "warehouse" && `Admin Warehouse (${currentItems.length} items)`}
                            {activeTab === "all-franchises" && `All Franchise Inventory (${currentItems.length} items)`}
                            {activeTab === "per-franchise" && (
                                selectedFranchiseId
                                    ? `${franchises.find(f => f.id === selectedFranchiseId)?.name || "Franchise"} Inventory (${currentItems.length} items)`
                                    : "Select a franchise above"
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                    <tr className="text-left">
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900">Item Name</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900">SKU</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900">Category</th>
                                        {activeTab !== "warehouse" && (
                                            <th className="px-4 py-3 text-sm font-semibold text-gray-900">Franchise</th>
                                        )}
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Price</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Quantity</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Value</th>
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={activeTab !== "warehouse" ? 8 : 7} className="py-8 text-center text-gray-500">
                                                {activeTab === "per-franchise" && !selectedFranchiseId
                                                    ? "Select a franchise to view inventory"
                                                    : "No items found"}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((item: InventoryItem) => {
                                            const status = getStockStatus(item.quantity);
                                            const ownerFranchise = franchises.find(f => f.id === item.franchiseId);
                                            return (
                                                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 text-sm">{item.itemName}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{item.sku}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    {activeTab !== "warehouse" && (
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {ownerFranchise?.name || "—"}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.price.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
