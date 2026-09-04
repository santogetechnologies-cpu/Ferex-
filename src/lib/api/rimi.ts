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

  const { data, error } = await supabase.from('rimi_products').insert(payload).select();
  triggerLocalSync('ferex_rimi_products_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
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
  const { data, error } = await supabase
    .from('rimi_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_rimi_products_change');
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteRimiProduct(id: string) {
  await supabase.from('rimi_products').delete().eq('id', id);
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
    if (error) return [];
    return data ?? [];
  } catch {
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
    territory: dist.territory || dist.city || 'Mumbai Central',
    email: dist.email,
    phone: dist.phone || '+91 98200 11223',
    credit_limit: dist.credit_limit || 100000.00,
    outstanding_balance: dist.outstanding_balance || 0.00,
    status: dist.status || 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_distributors').insert(payload).select();
  triggerLocalSync('ferex_rimi_distributors_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function createRimiCustomer(customer: any) {
  return createRimiDistributor(customer);
}

export async function updateRimiDistributor(id: string, updates: any) {
  const { data, error } = await supabase
    .from('rimi_distributors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_rimi_distributors_change');
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteRimiDistributor(id: string) {
  await supabase.from('rimi_distributors').delete().eq('id', id);
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
    if (error) return [];
    return data ?? [];
  } catch {
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
  const payload = {
    id: generateUUID(),
    product_id: item.product_id,
    batch_number: item.batch_number,
    warehouse_location: item.warehouse_location || 'Cold Storage 1 (Mumbai Hub)',
    quantity_on_hand: item.quantity_on_hand,
    production_date: item.production_date || new Date().toISOString().split('T')[0],
    expiry_date: item.expiry_date,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_inventory').insert(payload).select();
  triggerLocalSync('ferex_rimi_inventory_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiInventoryStock(id: string, quantity_on_hand: number) {
  const { data, error } = await supabase
    .from('rimi_inventory')
    .update({ quantity_on_hand, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_rimi_inventory_change');
  if (error || !data || data.length === 0) return { id, quantity_on_hand };
  return data[0];
}

export async function deleteRimiInventoryItem(id: string) {
  await supabase.from('rimi_inventory').delete().eq('id', id);
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
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
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
  // If distributor_id is missing, find or create default distributor
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

  const { data, error } = await supabase.from('rimi_sales_orders').insert(payload).select();
  triggerLocalSync('ferex_rimi_sales_orders_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiOrderStatus(id: string, order_status: string) {
  const { data, error } = await supabase
    .from('rimi_sales_orders')
    .update({ order_status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_rimi_sales_orders_change');
  if (error || !data || data.length === 0) return { id, order_status };
  return data[0];
}

export async function deleteRimiSalesOrder(id: string) {
  await supabase.from('rimi_sales_orders').delete().eq('id', id);
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return true;
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

  const { data, error } = await supabase.from('rimi_warehouses').insert(payload).select();
  triggerLocalSync('ferex_rimi_warehouses_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function deleteRimiWarehouse(id: string) {
  await supabase.from('rimi_warehouses').delete().eq('id', id);
  triggerLocalSync('ferex_rimi_warehouses_change');
  return true;
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

  const { data, error } = await supabase.from('rimi_vehicles').insert(payload).select();
  triggerLocalSync('ferex_rimi_vehicles_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiVehicleStatus(id: string, status: string, temp?: number) {
  const updates: any = { status };
  if (temp !== undefined) updates.current_temp_celsius = temp;
  const { data, error } = await supabase.from('rimi_vehicles').update(updates).eq('id', id).select();
  triggerLocalSync('ferex_rimi_vehicles_change');
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

export async function deleteRimiVehicle(id: string) {
  await supabase.from('rimi_vehicles').delete().eq('id', id);
  triggerLocalSync('ferex_rimi_vehicles_change');
  return true;
}

// ─── Rimi Batches & Expiry ──────────────────────────────────────────────────
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

  const { data, error } = await supabase.from('rimi_batches').insert(payload).select();
  triggerLocalSync('ferex_rimi_batches_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiBatchStatus(id: string, status: string) {
  const { data, error } = await supabase.from('rimi_batches').update({ status }).eq('id', id).select();
  triggerLocalSync('ferex_rimi_batches_change');
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

export async function deleteRimiBatch(id: string) {
  await supabase.from('rimi_batches').delete().eq('id', id);
  triggerLocalSync('ferex_rimi_batches_change');
  return true;
}

// ─── Rimi Deliveries ────────────────────────────────────────────────────────
export async function getRimiDeliveries() {
  try {
    const { data, error } = await supabase
      .from('rimi_deliveries')
      .select('*, order:rimi_sales_orders(*)')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
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
    vehicle_no: delivery.vehicle_no,
    driver_name: delivery.driver_name,
    driver_phone: delivery.driver_phone || '+91 98765 43210',
    departure_temp: delivery.departure_temp || '-18.5°C',
    delivery_status: delivery.delivery_status || 'Assigned',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('rimi_deliveries').insert(payload).select();
  triggerLocalSync('ferex_rimi_deliveries_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateRimiDeliveryStatus(id: string, delivery_status: string) {
  const { data, error } = await supabase
    .from('rimi_deliveries')
    .update({ delivery_status, delivered_at: delivery_status === 'Delivered' ? new Date().toISOString() : null })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_rimi_deliveries_change');
  if (error || !data || data.length === 0) return { id, delivery_status };
  return data[0];
}

export async function deleteRimiDelivery(id: string) {
  await supabase.from('rimi_deliveries').delete().eq('id', id);
  triggerLocalSync('ferex_rimi_deliveries_change');
  return true;
}

// ─── Rimi Collections & Payments ────────────────────────────────────────────
export async function getRimiCollections() {
  try {
    const { data, error } = await supabase
      .from('rimi_payments')
      .select('*, distributor:rimi_distributors(*)')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
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

  const { data, error } = await supabase.from('rimi_payments').insert(payload).select();
  triggerLocalSync('ferex_rimi_collections_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function deleteRimiCollection(id: string) {
  await supabase.from('rimi_payments').delete().eq('id', id);
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

