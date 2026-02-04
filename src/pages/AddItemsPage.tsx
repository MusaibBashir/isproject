import { useState } from "react";
import { Scan, Package, Tag, Hash } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { useInventory } from "../context/InventoryContext";
import { PageContainer } from "../components/layout/PageContainer";

export function AddItemsPage() {
    const { addInventoryItem } = useInventory();
    const [barcode, setBarcode] = useState("");
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [description, setDescription] = useState("");
    const [sku, setSku] = useState("");

    const handleScanBarcode = () => {
        // Simulated barcode scan - in a real app, this would integrate with a barcode scanner
        const mockBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        setBarcode(mockBarcode);

        // Auto-generate SKU based on barcode
        setSku("SKU-" + mockBarcode.slice(-6));

        toast.success("Barcode scanned successfully");
    };

    const handleAddItem = async () => {
        // Validation
        if (!itemName.trim()) {
            toast.error("Please enter item name");
            return;
        }

        if (!price || parseFloat(price) <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        if (!quantity || parseInt(quantity) <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        // Create item object
        const newItem = {
            barcode,
            itemName,
            category,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            description,
            sku: sku || `SKU-${Date.now().toString().slice(-6)}`, // Auto-generate if empty
        };

        // Add item to inventory context
        const success = await addInventoryItem(newItem);

        if (success) {
            toast.success(`${itemName} added to inventory successfully!`);

            // Reset form
            setBarcode("");
            setItemName("");
            setCategory("");
            setPrice("");
            setQuantity("");
            setDescription("");
            setSku("");
        } else {
            toast.error("Failed to add item. Please try again.");
        }
    };

    const handleClearForm = () => {
        setBarcode("");
        setItemName("");
        setCategory("");
        setPrice("");
        setQuantity("");
        setDescription("");
        setSku("");
        toast.info("Form cleared");
    };

    return (
        <PageContainer
            title="Add New Item"
            subtitle="Add items to your inventory"
            icon={<Package className="w-5 h-5 text-blue-600" />}
            iconBgColor="bg-blue-100"
        >
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Barcode Section */}
                <Card className="border border-gray-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Scan className="w-5 h-5 text-blue-600" />
                            Barcode Scanner
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    className="bg-blue-600 hover:bg-blue-700 px-6"
                                >
                                    <Scan className="w-4 h-4 mr-2" />
                                    Scan
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Use a barcode scanner or click the scan button to simulate scanning
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="sku"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="Auto-generated or enter manually"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Item Details Section */}
                <Card className="border border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Item Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="itemName">
                                Item Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="itemName"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="Enter item name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g., Electronics, Clothing, Food"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter item description (optional)"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing & Quantity Section */}
                <Card className="border border-gray-200 bg-gradient-to-br from-green-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Pricing & Inventory</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">
                                    Price ($) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="quantity">
                                    Quantity <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {price && quantity && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Value:</span>
                                    <span className="text-xl font-semibold text-green-600">
                                        ${(parseFloat(price) * parseInt(quantity || "0")).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between gap-3">
                    <Button variant="outline" onClick={handleClearForm}>
                        Clear Form
                    </Button>
                    <Button
                        onClick={handleAddItem}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Add to Inventory
                    </Button>
                </div>
            </div>
        </PageContainer>
    );
}
