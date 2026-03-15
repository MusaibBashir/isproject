import { useState, useRef, useEffect, useMemo } from "react";
import { Scan, Keyboard, Plus, Trash2, IndianRupee, Search, CreditCard, Banknote, Smartphone, RefreshCw, PauseCircle, PlayCircle, Printer, Camera, Star } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import { PageContainer } from "../components/layout/PageContainer";
import { printReceipt } from "../utils/printReceipt";
import { CameraScanner } from "../components/CameraScanner";
import { useRazorpay } from "react-razorpay";
import { createOrderToken, printTokenReceipt } from "../services/tokenService";
import { getRestaurantMenu, MenuItem } from "../services/menuService";

interface SaleItem {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
    barcode?: string;
    discount?: number;
    discountType?: 'percent' | 'flat';
    discountValue?: number;
}

export function SalesPage() {
    const { getInventoryBySku, recordSale, inventory, getCustomerByPhone } = useInventory();
    const { profile, franchise, activeBusinessAccount } = useAuth();

    // Menu items for restaurants
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(false);

    // Franchise users: show only THEIR items. Admin: show all.
    const myInventory = useMemo(() => {
        if (profile?.role === "admin") return inventory;
        if (!franchise?.id) return [];
        return inventory.filter((item: any) => item.franchiseId === franchise.id);
    }, [inventory, profile?.role, franchise?.id]);

    // Load menu if restaurant
    useEffect(() => {
        if (activeBusinessAccount?.business_type === "restaurant" && activeBusinessAccount?.id) {
            setLoadingMenu(true);
            getRestaurantMenu(activeBusinessAccount.id)
                .then(items => setMenuItems(items))
                .catch(err => {
                    console.error("Error loading menu:", err);
                    toast.error("Failed to load menu items");
                })
                .finally(() => setLoadingMenu(false));
        }
    }, [activeBusinessAccount?.id, activeBusinessAccount?.business_type]);
    const [entryMode, setEntryMode] = useState<"barcode" | "manual">("manual");
    const [items, setItems] = useState<SaleItem[]>([]);
    const { Razorpay } = useRazorpay();
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    useEffect(() => {
        if (razorpayKey) {
            console.log(`[SalesPage] Razorpay key found: ${razorpayKey.substring(0, 4)}...`);
        } else {
            console.warn("[SalesPage] Razorpay key is MISSING from environment.");
        }
    }, [razorpayKey]);

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

    // Restaurant Order State
    const [isRestaurantOrder, setIsRestaurantOrder] = useState(false);
    const [specialInstructions, setSpecialInstructions] = useState("");

    // Payment Method State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'split'>('cash');
    const [paymentDetails, setPaymentDetails] = useState({ cash: 0, upi: 0, card: 0 });

    // Advanced Pricing State
    const [cartDiscountType, setCartDiscountType] = useState<'percent' | 'flat'>('flat');
    const [cartDiscountValue, setCartDiscountValue] = useState(0);
    const [taxRate, setTaxRate] = useState(0);

    // Points State
    const [customerPointsBalance, setCustomerPointsBalance] = useState(0);
    const [pointsToUse, setPointsToUse] = useState(0);

    // Dynamic Computations
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [items]);

    const itemsDiscountTotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.discount || 0), 0);
    }, [items]);

    const cartDiscountAmount = useMemo(() => {
        if (!cartDiscountValue) return 0;
        const subtotalAfterItems = subtotal - itemsDiscountTotal;
        if (cartDiscountType === 'percent') {
            return subtotalAfterItems * (cartDiscountValue / 100);
        }
        return cartDiscountValue;
    }, [subtotal, itemsDiscountTotal, cartDiscountType, cartDiscountValue]);

    const totalDiscount = itemsDiscountTotal + cartDiscountAmount;

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const taxAmount = taxableAmount * (taxRate / 100);
    const totalBeforePoints = taxableAmount + taxAmount;

    // Points logic: 1 point = 1 rupee. Cannot use more points than balance or grand total.
    const maxPointsUsable = Math.min(customerPointsBalance, Math.floor(totalBeforePoints));
    const actualPointsUsed = Math.min(pointsToUse, maxPointsUsable);
    const grandTotal = totalBeforePoints - actualPointsUsed;

    // Held Sale State
    const [hasHeldSale, setHasHeldSale] = useState(false);

    // Camera Scanner State
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        // Check if there's a held sale on mount
        const heldSale = localStorage.getItem('heldSale');
        if (heldSale) {
            setHasHeldSale(true);
        }
    }, []);

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

    // Fuzzy filtered inventory items (or menu items for restaurants)
    const filteredInventory = useMemo(() => {
        const itemsToSearch = activeBusinessAccount?.business_type === "restaurant" ? menuItems : myInventory;
        
        if (!searchQuery.trim()) return itemsToSearch;
        const query = searchQuery.toLowerCase();
        
        const levenshtein = (a: string, b: string): number => {
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
        
        return itemsToSearch
            .map((item: any) => {
                const name = activeBusinessAccount?.business_type === "restaurant" 
                    ? item.item_name.toLowerCase() 
                    : item.itemName.toLowerCase();
                const sku = item.sku?.toLowerCase() || "";
                // Exact substring match gets highest priority
                if (name.includes(query) || sku.includes(query)) {
                    return { ...item, score: 0 };
                }
                // Fuzzy match on name and sku
                const nameDistance = levenshtein(query, name.substring(0, query.length));
                const skuDistance = sku ? levenshtein(query, sku.substring(0, query.length)) : Infinity;
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
    }, [searchQuery, myInventory, menuItems, activeBusinessAccount?.business_type]);

    // Close dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape: Close dropdowns
            if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }

            // F2: Focus Search
            if (e.key === 'F2') {
                e.preventDefault();
                const searchInput = document.getElementById('itemSearch');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // F4: Complete Sale
            if (e.key === 'F4') {
                e.preventDefault();
                handleCompleteSale();
            }

            // Ctrl+H (or Cmd+H): Hold Sale
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                handleHoldSale();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, customerName, paymentMethod, paymentDetails, grandTotal]); // Dependencies needed for complete sale/hold sale handlers

    const handleSelectItem = (itemIdentifier: string) => {
        if (activeBusinessAccount?.business_type === "restaurant") {
            // For restaurants, itemIdentifier is the menu item name
            const menuItem = menuItems.find((item: MenuItem) => item.item_name === itemIdentifier);
            if (menuItem) {
                setSelectedSku(menuItem.id); // Use item ID as SKU equivalent
                setItemName(menuItem.item_name);
                setPrice(menuItem.price);
                setSearchQuery(menuItem.item_name);
            }
        } else {
            // For franchises, use SKU lookup
            setSelectedSku(itemIdentifier);
            const item = getInventoryBySku(itemIdentifier);
            if (item) {
                setItemName(item.itemName);
                setPrice(item.price);
                setSearchQuery(item.itemName);
            }
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
                    setCustomerPointsBalance(customer.pointsBalance || 0);
                    toast.success(`Customer found: ${customer.name}`);
                } else {
                    setCustomerPointsBalance(0);
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
            toast.error("Please select an item");
            return;
        }

        if (quantity <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        if (activeBusinessAccount?.business_type === "restaurant") {
            // For restaurants, selectedSku is the menu item ID
            const menuItem = menuItems.find((item: MenuItem) => item.id === selectedSku);
            if (!menuItem) {
                toast.error("Menu item not found");
                return;
            }

            const newItem: SaleItem = {
                id: Date.now().toString(),
                sku: menuItem.id,
                name: menuItem.item_name,
                quantity,
                price: menuItem.price,
                discount: 0,
                discountType: 'flat',
                discountValue: 0
            };

            setItems([...items, newItem]);
            toast.success("Item added to order");
        } else {
            // For franchises, use inventory logic
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
                discount: 0,
                discountType: 'flat',
                discountValue: 0
            };

            setItems([...items, newItem]);
            toast.success("Item added to sale");
        }

        // Reset item fields
        setSelectedSku("");
        setItemName("");
        setQuantity(1);
        setPrice(0);
        setBarcode("");
        setSearchQuery("");
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
        toast.success("Item removed");
    };

    const handleUpdateItemDiscount = (id: string, type: 'percent' | 'flat', value: number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                let discountAmount = 0;
                const itemTotal = item.price * item.quantity;
                if (type === 'percent') {
                    discountAmount = itemTotal * (value / 100);
                } else {
                    discountAmount = value;
                }
                return {
                    ...item,
                    discountType: type,
                    discountValue: value,
                    discount: discountAmount
                };
            }
            return item;
        }));
    };

    const handleUpdateItemQuantity = (id: string, newQuantity: number) => {
        if (newQuantity <= 0) return;
        setItems(items.map(item => {
            if (item.id === id) {
                // Skip stock check for restaurants
                if (activeBusinessAccount?.business_type !== "restaurant") {
                    // Check stock (optional but good practice) for franchises only
                    const inventoryItem = myInventory.find((i: any) => i.sku === item.sku);
                    if (inventoryItem && inventoryItem.quantity < newQuantity) {
                        toast.error(`Only ${inventoryItem.quantity} units available in stock for ${item.name}`);
                        return item; // Keep old quantity
                    }
                }

                // Recalculate discount if it's a percentage
                let discountAmount = item.discount || 0;
                if (item.discountType === 'percent' && item.discountValue) {
                    const newItemTotal = item.price * newQuantity;
                    discountAmount = newItemTotal * (item.discountValue / 100);
                }

                return { ...item, quantity: newQuantity, discount: discountAmount };
            }
            return item;
        }));
    };

    const handleUpdateItemPrice = (id: string, newPrice: number) => {
        if (newPrice < 0) return;
        setItems(items.map(item => {
            if (item.id === id) {
                // Recalculate discount if it's a percentage
                let discountAmount = item.discount || 0;
                if (item.discountType === 'percent' && item.discountValue) {
                    const newItemTotal = newPrice * item.quantity;
                    discountAmount = newItemTotal * (item.discountValue / 100);
                }

                return { ...item, price: newPrice, discount: discountAmount };
            }
            return item;
        }));
    };

    const handleScanBarcode = (scannedBarcode?: string) => {
        if (activeBusinessAccount?.business_type === "restaurant") {
            toast.error("Barcode scanning is not available for restaurants");
            return;
        }

        const barcodeToLookup = scannedBarcode || barcode;
        if (!barcodeToLookup.trim()) {
            toast.error("Please enter a barcode");
            return;
        }

        // Find item by barcode
        const inventoryItem = myInventory.find((item: any) => item.barcode === barcodeToLookup);

        if (inventoryItem) {
            setSelectedSku(inventoryItem.sku);
            setItemName(inventoryItem.itemName);
            setPrice(inventoryItem.price);
            setBarcode(barcodeToLookup);
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

        if (paymentMethod === 'split') {
            const splitTotal = (paymentDetails.cash || 0) + (paymentDetails.upi || 0) + (paymentDetails.card || 0);
            if (Math.abs(splitTotal - grandTotal) > 0.01) {
                toast.error(`Split payment amounts (₹${splitTotal.toFixed(2)}) must equal the grand total (₹${grandTotal.toFixed(2)})`);
                return;
            }
        }

        const processSale = async (transactionId?: string, printWindow?: Window | null, skipReceiptAndReset?: boolean) => {
            // Record the sale and update inventory
            const saleResult = await recordSale({
                items: items.map(item => ({
                    sku: item.sku,
                    itemName: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    discount: item.discount,
                    discountType: item.discountType,
                    discountValue: item.discountValue,
                })),
                customerName,
                customerPhone,
                customerEmail,
                total: grandTotal,
                subtotal,
                discountTotal: totalDiscount,
                taxRate,
                taxAmount,
                paymentMethod,
                paymentDetails: (paymentMethod === 'split'
                    ? paymentDetails
                    : (transactionId ? { razorpay_payment_id: transactionId } : undefined)) as any,
                pointsUsed: actualPointsUsed
            }, {
                // Skip inventory checks for restaurant orders
                skipInventoryCheck: activeBusinessAccount?.business_type === "restaurant"
            });

            const success = saleResult.success;

            if (skipReceiptAndReset) {
                // For card/UPI: receipt was already printed and cart was already reset
                // immediately after payment. Just propagate failure so the caller can toast.
                if (!success) throw new Error("DB record failed");
                return;
            }

            if (success) {
                // Feature 2: Create token for restaurant orders
                if (isRestaurantOrder && activeBusinessAccount && saleResult.saleId) {
                    try {
                        const tokenResult = await createOrderToken({
                            sale_id: saleResult.saleId,
                            business_account_id: activeBusinessAccount.id,
                            customer_name: customerName,
                            order_items: items.map(item => `${item.name} x${item.quantity}`).join(", "),
                            notes: specialInstructions,
                            is_restaurant_order: true
                        });

                        if (tokenResult.success) {
                            // Print token receipt if enabled
                            const itemsStr = items.map(item => `${item.name} x${item.quantity}`).join("\n");
                            printTokenReceipt(
                                tokenResult.data.token_number,
                                customerName,
                                itemsStr,
                                grandTotal,
                                specialInstructions
                            );
                            toast.success(`Order #${tokenResult.data.token_number} created!`);
                        } else {
                            console.error("Token creation failed:", tokenResult.error);
                        }
                    } catch (error) {
                        console.error("Token creation error:", error);
                        // Don't fail the sale if token creation fails
                    }
                }

                // Print receipt in a new window (cash/split path)
                printReceipt(
                    {
                        date: new Date().toISOString(),
                        customerName,
                        customerPhone,
                        customerEmail,
                        items: items.map(item => ({
                            itemName: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            discount: item.discount,
                            discountType: item.discountType,
                            discountValue: item.discountValue,
                        })),
                        subtotal,
                        discountTotal: totalDiscount,
                        taxRate,
                        taxAmount,
                        total: grandTotal,
                        paymentMethod,
                        paymentDetails: paymentMethod === 'split' ? paymentDetails : undefined,
                        transactionId,
                    },
                    {
                        name: franchise?.name || "Mercanta",
                        address: franchise?.region ? `${franchise.region}, ${franchise.state}` : "Demo Address",
                    },
                    printWindow
                );

                // Reset form
                handleClearCart();
                toast.success("Sale completed successfully!");
            } else {
                const errorMsg = profile?.role === "admin" 
                    ? `Sale failed: ${error || "Database error"}` 
                    : "Failed to complete sale. Check console for details.";
                toast.error(errorMsg);
            }
        };


        if (paymentMethod === 'card' || paymentMethod === 'upi') {
            if (!razorpayKey) {
                toast.error("Razorpay Sandbox Key is missing in .env configurations.");
                return;
            }

            // Capture a snapshot of all the data needed to print the receipt right now,
            // before any async DB operations that would delay printing.
            const receiptItems = items.map(item => ({
                itemName: item.name,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                discountType: item.discountType,
                discountValue: item.discountValue,
            }));
            const receiptSubtotal = subtotal;
            const receiptDiscountTotal = totalDiscount;
            const receiptTaxRate = taxRate;
            const receiptTaxAmount = taxAmount;
            const receiptGrandTotal = grandTotal;
            const receiptCustomerName = customerName;
            const receiptCustomerPhone = customerPhone;
            const receiptCustomerEmail = customerEmail;
            const receiptPaymentMethod = paymentMethod;
            const receiptShopName = franchise?.name || "Mercanta";
            const receiptShopAddress = franchise?.region ? `${franchise.region}, ${franchise.state}` : "Demo Address";

            // Open window synchronously to bypass popup blocker
            const printTarget = window.open("", "_blank");
            if (printTarget) {
                printTarget.document.write("<html><head><title>Processing Payment...</title></head><body style='font-family:sans-serif;padding:2rem;text-align:center;'><h2>Processing Payment...</h2><p>Please complete the payment in the Razorpay popup.<br>This window will update with your receipt automatically.</p></body></html>");
            }

            const options = {
                key: razorpayKey,
                amount: Math.round(grandTotal * 100).toString(),
                currency: "INR",
                name: franchise?.name || "Mercanta Store",
                description: `Purchase Payment`,
                handler: async function (response: any) {
                    const transactionId = response.razorpay_payment_id;
                    toast.success(`Payment successful! Txn ID: ${transactionId}`);

                    // Print the receipt IMMEDIATELY — all data is already captured above.
                    // Do NOT wait for the DB recordSale call.
                    printReceipt(
                        {
                            date: new Date().toISOString(),
                            customerName: receiptCustomerName,
                            customerPhone: receiptCustomerPhone,
                            customerEmail: receiptCustomerEmail,
                            items: receiptItems,
                            subtotal: receiptSubtotal,
                            discountTotal: receiptDiscountTotal,
                            taxRate: receiptTaxRate,
                            taxAmount: receiptTaxAmount,
                            total: receiptGrandTotal,
                            paymentMethod: receiptPaymentMethod,
                            transactionId,
                        },
                        {
                            name: receiptShopName,
                            address: receiptShopAddress,
                        },
                        printTarget
                    );

                    // Reset the cart immediately so the cashier can start the next sale.
                    handleClearCart();
                    toast.success("Sale completed successfully!");

                    // Record the sale to the database in the background.
                    // If it fails, show an error toast — the receipt has already been printed.
                    processSale(transactionId, null, true).catch(() => {
                        toast.error("Payment recorded but sale DB entry failed. Please log this manually.");
                    });
                },
                modal: {
                    ondismiss: function () {
                        if (printTarget && !printTarget.closed) {
                            printTarget.close();
                        }
                    }
                },
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone,
                },
                theme: {
                    color: "#9333ea", // purple-600
                },
            };

            const rzp = new Razorpay(options as any);
            rzp.on("payment.failed", function (response: any) {
                toast.error(`Payment Failed: ${response.error.description || "Unknown error"}`);
                if (printTarget && !printTarget.closed) {
                    printTarget.close();
                }
            });
            rzp.open();
        } else {
            // Process cash or split immediately
            await processSale();
        }
    };

    const handleClearCart = () => {
        setItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setAdditionalNotes("");
        setCartDiscountType('flat');
        setCartDiscountValue(0);
        // setTaxRate(0); // Keeping tax rate context
        setPaymentMethod('cash');
        setPaymentDetails({ cash: 0, upi: 0, card: 0 });
        setCustomerPointsBalance(0);
        setPointsToUse(0);
    };

    const handleHoldSale = () => {
        if (items.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        const saleData = {
            items,
            customerName,
            customerPhone,
            customerEmail,
            additionalNotes,
            cartDiscountType,
            cartDiscountValue,
            taxRate
        };

        localStorage.setItem('heldSale', JSON.stringify(saleData));
        setHasHeldSale(true);
        handleClearCart();
        toast.success("Sale placed on hold");
    };

    const handleResumeSale = () => {
        const heldSale = localStorage.getItem('heldSale');
        if (heldSale) {
            try {
                const saleData = JSON.parse(heldSale);
                setItems(saleData.items || []);
                setCustomerName(saleData.customerName || "");
                setCustomerPhone(saleData.customerPhone || "");
                setCustomerEmail(saleData.customerEmail || "");
                setAdditionalNotes(saleData.additionalNotes || "");
                setCartDiscountType(saleData.cartDiscountType || 'flat');
                setCartDiscountValue(saleData.cartDiscountValue || 0);
                setTaxRate(saleData.taxRate || 0);

                localStorage.removeItem('heldSale');
                setHasHeldSale(false);
                toast.success("Sale resumed");
            } catch (error) {
                console.error("Error parsing held sale:", error);
                toast.error("Failed to resume sale");
            }
        } else {
            toast.error("No held sale found");
        }
    };

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
                            {/* Entry Mode Toggle - Only for franchises */}
                            {activeBusinessAccount?.business_type !== "restaurant" && (
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
                            )}

                            {/* Barcode Scanner - Only for franchises */}
                            {activeBusinessAccount?.business_type !== "restaurant" && entryMode === "barcode" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="barcode">Barcode</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="barcode"
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                placeholder="Scan or enter barcode"
                                                className="flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleScanBarcode();
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={() => handleScanBarcode()}
                                                variant="outline"
                                                className="px-3"
                                                title="Search Barcode"
                                            >
                                                <Scan className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                    </div>

                                    <Button
                                        onClick={() => setIsScanning(true)}
                                        variant="outline"
                                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Scan with Camera
                                    </Button>

                                    {isScanning && (
                                        <CameraScanner
                                            onScan={(decodedText) => {
                                                handleScanBarcode(decodedText);
                                            }}
                                            onClose={() => setIsScanning(false)}
                                        />
                                    )}
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
                                                filteredInventory.map((item: any) => {
                                                    const isRestaurant = activeBusinessAccount?.business_type === "restaurant";
                                                    const itemId = isRestaurant ? item.id : item.sku;
                                                    const itemName = isRestaurant ? item.item_name : item.itemName;
                                                    return (
                                                        <button
                                                            key={itemId}
                                                            type="button"
                                                            onClick={() => handleSelectItem(itemName)}
                                                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${selectedSku === itemId ? "bg-blue-50" : ""
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{itemName}</p>
                                                                    {isRestaurant ? (
                                                                        <>
                                                                            <p className="text-xs text-gray-500">{item.category}</p>
                                                                            {item.description && (
                                                                                <p className="text-xs text-gray-400">{item.description}</p>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-medium text-gray-700">₹{item.price.toFixed(2)}</p>
                                                                    {!isRestaurant && (
                                                                        <p className={`text-xs ${item.quantity > 0 ? "text-green-600" : "text-red-500"}`}>
                                                                            {item.quantity} in stock
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })
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

                            {/* Restaurant Order Option */}
                            {activeBusinessAccount?.business_type === "restaurant" && (
                                <>
                                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                        <input
                                            type="checkbox"
                                            id="isRestaurantOrder"
                                            checked={isRestaurantOrder}
                                            onChange={(e) => setIsRestaurantOrder(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="isRestaurantOrder" className="text-sm font-medium text-gray-700">
                                            🍽️ Create Order Token
                                        </label>
                                    </div>

                                    {isRestaurantOrder && (
                                        <div className="space-y-2">
                                            <Label htmlFor="specialInstructions">Special Instructions</Label>
                                            <Textarea
                                                id="specialInstructions"
                                                value={specialInstructions}
                                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                                placeholder="E.g., No peanuts, Extra sauce, Mild spice..."
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Items List & Summary */}
                <div className="space-y-6">
                    <Card className="border border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Items ({items.length})</CardTitle>
                            <div className="flex gap-2">
                                {hasHeldSale && items.length === 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResumeSale}
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                        title="Resume Held Sale"
                                    >
                                        <PlayCircle className="w-4 h-4 mr-1" />
                                        Resume
                                    </Button>
                                )}
                                {items.length > 0 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleHoldSale}
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                            title="Hold Sale"
                                        >
                                            <PauseCircle className="w-4 h-4 mr-1" />
                                            Hold
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearCart}
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            title="Clear Cart"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1" />
                                            Clear
                                        </Button>
                                    </>
                                )}
                            </div>
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
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{item.name}</p>
                                                        {item.barcode && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Barcode: {item.barcode}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900">
                                                            ₹{((item.quantity * item.price) - (item.discount || 0)).toFixed(2)}
                                                        </p>
                                                        {(item.discount || 0) > 0 && (
                                                            <p className="text-xs text-red-500 line-through">
                                                                ₹{(item.quantity * item.price).toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-gray-500">Qty:</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                                            className="h-7 w-16 text-xs"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-gray-500">Price (₹):</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.price}
                                                            onChange={(e) => handleUpdateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                                            className="h-7 w-24 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Item Discount Controls */}
                                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                                    <span className="text-xs text-gray-500 w-16">Discount:</span>
                                                    <div className="flex flex-1 gap-1">
                                                        <div className="flex rounded-md shadow-sm">
                                                            <button
                                                                onClick={() => handleUpdateItemDiscount(item.id, 'flat', item.discountValue || 0)}
                                                                className={`px-2 py-1 text-xs font-medium border rounded-l-md ${item.discountType === 'flat' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                                            >
                                                                ₹
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateItemDiscount(item.id, 'percent', item.discountValue || 0)}
                                                                className={`px-2 py-1 text-xs font-medium border-t border-b border-r rounded-r-md ${item.discountType === 'percent' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                                            >
                                                                %
                                                            </button>
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step={item.discountType === 'percent' ? "0.1" : "0.01"}
                                                            className="h-7 text-xs w-20"
                                                            value={item.discountValue || ''}
                                                            onChange={(e) => handleUpdateItemDiscount(item.id, item.discountType || 'flat', parseFloat(e.target.value) || 0)}
                                                            placeholder={item.discountType === 'percent' ? "%" : "Amount"}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors ml-4 self-start"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Advanced Pricing Controls */}
                    <Card className="border border-gray-200 bg-gray-50">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-600">Cart Discount</Label>
                                        <div className="flex gap-1">
                                            <div className="flex rounded-md shadow-sm">
                                                <button
                                                    onClick={() => setCartDiscountType('flat')}
                                                    className={`px-3 py-1.5 text-sm font-medium border rounded-l-md ${cartDiscountType === 'flat' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    ₹
                                                </button>
                                                <button
                                                    onClick={() => setCartDiscountType('percent')}
                                                    className={`px-3 py-1.5 text-sm font-medium border-t border-b border-r rounded-r-md ${cartDiscountType === 'percent' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    %
                                                </button>
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="flex-1"
                                                value={cartDiscountValue || ''}
                                                onChange={(e) => setCartDiscountValue(parseFloat(e.target.value) || 0)}
                                                placeholder={cartDiscountType === 'percent' ? "%" : "Amount"}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-gray-600">Tax Options</Label>
                                        <select
                                            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                                        >
                                            <option value="0">No Tax (0%)</option>
                                            <option value="5">GST 5%</option>
                                            <option value="12">GST 12%</option>
                                            <option value="18">GST 18%</option>
                                            <option value="28">GST 28%</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="text-gray-900 font-medium">₹{subtotal.toFixed(2)}</span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span className="font-medium">-₹{totalDiscount.toFixed(2)}</span>
                                    </div>
                                )}

                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Tax ({taxRate}%)</span>
                                        <span className="text-gray-900 font-medium">+₹{taxAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {customerPointsBalance > 0 && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label htmlFor="pointsUsed" className="flex items-center gap-2 text-indigo-700">
                                                <Star className="w-4 h-4 fill-indigo-700" />
                                                Use Points
                                            </Label>
                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                Balance: {customerPointsBalance} pts
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                id="pointsUsed"
                                                type="number"
                                                min="0"
                                                max={maxPointsUsable}
                                                value={pointsToUse}
                                                onChange={(e) => setPointsToUse(Math.min(parseInt(e.target.value) || 0, maxPointsUsable))}
                                                className="w-24 border-indigo-200"
                                            />
                                            <span className="text-sm text-gray-500">
                                                = -₹{actualPointsUsed.toFixed(2)}
                                            </span>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="ml-auto text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                                onClick={() => setPointsToUse(maxPointsUsable)}
                                            >
                                                Use Max
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-300 pt-3">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900">Total</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-semibold text-gray-900 block">
                                                ₹{grandTotal.toFixed(2)}
                                            </span>
                                            <span className="text-xs text-gray-500">Earns {Math.floor(grandTotal / 100)} Points</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="mt-6 pt-6 border-t border-gray-300">
                                <Label className="text-sm font-semibold text-gray-900 mb-3 block">Payment Method</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-colors ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Banknote className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">Cash</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('upi')}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-colors ${paymentMethod === 'upi' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Smartphone className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">UPI</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-colors ${paymentMethod === 'card' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <CreditCard className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-medium">Card</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('split')}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-colors ${paymentMethod === 'split' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex mb-1">
                                            <Banknote className="w-3 h-3 -mr-1" />
                                            <CreditCard className="w-3 h-3 mt-1" />
                                        </div>
                                        <span className="text-xs font-medium">Split</span>
                                    </button>
                                </div>

                                {paymentMethod === 'split' && (
                                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Label className="w-16 text-xs">Cash ₹</Label>
                                            <Input type="number" min="0" className="h-8 flex-1" value={paymentDetails.cash || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, cash: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="w-16 text-xs">UPI ₹</Label>
                                            <Input type="number" min="0" className="h-8 flex-1" value={paymentDetails.upi || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, upi: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="w-16 text-xs">Card ₹</Label>
                                            <Input type="number" min="0" className="h-8 flex-1" value={paymentDetails.card || ''} onChange={(e) => setPaymentDetails({ ...paymentDetails, card: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div className="text-xs text-right text-gray-500 font-medium">
                                            Total: ₹{((paymentDetails.cash || 0) + (paymentDetails.upi || 0) + (paymentDetails.card || 0)).toFixed(2)} / ₹{grandTotal.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Complete Sale Button */}
                    <div className="space-y-4">
                        <Button
                            onClick={handleCompleteSale}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                        >
                            Complete Sale <span className="text-xs text-green-200 ml-2 font-normal">(F4)</span>
                        </Button>

                        <div className="flex justify-center gap-4 text-xs text-gray-500 pt-2 pb-4">
                            <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> Shortcuts:</span>
                            <span><kbd className="bg-gray-100 px-1 rounded border border-gray-200">F2</kbd> Search</span>
                            <span><kbd className="bg-gray-100 px-1 rounded border border-gray-200">F4</kbd> Complete</span>
                            <span><kbd className="bg-gray-100 px-1 rounded border border-gray-200">Ctrl+H</kbd> Hold</span>
                            <span><kbd className="bg-gray-100 px-1 rounded border border-gray-200">Esc</kbd> Close</span>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
