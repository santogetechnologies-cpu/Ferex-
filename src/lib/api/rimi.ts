import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Rimi Products & Inventory ──────────────────────────────────────────────
export async function getRimiProducts() {
  try {
    const { data, error } = await supabase
      .from('rimi_products')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.warn('[getRimiProducts Notice]:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiProduct(product: {
  sku: string;
  name: string;
  category: string;
  unit_price: number;
  current_stock_units?: number;
  storage_temp_celsius?: number;
}) {
  const payload = {
    id: generateUUID(),
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit_price: product.unit_price,
    current_stock_units: product.current_stock_units || 100,
    storage_temp_celsius: product.storage_temp_celsius || -18.0,
    reorder_level: 50,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_products').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Rimi Sales Orders ──────────────────────────────────────────────────────
export async function getRimiSalesOrders() {
  try {
    const { data, error } = await supabase
      .from('rimi_sales_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiSalesOrder(order: {
  customer_name: string;
  items_summary: string;
  total_amount: number;
  assigned_reefer_truck?: string;
  delivery_due_date?: string;
}) {
  const payload = {
    id: generateUUID(),
    order_no: `SO-2026-${Math.floor(100 + Math.random() * 900)}`,
    customer_name: order.customer_name,
    items_summary: order.items_summary,
    total_amount: order.total_amount,
    status: 'In Packing',
    assigned_reefer_truck: order.assigned_reefer_truck || 'Reefer Truck #MH-12-AZ-8901',
    order_date: new Date().toISOString().split('T')[0],
    delivery_due_date: order.delivery_due_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_sales_orders').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiOrderStatus(id: string, status: string) {
  const { data, error } = await supabase.from('rimi_sales_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

// ─── Rimi Customers ─────────────────────────────────────────────────────────
export async function getRimiCustomers() {
  try {
    const { data, error } = await supabase
      .from('rimi_customers')
      .select('*')
      .order('business_name', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiCustomer(customer: {
  business_name: string;
  customer_type: string;
  contact_person: string;
  email: string;
  phone?: string;
  city: string;
  delivery_address?: string;
  credit_limit?: number;
}) {
  const payload = {
    id: generateUUID(),
    customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
    business_name: customer.business_name,
    customer_type: customer.customer_type,
    contact_person: customer.contact_person,
    email: customer.email,
    phone: customer.phone || '',
    city: customer.city,
    delivery_address: customer.delivery_address || `${customer.city} Commercial Hub`,
    credit_limit: customer.credit_limit || 500000,
    outstanding_balance: 0,
    status: 'Active',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_customers').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Rimi Reefer Vehicles & Logistics ───────────────────────────────────────
export async function getRimiVehicles() {
  try {
    const { data, error } = await supabase
      .from('rimi_vehicles')
      .select('*')
      .order('vehicle_number', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiVehicle(v: {
  vehicle_number: string;
  driver_name: string;
  driver_phone?: string;
  capacity_tonnes?: number;
  current_temp_celsius?: number;
}) {
  const payload = {
    id: generateUUID(),
    vehicle_number: v.vehicle_number,
    driver_name: v.driver_name,
    driver_phone: v.driver_phone || '+91 98765 43210',
    capacity_tonnes: v.capacity_tonnes || 10,
    current_temp_celsius: v.current_temp_celsius || -20.0,
    status: 'Stationed',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_vehicles').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Rimi Dashboard Stats ───────────────────────────────────────────────────
export async function getRimiDashboardStats() {
  try {
    const [productsRes, ordersRes, vehiclesRes, collectionsRes] = await Promise.all([
      supabase.from('rimi_products').select('current_stock_units, unit_price'),
      supabase.from('rimi_sales_orders').select('total_amount, status'),
      supabase.from('rimi_vehicles').select('*', { count: 'exact', head: true }).eq('status', 'On Route'),
      supabase.from('rimi_collections').select('amount, status'),
    ]);

    const activeOrders = (ordersRes.data ?? []).filter((o: any) => o.status !== 'Delivered & Paid' && o.status !== 'Cancelled');
    const todayCollections = (collectionsRes.data ?? []).filter((c: any) => c.status === 'Cleared').reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
    const activeFleet = vehiclesRes.count ?? 0;
    const inventoryValuation = (productsRes.data ?? []).reduce((sum: number, p: any) => sum + ((Number(p.current_stock_units) || 0) * (Number(p.unit_price) || 0)), 0);

    return {
      activeOrdersCount: activeOrders.length,
      todayCollectionsAmount: todayCollections,
      activeFleetCount: activeFleet,
      inventoryValuationInr: inventoryValuation,
    };
  } catch {
    return {
      activeOrdersCount: 0,
      todayCollectionsAmount: 0,
      activeFleetCount: 0,
      inventoryValuationInr: 0,
    };
  }
}

// ─── Rimi Warehouses ────────────────────────────────────────────────────────
export async function getRimiWarehouses() {
  try {
    const { data, error } = await supabase
      .from('rimi_warehouses')
      .select('*')
      .order('name', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiWarehouse(wh: {
  code: string;
  name: string;
  city: string;
  address: string;
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
    address: wh.address,
    cold_room_temp_celsius: wh.cold_room_temp_celsius ?? -22.0,
    total_capacity_pallets: wh.total_capacity_pallets ?? 1000,
    utilized_pallets: wh.utilized_pallets ?? 0,
    manager_name: wh.manager_name || 'Hub Lead',
    manager_phone: wh.manager_phone || '',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_warehouses').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Rimi Batches ───────────────────────────────────────────────────────────
export async function getRimiBatches() {
  try {
    const { data, error } = await supabase
      .from('rimi_batches')
      .select('*')
      .order('expiry_date', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiBatch(batch: {
  batch_number: string;
  product_id?: string;
  product_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  quantity_units: number;
  production_date: string;
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
    warehouse_name: batch.warehouse_name || 'Central Cold Hub',
    quantity_units: batch.quantity_units,
    production_date: batch.production_date,
    expiry_date: batch.expiry_date,
    quality_grade: batch.quality_grade || 'Grade A Export',
    status: batch.status || 'Active',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_batches').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiBatchStatus(id: string, status: string) {
  const { data, error } = await supabase.from('rimi_batches').update({ status }).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

// ─── Rimi Deliveries ─────────────────────────────────────────────────────────
export async function getRimiDeliveries() {
  try {
    const { data, error } = await supabase
      .from('rimi_deliveries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiDelivery(delivery: {
  order_id?: string;
  order_no?: string;
  customer_name: string;
  vehicle_id?: string;
  vehicle_number?: string;
  driver_name?: string;
  destination_city?: string;
  delivery_address?: string;
  scheduled_time?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    delivery_number: `DEL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    order_id: delivery.order_id || null,
    order_no: delivery.order_no || `SO-2026-${Math.floor(100 + Math.random() * 900)}`,
    customer_name: delivery.customer_name,
    vehicle_id: delivery.vehicle_id || null,
    vehicle_number: delivery.vehicle_number || 'Reefer MH-12-AZ-8901 (-20°C)',
    driver_name: delivery.driver_name || 'Sanjay Kumar',
    destination_city: delivery.destination_city || 'Mumbai',
    delivery_address: delivery.delivery_address || 'Central Cold Hub',
    status: delivery.status || 'In Transit',
    scheduled_time: delivery.scheduled_time || new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_deliveries').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiDeliveryStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('rimi_deliveries')
    .update({ status, completed_at: status === 'Delivered' ? new Date().toISOString() : null })
    .eq('id', id)
    .select();
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

// ─── Rimi Collections ────────────────────────────────────────────────────────
export async function getRimiCollections() {
  try {
    const { data, error } = await supabase
      .from('rimi_collections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createRimiCollection(col: {
  customer_name: string;
  invoice_number?: string;
  amount_collected: number;
  payment_mode?: string;
  reference_no?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    collection_number: `COL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    customer_name: col.customer_name,
    invoice_number: col.invoice_number || `INV-RIMI-${Math.floor(1000 + Math.random() * 9000)}`,
    amount_collected: col.amount_collected,
    payment_mode: col.payment_mode || 'Bank Wire / RTGS',
    reference_no: col.reference_no || `REF-${Date.now()}`,
    status: col.status || 'Cleared',
    collected_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_collections').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}
