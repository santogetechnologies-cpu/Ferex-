import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';
import {
  sendRimiCustomerWelcomeEmail,
  sendRimiSalesOrderEmail,
  sendRimiDeliveryDispatchedEmail,
  sendRimiPaymentCollectionEmail
} from './email';

export const getRimiStaffMembers = () => getDivisionStaff('rimi');
export const getRimiStaffMembersSync = () => getDivisionStaffSync('rimi');

// Cross-tab real-time communication channel for instant data sync between Admin & Warehouse sessions
const rimiBroadcastChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('ferex_rimi_sync_channel')
  : null;

if (typeof window !== 'undefined') {
  if (rimiBroadcastChannel) {
    rimiBroadcastChannel.onmessage = (event) => {
      try {
        if (event?.data?.type && typeof event.data.type === 'string') {
          window.dispatchEvent(new Event(event.data.type));
        }
      } catch {}
    };
  }

}

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event(eventName));
    } catch {}
    try {
      rimiBroadcastChannel?.postMessage({ type: eventName, timestamp: Date.now() });
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface RimiCustomerRecord {
  id: string;
  business_name: string;
  customer_type: 'Distributor' | 'Shop / Retailer' | 'Wholesaler' | 'HORECA Partner';
  contact_person: string;
  phone: string;
  whatsapp?: string;
  email: string;
  gst_no?: string;
  address?: string;
  city: string;
  district?: string;
  state: string;
  pincode?: string;
  territory: string;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assigned_staff_email?: string;
  credit_period_days: number;
  credit_limit: number;
  outstanding_amount: number;
  outstanding_balance?: number;
  payment_status: 'Current' | 'Overdue' | 'Advance' | 'Blocked';
  preferred_products: string[];
  pipeline_stage: 'Lead' | 'Contacted' | 'Sample Sent' | 'Negotiation' | 'Active Account' | 'Suspended';
  status: 'Active' | 'On Hold' | 'Inactive';
  tags: string[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RimiCustomerActivityRecord {
  id: string;
  customer_id: string;
  activity_type: 'Note' | 'Call Log' | 'Visit Log' | 'Complaint' | 'Stage Change' | 'Order Placed' | 'Payment Received' | 'Sample Sent' | 'Status Update';
  title: string;
  description?: string;
  performed_by: string;
  performed_by_email?: string;
  metadata?: any;
  attachment_url?: string;
  created_at: string;
}

export interface RimiProductRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
  storage_temp: string;
  min_stock_alert: number;
  image_url?: string;
  description?: string;
  is_active: boolean;
  total_stock?: number;
  available_stock?: number;
  created_at: string;
  updated_at: string;
}

export interface RimiInventoryBatchRecord {
  id: string;
  batch_no: string;
  product_id: string;
  product_name: string;
  product_category: string;
  mfg_date: string;
  expiry_date: string;
  quantity: number;
  initial_quantity: number;
  unit: string;
  warehouse_id?: string;
  warehouse_name: string;
  storage_temp: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Low Stock' | 'Depleted' | 'Quarantined';
  certificate_url?: string;
  notes?: string;
  days_to_expiry?: number;
  created_at: string;
  updated_at: string;
}

export interface RimiStockMovementRecord {
  id: string;
  batch_id: string;
  product_id: string;
  movement_type: 'Initial Stock' | 'Dispatch' | 'Transfer' | 'Adjustment' | 'Damage / Waste' | 'Return' | 'Restock';
  quantity_change: number;
  resulting_quantity: number;
  order_id?: string;
  reference_no?: string;
  warehouse_id?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export interface RimiOrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  batch_id?: string;
  batch_no?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface RimiSalesOrderRecord {
  id: string;
  order_no: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: 'Received' | 'Confirmed' | 'Cold Storage Picking' | 'Dispatched' | 'Delivered' | 'Cancelled';
  payment_status: 'Unpaid' | 'Partially Paid' | 'Partial' | 'Paid' | 'Overdue';
  delivery_date?: string;
  delivery_address?: string;
  territory?: string;
  notes?: string;
  challan_url?: string;
  invoice_url?: string;
  items?: RimiOrderItemRecord[];
  created_at: string;
  updated_at: string;
}

export interface RimiPaymentRecord {
  id: string;
  payment_no: string;
  customer_id: string;
  customer_name: string;
  order_id?: string;
  order_no?: string;
  amount: number;
  payment_method: string;
  reference_no?: string;
  payment_date: string;
  collected_by_name?: string;
  collected_by_email?: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
}

export interface RimiWarehouseRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  cold_room_temp_celsius: number;
  total_capacity_pallets: number;
  utilized_pallets: number;
  manager_name: string;
  manager_phone?: string;
  /** Derived from stored batches: products and batches currently held at this hub. */
  product_count?: number;
  batch_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RimiVehicleRecord {
  id: string;
  vehicle_no?: string;
  vehicle_number?: string;
  model?: string;
  capacity_metric_tons?: number;
  capacity_tonnes?: number;
  min_temp_celsius?: number;
  current_temp_celsius: number;
  driver_name: string;
  driver_phone?: string;
  gps_tracking_id?: string;
  status: 'Available' | 'On Route' | 'Maintenance' | 'Inactive' | 'Stationed';
  created_at: string;
  updated_at: string;
}

export interface RimiDeliveryRouteRecord {
  id: string;
  route_code: string;
  route_name: string;
  region: string;
  origin_facility: string;
  destinations: string[];
  distance_km: number;
  estimated_transit_hours: number;
  assigned_vehicle?: string;
  status?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RimiDeliveryRecord {
  id: string;
  delivery_no: string;
  order_id: string;
  order_no: string;
  customer_name: string;
  destination_city: string;
  destination_address?: string;
  vehicle_id?: string;
  vehicle_no: string;
  driver_name: string;
  driver_phone?: string;
  departure_temp?: string;
  arrival_temp?: string;
  delivery_status: 'Assigned' | 'Loading' | 'In Transit' | 'Delivered' | 'Returned' | 'Failed';
  dispatch_time?: string;
  delivered_at?: string;
  route_name?: string;
  challan_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RimiTaskRecord {
  id: string;
  title: string;
  description?: string;
  category?: string;
  task_type?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Incomplete' | 'Cancelled';
  start_at?: string;
  due_at?: string;
  /** Derived: On Time / Delayed (completed) or Overdue / On Track (open). */
  timeliness?: 'On Time' | 'Delayed' | 'Overdue' | 'On Track' | 'No Deadline';
  assigned_staff_name?: string;
  assigned_staff_email?: string;
  assigned_staff_id?: string;
  assigned_to_name?: string;
  assigned_to_id?: string;
  assigned_to_role?: string;
  assigned_by?: string;
  customer_id?: string;
  customer_name?: string;
  order_id?: string;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  is_central_directive?: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data access
//
// Everything below reads from and writes to the database only. There is no browser-side copy of business data, so
// Admin and Warehouse always see the same records. Writes throw the real database error so screens can show it.
// Money and stock operations (orders, payments, stock) run as single database functions (see the
// 20261113110000_rimi_atomic_operations migration) so they either fully happen or not at all.
// ─────────────────────────────────────────────────────────────────────────────

function fail(error: { message?: string } | null | undefined, fallback = 'Request failed'): never {
  throw new Error(error?.message || fallback);
}

function assertOk<T>(res: { data: T; error: any }, fallback?: string): T {
  if (res.error) fail(res.error, fallback);
  return res.data;
}

const isUuid = (id?: string | null): id is string =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch {
    return null;
  }
}

const num = (v: unknown) => Number(v) || 0;

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRM CUSTOMERS & PIPELINE API
// ─────────────────────────────────────────────────────────────────────────────

/** Outstanding receivables per customer, derived from their live (non-cancelled) orders. */
async function getOutstandingByCustomer(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('rimi_sales_orders')
    .select('customer_id, balance_amount, order_status')
    .neq('order_status', 'Cancelled');
  const map = new Map<string, number>();
  if (error || !Array.isArray(data)) return map;
  for (const o of data as any[]) {
    if (!o.customer_id) continue;
    map.set(o.customer_id, (map.get(o.customer_id) || 0) + num(o.balance_amount));
  }
  return map;
}

export async function getRimiCustomers(filters?: {
  staffEmail?: string;
  customerType?: string;
  territory?: string;
  stage?: string;
  search?: string;
}): Promise<RimiCustomerRecord[]> {
  let query = supabase.from('rimi_customers').select('*').order('created_at', { ascending: false });
  if (filters?.customerType && filters.customerType !== 'All') query = query.eq('customer_type', filters.customerType);
  if (filters?.territory && filters.territory !== 'All') query = query.eq('territory', filters.territory);
  if (filters?.stage && filters.stage !== 'All') query = query.eq('pipeline_stage', filters.stage);
  if (filters?.staffEmail) query = query.ilike('assigned_staff_email', filters.staffEmail);

  const [rows, outstanding] = await Promise.all([query, getOutstandingByCustomer()]);
  let result = (assertOk(rows) || []).map((c: any) => {
    const owed = outstanding.get(c.id) || 0;
    return { ...c, outstanding_amount: owed, outstanding_balance: owed } as RimiCustomerRecord;
  });

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(c =>
      (c.business_name || '').toLowerCase().includes(s) ||
      (c.contact_person || '').toLowerCase().includes(s) ||
      (c.city || '').toLowerCase().includes(s) ||
      (c.phone || '').includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
  }
  return result;
}

export async function getRimiCustomerById(id: string): Promise<RimiCustomerRecord | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from('rimi_customers').select('*').eq('id', id).maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const outstanding = await getOutstandingByCustomer();
  const owed = outstanding.get(id) || 0;
  return { ...(data as any), outstanding_amount: owed, outstanding_balance: owed } as RimiCustomerRecord;
}

export async function createRimiCustomer(customer: Partial<RimiCustomerRecord>): Promise<RimiCustomerRecord> {
  if (!customer.business_name?.trim()) throw new Error('Business name is required');
  if (!customer.phone?.trim()) throw new Error('Phone number is required');
  const payload = {
    business_name: customer.business_name.trim(),
    customer_type: customer.customer_type || 'Shop / Retailer',
    contact_person: customer.contact_person?.trim() || customer.business_name.trim(),
    phone: customer.phone.trim(),
    whatsapp: customer.whatsapp?.trim() || customer.phone.trim(),
    email: customer.email?.trim() || '',
    gst_no: customer.gst_no?.trim() || '',
    address: customer.address?.trim() || '',
    city: customer.city?.trim() || '',
    district: customer.district?.trim() || '',
    state: customer.state?.trim() || '',
    pincode: customer.pincode?.trim() || '',
    territory: customer.territory || '',
    assigned_staff_id: isUuid(customer.assigned_staff_id) ? customer.assigned_staff_id : null,
    assigned_staff_name: customer.assigned_staff_name || '',
    assigned_staff_email: customer.assigned_staff_email || '',
    credit_period_days: Number(customer.credit_period_days) || 30,
    credit_limit: Number(customer.credit_limit) || 0,
    outstanding_amount: 0,
    payment_status: customer.payment_status || 'Current',
    preferred_products: customer.preferred_products || [],
    pipeline_stage: customer.pipeline_stage || 'Lead',
    status: customer.status || 'Active',
    tags: customer.tags || [],
    notes: customer.notes || '',
    created_by: customer.created_by || '',
  };
  const created = assertOk(await supabase.from('rimi_customers').insert(payload).select().single(), 'Could not save the customer') as any;

  await addRimiCustomerActivity({
    customer_id: created.id,
    activity_type: 'Note',
    title: `Customer Account Created (${created.customer_type})`,
    description: `Initial onboarding stage set to "${created.pipeline_stage}". Credit limit: ₹${num(created.credit_limit).toLocaleString('en-IN')}`,
    performed_by: customer.created_by || 'Staff',
    performed_by_email: customer.assigned_staff_email || ''
  }).catch(() => {});

  triggerLocalSync('ferex_rimi_customers_change');
  if (created.email) {
    sendRimiCustomerWelcomeEmail({
      customerEmail: created.email,
      customerName: created.contact_person || created.business_name,
      businessName: created.business_name,
      accountType: created.customer_type,
    }).catch(() => {});
  }
  return created as RimiCustomerRecord;
}

export async function updateRimiCustomer(id: string, updates: Partial<RimiCustomerRecord>): Promise<RimiCustomerRecord> {
  const { id: _id, created_at: _created, outstanding_amount: _oa, outstanding_balance: _ob, ...clean } = updates as any;
  const data = assertOk(
    await supabase.from('rimi_customers').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the customer'
  );
  if (!data) throw new Error('This customer no longer exists. Refresh the page.');
  triggerLocalSync('ferex_rimi_customers_change');
  return data as RimiCustomerRecord;
}

export async function updateRimiCustomerStage(
  id: string,
  newStage: RimiCustomerRecord['pipeline_stage'],
  performedBy = 'Staff',
  notes = ''
): Promise<RimiCustomerRecord> {
  const current = await getRimiCustomerById(id);
  const oldStage = current?.pipeline_stage || 'Lead';
  const updated = await updateRimiCustomer(id, { pipeline_stage: newStage });
  await addRimiCustomerActivity({
    customer_id: id,
    activity_type: 'Stage Change',
    title: `Pipeline Stage Advanced: ${oldStage} → ${newStage}`,
    description: notes || `Customer moved to ${newStage} pipeline stage.`,
    performed_by: performedBy
  }).catch(() => {});
  return updated;
}

export async function deleteRimiCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_customers').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the customer');
  triggerLocalSync('ferex_rimi_customers_change');
  triggerLocalSync('ferex_rimi_orders_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOMER ACTIVITY TIMELINE API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiCustomerActivities(customerId: string): Promise<RimiCustomerActivityRecord[]> {
  const data = assertOk(
    await supabase.from('rimi_customer_activity').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
  );
  return (data || []) as RimiCustomerActivityRecord[];
}

export async function addRimiCustomerActivity(activity: {
  customer_id: string;
  activity_type: RimiCustomerActivityRecord['activity_type'];
  title: string;
  description?: string;
  performed_by?: string;
  performed_by_email?: string;
  metadata?: any;
  attachment_url?: string;
}): Promise<RimiCustomerActivityRecord> {
  const data = assertOk(
    await supabase.from('rimi_customer_activity').insert({
      customer_id: activity.customer_id,
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description || '',
      performed_by: activity.performed_by || 'Staff',
      performed_by_email: activity.performed_by_email || '',
      metadata: activity.metadata || {},
      attachment_url: activity.attachment_url || '',
    }).select().single(),
    'Could not log the activity'
  );
  triggerLocalSync('ferex_rimi_activity_change');
  return data as RimiCustomerActivityRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRODUCTS CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiProducts(): Promise<RimiProductRecord[]> {
  const [prodRes, batchRes] = await Promise.all([
    supabase.from('rimi_products').select('*').order('name', { ascending: true }),
    supabase.from('rimi_inventory_batches').select('product_id, quantity, expiry_date'),
  ]);
  const prods = (assertOk(prodRes) || []) as RimiProductRecord[];
  const stock = new Map<string, number>();
  const today = new Date().toISOString().slice(0, 10);
  for (const b of (batchRes.data || []) as any[]) {
    // Expired stock is not sellable, so it does not count as available.
    if (b.expiry_date && b.expiry_date <= today) continue;
    stock.set(b.product_id, (stock.get(b.product_id) || 0) + num(b.quantity));
  }
  return prods.map(p => ({ ...p, total_stock: stock.get(p.id) || 0, available_stock: stock.get(p.id) || 0 }));
}

export async function createRimiProduct(product: Partial<RimiProductRecord> & {
  quantity?: number;
  opening_stock?: number;
  warehouse_id?: string;
  warehouse_name?: string;
  batch_id?: string;
  batch_no?: string;
  mfg_date?: string;
  expiry_date?: string;
}): Promise<RimiProductRecord> {
  if (!product.name?.trim()) throw new Error('Product name is required');
  const price = Number(product.unit_price);
  if (!(price >= 0) || Number.isNaN(price)) throw new Error('Enter a valid wholesale price');
  const openingQty = Number(product.quantity !== undefined ? product.quantity : (product.opening_stock || 0));
  if (openingQty > 0 && !product.batch_id && !product.expiry_date) {
    throw new Error('Enter the batch expiry date for the opening stock');
  }
  if (openingQty > 0 && !product.batch_id && !isUuid(product.warehouse_id)) {
    throw new Error('Choose the cold storage hub where the opening stock is kept');
  }

  const created = assertOk(
    await supabase.from('rimi_products').insert({
      sku: product.sku?.trim() || `SKU-RF-${Date.now().toString().slice(-6)}`,
      name: product.name.trim(),
      category: product.category || 'Frozen Seafood',
      unit: product.unit || 'KG',
      unit_price: price,
      storage_temp: product.storage_temp || '-18°C',
      min_stock_alert: Number(product.min_stock_alert) || 50,
      is_active: product.is_active !== undefined ? product.is_active : true,
    }).select().single(),
    'Could not save the product'
  ) as RimiProductRecord;

  if (openingQty > 0) {
    try {
      await addRimiStock({
        product_id: created.id,
        quantity: openingQty,
        batch_id: product.batch_id,
        batch_no: product.batch_no,
        warehouse_id: product.warehouse_id,
        mfg_date: product.mfg_date,
        expiry_date: product.expiry_date,
        notes: `Opening stock for SKU ${created.sku}`,
      });
    } catch (stockErr) {
      // Do not leave a product without the stock the user typed in.
      await supabase.from('rimi_products').delete().eq('id', created.id);
      throw stockErr;
    }
  }
  triggerLocalSync('ferex_rimi_products_change');
  return created;
}

export async function updateRimiProduct(id: string, updates: Partial<RimiProductRecord>): Promise<RimiProductRecord> {
  const { id: _id, total_stock: _t, available_stock: _a, created_at: _c, ...clean } = updates as any;
  const data = assertOk(
    await supabase.from('rimi_products').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the product'
  );
  if (!data) throw new Error('This product no longer exists. Refresh the page.');
  triggerLocalSync('ferex_rimi_products_change');
  return data as RimiProductRecord;
}

export async function deleteRimiProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_products').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the product');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. UNIFIED INVENTORY BATCHES & EXPIRY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

function withExpiryStatus(b: any): RimiInventoryBatchRecord {
  const diffDays = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
  let status = b.status;
  if (num(b.quantity) <= 0) status = 'Depleted';
  else if (diffDays <= 0) status = 'Expired';
  else if (diffDays <= 30) status = 'Expiring Soon';
  else if (num(b.quantity) <= 20) status = 'Low Stock';
  else status = 'Active';
  return { ...b, quantity: num(b.quantity), initial_quantity: num(b.initial_quantity), status, days_to_expiry: diffDays } as RimiInventoryBatchRecord;
}

export async function getRimiBatches(filters?: {
  warehouseId?: string;
  productId?: string;
  expiryStatus?: string;
}): Promise<RimiInventoryBatchRecord[]> {
  let query = supabase.from('rimi_inventory_batches').select('*').order('expiry_date', { ascending: true });
  if (filters?.warehouseId && filters.warehouseId !== 'All') query = query.eq('warehouse_id', filters.warehouseId);
  if (filters?.productId && filters.productId !== 'All') query = query.eq('product_id', filters.productId);
  const result = (assertOk(await query) || []).map(withExpiryStatus);

  if (filters?.expiryStatus && filters.expiryStatus !== 'All') {
    if (filters.expiryStatus === 'Active') return result.filter(b => b.days_to_expiry! > 30 && b.quantity > 0);
    if (filters.expiryStatus === 'Expiring Soon') return result.filter(b => b.days_to_expiry! > 0 && b.days_to_expiry! <= 30);
    if (filters.expiryStatus === 'Critical') return result.filter(b => b.days_to_expiry! > 0 && b.days_to_expiry! <= 7);
    if (filters.expiryStatus === 'Expired') return result.filter(b => b.days_to_expiry! <= 0);
  }
  return result;
}

/** Adds stock to an existing batch or creates a new batch at a cold storage hub (single database transaction). */
export async function addRimiStock(input: {
  product_id: string;
  quantity: number;
  batch_id?: string;
  batch_no?: string;
  warehouse_id?: string;
  mfg_date?: string;
  expiry_date?: string;
  storage_temp?: string;
  notes?: string;
  performed_by?: string;
}): Promise<RimiInventoryBatchRecord> {
  const data = assertOk(
    await supabase.rpc('rimi_add_stock', {
      p: {
        product_id: input.product_id,
        quantity: input.quantity,
        batch_id: input.batch_id || null,
        batch_no: input.batch_no || null,
        warehouse_id: isUuid(input.warehouse_id) ? input.warehouse_id : null,
        mfg_date: input.mfg_date || null,
        expiry_date: input.expiry_date || null,
        storage_temp: input.storage_temp || null,
        notes: input.notes || '',
        performed_by: input.performed_by || '',
      },
    }),
    'Could not add stock'
  );
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_movements_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  return withExpiryStatus(data);
}

export async function createRimiBatch(batch: {
  product_id: string;
  product_name?: string;
  batch_no?: string;
  mfg_date: string;
  expiry_date: string;
  quantity: number;
  warehouse_id?: string;
  warehouse_name?: string;
  storage_temp?: string;
  certificate_url?: string;
  notes?: string;
}): Promise<RimiInventoryBatchRecord> {
  if (!isUuid(batch.product_id)) throw new Error('Choose a product');
  if (!(Number(batch.quantity) > 0)) throw new Error('Quantity must be greater than zero');
  if (new Date(batch.expiry_date) <= new Date(batch.mfg_date)) throw new Error('Expiry date must be after the manufacturing date');
  const created = await addRimiStock({
    product_id: batch.product_id,
    quantity: Number(batch.quantity),
    batch_no: batch.batch_no,
    warehouse_id: batch.warehouse_id,
    mfg_date: batch.mfg_date,
    expiry_date: batch.expiry_date,
    storage_temp: batch.storage_temp,
    notes: batch.notes,
  });
  if (batch.certificate_url) {
    await supabase.from('rimi_inventory_batches').update({ certificate_url: batch.certificate_url }).eq('id', created.id);
  }
  return created;
}

export async function updateRimiBatch(id: string, updates: Partial<RimiInventoryBatchRecord>): Promise<RimiInventoryBatchRecord> {
  const { id: _id, days_to_expiry: _d, created_at: _c, ...clean } = updates as any;
  const before = assertOk(await supabase.from('rimi_inventory_batches').select('*').eq('id', id).maybeSingle());
  if (!before) throw new Error('This batch no longer exists. Refresh the page.');

  // A hub move keeps the denormalised hub name in step with the hub id.
  if (clean.warehouse_id && clean.warehouse_id !== (before as any).warehouse_id) {
    const wh = assertOk(await supabase.from('rimi_warehouses').select('name').eq('id', clean.warehouse_id).maybeSingle());
    clean.warehouse_name = (wh as any)?.name || clean.warehouse_name;
  }
  if (clean.quantity !== undefined) clean.quantity = Math.max(0, Number(clean.quantity));
  if (clean.status === 'Expiring Soon' || clean.status === 'Low Stock' || clean.status === 'Expired') delete clean.status; // derived

  const data = assertOk(
    await supabase.from('rimi_inventory_batches').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the batch'
  ) as any;

  if (clean.quantity !== undefined && Number(clean.quantity) !== num((before as any).quantity)) {
    await recordRimiStockMovement({
      batch_id: id,
      product_id: data.product_id,
      movement_type: 'Adjustment',
      quantity_change: Number(clean.quantity) - num((before as any).quantity),
      resulting_quantity: Number(clean.quantity),
      reference_no: data.batch_no,
      warehouse_id: data.warehouse_id || undefined,
      notes: 'Stock quantity edited',
    }).catch(() => {});
  }
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  return withExpiryStatus(data);
}

export async function deleteRimiBatch(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_inventory_batches').delete().eq('id', id);
  if (error) fail(error, 'Could not remove the batch');
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_movements_change');
  return true;
}

export async function getRimiStockMovements(batchId?: string, warehouseId?: string): Promise<RimiStockMovementRecord[]> {
  let query = supabase.from('rimi_stock_movements').select('*').order('created_at', { ascending: false }).limit(500);
  if (batchId) query = query.eq('batch_id', batchId);
  if (warehouseId) query = query.eq('warehouse_id', warehouseId);
  return (assertOk(await query) || []) as RimiStockMovementRecord[];
}

export async function recordRimiStockMovement(movement: {
  batch_id: string;
  product_id: string;
  movement_type: RimiStockMovementRecord['movement_type'];
  quantity_change: number;
  resulting_quantity: number;
  order_id?: string;
  reference_no?: string;
  warehouse_id?: string;
  performed_by?: string;
  notes?: string;
}): Promise<RimiStockMovementRecord> {
  const data = assertOk(
    await supabase.from('rimi_stock_movements').insert({
      batch_id: isUuid(movement.batch_id) ? movement.batch_id : null,
      product_id: isUuid(movement.product_id) ? movement.product_id : null,
      movement_type: movement.movement_type,
      quantity_change: movement.quantity_change,
      resulting_quantity: movement.resulting_quantity,
      order_id: isUuid(movement.order_id) ? movement.order_id : null,
      reference_no: movement.reference_no || '',
      warehouse_id: isUuid(movement.warehouse_id) ? movement.warehouse_id : null,
      performed_by: movement.performed_by || 'Admin',
      notes: movement.notes || '',
    }).select().single()
  );
  triggerLocalSync('ferex_rimi_movements_change');
  return data as RimiStockMovementRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SALES ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiSalesOrders(filters?: {
  staffEmail?: string;
  customerId?: string;
  status?: string;
}): Promise<RimiSalesOrderRecord[]> {
  let query = supabase.from('rimi_sales_orders').select('*, items:rimi_order_items(*)').order('created_at', { ascending: false });
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters?.status && filters.status !== 'All') query = query.eq('order_status', filters.status);
  const rows = (assertOk(await query) || []) as any[];
  return rows.map(o => ({
    ...o,
    total_amount: num(o.total_amount),
    paid_amount: num(o.paid_amount),
    balance_amount: num(o.balance_amount),
    items: (o.items || []).map((i: any) => ({ ...i, quantity: num(i.quantity), unit_price: num(i.unit_price), total_price: num(i.total_price) || num(i.quantity) * num(i.unit_price) })),
  })) as RimiSalesOrderRecord[];
}

export async function createRimiSalesOrder(order: {
  customer_id: string;
  customer_name?: string;
  customer_type?: string;
  delivery_date?: string;
  delivery_address?: string;
  territory?: string;
  assigned_staff_name?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    batch_id?: string;
    batch_no?: string;
    quantity: number;
    unit_price: number;
    unit?: string;
  }>;
}): Promise<RimiSalesOrderRecord> {
  if (!isUuid(order.customer_id)) throw new Error('Choose a customer for the order');
  const items = (order.items || []).filter(i => i.product_id);
  if (!items.length) throw new Error('Add at least one product to the order');

  // One database transaction: creates the order and its lines, takes stock from the earliest-expiring batches
  // (or the chosen batch), and logs the stock movements. Fails as a whole if stock is short.
  const created = assertOk(
    await supabase.rpc('rimi_create_sales_order', {
      p: {
        customer_id: order.customer_id,
        delivery_date: order.delivery_date || null,
        delivery_address: order.delivery_address || null,
        territory: order.territory || null,
        assigned_staff_name: order.assigned_staff_name || null,
        notes: order.notes || '',
        items: items.map(i => ({
          product_id: i.product_id,
          batch_id: isUuid(i.batch_id) ? i.batch_id : null,
          quantity: Number(i.quantity),
          unit_price: Number.isFinite(Number(i.unit_price)) ? Number(i.unit_price) : null,
        })),
      },
    }),
    'Could not create the order'
  ) as RimiSalesOrderRecord;

  const customer = await getRimiCustomerById(order.customer_id).catch(() => null);

  await addRimiCustomerActivity({
    customer_id: order.customer_id,
    activity_type: 'Order Placed',
    title: `Sales Order Placed (#${created.order_no})`,
    description: `Total amount: ₹${num(created.total_amount).toLocaleString('en-IN')} with ${items.length} line item(s). Delivery on ${created.delivery_date}.`,
    performed_by: order.assigned_staff_name || 'Sales Staff'
  }).catch(() => {});

  // Delivery job for the dispatch team (non-fatal: the order and stock are already committed).
  try {
    const [vehicles, routes] = await Promise.all([getRimiVehicles().catch(() => []), getRimiDeliveryRoutes().catch(() => [])]);
    const vehicle = vehicles.find(v => v.status === 'Stationed' || v.status === 'Available');
    const city = customer?.city || '';
    const route = routes.find(r => (r.destinations || []).some(d => city && d.toLowerCase().includes(city.toLowerCase())) || (city && r.route_name.toLowerCase().includes(city.toLowerCase()))) || routes[0];
    await createRimiDelivery({
      order_id: created.id,
      order_no: created.order_no,
      customer_name: created.customer_name,
      destination_city: city,
      destination_address: created.delivery_address,
      vehicle_id: vehicle?.id,
      vehicle_no: vehicle?.vehicle_number || vehicle?.vehicle_no,
      driver_name: vehicle?.driver_name,
      driver_phone: vehicle?.driver_phone,
      route_name: route?.route_name,
      departure_temp: vehicle ? `${vehicle.current_temp_celsius}°C` : undefined,
    });
  } catch (delErr) {
    console.warn('[RimiAPI] Order saved, but its delivery job could not be created:', delErr);
  }

  if (customer?.email) {
    sendRimiSalesOrderEmail({
      customerEmail: customer.email,
      customerName: created.customer_name,
      orderNumber: created.order_no,
      status: 'Confirmed',
      totalAmount: num(created.total_amount),
      deliveryDate: created.delivery_date || '',
      itemsSummary: items.map(i => `${i.product_name || 'Product'} (${i.quantity} ${i.unit || 'KG'})`).join(', ')
    }).catch(() => {});
  }

  triggerLocalSync('ferex_rimi_orders_change');
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_deliveries_change');
  const full = await getRimiSalesOrders({ customerId: order.customer_id }).catch(() => []);
  return full.find(o => o.id === created.id) || created;
}

export async function updateRimiSalesOrderStatus(
  orderId: string,
  status: RimiSalesOrderRecord['order_status'],
  _orderNoHint?: string
): Promise<void> {
  assertOk(await supabase.rpc('rimi_set_sales_order_status', { p_order: orderId, p_status: status }), 'Could not update the order');
  triggerLocalSync('ferex_rimi_orders_change');
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_payments_change');
}

export async function deleteRimiSalesOrder(orderId: string, deletePayments = false): Promise<boolean> {
  const { error } = await supabase.rpc('rimi_delete_sales_order', { p_order: orderId, p_with_payments: deletePayments });
  if (error) fail(error, 'Could not delete the order');
  triggerLocalSync('ferex_rimi_orders_change');
  triggerLocalSync('ferex_rimi_payments_change');
  triggerLocalSync('ferex_rimi_batches_change');
  triggerLocalSync('ferex_rimi_products_change');
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_deliveries_change');
  return true;
}

/** Edits non-financial order details (delivery date, address, notes, territory, assigned staff). */
export async function updateRimiSalesOrderDetails(orderId: string, updates: Partial<RimiSalesOrderRecord>): Promise<RimiSalesOrderRecord> {
  const allowed: any = {};
  for (const k of ['delivery_date', 'delivery_address', 'territory', 'notes', 'assigned_staff_name', 'assigned_staff_id', 'challan_url', 'invoice_url'] as const) {
    if ((updates as any)[k] !== undefined) allowed[k] = (updates as any)[k];
  }
  if (updates.order_status) await updateRimiSalesOrderStatus(orderId, updates.order_status);
  if (Object.keys(allowed).length) {
    assertOk(await supabase.from('rimi_sales_orders').update({ ...allowed, updated_at: new Date().toISOString() }).eq('id', orderId), 'Could not update the order');
  }
  triggerLocalSync('ferex_rimi_orders_change');
  const all = await getRimiSalesOrders();
  const found = all.find(o => o.id === orderId);
  if (!found) throw new Error('This order no longer exists. Refresh the page.');
  return found;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PAYMENTS & COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiPayments(filters?: { customerId?: string; orderId?: string }): Promise<RimiPaymentRecord[]> {
  let query = supabase.from('rimi_payments').select('*').order('created_at', { ascending: false });
  if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters?.orderId) query = query.eq('order_id', filters.orderId);
  return ((assertOk(await query) || []) as any[]).map(p => ({ ...p, amount: num(p.amount) })) as RimiPaymentRecord[];
}

export async function createRimiPayment(payment: {
  customer_id: string;
  customer_name?: string;
  order_id?: string;
  order_no?: string;
  amount: number;
  payment_method: string;
  reference_no?: string;
  payment_date?: string;
  notes?: string;
  receipt_url?: string;
  collected_by_name?: string;
  collected_by_email?: string;
}): Promise<RimiPaymentRecord> {
  if (!isUuid(payment.customer_id)) throw new Error('Choose a customer');
  const saved = assertOk(
    await supabase.rpc('rimi_record_payment', {
      p: {
        customer_id: payment.customer_id,
        order_id: isUuid(payment.order_id) ? payment.order_id : null,
        amount: Number(payment.amount),
        payment_method: payment.payment_method,
        reference_no: payment.reference_no || '',
        payment_date: payment.payment_date || null,
        notes: payment.notes || '',
        receipt_url: payment.receipt_url || '',
        collected_by_name: payment.collected_by_name || '',
        collected_by_email: payment.collected_by_email || '',
      },
    }),
    'Could not record the payment'
  ) as RimiPaymentRecord;

  await addRimiCustomerActivity({
    customer_id: payment.customer_id,
    activity_type: 'Payment Received',
    title: `Payment Received (₹${Number(payment.amount).toLocaleString('en-IN')})`,
    description: `Method: ${saved.payment_method} | Ref: ${saved.reference_no || '-'} | Order: ${saved.order_no || 'Direct Ledger Credit'}`,
    performed_by: saved.collected_by_name || 'Finance Team'
  }).catch(() => {});

  const customer = await getRimiCustomerById(payment.customer_id).catch(() => null);
  if (customer?.email) {
    sendRimiPaymentCollectionEmail({
      customerEmail: customer.email,
      customerName: saved.customer_name,
      collectionNumber: saved.payment_no,
      amount: num(saved.amount),
      paymentMethod: saved.payment_method,
      invoiceNumber: saved.order_no
    }).catch(() => {});
  }
  triggerLocalSync('ferex_rimi_payments_change');
  triggerLocalSync('ferex_rimi_orders_change');
  triggerLocalSync('ferex_rimi_customers_change');
  return saved;
}

/** Edits the descriptive fields of a payment. The amount and order are fixed once recorded (delete and re-record to change them). */
export async function updateRimiPayment(id: string, updates: Partial<RimiPaymentRecord>): Promise<RimiPaymentRecord> {
  const allowed: any = {};
  for (const k of ['payment_method', 'reference_no', 'payment_date', 'notes', 'receipt_url', 'collected_by_name'] as const) {
    if ((updates as any)[k] !== undefined) allowed[k] = (updates as any)[k];
  }
  if (updates.amount !== undefined) {
    const current = assertOk(await supabase.from('rimi_payments').select('amount').eq('id', id).maybeSingle()) as any;
    if (current && num(current.amount) !== Number(updates.amount)) {
      throw new Error('The amount of a recorded payment cannot be changed. Delete this payment and record it again.');
    }
  }
  const data = assertOk(await supabase.from('rimi_payments').update(allowed).eq('id', id).select().maybeSingle(), 'Could not update the payment');
  if (!data) throw new Error('This payment no longer exists. Refresh the page.');
  triggerLocalSync('ferex_rimi_payments_change');
  return data as RimiPaymentRecord;
}

export async function deleteRimiPayment(paymentId: string): Promise<boolean> {
  const { error } = await supabase.rpc('rimi_delete_payment', { p_payment: paymentId });
  if (error) fail(error, 'Could not delete the payment');
  triggerLocalSync('ferex_rimi_payments_change');
  triggerLocalSync('ferex_rimi_orders_change');
  triggerLocalSync('ferex_rimi_customers_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DELIVERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiDeliveries(): Promise<RimiDeliveryRecord[]> {
  return (assertOk(await supabase.from('rimi_deliveries').select('*').order('created_at', { ascending: false })) || []) as RimiDeliveryRecord[];
}

export async function createRimiDelivery(delivery: Partial<RimiDeliveryRecord>): Promise<RimiDeliveryRecord> {
  if (!isUuid(delivery.order_id)) throw new Error('A delivery must belong to a sales order');
  const deliveryNo = `DEL-${Date.now().toString().slice(-7)}`;
  const data = assertOk(
    await supabase.from('rimi_deliveries').insert({
      delivery_no: deliveryNo,
      order_id: delivery.order_id,
      order_no: delivery.order_no || '',
      customer_name: delivery.customer_name || '',
      destination_city: delivery.destination_city || '',
      destination_address: delivery.destination_address || '',
      vehicle_id: isUuid(delivery.vehicle_id) ? delivery.vehicle_id : null,
      vehicle_no: delivery.vehicle_no || null,
      driver_name: delivery.driver_name || null,
      driver_phone: delivery.driver_phone || null,
      departure_temp: delivery.departure_temp || null,
      delivery_status: 'Assigned',
      dispatch_time: new Date().toISOString(),
      route_name: delivery.route_name || null,
      notes: delivery.notes || '',
    }).select().single(),
    'Could not create the delivery'
  );
  triggerLocalSync('ferex_rimi_deliveries_change');
  return data as RimiDeliveryRecord;
}

export async function updateRimiDeliveryStatus(deliveryId: string, status: RimiDeliveryRecord['delivery_status']): Promise<void> {
  const updates: any = { delivery_status: status, updated_at: new Date().toISOString() };
  if (status === 'Delivered') updates.delivered_at = new Date().toISOString();
  const del = assertOk(await supabase.from('rimi_deliveries').update(updates).eq('id', deliveryId).select().maybeSingle(), 'Could not update the delivery') as any;
  if (!del) throw new Error('This delivery no longer exists. Refresh the page.');

  // Keep the order in step with its delivery.
  if (del.order_id && (status === 'In Transit' || status === 'Delivered')) {
    await updateRimiSalesOrderStatus(del.order_id, status === 'Delivered' ? 'Delivered' : 'Dispatched').catch(() => {});
  }
  if (status === 'In Transit' && del.order_id) {
    const order = (assertOk(await supabase.from('rimi_sales_orders').select('customer_id').eq('id', del.order_id).maybeSingle()) as any);
    const customer = order?.customer_id ? await getRimiCustomerById(order.customer_id).catch(() => null) : null;
    if (customer?.email) {
      sendRimiDeliveryDispatchedEmail({
        customerEmail: customer.email,
        customerName: customer.business_name || del.customer_name,
        deliveryNumber: del.delivery_no,
        vehicleNumber: del.vehicle_no,
        driverName: del.driver_name,
        driverPhone: del.driver_phone,
        coldRoomTemp: del.departure_temp || '-18°C',
        destination: del.destination_city || del.destination_address || 'Customer Hub'
      }).catch(() => {});
    }
  }
  triggerLocalSync('ferex_rimi_deliveries_change');
  triggerLocalSync('ferex_rimi_orders_change');
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FLEET: VEHICLES & ROUTES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiVehicles(): Promise<RimiVehicleRecord[]> {
  const data = assertOk(await supabase.from('rimi_vehicles').select('*').order('vehicle_number', { ascending: true })) || [];
  return (data as any[]).map(v => ({
    ...v,
    vehicle_no: v.vehicle_number,
    capacity_tonnes: num(v.capacity_tonnes),
    capacity_metric_tons: num(v.capacity_tonnes),
    current_temp_celsius: num(v.current_temp_celsius),
  })) as RimiVehicleRecord[];
}

export async function createRimiVehicle(vehicle: Partial<RimiVehicleRecord>): Promise<RimiVehicleRecord> {
  const vNo = (vehicle.vehicle_number || vehicle.vehicle_no)?.trim();
  if (!vNo) throw new Error('Vehicle registration number is required');
  const cap = Number(vehicle.capacity_tonnes || vehicle.capacity_metric_tons) || 0;
  const data = assertOk(
    await supabase.from('rimi_vehicles').insert({
      vehicle_number: vNo,
      model: vehicle.model || null,
      driver_name: vehicle.driver_name?.trim() || 'Unassigned',
      driver_phone: vehicle.driver_phone || '',
      capacity_tonnes: cap,
      min_temp_celsius: vehicle.min_temp_celsius ?? null,
      current_temp_celsius: Number(vehicle.current_temp_celsius ?? -18),
      status: vehicle.status || 'Stationed',
    }).select().single(),
    'Could not save the vehicle'
  ) as any;
  triggerLocalSync('ferex_rimi_vehicles_change');
  return { ...data, vehicle_no: data.vehicle_number } as RimiVehicleRecord;
}

export async function updateRimiVehicleStatus(id: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_vehicles').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) fail(error, 'Could not update the vehicle');
  triggerLocalSync('ferex_rimi_vehicles_change');
  return true;
}

export async function deleteRimiVehicle(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_vehicles').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the vehicle');
  triggerLocalSync('ferex_rimi_vehicles_change');
  return true;
}

export async function getRimiDeliveryRoutes(): Promise<RimiDeliveryRouteRecord[]> {
  const data = assertOk(await supabase.from('rimi_delivery_routes').select('*').order('route_name', { ascending: true })) || [];
  return (data as any[]).map(r => ({ ...r, destinations: r.destinations || [], estimated_transit_hours: num(r.estimated_transit_hours), distance_km: num(r.distance_km) })) as RimiDeliveryRouteRecord[];
}

export async function createRimiDeliveryRoute(route: Partial<RimiDeliveryRouteRecord>): Promise<RimiDeliveryRouteRecord> {
  if (!route.route_name?.trim()) throw new Error('Route name is required');
  const data = assertOk(
    await supabase.from('rimi_delivery_routes').insert({
      route_code: route.route_code || `RT-RF-${Date.now().toString().slice(-5)}`,
      route_name: route.route_name.trim(),
      region: route.region || '',
      origin_facility: route.origin_facility || '',
      destinations: route.destinations || [],
      distance_km: Number(route.distance_km) || 0,
      estimated_transit_hours: Number(route.estimated_transit_hours) || 0,
      assigned_vehicle: route.assigned_vehicle || null,
      is_active: route.is_active ?? true,
      status: 'Active',
    }).select().single(),
    'Could not save the route'
  );
  triggerLocalSync('ferex_rimi_routes_change');
  return data as RimiDeliveryRouteRecord;
}

export async function deleteRimiDeliveryRoute(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_delivery_routes').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the route');
  triggerLocalSync('ferex_rimi_routes_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. COLD STORAGE HUBS (WAREHOUSES)
// ─────────────────────────────────────────────────────────────────────────────

/** One pallet holds about 500 units; a hub's occupancy is derived from the batches stored in it. */
const UNITS_PER_PALLET = 500;

export async function getRimiWarehouses(): Promise<RimiWarehouseRecord[]> {
  const [whRes, batchRes] = await Promise.all([
    supabase.from('rimi_warehouses').select('*').order('name', { ascending: true }),
    supabase.from('rimi_inventory_batches').select('warehouse_id, product_id, quantity'),
  ]);
  const hubs = (assertOk(whRes) || []) as any[];
  const usage = new Map<string, { pallets: number; products: Set<string>; batches: number }>();
  for (const b of (batchRes.data || []) as any[]) {
    if (!b.warehouse_id || num(b.quantity) <= 0) continue;
    const u = usage.get(b.warehouse_id) || { pallets: 0, products: new Set<string>(), batches: 0 };
    u.pallets += Math.ceil(num(b.quantity) / UNITS_PER_PALLET);
    if (b.product_id) u.products.add(b.product_id);
    u.batches += 1;
    usage.set(b.warehouse_id, u);
  }
  return hubs.map(w => {
    const u = usage.get(w.id);
    return {
      ...w,
      cold_room_temp_celsius: num(w.cold_room_temp_celsius),
      total_capacity_pallets: num(w.total_capacity_pallets),
      utilized_pallets: u?.pallets || 0,
      product_count: u?.products.size || 0,
      batch_count: u?.batches || 0,
    } as RimiWarehouseRecord;
  });
}

export async function createRimiWarehouse(warehouse: Partial<RimiWarehouseRecord>): Promise<RimiWarehouseRecord> {
  if (!warehouse.name?.trim()) throw new Error('Facility name is required');
  const capacity = Number(warehouse.total_capacity_pallets);
  if (!(capacity > 0)) throw new Error('Enter the storage capacity (pallets)');
  const data = assertOk(
    await supabase.from('rimi_warehouses').insert({
      code: warehouse.code?.trim() || `WH-RF-${Date.now().toString().slice(-5)}`,
      name: warehouse.name.trim(),
      city: warehouse.city?.trim() || '',
      address: warehouse.address || '',
      cold_room_temp_celsius: Number(warehouse.cold_room_temp_celsius ?? -22),
      total_capacity_pallets: capacity,
      utilized_pallets: 0,
      manager_name: warehouse.manager_name?.trim() || '',
      manager_phone: warehouse.manager_phone || '',
    }).select().single(),
    'Could not save the cold storage hub'
  );
  triggerLocalSync('ferex_rimi_warehouses_change');
  return data as RimiWarehouseRecord;
}

export async function updateRimiWarehouse(id: string, updates: Partial<RimiWarehouseRecord>): Promise<RimiWarehouseRecord> {
  const { id: _id, utilized_pallets: _u, product_count: _p, batch_count: _b, created_at: _c, ...clean } = updates as any;
  const data = assertOk(
    await supabase.from('rimi_warehouses').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the cold storage hub'
  ) as any;
  if (!data) throw new Error('This hub no longer exists. Refresh the page.');
  // Batches keep the hub name for display; keep it in step when the hub is renamed.
  if (clean.name) await supabase.from('rimi_inventory_batches').update({ warehouse_name: clean.name }).eq('warehouse_id', id);
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_batches_change');
  return data as RimiWarehouseRecord;
}

export async function deleteRimiWarehouse(id: string): Promise<boolean> {
  const { count } = await supabase.from('rimi_inventory_batches').select('id', { count: 'exact', head: true }).eq('warehouse_id', id).gt('quantity', 0);
  if ((count || 0) > 0) {
    throw new Error(`This hub still holds ${count} batch(es) with stock. Move or remove the stored products first.`);
  }
  const { error } = await supabase.from('rimi_warehouses').delete().eq('id', id);
  if (error) fail(error, 'Could not delete the cold storage hub');
  triggerLocalSync('ferex_rimi_warehouses_change');
  triggerLocalSync('ferex_rimi_batches_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. TASKS
// ─────────────────────────────────────────────────────────────────────────────

function withTimeliness(t: any): RimiTaskRecord {
  const due = t.due_at ? new Date(t.due_at).getTime() : t.due_date ? new Date(`${t.due_date}T23:59:59`).getTime() : null;
  let timeliness: RimiTaskRecord['timeliness'] = 'No Deadline';
  if (due !== null) {
    if (t.status === 'Completed' && t.completed_at) timeliness = new Date(t.completed_at).getTime() <= due ? 'On Time' : 'Delayed';
    else if (t.status === 'Completed') timeliness = 'On Time';
    else timeliness = Date.now() > due ? 'Overdue' : 'On Track';
  }
  return {
    ...t,
    assigned_to_name: t.assigned_staff_name,
    assigned_to_id: t.assigned_staff_id,
    timeliness,
  } as RimiTaskRecord;
}

export async function getRimiTasks(filters?: {
  staffEmail?: string;
  status?: string;
}): Promise<RimiTaskRecord[]> {
  let query = supabase.from('rimi_tasks').select('*').order('due_date', { ascending: true });
  if (filters?.staffEmail) {
    const s = filters.staffEmail.replace(/[%,()]/g, '');
    query = query.or(`assigned_staff_email.ilike.${s},assigned_staff_name.ilike.${s}`);
  }
  if (filters?.status && filters.status !== 'All') query = query.eq('status', filters.status);
  const direct = ((assertOk(await query) || []) as any[]).map(t => {
    const isCentral = (t.created_by || '').toLowerCase().includes('central');
    return withTimeliness({ ...t, created_by: isCentral ? 'Central Admin' : (t.created_by || 'Rimi Admin'), is_central_directive: isCentral });
  });

  // Directives sent by Central Admin live in the shared tasks table.
  let central: RimiTaskRecord[] = [];
  try {
    let cQuery = supabase.from('tasks').select('*').ilike('category', '%rimi%').order('created_at', { ascending: false });
    if (filters?.staffEmail) cQuery = cQuery.ilike('assigned_to', `%${filters.staffEmail.replace(/[%,()]/g, '')}%`);
    if (filters?.status && filters.status !== 'All') {
      cQuery = cQuery.eq('status', filters.status === 'Completed' ? 'Completed' : filters.status === 'In Progress' ? 'In Progress' : 'Pending');
    }
    const { data: cData } = await cQuery;
    const seen = new Set(direct.map(t => t.id));
    central = ((cData || []) as any[]).filter(c => !seen.has(c.id)).map(c => withTimeliness({
      id: c.id,
      title: c.title,
      description: c.description || '',
      task_type: 'Delivery',
      category: c.category || 'Rimi',
      priority: c.priority === 'Critical' ? 'Urgent' : (c.priority || 'Medium'),
      status: c.status === 'Completed' ? 'Completed' : c.status === 'In Progress' ? 'In Progress' : 'Pending',
      assigned_staff_name: c.assigned_to || '',
      assigned_staff_email: c.assigned_to && String(c.assigned_to).includes('@') ? c.assigned_to : '',
      assigned_staff_id: c.assigned_staff_id,
      due_date: c.due_date || null,
      completed_at: c.completed_at || null,
      created_by: 'Central Admin',
      is_central_directive: true,
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at,
    }));
  } catch {}
  return [...direct, ...central];
}

export async function createRimiTask(task: Partial<RimiTaskRecord>): Promise<RimiTaskRecord> {
  if (!task.title?.trim()) throw new Error('Task title is required');
  const dueAt = task.due_at || null;
  const dueDate = task.due_date || (dueAt ? new Date(dueAt).toISOString().slice(0, 10) : null);
  if (task.start_at && dueAt && new Date(dueAt) < new Date(task.start_at)) throw new Error('The due date cannot be before the start date');
  const data = assertOk(
    await supabase.from('rimi_tasks').insert({
      title: task.title.trim(),
      description: task.description || '',
      task_type: task.task_type || 'Delivery',
      category: task.category || null,
      priority: task.priority || 'Medium',
      status: 'Pending',
      assigned_staff_name: task.assigned_staff_name || '',
      assigned_staff_email: task.assigned_staff_email || '',
      assigned_staff_id: isUuid(task.assigned_staff_id) ? task.assigned_staff_id : null,
      customer_id: isUuid(task.customer_id) ? task.customer_id : null,
      customer_name: task.customer_name || '',
      order_id: isUuid(task.order_id) ? task.order_id : null,
      start_at: task.start_at || null,
      due_at: dueAt,
      due_date: dueDate,
      created_by: task.created_by || 'Admin',
      assigned_by: task.assigned_by || task.created_by || 'Admin',
    }).select().single(),
    'Could not create the task'
  );
  triggerLocalSync('ferex_rimi_tasks_change');
  return withTimeliness(data);
}

export async function updateRimiTaskStatus(taskId: string, status: RimiTaskRecord['status']): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = { status, updated_at: now, completed_at: status === 'Completed' ? now : null };
  const { data, error } = await supabase.from('rimi_tasks').update(updates).eq('id', taskId).select('id').maybeSingle();
  if (error) fail(error, 'Could not update the task');
  if (!data) {
    // Central directives live in the shared tasks table.
    const shared = await supabase.from('tasks').update({
      status: status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'In Progress' : 'Pending',
      updated_at: now,
    }).eq('id', taskId);
    if (shared.error) fail(shared.error, 'Could not update the task');
  }
  triggerLocalSync('ferex_rimi_tasks_change');
  triggerLocalSync('ferex_tasks_change');
}

export async function deleteRimiTask(taskId: string): Promise<boolean> {
  const a = await supabase.from('rimi_tasks').delete().eq('id', taskId);
  if (a.error) fail(a.error, 'Could not delete the task');
  await supabase.from('tasks').delete().eq('id', taskId);
  triggerLocalSync('ferex_rimi_tasks_change');
  triggerLocalSync('ferex_tasks_change');
  return true;
}

export type RimiTask = RimiTaskRecord;
export type RimiStaffMember = { id: string; name: string; email: string; role: string; department?: string; status?: string };

export async function getRimiStaffList(): Promise<RimiStaffMember[]> {
  const staff = await getRimiStaffMembers();
  return staff.map(s => ({ id: s.id, name: s.name, email: s.email, role: s.role, department: 'Cold Chain Logistics', status: 'Active' }));
}

export async function updateRimiTask(id: string, updates: Partial<RimiTaskRecord>): Promise<RimiTaskRecord | null> {
  const { id: _id, timeliness: _t, assigned_to_name: _n, assigned_to_id: _i, assigned_to_role: _r, is_central_directive: _c, created_at: _ca, ...clean } = updates as any;
  if (clean.status === 'Completed' && !clean.completed_at) clean.completed_at = new Date().toISOString();
  if (clean.status && clean.status !== 'Completed') clean.completed_at = null;
  if (clean.due_at && !clean.due_date) clean.due_date = new Date(clean.due_at).toISOString().slice(0, 10);
  const data = assertOk(
    await supabase.from('rimi_tasks').update({ ...clean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(),
    'Could not update the task'
  );
  if (!data) throw new Error('This task no longer exists. Refresh the page.');
  triggerLocalSync('ferex_rimi_tasks_change');
  return withTimeliness(data);
}

/** Reassigns a task: updates the name, email and id together so the new assignee actually sees it. */
export async function reassignRimiTask(taskId: string, staffId: string, staffName: string): Promise<boolean> {
  let email = '';
  try {
    const staff = await getRimiStaffMembers();
    const match = staff.find(s => s.id === staffId) || staff.find(s => s.name === staffName);
    email = match?.email || '';
  } catch {}
  const { data, error } = await supabase.from('rimi_tasks').update({
    assigned_staff_id: isUuid(staffId) ? staffId : null,
    assigned_staff_name: staffName,
    assigned_staff_email: email,
    updated_at: new Date().toISOString(),
  }).eq('id', taskId).select('id').maybeSingle();
  if (error) fail(error, 'Could not reassign the task');
  if (!data) throw new Error('This task no longer exists. Refresh the page.');
  triggerLocalSync('ferex_rimi_tasks_change');
  return true;
}

export async function renameRimiTaskTitle(taskId: string, newTitle: string): Promise<boolean> {
  if (!newTitle.trim()) throw new Error('Task title cannot be empty');
  const { error } = await supabase.from('rimi_tasks').update({ title: newTitle.trim(), updated_at: new Date().toISOString() }).eq('id', taskId);
  if (error) fail(error, 'Could not rename the task');
  triggerLocalSync('ferex_rimi_tasks_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. DASHBOARD & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export interface RimiDashboardMetrics {
  totalCustomers: number;
  activeDistributors: number;
  activeShops: number;
  activeWholesalers: number;
  ordersToday: number;
  pendingDeliveries: number;
  outstandingPayments: number;
  lowStockCount: number;
  expiringBatchesCount: number;
  totalStorageCapacity: number;
  utilizedStorageCapacity: number;
  storageUtilizationPercentage: number;
  recentOrders: RimiSalesOrderRecord[];
  recentActivities: RimiCustomerActivityRecord[];
  warehouses: RimiWarehouseRecord[];
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0);

export async function getRimiDashboardMetrics(staffEmail?: string): Promise<RimiDashboardMetrics> {
  const [customers, orders, batches, deliveries, warehouses, activities] = await Promise.all([
    getRimiCustomers(staffEmail ? { staffEmail } : undefined),
    getRimiSalesOrders(),
    getRimiBatches(),
    getRimiDeliveries(),
    getRimiWarehouses(),
    supabase.from('rimi_customer_activity').select('*').order('created_at', { ascending: false }).limit(10),
  ]);
  const live = orders.filter(o => o.order_status !== 'Cancelled');
  const todayStr = new Date().toISOString().split('T')[0];
  const totalCapacity = warehouses.reduce((s, w) => s + num(w.total_capacity_pallets), 0);
  const utilized = warehouses.reduce((s, w) => s + num(w.utilized_pallets), 0);
  return {
    totalCustomers: customers.length,
    activeDistributors: customers.filter(c => c.customer_type === 'Distributor').length,
    activeShops: customers.filter(c => c.customer_type === 'Shop / Retailer').length,
    activeWholesalers: customers.filter(c => c.customer_type === 'Wholesaler').length,
    ordersToday: live.filter(o => (o.created_at || '').startsWith(todayStr)).length,
    pendingDeliveries: deliveries.filter(d => d.delivery_status !== 'Delivered' && d.delivery_status !== 'Returned' && d.delivery_status !== 'Failed').length,
    outstandingPayments: live.reduce((s, o) => s + num(o.balance_amount), 0),
    lowStockCount: batches.filter(b => b.quantity > 0 && b.quantity <= 20).length,
    expiringBatchesCount: batches.filter(b => b.quantity > 0 && b.days_to_expiry! > 0 && b.days_to_expiry! <= 30).length,
    totalStorageCapacity: totalCapacity,
    utilizedStorageCapacity: utilized,
    storageUtilizationPercentage: pct(utilized, totalCapacity),
    recentOrders: orders.slice(0, 5),
    recentActivities: (activities.data || []) as RimiCustomerActivityRecord[],
    warehouses,
  };
}

export interface RimiAnalyticsMetrics {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOrdersCount: number;
  categorySalesDistribution: Array<{ category: string; value: number; percentage: number }>;
  regionalCustomerDistribution: Array<{ region: string; count: number; volume: number }>;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  batchExpiryRisks: Array<{ batch_no: string; product_name: string; quantity: number; expiry_date: string; days_left: number; risk_value: number }>;
}

export async function getRimiAnalyticsMetrics(sinceDays?: number): Promise<RimiAnalyticsMetrics> {
  const [allOrders, customers, batches, products] = await Promise.all([
    getRimiSalesOrders(),
    getRimiCustomers(),
    getRimiBatches(),
    getRimiProducts(),
  ]);
  // Cancelled orders are not revenue, so gross sales, collected and outstanding all use the same set of orders.
  const cutoff = sinceDays ? Date.now() - sinceDays * 86400000 : 0;
  const orders = allOrders.filter(o => o.order_status !== 'Cancelled' && (!cutoff || new Date(o.created_at).getTime() >= cutoff));
  const totalRevenue = orders.reduce((s, o) => s + num(o.total_amount), 0);
  const totalCollected = orders.reduce((s, o) => s + num(o.paid_amount), 0);
  const totalOutstanding = orders.reduce((s, o) => s + num(o.balance_amount), 0);

  const prodMap = new Map(products.map(p => [p.id, p]));
  const catMap = new Map<string, number>();
  const prodSales = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const o of orders) {
    for (const it of o.items || []) {
      const p = prodMap.get(it.product_id);
      const line = num(it.total_price) || num(it.quantity) * num(it.unit_price);
      const cat = p?.category || 'Uncategorised';
      catMap.set(cat, (catMap.get(cat) || 0) + line);
      const key = it.product_id || it.product_name;
      const cur = prodSales.get(key) || { name: it.product_name || p?.name || 'Item', quantity: 0, revenue: 0 };
      cur.quantity += num(it.quantity);
      cur.revenue += line;
      prodSales.set(key, cur);
    }
  }
  const regionMap = new Map<string, { count: number; volume: number }>();
  for (const c of customers) {
    const reg = c.territory || 'Unassigned';
    const cur = regionMap.get(reg) || { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += num(c.outstanding_amount);
    regionMap.set(reg, cur);
  }
  const catTotal = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
  return {
    totalRevenue,
    totalCollected,
    totalOutstanding,
    totalOrdersCount: orders.length,
    categorySalesDistribution: Array.from(catMap.entries()).map(([category, value]) => ({ category, value, percentage: pct(value, catTotal) })).sort((a, b) => b.value - a.value),
    regionalCustomerDistribution: Array.from(regionMap.entries()).map(([region, v]) => ({ region, count: v.count, volume: v.volume })),
    // Only products that actually sold appear in the ranking.
    topSellingProducts: Array.from(prodSales.values()).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    batchExpiryRisks: batches
      .filter(b => b.quantity > 0 && b.days_to_expiry! > 0 && b.days_to_expiry! <= 30)
      .map(b => ({
        batch_no: b.batch_no,
        product_name: b.product_name,
        quantity: b.quantity,
        expiry_date: b.expiry_date,
        days_left: b.days_to_expiry!,
        risk_value: b.quantity * num(prodMap.get(b.product_id)?.unit_price),
      }))
      .sort((a, b) => a.days_left - b.days_left),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. PRODUCT CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiProductCategories(): Promise<string[]> {
  const [cats, prods] = await Promise.all([
    supabase.from('rimi_product_categories').select('name').order('name', { ascending: true }),
    supabase.from('rimi_products').select('category'),
  ]);
  const names = new Set<string>();
  for (const c of (cats.data || []) as any[]) names.add(c.name);
  for (const p of (prods.data || []) as any[]) if (p.category) names.add(p.category);
  return Array.from(names).sort();
}

export async function createRimiProductCategory(category: string): Promise<string[]> {
  const name = category.trim();
  if (!name) throw new Error('Enter a category name');
  const { error } = await supabase.from('rimi_product_categories').upsert({ name });
  if (error) fail(error, 'Could not save the category');
  window.dispatchEvent(new CustomEvent('ferex_rimi_categories_change'));
  return getRimiProductCategories();
}

export async function deleteRimiProductCategory(category: string): Promise<string[]> {
  const { count } = await supabase.from('rimi_products').select('id', { count: 'exact', head: true }).eq('category', category);
  if ((count || 0) > 0) throw new Error(`${count} product(s) still use "${category}". Move them to another category first.`);
  const { error } = await supabase.from('rimi_product_categories').delete().eq('name', category);
  if (error) fail(error, 'Could not delete the category');
  window.dispatchEvent(new CustomEvent('ferex_rimi_categories_change'));
  return getRimiProductCategories();
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. CUSTOMER ASSIGNMENT, MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiDistributors(staffEmail?: string): Promise<RimiCustomerRecord[]> {
  return getRimiCustomers({ staffEmail });
}

export async function reassignRimiCustomerStaff(customerId: string, staffName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  let email = staffEmail || '';
  let id = isUuid(staffId) ? staffId : null;
  if (!email || !id) {
    try {
      const staff = await getRimiStaffMembers();
      const match = staff.find(s => (staffId && s.id === staffId) || s.name === staffName);
      email = email || match?.email || '';
      id = id || (isUuid(match?.id) ? match!.id : null);
    } catch {}
  }
  const { error } = await supabase.from('rimi_customers').update({
    assigned_staff_name: staffName,
    assigned_staff_email: email,
    assigned_staff_id: id,
    updated_at: new Date().toISOString(),
  }).eq('id', customerId);
  if (error) fail(error, 'Could not reassign the customer');
  triggerLocalSync('ferex_rimi_customers_change');
  return true;
}

export async function getRimiMessages(): Promise<any[]> {
  const { data } = await supabase.from('rimi_customer_activity').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function sendRimiMessage(msg: any): Promise<boolean> {
  if (!msg?.customerId) return false;
  await addRimiCustomerActivity({
    customer_id: msg.customerId,
    activity_type: 'Note',
    title: msg.text || 'Message sent',
    performed_by: msg.sender || 'Staff'
  });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. NOTIFICATIONS
// Stored alerts live in rimi_notifications. Cold-chain, expiry and pending-order alerts are derived from live data.
// Read / dismissed state is saved per signed-in user in the database, so it follows the person across devices.
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiNotifications(): Promise<any[]> {
  const uid = await currentUserId();
  const [stored, stateRes, warehouses, batches, orders] = await Promise.all([
    supabase.from('rimi_notifications').select('*').order('created_at', { ascending: false }).limit(200),
    uid ? supabase.from('rimi_notification_state').select('alert_id, is_read, dismissed').eq('user_id', uid) : Promise.resolve({ data: [] as any[] }),
    getRimiWarehouses().catch(() => [] as RimiWarehouseRecord[]),
    getRimiBatches().catch(() => [] as RimiInventoryBatchRecord[]),
    getRimiSalesOrders().catch(() => [] as RimiSalesOrderRecord[]),
  ]);

  const list = new Map<string, any>();
  for (const n of (stored.data || []) as any[]) {
    list.set(n.id, { ...n, description: n.message, category: n.category || 'Cold Chain', severity: n.severity || 'Info', link: n.link || '/rimi/dashboard' });
  }
  for (const wh of warehouses) {
    if (num(wh.cold_room_temp_celsius) > -16) {
      const id = `dyn-wh-temp-${wh.id}`;
      const msg = `Current temp at ${wh.cold_room_temp_celsius}°C (standard threshold is -18.0°C).`;
      list.set(id, { id, title: `Cold Storage Temp Alert: ${wh.name}`, message: msg, description: msg, category: 'Cold Chain', severity: 'Warning', link: '/rimi/warehouses', is_read: false, created_at: wh.updated_at || wh.created_at });
    }
  }
  for (const b of batches) {
    if (b.quantity > 0 && b.days_to_expiry! > 0 && b.days_to_expiry! <= 45) {
      const id = `dyn-batch-exp-${b.id}`;
      const msg = `${b.quantity} ${b.unit || 'KG'} at ${b.warehouse_name || 'Cold Hub'} expires in ${b.days_to_expiry} days.`;
      list.set(id, { id, title: `Expiring Batch: ${b.product_name || 'Product'} (${b.batch_no})`, message: msg, description: msg, category: 'Inventory', severity: b.days_to_expiry! <= 15 ? 'Critical' : 'Warning', link: '/rimi/inventory', is_read: false, created_at: b.updated_at || b.created_at });
    }
  }
  for (const o of orders) {
    if (o.order_status === 'Received' || o.order_status === 'Confirmed') {
      const id = `dyn-order-${o.id}`;
      const msg = `Order of ₹${num(o.total_amount).toLocaleString('en-IN')} for ${o.customer_name}.`;
      list.set(id, { id, title: `Order Pending Dispatch: #${o.order_no}`, message: msg, description: msg, category: 'Sales Orders', severity: 'Info', link: '/rimi/sales-orders', is_read: false, created_at: o.created_at });
    }
  }

  const state = new Map<string, { is_read: boolean; dismissed: boolean }>();
  for (const s of (stateRes.data || []) as any[]) state.set(s.alert_id, s);
  return Array.from(list.values())
    .filter(n => !state.get(String(n.id))?.dismissed)
    .map(n => ({ ...n, is_read: state.get(String(n.id))?.is_read ?? false }))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

async function saveNotificationState(ids: string[], patch: { is_read?: boolean; dismissed?: boolean }) {
  const uid = await currentUserId();
  if (!uid || !ids.length) return;
  const { error } = await supabase.from('rimi_notification_state').upsert(
    ids.map(alert_id => ({ user_id: uid, alert_id, ...patch, updated_at: new Date().toISOString() })),
    { onConflict: 'user_id,alert_id' }
  );
  if (error) fail(error, 'Could not save the notification state');
  triggerLocalSync('ferex_rimi_notifications_change');
}

export async function markRimiNotificationRead(id: string): Promise<boolean> {
  await saveNotificationState([String(id)], { is_read: true });
  return true;
}

export async function markAllRimiNotificationsRead(): Promise<boolean> {
  const all = await getRimiNotifications();
  await saveNotificationState(all.filter(n => !n.is_read).map(n => String(n.id)), { is_read: true });
  return true;
}

export async function deleteRimiNotification(id: string): Promise<boolean> {
  await saveNotificationState([String(id)], { dismissed: true, is_read: true });
  return true;
}

export async function createRimiNotification(notification: any): Promise<boolean> {
  const { error } = await supabase.from('rimi_notifications').insert({
    title: notification.title || 'Operational Notification',
    message: notification.message || notification.description || '',
    type: notification.type || null,
    category: notification.category || 'Cold Chain',
    severity: notification.severity || 'Info',
    link: notification.link || '/rimi/dashboard',
    is_read: false,
  });
  if (error) fail(error, 'Could not create the notification');
  triggerLocalSync('ferex_rimi_notifications_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. LIVE SYNC
// Subscribes to database changes so Admin and Warehouse sessions update each other without a refresh.
// ─────────────────────────────────────────────────────────────────────────────

const RIMI_REALTIME_TABLES: Array<[string, string[]]> = [
  ['rimi_customers', ['ferex_rimi_customers_change']],
  ['rimi_customer_activity', ['ferex_rimi_activity_change']],
  ['rimi_products', ['ferex_rimi_products_change']],
  ['rimi_product_categories', ['ferex_rimi_categories_change']],
  ['rimi_inventory_batches', ['ferex_rimi_batches_change', 'ferex_rimi_products_change', 'ferex_rimi_warehouses_change']],
  ['rimi_stock_movements', ['ferex_rimi_movements_change']],
  ['rimi_sales_orders', ['ferex_rimi_orders_change', 'ferex_rimi_customers_change']],
  ['rimi_order_items', ['ferex_rimi_orders_change']],
  ['rimi_payments', ['ferex_rimi_payments_change', 'ferex_rimi_orders_change']],
  ['rimi_deliveries', ['ferex_rimi_deliveries_change']],
  ['rimi_delivery_routes', ['ferex_rimi_routes_change']],
  ['rimi_vehicles', ['ferex_rimi_vehicles_change']],
  ['rimi_warehouses', ['ferex_rimi_warehouses_change']],
  ['rimi_tasks', ['ferex_rimi_tasks_change']],
  ['rimi_notifications', ['ferex_rimi_notifications_change']],
];

/** Starts live sync. Returns a function that stops it. Call once from the Rimi layout. */
export function subscribeRimiRealtime(): () => void {
  if (typeof window === 'undefined') return () => {};
  const timers = new Map<string, number>();
  const fire = (events: string[]) => {
    for (const ev of events) {
      // Coalesce bursts (an order touches several tables) into a single refresh per screen.
      window.clearTimeout(timers.get(ev));
      timers.set(ev, window.setTimeout(() => window.dispatchEvent(new Event(ev)), 250));
    }
  };
  const channel = supabase.channel(`rimi-live-${Math.random().toString(36).slice(2, 8)}`);
  for (const [table, events] of RIMI_REALTIME_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => fire(events));
  }
  channel.subscribe();
  return () => {
    timers.forEach(t => window.clearTimeout(t));
    try { supabase.removeChannel(channel); } catch {}
  };
}
