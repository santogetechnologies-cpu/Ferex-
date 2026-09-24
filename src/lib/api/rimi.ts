import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';

export const getRimiStaffMembers = () => getDivisionStaff('rimi');
export const getRimiStaffMembersSync = () => getDivisionStaffSync('rimi');

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
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
  payment_status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
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
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
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
// 2. CRM CUSTOMERS & PIPELINE API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiCustomers(filters?: {
  staffEmail?: string;
  customerType?: string;
  territory?: string;
  stage?: string;
  search?: string;
}): Promise<RimiCustomerRecord[]> {
  try {
    let query = supabase
      .from('rimi_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.customerType && filters.customerType !== 'All') {
      query = query.eq('customer_type', filters.customerType);
    }
    if (filters?.territory && filters.territory !== 'All') {
      query = query.eq('territory', filters.territory);
    }
    if (filters?.stage && filters.stage !== 'All') {
      query = query.eq('pipeline_stage', filters.stage);
    }
    if (filters?.staffEmail) {
      query = query.eq('assigned_staff_email', filters.staffEmail);
    }

    const { data, error } = await query;
    if (error) throw error;

    let result = (data || []) as RimiCustomerRecord[];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(c =>
        c.business_name.toLowerCase().includes(s) ||
        c.contact_person.toLowerCase().includes(s) ||
        c.city.toLowerCase().includes(s) ||
        (c.phone && c.phone.includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s))
      );
    }
    return result;
  } catch (err) {
    console.error('Error in getRimiCustomers:', err);
    return [];
  }
}

export async function getRimiCustomerById(id: string): Promise<RimiCustomerRecord | null> {
  try {
    const { data, error } = await supabase
      .from('rimi_customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function createRimiCustomer(customer: Partial<RimiCustomerRecord>): Promise<RimiCustomerRecord> {
  const newId = generateUUID();
  const payload: RimiCustomerRecord = {
    id: newId,
    business_name: customer.business_name?.trim() || 'New Enterprise Customer',
    customer_type: customer.customer_type || 'Shop / Retailer',
    contact_person: customer.contact_person?.trim() || 'Point of Contact',
    phone: customer.phone?.trim() || '',
    whatsapp: customer.whatsapp?.trim() || customer.phone?.trim() || '',
    email: customer.email?.trim() || '',
    gst_no: customer.gst_no?.trim() || '',
    address: customer.address?.trim() || '',
    city: customer.city?.trim() || 'Mumbai',
    district: customer.district?.trim() || '',
    state: customer.state?.trim() || 'Maharashtra',
    pincode: customer.pincode?.trim() || '',
    territory: customer.territory || 'West Zone',
    assigned_staff_id: customer.assigned_staff_id || undefined,
    assigned_staff_name: customer.assigned_staff_name || '',
    assigned_staff_email: customer.assigned_staff_email || '',
    credit_period_days: Number(customer.credit_period_days) || 30,
    credit_limit: Number(customer.credit_limit) || 100000,
    outstanding_amount: Number(customer.outstanding_amount) || 0,
    payment_status: customer.payment_status || 'Current',
    preferred_products: customer.preferred_products || [],
    pipeline_stage: customer.pipeline_stage || 'Lead',
    status: customer.status || 'Active',
    tags: customer.tags || [],
    notes: customer.notes || '',
    created_by: customer.created_by || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('rimi_customers').insert(payload);
  if (error) throw error;

  // Auto-log creation to customer activity timeline
  await addRimiCustomerActivity({
    customer_id: newId,
    activity_type: 'Note',
    title: `Customer Account Created (${payload.customer_type})`,
    description: `Initial onboarding stage set to "${payload.pipeline_stage}". Credit limit: ₹${payload.credit_limit.toLocaleString('en-IN')}`,
    performed_by: customer.created_by || 'Staff',
    performed_by_email: customer.assigned_staff_email || ''
  });

  triggerLocalSync('ferex_rimi_customers_change');
  return payload;
}

export async function updateRimiCustomer(id: string, updates: Partial<RimiCustomerRecord>): Promise<RimiCustomerRecord> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('rimi_customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  triggerLocalSync('ferex_rimi_customers_change');
  return data;
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

  // Auto-record stage change event in timeline
  await addRimiCustomerActivity({
    customer_id: id,
    activity_type: 'Stage Change',
    title: `Pipeline Stage Advanced: ${oldStage} → ${newStage}`,
    description: notes || `Customer moved to ${newStage} pipeline stage.`,
    performed_by: performedBy
  });

  return updated;
}

export async function deleteRimiCustomer(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_customers').delete().eq('id', id);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_customers_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOMER ACTIVITY TIMELINE API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiCustomerActivities(customerId: string): Promise<RimiCustomerActivityRecord[]> {
  try {
    const { data, error } = await supabase
      .from('rimi_customer_activity')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RimiCustomerActivityRecord[];
  } catch (err) {
    console.error('Error in getRimiCustomerActivities:', err);
    return [];
  }
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
  const payload: RimiCustomerActivityRecord = {
    id: generateUUID(),
    customer_id: activity.customer_id,
    activity_type: activity.activity_type,
    title: activity.title,
    description: activity.description || '',
    performed_by: activity.performed_by || 'Staff',
    performed_by_email: activity.performed_by_email || '',
    metadata: activity.metadata || {},
    attachment_url: activity.attachment_url || '',
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('rimi_customer_activity').insert(payload);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_activity_change');
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRODUCTS API
// ─────────────────────────────────────────────────────────────────────────────

const RIMI_PRODUCTS_STORAGE_KEY = 'ferex_rimi_products_catalog';

function getLocalRimiProducts(): RimiProductRecord[] {
  try {
    const raw = localStorage.getItem(RIMI_PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalRimiProducts(products: RimiProductRecord[]) {
  try {
    localStorage.setItem(RIMI_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch {}
}

export async function getRimiProducts(): Promise<RimiProductRecord[]> {
  try {
    let prods: RimiProductRecord[] = [];
    try {
      const { data, error: prodErr } = await supabase
        .from('rimi_products')
        .select('id, sku, name, category, unit, unit_price, storage_temp, min_stock_alert, is_active, created_at, updated_at')
        .order('name', { ascending: true });

      if (!prodErr && Array.isArray(data)) {
        prods = data as RimiProductRecord[];
      }
    } catch (err) {
      console.warn('[RimiAPI] Supabase getRimiProducts fallback notice:', err);
    }

    // Merge with local fallback
    const local = getLocalRimiProducts();
    const map = new Map<string, RimiProductRecord>();
    local.forEach(p => map.set(p.id, p));
    prods.forEach(p => map.set(p.id, p));

    const merged = Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (merged.length > 0 && local.length === 0) {
      saveLocalRimiProducts(merged);
    }

    // Compute live total stock from active batches if available
    let stockMap = new Map<string, number>();
    try {
      const { data: batches } = await supabase
        .from('rimi_inventory_batches')
        .select('product_id, quantity');

      if (Array.isArray(batches)) {
        for (const b of batches) {
          stockMap.set(b.product_id, (stockMap.get(b.product_id) || 0) + Number(b.quantity || 0));
        }
      }
    } catch {}

    return merged.map(p => ({
      ...p,
      total_stock: stockMap.get(p.id) || p.total_stock || 0
    }));
  } catch (err) {
    console.error('Error in getRimiProducts:', err);
    return getLocalRimiProducts();
  }
}

export async function createRimiProduct(product: Partial<RimiProductRecord>): Promise<RimiProductRecord> {
  const newId = generateUUID();
  const payload: RimiProductRecord = {
    id: newId,
    sku: product.sku?.trim() || `SKU-RF-${Date.now().toString().slice(-4)}`,
    name: product.name?.trim() || 'Frozen Product',
    category: product.category || 'Frozen Seafood',
    unit: product.unit || 'KG',
    unit_price: Number(product.unit_price) || 250,
    storage_temp: product.storage_temp || '-18°C',
    min_stock_alert: Number(product.min_stock_alert) || 50,
    is_active: product.is_active !== undefined ? product.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Attempt Supabase insert with supported columns only
  try {
    const dbPayload = {
      id: payload.id,
      sku: payload.sku,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      unit_price: payload.unit_price,
      storage_temp: payload.storage_temp,
      min_stock_alert: payload.min_stock_alert,
      is_active: payload.is_active
    };
    await supabase.from('rimi_products').insert(dbPayload);
  } catch (err) {
    console.warn('[RimiAPI] Supabase product insert notice:', err);
  }

  // Persist locally
  const current = getLocalRimiProducts();
  const updated = [payload, ...current.filter(p => p.id !== payload.id && p.sku !== payload.sku)];
  saveLocalRimiProducts(updated);

  triggerLocalSync('ferex_rimi_products_change');
  return payload;
}

export async function updateRimiProduct(id: string, updates: Partial<RimiProductRecord>): Promise<RimiProductRecord> {
  const current = getLocalRimiProducts();
  const existing = current.find(p => p.id === id) || { id, name: 'Product', sku: id, unit_price: 0 } as RimiProductRecord;
  const updatedRecord: RimiProductRecord = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  };

  try {
    const dbUpdates: any = { ...updates };
    delete dbUpdates.image_url;
    delete dbUpdates.description;
    delete dbUpdates.total_stock;
    await supabase.from('rimi_products').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('[RimiAPI] Supabase product update notice:', err);
  }

  const updatedList = current.map(p => p.id === id ? updatedRecord : p);
  if (!current.some(p => p.id === id)) {
    updatedList.unshift(updatedRecord);
  }
  saveLocalRimiProducts(updatedList);

  triggerLocalSync('ferex_rimi_products_change');
  return updatedRecord;
}

export async function deleteRimiProduct(id: string): Promise<boolean> {
  try {
    await supabase.from('rimi_products').delete().eq('id', id);
  } catch (err) {
    console.warn('[RimiAPI] Supabase product delete notice:', err);
  }

  const current = getLocalRimiProducts();
  const filtered = current.filter(p => p.id !== id && p.sku !== id);
  saveLocalRimiProducts(filtered);

  triggerLocalSync('ferex_rimi_products_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. UNIFIED INVENTORY BATCHES & EXPIRY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const RIMI_BATCHES_STORAGE_KEY = 'ferex_rimi_inventory_batches_cache';

function getLocalRimiBatches(): RimiInventoryBatchRecord[] {
  try {
    const raw = localStorage.getItem(RIMI_BATCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalRimiBatches(batches: RimiInventoryBatchRecord[]) {
  try {
    localStorage.setItem(RIMI_BATCHES_STORAGE_KEY, JSON.stringify(batches));
  } catch {}
}

export async function getRimiBatches(filters?: {
  warehouseId?: string;
  productId?: string;
  expiryStatus?: string;
}): Promise<RimiInventoryBatchRecord[]> {
  try {
    let query = supabase
      .from('rimi_inventory_batches')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (filters?.warehouseId && filters.warehouseId !== 'All') {
      query = query.eq('warehouse_id', filters.warehouseId);
    }
    if (filters?.productId && filters.productId !== 'All') {
      query = query.eq('product_id', filters.productId);
    }

    let batchList: RimiInventoryBatchRecord[] = [];
    try {
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        batchList = data as RimiInventoryBatchRecord[];
      }
    } catch {}

    // Merge Supabase with local storage cache
    const local = getLocalRimiBatches();
    const map = new Map<string, RimiInventoryBatchRecord>();
    local.forEach(b => map.set(b.id, b));
    batchList.forEach(b => map.set(b.id, { ...map.get(b.id), ...b }));

    const merged = Array.from(map.values());
    if (merged.length > 0 && local.length === 0) {
      saveLocalRimiBatches(merged);
    }

    const now = Date.now();
    const result = merged.map(b => {
      const expTime = new Date(b.expiry_date).getTime();
      const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      let calcStatus = b.status;
      if (diffDays <= 0) {
        calcStatus = 'Expired';
      } else if (diffDays <= 30) {
        calcStatus = 'Expiring Soon';
      } else if (Number(b.quantity) <= 20) {
        calcStatus = 'Low Stock';
      } else {
        calcStatus = 'Active';
      }

      return {
        ...b,
        status: calcStatus,
        days_to_expiry: diffDays
      };
    }) as RimiInventoryBatchRecord[];

    let filtered = result;
    if (filters?.warehouseId && filters.warehouseId !== 'All') {
      filtered = filtered.filter(b => b.warehouse_id === filters.warehouseId);
    }
    if (filters?.productId && filters.productId !== 'All') {
      filtered = filtered.filter(b => b.product_id === filters.productId);
    }
    if (filters?.expiryStatus && filters.expiryStatus !== 'All') {
      if (filters.expiryStatus === 'Active') return filtered.filter(b => b.days_to_expiry! > 30 && b.quantity > 0);
      if (filters.expiryStatus === 'Expiring Soon') return filtered.filter(b => b.days_to_expiry! > 0 && b.days_to_expiry! <= 30);
      if (filters.expiryStatus === 'Critical') return filtered.filter(b => b.days_to_expiry! > 0 && b.days_to_expiry! <= 7);
      if (filters.expiryStatus === 'Expired') return filtered.filter(b => b.days_to_expiry! <= 0);
    }

    return filtered;
  } catch (err) {
    console.error('Error in getRimiBatches:', err);
    return getLocalRimiBatches();
  }
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
  const newId = generateUUID();
  const prods = await getRimiProducts();
  const matchedProd = prods.find(p => p.id === batch.product_id);
  const prodName = batch.product_name || matchedProd?.name || 'Frozen Item';
  const category = matchedProd?.category || 'Frozen Seafood';
  const unit = matchedProd?.unit || 'KG';

  // Ensure product exists in database to prevent foreign key constraint violations
  if (batch.product_id) {
    try {
      const { data: existingProd } = await supabase
        .from('rimi_products')
        .select('id')
        .eq('id', batch.product_id)
        .maybeSingle();

      if (!existingProd) {
        await supabase.from('rimi_products').upsert({
          id: batch.product_id,
          sku: matchedProd?.sku || `SKU-${Date.now().toString().slice(-4)}`,
          name: prodName,
          category: category,
          unit: unit,
          unit_price: matchedProd?.unit_price || 200,
          storage_temp: batch.storage_temp || matchedProd?.storage_temp || '-18°C',
          min_stock_alert: matchedProd?.min_stock_alert || 50,
          is_active: true
        });
      }
    } catch (e) {
      console.warn('[RimiAPI] Product check/upsert warning:', e);
    }
  }

  const isValidUUID = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const validWarehouseId = isValidUUID(batch.warehouse_id) ? batch.warehouse_id : null;

  const generatedBatchNo = batch.batch_no || `LOT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const payload: RimiInventoryBatchRecord = {
    id: newId,
    batch_no: generatedBatchNo,
    product_id: batch.product_id,
    product_name: prodName,
    product_category: category,
    mfg_date: batch.mfg_date,
    expiry_date: batch.expiry_date,
    quantity: Number(batch.quantity) || 0,
    initial_quantity: Number(batch.quantity) || 0,
    unit: unit,
    warehouse_id: validWarehouseId || undefined,
    warehouse_name: batch.warehouse_name || 'Cold Storage 1 (Chennai)',
    storage_temp: batch.storage_temp || matchedProd?.storage_temp || '-18°C',
    status: 'Active',
    certificate_url: batch.certificate_url || '',
    notes: batch.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Cache locally
  const currentBatches = getLocalRimiBatches();
  saveLocalRimiBatches([payload, ...currentBatches.filter(b => b.id !== payload.id)]);

  const dbBatchPayload = {
    ...payload,
    warehouse_id: validWarehouseId
  };

  try {
    const { error } = await supabase.from('rimi_inventory_batches').insert(dbBatchPayload);
    if (error) {
      if (error.message.includes('warehouse') || error.code === '23503') {
        await supabase.from('rimi_inventory_batches').insert({
          ...dbBatchPayload,
          warehouse_id: null
        });
      }
    }
  } catch (err) {
    console.warn('[RimiAPI] Supabase batch insert notice:', err);
  }

  // Record stock movement
  try {
    await recordRimiStockMovement({
      batch_id: newId,
      product_id: batch.product_id,
      movement_type: 'Initial Stock',
      quantity_change: Number(batch.quantity),
      resulting_quantity: Number(batch.quantity),
      warehouse_id: validWarehouseId || undefined,
      notes: `Initial lot production received (${generatedBatchNo})`
    });
  } catch (moveErr) {
    console.warn('[RimiAPI] Stock movement record warning:', moveErr);
  }

  triggerLocalSync('ferex_rimi_batches_change');
  return payload;
}

export async function updateRimiBatch(id: string, updates: Partial<RimiInventoryBatchRecord>): Promise<RimiInventoryBatchRecord> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  try {
    await supabase
      .from('rimi_inventory_batches')
      .update(payload)
      .eq('id', id);
  } catch {}

  const current = getLocalRimiBatches();
  const updated = current.map(b => b.id === id ? { ...b, ...payload } : b);
  saveLocalRimiBatches(updated);

  triggerLocalSync('ferex_rimi_batches_change');
  return (updated.find(b => b.id === id) || payload) as RimiInventoryBatchRecord;
}

export async function deleteRimiBatch(id: string): Promise<boolean> {
  try {
    await supabase.from('rimi_inventory_batches').delete().eq('id', id);
  } catch {}
  const local = getLocalRimiBatches();
  saveLocalRimiBatches(local.filter(b => b.id !== id));
  triggerLocalSync('ferex_rimi_batches_change');
  return true;
}

export async function getRimiStockMovements(batchId?: string): Promise<RimiStockMovementRecord[]> {
  try {
    let query = supabase
      .from('rimi_stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RimiStockMovementRecord[];
  } catch {
    return [];
  }
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
  const isValidUUID = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const payload: RimiStockMovementRecord = {
    id: generateUUID(),
    batch_id: movement.batch_id,
    product_id: movement.product_id,
    movement_type: movement.movement_type,
    quantity_change: movement.quantity_change,
    resulting_quantity: movement.resulting_quantity,
    order_id: isValidUUID(movement.order_id) ? movement.order_id : undefined,
    reference_no: movement.reference_no || '',
    warehouse_id: isValidUUID(movement.warehouse_id) ? movement.warehouse_id : undefined,
    performed_by: movement.performed_by || 'Admin',
    notes: movement.notes || '',
    created_at: new Date().toISOString()
  };
  const { error } = await supabase.from('rimi_stock_movements').insert(payload);
  if (error) console.warn('[RimiAPI] Stock movement insert warning:', error.message);
  triggerLocalSync('ferex_rimi_movements_change');
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. UNIFIED SALES & ORDERS WORKFLOW API
// ─────────────────────────────────────────────────────────────────────────────

const RIMI_SALES_ORDERS_STORAGE_KEY = 'ferex_rimi_sales_orders_cache';

function getLocalRimiSalesOrders(): RimiSalesOrderRecord[] {
  try {
    const raw = localStorage.getItem(RIMI_SALES_ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalRimiSalesOrders(orders: RimiSalesOrderRecord[]) {
  try {
    localStorage.setItem(RIMI_SALES_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

export async function getRimiSalesOrders(filters?: {
  staffEmail?: string;
  customerId?: string;
  status?: string;
}): Promise<RimiSalesOrderRecord[]> {
  try {
    let query = supabase
      .from('rimi_sales_orders')
      .select(`
        *,
        items:rimi_order_items(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('order_status', filters.status);
    }

    let orders: RimiSalesOrderRecord[] = [];
    try {
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        orders = data as RimiSalesOrderRecord[];
      }
    } catch {}

    const local = getLocalRimiSalesOrders();
    const map = new Map<string, RimiSalesOrderRecord>();
    local.forEach(o => map.set(o.id, o));
    orders.forEach(o => map.set(o.id, { ...map.get(o.id), ...o }));

    let merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    if (filters?.customerId) {
      merged = merged.filter(o => o.customer_id === filters.customerId);
    }
    if (filters?.status && filters.status !== 'All') {
      merged = merged.filter(o => o.order_status === filters.status);
    }
    return merged;
  } catch (err) {
    console.error('Error in getRimiSalesOrders:', err);
    return getLocalRimiSalesOrders();
  }
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
  const orderId = generateUUID();
  const orderNo = `SO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  let totalAmount = 0;
  for (const item of order.items) {
    totalAmount += Number(item.quantity) * Number(item.unit_price);
  }

  const customer = await getRimiCustomerById(order.customer_id);
  const custName = order.customer_name || customer?.business_name || 'Enterprise Customer';
  const custType = order.customer_type || customer?.customer_type || 'Shop / Retailer';

  const payload: RimiSalesOrderRecord = {
    id: orderId,
    order_no: orderNo,
    customer_id: order.customer_id,
    customer_name: custName,
    customer_type: custType,
    assigned_staff_name: order.assigned_staff_name || customer?.assigned_staff_name || '',
    total_amount: totalAmount,
    paid_amount: 0,
    balance_amount: totalAmount,
    order_status: 'Received',
    payment_status: 'Unpaid',
    delivery_date: order.delivery_date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    delivery_address: order.delivery_address || customer?.address || customer?.city || 'Customer Warehouse',
    territory: order.territory || customer?.territory || 'West Zone',
    notes: order.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Cache locally immediately so it appears across UI instantly
  const localOrders = getLocalRimiSalesOrders();
  saveLocalRimiSalesOrders([{ ...payload, items: order.items as any }, ...localOrders.filter(o => o.id !== payload.id)]);

  // 2. Insert to Supabase with fallback for schema differences
  try {
    const { error: orderErr } = await supabase.from('rimi_sales_orders').insert(payload);
    if (orderErr) {
      console.warn('[RimiAPI] Full sales order insert warning, retrying with sanitized payload:', orderErr.message);
      // Strip columns that might not exist in older table versions
      const sanitizedPayload: any = {
        id: payload.id,
        order_no: payload.order_no,
        customer_id: payload.customer_id,
        total_amount: payload.total_amount,
        paid_amount: payload.paid_amount,
        balance_amount: payload.balance_amount,
        order_status: payload.order_status,
        payment_status: payload.payment_status,
        delivery_date: payload.delivery_date,
        delivery_address: payload.delivery_address,
        territory: payload.territory,
        notes: payload.notes,
        created_at: payload.created_at,
        updated_at: payload.updated_at
      };
      const { error: retryErr } = await supabase.from('rimi_sales_orders').insert(sanitizedPayload);
      if (retryErr) {
        console.warn('[RimiAPI] Sanitized order insert notice:', retryErr.message);
      }
    }
  } catch (dbErr) {
    console.warn('[RimiAPI] Supabase sales order insert handled:', dbErr);
  }

  // Insert items and reduce inventory batches
  for (const it of order.items) {
    const itemId = generateUUID();
    const lineTotal = Number(it.quantity) * Number(it.unit_price);

    await supabase.from('rimi_order_items').insert({
      id: itemId,
      order_id: orderId,
      product_id: it.product_id,
      product_name: it.product_name || 'Frozen SKU',
      batch_id: it.batch_id || null,
      batch_no: it.batch_no || '',
      quantity: Number(it.quantity),
      unit: it.unit || 'KG',
      unit_price: Number(it.unit_price),
      total_price: lineTotal
    });

    // Reduce batch inventory if allocated
    if (it.batch_id) {
      const { data: batch } = await supabase
        .from('rimi_inventory_batches')
        .select('quantity')
        .eq('id', it.batch_id)
        .single();

      if (batch) {
        const newQty = Math.max(0, Number(batch.quantity) - Number(it.quantity));
        await supabase
          .from('rimi_inventory_batches')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', it.batch_id);

        await recordRimiStockMovement({
          batch_id: it.batch_id,
          product_id: it.product_id,
          movement_type: 'Dispatch',
          quantity_change: -Number(it.quantity),
          resulting_quantity: newQty,
          order_id: orderId,
          reference_no: orderNo,
          notes: `Dispatched for sales order ${orderNo}`
        });
      }
    }
  }

  // Update customer outstanding amount
  if (customer) {
    const updatedOutstanding = Number(customer.outstanding_amount || 0) + totalAmount;
    await updateRimiCustomer(order.customer_id, {
      outstanding_amount: updatedOutstanding,
      payment_status: updatedOutstanding > (customer.credit_limit || 100000) ? 'Overdue' : 'Current'
    });
  }

  // Auto-record in Customer Activity Timeline
  await addRimiCustomerActivity({
    customer_id: order.customer_id,
    activity_type: 'Order Placed',
    title: `Sales Order Placed (#${orderNo})`,
    description: `Total amount: ₹${totalAmount.toLocaleString('en-IN')} with ${order.items.length} line items. Delivery scheduled for ${payload.delivery_date}.`,
    performed_by: order.assigned_staff_name || 'Sales Staff'
  });

  // Auto-create Delivery Record
  await createRimiDelivery({
    order_id: orderId,
    order_no: orderNo,
    customer_name: custName,
    destination_city: customer?.city || 'Mumbai',
    destination_address: payload.delivery_address,
    vehicle_no: 'MH-04-RF-9021',
    driver_name: 'Rajesh Sharma',
    driver_phone: '+91 98200 44551',
    departure_temp: '-18.5°C'
  });

  triggerLocalSync('ferex_rimi_orders_change');
  return payload;
}

export async function updateRimiSalesOrderStatus(orderId: string, status: RimiSalesOrderRecord['order_status']): Promise<void> {
  await supabase
    .from('rimi_sales_orders')
    .update({ order_status: status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  triggerLocalSync('ferex_rimi_orders_change');
}

export async function deleteRimiSalesOrder(orderId: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_sales_orders').delete().eq('id', orderId);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_orders_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PAYMENTS & COLLECTIONS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiPayments(filters?: { customerId?: string; orderId?: string }): Promise<RimiPaymentRecord[]> {
  try {
    let query = supabase
      .from('rimi_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters?.orderId) query = query.eq('order_id', filters.orderId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RimiPaymentRecord[];
  } catch {
    return [];
  }
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
}): Promise<RimiPaymentRecord> {
  const newId = generateUUID();
  const paymentNo = `PAY-RF-${Date.now().toString().slice(-6)}`;
  const customer = await getRimiCustomerById(payment.customer_id);
  const custName = payment.customer_name || customer?.business_name || 'Customer';

  const payload: RimiPaymentRecord = {
    id: newId,
    payment_no: paymentNo,
    customer_id: payment.customer_id,
    customer_name: custName,
    order_id: payment.order_id || undefined,
    order_no: payment.order_no || '',
    amount: Number(payment.amount),
    payment_method: payment.payment_method || 'Bank Transfer',
    reference_no: payment.reference_no || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
    payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
    collected_by_name: payment.collected_by_name || 'Finance Lead',
    receipt_url: payment.receipt_url || '',
    notes: payment.notes || '',
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('rimi_payments').insert(payload);
  if (error) throw error;

  // Update order if attached
  if (payment.order_id) {
    const { data: order } = await supabase
      .from('rimi_sales_orders')
      .select('total_amount, paid_amount')
      .eq('id', payment.order_id)
      .single();

    if (order) {
      const newPaid = Number(order.paid_amount || 0) + Number(payment.amount);
      const newBalance = Math.max(0, Number(order.total_amount) - newPaid);
      const paymentStatus = newBalance === 0 ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Unpaid');

      await supabase
        .from('rimi_sales_orders')
        .update({
          paid_amount: newPaid,
          balance_amount: newBalance,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);
    }
  }

  // Update customer outstanding amount
  if (customer) {
    const updatedOutstanding = Math.max(0, Number(customer.outstanding_amount || 0) - Number(payment.amount));
    await updateRimiCustomer(payment.customer_id, {
      outstanding_amount: updatedOutstanding,
      payment_status: updatedOutstanding === 0 ? 'Current' : customer.payment_status
    });
  }

  // Log in customer activity timeline
  await addRimiCustomerActivity({
    customer_id: payment.customer_id,
    activity_type: 'Payment Received',
    title: `Payment Received (₹${Number(payment.amount).toLocaleString('en-IN')})`,
    description: `Method: ${payload.payment_method} | Ref: ${payload.reference_no} | Order: ${payload.order_no || 'Direct Ledger Credit'}`,
    performed_by: payload.collected_by_name || 'Finance Team'
  });

  triggerLocalSync('ferex_rimi_payments_change');
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DELIVERIES & FLEET API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiDeliveries(): Promise<RimiDeliveryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('rimi_deliveries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as RimiDeliveryRecord[];
  } catch {
    return [];
  }
}

export async function createRimiDelivery(delivery: Partial<RimiDeliveryRecord>): Promise<RimiDeliveryRecord> {
  const newId = generateUUID();
  const deliveryNo = `DEL-${Date.now().toString().slice(-6)}`;
  const payload: RimiDeliveryRecord = {
    id: newId,
    delivery_no: deliveryNo,
    order_id: delivery.order_id || '',
    order_no: delivery.order_no || '',
    customer_name: delivery.customer_name || 'Customer',
    destination_city: delivery.destination_city || 'Mumbai',
    destination_address: delivery.destination_address || '',
    vehicle_id: delivery.vehicle_id || undefined,
    vehicle_no: delivery.vehicle_no || 'MH-04-RF-9021',
    driver_name: delivery.driver_name || 'Rajesh Sharma',
    driver_phone: delivery.driver_phone || '+91 98200 44551',
    departure_temp: delivery.departure_temp || '-18.5°C',
    arrival_temp: delivery.arrival_temp || '-18.0°C',
    delivery_status: 'Assigned',
    dispatch_time: new Date().toISOString(),
    route_name: delivery.route_name || 'Mumbai Express Cold Corridor',
    notes: delivery.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('rimi_deliveries').insert(payload);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_deliveries_change');
  return payload;
}

export async function updateRimiDeliveryStatus(deliveryId: string, status: RimiDeliveryRecord['delivery_status']): Promise<void> {
  const updates: any = {
    delivery_status: status,
    updated_at: new Date().toISOString()
  };
  if (status === 'Delivered') {
    updates.delivered_at = new Date().toISOString();
  }
  await supabase.from('rimi_deliveries').update(updates).eq('id', deliveryId);
  triggerLocalSync('ferex_rimi_deliveries_change');
}

const RIMI_VEHICLES_STORAGE_KEY = 'ferex_rimi_vehicles_catalog';

function getLocalRimiVehicles(): RimiVehicleRecord[] {
  try {
    const raw = localStorage.getItem(RIMI_VEHICLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalRimiVehicles(vehicles: RimiVehicleRecord[]) {
  try {
    localStorage.setItem(RIMI_VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
  } catch {}
}

export async function getRimiVehicles(): Promise<RimiVehicleRecord[]> {
  try {
    let dbVehicles: RimiVehicleRecord[] = [];
    try {
      const { data, error } = await supabase
        .from('rimi_vehicles')
        .select('*');
      if (!error && Array.isArray(data)) {
        dbVehicles = data.map((v: any) => ({
          ...v,
          vehicle_no: v.vehicle_number || v.vehicle_no,
          vehicle_number: v.vehicle_number || v.vehicle_no,
          capacity_tonnes: Number(v.capacity_tonnes || v.capacity_metric_tons || 14),
          capacity_metric_tons: Number(v.capacity_tonnes || v.capacity_metric_tons || 14),
        })) as RimiVehicleRecord[];
      }
    } catch (err) {
      console.warn('[RimiAPI] Supabase getRimiVehicles fallback notice:', err);
    }

    const local = getLocalRimiVehicles();
    const map = new Map<string, RimiVehicleRecord>();
    local.forEach(v => map.set(v.id, v));
    dbVehicles.forEach(v => map.set(v.id, v));

    const merged = Array.from(map.values()).sort((a, b) => ((a.vehicle_number || a.vehicle_no || '')).localeCompare(b.vehicle_number || b.vehicle_no || ''));
    if (merged.length > 0 && local.length === 0) {
      saveLocalRimiVehicles(merged);
    }
    return merged;
  } catch {
    return getLocalRimiVehicles();
  }
}

export async function createRimiVehicle(vehicle: Partial<RimiVehicleRecord>): Promise<RimiVehicleRecord> {
  const newId = generateUUID();
  const vNo = (vehicle.vehicle_number || vehicle.vehicle_no)?.trim() || `MH-${Math.floor(10 + Math.random() * 89)}-RF-${Math.floor(1000 + Math.random() * 9000)}`;
  const cap = Number(vehicle.capacity_tonnes || vehicle.capacity_metric_tons) || 14.0;
  const temp = Number(vehicle.current_temp_celsius) || -18.0;

  const payload: RimiVehicleRecord = {
    id: newId,
    vehicle_no: vNo,
    vehicle_number: vNo,
    model: vehicle.model || `${cap}-Ton Ultra Cold Reefer`,
    capacity_metric_tons: cap,
    capacity_tonnes: cap,
    min_temp_celsius: Number(vehicle.min_temp_celsius) || -25.0,
    current_temp_celsius: temp,
    driver_name: vehicle.driver_name || 'Assigned Driver',
    driver_phone: vehicle.driver_phone || '+91 98200 00000',
    status: vehicle.status || 'Stationed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const dbPayload = {
      id: payload.id,
      vehicle_number: vNo,
      driver_name: payload.driver_name,
      driver_phone: payload.driver_phone,
      capacity_tonnes: cap,
      current_temp_celsius: temp,
      status: payload.status,
      created_at: payload.created_at,
      updated_at: payload.updated_at
    };
    await supabase.from('rimi_vehicles').insert(dbPayload);
  } catch (err) {
    console.warn('[RimiAPI] Supabase vehicle insert notice:', err);
  }

  const current = getLocalRimiVehicles();
  const updated = [payload, ...current.filter(v => v.id !== payload.id && (v.vehicle_number !== vNo && v.vehicle_no !== vNo))];
  saveLocalRimiVehicles(updated);

  triggerLocalSync('ferex_rimi_vehicles_change');
  return payload;
}

export async function getRimiDeliveryRoutes(): Promise<RimiDeliveryRouteRecord[]> {
  try {
    const { data, error } = await supabase
      .from('rimi_delivery_routes')
      .select('*')
      .order('route_name', { ascending: true });
    if (error) throw error;
    return (data || []) as RimiDeliveryRouteRecord[];
  } catch {
    return [];
  }
}

export async function createRimiDeliveryRoute(route: Partial<RimiDeliveryRouteRecord>): Promise<RimiDeliveryRouteRecord> {
  const newId = generateUUID();
  const payload: RimiDeliveryRouteRecord = {
    id: newId,
    route_code: route.route_code || `RT-RF-${Date.now().toString().slice(-4)}`,
    route_name: route.route_name || 'Mumbai - Pune Cold Corridor',
    region: route.region || 'West Zone',
    origin_facility: route.origin_facility || 'Mumbai Central Cold Storage',
    destinations: route.destinations || ['Navi Mumbai', 'Thane', 'Pune'],
    distance_km: Number(route.distance_km) || 150,
    estimated_transit_hours: Number(route.estimated_transit_hours) || 3.5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('rimi_delivery_routes').insert(payload);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_routes_change');
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. COLD WAREHOUSES & FACILITIES API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiWarehouses(): Promise<RimiWarehouseRecord[]> {
  try {
    const { data, error } = await supabase
      .from('rimi_warehouses')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;

    // Calculate actual occupied pallets from active batches
    const { data: batches } = await supabase
      .from('rimi_inventory_batches')
      .select('warehouse_id, quantity');

    const palletUsageMap = new Map<string, number>();
    if (Array.isArray(batches)) {
      for (const b of batches) {
        if (b.warehouse_id) {
          // Approx 1 pallet = 500 KG
          const pallets = Math.ceil(Number(b.quantity || 0) / 500);
          palletUsageMap.set(b.warehouse_id, (palletUsageMap.get(b.warehouse_id) || 0) + pallets);
        }
      }
    }

    return (data || []).map(w => ({
      ...w,
      utilized_pallets: palletUsageMap.get(w.id) || w.utilized_pallets || 0
    })) as RimiWarehouseRecord[];
  } catch {
    return [];
  }
}

export async function createRimiWarehouse(warehouse: Partial<RimiWarehouseRecord>): Promise<RimiWarehouseRecord> {
  const newId = generateUUID();
  const payload: RimiWarehouseRecord = {
    id: newId,
    code: warehouse.code || `WH-RF-${Date.now().toString().slice(-4)}`,
    name: warehouse.name || 'Cold Storage Facility',
    city: warehouse.city || 'Mumbai',
    address: warehouse.address || '',
    cold_room_temp_celsius: Number(warehouse.cold_room_temp_celsius) || -22.0,
    total_capacity_pallets: Number(warehouse.total_capacity_pallets) || 1000,
    utilized_pallets: 0,
    manager_name: warehouse.manager_name || 'Hub Operations Lead',
    manager_phone: warehouse.manager_phone || '+91 98200 11223',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('rimi_warehouses').insert(payload);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_warehouses_change');
  return payload;
}

export async function updateRimiWarehouse(id: string, updates: Partial<RimiWarehouseRecord>): Promise<RimiWarehouseRecord> {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('rimi_warehouses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  triggerLocalSync('ferex_rimi_warehouses_change');
  return data;
}

export async function deleteRimiWarehouse(id: string): Promise<boolean> {
  const { error } = await supabase.from('rimi_warehouses').delete().eq('id', id);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_warehouses_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. TASKS & WORK ASSIGNMENTS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRimiTasks(filters?: {
  staffEmail?: string;
  status?: string;
}): Promise<RimiTaskRecord[]> {
  try {
    let query = supabase
      .from('rimi_tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (filters?.staffEmail) {
      query = query.or(`assigned_staff_email.ilike.%${filters.staffEmail}%,assigned_staff_name.ilike.%${filters.staffEmail}%,assigned_to_name.ilike.%${filters.staffEmail}%`);
    }
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    const directTasks: RimiTaskRecord[] = (data || []).map((t: any) => {
      const isCentral = t.created_by === 'Central Admin' ||
        (t.created_by && t.created_by.toLowerCase().includes('central')) ||
        (t.description && t.description.toLowerCase().includes('central admin')) ||
        (t.title && t.title.toLowerCase().includes('central admin'));
      return {
        ...t,
        created_by: isCentral ? 'Central Admin' : (t.created_by || 'Rimi Admin'),
        is_central_directive: isCentral,
      };
    });

    // Also fetch any tasks from central tasks table with category Rimi
    let centralTasks: RimiTaskRecord[] = [];
    try {
      let cQuery = supabase
        .from('tasks')
        .select('*')
        .or('category.ilike.%rimi%,category.eq.Rimi')
        .order('created_at', { ascending: false });

      if (filters?.staffEmail) {
        cQuery = cQuery.or(`assigned_to.ilike.%${filters.staffEmail}%,assigned_staff_id.eq.${filters.staffEmail}`);
      }
      if (filters?.status && filters.status !== 'All') {
        const cStatus = filters.status === 'Completed' ? 'Completed' : filters.status === 'In Progress' ? 'In Progress' : 'Pending';
        cQuery = cQuery.eq('status', cStatus);
      }

      const { data: cData } = await cQuery;
      if (Array.isArray(cData)) {
        centralTasks = cData.map((c: any) => {
          return {
            id: c.id,
            title: c.title,
            description: c.description || 'Directive from Central Admin',
            task_type: 'Delivery',
            category: 'Dispatch & Logistics',
            priority: (c.priority === 'Critical' ? 'Urgent' : (c.priority || 'Medium')) as any,
            status: (c.status === 'Completed' ? 'Completed' : c.status === 'In Progress' ? 'In Progress' : 'Pending') as any,
            assigned_staff_name: c.assigned_to || 'Rimi Staff',
            assigned_staff_email: c.assigned_to && c.assigned_to.includes('@') ? c.assigned_to : `${(c.assigned_to || 'staff').toLowerCase().replace(/\s+/g, '')}@ferex.com`,
            assigned_to_name: c.assigned_to || 'Rimi Staff',
            assigned_staff_id: c.assigned_staff_id,
            due_date: c.due_date || new Date().toISOString().split('T')[0],
            created_by: 'Central Admin',
            is_central_directive: true,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: c.updated_at || new Date().toISOString(),
          };
        });
      }
    } catch (cErr) {
      console.warn('[RimiAPI] Central tasks fetch notice:', cErr);
    }

    // Merge and deduplicate by ID
    const mergedMap = new Map<string, RimiTaskRecord>();
    for (const t of directTasks) {
      mergedMap.set(t.id, t);
    }
    for (const ct of centralTasks) {
      if (!mergedMap.has(ct.id)) {
        mergedMap.set(ct.id, ct);
      } else {
        const existing = mergedMap.get(ct.id)!;
        mergedMap.set(ct.id, { ...existing, is_central_directive: true, created_by: 'Central Admin' });
      }
    }

    return Array.from(mergedMap.values());
  } catch {
    return [];
  }
}

export async function createRimiTask(task: Partial<RimiTaskRecord>): Promise<RimiTaskRecord> {
  const newId = generateUUID();
  const payload: RimiTaskRecord = {
    id: newId,
    title: task.title?.trim() || 'New Operational Task',
    description: task.description || '',
    task_type: task.task_type || 'Delivery',
    priority: task.priority || 'Medium',
    status: 'Pending',
    assigned_staff_name: task.assigned_staff_name || '',
    assigned_staff_email: task.assigned_staff_email || '',
    assigned_staff_id: task.assigned_staff_id || undefined,
    customer_id: task.customer_id || undefined,
    customer_name: task.customer_name || '',
    order_id: task.order_id || undefined,
    due_date: task.due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    created_by: task.created_by || 'Admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('rimi_tasks').insert(payload);
  if (error) throw error;
  triggerLocalSync('ferex_rimi_tasks_change');
  return payload;
}

export async function updateRimiTaskStatus(taskId: string, status: RimiTaskRecord['status']): Promise<void> {
  const now = new Date().toISOString();
  const updates: any = { status, updated_at: now };
  if (status === 'Completed') {
    updates.completed_at = now;
  }
  await Promise.allSettled([
    supabase.from('rimi_tasks').update(updates).eq('id', taskId),
    supabase.from('tasks').update({ status: status === 'Completed' ? 'Completed' : status === 'In Progress' ? 'In Progress' : 'Pending', updated_at: now }).eq('id', taskId)
  ]);
  triggerLocalSync('ferex_rimi_tasks_change');
  triggerLocalSync('ferex_tasks_change');
}

export async function deleteRimiTask(taskId: string): Promise<boolean> {
  await Promise.allSettled([
    supabase.from('rimi_tasks').delete().eq('id', taskId),
    supabase.from('tasks').delete().eq('id', taskId)
  ]);
  triggerLocalSync('ferex_rimi_tasks_change');
  triggerLocalSync('ferex_tasks_change');
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. LIVE DASHBOARD & ANALYTICS TELEMETRY ENGINE
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

export async function getRimiDashboardMetrics(staffEmail?: string): Promise<RimiDashboardMetrics> {
  try {
    const [customers, orders, batches, deliveries, warehouses, activities] = await Promise.all([
      getRimiCustomers(staffEmail ? { staffEmail } : undefined),
      getRimiSalesOrders(staffEmail ? { staffEmail } : undefined),
      getRimiBatches(),
      getRimiDeliveries(),
      getRimiWarehouses(),
      supabase.from('rimi_customer_activity').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    const activeDistributors = customers.filter(c => c.customer_type === 'Distributor').length;
    const activeShops = customers.filter(c => c.customer_type === 'Shop / Retailer').length;
    const activeWholesalers = customers.filter(c => c.customer_type === 'Wholesaler').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const ordersToday = orders.filter(o => o.created_at.startsWith(todayStr)).length;
    const pendingDeliveries = deliveries.filter(d => d.delivery_status !== 'Delivered' && d.delivery_status !== 'Returned').length;

    let outstandingPayments = 0;
    for (const c of customers) {
      outstandingPayments += Number(c.outstanding_amount || 0);
    }

    const lowStockCount = batches.filter(b => b.status === 'Low Stock' || b.quantity <= 20).length;
    const expiringBatchesCount = batches.filter(b => b.status === 'Expiring Soon' || (b.days_to_expiry! > 0 && b.days_to_expiry! <= 30)).length;

    let totalCapacity = 0;
    let utilizedCapacity = 0;
    for (const w of warehouses) {
      totalCapacity += Number(w.total_capacity_pallets || 0);
      utilizedCapacity += Number(w.utilized_pallets || 0);
    }

    const utilizationPct = totalCapacity > 0 ? Math.round((utilizedCapacity / totalCapacity) * 100) : 0;

    return {
      totalCustomers: customers.length,
      activeDistributors,
      activeShops,
      activeWholesalers,
      ordersToday,
      pendingDeliveries,
      outstandingPayments,
      lowStockCount,
      expiringBatchesCount,
      totalStorageCapacity: totalCapacity,
      utilizedStorageCapacity: utilizedCapacity,
      storageUtilizationPercentage: utilizationPct,
      recentOrders: orders.slice(0, 5),
      recentActivities: (activities.data || []) as RimiCustomerActivityRecord[],
      warehouses
    };
  } catch (err) {
    console.error('Error calculating Rimi dashboard metrics:', err);
    return {
      totalCustomers: 0,
      activeDistributors: 0,
      activeShops: 0,
      activeWholesalers: 0,
      ordersToday: 0,
      pendingDeliveries: 0,
      outstandingPayments: 0,
      lowStockCount: 0,
      expiringBatchesCount: 0,
      totalStorageCapacity: 0,
      utilizedStorageCapacity: 0,
      storageUtilizationPercentage: 0,
      recentOrders: [],
      recentActivities: [],
      warehouses: []
    };
  }
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

export async function getRimiAnalyticsMetrics(): Promise<RimiAnalyticsMetrics> {
  try {
    const [orders, customers, batches, payments, products] = await Promise.all([
      getRimiSalesOrders(),
      getRimiCustomers(),
      getRimiBatches(),
      getRimiPayments(),
      getRimiProducts()
    ]);

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    for (const o of orders) {
      totalRevenue += Number(o.total_amount || 0);
      totalCollected += Number(o.paid_amount || 0);
    }
    for (const c of customers) {
      totalOutstanding += Number(c.outstanding_amount || 0);
    }

    // Category distribution from order items
    const catRevenueMap = new Map<string, number>();
    const prodMap = new Map<string, RimiProductRecord>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    const prodSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const ord of orders) {
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const p = prodMap.get(it.product_id);
          const cat = p?.category || 'Frozen Seafood';
          catRevenueMap.set(cat, (catRevenueMap.get(cat) || 0) + Number(it.total_price || 0));

          const curProd = prodSalesMap.get(it.product_id) || { name: it.product_name || p?.name || 'Item', quantity: 0, revenue: 0 };
          curProd.quantity += Number(it.quantity || 0);
          curProd.revenue += Number(it.total_price || 0);
          prodSalesMap.set(it.product_id, curProd);
        }
      }
    }

    const categorySalesDistribution = Array.from(catRevenueMap.entries()).map(([category, value]) => ({
      category,
      value,
      percentage: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0
    }));

    // Regional customer distribution
    const regionMap = new Map<string, { count: number; volume: number }>();
    for (const c of customers) {
      const reg = c.territory || 'West Zone';
      const cur = regionMap.get(reg) || { count: 0, volume: 0 };
      cur.count += 1;
      cur.volume += Number(c.outstanding_amount || 0);
      regionMap.set(reg, cur);
    }

    const regionalCustomerDistribution = Array.from(regionMap.entries()).map(([region, val]) => ({
      region,
      count: val.count,
      volume: val.volume
    }));

    const topSellingProducts = Array.from(prodSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Batch expiry risks (< 30 days)
    const batchExpiryRisks = batches
      .filter(b => b.days_to_expiry! <= 30 && b.quantity > 0)
      .map(b => {
        const p = prodMap.get(b.product_id);
        const price = p?.unit_price || 200;
        return {
          batch_no: b.batch_no,
          product_name: b.product_name,
          quantity: b.quantity,
          expiry_date: b.expiry_date,
          days_left: b.days_to_expiry!,
          risk_value: Number(b.quantity) * Number(price)
        };
      })
      .sort((a, b) => a.days_left - b.days_left);

    return {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      totalOrdersCount: orders.length,
      categorySalesDistribution,
      regionalCustomerDistribution,
      topSellingProducts,
      batchExpiryRisks
    };
  } catch (err) {
    console.error('Error calculating Rimi analytics metrics:', err);
    return {
      totalRevenue: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalOrdersCount: 0,
      categorySalesDistribution: [],
      regionalCustomerDistribution: [],
      topSellingProducts: [],
      batchExpiryRisks: []
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility Helpers & Types
// ─────────────────────────────────────────────────────────────────────────────

export type RimiTask = RimiTaskRecord;
export type RimiStaffMember = { id: string; name: string; email: string; role: string; department?: string; status?: string };

export async function getRimiStaffList(): Promise<RimiStaffMember[]> {
  const staff = await getRimiStaffMembers();
  return staff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    department: 'Cold Chain Logistics',
    status: 'Active'
  }));
}

export async function updateRimiTask(id: string, updates: Partial<RimiTaskRecord>): Promise<RimiTaskRecord | null> {
  try {
    const { data, error } = await supabase
      .from('rimi_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex_rimi_tasks_change'));
    return data;
  } catch (err) {
    console.error('Error updating Rimi task:', err);
    return null;
  }
}

export async function reassignRimiTask(taskId: string, staffId: string, staffName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rimi_tasks')
      .update({ assigned_to_id: staffId, assigned_to_name: staffName, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex_rimi_tasks_change'));
    return true;
  } catch (err) {
    console.error('Error reassigning Rimi task:', err);
    return false;
  }
}

export async function renameRimiTaskTitle(taskId: string, newTitle: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rimi_tasks')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex_rimi_tasks_change'));
    return true;
  } catch (err) {
    console.error('Error renaming Rimi task:', err);
    return false;
  }
}

// Categories helper
export async function getRimiProductCategories(): Promise<string[]> {
  try {
    const { data } = await supabase.from('rimi_products').select('category');
    const dbCats = Array.from(new Set((data || []).map((d: any) => d.category).filter(Boolean)));
    const defaultCats = ['Frozen Seafood', 'Poultry & Meat', 'Frozen Veg & Snacks', 'Dairy & Ice Cream'];
    const merged = Array.from(new Set([...defaultCats, ...dbCats]));
    return merged;
  } catch (err) {
    return ['Frozen Seafood', 'Poultry & Meat', 'Frozen Veg & Snacks', 'Dairy & Ice Cream'];
  }
}

export async function createRimiProductCategory(category: string): Promise<string[]> {
  const current = await getRimiProductCategories();
  const updated = Array.from(new Set([...current, category]));
  window.dispatchEvent(new CustomEvent('ferex_rimi_categories_change'));
  return updated;
}

export async function deleteRimiProductCategory(category: string): Promise<string[]> {
  const current = await getRimiProductCategories();
  const updated = current.filter(c => c !== category);
  window.dispatchEvent(new CustomEvent('ferex_rimi_categories_change'));
  return updated;
}

// Vehicle helpers
export async function updateRimiVehicleStatus(id: string, status: string): Promise<boolean> {
  try {
    await supabase
      .from('rimi_vehicles')
      .update({ status })
      .or(`id.eq.${id},vehicle_number.eq.${id}`);
  } catch (err) {
    console.warn('[RimiAPI] Error updating vehicle status in Supabase:', err);
  }

  const current = getLocalRimiVehicles();
  const updated = current.map(v => (v.id === id || v.vehicle_number === id || v.vehicle_no === id) ? { ...v, status: status as any, updated_at: new Date().toISOString() } : v);
  saveLocalRimiVehicles(updated);

  window.dispatchEvent(new CustomEvent('ferex_rimi_vehicles_change'));
  return true;
}

export async function deleteRimiVehicle(id: string): Promise<boolean> {
  try {
    await supabase
      .from('rimi_vehicles')
      .delete()
      .or(`id.eq.${id},vehicle_number.eq.${id}`);
  } catch (err) {
    console.warn('[RimiAPI] Error deleting vehicle from Supabase:', err);
  }

  const current = getLocalRimiVehicles();
  const filtered = current.filter(v => v.id !== id && v.vehicle_number !== id && v.vehicle_no !== id);
  saveLocalRimiVehicles(filtered);

  window.dispatchEvent(new CustomEvent('ferex_rimi_vehicles_change'));
  return true;
}

// Distributor compatibility helper
export async function getRimiDistributors(staffEmail?: string): Promise<RimiCustomerRecord[]> {
  return getRimiCustomers({ staffEmail });
}

export async function reassignRimiCustomerStaff(customerId: string, staffName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rimi_customers')
      .update({
        assigned_staff_name: staffName,
        assigned_staff_email: staffEmail || `${staffName.toLowerCase().replace(/\s+/g, '.')}@ferex.com`,
        assigned_staff_id: staffId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (error) {
      await supabase
        .from('rimi_distributors')
        .update({
          assigned_sales_staff: staffName,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
    }

    triggerLocalSync('ferex_rimi_customers_change');
    triggerLocalSync('ferex_rimi_distributors_change');
    return true;
  } catch (err) {
    console.error('[RimiAPI] Error reassigning customer staff:', err);
    throw err;
  }
}

// Messages & Notifications helpers
export async function getRimiMessages(): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('rimi_customer_activity')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function sendRimiMessage(msg: any): Promise<boolean> {
  try {
    if (msg.customerId) {
      await addRimiCustomerActivity({
        customer_id: msg.customerId,
        activity_type: 'Note',
        title: msg.text || 'Message sent',
        performed_by: msg.sender || 'Staff'
      });
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function getRimiNotifications(): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('rimi_customer_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    return (data || []).map((d: any) => ({
      id: d.id,
      title: `${d.activity_type}: ${d.title}`,
      description: d.description || '',
      created_at: d.created_at,
      is_read: false,
      category: 'Cold Chain Operations'
    }));
  } catch (err) {
    return [];
  }
}

export async function markRimiNotificationRead(id: string): Promise<boolean> {
  return true;
}

export async function createRimiNotification(notification: any): Promise<boolean> {
  try {
    await addRimiCustomerActivity({
      customer_id: 'system',
      activity_type: 'Status Update',
      title: notification.title || 'System Notification',
      description: notification.description,
      performed_by: 'System'
    });
    return true;
  } catch (err) {
    return false;
  }
}

