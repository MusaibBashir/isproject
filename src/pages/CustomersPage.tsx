import { useMemo, useState } from "react";
import { Users, Phone, Mail, Package, Calendar, ShoppingBag, Search, Heart } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { PageContainer } from "../components/layout/PageContainer";

interface CustomerInfo {
    name: string;
    phone?: string;
    email?: string;
    customerSince: string;
    lastOrderDate: string;
    totalOrders: number;
    totalSpent: number;
    recentOrder: {
        items: string[];
        total: number;
        date: string;
    };
    favoriteItem: {
        name: string;
        timesPurchased: number;
    };
}

export function CustomersPage() {
    const { salesHistory } = useInventory();
    const [searchQuery, setSearchQuery] = useState("");

    // Process sales history to extract customer information
    const customers = useMemo(() => {
        const customerMap = new Map<string, CustomerInfo>();

        salesHistory.forEach((sale) => {
            const customerKey = sale.customerName.toLowerCase();
            const existing = customerMap.get(customerKey);

            if (existing) {
                // Update existing customer
                existing.totalOrders += 1;
                existing.totalSpent += sale.total;

                // Update last order date if this sale is more recent
                if (new Date(sale.date) > new Date(existing.lastOrderDate)) {
                    existing.lastOrderDate = sale.date;
                    existing.recentOrder = {
                        items: sale.items.map((item) => item.itemName),
                        total: sale.total,
                        date: sale.date,
                    };
                }

                // Update customer since if this sale is older
                if (new Date(sale.date) < new Date(existing.customerSince)) {
                    existing.customerSince = sale.date;
                }

                // Track item purchases for favorite
                sale.items.forEach((item) => {
                    const itemName = item.itemName;
                    const currentFavCount = existing.favoriteItem.name === itemName
                        ? existing.favoriteItem.timesPurchased + item.quantity
                        : item.quantity;

                    if (
                        !existing.favoriteItem.name ||
                        currentFavCount > existing.favoriteItem.timesPurchased
                    ) {
                        existing.favoriteItem = {
                            name: itemName,
                            timesPurchased: currentFavCount,
                        };
                    }
                });

                // Update contact info if available
                if (sale.customerPhone && !existing.phone) {
                    existing.phone = sale.customerPhone;
                }
                if (sale.customerEmail && !existing.email) {
                    existing.email = sale.customerEmail;
                }
            } else {
                // Create new customer entry
                const itemCounts = new Map<string, number>();
                sale.items.forEach((item) => {
                    itemCounts.set(
                        item.itemName,
                        (itemCounts.get(item.itemName) || 0) + item.quantity
                    );
                });

                // Find most purchased item
                let favoriteItem = { name: "", timesPurchased: 0 };
                itemCounts.forEach((count, itemName) => {
                    if (count > favoriteItem.timesPurchased) {
                        favoriteItem = { name: itemName, timesPurchased: count };
                    }
                });

                customerMap.set(customerKey, {
                    name: sale.customerName,
                    phone: sale.customerPhone,
                    email: sale.customerEmail,
                    customerSince: sale.date,
                    lastOrderDate: sale.date,
                    totalOrders: 1,
                    totalSpent: sale.total,
                    recentOrder: {
                        items: sale.items.map((item) => item.itemName),
                        total: sale.total,
                        date: sale.date,
                    },
                    favoriteItem,
                });
            }
        });

        // Convert to array and sort alphabetically
        return Array.from(customerMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [salesHistory]);

    // Filter customers based on search query
    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers;
        const query = searchQuery.toLowerCase();
        return customers.filter(
            (customer) =>
                customer.name.toLowerCase().includes(query) ||
                customer.phone?.toLowerCase().includes(query) ||
                customer.email?.toLowerCase().includes(query)
        );
    }, [customers, searchQuery]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    return (
        <PageContainer
            title="Customer Directory"
            subtitle={`${customers.length} ${customers.length === 1 ? "customer" : "customers"} • Alphabetically sorted`}
            icon={<Users className="w-5 h-5 text-purple-600" />}
            iconBgColor="bg-purple-100"
        >
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Content */}
            {filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-lg mb-2">
                        {searchQuery ? "No customers found" : "No customers yet"}
                    </p>
                    <p className="text-gray-500 text-sm">
                        {searchQuery
                            ? "Try adjusting your search query"
                            : "Customer information will appear once sales are recorded"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCustomers.map((customer, index) => (
                        <Card key={index} className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
                            <CardContent className="p-5 space-y-4">
                                {/* Customer Name and Badge */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            {customer.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {customer.totalOrders}{" "}
                                                {customer.totalOrders === 1 ? "order" : "orders"}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {formatCurrency(customer.totalSpent)} total
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="space-y-2">
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-700">{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-700">{customer.email}</span>
                                        </div>
                                    )}
                                    {!customer.phone && !customer.email && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                                            <Mail className="w-4 h-4" />
                                            <span>No contact information</span>
                                        </div>
                                    )}
                                </div>

                                {/* Customer Since & Last Order */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-3 h-3 text-gray-500" />
                                            <p className="text-xs text-gray-600">Customer Since</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatDate(customer.customerSince)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ShoppingBag className="w-3 h-3 text-gray-500" />
                                            <p className="text-xs text-gray-600">Last Order</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatDate(customer.lastOrderDate)}
                                        </p>
                                    </div>
                                </div>

                                {/* Favorite Item */}
                                {customer.favoriteItem.name && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Heart className="w-4 h-4 text-amber-600 fill-amber-600" />
                                            <p className="text-xs font-medium text-amber-900">
                                                Favorite Item
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-900">
                                            {customer.favoriteItem.name}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Purchased {customer.favoriteItem.timesPurchased}{" "}
                                            {customer.favoriteItem.timesPurchased === 1 ? "time" : "times"}
                                        </p>
                                    </div>
                                )}

                                {/* Recent Order */}
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-4 h-4 text-blue-600" />
                                        <p className="text-xs font-medium text-blue-900">
                                            Most Recent Order
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        {customer.recentOrder.items.slice(0, 3).map((item, idx) => (
                                            <p key={idx} className="text-xs text-gray-700">
                                                • {item}
                                            </p>
                                        ))}
                                        {customer.recentOrder.items.length > 3 && (
                                            <p className="text-xs text-gray-500 italic">
                                                +{customer.recentOrder.items.length - 3} more items
                                            </p>
                                        )}
                                        <p className="text-sm font-medium text-gray-900 mt-2">
                                            {formatCurrency(customer.recentOrder.total)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
