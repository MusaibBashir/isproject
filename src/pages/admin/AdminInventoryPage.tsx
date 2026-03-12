import { useState, useEffect, useMemo } from "react";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory, InventoryItem } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import { CameraScanner } from "../../components/CameraScanner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import {
    Package, Warehouse, Store, Search, MapPin, Scan, Plus, Camera, X, RefreshCw
} from "lucide-react";

type ViewTab = "warehouse" | "all-franchises" | "per-franchise";

export function AdminInventoryPage() {
    const { getAllFranchises } = useAuth();
    const { inventory, getTotalInventoryValue, refreshData, addInventoryItem, updateInventoryItem } = useInventory();
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ViewTab>("warehouse");
    const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Add / Restock panel state
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState("");
    const [manualBarcode, setManualBarcode] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [form, setForm] = useState({
        itemName: "",
        sku: "",
        barcode: "",
        category: "",
        price: "",
        quantity: "",
        description: "",
    });

    // Whether barcode matched an existing item (restock mode)
    const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
    const [restockQty, setRestockQty] = useState("");

    useEffect(() => {
        const load = async () => {
            await refreshData();
            const data = await getAllFranchises();
            setFranchises(data);
            setIsLoading(false);
        };
        load();
    }, [getAllFranchises, refreshData]);

    // Lookup barcode against existing warehouse inventory
    const lookupBarcode = (barcode: string) => {
        const existing = inventory.find(
            (i: InventoryItem) => i.barcode === barcode && !i.franchiseId
        );
        if (existing) {
            setMatchedItem(existing);
            setRestockQty("1");
            toast.success(`Found: ${existing.itemName} — enter qty to restock`);
        } else {
            setMatchedItem(null);
            setForm(f => ({ ...f, barcode, sku: barcode, itemName: "", category: "", price: "", quantity: "1", description: "" }));
            toast.info("New item — fill in the details to add to warehouse");
        }
    };

    const handleScanResult = (code: string) => {
        setScannedBarcode(code);
        setManualBarcode(code);
        lookupBarcode(code);
        setIsScanning(false);
    };

    const handleManualLookup = () => {
        if (!manualBarcode.trim()) return;
        setScannedBarcode(manualBarcode.trim());
        lookupBarcode(manualBarcode.trim());
    };

    const handleRestock = async () => {
        if (!matchedItem || !restockQty) return;
        const qty = parseInt(restockQty);
        if (isNaN(qty) || qty <= 0) { toast.error("Enter a valid quantity"); return; }
        setIsSaving(true);
        const ok = await updateInventoryItem(matchedItem.id, { quantity: matchedItem.quantity + qty });
        setIsSaving(false);
        if (ok) {
            toast.success(`Added ${qty} units to ${matchedItem.itemName}. New stock: ${matchedItem.quantity + qty}`);
            resetPanel();
        } else {
            toast.error("Failed to update stock");
        }
    };

    const handleAddNew = async () => {
        if (!form.itemName || !form.sku || !form.price || !form.quantity) {
            toast.error("Please fill in Name, SKU, Price and Quantity");
            return;
        }
        setIsSaving(true);
        const ok = await addInventoryItem({
            itemName: form.itemName,
            sku: form.sku,
            barcode: form.barcode || undefined,
            category: form.category || "General",
            price: parseFloat(form.price),
            quantity: parseInt(form.quantity),
            description: form.description || undefined,
        });
        setIsSaving(false);
        if (ok) {
            toast.success(`${form.itemName} added to warehouse`);
            resetPanel();
        } else {
            toast.error("Failed to add item");
        }
    };

    const resetPanel = () => {
        setShowAddPanel(false);
        setScannedBarcode("");
        setManualBarcode("");
        setMatchedItem(null);
        setRestockQty("");
        setForm({ itemName: "", sku: "", barcode: "", category: "", price: "", quantity: "", description: "" });
    };

    // Separate admin warehouse vs franchise inventory
    const warehouseInventory = useMemo(() =>
        inventory.filter((item: InventoryItem) => !item.franchiseId),
        [inventory]
    );

    const franchiseInventory = useMemo(() =>
        inventory.filter((item: InventoryItem) => !!item.franchiseId),
        [inventory]
    );

    const franchiseBreakdown = useMemo(() => {
        const inventoryFranchiseIds = new Set(
            inventory
                .filter((item: InventoryItem) => !!item.franchiseId)
                .map((item: InventoryItem) => item.franchiseId as string)
        );
        const allFranchiseIds = new Set([
            ...franchises.map((f: Franchise) => f.id),
            ...inventoryFranchiseIds,
        ]);
        return Array.from(allFranchiseIds).map(fId => {
            const known = franchises.find((f: Franchise) => f.id === fId);
            const items = inventory.filter((item: InventoryItem) => item.franchiseId === fId);
            const totalStock = items.reduce((sum: number, i: InventoryItem) => sum + i.quantity, 0);
            const totalValue = items.reduce((sum: number, i: InventoryItem) => sum + (i.price * i.quantity), 0);
            return {
                id: fId,
                name: known?.name || `Franchise ${fId.slice(0, 8)}`,
                region: known?.region || '—',
                state: known?.state || '—',
                owner_id: known?.owner_id || '',
                created_by: known?.created_by || '',
                is_active: known?.is_active ?? true,
                created_at: known?.created_at || '',
                items,
                totalStock,
                totalValue,
            };
        });
    }, [franchises, inventory]);

    const currentItems = useMemo(() => {
        let items: InventoryItem[] = [];
        if (activeTab === "warehouse") items = warehouseInventory;
        else if (activeTab === "all-franchises") items = franchiseInventory;
        else if (activeTab === "per-franchise" && selectedFranchiseId)
            items = inventory.filter((item: InventoryItem) => item.franchiseId === selectedFranchiseId);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(item =>
                item.itemName.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q) ||
                (item.barcode || "").toLowerCase().includes(q)
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
                <div className="flex items-center justify-between">
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
                    <Button
                        onClick={() => { setShowAddPanel(true); setMatchedItem(null); }}
                        className="bg-gray-900 hover:bg-gray-800 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add / Restock via Scan
                    </Button>
                </div>

                {/* Scan + Add Panel */}
                {showAddPanel && (
                    <Card className="border-2 border-dashed border-gray-300 bg-white shadow-sm">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Scan className="w-5 h-5 text-purple-600" />
                                    {matchedItem ? `Restock: ${matchedItem.itemName}` : scannedBarcode ? "New Item Details" : "Scan or Enter Barcode"}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={resetPanel} className="h-8 w-8">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Step 1: Scan */}
                            {!scannedBarcode ? (
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <Input
                                            value={manualBarcode}
                                            onChange={e => setManualBarcode(e.target.value)}
                                            placeholder="Enter or scan barcode..."
                                            className="flex-1"
                                            onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                                        />
                                        <Button onClick={handleManualLookup} variant="outline">
                                            <Search className="w-4 h-4 mr-2" /> Lookup
                                        </Button>
                                        <Button onClick={() => setIsScanning(true)} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                                            <Camera className="w-4 h-4 mr-2" /> Camera
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">Scan a barcode to restock an existing item, or add a new one.</p>
                                </div>
                            ) : matchedItem ? (
                                /* Step 2a: Restock existing */
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">{matchedItem.itemName}</p>
                                            <p className="text-sm text-gray-600 mt-1">SKU: {matchedItem.sku} · Current stock: <strong>{matchedItem.quantity}</strong> units</p>
                                            <p className="text-sm text-gray-600">Price: ₹{matchedItem.price.toFixed(2)} · Category: {matchedItem.category}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => { setScannedBarcode(""); setManualBarcode(""); setMatchedItem(null); }} className="text-xs">
                                            <RefreshCw className="w-3 h-3 mr-1" /> Rescan
                                        </Button>
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1">
                                            <Label>Units to Add *</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={restockQty}
                                                onChange={e => setRestockQty(e.target.value)}
                                                placeholder="e.g. 50"
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={handleRestock} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-8">
                                            {isSaving ? "Saving..." : `Add Stock → ${matchedItem.quantity + (parseInt(restockQty) || 0)} total`}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* Step 2b: New item form */
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                            Barcode <strong>{scannedBarcode}</strong> not found — fill in details to create a new product
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={() => { setScannedBarcode(""); setManualBarcode(""); }} className="text-xs">
                                            <RefreshCw className="w-3 h-3 mr-1" /> Rescan
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Item Name *</Label>
                                            <Input className="mt-1" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="e.g. Basmati Rice 5kg" />
                                        </div>
                                        <div>
                                            <Label>SKU *</Label>
                                            <Input className="mt-1" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. RICE-5KG" />
                                        </div>
                                        <div>
                                            <Label>Barcode</Label>
                                            <Input className="mt-1" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
                                        </div>
                                        <div>
                                            <Label>Category</Label>
                                            <Input className="mt-1" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Groceries" />
                                        </div>
                                        <div>
                                            <Label>Price (₹) *</Label>
                                            <Input className="mt-1" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <Label>Initial Quantity *</Label>
                                            <Input className="mt-1" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1" />
                                        </div>
                                        <div className="col-span-2">
                                            <Label>Description (optional)</Label>
                                            <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief product description" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={handleAddNew} disabled={isSaving} className="bg-gray-900 hover:bg-gray-800 px-8">
                                            {isSaving ? "Saving..." : "Add to Warehouse"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Camera Scanner Modal */}
                {isScanning && (
                    <CameraScanner
                        onScan={handleScanResult}
                        onClose={() => setIsScanning(false)}
                    />
                )}

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

                {/* Franchise overview cards */}
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
                        placeholder="Search by name, SKU or barcode..."
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
                                        <th className="px-4 py-3 text-sm font-semibold text-gray-900">Barcode</th>
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
                                            <td colSpan={activeTab !== "warehouse" ? 9 : 8} className="py-8 text-center text-gray-500">
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
                                                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.barcode || "—"}</td>
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
