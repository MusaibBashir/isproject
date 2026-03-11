import { InventoryItem } from '../context/InventoryContext';

export function printBarcode(item: InventoryItem, quantity: number = 1) {
    const valueToPrint = item.barcode || item.sku;

    let barcodeContainers = '';
    for (let i = 0; i < quantity; i++) {
        barcodeContainers += `
            <div class="barcode-container">
                <div class="item-name">${item.itemName}</div>
                <svg class="barcode-${i}"></svg>
            </div>
        `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Print Barcode - ${item.sku}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
            color: #222;
        }
        .print-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }
        .barcode-container {
            text-align: center;
            padding: 10px;
            border: 1px dashed #ccc;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 20px;
        }
        .item-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }
        @media print {
            .barcode-container {
                border: none;
            }
        }
    </style>
</head>
<body>
    <div class="print-grid">
        ${barcodeContainers}
    </div>

    <script>
        window.onload = function() {
            try {
                for (let i = 0; i < ${quantity}; i++) {
                    JsBarcode(".barcode-" + i, "${valueToPrint}", {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true,
                        margin: 0
                    });
                }
                setTimeout(function() {
                    window.print();
                }, 500);
            } catch (e) {
                console.error("Barcode generation failed", e);
            }
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
