import { AlertCircle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useInventory } from "../context/InventoryContext";

export function InventoryAlertsCard() {
  const { inventory, salesHistory, getLowStockItems } = useInventory();

  // Calculate sales frequency for each SKU
  const salesCountMap: Record<string, number> = {};
  salesHistory.forEach((sale) => {
    sale.items.forEach((item) => {
      salesCountMap[item.sku] = (salesCountMap[item.sku] || 0) + item.quantity;
    });
  });

  // Find min and max sales frequency
  const salesCounts = Object.values(salesCountMap);
  const minSales = salesCounts.length > 0 ? Math.min(...salesCounts) : 0;
  const maxSales = salesCounts.length > 0 ? Math.max(...salesCounts) : 0;

  // Low stock threshold is dynamic based on sales frequency
  const lowStockItems = getLowStockItems();
  const outOfStockItems = inventory.filter(item => item.quantity === 0);
  const criticalItems = inventory.filter(item => item.quantity > 0 && item.quantity <= 5);

  return (
    <Card className="border-2 border-gray-200 shadow-md bg-white col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-900">Out of Stock</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Critical</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{criticalItems.length}</p>
              <p className="text-xs text-orange-700 mt-1">≤5 units</p>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-900">Low Stock</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              <p className="text-xs text-yellow-700 mt-1">Dynamic threshold by sales</p>
            </div>
          </div>

          {/* Items List */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Items Requiring Attention</h3>
            <div className="max-h-[300px] overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">All inventory levels are healthy</p>
                </div>
              ) : (
                <table className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">Item</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">SKU</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">Category</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">Current Qty</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">Threshold</th>
                      <th className="px-3 py-2 text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems
                      .sort((a, b) => a.quantity - b.quantity)
                      .map((item) => {
                        const sales = salesCountMap[item.sku] || 0;
                        let threshold = 20;
                        if (maxSales !== minSales) {
                          const minThreshold = 10;
                          const maxThreshold = 40;
                          threshold = Math.round(
                            minThreshold + ((sales - minSales) / (maxSales - minSales)) * (maxThreshold - minThreshold)
                          );
                        }
                        let status = "Low";
                        if (item.quantity === 0) status = "Out of Stock";
                        else if (item.quantity > 0 && item.quantity <= 5) status = "Critical";
                        return (
                          <tr key={item.id} className="border-b border-gray-200 last:border-none">
                            <td className="px-3 py-2 font-medium text-gray-900">{item.itemName}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{item.sku}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{item.category}</td>
                            <td className={`px-3 py-2 text-lg font-bold ${
                              item.quantity === 0
                                ? "text-red-600"
                                : item.quantity <= 5
                                ? "text-orange-600"
                                : "text-yellow-600"
                            }`}>{item.quantity}</td>
                            <td className="px-3 py-2 text-xs text-blue-700 font-semibold">{threshold}</td>
                            <td className="px-3 py-2">
                              <Badge className={
                                status === "Out of Stock"
                                  ? "bg-red-500 hover:bg-red-600 text-xs"
                                  : status === "Critical"
                                  ? "bg-orange-500 hover:bg-orange-600 text-xs"
                                  : "bg-yellow-500 hover:bg-yellow-600 text-xs"
                              }>
                                {status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
