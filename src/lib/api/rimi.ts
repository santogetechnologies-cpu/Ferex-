import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Rimi Product Categories API ─────────────────────────────────────────────
const DEFAULT_RIMI_CATEGORIES = [
  'Frozen Seafood',
  'Frozen Meat & Poultry',
  'Frozen Vegetables',
  'Processed Food',
  'Ice Cream & Dairy',
  'Bakery & Pastries',
  'Ready-to-Eat Meals',
  'IQF Fruits & Berries',
];

export async function getRimiProductCategories(): Promise<string[]> {
  const catSet = new Set<string>(DEFAULT_RIMI_CATEGORIES);

  try {
    const local = localStorage.getItem('ferex_rimi_categories');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        parsed.forEach((c: any) => {
          if (typeof c === 'string' && c.trim()) catSet.add(c.trim());
        });
      }
    }
  } catch {}

  // Merge any categories currently present in products
  try {
    const prods = await getRimiProducts();
    if (Array.isArray(prods)) {
      prods.forEach((p: any) => {
        if (p.category && typeof p.category === 'string' && p.category.trim()) {
          catSet.add(p.category.trim());
        }
      });
    }
  } catch {}

  return Array.from(catSet);
}

export async function createRimiProductCategory(categoryName: string): Promise<string[]> {
  const trimmed = (categoryName || '').trim();
  if (!trimmed) return await getRimiProductCategories();

  const current = await getRimiProductCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('ferex_rimi_categories', JSON.stringify(updated));
    } catch {}
    triggerLocalSync('ferex_rimi_categories_change');
    return updated;
  }
  return current;
}

export async function deleteRimiProductCategory(categoryName: string): Promise<string[]> {
  const trimmed = (categoryName || '').trim();
  const current = await getRimiProductCategories();
  const updated = current.filter(c => c !== trimmed);
  try {
    localStorage.setItem('ferex_rimi_categories', JSON.stringify(updated));
  } catch {}
  triggerLocalSync('ferex_rimi_categories_change');
  return updated;
}

// ─── Rimi Products API ───────────────────────────────────────────────────────
export async function getRimiProducts() {
  try {
    const { data, error } = await supabase
      .from('rimi_products')
      .select('*')
      .order('name', { ascending: true });

    const local = localStorage.getItem('ferex_rimi_products');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.sku && m.sku === item.sku))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_products', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  const updated = current.map((p: any) => (p.id === id || p.rawId === id || p.sku === id) ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
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
  const updated = current.filter((p: any) => p.id !== id && p.rawId !== id && p.sku !== id);
  try { localStorage.setItem('ferex_rimi_products', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_products').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_products_change');
  return true;
}

// ─── Rimi Inventory Stock API ────────────────────────────────────────────────
export async function getRimiInventory() {
  try {
    const { data, error } = await supabase
      .from('rimi_inventory')
      .select('*, product:rimi_products(*)')
      .order('updated_at', { ascending: false });

    const local = localStorage.getItem('ferex_rimi_inventory');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.batch_number && m.batch_number === item.batch_number))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  reserved_quantity?: number;
  low_stock_threshold?: number;
  mfg_date?: string;
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
    reserved_quantity: Number(item.reserved_quantity) || 0,
    low_stock_threshold: Number(item.low_stock_threshold) || 50,
    mfg_date: item.mfg_date || item.production_date || new Date().toISOString().split('T')[0],
    production_date: item.production_date || item.mfg_date || new Date().toISOString().split('T')[0],
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
  const updated = current.map((i: any) => (i.id === id || i.rawId === id || i.batch_number === id) ? { ...i, quantity_on_hand, updated_at: new Date().toISOString() } : i);
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
  const updated = current.filter((i: any) => i.id !== id && i.rawId !== id && i.batch_number !== id);
  try { localStorage.setItem('ferex_rimi_inventory', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_inventory').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_inventory_change');
  return true;
}

// ─── Customer CRM Types & Interfaces ─────────────────────────────────────────

export type RimiCustomerType = 'Distributor' | 'Wholesaler' | 'RetailShop' | 'Shop';

export type RimiPipelineStage = string; // Now loaded from masters.ts — configurable

export interface RimiActivityNote {
  id: string;
  type: 'call' | 'visit' | 'complaint' | 'note';
  text: string;
  author: string;
  created_at: string;
}

export interface RimiAssignmentHistoryEntry {
  staff_id: string;
  staff_name: string;
  assigned_by: string;
  assigned_at: string;
  notes?: string;
}

export interface RimiCustomer {
  id: string;
  customer_type: RimiCustomerType;
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  territory?: string;
  tier?: string; // backwards compat
  // Products
  products_distributed?: string[];
  preferred_products?: string[];
  products_ordered?: string[];
  // Financials
  credit_period_days?: number;
  credit_limit?: number;
  outstanding_balance?: number;
  order_history_volume?: string;
  order_volume?: string;
  order_frequency?: string;
  payment_terms?: string;
  payment_status: 'Up to Date' | 'Pending' | 'Overdue' | 'Advance Paid';
  // Relationships
  supplying_distributor?: string;
  // Assignment
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assignment_history?: RimiAssignmentHistoryEntry[];
  // CRM
  pipeline_stage: RimiPipelineStage;
  notes: RimiActivityNote[];
  tags: string[];
  status: 'Active' | 'Inactive' | 'Prospect';
  // Audit
  is_deleted?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Customer Seed Data (Empty — database-driven) ────────────────────────────
const DEFAULT_CUSTOMERS_SEED: RimiCustomer[] = [];


// ─── Rimi Customer API Functions ──────────────────────────────────────────────

export async function getRimiCustomers(filters?: {
  type?: string;
  search?: string;
  region?: string;
  payment_status?: string;
  assigned_staff?: string;
  stage?: string;
  tag?: string;
  staffOnlyId?: string;
}): Promise<RimiCustomer[]> {
  try {
    let customers: RimiCustomer[] = [];

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('rimi_customers')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        customers = data;
        try { localStorage.setItem('ferex_rimi_crm_customers', JSON.stringify(customers)); } catch {}
      }
    } catch {}

    // Fallback to localStorage
    if (customers.length === 0) {
      const local = localStorage.getItem('ferex_rimi_crm_customers');
      if (local) {
        try { customers = JSON.parse(local); } catch {}
      }
    }

    // Filter out soft-deleted
    customers = customers.filter(c => !c.is_deleted);

    // Apply filtering
    let filtered = [...customers];

    if (filters?.staffOnlyId) {
      filtered = filtered.filter(c => c.assigned_staff_id === filters.staffOnlyId || c.assigned_staff_name === filters.staffOnlyId);
    }

    if (filters?.type && filters.type !== 'All') {
      filtered = filtered.filter(c => c.customer_type.toLowerCase() === filters.type!.toLowerCase());
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.business_name.toLowerCase().includes(q) ||
        c.contact_person.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    }

    if (filters?.region && filters.region !== 'All') {
      filtered = filtered.filter(c => c.region.toLowerCase().includes(filters.region!.toLowerCase()));
    }

    if (filters?.payment_status && filters.payment_status !== 'All') {
      filtered = filtered.filter(c => c.payment_status === filters.payment_status);
    }

    if (filters?.stage && filters.stage !== 'All') {
      filtered = filtered.filter(c => c.pipeline_stage === filters.stage);
    }

    if (filters?.tag && filters.tag !== 'All') {
      filtered = filtered.filter(c => c.tags.includes(filters.tag!));
    }

    if (filters?.assigned_staff && filters.assigned_staff !== 'All') {
      filtered = filtered.filter(c => c.assigned_staff_name === filters.assigned_staff || c.assigned_staff_id === filters.assigned_staff);
    }

    return filtered;
  } catch {
    return [];
  }
}

export async function createRimiCustomer(cust: Partial<RimiCustomer> & { created_by?: string }): Promise<RimiCustomer> {
  const current = await getRimiCustomers();
  const type = (cust.customer_type || 'Distributor') as RimiCustomerType;
  const prefix = type === 'Distributor' ? 'DST' : type === 'Wholesaler' ? 'WHL' : 'RET';

  const payload: RimiCustomer = {
    id: cust.id || `CUST-${prefix}-${Date.now()}`,
    customer_type: type,
    business_name: cust.business_name || '',
    contact_person: cust.contact_person || '',
    phone: cust.phone || '',
    email: cust.email || '',
    address: cust.address || '',
    region: cust.region || '',
    territory: cust.territory,
    products_distributed: cust.products_distributed || [],
    order_history_volume: cust.order_history_volume || '',
    credit_period_days: Number(cust.credit_period_days) || 30,
    credit_limit: Number(cust.credit_limit) || 0,
    outstanding_balance: Number(cust.outstanding_balance) || 0,
    supplying_distributor: cust.supplying_distributor || '',
    order_frequency: cust.order_frequency || '',
    preferred_products: cust.preferred_products || [],
    order_volume: cust.order_volume || '',
    products_ordered: cust.products_ordered || [],
    payment_terms: cust.payment_terms || '',
    payment_status: (cust.payment_status as any) || 'Up to Date',
    assigned_staff_id: cust.assigned_staff_id || '',
    assigned_staff_name: cust.assigned_staff_name || '',
    assignment_history: cust.assigned_staff_id ? [{
      staff_id: cust.assigned_staff_id,
      staff_name: cust.assigned_staff_name || '',
      assigned_by: cust.created_by || 'Admin',
      assigned_at: new Date().toISOString(),
    }] : [],
    pipeline_stage: cust.pipeline_stage || 'Lead',
    notes: cust.notes || [],
    tags: cust.tags || [],
    status: cust.status || 'Active',
    is_deleted: false,
    created_by: cust.created_by || '',
    updated_by: cust.created_by || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [payload, ...current.filter(c => c.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_crm_customers', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_customers').insert({ ...payload, notes: JSON.stringify(payload.notes), tags: JSON.stringify(payload.tags) }); } catch {}
  triggerLocalSync('ferex_rimi_crm_customers_change');
  return payload;
}

export async function updateRimiCustomer(id: string, updates: Partial<RimiCustomer>): Promise<RimiCustomer | null> {
  const current = await getRimiCustomers();
  let updatedRecord: RimiCustomer | null = null;
  
  const updated = current.map(c => {
    if (c.id === id) {
      updatedRecord = { ...c, ...updates, updated_at: new Date().toISOString() };
      return updatedRecord;
    }
    return c;
  });

  if (updatedRecord) {
    try { localStorage.setItem('ferex_rimi_crm_customers', JSON.stringify(updated)); } catch {}
    triggerLocalSync('ferex_rimi_crm_customers_change');
    triggerLocalSync('ferex_rimi_distributors_change');
  }
  return updatedRecord;
}

// Soft delete
export async function deleteRimiCustomer(id: string, deleted_by?: string): Promise<boolean> {
  const current = await getRimiCustomers();
  const updated = current.map(c => c.id === id ? { ...c, is_deleted: true, updated_by: deleted_by || 'Admin', updated_at: new Date().toISOString() } : c);
  try { localStorage.setItem('ferex_rimi_crm_customers', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_customers').update({ is_deleted: true }).eq('id', id); } catch {}
  triggerLocalSync('ferex_rimi_crm_customers_change');
  return true;
}

// Assign or reassign customer to staff
export async function assignRimiCustomer(customerId: string, staffId: string, staffName: string, assignedBy: string): Promise<boolean> {
  const current = await getRimiCustomers();
  const customer = current.find(c => c.id === customerId);
  if (!customer) return false;

  const historyEntry: RimiAssignmentHistoryEntry = {
    staff_id: staffId,
    staff_name: staffName,
    assigned_by: assignedBy,
    assigned_at: new Date().toISOString(),
  };

  const updatedHistory = [...(customer.assignment_history || []), historyEntry];
  await updateRimiCustomer(customerId, {
    assigned_staff_id: staffId,
    assigned_staff_name: staffName,
    assignment_history: updatedHistory,
    updated_by: assignedBy,
  });
  return true;
}

export async function addRimiCustomerActivityNote(customerId: string, note: {
  type: 'call' | 'visit' | 'complaint' | 'note';
  text: string;
  author: string;
}): Promise<RimiActivityNote> {
  const newNote: RimiActivityNote = {
    id: `note-${Date.now()}`,
    type: note.type,
    text: note.text,
    author: note.author || 'Sales Executive',
    created_at: new Date().toISOString(),
  };

  const current = await getRimiCustomers();
  const target = current.find(c => c.id === customerId);
  if (target) {
    const updatedNotes = [newNote, ...(target.notes || [])];
    await updateRimiCustomer(customerId, { notes: updatedNotes });
  }
  return newNote;
}

export async function updateRimiCustomerPipelineStage(customerId: string, stage: RimiPipelineStage): Promise<boolean> {
  await updateRimiCustomer(customerId, { pipeline_stage: stage });
  return true;
}

export async function updateRimiCustomerTags(customerId: string, tags: string[]): Promise<boolean> {
  await updateRimiCustomer(customerId, { tags });
  return true;
}

// ─── Convenience: get customers by type ──────────────────────────────────────
export async function getRimiDistributors(filters?: Parameters<typeof getRimiCustomers>[0]) {
  return getRimiCustomers({ ...filters, type: 'Distributor' });
}
export async function getRimiWholesalerCustomers(filters?: Parameters<typeof getRimiCustomers>[0]) {
  return getRimiCustomers({ ...filters, type: 'Wholesaler' });
}
export async function getRimiRetailShops(filters?: Parameters<typeof getRimiCustomers>[0]) {
  return getRimiCustomers({ ...filters, type: 'RetailShop' });
}

// ─── Payment Recording ───────────────────────────────────────────────────────
export interface RimiPaymentRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  order_id?: string;
  amount: number;
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  recorded_by: string;
  recorded_at: string;
}

export async function getRimiPayments(customerId?: string): Promise<RimiPaymentRecord[]> {
  const local = localStorage.getItem('ferex_rimi_payments');
  let payments: RimiPaymentRecord[] = [];
  if (local) { try { payments = JSON.parse(local); } catch {} }
  if (customerId) return payments.filter(p => p.customer_id === customerId);
  return payments;
}

export async function recordRimiPayment(payment: Omit<RimiPaymentRecord, 'id' | 'recorded_at'>): Promise<RimiPaymentRecord> {
  const current = await getRimiPayments();
  const payload: RimiPaymentRecord = {
    ...payment,
    id: `PAY-${Date.now()}`,
    recorded_at: new Date().toISOString(),
  };
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_rimi_payments', JSON.stringify(updated)); } catch {}
  // Update customer outstanding balance
  const customers = await getRimiCustomers();
  const customer = customers.find(c => c.id === payment.customer_id);
  if (customer) {
    const newOutstanding = Math.max(0, (customer.outstanding_balance || 0) - payment.amount);
    await updateRimiCustomer(payment.customer_id, { outstanding_balance: newOutstanding, updated_by: payment.recorded_by });
  }
  triggerLocalSync('ferex_rimi_payments_change');
  return payload;
}

// ─── Legacy alias ─────────────────────────────────────────────────────────────
export async function createRimiDistributor(dist: any) {
  return createRimiCustomer({ ...dist, customer_type: dist.tier || dist.customer_type || 'Distributor' });
}

// ─── Rimi Consolidated Sales List & 5-Stage Order Lifecycle ─────────────────

export type RimiOrderStatus = string; // Loaded from masters.ts — configurable

export interface RimiSalesOrder {
  id: string;
  order_no: string;
  customer_id?: string;
  customer_name: string;
  customer_type: RimiCustomerType;
  region: string;
  products_summary: string;
  quantity_kg: number;
  total_amount: number;
  order_date: string;
  delivery_date: string;
  payment_status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  order_status: RimiOrderStatus;
  assigned_staff_id?: string;
  assigned_staff_name: string;
  assigned_reefer_truck?: string;
  items_summary?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Empty — database-driven, no hardcoded seed
const DEFAULT_SALES_ORDERS_SEED: RimiSalesOrder[] = [
  // No seed data
  ...[] as RimiSalesOrder[]
];



export async function getRimiSalesOrders(filters?: {
  search?: string;
  customer_type?: string;
  region?: string;
  payment_status?: string;
  order_status?: string;
  staff?: string;
  staffOnlyId?: string;
  product?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RimiSalesOrder[]> {
  try {
    let orders: RimiSalesOrder[] = [];

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('rimi_sales_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        orders = data;
        try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(orders)); } catch {}
      }
    } catch {}

    if (orders.length === 0) {
      const local = localStorage.getItem('ferex_rimi_sales_orders');
      if (local) { try { orders = JSON.parse(local); } catch {} }
    }

    let filtered = [...orders];

    if (filters?.staffOnlyId) {
      filtered = filtered.filter(o => o.assigned_staff_id === filters.staffOnlyId || o.assigned_staff_name === filters.staffOnlyId);
    }

    if (filters?.customer_type && filters.customer_type !== 'All') {
      filtered = filtered.filter(o => o.customer_type.toLowerCase() === filters.customer_type!.toLowerCase());
    }

    if (filters?.order_status && filters.order_status !== 'All') {
      filtered = filtered.filter(o => o.order_status === filters.order_status);
    }

    if (filters?.payment_status && filters.payment_status !== 'All') {
      filtered = filtered.filter(o => o.payment_status === filters.payment_status);
    }

    if (filters?.region && filters.region !== 'All') {
      filtered = filtered.filter(o => o.region.toLowerCase().includes(filters.region!.toLowerCase()));
    }

    if (filters?.staff && filters.staff !== 'All') {
      filtered = filtered.filter(o => o.assigned_staff_name === filters.staff || o.assigned_staff_id === filters.staff);
    }

    if (filters?.product && filters.product !== 'All') {
      filtered = filtered.filter(o => o.products_summary.toLowerCase().includes(filters.product!.toLowerCase()));
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_no.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.products_summary.toLowerCase().includes(q) ||
        o.region.toLowerCase().includes(q) ||
        o.assigned_staff_name.toLowerCase().includes(q)
      );
    }

    return filtered;
  } catch {
    return [];
  }
}

export async function createRimiSalesOrder(order: {
  distributor_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_type?: RimiCustomerType;
  region?: string;
  products_summary?: string;
  items_summary?: string;
  quantity_kg?: number;
  total_amount: number;
  payment_status?: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  order_status?: RimiOrderStatus;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  assigned_reefer_truck?: string;
  delivery_date?: string;
  order_date?: string;
  notes?: string;
}): Promise<RimiSalesOrder> {
  const current = await getRimiSalesOrders();
  
  const year = new Date().getFullYear();
  const payload: RimiSalesOrder = {
    id: `SO-${year}-${Date.now()}`,
    order_no: `SO-${year}-${Date.now()}`,
    customer_id: order.customer_id || order.distributor_id || '',
    customer_name: order.customer_name || '',
    customer_type: order.customer_type || 'Distributor',
    region: order.region || '',
    products_summary: order.products_summary || order.items_summary || '',
    quantity_kg: Number(order.quantity_kg) || 0,
    total_amount: Number(order.total_amount) || 0,
    order_date: order.order_date || new Date().toISOString().split('T')[0],
    delivery_date: order.delivery_date || '',
    payment_status: order.payment_status || 'Pending',
    order_status: order.order_status || 'Draft',
    assigned_staff_id: order.assigned_staff_id || '',
    assigned_staff_name: order.assigned_staff_name || '',
    assigned_reefer_truck: order.assigned_reefer_truck || '',
    notes: order.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [payload, ...current.filter(o => o.id !== payload.id)];
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  try { await supabase.from('rimi_sales_orders').insert(payload); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return payload;
}

export async function updateRimiSalesOrderStatus(id: string, order_status: RimiOrderStatus) {
  const current = await getRimiSalesOrders();
  const updated = current.map(o => (o.id === id || o.order_no === id) ? { ...o, order_status, updated_at: new Date().toISOString() } : o);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return { id, order_status };
}

export const updateRimiOrderStatus = updateRimiSalesOrderStatus;

export async function updateRimiSalesOrder(id: string, updates: Partial<RimiSalesOrder>) {
  const current = await getRimiSalesOrders();
  const updated = current.map(o => (o.id === id || o.order_no === id) ? { ...o, ...updates, updated_at: new Date().toISOString() } : o);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return { id, ...updates };
}

export async function deleteRimiSalesOrder(id: string) {
  const current = await getRimiSalesOrders();
  const updated = current.filter(o => o.id !== id && o.order_no !== id);
  try { localStorage.setItem('ferex_rimi_sales_orders', JSON.stringify(updated)); } catch {}
  triggerLocalSync('ferex_rimi_sales_orders_change');
  return true;
}

// ─── CSV Export Helper for Sales List ─────────────────────────────────────────

export function exportRimiSalesToCSV(orders: RimiSalesOrder[]) {
  const headers = [
    'Order No',
    'Customer Name',
    'Customer Type',
    'Region',
    'Products Ordered',
    'Quantity (KG)',
    'Total Amount (INR)',
    'Order Date',
    'Delivery Date',
    'Payment Status',
    'Order Status',
    'Assigned Sales Staff'
  ];

  const rows = orders.map(o => [
    `"${o.order_no}"`,
    `"${o.customer_name}"`,
    `"${o.customer_type}"`,
    `"${o.region}"`,
    `"${o.products_summary.replace(/"/g, '""')}"`,
    `"${o.quantity_kg}"`,
    `"${o.total_amount}"`,
    `"${o.order_date}"`,
    `"${o.delivery_date}"`,
    `"${o.payment_status}"`,
    `"${o.order_status}"`,
    `"${o.assigned_staff_name}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Rimi_Frozen_Sales_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Compliance Documents Vault (Quality Certs, Batch Reports, Challans) ─────

export type RimiDocType = 'Quality Certificate' | 'Batch Test Report' | 'Delivery Challan';

export interface RimiComplianceDoc {
  id: string;
  title: string;
  doc_type: RimiDocType;
  file_name: string;
  file_url: string;
  batch_number?: string;
  order_no?: string;
  customer_name?: string;
  storage_temp?: string;
  verified_by: string;
  status: 'Verified & Active' | 'Pending Review' | 'Archived';
  created_at: string;
}

const DEFAULT_DOCUMENTS_SEED: RimiComplianceDoc[] = [
  {
    id: 'DOC-QC-101',
    title: 'FSSAI Microbial & Pesticide Clearance - Batch GP-2026-08',
    doc_type: 'Quality Certificate',
    file_name: 'FSSAI_Cert_GreenPeas_Batch08.pdf',
    file_url: '#',
    batch_number: 'GP-2026-08',
    customer_name: 'Apex Cold Logistics Ltd',
    storage_temp: '-21°C',
    verified_by: 'Quality Inspection Lead',
    status: 'Verified & Active',
    created_at: '2026-09-12T10:00:00Z'
  },
  {
    id: 'DOC-BR-202',
    title: 'Batch Blast Freeze & Core Temp Log - Batch SC-2026-14',
    doc_type: 'Batch Test Report',
    file_name: 'BatchLog_SweetCorn_CoreTemp.pdf',
    file_url: '#',
    batch_number: 'SC-2026-14',
    storage_temp: '-22.5°C',
    verified_by: 'Rimi Operations Desk',
    status: 'Verified & Active',
    created_at: '2026-09-13T14:30:00Z'
  },
  {
    id: 'DOC-DC-303',
    title: 'Electronic Delivery Challan & Cold Reefer Receipt - SO-2026-9042',
    doc_type: 'Delivery Challan',
    file_name: 'DeliveryChallan_SO9042_HyperCity.pdf',
    file_url: '#',
    order_no: 'SO-2026-9042',
    customer_name: 'HyperCity Supermarket Bandra',
    storage_temp: '-18.8°C',
    verified_by: 'Driver: Reefer Logistics Dispatch',
    status: 'Verified & Active',
    created_at: '2026-09-15T09:30:00Z'
  }
];

export async function getRimiComplianceDocs(): Promise<RimiComplianceDoc[]> {
  try {
    const { data, error } = await supabase
      .from('rimi_compliance_docs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_rimi_compliance_docs', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const local = localStorage.getItem('ferex_rimi_compliance_docs');
  if (local) { try { return JSON.parse(local); } catch {} }
  return [];
}

export async function createRimiComplianceDoc(doc: Partial<RimiComplianceDoc>): Promise<RimiComplianceDoc> {
  const current = await getRimiComplianceDocs();
  const payload: RimiComplianceDoc = {
    id: `DOC-${Math.floor(100 + Math.random() * 900)}`,
    title: doc.title || 'Cold Chain Compliance Record',
    doc_type: doc.doc_type || 'Quality Certificate',
    file_name: doc.file_name || 'compliance_document.pdf',
    file_url: doc.file_url || '#',
    batch_number: doc.batch_number || '',
    order_no: doc.order_no || '',
    customer_name: doc.customer_name || '',
    storage_temp: doc.storage_temp || '-18.0°C',
    verified_by: doc.verified_by || 'Cold Chain QC',
    status: doc.status || 'Verified & Active',
    created_at: new Date().toISOString(),
  };

  const updated = [payload, ...current];
  localStorage.setItem('ferex_rimi_compliance_docs', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_compliance_docs_change');
  return payload;
}

export async function deleteRimiComplianceDoc(id: string): Promise<boolean> {
  const current = await getRimiComplianceDocs();
  const updated = current.filter(d => d.id !== id);
  localStorage.setItem('ferex_rimi_compliance_docs', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_compliance_docs_change');
  return true;
}

// ─── 3-Tier Task Assignment & Editable Task Naming ───────────────────────────

export interface RimiTask {
  id: string;
  title: string; // Editable anytime by Central or Admin
  description: string;
  category: 'Cold Chain QC' | 'Dispatch & Logistics' | 'CRM Followup' | 'Payment Collection' | 'Warehouse Audit';
  assigned_to_id: string;
  assigned_to_name: string;
  assigned_to_role: 'Operations Staff' | 'Cold Chain Lead' | 'QC Officer' | 'Regional Sales Staff' | 'Rimi Admin';
  assigned_by: string; // 'Central Superadmin' | 'Rimi Admin'
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date: string;
  customer_id?: string;
  customer_name?: string;
  order_no?: string;
  created_at: string;
  updated_at: string;
}

// Tasks seed — empty, database-driven
const DEFAULT_TASKS_SEED: RimiTask[] = [];



export async function getRimiTasks(staffFilter?: string): Promise<RimiTask[]> {
  const local = localStorage.getItem('ferex_rimi_tasks');
  let tasks: RimiTask[] = [];
  if (local) {
    try { tasks = JSON.parse(local); } catch { tasks = [...DEFAULT_TASKS_SEED]; }
  } else {
    tasks = [...DEFAULT_TASKS_SEED];
    try { localStorage.setItem('ferex_rimi_tasks', JSON.stringify(tasks)); } catch {}
  }

  if (staffFilter && staffFilter !== 'All') {
    tasks = tasks.filter(t => t.assigned_to_name === staffFilter || t.assigned_to_id === staffFilter);
  }
  return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createRimiTask(task: Partial<RimiTask>): Promise<RimiTask> {
  const current = await getRimiTasks();
  const payload: RimiTask = {
    id: `TASK-RIMI-${Date.now()}`,
    title: task.title || '',
    description: task.description || '',
    category: task.category || 'Dispatch & Logistics',
    assigned_to_id: task.assigned_to_id || '',
    assigned_to_name: task.assigned_to_name || '',
    assigned_to_role: task.assigned_to_role || 'Operations Staff',
    assigned_by: task.assigned_by || '',
    priority: task.priority || 'Medium',
    status: task.status || 'Pending',
    due_date: task.due_date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    customer_id: task.customer_id,
    customer_name: task.customer_name,
    order_no: task.order_no,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [payload, ...current];
  localStorage.setItem('ferex_rimi_tasks', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_tasks_change');
  return payload;
}

export async function updateRimiTask(id: string, updates: Partial<RimiTask>): Promise<RimiTask | null> {
  const current = await getRimiTasks();
  let updatedTask: RimiTask | null = null;
  const updated = current.map(t => {
    if (t.id === id) {
      updatedTask = { ...t, ...updates, updated_at: new Date().toISOString() };
      return updatedTask;
    }
    return t;
  });

  if (updatedTask) {
    localStorage.setItem('ferex_rimi_tasks', JSON.stringify(updated));
    triggerLocalSync('ferex_rimi_tasks_change');
  }
  return updatedTask;
}

export async function reassignRimiTask(taskId: string, newStaffId: string, newStaffName: string): Promise<boolean> {
  await updateRimiTask(taskId, {
    assigned_to_id: newStaffId,
    assigned_to_name: newStaffName,
  });
  return true;
}

export async function renameRimiTaskTitle(taskId: string, newTitle: string): Promise<boolean> {
  await updateRimiTask(taskId, { title: newTitle });
  return true;
}

export async function deleteRimiTask(id: string): Promise<boolean> {
  const current = await getRimiTasks();
  const updated = current.filter(t => t.id !== id);
  localStorage.setItem('ferex_rimi_tasks', JSON.stringify(updated));
  triggerLocalSync('ferex_rimi_tasks_change');
  return true;
}

// ─── Staff Directory for Task & CRM Assignment ───────────────────────────────

export interface RimiStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleLabel?: string;
  assigned_territories?: string[];
  active_accounts_count?: number;
}

export async function getRimiStaffList(): Promise<RimiStaffMember[]> {
  const staff = await getDivisionStaff('rimi');
  const customers = await getRimiCustomers();
  return staff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone || '',
    role: s.roleLabel || s.role || 'Operations Staff',
    roleLabel: s.roleLabel || s.role,
    active_accounts_count: customers.filter(c => c.assigned_staff_id === s.id || c.assigned_staff_name === s.name).length,
  }));
}

export function getRimiStaffSync(): RimiStaffMember[] {
  const staff = getDivisionStaffSync('rimi');
  return staff.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone || '',
    role: s.roleLabel || s.role || 'Operations Staff',
    roleLabel: s.roleLabel || s.role,
  }));
}


// ─── Rimi Warehouses ────────────────────────────────────────────────────────
export async function getRimiWarehouses() {
  try {
    const { data, error } = await supabase
      .from('rimi_warehouses')
      .select('*')
      .order('created_at', { ascending: false });

    const local = localStorage.getItem('ferex_rimi_warehouses');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.code && m.code === item.code))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_warehouses', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  const updated = current.map((w: any) => (w.id === id || w.rawId === id || w.code === id) ? { ...w, ...updates } : w);
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
  const updated = current.filter((w: any) => w.id !== id && w.rawId !== id && w.code !== id);
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

    const local = localStorage.getItem('ferex_rimi_batches');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.batch_number && m.batch_number === item.batch_number))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_batches', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  const updated = current.map((b: any) => (b.id === id || b.rawId === id || b.batch_number === id) ? { ...b, status } : b);
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
  const updated = current.filter((b: any) => b.id !== id && b.rawId !== id && b.batch_number !== id);
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

    const local = localStorage.getItem('ferex_rimi_deliveries');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.delivery_number && m.delivery_number === item.delivery_number))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_deliveries', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  const updated = current.map((d: any) => (d.id === id || d.rawId === id || d.delivery_number === id) ? { ...d, delivery_status } : d);
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
  const updated = current.filter((d: any) => d.id !== id && d.rawId !== id && d.delivery_number !== id);
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

    const local = localStorage.getItem('ferex_rimi_collections');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.reference_no && m.reference_no === item.reference_no))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_collections', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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

export async function updateRimiCollectionStatus(id: string, status: string) {
  const current = await getRimiCollections();
  const updated = current.map((c: any) => (c.id === id || c.rawId === id || c.reference_no === id) ? { ...c, status } : c);
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
  const updated = current.filter((c: any) => c.id !== id && c.rawId !== id && c.reference_no !== id);
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

    const local = localStorage.getItem('ferex_rimi_vehicles');
    const localItems = local ? JSON.parse(local) : [];

    if (!error && Array.isArray(data)) {
      const merged = [...data];
      for (const item of localItems) {
        if (!merged.some((m: any) => m.id === item.id || (m.vehicle_number && m.vehicle_number === item.vehicle_number))) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_rimi_vehicles', JSON.stringify(merged)); } catch {}
      return merged;
    }

    if (localItems.length > 0) return localItems;
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
  const updated = current.map((v: any) => (v.id === id || v.rawId === id || v.vehicle_number === id) ? { ...v, status } : v);
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
  const updated = current.filter((v: any) => v.id !== id && v.rawId !== id && v.vehicle_number !== id);
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
  recorded_by?: string;
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
    recorded_by: loss.recorded_by || 'Rimi Operations Desk',
    recorded_at: new Date().toISOString(),
    status: 'Approved Write-off',
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_rimi_frost_losses', JSON.stringify(updated));

  // Deduct from inventory stock if matching item found
  try {
    const inv = await getRimiInventory();
    const matched = inv.find((i: any) => i.batch_number === created.batch_number || i.product?.name === created.product_name);
    if (matched && Number(matched.quantity_on_hand) > 0) {
      const newQty = Math.max(0, Number(matched.quantity_on_hand) - created.quantity_lost_kg);
      await updateRimiInventoryStock(matched.id, newQty);
    }
  } catch {}

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
  adjusted_by?: string;
  timestamp: string;
  created_at?: string;
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
  adjusted_by?: string;
}): Promise<RimiStockAdjustment> {
  const current = await getRimiStockAdjustments();
  const now = new Date().toISOString();
  const created: RimiStockAdjustment = {
    id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
    product_name: adj.product_name,
    adjustment_type: adj.adjustment_type,
    quantity: Number(adj.quantity) || 0,
    unit: adj.unit || 'KG',
    source_location: adj.source_location || 'Central Cold Storage',
    target_location: adj.target_location,
    reason: adj.reason,
    adjusted_by: adj.adjusted_by || 'Rimi Operations Desk',
    timestamp: now,
    created_at: now,
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_rimi_stock_adjustments', JSON.stringify(updated));

  // If adjustment modifies inventory quantity (Inward Addition or Frost Loss Deduction)
  try {
    const inv = await getRimiInventory();
    const matched = inv.find((i: any) => i.product?.name === created.product_name || i.batch_number === created.source_location);
    if (matched) {
      let newQty = Number(matched.quantity_on_hand);
      if (created.adjustment_type === 'Inward Addition') {
        newQty += created.quantity;
      } else if (created.adjustment_type === 'Frost Loss Deduction') {
        newQty = Math.max(0, newQty - created.quantity);
      }
      await updateRimiInventoryStock(matched.id, newQty);
    }
  } catch {}

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

export interface ProvisionedRimiCredential {
  email: string;
  tempPassword: string;
  role: string;
  fullName?: string;
  companyName?: string;
  businessName?: string;
  partnerId?: string;
  requirePasswordReset?: boolean;
}

export function getRimiCustomerCredentials(partnerId: string): ProvisionedRimiCredential | null {
  const local = localStorage.getItem('ferex_rimi_distributors');
  if (local) {
    try {
      const dists = JSON.parse(local);
      const found = dists.find((d: any) => d.id === partnerId || d.rawId === partnerId || d.email === partnerId);
      if (found && found.temp_password) {
        return {
          email: found.email,
          tempPassword: found.temp_password,
          role: 'rimi_customer',
          fullName: found.contact_person || found.business_name,
          businessName: found.business_name,
          partnerId: found.id
        };
      }
    } catch {}
  }
  const credLocal = localStorage.getItem(`ferex_admin_cred_${partnerId}`);
  if (credLocal) {
    try {
      const cred = JSON.parse(credLocal);
      return {
        email: cred.email,
        tempPassword: cred.password || 'RimiPass#2026',
        role: cred.role || 'rimi_customer',
        fullName: cred.fullName,
        businessName: cred.company_name,
        partnerId
      };
    } catch {}
  }
  return null;
}

export async function provisionRimiCustomerLogin(partner: {
  id?: string;
  email: string;
  name?: string;
  business_name?: string;
  contact_person?: string;
}): Promise<ProvisionedRimiCredential> {
  const cleanEmail = partner.email.trim().toLowerCase();
  const tempPassword = `RimiPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const businessName = partner.business_name || partner.name || 'Cold Chain Customer';
  const fullName = partner.contact_person || partner.name || businessName;

  const cred: ProvisionedRimiCredential = {
    email: cleanEmail,
    tempPassword,
    role: 'rimi_customer',
    fullName,
    businessName,
    partnerId: partner.id
  };

  try {
    localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
      email: cleanEmail,
      password: tempPassword,
      role: 'rimi_customer',
      fullName,
      company_name: businessName,
      partner_id: partner.id,
      require_password_reset: false,
    }));
  } catch {}

  return cred;
}


