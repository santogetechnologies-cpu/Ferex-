import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Dual Sync Trigger Helper ────────────────────────────────────────────────
function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Seed Guard Helpers ──────────────────────────────────────────────────────
function isSeeded(entity: string): boolean {
  try { return localStorage.getItem('ferex_rimi_seeded_' + entity) === 'true'; } catch { return false; }
}
function markSeeded(entity: string): void {
  try { localStorage.setItem('ferex_rimi_seeded_' + entity, 'true'); } catch {}
}


// ─── Default Real-World Seed Data for Rimi ──────────────────────────────────
const DEFAULT_RIMI_PRODUCTS = [
  { id: 'PROD-01', sku: 'RIMI-FF-01', name: 'frozen food', category: 'Frozen Meat & Seafood', unit: 'KG', unit_price: 500, storage_temp: '-22°C', min_stock_alert: 50, is_active: true },
  { id: 'PROD-02', sku: 'RIMI-PRAWN', name: 'King Tiger Prawns (500g IQF)', category: 'Seafood', unit: 'Packs', unit_price: 650, storage_temp: '-18°C', min_stock_alert: 30, is_active: true },
  { id: 'PROD-03', sku: 'RIMI-SALMON', name: 'Norwegian Atlantic Salmon', category: 'Fish', unit: 'KG', unit_price: 1200, storage_temp: '-20°C', min_stock_alert: 20, is_active: true },
];

const DEFAULT_RIMI_INVENTORY = [
  {
    id: 'INV-LOT-01',
    product_id: 'PROD-01',
    batch_number: 'LOT-RIMI-S',
    warehouse_location: 'Mumbai Central Deep Freeze (-22°C)',
    quantity_on_hand: 150,
    expiry_date: '2027-04-30',
    product: {
      id: 'PROD-01',
      sku: 'RIMI-FF-01',
      name: 'frozen food',
      unit: 'KG',
      unit_price: 500,
    },
    updated_at: '2026-09-01T10:00:00Z'
  }
];

const DEFAULT_RIMI_WAREHOUSES = [
  { id: 'WH-MUM-01', code: 'WH-MUM-01', name: 'Mumbai Central Deep Freeze Hub', city: 'Navi Mumbai', address: 'APMC Logistics Corridor, Sector 19', cold_room_temp_celsius: -22.4, total_capacity_pallets: 1200, utilized_pallets: 1056, manager_name: 'Rajesh Sharma', manager_phone: '+91 98200 44556', created_at: '2026-08-01T10:00:00Z' },
  { id: 'WH-DEL-02', code: 'WH-DEL-02', name: 'Delhi NCR Reefer Logistics Center', city: 'Gurugram', address: 'Cyber City Expressway Cold Park', cold_room_temp_celsius: -20.1, total_capacity_pallets: 850, utilized_pallets: 544, manager_name: 'Amit Verma', manager_phone: '+91 98200 44557', created_at: '2026-08-05T10:00:00Z' },
  { id: 'WH-BLR-03', code: 'WH-BLR-03', name: 'Bengaluru South Cold Transit Depot', city: 'Bengaluru', address: 'Electronic City Phase II Depot', cold_room_temp_celsius: -18.8, total_capacity_pallets: 600, utilized_pallets: 432, manager_name: 'K. Sunderam', manager_phone: '+91 98200 44558', created_at: '2026-08-10T10:00:00Z' },
];

const DEFAULT_RIMI_BATCHES = [
  { id: 'LOT-SEA-9821', batch_number: 'LOT-SEA-9821', product_name: 'Premium King Prawns (500g IQF)', production_date: '2026-08-01', expiry_date: '2027-08-01', quantity_units: 450, warehouse_name: 'Mumbai Central Deep Freeze Hub', quality_grade: 'Grade A Export', status: 'Active', created_at: '2026-08-01T10:00:00Z' },
  { id: 'LOT-MT-4402', batch_number: 'LOT-MT-4402', product_name: 'Gourmet Chicken Nuggets (1kg Family Pack)', production_date: '2026-07-15', expiry_date: '2027-01-15', quantity_units: 320, warehouse_name: 'Delhi NCR Reefer Logistics Center', quality_grade: 'Grade A Export', status: 'Active', created_at: '2026-07-15T10:00:00Z' },
  { id: 'LOT-VG-1109', batch_number: 'LOT-VG-1109', product_name: 'Sweet Corn & Green Peas IQF (1kg)', production_date: '2026-06-20', expiry_date: '2026-12-20', quantity_units: 180, warehouse_name: 'Bengaluru South Cold Transit Depot', quality_grade: 'Grade A Export', status: 'Near Expiry Alert', created_at: '2026-06-20T10:00:00Z' },
];

const DEFAULT_RIMI_DELIVERIES = [
  { id: 'DEL-2026-901', delivery_number: 'DEL-2026-901', vehicle_no: 'Reefer Truck #MH-12-AZ-8901', driver_name: 'Sanjay Kumar', driver_phone: '+91 98765 43210', departure_temp: '-19.2°C', delivery_status: 'In Transit', customer_name: 'HyperCity Supermarkets Mumbai Hub', order: { order_no: 'SO-2026-101', distributor: { business_name: 'HyperCity Supermarkets Mumbai Hub' } }, created_at: '2026-09-02T10:00:00Z' },
  { id: 'DEL-2026-902', delivery_number: 'DEL-2026-902', vehicle_no: 'Reefer Truck #MH-04-DX-3310', driver_name: 'Vikram Singh', driver_phone: '+91 98230 44556', departure_temp: '-20.5°C', delivery_status: 'Assigned', customer_name: 'Royal Ocean HORECA Wholesale Ltd', order: { order_no: 'SO-2026-102', distributor: { business_name: 'Royal Ocean HORECA Wholesale Ltd' } }, created_at: '2026-09-03T10:00:00Z' },
];

const DEFAULT_RIMI_COLLECTIONS = [
  { id: 'REF-HDFC-9910', reference_no: 'REF-HDFC-9910', customer_name: 'HyperCity Supermarkets Mumbai Hub', amount: 245000, payment_method: 'RTGS / Bank Wire', payment_date: '2026-09-02', status: 'Settled & Cleared', distributor: { business_name: 'HyperCity Supermarkets Mumbai Hub' }, created_at: '2026-09-02T10:00:00Z' },
  { id: 'REF-ICICI-8821', reference_no: 'REF-ICICI-8821', customer_name: 'Royal Ocean HORECA Wholesale Ltd', amount: 480000, payment_method: 'Cheque Clearance', payment_date: '2026-08-30', status: 'Settled & Cleared', distributor: { business_name: 'Royal Ocean HORECA Wholesale Ltd' }, created_at: '2026-08-30T10:00:00Z' },
];

const DEFAULT_RIMI_VEHICLES = [
  { id: 'TRK-101', vehicle_number: 'MH-12-AZ-8901', driver_name: 'Sanjay Kumar', driver_phone: '+91 98765 43210', capacity_tonnes: 14, current_temp_celsius: -20.4, status: 'On Route', created_at: '2026-08-01T10:00:00Z' },
  { id: 'TRK-102', vehicle_number: 'MH-04-DX-3310', driver_name: 'Vikram Singh', driver_phone: '+91 98230 44556', capacity_tonnes: 10, current_temp_celsius: -19.1, status: 'Stationed', created_at: '2026-08-05T10:00:00Z' },
];

// ─── Rimi Products & Inventory ──────────────────────────────────────────────
export async function getRimiProducts() {
  const seeded = isSeeded('products');
  const local = localStorage.getItem('ferex_rimi_products');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_products')
      .select('*')
      .order('name', { ascending: true });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_products', JSON.stringify(merged)); } catch {}
      if (!seeded) markSeeded('products');
      return merged;
    }
  } catch {}

  if (local !== null) return localList;
  if (seeded) return [];
  markSeeded('products');
  try { localStorage.setItem('ferex_rimi_products', JSON.stringify(DEFAULT_RIMI_PRODUCTS)); } catch {}
  return DEFAULT_RIMI_PRODUCTS;
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
    unit_price: product.unit_price,
    storage_temp: product.storage_temp || (product.storage_temp_celsius ? `${product.storage_temp_celsius}°C` : '-18°C'),
    min_stock_alert: product.min_stock_alert || 50,
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
  const seeded = isSeeded('distributors');
  const local = localStorage.getItem('ferex_rimi_distributors');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  }

  try {
    let query = supabase.from('rimi_distributors').select('*').order('business_name', { ascending: true });
    if (tier && tier !== 'All') {
      query = query.eq('tier', tier);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_distributors', JSON.stringify(merged)); } catch {}
      if (!seeded) markSeeded('distributors');
      if (tier && tier !== 'All') return merged.filter((d: any) => d.tier === tier);
      return merged;
    }
  } catch {}

  let result = localList;
  if (tier && tier !== 'All') {
    result = result.filter((d: any) => d.tier === tier);
  }
  return result;
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
    territory: dist.territory || dist.city || 'Mumbai Central',
    email: dist.email,
    phone: dist.phone || '+91 98200 11223',
    credit_limit: dist.credit_limit || 100000.00,
    outstanding_balance: dist.outstanding_balance || 0.00,
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
  const seeded = isSeeded('inventory');
  const local = localStorage.getItem('ferex_rimi_inventory');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_inventory')
      .select('*, product:rimi_products(*)')
      .order('updated_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(merged)); } catch {}
      if (!seeded) markSeeded('inventory');
      return merged;
    }
  } catch {}

  if (local !== null) return localList;
  if (seeded) return [];
  markSeeded('inventory');
  try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(DEFAULT_RIMI_INVENTORY)); } catch {}
  return DEFAULT_RIMI_INVENTORY;
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
    warehouse_location: item.warehouse_location || 'Mumbai Central Deep Freeze (-22°C)',
    quantity_on_hand: Number(item.quantity_on_hand) || 0,
    production_date: item.production_date || new Date().toISOString().split('T')[0],
    expiry_date: item.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    product: matchedProd ? {
      id: matchedProd.id,
      name: matchedProd.name,
      sku: matchedProd.sku,
      unit: matchedProd.unit || 'KG',
      unit_price: matchedProd.unit_price || 500
    } : {
      id: item.product_id,
      name: 'frozen food',
      sku: 'RIMI-FF-01',
      unit: 'KG',
      unit_price: 500
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
  const seeded = isSeeded('sales_orders');
  const local = localStorage.getItem('ferex_rimi_sales_orders');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_sales_orders')
      .select('*, distributor:rimi_distributors(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(merged)); } catch {}
      if (!seeded) markSeeded('sales_orders');
      return merged;
    }
  } catch {}

  return localList;
}

export async function createRimiSalesOrder(order: {
  distributor_id?: string;
  customer_name?: string;
  order_no?: string;
  total_amount: number;
  items_summary?: string;
  items?: Array<{ product_id?: string; product_name?: string; quantity?: number; unit_price?: number; total_line_amount?: number }>;
  order_status?: string;
  status?: string;
  delivery_date?: string;
  delivery_due_date?: string;
  payment_status?: string;
  assigned_reefer_truck?: string;
}) {
  let distId = order.distributor_id;
  if (!distId) {
    const dists = await getRimiDistributors();
    if (dists.length > 0) {
      distId = dists[0].id;
    } else {
      const createdDist = await createRimiDistributor({
        business_name: order.customer_name || 'HyperCity Supermarkets Mumbai Hub',
        contact_person: 'Rajesh Sharma',
        email: 'procurement@hypercity-retail.in',
        phone: '+91 98200 11223'
      });
      distId = createdDist.id;
    }
  }

  const payload = {
    id: generateUUID(),
    distributor_id: distId,
    order_no: order.order_no || `SO-2026-${Math.floor(100 + Math.random() * 900)}`,
    total_amount: order.total_amount,
    order_status: order.order_status || order.status || 'Received',
    delivery_date: order.delivery_date || order.delivery_due_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    payment_status: order.payment_status || 'Unpaid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getRimiSalesOrders();
  const updated = [payload, ...current.filter((o: any) => o.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_sales_orders').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return payload;
}

export async function updateRimiOrderStatus(id: string, order_status: string) {
  const current = await getRimiSalesOrders();
  const updated = current.map((o: any) => o.id === id ? { ...o, order_status, updated_at: new Date().toISOString() } : o);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_sales_orders')
      .update({ order_status, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return { id, order_status };
}

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
  const seeded = isSeeded('warehouses');
  const local = localStorage.getItem('ferex_rimi_warehouses');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('warehouses');
    localList = DEFAULT_RIMI_WAREHOUSES;
    try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_warehouses')
      .select('*')
      .order('name', { ascending: true });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
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
    address: wh.address || `${wh.city} Industrial Zone`,
    cold_room_temp_celsius: wh.cold_room_temp_celsius ?? -22.0,
    total_capacity_pallets: wh.total_capacity_pallets ?? 1000,
    utilized_pallets: wh.utilized_pallets ?? 350,
    manager_name: wh.manager_name || 'Hub Lead',
    manager_phone: wh.manager_phone || '+91 98200 44556',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiWarehouses();
  const updated = [payload, ...current.filter((w: any) => w.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_warehouses').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_warehouses_change');
  return payload;
}

export async function deleteRimiWarehouse(id: string) {
  const current = await getRimiWarehouses();
  const updated = current.filter((w: any) => w.id !== id && w.rawId !== id && w.code !== id);
  try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_warehouses').delete().or(`id.eq.${id},code.eq.${id}`); } catch {}
  triggerLocalSync('ferex_rimi_warehouses_change');
  return true;
}

// ─── Rimi Reefer Vehicles & Logistics ───────────────────────────────────────
export async function getRimiVehicles() {
  const seeded = isSeeded('vehicles');
  const local = localStorage.getItem('ferex_rimi_vehicles');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('vehicles');
    localList = DEFAULT_RIMI_VEHICLES;
    try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_vehicles')
      .select('*')
      .order('vehicle_number', { ascending: true });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
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
    driver_phone: v.driver_phone || '+91 98765 43210',
    capacity_tonnes: v.capacity_tonnes || 10,
    current_temp_celsius: v.current_temp_celsius || -20.0,
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

export async function updateRimiVehicleStatus(id: string, status: string, temp?: number) {
  const current = await getRimiVehicles();
  const updated = current.map((v: any) => {
    if (v.id === id || v.rawId === id || v.vehicle_number === id) {
      const next = { ...v, status, updated_at: new Date().toISOString() };
      if (temp !== undefined) next.current_temp_celsius = temp;
      return next;
    }
    return v;
  });
  try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(updated)); } catch {}

  const updates: any = { status };
  if (temp !== undefined) updates.current_temp_celsius = temp;
  try {
    await supabase.from('rimi_vehicles').update(updates).or(`id.eq.${id},vehicle_number.eq.${id}`);
  } catch {}
  triggerLocalSync('ferex_rimi_vehicles_change');
  return { id, status };
}

export async function deleteRimiVehicle(id: string) {
  const current = await getRimiVehicles();
  const updated = current.filter((v: any) => v.id !== id && v.rawId !== id && v.vehicle_number !== id);
  try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_vehicles').delete().or(`id.eq.${id},vehicle_number.eq.${id}`); } catch {}
  triggerLocalSync('ferex_rimi_vehicles_change');
  return true;
}

// ─── Rimi Batches & Expiry ──────────────────────────────────────────────────
export async function getRimiBatches() {
  const seeded = isSeeded('batches');
  const local = localStorage.getItem('ferex_rimi_batches');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('batches');
    localList = DEFAULT_RIMI_BATCHES;
    try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_batches')
      .select('*')
      .order('expiry_date', { ascending: true });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createRimiBatch(batch: {
  batch_number: string;
  product_id?: string;
  product_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  quantity_units: number;
  production_date?: string;
  expiry_date: string;
  quality_grade?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    batch_number: batch.batch_number,
    product_id: batch.product_id || null,
    product_name: batch.product_name,
    warehouse_id: batch.warehouse_id || null,
    warehouse_name: batch.warehouse_name || 'Central Cold Hub (-22°C)',
    quantity_units: batch.quantity_units,
    production_date: batch.production_date || new Date().toISOString().split('T')[0],
    expiry_date: batch.expiry_date,
    quality_grade: batch.quality_grade || 'Grade A Export',
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
  const updated = current.map((b: any) => (b.id === id || b.rawId === id || b.batch_number === id) ? { ...b, status, updated_at: new Date().toISOString() } : b);
  try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('rimi_batches').update({ status }).or(`id.eq.${id},batch_number.eq.${id}`);
  } catch {}
  triggerLocalSync('ferex_rimi_batches_change');
  return { id, status };
}

export async function deleteRimiBatch(id: string) {
  const current = await getRimiBatches();
  const updated = current.filter((b: any) => b.id !== id && b.rawId !== id && b.batch_number !== id);
  try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_batches').delete().or(`id.eq.${id},batch_number.eq.${id}`); } catch {}
  triggerLocalSync('ferex_rimi_batches_change');
  return true;
}

// ─── Rimi Deliveries ────────────────────────────────────────────────────────
export async function getRimiDeliveries() {
  const seeded = isSeeded('deliveries');
  const local = localStorage.getItem('ferex_rimi_deliveries');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('deliveries');
    localList = DEFAULT_RIMI_DELIVERIES;
    try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_deliveries')
      .select('*, order:rimi_sales_orders(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createRimiDelivery(delivery: {
  order_id?: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone?: string;
  departure_temp?: string;
  delivery_status?: string;
}) {
  let orderId = delivery.order_id;
  if (!orderId) {
    const orders = await getRimiSalesOrders();
    if (orders.length > 0) orderId = orders[0].id;
    else {
      const newOrder = await createRimiSalesOrder({ total_amount: 145000 });
      orderId = newOrder.id;
    }
  }

  const payload = {
    id: generateUUID(),
    order_id: orderId,
    delivery_number: `DEL-${Date.now().toString().slice(-4)}`,
    vehicle_no: delivery.vehicle_no,
    driver_name: delivery.driver_name,
    driver_phone: delivery.driver_phone || '+91 98765 43210',
    departure_temp: delivery.departure_temp || '-18.5°C',
    delivery_status: delivery.delivery_status || 'Assigned',
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
  const updated = current.map((d: any) => (d.id === id || d.rawId === id || d.delivery_number === id) ? { ...d, delivery_status, updated_at: new Date().toISOString() } : d);
  try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(updated)); } catch {}
  try {
    await supabase
      .from('rimi_deliveries')
      .update({ delivery_status, delivered_at: delivery_status === 'Delivered' ? new Date().toISOString() : null })
      .or(`id.eq.${id},delivery_number.eq.${id}`);
  } catch {}
  triggerLocalSync('ferex_rimi_deliveries_change');
  return { id, delivery_status };
}

export async function deleteRimiDelivery(id: string) {
  const current = await getRimiDeliveries();
  const updated = current.filter((d: any) => d.id !== id && d.rawId !== id && d.delivery_number !== id);
  try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_deliveries').delete().or(`id.eq.${id},delivery_number.eq.${id}`); } catch {}
  triggerLocalSync('ferex_rimi_deliveries_change');
  return true;
}

// ─── Rimi Collections & Payments ────────────────────────────────────────────
export async function getRimiCollections() {
  const seeded = isSeeded('collections');
  const local = localStorage.getItem('ferex_rimi_collections');
  let localList: any[] = [];
  if (local !== null) {
    try { localList = JSON.parse(local); } catch {}
  } else if (!seeded) {
    markSeeded('collections');
    localList = DEFAULT_RIMI_COLLECTIONS;
    try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(localList)); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('rimi_payments')
      .select('*, distributor:rimi_distributors(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const map = new Map<string, any>();
      data.forEach((item: any) => map.set(item.id, item));
      localList.forEach((item: any) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());
      try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function createRimiCollection(col: {
  distributor_id?: string;
  customer_name?: string;
  amount: number;
  payment_method?: string;
  reference_no?: string;
  payment_date?: string;
}) {
  let distId = col.distributor_id;
  if (!distId) {
    const dists = await getRimiDistributors();
    if (dists.length > 0) distId = dists[0].id;
    else {
      const createdDist = await createRimiDistributor({
        business_name: col.customer_name || 'HyperCity Supermarkets Mumbai Hub',
        contact_person: 'Rajesh Sharma',
        email: 'procurement@hypercity-retail.in',
      });
      distId = createdDist.id;
    }
  }

  const payload = {
    id: generateUUID(),
    distributor_id: distId,
    amount: col.amount,
    payment_method: col.payment_method || 'Bank Transfer',
    reference_no: col.reference_no || `REF-${Date.now()}`,
    payment_date: col.payment_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const current = await getRimiCollections();
  const updated = [payload, ...current.filter((c: any) => c.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_payments').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_collections_change');
  return payload;
}

export async function deleteRimiCollection(id: string) {
  const current = await getRimiCollections();
  const updated = current.filter((c: any) => c.id !== id && c.rawId !== id && c.reference_no !== id);
  try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_payments').delete().or(`id.eq.${id},reference_no.eq.${id}`); } catch {}
  triggerLocalSync('ferex_rimi_collections_change');
  return true;
}

export async function getRimiPayments() {
  return getRimiCollections();
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
  contact_role: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
  const payload = {
    id: generateUUID(),
    conversation_id: `rimi_${msg.conversation_id}`,
    contact_name: msg.contact_name,
    contact_role: msg.contact_role,
    sender_name: msg.sender_name,
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString(),
  };

  const { data } = await supabase.from('trade_messages').insert(payload).select();
  triggerLocalSync('ferex_rimi_messages_change');
  return data?.[0] || payload;
}

export async function getRimiNotifications() {
  try {
    const { data, error } = await supabase
      .from('trade_notifications')
      .select('*')
      .ilike('category', '%Cold Chain%')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      const { data: allNotifs } = await supabase.from('trade_notifications').select('*').limit(10);
      return allNotifs ?? [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiNotification(notif: {
  title: string;
  description: string;
  category?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: notif.title,
    description: notif.description,
    category: notif.category || 'Cold Chain',
    is_read: false,
    is_archived: false,
    created_at: new Date().toISOString(),
  };

  const { data } = await supabase.from('trade_notifications').insert(payload).select();
  triggerLocalSync('ferex_rimi_notifications_change');
  return data?.[0] || payload;
}

export async function markRimiNotificationRead(id: string) {
  await supabase.from('trade_notifications').update({ is_read: true }).eq('id', id);
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
      supabase.from('rimi_payments').select('amount'),
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

  // 1. Save to local storage for persistent lookup
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

  // 2. Persist to Supabase users table if available
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
  const seeded = isSeeded('frost_losses');
  const saved = localStorage.getItem('ferex_rimi_frost_losses');
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  if (seeded) return [];
  markSeeded('frost_losses');
  const defaults: RimiFrostLoss[] = [
    {
      id: 'FL-2026-081',
      product_name: 'Norwegian Atlantic Salmon Fillets',
      batch_number: 'LOT-SAL-8821',
      warehouse_location: 'Mumbai Central Deep Freeze (Bay 4)',
      quantity_lost_kg: 18.5,
      loss_reason: 'Freezer Burn',
      estimated_loss_value: 23125,
      recorded_by: 'Warehouse Supervisor Rajesh',
      recorded_at: '2026-09-02T10:30:00Z',
      status: 'Approved Write-off',
    },
    {
      id: 'FL-2026-082',
      product_name: 'Gourmet Chicken Breast Nuggets',
      batch_number: 'LOT-CHK-9102',
      warehouse_location: 'Navi Mumbai Cold Hub (Bay 2)',
      quantity_lost_kg: 12.0,
      loss_reason: 'Packaging Seal Rupture',
      estimated_loss_value: 4200,
      recorded_by: 'QA Officer Priya',
      recorded_at: '2026-09-01T14:15:00Z',
      status: 'Approved Write-off',
    },
  ];
  try { localStorage.setItem('ferex_rimi_frost_losses', JSON.stringify(defaults)); } catch {}
  return defaults;
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
    quantity_lost_kg: Number(loss.quantity_lost_kg) || 1,
    loss_reason: loss.loss_reason || 'Freezer Burn',
    estimated_loss_value: Number(loss.estimated_loss_value) || 1500,
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
  const seeded = isSeeded('stock_adjustments');
  const saved = localStorage.getItem('ferex_rimi_stock_adjustments');
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  if (seeded) return [];
  markSeeded('stock_adjustments');
  const defaults: RimiStockAdjustment[] = [
    {
      id: 'ADJ-101',
      product_name: 'King Tiger Prawns (500g)',
      adjustment_type: 'Inter-Warehouse Transfer',
      quantity: 50,
      unit: 'Packs',
      source_location: 'Mumbai Central Deep Freeze',
      target_location: 'Pune Regional Depot',
      reason: 'Rebalancing stock for weekend hypermarket demand',
      timestamp: '2026-09-03T11:00:00Z',
    },
    {
      id: 'ADJ-102',
      product_name: 'Norwegian Atlantic Salmon',
      adjustment_type: 'Frost Loss Deduction',
      quantity: 18.5,
      unit: 'KG',
      source_location: 'Mumbai Central Deep Freeze (Bay 4)',
      reason: 'Freezer burn write-off #FL-2026-081',
      timestamp: '2026-09-02T10:30:00Z',
    },
  ];
  try { localStorage.setItem('ferex_rimi_stock_adjustments', JSON.stringify(defaults)); } catch {}
  return defaults;
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
    id: `ADJ-${Math.floor(103 + Math.random() * 900)}`,
    product_name: adj.product_name,
    adjustment_type: adj.adjustment_type,
    quantity: Number(adj.quantity) || 1,
    unit: adj.unit || 'KG',
    source_location: adj.source_location || 'Mumbai Central Deep Freeze',
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
  const seeded = isSeeded('delivery_routes');
  const saved = localStorage.getItem('ferex_rimi_delivery_routes');
  if (saved !== null) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  if (seeded) return [];
  markSeeded('delivery_routes');
  const defaults: RimiDeliveryRoute[] = [
    {
      id: 'RT-1',
      route_code: 'MUM-WEST-01',
      route_name: 'Western Suburbs Supermarket Cold Chain',
      vehicle_no: 'MH-12-AZ-8901 (10T Reefer)',
      driver_name: 'Sunil Jadhav',
      driver_phone: '+91 98200 44551',
      start_point: 'Bhiwandi Central Cold Storage',
      end_point: 'Bandra-Andheri Retail Corridor',
      total_stops: 8,
      status: 'Active En Route',
      target_temp: '-18.0°C',
    },
    {
      id: 'RT-2',
      route_code: 'MUM-PUNE-EXP',
      route_name: 'Mumbai-Pune Expressway Bulk Line',
      vehicle_no: 'MH-14-BZ-4412 (15T Reefer)',
      driver_name: 'Ramesh Patil',
      driver_phone: '+91 98200 44552',
      start_point: 'Navi Mumbai Deep Freeze Depot',
      end_point: 'Pune Swargate HORECA Hub',
      total_stops: 4,
      status: 'Scheduled',
      target_temp: '-22.0°C',
    },
  ];
  try { localStorage.setItem('ferex_rimi_delivery_routes', JSON.stringify(defaults)); } catch {}
  return defaults;
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
    driver_phone: route.driver_phone || '+91 98200 11223',
    start_point: route.start_point,
    end_point: route.end_point,
    total_stops: Number(route.total_stops) || 5,
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

