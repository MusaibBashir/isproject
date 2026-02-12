import { useState, useEffect } from "react";
import { useAuth, Franchise } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { HamburgerMenu } from "../../components/HamburgerMenu";
import {
    ClipboardList, Check, X, Package, Store, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "sonner";

export function StockOrdersPage() {
    const { getAllFranchises } = useAuth();
    const { stockOrders, approveStockOrder, rejectStockOrder, refreshData } = useInventory();
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getAllFranchises();
            setFranchises(data);
            setIsLoading(false);
        };
        load();
    }, [getAllFranchises]);

    const filteredOrders = filterStatus === "all"
        ? stockOrders
        : stockOrders.filter(o => o.status === filterStatus);

    const pendingCount = stockOrders.filter(o => o.status === "pending").length;
    const approvedCount = stockOrders.filter(o => o.status === "approved").length;
    const rejectedCount = stockOrders.filter(o => o.status === "rejected").length;

    const handleApprove = async (orderId: string) => {
        setProcessingId(orderId);
        const success = await approveStockOrder(orderId);
        if (success) {
            toast.success("Order approved! Stock transferred to franchise.");
            await refreshData();
        } else {
            toast.error("Failed to approve order. Check warehouse stock levels.");
        }
        setProcessingId(null);
    };

    const handleReject = async (orderId: string) => {
        setProcessingId(orderId);
        const success = await rejectStockOrder(orderId);
        if (success) {
            toast.success("Order rejected.");
            await refreshData();
        } else {
            toast.error("Failed to reject order.");
        }
        setProcessingId(null);
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
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Stock Orders</h1>
                        <p className="text-gray-600 text-sm">Manage franchise stock requests</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="border border-gray-200 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setFilterStatus("all")}>
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stockOrders.length}</p>
                        </CardContent>
                    </Card>
                    <Card className={`border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filterStatus === "pending" ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-white"}`}
                        onClick={() => setFilterStatus("pending")}>
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider">Pending</p>
                            <p className="text-2xl font-bold text-yellow-700 mt-1">{pendingCount}</p>
                        </CardContent>
                    </Card>
                    <Card className={`border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filterStatus === "approved" ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}
                        onClick={() => setFilterStatus("approved")}>
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Approved</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{approvedCount}</p>
                        </CardContent>
                    </Card>
                    <Card className={`border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filterStatus === "rejected" ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}
                        onClick={() => setFilterStatus("rejected")}>
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Rejected</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{rejectedCount}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                    {filteredOrders.length === 0 ? (
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="p-12 text-center">
                                <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500">No {filterStatus !== "all" ? filterStatus : ""} orders found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOrders.map((order) => (
                            <Card key={order.id} className="border border-gray-200 bg-white hover:shadow-sm transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mt-1">
                                                <Store className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-base font-semibold text-gray-900">{order.franchiseName}</p>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Ordered {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                                                </p>
                                                {order.notes && (
                                                    <p className="text-sm text-gray-600 mt-2 italic">Note: {order.notes}</p>
                                                )}
                                                {/* Items list */}
                                                <div className="mt-3 space-y-1.5">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                                            <Package className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-gray-700">{item.itemName}</span>
                                                            <span className="text-gray-400">·</span>
                                                            <span className="font-medium text-gray-900">{item.quantity} units</span>
                                                            <span className="text-xs text-gray-400">({item.sku})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons for pending orders */}
                                        {order.status === "pending" && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(order.id)}
                                                    disabled={processingId === order.id}
                                                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReject(order.id)}
                                                    disabled={processingId === order.id}
                                                    className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
