import { IndianRupee, Calendar, User, Phone, Mail, Package } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PageContainer } from "../components/layout/PageContainer";
import { printReceipt } from "../utils/printReceipt";
import { useAuth } from "../context/AuthContext";

export function SalesHistoryPage() {
    const { salesHistory } = useInventory();
    const { franchise } = useAuth();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        return `₹${amount.toFixed(2)}`;
    };

    return (
        <PageContainer
            title="Recent Sales"
            subtitle="Complete sales history with receipts"
            icon={<IndianRupee className="w-5 h-5 text-green-600" />}
            iconBgColor="bg-green-100"
        >
            {salesHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-lg mb-2">No sales recorded yet</p>
                    <p className="text-gray-500 text-sm">
                        Sales transactions will appear here once recorded
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {salesHistory.map((sale, index) => (
                        <Card key={sale.id} className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="text-xs">
                                            Sale #{salesHistory.length - index}
                                        </Badge>
                                        <CardTitle className="text-lg">
                                            {formatCurrency(sale.total)}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(sale.date)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Customer Info */}
                                <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Customer</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {sale.customerName}
                                            </p>
                                        </div>
                                    </div>
                                    {(sale.paymentMethod || sale.paymentDetails) && (
                                        <div className="flex items-center gap-2">
                                            <IndianRupee className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500">Payment</p>
                                                <p className="text-sm font-medium text-gray-900 capitalize">
                                                    {sale.paymentMethod || 'Cash'}
                                                </p>
                                                {sale.paymentMethod === 'split' && sale.paymentDetails && (
                                                    <p className="text-xs text-gray-500">
                                                        C:₹{sale.paymentDetails.cash || 0} U:₹{sale.paymentDetails.upi || 0}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {sale.customerPhone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500">Phone</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {sale.customerPhone}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {sale.customerEmail && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500">Email</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {sale.customerEmail}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Receipt - Items List */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                        <div className="flex justify-between items-center w-full">
                                            <p className="text-sm font-semibold text-gray-900">
                                                Receipt
                                            </p>
                                            <button
                                                onClick={() => {
                                                    printReceipt(
                                                        {
                                                            date: sale.date,
                                                            customerName: sale.customerName,
                                                            customerPhone: sale.customerPhone,
                                                            customerEmail: sale.customerEmail,
                                                            items: sale.items,
                                                            subtotal: sale.subtotal,
                                                            discountTotal: sale.discountTotal,
                                                            taxRate: sale.taxRate,
                                                            taxAmount: sale.taxAmount,
                                                            total: sale.total,
                                                            paymentMethod: sale.paymentMethod,
                                                            paymentDetails: sale.paymentDetails,
                                                        },
                                                        {
                                                            name: franchise?.name || "Inventory System",
                                                            address: franchise?.region ? `${franchise.region}, ${franchise.state}` : "Demo Address",
                                                        }
                                                    );
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 bg-blue-50 rounded-md transition-colors"
                                            >
                                                Print Receipt
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left text-xs font-medium text-gray-600 pb-2">
                                                        Item
                                                    </th>
                                                    <th className="text-left text-xs font-medium text-gray-600 pb-2">
                                                        SKU
                                                    </th>
                                                    <th className="text-right text-xs font-medium text-gray-600 pb-2">
                                                        Qty
                                                    </th>
                                                    <th className="text-right text-xs font-medium text-gray-600 pb-2">
                                                        Price
                                                    </th>
                                                    <th className="text-right text-xs font-medium text-gray-600 pb-2">
                                                        Subtotal
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sale.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                        <td className="py-2 text-sm text-gray-900">
                                                            {item.itemName}
                                                        </td>
                                                        <td className="py-2 text-sm text-gray-600">
                                                            {item.sku}
                                                        </td>
                                                        <td className="py-2 text-sm text-gray-900 text-right">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="py-2 text-sm text-gray-900 text-right">
                                                            {formatCurrency(item.price)}
                                                            {item.discount ? (
                                                                <div className="text-xs text-green-600">-₹{item.discount}</div>
                                                            ) : null}
                                                        </td>
                                                        <td className="py-2 text-sm font-medium text-gray-900 text-right">
                                                            {formatCurrency((item.price * item.quantity) - (item.discount || 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="space-y-1 mt-3">
                                            <div className="flex justify-between items-center text-sm text-gray-600">
                                                <p>Subtotal</p>
                                                <p>{formatCurrency(sale.subtotal || sale.total)}</p>
                                            </div>
                                            {(sale.discountTotal || 0) > 0 && (
                                                <div className="flex justify-between items-center text-sm text-green-600">
                                                    <p>Discount</p>
                                                    <p>-{formatCurrency(sale.discountTotal!)}</p>
                                                </div>
                                            )}
                                            {(sale.taxAmount || 0) > 0 && (
                                                <div className="flex justify-between items-center text-sm text-gray-600">
                                                    <p>Tax ({sale.taxRate}%)</p>
                                                    <p>+{formatCurrency(sale.taxAmount!)}</p>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Total
                                                </p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {formatCurrency(sale.total)}
                                                </p>
                                            </div>
                                        </div>
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
