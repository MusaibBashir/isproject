/**
 * Opens a new browser window with a formatted receipt and triggers print.
 * This avoids all Dialog/overlay issues entirely.
 */

interface ReceiptItem {
    itemName: string;
    quantity: number;
    price: number;
    discount?: number;
}

interface ReceiptData {
    date?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items: ReceiptItem[];
    subtotal?: number;
    discountTotal?: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
    paymentMethod?: string;
    paymentDetails?: Record<string, number>;
}

interface ShopDetails {
    name: string;
    address?: string;
    phone?: string;
}

function fmt(amount: any): string {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
}

export function printReceipt(saleData: ReceiptData, shopDetails: ShopDetails) {
    const itemsHtml = (saleData.items || [])
        .map((item) => {
            const itemTotal = item.quantity * item.price;
            const discount = item.discount || 0;
            const final = itemTotal - discount;
            return `
                <tr>
                    <td style="padding:4px 0">${item.itemName}</td>
                    <td style="padding:4px 0;text-align:right">${item.quantity}</td>
                    <td style="padding:4px 0;text-align:right">₹${fmt(item.price)}</td>
                    <td style="padding:4px 0;text-align:right">₹${fmt(final)}</td>
                </tr>
                ${discount > 0 ? `<tr><td colspan="4" style="color:#888;font-size:11px;padding-bottom:4px">  Discount: -₹${fmt(discount)}</td></tr>` : ""}
            `;
        })
        .join("");

    const paymentHtml = saleData.paymentMethod
        ? `
        <div style="margin-top:16px;padding-top:8px;border-top:1px dashed #aaa">
            <strong>Payment: ${saleData.paymentMethod.toUpperCase()}</strong>
            ${saleData.paymentMethod === "split" && saleData.paymentDetails
            ? `<div style="padding-left:16px;font-size:11px;margin-top:4px">
                    ${(saleData.paymentDetails.cash || 0) > 0 ? `<div>Cash: ₹${fmt(saleData.paymentDetails.cash)}</div>` : ""}
                    ${(saleData.paymentDetails.upi || 0) > 0 ? `<div>UPI: ₹${fmt(saleData.paymentDetails.upi)}</div>` : ""}
                    ${(saleData.paymentDetails.card || 0) > 0 ? `<div>Card: ₹${fmt(saleData.paymentDetails.card)}</div>` : ""}
                   </div>`
            : ""
        }
        </div>`
        : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt - ${shopDetails.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            max-width: 380px;
            margin: 0 auto;
            padding: 20px;
            color: #222;
        }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 4px 0; border-bottom: 1px dashed #aaa; }
        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
        .center { text-align: center; }
        .right { text-align: right; }
        .divider { border-top: 1px dashed #aaa; padding-top: 8px; margin-top: 8px; }
        .grand { font-size: 16px; font-weight: bold; }
        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="center" style="margin-bottom:20px">
        <h2 style="font-size:18px;margin-bottom:4px">${shopDetails.name}</h2>
        ${shopDetails.address ? `<div>${shopDetails.address}</div>` : ""}
        ${shopDetails.phone ? `<div>Ph: ${shopDetails.phone}</div>` : ""}
    </div>

    <div class="divider" style="margin-bottom:12px">
        <div>Date: ${new Date(saleData.date || new Date()).toLocaleString()}</div>
        ${saleData.customerName ? `<div>Customer: ${saleData.customerName}</div>` : ""}
        ${saleData.customerPhone ? `<div>Phone: ${saleData.customerPhone}</div>` : ""}
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <div class="divider" style="margin-top:12px">
        <div class="right">Subtotal: ₹${fmt(saleData.subtotal || saleData.total)}</div>
        ${(saleData.discountTotal || 0) > 0 ? `<div class="right">Discount: -₹${fmt(saleData.discountTotal)}</div>` : ""}
        ${(saleData.taxAmount || 0) > 0 ? `<div class="right">Tax (${saleData.taxRate || 0}%): +₹${fmt(saleData.taxAmount)}</div>` : ""}
        <div class="divider right grand">Grand Total: ₹${fmt(saleData.total)}</div>
    </div>

    ${paymentHtml}

    <div class="center divider" style="margin-top:24px;font-size:11px">
        Thank you for your business!
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
