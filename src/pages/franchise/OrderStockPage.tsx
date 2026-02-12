import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useInventory, InventoryItem } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    ShoppingCart, Package, Search, Plus, Minus, Trash2, Send, Clock,
    CheckCircle2, XCircle, Store
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
    sku: string;
    itemName: string;
    quantity: number;
    availableInWarehouse: number;
}

export function OrderStockPage() {
    const { franchise } = useAuth();
    const { inventory, stockOrders, createStockOrder } = useInventory();
    const [searchQuery, setSearchQuery] = useState("");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Admin warehouse inventory (items without franchiseId)
    const warehouseItems = useMemo(() =>
        inventory.filter((item: InventoryItem) => !item.franchiseId && item.quantity > 0),
        [inventory]
    );

    // Filter warehouse items based on search
    const filteredWarehouse = useMemo(() => {
        if (!searchQuery.trim()) return warehouseItems;
        const q = searchQuery.toLowerCase();
        return warehouseItems.filter(item =>
            item.itemName.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q)
        );
    }, [searchQuery, warehouseItems]);

    // My orders (franchise's own orders)
    const myOrders = useMemo(() =>
        stockOrders.filter(o => o.franchiseId === franchise?.id),
        [stockOrders, franchise]
    );

    const handleAddToOrder = (item: InventoryItem) => {
        const existing = orderItems.find(oi => oi.sku === item.sku);
        if (existing) {
            if (existing.quantity >= item.quantity) {
                toast.error(`Only ${item.quantity} available in warehouse`);
                return;
            }
            setOrderItems(orderItems.map(oi =>
                oi.sku === item.sku ? { ...oi, quantity: oi.quantity + 1 } : oi
            ));
        } else {
            setOrderItems([...orderItems, {
                sku: item.sku,
                itemName: item.itemName,
                quantity: 1,
                availableInWarehouse: item.quantity,
            }]);
        }
        toast.success(`Added ${item.itemName}`);
    };

    const handleQuantityChange = (sku: string, delta: number) => {
        setOrderItems(orderItems.map(oi => {
            if (oi.sku !== sku) return oi;
            const newQty = oi.quantity + delta;
            if (newQty <= 0) return oi;
            if (newQty > oi.availableInWarehouse) {
                toast.error(`Only ${oi.availableInWarehouse} available`);
                return oi;
            }
            return { ...oi, quantity: newQty };
        }));
    };

    const handleRemoveItem = (sku: string) => {
        setOrderItems(orderItems.filter(oi => oi.sku !== sku));
    };

    const handleSubmitOrder = async () => {
        if (orderItems.length === 0) {
            toast.error("Add items to your order first");
            return;
        }
        if (!franchise) {
            toast.error("Franchise not found");
            return;
        }

        setIsSubmitting(true);
        const success = await createStockOrder({
            franchiseId: franchise.id,
            franchiseName: franchise.name,
            items: orderItems.map(oi => ({
                sku: oi.sku,
                itemName: oi.itemName,
                quantity: oi.quantity,
            })),
            notes: notes.trim() || undefined,
        });

        if (success) {
            toast.success("Stock order submitted! Admin will review shortly.");
            setOrderItems([]);
            setNotes("");
        } else {
            toast.error("Failed to submit order. Please try again.");
        }
        setIsSubmitting(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
            case "approved":
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
            case "rejected":
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            <div className="w-full max-w-[1400px] mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <HamburgerMenu />
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Order Stock</h1>
                        <p className="text-gray-600 text-sm">Request inventory from admin warehouse</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Left: Warehouse Catalog */}
                    <div className="space-y-4">
                        <Card className="border border-gray-200 bg-white">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg">Admin Warehouse</CardTitle>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search available items..."
                                        className="pl-9"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                                {filteredWarehouse.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                                        <p>No items available</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredWarehouse.map((item: InventoryItem) => (
                                            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                                                    <p className="text-xs text-gray-500">SKU: {item.sku} · {item.category}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        ₹{item.price.toFixed(2)} · <span className="font-medium text-green-600">{item.quantity} available</span>
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAddToOrder(item)}
                                                    className="gap-1 text-xs"
                                                >
                                                    <Plus className="w-3 h-3" /> Add
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Order Cart */}
                    <div className="space-y-4">
                        <Card className="border border-gray-200 bg-white">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" /> Your Order ({orderItems.length} items)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {orderItems.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                                        <p className="text-sm">Select items from the warehouse</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orderItems.map(item => (
                                            <div key={item.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                                                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleQuantityChange(item.sku, -1)}
                                                        className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-sm font-semibold w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item.sku, 1)}
                                                        className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveItem(item.sku)}
                                                        className="w-7 h-7 rounded hover:bg-red-100 flex items-center justify-center transition-colors ml-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {orderItems.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="orderNotes">Notes (optional)</Label>
                                            <Textarea
                                                id="orderNotes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Any special instructions..."
                                                rows={2}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSubmitOrder}
                                            disabled={isSubmitting}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            {isSubmitting ? "Submitting..." : "Submit Order Request"}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* My Orders History */}
                        <Card className="border border-gray-200 bg-white">
                            <CardHeader className="border-b border-gray-100">
                                <CardTitle className="text-lg">My Orders</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {myOrders.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {myOrders.map(order => (
                                            <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </p>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <div className="space-y-1">
                                                    {order.items.map((item, idx) => (
                                                        <p key={idx} className="text-sm text-gray-700">
                                                            {item.itemName} × {item.quantity}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
