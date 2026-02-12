import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase, isSupabaseAvailable } from "../lib/supabaseClient";
import { AuthContext } from "./AuthContext";

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
  franchiseId?: string;
}

export interface SaleItem {
  sku: string;
  itemName: string;
  quantity: number;
  price: number;
}

export interface SaleRecord {
  id: string;
  items: SaleItem[];
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  total: number;
  date: string;
  franchiseId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface StockOrderItem {
  sku: string;
  itemName: string;
  quantity: number;
}

export interface StockOrder {
  id: string;
  franchiseId: string;
  franchiseName: string;
  items: StockOrderItem[];
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryContextType {
  inventory: InventoryItem[];
  salesHistory: SaleRecord[];
  customers: Customer[];
  stockOrders: StockOrder[];
  isLoading: boolean;
  error: string | null;
  addInventoryItem: (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">) => Promise<boolean>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<boolean>;
  updateInventoryQuantity: (sku: string, quantityChange: number) => Promise<boolean>;
  deleteInventoryItem: (id: string) => Promise<boolean>;
  getInventoryBySku: (sku: string) => InventoryItem | undefined;
  getCustomerByPhone: (phone: string) => Promise<Customer | null>;
  recordSale: (sale: Omit<SaleRecord, "id" | "date">) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => Promise<Customer | null>;
  getTotalInventoryValue: () => number;
  getTotalInventoryCount: () => number;
  getLowStockItems: (threshold?: number) => InventoryItem[];
  refreshData: () => Promise<void>;
  createStockOrder: (order: { franchiseId: string; franchiseName: string; items: StockOrderItem[]; notes?: string }) => Promise<boolean>;
  approveStockOrder: (orderId: string) => Promise<boolean>;
  rejectStockOrder: (orderId: string) => Promise<boolean>;
}


const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Empty fallback when Supabase is not available
// Data should come from Supabase database
const fallbackInventory: InventoryItem[] = [];


export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockOrders, setStockOrders] = useState<StockOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get auth context for franchise filtering (returns undefined if AuthProvider not yet mounted)
  const authContext = useContext(AuthContext);

  // Use a ref so fetchData always reads the LATEST auth values without needing them as deps
  const authRef = useRef(authContext);
  authRef.current = authContext;

  // Convert Supabase row to InventoryItem
  const mapInventoryRow = (row: any): InventoryItem => ({
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    itemName: row.item_name,
    category: row.category,
    price: parseFloat(row.price),
    quantity: row.quantity,
    description: row.description,
    dateAdded: row.date_added,
    lastUpdated: row.last_updated,
    franchiseId: row.franchise_id,
  });

  // Convert Supabase row to Customer
  const mapCustomerRow = (row: any): Customer => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
  });

  // Fetch all data from Supabase
  const fetchData = useCallback(async () => {
    if (!isSupabaseAvailable() || !supabase) {
      // Use fallback data
      setInventory(fallbackInventory);
      setSalesHistory([]);
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Read auth values from ref (always latest)
    const auth = authRef.current;
    const isAdmin = auth?.profile?.role === 'admin';
    const franchiseId = auth?.franchise?.id;

    try {
      // Fetch inventory — admin sees all, franchise sees own + admin warehouse
      let inventoryQuery = supabase
        .from('inventory')
        .select('*')
        .order('item_name');
      if (!isAdmin && franchiseId) {
        // Franchise users see their own inventory + admin warehouse (franchise_id is null)
        inventoryQuery = inventoryQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }
      const { data: inventoryData, error: inventoryError } = await inventoryQuery;

      if (inventoryError) throw inventoryError;
      setInventory((inventoryData || []).map(mapInventoryRow));

      // Fetch customers (shared table — no franchise filtering for now)
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (customersError) throw customersError;
      setCustomers((customersData || []).map(mapCustomerRow));

      // Fetch sales with items — franchise users only see their own
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          customer_name,
          total,
          date,
          franchise_id,
          sale_items (
            sku,
            item_name,
            quantity,
            price
          )
        `)
        .order('date', { ascending: false });
      if (!isAdmin && franchiseId) {
        salesQuery = salesQuery.eq('franchise_id', franchiseId);
      }
      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      const mappedSales: SaleRecord[] = (salesData || []).map((sale: any) => ({
        id: sale.id,
        customerName: sale.customer_name,
        total: parseFloat(sale.total),
        date: sale.date,
        franchiseId: sale.franchise_id,
        items: (sale.sale_items || []).map((item: any) => ({
          sku: item.sku,
          itemName: item.item_name,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      }));
      setSalesHistory(mappedSales);

      // Fetch stock orders
      try {
        let ordersQuery = supabase
          .from('stock_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!isAdmin && franchiseId) {
          ordersQuery = ordersQuery.eq('franchise_id', franchiseId);
        }
        const { data: ordersData, error: ordersError } = await ordersQuery;

        if (!ordersError && ordersData) {
          // Fetch items for each order
          const orderIds = ordersData.map((o: any) => o.id);
          let allOrderItems: any[] = [];
          if (orderIds.length > 0) {
            const { data: itemsData } = await supabase
              .from('stock_order_items')
              .select('*')
              .in('order_id', orderIds);
            allOrderItems = itemsData || [];
          }

          const mapped: StockOrder[] = ordersData.map((o: any) => ({
            id: o.id,
            franchiseId: o.franchise_id,
            franchiseName: o.franchise_name,
            status: o.status,
            notes: o.notes,
            createdAt: o.created_at,
            updatedAt: o.updated_at,
            items: allOrderItems
              .filter((i: any) => i.order_id === o.id)
              .map((i: any) => ({
                sku: i.sku,
                itemName: i.item_name,
                quantity: i.quantity,
              })),
          }));
          setStockOrders(mapped);
        }
      } catch (stockErr) {
        // Stock orders table may not exist yet — silently skip
        console.warn('Stock orders fetch skipped:', stockErr);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
      // Fallback to empty arrays on error
      setInventory(fallbackInventory);
    } finally {
      setIsLoading(false);
    }
  }, []); // Stable reference — reads auth from ref

  // Fetch data only AFTER auth is done loading
  useEffect(() => {
    // Don't fetch until auth finishes loading
    if (authContext?.isLoading) return;
    fetchData();
  }, [authContext?.isLoading, authContext?.profile?.role, authContext?.franchise?.id, fetchData]);

  // Add inventory item
  const addInventoryItem = async (
    item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">
  ): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) {
      // Fallback: add to local state
      const newItem: InventoryItem = {
        ...item,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      setInventory((prev) => [...prev, newItem]);
      return true;
    }

    try {
      const insertData: any = {
        sku: item.sku,
        barcode: item.barcode,
        item_name: item.itemName,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        description: item.description,
      };
      // Admin adds to warehouse (franchise_id stays null)
      // Only franchise users would have franchise_id, but they shouldn't add items
      // This keeps it as admin warehouse stock
      const { data, error } = await supabase
        .from('inventory')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      setInventory((prev) => [...prev, mapInventoryRow(data)]);
      return true;
    } catch (err: any) {
      console.error('Error adding inventory item:', err);
      setError(err.message);
      return false;
    }
  };

  // Update inventory item
  const updateInventoryItem = async (
    id: string,
    updates: Partial<InventoryItem>
  ): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) {
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, lastUpdated: new Date().toISOString() }
            : item
        )
      );
      return true;
    }

    try {
      const dbUpdates: any = {};
      if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
      if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
      if (updates.itemName !== undefined) dbUpdates.item_name = updates.itemName;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error } = await supabase
        .from('inventory')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      await fetchData(); // Refresh to get updated last_updated
      return true;
    } catch (err: any) {
      console.error('Error updating inventory item:', err);
      setError(err.message);
      return false;
    }
  };

  // Update inventory quantity
  const updateInventoryQuantity = async (
    sku: string,
    quantityChange: number
  ): Promise<boolean> => {
    const item = inventory.find((i) => i.sku === sku);
    if (!item) return false;

    const newQuantity = item.quantity + quantityChange;
    if (newQuantity < 0) return false;

    return updateInventoryItem(item.id, { quantity: newQuantity });
  };

  // Delete inventory item
  const deleteInventoryItem = async (id: string): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) {
      setInventory((prev) => prev.filter((item) => item.id !== id));
      return true;
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setInventory((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting inventory item:', err);
      setError(err.message);
      return false;
    }
  };

  // Get inventory by SKU
  const getInventoryBySku = (sku: string): InventoryItem | undefined => {
    return inventory.find((item) => item.sku === sku);
  };

  // Get customer by phone number
  const getCustomerByPhone = async (phone: string): Promise<Customer | null> => {
    if (!phone.trim()) return null;

    // First check local state
    const localCustomer = customers.find((c: Customer) => c.phone === phone);
    if (localCustomer) return localCustomer;

    // Then check database
    if (!isSupabaseAvailable() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error fetching customer by phone:', err);
      return null;
    }
  };

  // Find or create customer by phone number (unique identifier)
  const findOrCreateCustomer = async (
    customerName: string,
    customerPhone?: string,
    customerEmail?: string
  ): Promise<string | null> => {
    if (!isSupabaseAvailable() || !supabase) return null;

    try {
      // If phone is provided, use it as the unique identifier
      if (customerPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .maybeSingle();

        if (existingCustomer) {
          return existingCustomer.id;
        }
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          name: customerName,
          phone: customerPhone || null,
          email: customerEmail || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        return null;
      }

      // Add to local state
      if (newCustomer) {
        setCustomers((prev: Customer[]) => [...prev, {
          id: newCustomer.id,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          createdAt: new Date().toISOString(),
        }]);
      }

      return newCustomer?.id || null;
    } catch (err) {
      console.error('Error finding/creating customer:', err);
      return null;
    }
  };


  // Record sale
  const recordSale = async (
    sale: Omit<SaleRecord, "id" | "date">
  ): Promise<boolean> => {
    // Check stock availability
    for (const saleItem of sale.items) {
      const inventoryItem = getInventoryBySku(saleItem.sku);
      if (!inventoryItem || inventoryItem.quantity < saleItem.quantity) {
        setError(`Insufficient stock for ${saleItem.itemName}`);
        return false;
      }
    }

    if (!isSupabaseAvailable() || !supabase) {
      // Fallback: local state
      const newSale: SaleRecord = {
        ...sale,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      };
      setSalesHistory((prev: SaleRecord[]) => [newSale, ...prev]);
      // Deduct inventory
      for (const saleItem of sale.items) {
        await updateInventoryQuantity(saleItem.sku, -saleItem.quantity);
      }
      return true;
    }

    try {
      // Find or create customer
      const customerId = await findOrCreateCustomer(
        sale.customerName,
        sale.customerPhone,
        sale.customerEmail
      );

      // Insert sale with customer_id and franchise_id
      const saleInsert: any = {
        customer_id: customerId,
        customer_name: sale.customerName,
        total: sale.total,
      };
      if (authContext?.franchise?.id) {
        saleInsert.franchise_id = authContext.franchise.id;
      }
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert(saleInsert)
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      const saleItems = sale.items.map((item: SaleItem) => ({
        sale_id: saleData.id,
        sku: item.sku,
        item_name: item.itemName,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Deduct inventory
      for (const saleItem of sale.items) {
        const item = inventory.find((i: InventoryItem) => i.sku === saleItem.sku);
        if (item) {
          await supabase
            .from('inventory')
            .update({ quantity: item.quantity - saleItem.quantity })
            .eq('id', item.id);
        }
      }

      // Refresh data
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Error recording sale:', err);
      setError(err.message);
      return false;
    }
  };


  // Add customer
  const addCustomer = async (
    customer: Omit<Customer, "id" | "createdAt">
  ): Promise<Customer | null> => {
    if (!isSupabaseAvailable() || !supabase) {
      const newCustomer: Customer = {
        ...customer,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [...prev, newCustomer]);
      return newCustomer;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        })
        .select()
        .single();

      if (error) throw error;
      const newCustomer = mapCustomerRow(data);
      setCustomers((prev) => [...prev, newCustomer]);
      return newCustomer;
    } catch (err: any) {
      console.error('Error adding customer:', err);
      setError(err.message);
      return null;
    }
  };

  // Utility functions
  const getTotalInventoryValue = (): number => {
    return inventory.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalInventoryCount = (): number => {
    return inventory.reduce((total, item) => total + item.quantity, 0);
  };

  const getLowStockItems = (threshold: number = 20): InventoryItem[] => {
    return inventory.filter((item) => item.quantity <= threshold);
  };

  const refreshData = async (): Promise<void> => {
    await fetchData();
  };

  // Create a stock order (franchise requests stock from admin)
  const createStockOrder = async (order: {
    franchiseId: string;
    franchiseName: string;
    items: StockOrderItem[];
    notes?: string;
  }): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) return false;
    try {
      // Insert the order
      const { data: orderData, error: orderError } = await supabase
        .from('stock_orders')
        .insert({
          franchise_id: order.franchiseId,
          franchise_name: order.franchiseName,
          notes: order.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert the items
      const itemsInsert = order.items.map(item => ({
        order_id: orderData.id,
        sku: item.sku,
        item_name: item.itemName,
        quantity: item.quantity,
      }));
      const { error: itemsError } = await supabase
        .from('stock_order_items')
        .insert(itemsInsert);

      if (itemsError) throw itemsError;

      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Error creating stock order:', err);
      setError(err.message);
      return false;
    }
  };

  // Approve a stock order (admin: deduct from warehouse, add to franchise)
  const approveStockOrder = async (orderId: string): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) return false;
    try {
      const order = stockOrders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // 1. Update order status FIRST so it reflects immediately
      const { error: statusError } = await supabase
        .from('stock_orders')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (statusError) {
        console.error('Failed to update order status:', statusError);
        throw statusError;
      }

      // 2. Fetch FRESH inventory from Supabase (avoid stale state issues)
      const { data: freshInventory, error: fetchError } = await supabase
        .from('inventory')
        .select('*');

      if (fetchError || !freshInventory) {
        console.error('Failed to fetch fresh inventory:', fetchError);
        await fetchData();
        return true; // Status was already updated
      }

      // 3. Transfer inventory: deduct from warehouse, add to franchise
      for (const item of order.items) {
        // Find warehouse item (franchise_id IS NULL) matching this SKU
        const warehouseRow = freshInventory.find(
          (r: any) => r.sku === item.sku && r.franchise_id === null
        );

        if (!warehouseRow || warehouseRow.quantity < item.quantity) {
          console.warn(`Insufficient warehouse stock for ${item.itemName} (sku: ${item.sku}), skipping`);
          continue;
        }

        // Deduct from warehouse
        const { error: deductError } = await supabase
          .from('inventory')
          .update({
            quantity: warehouseRow.quantity - item.quantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', warehouseRow.id);

        if (deductError) {
          console.error('Error deducting warehouse stock:', deductError);
          continue;
        }

        // Check if franchise already has this SKU
        const franchiseRow = freshInventory.find(
          (r: any) => r.sku === item.sku && r.franchise_id === order.franchiseId
        );

        if (franchiseRow) {
          // Update existing franchise inventory row
          const { error: addError } = await supabase
            .from('inventory')
            .update({
              quantity: franchiseRow.quantity + item.quantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', franchiseRow.id);
          if (addError) console.error('Error updating franchise inventory:', addError);
        } else {
          // Create new inventory row for this franchise
          const { error: insertError } = await supabase
            .from('inventory')
            .insert({
              sku: warehouseRow.sku,
              barcode: warehouseRow.barcode,
              item_name: warehouseRow.item_name,
              category: warehouseRow.category,
              price: warehouseRow.price,
              quantity: item.quantity,
              description: warehouseRow.description,
              franchise_id: order.franchiseId,
            });
          if (insertError) console.error('Error creating franchise inventory:', insertError);
        }
      }

      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Error approving stock order:', err);
      setError(err.message);
      return false;
    }
  };

  // Reject a stock order
  const rejectStockOrder = async (orderId: string): Promise<boolean> => {
    if (!isSupabaseAvailable() || !supabase) return false;
    try {
      const { error } = await supabase
        .from('stock_orders')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Error rejecting stock order:', err);
      setError(err.message);
      return false;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        salesHistory,
        customers,
        stockOrders,
        isLoading,
        error,
        addInventoryItem,
        updateInventoryItem,
        updateInventoryQuantity,
        deleteInventoryItem,
        getInventoryBySku,
        getCustomerByPhone,
        recordSale,
        addCustomer,
        getTotalInventoryValue,
        getTotalInventoryCount,
        getLowStockItems,
        refreshData,
        createStockOrder,
        approveStockOrder,
        rejectStockOrder,
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