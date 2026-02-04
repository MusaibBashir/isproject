import { createContext, useContext, useState, ReactNode } from "react";

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  itemName: string;
  category: string;
  price: number;
  quantity: number;
  description?: string;
  dateAdded: string;
  lastUpdated: string;
}

export interface SaleRecord {
  id: string;
  items: Array<{
    sku: string;
    itemName: string;
    quantity: number;
    price: number;
  }>;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  total: number;
  date: string;
}

interface InventoryContextType {
  inventory: InventoryItem[];
  salesHistory: SaleRecord[];
  addInventoryItem: (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">) => void;
  updateInventoryQuantity: (sku: string, quantityChange: number) => boolean;
  getInventoryBySku: (sku: string) => InventoryItem | undefined;
  recordSale: (sale: Omit<SaleRecord, "id" | "date">) => boolean;
  getTotalInventoryValue: () => number;
  getTotalInventoryCount: () => number;
  getLowStockItems: (threshold?: number) => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Sample initial inventory data
const initialInventory: InventoryItem[] = [
  {
    id: "1",
    sku: "SKU-001234",
    barcode: "123456789012",
    itemName: "Wireless Mouse",
    category: "Electronics",
    price: 29.99,
    quantity: 150,
    description: "Ergonomic wireless mouse with USB receiver",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    sku: "SKU-001235",
    barcode: "123456789013",
    itemName: "USB-C Cable",
    category: "Electronics",
    price: 12.99,
    quantity: 300,
    description: "6ft USB-C charging cable",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "3",
    sku: "SKU-001236",
    barcode: "123456789014",
    itemName: "Mechanical Keyboard",
    category: "Electronics",
    price: 89.99,
    quantity: 75,
    description: "RGB mechanical gaming keyboard",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "4",
    sku: "SKU-001237",
    barcode: "123456789015",
    itemName: "Laptop Stand",
    category: "Accessories",
    price: 34.99,
    quantity: 45,
    description: "Adjustable aluminum laptop stand",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "5",
    sku: "SKU-001238",
    barcode: "123456789016",
    itemName: "Webcam HD",
    category: "Electronics",
    price: 59.99,
    quantity: 20,
    description: "1080p HD webcam with microphone",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "6",
    sku: "SKU-001239",
    barcode: "123456789017",
    itemName: "Desk Lamp",
    category: "Accessories",
    price: 24.99,
    quantity: 8,
    description: "LED desk lamp with adjustable brightness",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "7",
    sku: "SKU-001240",
    barcode: "123456789018",
    itemName: "Phone Case",
    category: "Accessories",
    price: 15.99,
    quantity: 200,
    description: "Protective phone case with card holder",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
  {
    id: "8",
    sku: "SKU-001241",
    barcode: "123456789019",
    itemName: "Bluetooth Speaker",
    category: "Electronics",
    price: 44.99,
    quantity: 60,
    description: "Portable bluetooth speaker with 12hr battery",
    dateAdded: "2024-01-15T10:00:00Z",
    lastUpdated: "2024-01-15T10:00:00Z",
  },
];

// Sample initial sales history data
const initialSalesHistory: SaleRecord[] = [
  {
    id: "sale-001",
    items: [
      {
        sku: "SKU-001234",
        itemName: "Wireless Mouse",
        quantity: 2,
        price: 29.99,
      },
      {
        sku: "SKU-001235",
        itemName: "USB-C Cable",
        quantity: 3,
        price: 12.99,
      },
    ],
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@email.com",
    total: 98.95,
    date: "2026-01-28T14:30:00Z",
  },
  {
    id: "sale-002",
    items: [
      {
        sku: "SKU-001236",
        itemName: "Mechanical Keyboard",
        quantity: 1,
        price: 89.99,
      },
      {
        sku: "SKU-001237",
        itemName: "Laptop Stand",
        quantity: 1,
        price: 34.99,
      },
    ],
    customerName: "Rajesh Kumar",
    customerPhone: "+91 98234 56789",
    customerEmail: "rajesh.kumar@email.com",
    total: 124.98,
    date: "2026-01-27T10:15:00Z",
  },
  {
    id: "sale-003",
    items: [
      {
        sku: "SKU-001240",
        itemName: "Phone Case",
        quantity: 5,
        price: 15.99,
      },
    ],
    customerName: "Anjali Patel",
    customerPhone: "+91 99345 67890",
    customerEmail: "anjali.patel@email.com",
    total: 79.95,
    date: "2026-01-26T16:45:00Z",
  },
  {
    id: "sale-004",
    items: [
      {
        sku: "SKU-001238",
        itemName: "Webcam HD",
        quantity: 1,
        price: 59.99,
      },
      {
        sku: "SKU-001234",
        itemName: "Wireless Mouse",
        quantity: 1,
        price: 29.99,
      },
      {
        sku: "SKU-001235",
        itemName: "USB-C Cable",
        quantity: 2,
        price: 12.99,
      },
    ],
    customerName: "Vikram Singh",
    customerPhone: "+91 97456 78901",
    customerEmail: "vikram.singh@email.com",
    total: 115.96,
    date: "2026-01-25T09:20:00Z",
  },
  {
    id: "sale-005",
    items: [
      {
        sku: "SKU-001241",
        itemName: "Bluetooth Speaker",
        quantity: 2,
        price: 44.99,
      },
    ],
    customerName: "Deepika Reddy",
    customerPhone: "+91 96567 89012",
    customerEmail: "deepika.reddy@email.com",
    total: 89.98,
    date: "2026-01-24T13:00:00Z",
  },
  {
    id: "sale-006",
    items: [
      {
        sku: "SKU-001236",
        itemName: "Mechanical Keyboard",
        quantity: 1,
        price: 89.99,
      },
      {
        sku: "SKU-001234",
        itemName: "Wireless Mouse",
        quantity: 1,
        price: 29.99,
      },
    ],
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@email.com",
    total: 119.98,
    date: "2026-01-23T15:30:00Z",
  },
  {
    id: "sale-007",
    items: [
      {
        sku: "SKU-001239",
        itemName: "Desk Lamp",
        quantity: 3,
        price: 24.99,
      },
      {
        sku: "SKU-001240",
        itemName: "Phone Case",
        quantity: 2,
        price: 15.99,
      },
    ],
    customerName: "Arjun Menon",
    customerPhone: "+91 95678 90123",
    total: 106.95,
    date: "2026-01-22T11:45:00Z",
  },
  {
    id: "sale-008",
    items: [
      {
        sku: "SKU-001237",
        itemName: "Laptop Stand",
        quantity: 2,
        price: 34.99,
      },
    ],
    customerName: "Neha Gupta",
    customerPhone: "+91 94789 01234",
    customerEmail: "neha.gupta@email.com",
    total: 69.98,
    date: "2026-01-21T14:20:00Z",
  },
  {
    id: "sale-009",
    items: [
      {
        sku: "SKU-001235",
        itemName: "USB-C Cable",
        quantity: 5,
        price: 12.99,
      },
      {
        sku: "SKU-001240",
        itemName: "Phone Case",
        quantity: 3,
        price: 15.99,
      },
    ],
    customerName: "Rajesh Kumar",
    customerPhone: "+91 98234 56789",
    customerEmail: "rajesh.kumar@email.com",
    total: 112.92,
    date: "2026-01-20T10:00:00Z",
  },
  {
    id: "sale-010",
    items: [
      {
        sku: "SKU-001238",
        itemName: "Webcam HD",
        quantity: 2,
        price: 59.99,
      },
      {
        sku: "SKU-001236",
        itemName: "Mechanical Keyboard",
        quantity: 1,
        price: 89.99,
      },
    ],
    customerName: "Kavita Desai",
    customerPhone: "+91 93890 12345",
    customerEmail: "kavita.desai@email.com",
    total: 209.97,
    date: "2026-01-19T16:10:00Z",
  },
  {
    id: "sale-011",
    items: [
      {
        sku: "SKU-001241",
        itemName: "Bluetooth Speaker",
        quantity: 1,
        price: 44.99,
      },
      {
        sku: "SKU-001239",
        itemName: "Desk Lamp",
        quantity: 1,
        price: 24.99,
      },
    ],
    customerName: "Anjali Patel",
    customerPhone: "+91 99345 67890",
    customerEmail: "anjali.patel@email.com",
    total: 69.98,
    date: "2026-01-18T12:30:00Z",
  },
  {
    id: "sale-012",
    items: [
      {
        sku: "SKU-001234",
        itemName: "Wireless Mouse",
        quantity: 4,
        price: 29.99,
      },
    ],
    customerName: "Vikram Singh",
    customerPhone: "+91 97456 78901",
    customerEmail: "vikram.singh@email.com",
    total: 119.96,
    date: "2026-01-17T09:45:00Z",
  },
  {
    id: "sale-013",
    items: [
      {
        sku: "SKU-001237",
        itemName: "Laptop Stand",
        quantity: 1,
        price: 34.99,
      },
      {
        sku: "SKU-001235",
        itemName: "USB-C Cable",
        quantity: 4,
        price: 12.99,
      },
    ],
    customerName: "Deepika Reddy",
    customerPhone: "+91 96567 89012",
    customerEmail: "deepika.reddy@email.com",
    total: 86.95,
    date: "2026-01-16T14:50:00Z",
  },
  {
    id: "sale-014",
    items: [
      {
        sku: "SKU-001240",
        itemName: "Phone Case",
        quantity: 10,
        price: 15.99,
      },
    ],
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@email.com",
    total: 159.90,
    date: "2026-01-15T11:20:00Z",
  },
  {
    id: "sale-015",
    items: [
      {
        sku: "SKU-001241",
        itemName: "Bluetooth Speaker",
        quantity: 1,
        price: 44.99,
      },
      {
        sku: "SKU-001238",
        itemName: "Webcam HD",
        quantity: 1,
        price: 59.99,
      },
      {
        sku: "SKU-001236",
        itemName: "Mechanical Keyboard",
        quantity: 1,
        price: 89.99,
      },
    ],
    customerName: "Rahul Joshi",
    customerPhone: "+91 92901 23456",
    customerEmail: "rahul.joshi@email.com",
    total: 194.97,
    date: "2026-01-14T15:35:00Z",
  },
];

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSalesHistory);

  const addInventoryItem = (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      dateAdded: now,
      lastUpdated: now,
    };
    setInventory((prev) => [...prev, newItem]);
  };

  const updateInventoryQuantity = (sku: string, quantityChange: number): boolean => {
    let success = false;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          const newQuantity = item.quantity + quantityChange;
          if (newQuantity < 0) {
            success = false;
            return item;
          }
          success = true;
          return {
            ...item,
            quantity: newQuantity,
            lastUpdated: new Date().toISOString(),
          };
        }
        return item;
      })
    );
    return success;
  };

  const getInventoryBySku = (sku: string): InventoryItem | undefined => {
    return inventory.find((item) => item.sku === sku);
  };

  const recordSale = (sale: Omit<SaleRecord, "id" | "date">): boolean => {
    // Check if all items have sufficient stock
    for (const saleItem of sale.items) {
      const inventoryItem = getInventoryBySku(saleItem.sku);
      if (!inventoryItem || inventoryItem.quantity < saleItem.quantity) {
        return false;
      }
    }

    // Deduct from inventory
    for (const saleItem of sale.items) {
      updateInventoryQuantity(saleItem.sku, -saleItem.quantity);
    }

    // Record the sale
    const newSale: SaleRecord = {
      ...sale,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setSalesHistory((prev) => [newSale, ...prev]);

    return true;
  };

  const getTotalInventoryValue = (): number => {
    return inventory.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalInventoryCount = (): number => {
    return inventory.reduce((total, item) => total + item.quantity, 0);
  };

  const getLowStockItems = (threshold: number = 20): InventoryItem[] => {
    return inventory.filter((item) => item.quantity <= threshold);
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        salesHistory,
        addInventoryItem,
        updateInventoryQuantity,
        getInventoryBySku,
        recordSale,
        getTotalInventoryValue,
        getTotalInventoryCount,
        getLowStockItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}