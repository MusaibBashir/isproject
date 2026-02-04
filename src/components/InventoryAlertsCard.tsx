import { AlertCircle, Package, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useInventory } from "../context/InventoryContext";

export function InventoryAlertsCard() {
  const { inventory, getLowStockItems } = useInventory();
  
  const lowStockItems = getLowStockItems(20);
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
              <p className="text-xs text-yellow-700 mt-1">≤20 units</p>
            </div>
          </div>

          {/* Items List */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Items Requiring Attention</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">All inventory levels are healthy</p>
                </div>
              ) : (
                lowStockItems
                  .sort((a, b) => a.quantity - b.quantity)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          {item.quantity === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Out of Stock
                            </Badge>
                          )}
                          {item.quantity > 0 && item.quantity <= 5 && (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                              Critical
                            </Badge>
                          )}
                          {item.quantity > 5 && item.quantity <= 20 && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                              Low
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          SKU: {item.sku} • {item.category}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p
                          className={`text-lg font-bold ${
                            item.quantity === 0
                              ? "text-red-600"
                              : item.quantity <= 5
                              ? "text-orange-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {item.quantity}
                        </p>
                        <p className="text-xs text-gray-500">units</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
