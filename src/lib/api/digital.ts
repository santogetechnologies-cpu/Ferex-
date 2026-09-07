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

    if (!error && data) {
      try { localStorage.setItem('ferex_digital_clients', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
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
    phone: client.phone || '',
    industry: client.industry || client.client_type || 'Technology',
    status: client.status || 'Active',
    total_revenue: 0.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalClients();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return payload;
}

export async function updateDigitalClient(id: string, updates: any) {
  const current = await getDigitalClients();
  const updated = current.map((c: any) => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return updated.find((c: any) => c.id === id) || { id, ...updates };
}

export async function deleteDigitalClient(id: string) {
  const current = await getDigitalClients();
  const updated = current.filter((c: any) => c.id !== id);
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return true;
}

// ─── Digital Leads ──────────────────────────────────────────────────────────
export async function getDigitalLeads() {
  const clients = await getDigitalClients();
  return clients.filter((c: any) => c.status === 'Lead');
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
    if (!error && data) {
      try { localStorage.setItem('ferex_digital_projects', JSON.stringify(data)); } catch {}
      if (category && category !== 'All') return data.filter((p: any) => p.service_category === category);
      return data;
    }

    const local = localStorage.getItem('ferex_digital_projects');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (category && category !== 'All') return parsed.filter((p: any) => p.service_category === category);
        return parsed;
      } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_projects');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (category && category !== 'All') return parsed.filter((p: any) => p.service_category === category);
        return parsed;
      } catch {}
    }
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
  const clients = await getDigitalClients();
  let clientObj = clients.find((c: any) => c.id === project.client_id || c.company_name === project.client_name);
  let clientId = project.client_id || clientObj?.id;

  if (!clientId && project.client_name) {
    const created = await createDigitalClient({
      company_name: project.client_name,
      contact_person: 'Client Contact',
      email: `contact@${project.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    });
    clientId = created.id;
    clientObj = created;
  }

  const payload = {
    id: generateUUID(),
    client_id: clientId || null,
    client: clientObj || { company_name: project.client_name || 'Enterprise Client' },
    title: project.title,
    service_category: project.service_category || 'Web Development',
    status: project.status || 'In Progress',
    budget: Number(project.budget) || 0,
    progress: Number(project.progress) || 0,
    deadline: project.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lead_developer: project.lead_developer || 'Unassigned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalProjects();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    const { client, ...dbPayload } = payload;
    await supabase.from('digital_projects').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return payload;
}

export async function updateDigitalProject(id: string, updates: any) {
  const current = await getDigitalProjects();
  const updated = current.map((p: any) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    const { client, ...dbUpdates } = updates;
    await supabase.from('digital_projects').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return updated.find((p: any) => p.id === id) || { id, ...updates };
}

export async function deleteDigitalProject(id: string) {
  const current = await getDigitalProjects();
  const updated = current.filter((p: any) => p.id !== id);
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_projects').delete().eq('id', id); } catch {}
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
    if (!error && data) {
      try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(data)); } catch {}
      if (projectId) return data.filter((t: any) => t.project_id === projectId);
      return data;
    }

    const local = localStorage.getItem('ferex_digital_tasks');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (projectId) return parsed.filter((t: any) => t.project_id === projectId);
        return parsed;
      } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_tasks');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (projectId) return parsed.filter((t: any) => t.project_id === projectId);
        return parsed;
      } catch {}
    }
    return [];
  }
}

export async function createDigitalTask(task: {
  project_id?: string;
  project_title?: string;
  title: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to_name?: string;
}) {
  const payload = {
    id: generateUUID(),
    project_id: task.project_id || null,
    title: task.title,
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to_name: task.assigned_to_name || 'Engineering Team',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalTasks();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try {
    const { project, ...dbPayload } = payload as any;
    await supabase.from('digital_tasks').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return payload;
}

export async function updateDigitalTask(id: string, updates: any) {
  const current = await getDigitalTasks();
  const updated = current.map((t: any) => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try {
    const { project, ...dbUpdates } = updates;
    await supabase.from('digital_tasks').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return updated.find((t: any) => t.id === id) || { id, ...updates };
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  return updateDigitalTask(id, { status });
}

export async function deleteDigitalTask(id: string) {
  const current = await getDigitalTasks();
  const updated = current.filter((t: any) => t.id !== id);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_tasks').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return true;
}

// ─── Digital Sprints ────────────────────────────────────────────────────────
export async function getDigitalSprints() {
  const saved = localStorage.getItem('ferex_digital_sprints');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalSprint(sprint: {
  name: string;
  project_id?: string;
  start_date: string;
  end_date: string;
  status?: string;
}) {
  const current = await getDigitalSprints();
  const created = {
    id: `SPR-${Date.now().toString().slice(-4)}`,
    ...sprint,
    status: sprint.status || 'Active',
    completed_points: 0,
    total_points: 40,
    created_at: new Date().toISOString(),
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_sprints', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_sprints_change');
  return created;
}

export async function updateDigitalSprint(id: string, updates: any) {
  const current = await getDigitalSprints();
  const updated = current.map((s: any) => s.id === id ? { ...s, ...updates } : s);
  localStorage.setItem('ferex_digital_sprints', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_sprints_change');
  return updated.find((s: any) => s.id === id) || { id, ...updates };
}

// ─── Digital Invoices ───────────────────────────────────────────────────────
export async function getDigitalInvoices(clientId?: string) {
  try {
    let query = supabase.from('digital_invoices').select('*, client:digital_clients(*), project:digital_projects(*)').order('created_at', { ascending: false });
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query;
    if (!error && data) {
      try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(data)); } catch {}
      if (clientId) return data.filter((i: any) => i.client_id === clientId);
      return data;
    }

    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (clientId) return parsed.filter((i: any) => i.client_id === clientId);
        return parsed;
      } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (clientId) return parsed.filter((i: any) => i.client_id === clientId);
        return parsed;
      } catch {}
    }
    return [];
  }
}

export async function createDigitalInvoice(invoice: {
  client_id?: string;
  client_name?: string;
  project_id?: string;
  invoice_no?: string;
  amount: number;
  tax_amount?: number;
  due_date?: string;
  status?: string;
  notes?: string;
}) {
  const clients = await getDigitalClients();
  let clientObj = clients.find((c: any) => c.id === invoice.client_id || c.company_name === invoice.client_name);
  let clientId = invoice.client_id || clientObj?.id;

  const invNo = invoice.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`;
  const amt = Number(invoice.amount) || 0;
  const taxAmt = invoice.tax_amount !== undefined ? Number(invoice.tax_amount) : Math.round(amt * 0.18);

  const payload = {
    id: generateUUID(),
    client_id: clientId || null,
    client: clientObj || { company_name: invoice.client_name || 'Enterprise Client' },
    project_id: invoice.project_id || null,
    invoice_no: invNo,
    amount: amt,
    tax_amount: taxAmt,
    currency: 'INR',
    status: invoice.status || 'Sent',
    due_date: invoice.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    paid_at: invoice.status === 'Paid' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  const current = await getDigitalInvoices();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try {
    const { client, project, ...dbPayload } = payload as any;
    await supabase.from('digital_invoices').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return payload;
}

export async function updateDigitalInvoice(id: string, updates: any) {
  const current = await getDigitalInvoices();
  const updated = current.map((i: any) => i.id === id ? { ...i, ...updates } : i);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try {
    const { client, project, ...dbUpdates } = updates;
    await supabase.from('digital_invoices').update(dbUpdates).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return updated.find((i: any) => i.id === id) || { id, ...updates };
}

export async function updateDigitalInvoiceStatus(id: string, status: string) {
  return updateDigitalInvoice(id, { status, paid_at: status === 'Paid' ? new Date().toISOString() : null });
}

export async function deleteDigitalInvoice(id: string) {
  const current = await getDigitalInvoices();
  const updated = current.filter((i: any) => i.id !== id);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_invoices').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return true;
}

// ─── Digital Expenses ───────────────────────────────────────────────────────
export async function getDigitalExpenses() {
  const saved = localStorage.getItem('ferex_digital_expenses');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalExpense(expense: {
  title: string;
  category: string;
  amount: number;
  project_id?: string;
  vendor?: string;
  date?: string;
}) {
  const current = await getDigitalExpenses();
  const created = {
    id: `EXP-DIG-${Date.now().toString().slice(-4)}`,
    ...expense,
    amount: Number(expense.amount) || 0,
    date: expense.date || new Date().toISOString().split('T')[0],
    status: 'Approved',
    created_at: new Date().toISOString(),
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
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalEmployee(emp: {
  name: string;
  role: string;
  department: string;
  email: string;
  rating?: number;
  kpiScore?: number;
  feedback?: string;
  projects?: number;
  tasks?: number;
}) {
  const current = await getDigitalEmployees();
  const created = {
    id: `EMP-${Math.floor(10 + Math.random() * 90)}`,
    status: 'Active',
    projectsCount: emp.projects || 0,
    ...emp,
    rating: emp.rating ?? 5.0,
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return created;
}

export async function updateDigitalEmployee(id: string, updates: any) {
  const current = await getDigitalEmployees();
  const updated = current.map((e: any) => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return updated.find((e: any) => e.id === id) || { id, ...updates };
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
    try { return JSON.parse(saved); } catch {}
  }
  return [];
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
    try { return JSON.parse(saved); } catch {}
  }
  return [];
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
    link: mtg.link || 'https://meet.google.com',
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

// ─── Digital Messages ───────────────────────────────────────────────────────
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

  try {
    const { data } = await supabase.from('trade_messages').insert(payload).select();
    if (data && data.length > 0) return data[0];
  } catch {}
  return payload;
}

// ─── Digital Dashboard Stats ────────────────────────────────────────────────
export async function getDigitalDashboardStats() {
  try {
    const [clients, projects, tasks, invoices] = await Promise.all([
      getDigitalClients(),
      getDigitalProjects(),
      getDigitalTasks(),
      getDigitalInvoices(),
    ]);

    const activeClients = clients.filter((c: any) => c.status === 'Active');
    const activeProjects = projects.filter((p: any) => p.status === 'In Progress');
    const totalPipeline = projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
    const totalCollected = invoices.filter((i: any) => i.status === 'Paid').reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const pendingTasks = tasks.filter((t: any) => t.status !== 'Done');

    const formatInr = (amt: number) => {
      if (!amt || amt === 0) return '₹0';
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakhs`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeClientsCount: activeClients.length,
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: projects.length,
      totalPipelineValueStr: formatInr(totalPipeline),
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
    role: 'digital_client',
    fullName,
    companyName,
    clientId: client.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'digital_client',
    full_name: fullName,
    company_name: companyName,
    client_id: client.id,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_digital_client_cred_${client.id}`, JSON.stringify(credentialPayload));

  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'digital_client',
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

// ─── Multi-Project Consolidated Invoicing ──────────────────────────────────
export interface MultiProjectInvoiceItem {
  projectId?: string;
  projectTitle: string;
  description: string;
  amount: number;
}

export async function createDigitalMultiProjectInvoice(payload: {
  client_id: string;
  client_name?: string;
  invoice_no?: string;
  due_date?: string;
  items: MultiProjectInvoiceItem[];
  notes?: string;
}) {
  const totalAmount = payload.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = Math.round(totalAmount * 0.18);
  const invNo = payload.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`;

  const invoiceRecord = {
    id: generateUUID(),
    client_id: payload.client_id,
    project_id: payload.items[0]?.projectId || null,
    invoice_no: invNo,
    amount: totalAmount,
    tax_amount: taxAmount,
    currency: 'INR',
    status: 'Sent',
    due_date: payload.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    items: payload.items,
    notes: payload.notes || `Consolidated invoice spanning ${payload.items.length} client projects.`
  };

  try {
    const { data, error } = await supabase.from('digital_invoices').insert({
      id: invoiceRecord.id,
      client_id: invoiceRecord.client_id,
      project_id: invoiceRecord.project_id,
      invoice_no: invoiceRecord.invoice_no,
      amount: invoiceRecord.amount,
      tax_amount: invoiceRecord.tax_amount,
      currency: invoiceRecord.currency,
      status: invoiceRecord.status,
      due_date: invoiceRecord.due_date,
      issued_at: invoiceRecord.issued_at,
      created_at: invoiceRecord.created_at,
    }).select();
    
    const multiSaved = localStorage.getItem('ferex_digital_multi_invoices') || '{}';
    try {
      const map = JSON.parse(multiSaved);
      map[invoiceRecord.id] = payload.items;
      localStorage.setItem('ferex_digital_multi_invoices', JSON.stringify(map));
    } catch {}

    triggerLocalSync('ferex_digital_invoices_change');
    if (!error && data && data.length > 0) return { ...data[0], items: payload.items };
  } catch {}

  triggerLocalSync('ferex_digital_invoices_change');
  return invoiceRecord;
}

export function getDigitalInvoiceItems(invoiceId: string): MultiProjectInvoiceItem[] {
  try {
    const multiSaved = localStorage.getItem('ferex_digital_multi_invoices');
    if (multiSaved) {
      const map = JSON.parse(multiSaved);
      if (map[invoiceId]) return map[invoiceId];
    }
  } catch {}
  return [];
}

// ─── Digital Agency Assets & Software License Inventory ────────────────────
export interface DigitalAsset {
  id: string;
  name: string;
  type: 'Cloud Infrastructure' | 'SaaS License' | 'Domain & DNS' | 'SSL & Security' | 'API Gateway' | 'Design & Dev Tools';
  provider: string;
  cost_per_month_inr: number;
  renewal_date: string;
  status: 'Active' | 'Expiring Soon' | 'Auto-Renewed' | 'Suspended';
  assigned_to_project?: string;
  assigned_team_lead?: string;
  license_seats?: number;
}

export async function getDigitalAssets(): Promise<DigitalAsset[]> {
  const saved = localStorage.getItem('ferex_digital_assets');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalAsset(asset: Partial<DigitalAsset>): Promise<DigitalAsset> {
  const current = await getDigitalAssets();
  const created: DigitalAsset = {
    id: `AST-DIG-${Math.floor(10 + Math.random() * 90)}`,
    name: asset.name || 'Cloud Asset / License',
    type: asset.type || 'SaaS License',
    provider: asset.provider || 'SaaS Provider',
    cost_per_month_inr: Number(asset.cost_per_month_inr) || 0,
    renewal_date: asset.renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: asset.status || 'Active',
    assigned_to_project: asset.assigned_to_project || 'Internal Core',
    assigned_team_lead: asset.assigned_team_lead || 'Engineering Lead',
    license_seats: asset.license_seats ? Number(asset.license_seats) : 1
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return created;
}

export async function updateDigitalAsset(id: string, updates: Partial<DigitalAsset>) {
  const current = await getDigitalAssets();
  const updated = current.map(a => a.id === id ? { ...a, ...updates } : a);
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function deleteDigitalAsset(id: string) {
  const current = await getDigitalAssets();
  const updated = current.filter(a => a.id !== id);
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function getDigitalAssetCostSummary() {
  const assets = await getDigitalAssets();
  const totalMonthlyInr = assets.reduce((sum, a) => sum + (Number(a.cost_per_month_inr) || 0), 0);
  const expiringSoonCount = assets.filter(a => a.status === 'Expiring Soon').length;
  const activeCount = assets.filter(a => a.status === 'Active').length;
  return {
    totalMonthlyInr,
    expiringSoonCount,
    activeCount,
    totalAssetsCount: assets.length
  };
}

// ─── Digital Notifications ───────────────────────────────────────────────────
export async function getDigitalNotifications() {
  try {
    const { data, error } = await supabase
      .from('digital_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createDigitalNotification(notif: {
  title: string;
  message?: string;
  description?: string;
  type?: string;
  category?: string;
  link?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: notif.title,
    message: notif.message || notif.description || '',
    type: notif.type || notif.category || 'info',
    link: notif.link || '',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const current = await getDigitalNotifications();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_notifications').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_notifications_change');
  return payload;
}

export async function markDigitalNotificationRead(id: string) {
  const current = await getDigitalNotifications();
  const updated = current.map((n: any) => n.id === id ? { ...n, is_read: true } : n);
  try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_notifications').update({ is_read: true }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_notifications_change');
  return true;
}
