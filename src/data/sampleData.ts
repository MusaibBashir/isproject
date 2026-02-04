export interface DataPoint {
  id: string;
  date: string;
  month: string;
  quarter: string;
  year: number;
  category: string;
  region: string;
  sales: number;
  revenue: number;
  previousYearSales: number;
  previousYearRevenue: number;
  units: number;
  customers: number;
  state?: string;
  storeCount?: number;
}

export const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];
export const regions = ['North India', 'South India', 'East India', 'West India', 'Central India'];

// Enhanced regional data with Indian state mapping
export const regionStateMapping = {
  'North India': ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Himachal Pradesh'],
  'South India': ['Karnataka', 'Tamil Nadu', 'Kerala', 'Telangana', 'Andhra Pradesh'], 
  'East India': ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Assam'],
  'West India': ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa', 'Madhya Pradesh'],
  'Central India': ['Chhattisgarh', 'Madhya Pradesh', 'Uttarakhand', 'Jammu and Kashmir', 'Tripura']
};

export const generateSampleData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const currentYear = 2024;
  const previousYear = 2023;
  
  // Regional multipliers based on US market characteristics
  const regionalMultipliers = {
    'North India': 1.4, // Major metros - Delhi, Punjab, Haryana
    'South India': 1.3, // Tech hubs - Bangalore, Chennai, Hyderabad
    'East India': 1.0, // Emerging markets - Kolkata, Bhubaneswar
    'West India': 1.4, // Commercial centers - Mumbai, Pune, Ahmedabad
    'Central India': 0.9 // Growing markets - Indore, Bhopal, Raipur
  };
  
  // Generate data for current year and previous year
  for (let year of [previousYear, currentYear]) {
    for (let month = 1; month <= 12; month++) {
      for (let category of categories) {
        for (let region of regions) {
          const date = new Date(year, month - 1, 1);
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          const quarter = `Q${Math.ceil(month / 3)}`;
          
          // Generate realistic but varied data with regional characteristics
          const baseRevenue = Math.random() * 40000 + 30000;
          const seasonalMultiplier = month === 12 ? 1.6 : month >= 6 && month <= 8 ? 1.3 : month === 11 ? 1.4 : 1;
          const categoryMultiplier = category === 'Electronics' ? 1.4 : category === 'Clothing' ? 1.2 : category === 'Home & Garden' ? 1.1 : 1;
          const regionMultiplier = regionalMultipliers[region as keyof typeof regionalMultipliers] || 1;
          
          const revenue = Math.round(baseRevenue * seasonalMultiplier * categoryMultiplier * regionMultiplier);
          const sales = Math.round(revenue * (0.85 + Math.random() * 0.3));
          const units = Math.round(revenue / (60 + Math.random() * 180));
          const customers = Math.round(units * (0.4 + Math.random() * 0.4));
          
          // Add store count data for regional analysis
          const stateList = regionStateMapping[region as keyof typeof regionStateMapping];
          const randomState = stateList[Math.floor(Math.random() * stateList.length)];
          const storeCount = Math.floor(Math.random() * 8) + 3; // 3-10 stores per region/category
          
          data.push({
            id: `${year}-${month}-${category}-${region}`,
            date: date.toISOString().split('T')[0],
            month: monthName,
            quarter,
            year,
            category,
            region,
            sales,
            revenue,
            previousYearSales: year === currentYear ? Math.round(sales * (0.82 + Math.random() * 0.36)) : 0,
            previousYearRevenue: year === currentYear ? Math.round(revenue * (0.82 + Math.random() * 0.36)) : 0,
            units,
            customers,
            state: randomState,
            storeCount
          });
        }
      }
    }
  }
  
  return data;
};

export const sampleData = generateSampleData();

// Export Indian regions for mapping and filtering
export const usRegions = {
  'North India': {
    name: 'North India',
    description: 'Major Metros - Delhi, Punjab, Haryana, UP, HP',
    color: '#FF6B6B',
    states: regionStateMapping['North India']
  },
  'South India': {
    name: 'South India', 
    description: 'Tech Hubs - Karnataka, Tamil Nadu, Kerala, Telangana, AP',
    color: '#4ECDC4',
    states: regionStateMapping['South India']
  },
  'East India': {
    name: 'East India',
    description: 'Emerging Markets - West Bengal, Odisha, Bihar, Jharkhand, Assam', 
    color: '#45B7D1',
    states: regionStateMapping['East India']
  },
  'West India': {
    name: 'West India',
    description: 'Commercial Centers - Maharashtra, Gujarat, Rajasthan, Goa, MP',
    color: '#FECA57', 
    states: regionStateMapping['West India']
  },
  'Central India': {
    name: 'Central India',
    description: 'Growing Markets - Chhattisgarh, MP, Uttarakhand, J&K, Tripura',
    color: '#FF9FF3',
    states: regionStateMapping['Central India']
  }
};