import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Printer } from "lucide-react";

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleData: any;
    shopDetails: {
        name: string;
        address?: string;
        phone?: string;
    };
}

export function InvoiceModal({ isOpen, onClose, saleData, shopDetails }: InvoiceModalProps) {
    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: any) => {
        const num = Number(amount);
        return isNaN(num) ? "0.00" : num.toFixed(2);
    };

    // Always render the Dialog so Radix can manage the overlay lifecycle.
    // Only render content inside when saleData exists.
    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-md bg-white print:max-w-none print:shadow-none print:border-none print:bg-white p-0">
                <DialogHeader className="p-6 pb-0 print:hidden">
                    <DialogTitle className="flex justify-between items-center">
                        <span>Receipt</span>
                        {saleData && (
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Receipt details for the sale
                    </DialogDescription>
                </DialogHeader>

                {saleData ? (
                    <div className="p-6 print:p-0 print:m-0 print:w-full font-mono text-sm">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold">{shopDetails.name}</h2>
                            {shopDetails.address && <p>{shopDetails.address}</p>}
                            {shopDetails.phone && <p>Ph: {shopDetails.phone}</p>}
                        </div>

                        {/* Meta */}
                        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2 mb-4">
                            <div>
                                <p>Date: {new Date(saleData.date || new Date()).toLocaleString()}</p>
                                {saleData.customerName && <p>Customer: {saleData.customerName}</p>}
                            </div>
                        </div>

                        {/* Items */}
                        <table className="w-full mb-4">
                            <thead>
                                <tr className="border-b border-dashed border-gray-400 text-left">
                                    <th className="py-1">Item</th>
                                    <th className="py-1 text-right">Qty</th>
                                    <th className="py-1 text-right">Price</th>
                                    <th className="py-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(saleData.items || []).map((item: any, idx: number) => {
                                    const itemTotal = item.quantity * item.price;
                                    const itemDiscount = item.discount || 0;
                                    const finalItemTotal = itemTotal - itemDiscount;

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr>
                                                <td className="py-1">{item.itemName}</td>
                                                <td className="py-1 text-right">{item.quantity}</td>
                                                <td className="py-1 text-right">₹{formatCurrency(item.price)}</td>
                                                <td className="py-1 text-right">₹{formatCurrency(finalItemTotal)}</td>
                                            </tr>
                                            {itemDiscount > 0 && (
                                                <tr className="text-gray-500 text-xs">
                                                    <td colSpan={4} className="pb-1">
                                                        Discount: -₹{formatCurrency(itemDiscount)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-right">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>₹{formatCurrency(saleData.subtotal || saleData.total)}</span>
                            </div>
                            {saleData.discountTotal > 0 && (
                                <div className="flex justify-between">
                                    <span>Discount:</span>
                                    <span>-₹{formatCurrency(saleData.discountTotal)}</span>
                                </div>
                            )}
                            {saleData.taxAmount > 0 && (
                                <div className="flex justify-between">
                                    <span>Tax ({saleData.taxRate}%):</span>
                                    <span>+₹{formatCurrency(saleData.taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-1 border-t border-dashed border-gray-400">
                                <span>Grand Total:</span>
                                <span>₹{formatCurrency(saleData.total)}</span>
                            </div>
                        </div>

                        {/* Payment Info */}
                        {(saleData.paymentMethod || saleData.paymentDetails) && (
                            <div className="mt-4 pt-2 border-t border-dashed border-gray-400">
                                <p className="font-semibold">Payment Method: {saleData.paymentMethod?.toUpperCase() || 'CASH'}</p>
                                {saleData.paymentMethod === 'split' && saleData.paymentDetails && (
                                    <div className="pl-4 text-xs mt-1">
                                        {saleData.paymentDetails.cash > 0 && <p>Cash: ₹{formatCurrency(saleData.paymentDetails.cash)}</p>}
                                        {saleData.paymentDetails.upi > 0 && <p>UPI: ₹{formatCurrency(saleData.paymentDetails.upi)}</p>}
                                        {saleData.paymentDetails.card > 0 && <p>Card: ₹{formatCurrency(saleData.paymentDetails.card)}</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-8 text-xs border-t border-dashed border-gray-400 pt-4">
                            <p>Thank you for your business!</p>
                            <Button variant="outline" size="sm" onClick={onClose} className="print:hidden h-8 text-xs">
                                Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center text-gray-500">
                        <p>No receipt data available.</p>
                        <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
