import { useState } from "react";
import { Package, IndianRupee, AlertTriangle, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useInventory } from "../context/InventoryContext";
import { PageContainer } from "../components/layout/PageContainer";

export function InventoryPage() {
    const {
        inventory,
        getTotalInventoryValue,
        getTotalInventoryCount,
        getLowStockItems,
    } = useInventory();

    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    const totalValue = getTotalInventoryValue();
    const totalCount = getTotalInventoryCount();
    const lowStockItems = getLowStockItems(20);
    const uniqueCategories = Array.from(new Set(inventory.map((item) => item.category)));

    // Filter inventory based on search and category
    const filteredInventory = inventory.filter((item) => {
        const matchesSearch =
            item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.barcode && item.barcode.includes(searchQuery));
        const matchesCategory = filterCategory === "all" || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getStockStatus = (quantity: number) => {
        if (quantity === 0) return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
        if (quantity <= 10) return { label: "Critical", color: "text-red-600 bg-red-50" };
        if (quantity <= 20) return { label: "Low Stock", color: "text-orange-600 bg-orange-50" };
        if (quantity <= 50) return { label: "Medium", color: "text-yellow-600 bg-yellow-50" };
        return { label: "Good Stock", color: "text-green-600 bg-green-50" };
    };

    return (
        <PageContainer
            title="Inventory Details"
            subtitle="Monitor stock levels and inventory value"
            icon={<Package className="w-5 h-5 text-purple-600" />}
            iconBgColor="bg-purple-100"
        >
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Items */}
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Items</p>
                                <p className="text-3xl font-semibold text-gray-900 mt-2">
                                    {totalCount.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {inventory.length} unique SKUs
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Value */}
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Value</p>
                                <p className="text-3xl font-semibold text-gray-900 mt-2">
                                    ₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Current inventory worth</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <IndianRupee className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Low Stock Alert */}
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Low Stock Items</p>
                                <p className="text-3xl font-semibold text-gray-900 mt-2">
                                    {lowStockItems.length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Items ≤ 20 units</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Alert Section */}
            {lowStockItems.length > 0 && (
                <Card className="border border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-900">
                            <AlertTriangle className="w-5 h-5" />
                            Low Stock Alert
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {lowStockItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{item.itemName}</p>
                                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-orange-600">
                                            {item.quantity} units
                                        </p>
                                        <p className="text-xs text-gray-500">Reorder soon</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, SKU, or barcode..."
                        className="pl-9"
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {/* Inventory Table */}
            <Card className="border border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">
                        Individual SKU Stock ({filteredInventory.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-200">
                                <tr className="text-left">
                                    <th className="pb-3 text-sm font-semibold text-gray-900">Item Name</th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900">SKU</th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900">Category</th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900 text-right">
                                        Price
                                    </th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900 text-right">
                                        Quantity
                                    </th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900 text-right">
                                        Value
                                    </th>
                                    <th className="pb-3 text-sm font-semibold text-gray-900">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">
                                            No items found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInventory.map((item) => {
                                        const status = getStockStatus(item.quantity);
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100">
                                                <td className="py-4">
                                                    <p className="font-medium text-gray-900">{item.itemName}</p>
                                                    {item.barcode && (
                                                        <p className="text-xs text-gray-500">
                                                            Barcode: {item.barcode}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-4 text-sm text-gray-600">{item.sku}</td>
                                                <td className="py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-sm text-gray-900 text-right">
                                                    ₹{item.price.toFixed(2)}
                                                </td>
                                                <td className="py-4 text-sm font-semibold text-gray-900 text-right">
                                                    {item.quantity}
                                                </td>
                                                <td className="py-4 text-sm text-gray-900 text-right">
                                                    ₹{(item.price * item.quantity).toFixed(2)}
                                                </td>
                                                <td className="py-4">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                                    >
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
        </PageContainer>
    );
}
