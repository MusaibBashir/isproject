import { useState, useRef, useEffect, useMemo } from "react";
import { Scan, Keyboard, Plus, Trash2, IndianRupee, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { useInventory } from "../context/InventoryContext";
import { PageContainer } from "../components/layout/PageContainer";

interface SaleItem {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
    barcode?: string;
}

export function SalesPage() {
    const { getInventoryBySku, recordSale, inventory, getCustomerByPhone } = useInventory();
    const [entryMode, setEntryMode] = useState<"barcode" | "manual">("manual");
    const [items, setItems] = useState<SaleItem[]>([]);

    // Form fields
    const [selectedSku, setSelectedSku] = useState("");
    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [barcode, setBarcode] = useState("");

    // Customer details
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);

    // Fuzzy search state
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Levenshtein distance for fuzzy matching
    const levenshteinDistance = (a: string, b: string): number => {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    // Fuzzy filtered inventory items
    const filteredInventory = useMemo(() => {
        if (!searchQuery.trim()) return inventory;
        const query = searchQuery.toLowerCase();
        return inventory
            .map((item: any) => {
                const name = item.itemName.toLowerCase();
                const sku = item.sku.toLowerCase();
                // Exact substring match gets highest priority
                if (name.includes(query) || sku.includes(query)) {
                    return { ...item, score: 0 };
                }
                // Fuzzy match on name and sku
                const nameDistance = levenshteinDistance(query, name.substring(0, query.length));
                const skuDistance = levenshteinDistance(query, sku.substring(0, query.length));
                const minDistance = Math.min(nameDistance, skuDistance);
                // Allow matches within a reasonable threshold
                const threshold = Math.max(2, Math.floor(query.length / 3));
                if (minDistance <= threshold) {
                    return { ...item, score: minDistance };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.score - b.score);
    }, [searchQuery, inventory]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectItem = (sku: string) => {
        setSelectedSku(sku);
        const item = getInventoryBySku(sku);
        if (item) {
            setItemName(item.itemName);
            setPrice(item.price);
            setSearchQuery(item.itemName);
        }
        setIsDropdownOpen(false);
    };

    // Handle phone number change with auto-lookup
    const handlePhoneChange = async (phone: string) => {
        setCustomerPhone(phone);

        // Only lookup when phone has reasonable length (10+ digits)
        if (phone.replace(/\D/g, '').length >= 10) {
            setIsLookingUpCustomer(true);
            try {
                const customer = await getCustomerByPhone(phone);
                if (customer) {
                    setCustomerName(customer.name);
                    setCustomerEmail(customer.email || "");
                    toast.success(`Customer found: ${customer.name}`);
                }
            } catch (err) {
                console.error('Error looking up customer:', err);
            } finally {
                setIsLookingUpCustomer(false);
            }
        }
    };

    const handleAddItem = () => {
        if (!selectedSku) {
            toast.error("Please select an item from inventory");
            return;
        }

        if (quantity <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        const inventoryItem = getInventoryBySku(selectedSku);
        if (!inventoryItem) {
            toast.error("Item not found in inventory");
            return;
        }

        if (inventoryItem.quantity < quantity) {
            toast.error(`Only ${inventoryItem.quantity} units available in stock`);
            return;
        }

        const newItem: SaleItem = {
            id: Date.now().toString(),
            sku: inventoryItem.sku,
            name: inventoryItem.itemName,
            quantity,
            price: inventoryItem.price,
            barcode: inventoryItem.barcode,
        };

        setItems([...items, newItem]);

        // Reset item fields
        setSelectedSku("");
        setItemName("");
        setQuantity(1);
        setPrice(0);
        setBarcode("");
        setSearchQuery("");

        toast.success("Item added to sale");
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
        toast.success("Item removed");
    };

    const handleScanBarcode = () => {
        if (!barcode.trim()) {
            toast.error("Please enter a barcode");
            return;
        }

        // Find item by barcode
        const inventoryItem = inventory.find((item) => item.barcode === barcode);

        if (inventoryItem) {
            setSelectedSku(inventoryItem.sku);
            setItemName(inventoryItem.itemName);
            setPrice(inventoryItem.price);
            toast.success(`Found: ${inventoryItem.itemName}`);
        } else {
            toast.error("Barcode not found in inventory");
        }
    };

    const handleCompleteSale = async () => {
        if (items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        if (!customerName) {
            toast.error("Please enter customer name");
            return;
        }

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Record the sale and update inventory
        const success = await recordSale({
            items: items.map(item => ({
                sku: item.sku,
                itemName: item.name,
                quantity: item.quantity,
                price: item.price,
            })),
            customerName,
            customerPhone,
            customerEmail,
            total,
        });

        if (success) {
            toast.success(`Sale completed! Total: ₹${total.toFixed(2)}. Inventory updated.`);

            // Reset form
            setItems([]);
            setCustomerName("");
            setCustomerPhone("");
            setCustomerEmail("");
            setAdditionalNotes("");
        } else {
            toast.error("Failed to complete sale. Please check stock levels.");
        }
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <PageContainer
            title="New Sale"
            subtitle="Add items and customer details"
            icon={<IndianRupee className="w-5 h-5 text-green-600" />}
            iconBgColor="bg-green-100"
        >
            <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Item Entry */}
                <div className="space-y-6">
                    <Card className="border border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Add Item</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Entry Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => setEntryMode("manual")}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${entryMode === "manual"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    <Keyboard className="w-4 h-4" />
                                    Manual Entry
                                </button>
                                <button
                                    onClick={() => setEntryMode("barcode")}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${entryMode === "barcode"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    <Scan className="w-4 h-4" />
                                    Scan Barcode
                                </button>
                            </div>

                            {/* Barcode Scanner */}
                            {entryMode === "barcode" && (
                                <div className="space-y-2">
                                    <Label htmlFor="barcode">Barcode</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="barcode"
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="Scan or enter barcode"
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleScanBarcode}
                                            variant="outline"
                                            className="px-3"
                                        >
                                            <Scan className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Item Details - Fuzzy Search */}
                            <div className="space-y-2" ref={dropdownRef}>
                                <Label htmlFor="itemSearch">Search Item *</Label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="itemSearch"
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e: any) => {
                                                setSearchQuery(e.target.value);
                                                setIsDropdownOpen(true);
                                                if (!e.target.value) {
                                                    setSelectedSku("");
                                                    setItemName("");
                                                    setPrice(0);
                                                }
                                            }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            placeholder="Type to search items..."
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                                            autoComplete="off"
                                        />
                                    </div>
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredInventory.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No items found{searchQuery && " — try a different search"}
                                                </div>
                                            ) : (
                                                filteredInventory.map((item: any) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => handleSelectItem(item.sku)}
                                                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedSku === item.sku ? "bg-blue-50" : ""
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                                                                <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium text-gray-700">₹{item.price.toFixed(2)}</p>
                                                                <p className={`text-xs ${item.quantity > 0 ? "text-green-600" : "text-red-500"}`}>
                                                                    {item.quantity} in stock
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSku && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm font-medium text-gray-900">{itemName}</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Price: ₹{price.toFixed(2)} | Stock: {getInventoryBySku(selectedSku)?.quantity || 0} units
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantity *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (₹) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleAddItem}
                                className="w-full bg-gray-900 hover:bg-gray-800"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Customer Details */}
                    <Card className="border border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Phone Number First - for customer lookup */}
                            <div className="space-y-2">
                                <Label htmlFor="customerPhone">
                                    Phone Number *
                                    {isLookingUpCustomer && <span className="ml-2 text-sm text-blue-500">(Looking up...)</span>}
                                </Label>
                                <Input
                                    id="customerPhone"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="Enter phone number to auto-fill customer"
                                />
                                <p className="text-xs text-gray-500">Enter phone to find existing customer or create new</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerName">Customer Name *</Label>
                                <Input
                                    id="customerName"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter customer name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerEmail">Email</Label>
                                <Input
                                    id="customerEmail"
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Additional Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="Any special instructions or notes"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Items List & Summary */}
                <div className="space-y-6">
                    <Card className="border border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Items ({items.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No items added yet</p>
                                    <p className="text-sm mt-1">Add items to start the sale</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                {item.barcode && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Barcode: {item.barcode}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {item.quantity} × ₹{item.price.toFixed(2)} = ₹
                                                    {(item.quantity * item.price).toFixed(2)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors ml-2"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sale Summary */}
                    <Card className="border border-gray-200 bg-gray-50">
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="text-gray-900 font-medium">
                                        ₹{total.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Tax (0%)</span>
                                    <span className="text-gray-900 font-medium">₹0.00</span>
                                </div>
                                <div className="border-t border-gray-300 pt-3">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900">Total</span>
                                        <span className="text-2xl font-semibold text-gray-900">
                                            ₹{total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Complete Sale Button */}
                    <Button
                        onClick={handleCompleteSale}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                    >
                        Complete Sale
                    </Button>
                </div>
            </div>
        </PageContainer>
    );
}
