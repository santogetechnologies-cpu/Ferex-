import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Rimi Products ──────────────────────────────────────────────────────────
export async function getRimiProducts() {
  try {
    const { data, error } = await supabase
      .from('rimi_products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_products', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_products');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_products');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiProduct(product: {
  sku: string;
  name: string;
  category: string;
  unit?: string;
  unit_price: number;
  current_stock_units?: number;
  storage_temp?: string;
  storage_temp_celsius?: number;
  min_stock_alert?: number;
}) {
  const payload = {
    id: generateUUID(),
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit || 'KG',
    unit_price: Number(product.unit_price) || 0,
    storage_temp: product.storage_temp || (product.storage_temp_celsius ? `${product.storage_temp_celsius}°C` : '-18°C'),
    min_stock_alert: Number(product.min_stock_alert) || 50,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getRimiProducts();
  const updated = [payload, ...current.filter((p: any) => p.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_products', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_products').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_products_change');
  return payload;
}

export async function updateRimiProduct(id: string, updates: Partial<{
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  storage_temp: string;
  min_stock_alert: number;
  is_active: boolean;
}>) {
  const current = await getRimiProducts();
  const updated = current.map((p: any) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
  try { localStorage.setItem('ferex_rimi_products', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_products_change');
  return { id, ...updates };
}

export async function deleteRimiProduct(id: string) {
  const current = await getRimiProducts();
  const updated = current.filter((p: any) => p.id !== id);
  try { localStorage.setItem('ferex_rimi_products', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_products').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_products_change');
  return true;
}

// ─── Rimi Distributors & Customers ──────────────────────────────────────────
export async function getRimiDistributors(tier?: string) {
  try {
    let query = supabase.from('rimi_distributors').select('*').order('business_name', { ascending: true });
    if (tier && tier !== 'All') {
      query = query.eq('tier', tier);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_distributors', JSON.stringify(data)); } catch {}
      if (tier && tier !== 'All') return data.filter((d: any) => d.tier === tier);
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_distributors');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (tier && tier !== 'All') return parsed.filter((d: any) => d.tier === tier);
        return parsed;
      } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_distributors');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (tier && tier !== 'All') return parsed.filter((d: any) => d.tier === tier);
        return parsed;
      } catch {}
    }
    return [];
  }
}

export async function getRimiCustomers() {
  return getRimiDistributors();
}

export async function createRimiDistributor(dist: {
  business_name: string;
  contact_person: string;
  tier?: string;
  customer_type?: string;
  territory?: string;
  city?: string;
  email: string;
  phone?: string;
  credit_limit?: number;
  outstanding_balance?: number;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    business_name: dist.business_name,
    contact_person: dist.contact_person,
    tier: dist.tier || dist.customer_type || 'Retailer',
    territory: dist.territory || dist.city || 'Regional Hub',
    email: dist.email,
    phone: dist.phone || '',
    credit_limit: Number(dist.credit_limit) || 0,
    outstanding_balance: Number(dist.outstanding_balance) || 0,
    status: dist.status || 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getRimiDistributors();
  const updated = [payload, ...current.filter((d: any) => d.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_distributors', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_distributors').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_distributors_change');
  return payload;
}

export async function createRimiCustomer(customer: any) {
  return createRimiDistributor(customer);
}

export async function updateRimiDistributor(id: string, updates: any) {
  const current = await getRimiDistributors();
  const updated = current.map((d: any) => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d);
  try { localStorage.setItem('ferex_rimi_distributors', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_distributors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_distributors_change');
  return { id, ...updates };
}

export async function deleteRimiDistributor(id: string) {
  const current = await getRimiDistributors();
  const updated = current.filter((d: any) => d.id !== id);
  try { localStorage.setItem('ferex_rimi_distributors', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_distributors').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_distributors_change');
  return true;
}

// ─── Rimi Inventory ─────────────────────────────────────────────────────────
export async function getRimiInventory() {
  try {
    const { data, error } = await supabase
      .from('rimi_inventory')
      .select('*, product:rimi_products(*)')
      .order('updated_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_inventory');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_inventory');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiInventoryItem(item: {
  product_id: string;
  batch_number: string;
  warehouse_location?: string;
  quantity_on_hand: number;
  production_date?: string;
  expiry_date: string;
}) {
  const products = await getRimiProducts();
  const matchedProd = products.find((p: any) => p.id === item.product_id);

  const payload = {
    id: generateUUID(),
    product_id: item.product_id,
    batch_number: item.batch_number,
    warehouse_location: item.warehouse_location || 'Central Cold Storage',
    quantity_on_hand: Number(item.quantity_on_hand) || 0,
    production_date: item.production_date || new Date().toISOString().split('T')[0],
    expiry_date: item.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    product: matchedProd || {
      id: item.product_id,
      name: 'Product Item',
      sku: 'SKU-001',
      unit: 'KG',
      unit_price: 0
    },
    updated_at: new Date().toISOString(),
  };

  const current = await getRimiInventory();
  const updated = [payload, ...current.filter((i: any) => i.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(updated)); } catch {}
  try {
    const { product, ...dbPayload } = payload;
    await supabase.from('rimi_inventory').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_rimi_inventory_change');
  return payload;
}

export async function updateRimiInventoryStock(id: string, quantity_on_hand: number) {
  const current = await getRimiInventory();
  const updated = current.map((i: any) => i.id === id ? { ...i, quantity_on_hand, updated_at: new Date().toISOString() } : i);
  try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_inventory')
      .update({ quantity_on_hand, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_inventory_change');
  return { id, quantity_on_hand };
}

export async function deleteRimiInventoryItem(id: string) {
  const current = await getRimiInventory();
  const updated = current.filter((i: any) => i.id !== id);
  try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_inventory').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_inventory_change');
  return true;
}

// ─── Rimi Sales Orders ──────────────────────────────────────────────────────
export async function getRimiSalesOrders() {
  try {
    const { data, error } = await supabase
      .from('rimi_sales_orders')
      .select('*, distributor:rimi_distributors(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_sales_orders');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_sales_orders');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiSalesOrder(order: {
  distributor_id?: string;
  customer_name?: string;
  total_amount: number;
  payment_status?: string;
  order_status?: string;
  items_count?: number;
  items?: any[];
  items_summary?: any;
  delivery_date?: string;
}) {
  const distributors = await getRimiDistributors();
  const dist = distributors.find((d: any) => d.id === order.distributor_id || d.business_name === order.customer_name);

  const payload = {
    id: generateUUID(),
    order_no: `SO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    distributor_id: order.distributor_id || dist?.id || null,
    total_amount: Number(order.total_amount) || 0,
    payment_status: order.payment_status || 'Pending',
    order_status: order.order_status || 'Order Received',
    created_at: new Date().toISOString(),
    distributor: dist || { business_name: order.customer_name || 'B2B Client' },
  };

  const current = await getRimiSalesOrders();
  const updated = [payload, ...current.filter((o: any) => o.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try {
    const { distributor, ...dbPayload } = payload;
    await supabase.from('rimi_sales_orders').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return payload;
}

export async function updateRimiSalesOrderStatus(id: string, order_status: string) {
  const current = await getRimiSalesOrders();
  const updated = current.map((o: any) => o.id === id ? { ...o, order_status, updated_at: new Date().toISOString() } : o);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_sales_orders')
      .update({ order_status })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return { id, order_status };
}

export const updateRimiOrderStatus = updateRimiSalesOrderStatus;

export async function deleteRimiSalesOrder(id: string) {
  const current = await getRimiSalesOrders();
  const updated = current.filter((o: any) => o.id !== id);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_sales_orders').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return true;
}

// ─── Rimi Warehouses ────────────────────────────────────────────────────────
export async function getRimiWarehouses() {
  try {
    const { data, error } = await supabase
      .from('rimi_warehouses')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_warehouses');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_warehouses');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiWarehouse(wh: {
  code: string;
  name: string;
  city: string;
  address?: string;
  cold_room_temp_celsius?: number;
  total_capacity_pallets?: number;
  utilized_pallets?: number;
  manager_name?: string;
  manager_phone?: string;
}) {
  const payload = {
    id: generateUUID(),
    code: wh.code,
    name: wh.name,
    city: wh.city,
    address: wh.address || '',
    cold_room_temp_celsius: wh.cold_room_temp_celsius || -20.0,
    total_capacity_pallets: Number(wh.total_capacity_pallets) || 1000,
    utilized_pallets: Number(wh.utilized_pallets) || 0,
    manager_name: wh.manager_name || 'Warehouse Manager',
    manager_phone: wh.manager_phone || '',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiWarehouses();
  const updated = [payload, ...current.filter((w: any) => w.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_warehouses').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_warehouses_change');
  return payload;
}

export async function updateRimiWarehouse(id: string, updates: any) {
  const current = await getRimiWarehouses();
  const updated = current.map((w: any) => w.id === id ? { ...w, ...updates } : w);
  try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_warehouses')
      .update(updates)
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_warehouses_change');
  return { id, ...updates };
}

export async function deleteRimiWarehouse(id: string) {
  const current = await getRimiWarehouses();
  const updated = current.filter((w: any) => w.id !== id);
  try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_warehouses').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_warehouses_change');
  return true;
}

// ─── Rimi Batches ───────────────────────────────────────────────────────────
export async function getRimiBatches() {
  try {
    const { data, error } = await supabase
      .from('rimi_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_batches');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_batches');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiBatch(batch: {
  batch_number: string;
  product_name: string;
  production_date?: string;
  expiry_date: string;
  quantity_units: number;
  warehouse_name?: string;
  quality_grade?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    batch_number: batch.batch_number,
    product_name: batch.product_name,
    production_date: batch.production_date || new Date().toISOString().split('T')[0],
    expiry_date: batch.expiry_date,
    quantity_units: Number(batch.quantity_units) || 0,
    warehouse_name: batch.warehouse_name || 'Central Cold Hub',
    quality_grade: batch.quality_grade || 'Grade A',
    status: batch.status || 'Active',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiBatches();
  const updated = [payload, ...current.filter((b: any) => b.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_batches').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_batches_change');
  return payload;
}

export async function updateRimiBatchStatus(id: string, status: string) {
  const current = await getRimiBatches();
  const updated = current.map((b: any) => b.id === id ? { ...b, status } : b);
  try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_batches')
      .update({ status })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_batches_change');
  return { id, status };
}

export async function deleteRimiBatch(id: string) {
  const current = await getRimiBatches();
  const updated = current.filter((b: any) => b.id !== id);
  try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_batches').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_batches_change');
  return true;
}

// ─── Rimi Deliveries ────────────────────────────────────────────────────────
export async function getRimiDeliveries() {
  try {
    const { data, error } = await supabase
      .from('rimi_deliveries')
      .select('*, order:rimi_sales_orders(*, distributor:rimi_distributors(*))')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_deliveries');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_deliveries');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiDelivery(delivery: {
  delivery_number?: string;
  order_id?: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone?: string;
  departure_temp?: string;
  delivery_status?: string;
  customer_name?: string;
}) {
  const payload = {
    id: generateUUID(),
    delivery_number: delivery.delivery_number || `DEL-2026-${Math.floor(100 + Math.random() * 900)}`,
    order_id: delivery.order_id || null,
    vehicle_no: delivery.vehicle_no,
    driver_name: delivery.driver_name,
    driver_phone: delivery.driver_phone || '',
    departure_temp: delivery.departure_temp || '-18.0°C',
    delivery_status: delivery.delivery_status || 'In Transit',
    customer_name: delivery.customer_name || 'Client',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiDeliveries();
  const updated = [payload, ...current.filter((d: any) => d.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_deliveries').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_deliveries_change');
  return payload;
}

export async function updateRimiDeliveryStatus(id: string, delivery_status: string) {
  const current = await getRimiDeliveries();
  const updated = current.map((d: any) => d.id === id ? { ...d, delivery_status } : d);
  try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_deliveries')
      .update({ delivery_status })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_deliveries_change');
  return { id, delivery_status };
}

export async function deleteRimiDelivery(id: string) {
  const current = await getRimiDeliveries();
  const updated = current.filter((d: any) => d.id !== id);
  try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_deliveries').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_deliveries_change');
  return true;
}

// ─── Rimi Payment Collections ───────────────────────────────────────────────
export async function getRimiCollections() {
  try {
    const { data, error } = await supabase
      .from('rimi_payment_collections')
      .select('*, distributor:rimi_distributors(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_collections');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_collections');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiCollection(col: {
  distributor_id?: string;
  customer_name: string;
  amount: number;
  payment_method?: string;
  payment_date?: string;
  status?: string;
  reference_no?: string;
}) {
  const payload = {
    id: generateUUID(),
    reference_no: col.reference_no || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
    distributor_id: col.distributor_id || null,
    customer_name: col.customer_name,
    amount: Number(col.amount) || 0,
    payment_method: col.payment_method || 'Bank Wire',
    payment_date: col.payment_date || new Date().toISOString().split('T')[0],
    status: col.status || 'Settled & Cleared',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiCollections();
  const updated = [payload, ...current.filter((c: any) => c.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_payment_collections').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_collections_change');
  return payload;
}

export const getRimiPayments = getRimiCollections;

export async function updateRimiCollectionStatus(id: string, status: string) {
  const current = await getRimiCollections();
  const updated = current.map((c: any) => c.id === id ? { ...c, status } : c);
  try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_payment_collections')
      .update({ status })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_collections_change');
  return { id, status };
}

export async function deleteRimiCollection(id: string) {
  const current = await getRimiCollections();
  const updated = current.filter((c: any) => c.id !== id);
  try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_payment_collections').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_collections_change');
  return true;
}

// ─── Rimi Fleet Vehicles ────────────────────────────────────────────────────
export async function getRimiVehicles() {
  try {
    const { data, error } = await supabase
      .from('rimi_vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_rimi_vehicles');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_rimi_vehicles');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createRimiVehicle(v: {
  vehicle_number: string;
  driver_name: string;
  driver_phone?: string;
  capacity_tonnes?: number;
  current_temp_celsius?: number;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    vehicle_number: v.vehicle_number,
    driver_name: v.driver_name,
    driver_phone: v.driver_phone || '',
    capacity_tonnes: Number(v.capacity_tonnes) || 10,
    current_temp_celsius: v.current_temp_celsius || -18.0,
    status: v.status || 'Stationed',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiVehicles();
  const updated = [payload, ...current.filter((item: any) => item.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_vehicles').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_vehicles_change');
  return payload;
}

export async function updateRimiVehicleStatus(id: string, status: string) {
  const current = await getRimiVehicles();
  const updated = current.map((v: any) => v.id === id ? { ...v, status } : v);
  try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_vehicles')
      .update({ status })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_vehicles_change');
  return { id, status };
}

export async function deleteRimiVehicle(id: string) {
  const current = await getRimiVehicles();
  const updated = current.filter((v: any) => v.id !== id);
  try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_vehicles').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_vehicles_change');
  return true;
}

// ─── Rimi Expiry Tracking ───────────────────────────────────────────────────
export async function getRimiExpiries() {
  const batches = await getRimiBatches();
  return batches.filter((b: any) => b.status === 'Near Expiry Alert' || b.status === 'Critical Expiry');
}

// ─── Rimi Messages & Notifications ──────────────────────────────────────────
export async function getRimiMessages(conversationId: string = '1') {
  try {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('conversation_id', `rimi_${conversationId}`)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function sendRimiMessage(msg: {
  conversation_id: string;
  contact_name: string;
  contact_role?: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
  const payload = {
    id: generateUUID(),
    conversation_id: `rimi_${msg.conversation_id}`,
    contact_name: msg.contact_name,
    contact_role: msg.contact_role || 'Warehouse Manager',
    sender_name: msg.sender_name || 'Rimi Operations',
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString(),
  };

  try {
    const { data } = await supabase.from('trade_messages').insert(payload).select();
    if (data && data.length > 0) return data[0];
  } catch {}
  return payload;
}

export async function getRimiNotifications() {
  const saved = localStorage.getItem('ferex_rimi_notifications');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createRimiNotification(notif: {
  title: string;
  description: string;
  category?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: notif.title,
    message: notif.description,
    description: notif.description,
    type: 'info',
    category: notif.category || 'Cold Chain',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const current = await getRimiNotifications();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_rimi_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_notifications').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_notifications_change');
  return payload;
}

export async function markRimiNotificationRead(id: string) {
  const current = await getRimiNotifications();
  const updated = current.map((n: any) => n.id === id ? { ...n, is_read: true } : n);
  try { localStorage.setItem('ferex_rimi_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_notifications').update({ is_read: true }).eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_notifications_change');
  return true;
}

// ─── Rimi Dashboard Stats Aggregator ─────────────────────────────────────────
export async function getRimiDashboardStats() {
  try {
    const [productsRes, ordersRes, distributorsRes, paymentsRes] = await Promise.all([
      supabase.from('rimi_products').select('unit_price, min_stock_alert'),
      supabase.from('rimi_sales_orders').select('total_amount, order_status'),
      supabase.from('rimi_distributors').select('outstanding_balance'),
      supabase.from('rimi_payment_collections').select('amount'),
    ]);

    const products = productsRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const distributors = distributorsRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const activeOrders = orders.filter((o: any) => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled');
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
    const totalCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totalOutstanding = distributors.reduce((sum: number, d: any) => sum + (Number(d.outstanding_balance) || 0), 0);

    const formatInr = (amt: number) => {
      if (!amt || amt === 0) return '₹0';
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakhs`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeOrdersCount: activeOrders.length,
      totalOrdersCount: orders.length,
      totalRevenueAmount: totalRevenue,
      totalRevenueStr: formatInr(totalRevenue),
      totalCollectedAmount: totalCollected,
      totalCollectedStr: formatInr(totalCollected),
      totalOutstandingStr: formatInr(totalOutstanding),
      totalProductsCount: products.length,
    };
  } catch {
    return {
      activeOrdersCount: 0,
      totalOrdersCount: 0,
      totalRevenueAmount: 0,
      totalRevenueStr: '₹0',
      totalCollectedAmount: 0,
      totalCollectedStr: '₹0',
      totalOutstandingStr: '₹0',
      totalProductsCount: 0,
    };
  }
}

// ─── Rimi Customer / Distributor Credential Provisioning ────────────────────
export interface ProvisionedRimiCredential {
  email: string;
  tempPassword: string;
  role: string;
  fullName: string;
  businessName: string;
  customerId: string;
  requirePasswordReset: boolean;
  provisionedAt: string;
}

export async function provisionRimiCustomerLogin(customer: {
  id: string;
  email: string;
  business_name?: string;
  name?: string;
  contact_person?: string;
}): Promise<ProvisionedRimiCredential> {
  const cleanEmail = customer.email.trim().toLowerCase();
  const tempPassword = `RimiPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const businessName = customer.business_name || customer.name || 'Rimi B2B Partner';
  const fullName = customer.contact_person || customer.name || 'Procurement Executive';

  const credentialPayload: ProvisionedRimiCredential = {
    email: cleanEmail,
    tempPassword,
    role: 'rimi_client',
    fullName,
    businessName,
    customerId: customer.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'rimi_client',
    full_name: fullName,
    company_name: businessName,
    customer_id: customer.id,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_rimi_customer_cred_${customer.id}`, JSON.stringify(credentialPayload));

  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'rimi_client',
      full_name: fullName,
      phone: '',
      department: `Rimi:${businessName}`,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch {}

  window.dispatchEvent(new Event('ferex_rimi_distributors_change'));
  return credentialPayload;
}

export function getRimiCustomerCredentials(customerId: string): ProvisionedRimiCredential | null {
  const saved = localStorage.getItem(`ferex_rimi_customer_cred_${customerId}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// ─── Rimi Frost Loss & Shrinkage Tracking ────────────────────────────────────
export interface RimiFrostLoss {
  id: string;
  product_id?: string;
  product_name: string;
  batch_number: string;
  warehouse_location: string;
  quantity_lost_kg: number;
  loss_reason: 'Defrost Cycle Damage' | 'Freezer Burn' | 'Packaging Seal Rupture' | 'Temperature Excursion' | 'Transit Thaw' | 'Other';
  estimated_loss_value: number;
  recorded_by: string;
  recorded_at: string;
  status: 'Approved Write-off' | 'Under Investigation';
}

export async function getRimiFrostLosses(): Promise<RimiFrostLoss[]> {
  const saved = localStorage.getItem('ferex_rimi_frost_losses');
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function recordRimiFrostLoss(loss: {
  product_id?: string;
  product_name: string;
  batch_number: string;
  warehouse_location: string;
  quantity_lost_kg: number;
  loss_reason: any;
  estimated_loss_value: number;
  recorded_by?: string;
}): Promise<RimiFrostLoss> {
  const current = await getRimiFrostLosses();
  const created: RimiFrostLoss = {
    id: `FL-2026-${Math.floor(100 + Math.random() * 900)}`,
    product_id: loss.product_id,
    product_name: loss.product_name,
    batch_number: loss.batch_number,
    warehouse_location: loss.warehouse_location,
    quantity_lost_kg: Number(loss.quantity_lost_kg) || 0,
    loss_reason: loss.loss_reason || 'Freezer Burn',
    estimated_loss_value: Number(loss.estimated_loss_value) || 0,
    recorded_by: loss.recorded_by || 'Cold Chain Supervisor',
    recorded_at: new Date().toISOString(),
    status: 'Approved Write-off',
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_rimi_frost_losses', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_frost_losses_change');
  return created;
}

export async function deleteRimiFrostLoss(id: string): Promise<boolean> {
  const current = await getRimiFrostLosses();
  const updated = current.filter(f => f.id !== id);
  localStorage.setItem('ferex_rimi_frost_losses', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_frost_losses_change');
  return true;
}

// ─── Rimi Stock Adjustments & Transfers ───────────────────────────────────────
export interface RimiStockAdjustment {
  id: string;
  product_name: string;
  adjustment_type: 'Inward Addition' | 'Frost Loss Deduction' | 'Inter-Warehouse Transfer' | 'Cycle Count Audit';
  quantity: number;
  unit: string;
  source_location?: string;
  target_location?: string;
  reason: string;
  timestamp: string;
}

export async function getRimiStockAdjustments(): Promise<RimiStockAdjustment[]> {
  const saved = localStorage.getItem('ferex_rimi_stock_adjustments');
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function recordRimiStockAdjustment(adj: {
  product_name: string;
  adjustment_type: any;
  quantity: number;
  unit?: string;
  source_location?: string;
  target_location?: string;
  reason: string;
}): Promise<RimiStockAdjustment> {
  const current = await getRimiStockAdjustments();
  const created: RimiStockAdjustment = {
    id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
    product_name: adj.product_name,
    adjustment_type: adj.adjustment_type,
    quantity: Number(adj.quantity) || 0,
    unit: adj.unit || 'KG',
    source_location: adj.source_location || 'Central Cold Storage',
    target_location: adj.target_location,
    reason: adj.reason,
    timestamp: new Date().toISOString(),
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_rimi_stock_adjustments', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_stock_adjustments_change');
  return created;
}

export async function deleteRimiStockAdjustment(id: string): Promise<boolean> {
  const current = await getRimiStockAdjustments();
  const updated = current.filter(a => a.id !== id);
  localStorage.setItem('ferex_rimi_stock_adjustments', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_stock_adjustments_change');
  return true;
}

// ─── Rimi Delivery Routes ───────────────────────────────────────────────────
export interface RimiDeliveryRoute {
  id: string;
  route_code: string;
  route_name: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone: string;
  start_point: string;
  end_point: string;
  total_stops: number;
  status: 'Active En Route' | 'Scheduled' | 'Completed';
  target_temp: string;
}

export async function getRimiDeliveryRoutes(): Promise<RimiDeliveryRoute[]> {
  const saved = localStorage.getItem('ferex_rimi_delivery_routes');
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createRimiDeliveryRoute(route: {
  route_code: string;
  route_name: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone?: string;
  start_point: string;
  end_point: string;
  total_stops?: number;
  status?: any;
}): Promise<RimiDeliveryRoute> {
  const current = await getRimiDeliveryRoutes();
  const created: RimiDeliveryRoute = {
    id: `RT-${Date.now().toString().slice(-4)}`,
    route_code: route.route_code,
    route_name: route.route_name,
    vehicle_no: route.vehicle_no,
    driver_name: route.driver_name,
    driver_phone: route.driver_phone || '',
    start_point: route.start_point,
    end_point: route.end_point,
    total_stops: Number(route.total_stops) || 1,
    status: route.status || 'Scheduled',
    target_temp: '-18.0°C',
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_rimi_delivery_routes', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_delivery_routes_change');
  return created;
}

export async function deleteRimiDeliveryRoute(id: string): Promise<boolean> {
  const current = await getRimiDeliveryRoutes();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem('ferex_rimi_delivery_routes', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_delivery_routes_change');
  return true;
}
