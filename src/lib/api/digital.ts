import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

// ─── Digital Clients ────────────────────────────────────────────────────────
export async function getDigitalClients() {
  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getDigitalClients Notice]:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalClient(client: {
  name: string;
  contact_person: string;
  email: string;
  phone?: string;
  city?: string;
  client_type?: string;
}) {
  const newId = generateUUID();
  const clientCode = `CLT-${Math.floor(randomCode(100, 999))}`;
  const payload = {
    id: newId,
    client_code: clientCode,
    name: client.name,
    contact_person: client.contact_person,
    email: client.email,
    phone: client.phone || '',
    city: client.city || 'Mumbai',
    client_type: client.client_type || 'Enterprise',
    status: 'Active',
    total_spent: 0,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_clients').insert(payload).select();
  if (error || !data || data.length === 0) {
    return payload;
  }
  return data[0];
}

export async function updateDigitalClient(id: string, updates: any) {
  const { data, error } = await supabase.from('digital_clients').update(updates).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteDigitalClient(id: string) {
  await supabase.from('digital_clients').delete().eq('id', id);
  return true;
}

// ─── Digital Projects ───────────────────────────────────────────────────────
export async function getDigitalProjects() {
  try {
    const { data, error } = await supabase
      .from('digital_projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalProject(project: {
  title: string;
  client_name: string;
  service_category?: string;
  budget?: number;
  progress?: number;
  deadline?: string;
}) {
  const payload = {
    id: generateUUID(),
    project_code: `PRJ-${Math.floor(randomCode(1000, 9999))}`,
    title: project.title,
    client_name: project.client_name,
    service_category: project.service_category || 'Web Development',
    budget: project.budget || 250000,
    progress: project.progress || 0,
    deadline: project.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'In Progress',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_projects').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalProject(id: string, updates: any) {
  const { data, error } = await supabase.from('digital_projects').update(updates).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteDigitalProject(id: string) {
  await supabase.from('digital_projects').delete().eq('id', id);
  return true;
}

// ─── Digital Tasks ──────────────────────────────────────────────────────────
export async function getDigitalTasks() {
  try {
    const { data, error } = await supabase
      .from('digital_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalTask(task: {
  title: string;
  project_name?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: task.title,
    project_name: task.project_name || 'General Operations',
    assigned_to: task.assigned_to || 'Lead Developer',
    priority: task.priority || 'Medium',
    status: 'Pending',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_tasks').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  const { data, error } = await supabase.from('digital_tasks').update({ status }).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

export async function deleteDigitalTask(id: string) {
  await supabase.from('digital_tasks').delete().eq('id', id);
  return true;
}

// ─── Digital Invoices ───────────────────────────────────────────────────────
export async function getDigitalInvoices() {
  try {
    const { data, error } = await supabase
      .from('digital_invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalInvoice(inv: {
  client_name: string;
  project_title?: string;
  amount: number;
  due_date?: string;
}) {
  const tax = inv.amount * 0.18;
  const payload = {
    id: generateUUID(),
    invoice_no: `INV-DIG-${Math.floor(randomCode(10000, 99990))}`,
    client_name: inv.client_name,
    project_title: inv.project_title || 'Digital Services',
    amount: inv.amount,
    tax_amount: tax,
    total_amount: inv.amount + tax,
    status: 'Pending',
    issued_date: new Date().toISOString().split('T')[0],
    due_date: inv.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_invoices').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Digital Leads ──────────────────────────────────────────────────────────
export async function getDigitalLeads() {
  try {
    const { data, error } = await supabase
      .from('digital_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalLead(lead: {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  service_interest?: string;
  estimated_value?: number;
  stage?: string;
  priority?: string;
}) {
  const payload = {
    id: generateUUID(),
    company_name: lead.company_name,
    contact_person: lead.contact_person,
    email: lead.email,
    phone: lead.phone || '',
    service_interest: lead.service_interest || 'Web Development',
    estimated_value: lead.estimated_value || 1000000,
    stage: lead.stage || 'New',
    priority: lead.priority || 'Medium',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('digital_leads').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalLeadStage(id: string, stage: string) {
  const { data, error } = await supabase.from('digital_leads').update({ stage }).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, stage };
  return data[0];
}

// ─── Digital SEO Projects ───────────────────────────────────────────────────
export async function getDigitalSEOProjects() {
  try {
    const { data, error } = await supabase
      .from('digital_seo_projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalSEOProject(seo: {
  client_name: string;
  domain_url: string;
  target_keywords?: string;
  organic_traffic_monthly?: number;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    client_name: seo.client_name,
    domain_url: seo.domain_url,
    target_keywords: seo.target_keywords || 'Study in Europe, Poland Admissions, Overseas Visa',
    organic_traffic_monthly: seo.organic_traffic_monthly || 45000,
    status: seo.status || 'Active Campaign',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('digital_seo_projects').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Digital Dashboard Aggregation ──────────────────────────────────────────
export async function getDigitalDashboardStats() {
  try {
    const [clientsRes, projectsRes, invoicesRes, tasksRes] = await Promise.all([
      supabase.from('digital_clients').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('digital_projects').select('budget, status'),
      supabase.from('digital_invoices').select('total_amount, status'),
      supabase.from('digital_tasks').select('*', { count: 'exact', head: true }).neq('status', 'Completed'),
    ]);

    const activeClientsCount = clientsRes.count ?? 0;
    const runningProjects = (projectsRes.data ?? []).filter((p: any) => p.status === 'In Progress');
    const totalProjectValue = (projectsRes.data ?? []).reduce((s: number, p: any) => s + (Number(p.budget) || 0), 0);
    const paidRevenue = (invoicesRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0);
    const pendingTasks = tasksRes.count ?? 0;

    return {
      activeClientsCount,
      runningProjectsCount: runningProjects.length,
      totalProjectValue,
      monthlyRevenue: paidRevenue,
      pendingTasksCount: pendingTasks,
    };
  } catch {
    return {
      activeClientsCount: 0,
      runningProjectsCount: 0,
      totalProjectValue: 0,
      monthlyRevenue: 0,
      pendingTasksCount: 0,
    };
  }
}

// ─── Digital Employees ──────────────────────────────────────────────────────
export async function getDigitalEmployees() {
  try {
    const { data, error } = await supabase
      .from('digital_employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalEmployee(emp: {
  full_name: string;
  role_title: string;
  department?: string;
  email: string;
  phone?: string;
  salary?: number;
}) {
  const payload = {
    id: generateUUID(),
    emp_code: `EMP-${Math.floor(randomCode(100, 999))}`,
    full_name: emp.full_name,
    role_title: emp.role_title,
    department: emp.department || 'Engineering',
    email: emp.email,
    phone: emp.phone || '',
    salary: emp.salary || 75000,
    performance_score: 4.8,
    active_tasks_count: 0,
    status: 'Active',
    joined_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_employees').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalEmployee(id: string, updates: any) {
  const { data, error } = await supabase.from('digital_employees').update(updates).eq('id', id).select();
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

// ─── Digital Expenses ───────────────────────────────────────────────────────
export async function getDigitalExpenses() {
  try {
    const { data, error } = await supabase
      .from('digital_expenses')
      .select('*')
      .order('date_incurred', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalExpense(exp: {
  category: string;
  title: string;
  amount: number;
  vendor: string;
  date_incurred?: string;
  payment_method?: string;
  approved_by?: string;
}) {
  const payload = {
    id: generateUUID(),
    category: exp.category,
    title: exp.title,
    amount: exp.amount,
    vendor: exp.vendor,
    date_incurred: exp.date_incurred || new Date().toISOString().split('T')[0],
    payment_method: exp.payment_method || 'Corporate Credit Card',
    approved_by: exp.approved_by || 'Digital Director',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_expenses').insert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

// ─── Digital Attendance ─────────────────────────────────────────────────────
export async function getDigitalAttendance() {
  try {
    const { data, error } = await supabase
      .from('digital_attendance')
      .select('*')
      .order('date', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function recordDigitalAttendance(record: {
  employee_id?: string;
  employee_name: string;
  date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  hours_worked?: number;
}) {
  const payload = {
    id: generateUUID(),
    employee_id: record.employee_id || generateUUID(),
    employee_name: record.employee_name,
    date: record.date,
    status: record.status,
    check_in_time: record.check_in_time || '09:00 AM',
    check_out_time: record.check_out_time || '06:00 PM',
    hours_worked: record.hours_worked || 8.5,
  };

  const { data, error } = await supabase.from('digital_attendance').upsert(payload).select();
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

function randomCode(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
