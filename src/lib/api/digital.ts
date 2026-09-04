import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Digital Clients ────────────────────────────────────────────────────────
export async function getDigitalClients() {
  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalClient(client: {
  company_name?: string;
  name?: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry?: string;
  city?: string;
  client_type?: string;
  status?: string;
}) {
  const payload = {
    id: generateUUID(),
    company_name: client.company_name || client.name || 'Enterprise Client',
    contact_person: client.contact_person,
    email: client.email,
    phone: client.phone || '+91 98190 33445',
    industry: client.industry || client.client_type || 'Technology & Fintech',
    status: client.status || 'Active',
    total_revenue: 0.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_clients').insert(payload).select();
  triggerLocalSync('ferex_digital_clients_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalClient(id: string, updates: any) {
  const { data, error } = await supabase
    .from('digital_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_digital_clients_change');
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteDigitalClient(id: string) {
  await supabase.from('digital_clients').delete().eq('id', id);
  triggerLocalSync('ferex_digital_clients_change');
  return true;
}

// ─── Digital Leads ──────────────────────────────────────────────────────────
export async function getDigitalLeads() {
  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .eq('status', 'Lead')
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
  industry?: string;
  estimated_budget?: number;
}) {
  return createDigitalClient({
    ...lead,
    status: 'Lead'
  });
}

// ─── Digital Projects ───────────────────────────────────────────────────────
export async function getDigitalProjects(category?: string) {
  try {
    let query = supabase.from('digital_projects').select('*, client:digital_clients(*)').order('created_at', { ascending: false });
    if (category && category !== 'All') {
      query = query.eq('service_category', category);
    }
    const { data, error } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalProject(project: {
  client_id?: string;
  client_name?: string;
  title: string;
  service_category?: string;
  budget?: number;
  progress?: number;
  deadline?: string;
  lead_developer?: string;
  status?: string;
}) {
  let clientId = project.client_id;
  if (!clientId) {
    const clients = await getDigitalClients();
    if (clients.length > 0) clientId = clients[0].id;
    else {
      const created = await createDigitalClient({
        company_name: project.client_name || 'Nexus FinTech Global',
        contact_person: 'Ananya Deshmukh',
        email: 'ananya@nexusfintech.io'
      });
      clientId = created.id;
    }
  }

  const payload = {
    id: generateUUID(),
    client_id: clientId,
    title: project.title,
    service_category: project.service_category || 'Web & App Development',
    status: project.status || 'In Progress',
    budget: Number(project.budget) || 250000,
    progress: Number(project.progress) || 0,
    deadline: project.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lead_developer: project.lead_developer || 'Kavita Iyer',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_projects').insert(payload).select();
  triggerLocalSync('ferex_digital_projects_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalProject(id: string, updates: any) {
  const { data, error } = await supabase
    .from('digital_projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_digital_projects_change');
  if (error || !data || data.length === 0) return { id, ...updates };
  return data[0];
}

export async function deleteDigitalProject(id: string) {
  await supabase.from('digital_projects').delete().eq('id', id);
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

// ─── Digital Tasks ──────────────────────────────────────────────────────────
export async function getDigitalTasks(projectId?: string) {
  try {
    let query = supabase.from('digital_tasks').select('*, project:digital_projects(*)').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalTask(task: {
  project_id?: string;
  title: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to_name?: string;
}) {
  let projId = task.project_id;
  if (!projId) {
    const projects = await getDigitalProjects();
    if (projects.length > 0) projId = projects[0].id;
    else {
      const created = await createDigitalProject({ title: 'Nexus Web Platform' });
      projId = created.id;
    }
  }

  const payload = {
    id: generateUUID(),
    project_id: projId,
    title: task.title,
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_tasks').insert(payload).select();
  triggerLocalSync('ferex_digital_tasks_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('digital_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_digital_tasks_change');
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

export async function deleteDigitalTask(id: string) {
  await supabase.from('digital_tasks').delete().eq('id', id);
  triggerLocalSync('ferex_digital_tasks_change');
  return true;
}

// ─── Digital Invoices & Payments ────────────────────────────────────────────
export async function getDigitalInvoices() {
  try {
    const { data, error } = await supabase
      .from('digital_invoices')
      .select('*, client:digital_clients(*), project:digital_projects(*)')
      .order('issued_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function createDigitalInvoice(inv: {
  client_id?: string;
  project_id?: string;
  client_name?: string;
  invoice_no?: string;
  amount: number;
  tax_amount?: number;
  due_date?: string;
  status?: string;
}) {
  let clientId = inv.client_id;
  if (!clientId) {
    const clients = await getDigitalClients();
    if (clients.length > 0) clientId = clients[0].id;
  }

  const payload = {
    id: generateUUID(),
    client_id: clientId,
    project_id: inv.project_id || null,
    invoice_no: inv.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: Number(inv.amount) || 150000,
    tax_amount: Number(inv.tax_amount) || Math.round((Number(inv.amount) || 150000) * 0.18),
    currency: 'INR',
    status: inv.status || 'Sent',
    due_date: inv.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('digital_invoices').insert(payload).select();
  triggerLocalSync('ferex_digital_invoices_change');
  if (error || !data || data.length === 0) return payload;
  return data[0];
}

export async function updateDigitalInvoiceStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('digital_invoices')
    .update({ status, paid_at: status === 'Paid' ? new Date().toISOString() : null })
    .eq('id', id)
    .select();
  triggerLocalSync('ferex_digital_invoices_change');
  if (error || !data || data.length === 0) return { id, status };
  return data[0];
}

export async function deleteDigitalInvoice(id: string) {
  await supabase.from('digital_invoices').delete().eq('id', id);
  triggerLocalSync('ferex_digital_invoices_change');
  return true;
}

export async function getDigitalPayments() {
  return getDigitalInvoices();
}

// ─── Digital Expenses ───────────────────────────────────────────────────────
export async function getDigitalExpenses() {
  const saved = localStorage.getItem('ferex_digital_expenses');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [
    { id: 'EXP-101', title: 'AWS Cloud Infrastructure Cluster', category: 'Cloud Infrastructure', amount: 84500, date: '2026-09-01', vendor: 'Amazon Web Services', status: 'Settled' },
    { id: 'EXP-102', title: 'Figma Organization & Adobe Suite Licenses', category: 'Software Tools', amount: 42000, date: '2026-08-28', vendor: 'Adobe Systems', status: 'Settled' },
    { id: 'EXP-103', title: 'Google Ads & Meta Campaign Spend', category: 'Ad Spend', amount: 165000, date: '2026-08-25', vendor: 'Google Ads', status: 'Settled' },
  ];
}

export async function createDigitalExpense(expense: {
  title: string;
  category: string;
  amount: number;
  vendor?: string;
  date?: string;
}) {
  const current = await getDigitalExpenses();
  const created = {
    id: `EXP-${Math.floor(104 + Math.random() * 900)}`,
    title: expense.title,
    category: expense.category,
    amount: Number(expense.amount),
    vendor: expense.vendor || 'Agency Vendor',
    date: expense.date || new Date().toISOString().split('T')[0],
    status: 'Settled'
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_expenses', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_expenses_change');
  return created;
}

export async function deleteDigitalExpense(id: string) {
  const current = await getDigitalExpenses();
  const updated = current.filter((e: any) => e.id !== id);
  localStorage.setItem('ferex_digital_expenses', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_expenses_change');
  return true;
}

// ─── Digital Employees ──────────────────────────────────────────────────────
export async function getDigitalEmployees() {
  const saved = localStorage.getItem('ferex_digital_employees');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [
    { id: 'EMP-01', name: 'Kavita Iyer', role: 'Principal Fullstack Architect', department: 'Engineering', email: 'k.iyer@ferex.digital', status: 'Active', projectsCount: 4 },
    { id: 'EMP-02', name: 'Sameer Sen', role: 'Lead Product Designer (UI/UX)', department: 'Design', email: 'sameer@ferex.digital', status: 'Active', projectsCount: 3 },
    { id: 'EMP-03', name: 'Pooja Hegde', role: 'Senior SEO & Growth Strategist', department: 'Marketing', email: 'pooja.h@ferex.digital', status: 'Active', projectsCount: 5 },
    { id: 'EMP-04', name: 'Rohan Joshi', role: 'Mobile Flutter Engineer', department: 'Engineering', email: 'r.joshi@ferex.digital', status: 'Active', projectsCount: 2 },
  ];
}

export async function createDigitalEmployee(emp: {
  name: string;
  role: string;
  department: string;
  email: string;
}) {
  const current = await getDigitalEmployees();
  const created = {
    id: `EMP-${Math.floor(10 + Math.random() * 90)}`,
    name: emp.name,
    role: emp.role,
    department: emp.department,
    email: emp.email,
    status: 'Active',
    projectsCount: 1
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return created;
}

export async function deleteDigitalEmployee(id: string) {
  const current = await getDigitalEmployees();
  const updated = current.filter((e: any) => e.id !== id);
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return true;
}

// ─── Digital Attendance & HR ────────────────────────────────────────────────
export async function getDigitalAttendance() {
  const saved = localStorage.getItem('ferex_digital_attendance');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [
    { id: 'ATT-01', employee: 'Kavita Iyer', date: '2026-09-03', status: 'Present', checkIn: '09:15 AM', checkOut: '06:30 PM' },
    { id: 'ATT-02', employee: 'Sameer Sen', date: '2026-09-03', status: 'Present', checkIn: '09:30 AM', checkOut: '06:00 PM' },
    { id: 'ATT-03', employee: 'Pooja Hegde', date: '2026-09-03', status: 'Present', checkIn: '09:00 AM', checkOut: '05:45 PM' },
  ];
}

export async function recordDigitalAttendance(record: any) {
  const current = await getDigitalAttendance();
  const created = {
    id: `ATT-${Date.now().toString().slice(-4)}`,
    ...record,
    date: record.date || new Date().toISOString().split('T')[0]
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_attendance', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_attendance_change');
  return created;
}

// ─── Digital Meetings ───────────────────────────────────────────────────────
export async function getDigitalMeetings() {
  const saved = localStorage.getItem('ferex_digital_meetings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [
    { id: 'MTG-01', title: 'Nexus FinTech Sprint Architecture Review', client: 'Nexus FinTech Global', time: 'Today, 03:00 PM', link: 'https://meet.google.com/fer-dig-arch', status: 'Scheduled' },
    { id: 'MTG-02', title: 'Starlight Brands UI/UX Design Approval', client: 'Starlight E-Commerce Brands', time: 'Tomorrow, 11:30 AM', link: 'https://meet.google.com/fer-dig-uiux', status: 'Scheduled' },
  ];
}

export async function createDigitalMeeting(mtg: {
  title: string;
  client: string;
  time: string;
  link?: string;
}) {
  const current = await getDigitalMeetings();
  const created = {
    id: `MTG-${Math.floor(10 + Math.random() * 90)}`,
    title: mtg.title,
    client: mtg.client,
    time: mtg.time,
    link: mtg.link || 'https://meet.google.com/fer-dig-conf',
    status: 'Scheduled'
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_meetings', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_meetings_change');
  return created;
}

export async function deleteDigitalMeeting(id: string) {
  const current = await getDigitalMeetings();
  const updated = current.filter((m: any) => m.id !== id);
  localStorage.setItem('ferex_digital_meetings', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_meetings_change');
  return true;
}

// ─── Digital Messages & Notifications ───────────────────────────────────────
export async function getDigitalMessages(conversationId: string = '1') {
  try {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('conversation_id', `digital_${conversationId}`)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function sendDigitalMessage(msg: {
  conversation_id: string;
  contact_name: string;
  contact_role: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
  const payload = {
    id: generateUUID(),
    conversation_id: `digital_${msg.conversation_id}`,
    contact_name: msg.contact_name,
    contact_role: msg.contact_role,
    sender_name: msg.sender_name,
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString(),
  };

  const { data } = await supabase.from('trade_messages').insert(payload).select();
  triggerLocalSync('ferex_digital_messages_change');
  return data?.[0] || payload;
}

export async function getDigitalNotifications() {
  try {
    const { data, error } = await supabase
      .from('trade_notifications')
      .select('*')
      .ilike('category', '%Digital%')
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

export async function createDigitalNotification(notif: {
  title: string;
  description: string;
  category?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: notif.title,
    description: notif.description,
    category: notif.category || 'Digital',
    is_read: false,
    is_archived: false,
    created_at: new Date().toISOString(),
  };

  const { data } = await supabase.from('trade_notifications').insert(payload).select();
  triggerLocalSync('ferex_digital_notifications_change');
  return data?.[0] || payload;
}

export async function markDigitalNotificationRead(id: string) {
  await supabase.from('trade_notifications').update({ is_read: true }).eq('id', id);
  triggerLocalSync('ferex_digital_notifications_change');
  return true;
}

// ─── Digital Dashboard Stats Aggregator ─────────────────────────────────────
export async function getDigitalDashboardStats() {
  try {
    const [clientsRes, projectsRes, invoicesRes, tasksRes] = await Promise.all([
      supabase.from('digital_clients').select('id, status'),
      supabase.from('digital_projects').select('id, budget, progress, status'),
      supabase.from('digital_invoices').select('amount, status'),
      supabase.from('digital_tasks').select('id, status'),
    ]);

    const clients = clientsRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const invoices = invoicesRes.data ?? [];
    const tasks = tasksRes.data ?? [];

    const activeProjects = projects.filter((p: any) => p.status !== 'Completed' && p.status !== 'Archived');
    const totalPipelineBudget = projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
    const paidInvoices = invoices.filter((i: any) => i.status === 'Paid');
    const totalCollected = paidInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const pendingTasks = tasks.filter((t: any) => t.status !== 'Done');

    const formatInr = (amt: number) => {
      if (!amt || amt === 0) return '₹0';
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakhs`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeClientsCount: clients.length,
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: projects.length,
      totalPipelineValueStr: formatInr(totalPipelineBudget),
      totalCollectedStr: formatInr(totalCollected),
      pendingTasksCount: pendingTasks.length,
    };
  } catch {
    return {
      activeClientsCount: 0,
      activeProjectsCount: 0,
      totalProjectsCount: 0,
      totalPipelineValueStr: '₹0',
      totalCollectedStr: '₹0',
      pendingTasksCount: 0,
    };
  }
}

// ─── Digital Client Credential Provisioning & Mapping ───────────────────────
export interface ProvisionedClientCredential {
  email: string;
  tempPassword: string;
  role: string;
  fullName: string;
  companyName: string;
  clientId: string;
  requirePasswordReset: boolean;
  provisionedAt: string;
}

export async function provisionDigitalClientLogin(client: {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  contact_person?: string;
}): Promise<ProvisionedClientCredential> {
  const cleanEmail = client.email.trim().toLowerCase();
  const tempPassword = `DigPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const companyName = client.company_name || client.name || 'Digital Client Account';
  const fullName = client.contact_person || client.name || 'Client Representative';

  const credentialPayload: ProvisionedClientCredential = {
    email: cleanEmail,
    tempPassword,
    role: 'digital',
    fullName,
    companyName,
    clientId: client.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  // 1. Save to local storage for persistent mock/fallback lookup
  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'digital',
    full_name: fullName,
    company_name: companyName,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_digital_client_cred_${client.id}`, JSON.stringify(credentialPayload));

  // 2. Persist to Supabase users table if available
  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'digital',
      full_name: fullName,
      phone: '',
      department: `Digital:${companyName}`,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch {}

  triggerLocalSync('ferex_digital_clients_change');
  return credentialPayload;
}

export function getDigitalClientCredentials(clientId: string): ProvisionedClientCredential | null {
  const saved = localStorage.getItem(`ferex_digital_client_cred_${clientId}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

