import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DataPoint } from "../data/sampleData";
import { MapPin, Store, TrendingUp } from "lucide-react";

interface RegionSalesChartProps {
  data: DataPoint[];
  onDataClick?: (data: any) => void;
  selectedRegion?: string;
}

const US_REGIONS = {
  "North India": {
    states: ["Delhi", "Punjab", "Haryana", "Uttar Pradesh", "Himachal Pradesh"],
    color: "#0ea5e9",
    description: "Major Metros & Capital Region"
  },
  "South India": {
    states: ["Karnataka", "Tamil Nadu", "Kerala", "Telangana", "Andhra Pradesh"],
    color: "#10b981",
    description: "Tech Hubs & IT Centers"
  },
  "East India": {
    states: ["West Bengal", "Odisha", "Bihar", "Jharkhand", "Assam"],
    color: "#f59e0b",
    description: "Emerging & Growth Markets"
  },
  "West India": {
    states: ["Maharashtra", "Gujarat", "Rajasthan", "Goa", "Madhya Pradesh"],
    color: "#ef4444",
    description: "Commercial & Financial Centers"
  },
  "Central India": {
    states: ["Chhattisgarh", "Uttarakhand", "Jammu and Kashmir"],
    color: "#8b5cf6",
    description: "Growing & Strategic Markets"
  }
};

const REGION_SALES_DATA = [
  { region: "Delhi", sales: 3200000, stores: 28, newStores: 4, variance: 15.8, color: "#0ea5e9" },
  { region: "Haryana", sales: 2400000, stores: 18, newStores: 2, variance: 11.2, color: "#0ea5e9" },
  { region: "Punjab", sales: 2100000, stores: 16, newStores: 2, variance: 8.5, color: "#0ea5e9" },
  { region: "Uttar Pradesh", sales: 2850000, stores: 24, newStores: 3, variance: 12.3, color: "#0ea5e9" },
  { region: "Karnataka", sales: 3100000, stores: 26, newStores: 5, variance: 18.7, color: "#10b981" },
  { region: "Tamil Nadu", sales: 2950000, stores: 25, newStores: 4, variance: 16.4, color: "#10b981" },
  { region: "Telangana", sales: 2700000, stores: 22, newStores: 4, variance: 20.1, color: "#10b981" },
  { region: "Kerala", sales: 1900000, stores: 15, newStores: 2, variance: 9.8, color: "#10b981" },
  { region: "Andhra Pradesh", sales: 2200000, stores: 18, newStores: 3, variance: 13.5, color: "#10b981" },
  { region: "West Bengal", sales: 2300000, stores: 19, newStores: 2, variance: 10.7, color: "#f59e0b" },
  { region: "Odisha", sales: 1500000, stores: 12, newStores: 2, variance: 14.2, color: "#f59e0b" },
  { region: "Bihar", sales: 1650000, stores: 14, newStores: 1, variance: 7.3, color: "#f59e0b" },
  { region: "Maharashtra", sales: 3500000, stores: 32, newStores: 6, variance: 17.9, color: "#ef4444" },
  { region: "Gujarat", sales: 2800000, stores: 24, newStores: 4, variance: 15.6, color: "#ef4444" },
  { region: "Rajasthan", sales: 1800000, stores: 15, newStores: 2, variance: 11.4, color: "#ef4444" },
  { region: "Goa", sales: 950000, stores: 8, newStores: 1, variance: 8.9, color: "#ef4444" },
];

export function RegionSalesChart({ data, onDataClick, selectedRegion }: RegionSalesChartProps) {
  // Create a copy of the array before sorting to avoid mutating the original
  const regionalData = [...REGION_SALES_DATA].sort((a, b) => b.sales - a.sales);

  const totalSales = regionalData.reduce((sum, item) => sum + item.sales, 0);
  const totalStores = regionalData.reduce((sum, item) => sum + item.stores, 0);
  const totalNewStores = regionalData.reduce((sum, item) => sum + item.newStores, 0);
  const avgVariance = regionalData.reduce((sum, item) => sum + item.variance, 0) / regionalData.length;

  const handleRegionClick = (data: any) => {
    if (onDataClick) {
      // Map state names to our region names for filtering
      const regionMapping: Record<string, string> = {
        "Delhi": "North India",
        "Haryana": "North India", 
        "Punjab": "North India",
        "Uttar Pradesh": "North India",
        "Karnataka": "South India",
        "Tamil Nadu": "South India",
        "Telangana": "South India",
        "Kerala": "South India",
        "Andhra Pradesh": "South India",
        "West Bengal": "East India",
        "Odisha": "East India",
        "Bihar": "East India",
        "Maharashtra": "West India",
        "Gujarat": "West India",
        "Rajasthan": "West India",
        "Goa": "West India"
      };
      
      onDataClick({ region: regionMapping[data.region] || data.region });
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-gray-900 text-xl font-semibold">
            <MapPin className="w-6 h-6 text-blue-600" />
            Regional Sales Distribution
          </CardTitle>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">{totalStores}</div>
              <div className="text-sm text-gray-600">Total Stores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">{totalNewStores}</div>
              <div className="text-sm text-gray-600">New Stores</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-semibold ${avgVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgVariance >= 0 ? '+' : ''}{avgVariance.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Growth</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales by State Chart */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance by State</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={regionalData} onClick={handleRegionClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis 
                  dataKey="region" 
                  tick={{ fontSize: 11, fill: '#737373' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  axisLine={{ stroke: '#d4d4d4' }}
                  tickLine={{ stroke: '#d4d4d4' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#737373' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  axisLine={{ stroke: '#d4d4d4' }}
                  tickLine={{ stroke: '#d4d4d4' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales']}
                  labelFormatter={(label) => `State: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar 
                  dataKey="sales" 
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: 'pointer' }}
                >
                  {regionalData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedRegion && US_REGIONS[selectedRegion as keyof typeof US_REGIONS]?.states.includes(entry.region) 
                        ? "#374151" : "none"}
                      strokeWidth={selectedRegion && US_REGIONS[selectedRegion as keyof typeof US_REGIONS]?.states.includes(entry.region) 
                        ? 2 : 0}
                      style={{
                        filter: selectedRegion && US_REGIONS[selectedRegion as keyof typeof US_REGIONS]?.states.includes(entry.region) 
                          ? 'brightness(1.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Regional Summary Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Overview</h3>
            {Object.entries(US_REGIONS).map(([regionName, regionInfo]) => {
              const regionStates = regionalData.filter(state => regionInfo.states.includes(state.region));
              const regionTotal = regionStates.reduce((sum, state) => sum + state.sales, 0);
              const regionStores = regionStates.reduce((sum, state) => sum + state.stores, 0);
              const regionNewStores = regionStates.reduce((sum, state) => sum + state.newStores, 0);
              
              return (
                <Card 
                  key={regionName}
                  className={`cursor-pointer transition-all duration-200 border ${
                    selectedRegion === regionName 
                      ? 'border-blue-500 shadow-md bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleRegionClick({ region: regionName })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: regionInfo.color }}
                      />
                      <span className="font-medium text-gray-900">{regionName}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-3">{regionInfo.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          ${(regionTotal / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-gray-600">Sales</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{regionStores}</div>
                        <div className="text-xs text-gray-600">Stores</div>
                      </div>
                    </div>
                    {regionNewStores > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <Store className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">+{regionNewStores} new stores</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">${(totalSales / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-gray-600">Total Regional Sales</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Store className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-semibold text-gray-900">{totalStores}</div>
            <div className="text-sm text-gray-600">Active Locations</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center mx-auto mb-2 text-sm font-semibold">
              {totalNewStores}
            </div>
            <div className="text-2xl font-semibold text-gray-900">{totalNewStores}</div>
            <div className="text-sm text-gray-600">New Stores</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center mx-auto mb-2 text-xs font-semibold">
              %
            </div>
            <div className={`text-2xl font-semibold ${avgVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgVariance >= 0 ? '+' : ''}{avgVariance.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Growth Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}