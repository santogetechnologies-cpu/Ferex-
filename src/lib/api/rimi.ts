import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Dual Sync Trigger Helper ────────────────────────────────────────────────
function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
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
