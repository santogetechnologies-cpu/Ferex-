import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Seed Guard Helpers ──────────────────────────────────────────────────────
// These prevent mock/default data from resurrecting after the user deletes it.
// On first launch, data is seeded into BOTH localStorage and Supabase.
// After that, an empty Supabase result is treated as "user deleted everything".
function isSeeded(entity: string): boolean {
  try { return localStorage.getItem('ferex_dig_seeded_' + entity) === 'true'; } catch { return false; }
}
function markSeeded(entity: string): void {
  try { localStorage.setItem('ferex_dig_seeded_' + entity, 'true'); } catch {}
}

// ─── Default Real-World Seed Data ───────────────────────────────────────────
const DEFAULT_CLIENTS = [
  {
    id: 'cli-dig-nexus',
    company_name: 'Nexus FinTech Global',
    name: 'Nexus FinTech Global',
    contact_person: 'Ananya Deshmukh',
    email: 'ananya@nexusfintech.io',
    phone: '+91 98201 44552',
    industry: 'FinTech & Banking',
    client_type: 'FinTech & Banking',
    city: 'Mumbai',
    status: 'Active',
    total_revenue: 1450000,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'cli-dig-starlight',
    company_name: 'Starlight E-Commerce Brands',
    name: 'Starlight E-Commerce Brands',
    contact_person: 'Vikram Mehta',
    email: 'vikram@starlightbrands.in',
    phone: '+91 98334 11223',
    industry: 'D2C Retail & Brands',
    client_type: 'D2C Retail & Brands',
    city: 'Bengaluru',
    status: 'Active',
    total_revenue: 680000,
    created_at: '2026-08-05T11:00:00Z',
    updated_at: '2026-09-02T11:00:00Z',
  },
  {
    id: 'cli-dig-aerocloud',
    company_name: 'AeroCloud Global SaaS',
    name: 'AeroCloud Global SaaS',
    contact_person: 'Sarah Jenkins',
    email: 'sarah.j@aerocloud.io',
    phone: '+1 (415) 890-2341',
    industry: 'Enterprise Cloud SaaS',
    client_type: 'Enterprise Cloud SaaS',
    city: 'San Francisco / Gurugram',
    status: 'Active',
    total_revenue: 790000,
    created_at: '2026-08-10T09:30:00Z',
    updated_at: '2026-09-03T09:30:00Z',
  },
  {
    id: 'cli-dig-tatadigital',
    company_name: 'Tata Digital & Mobility Labs',
    name: 'Tata Digital & Mobility Labs',
    contact_person: 'Rajesh Verma',
    email: 'r.verma@tatadigital.com',
    phone: '+91 98110 55667',
    industry: 'Automotive AI & Mobility',
    client_type: 'Automotive AI & Mobility',
    city: 'Pune',
    status: 'Active',
    total_revenue: 1850000,
    created_at: '2026-08-15T14:00:00Z',
    updated_at: '2026-09-04T08:00:00Z',
  },
];

const DEFAULT_PROJECTS = [
  {
    id: 'proj-dig-nexus',
    client_id: 'cli-dig-nexus',
    client: DEFAULT_CLIENTS[0],
    title: 'Nexus NeoBanking Web & Mobile Platform',
    service_category: 'Web & App Development',
    status: 'In Progress',
    budget: 1450000,
    progress: 68,
    deadline: '2026-10-15',
    lead_developer: 'Kavita Iyer',
    notes: 'React Native & Next.js core architecture with PCI-DSS compliant banking gateway.',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-09-03T16:00:00Z',
  },
  {
    id: 'proj-dig-starlight',
    client_id: 'cli-dig-starlight',
    client: DEFAULT_CLIENTS[1],
    title: 'Starlight Multi-Brand Design System & UI/UX',
    service_category: 'UI/UX Design',
    status: 'In Progress',
    budget: 680000,
    progress: 45,
    deadline: '2026-09-30',
    lead_developer: 'Sameer Sen',
    notes: 'Figma component tokens, dark mode design system, and multi-tenant Shopify storefront.',
    created_at: '2026-08-06T10:00:00Z',
    updated_at: '2026-09-02T15:00:00Z',
  },
  {
    id: 'proj-dig-aerocloud',
    client_id: 'cli-dig-aerocloud',
    client: DEFAULT_CLIENTS[2],
    title: 'AeroCloud Global SEO & Growth Marketing',
    service_category: 'SEO & Performance',
    status: 'In Progress',
    budget: 790000,
    progress: 80,
    deadline: '2026-10-05',
    lead_developer: 'Pooja Hegde',
    notes: 'Technical SEO overhaul, programmatic landing pages, and international SERP rankings.',
    created_at: '2026-08-11T11:00:00Z',
    updated_at: '2026-09-03T11:00:00Z',
  },
  {
    id: 'proj-dig-tatamobility',
    client_id: 'cli-dig-tatadigital',
    client: DEFAULT_CLIENTS[3],
    title: 'Tata Mobility Connected Fleet Analytics',
    service_category: 'Web & App Development',
    status: 'In Progress',
    budget: 1850000,
    progress: 30,
    deadline: '2026-11-20',
    lead_developer: 'Rohan Joshi',
    notes: 'IoT telemetry pipeline, driver scoring algorithm, and live WebGL map tracker.',
    created_at: '2026-08-16T14:30:00Z',
    updated_at: '2026-09-04T09:00:00Z',
  },
];

const DEFAULT_TASKS = [
  {
    id: 'task-dig-01',
    project_id: 'proj-dig-nexus',
    project: DEFAULT_PROJECTS[0],
    title: 'Architect OAuth2.0 & Multi-Tenant RBAC Security Module',
    priority: 'High',
    status: 'In Progress',
    due_date: '2026-09-08',
    assigned_to_name: 'Kavita Iyer',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-09-03T10:00:00Z',
  },
  {
    id: 'task-dig-02',
    project_id: 'proj-dig-starlight',
    project: DEFAULT_PROJECTS[1],
    title: 'Deliver Interactive Design Token Components & Figma Export',
    priority: 'Medium',
    status: 'Review',
    due_date: '2026-09-07',
    assigned_to_name: 'Sameer Sen',
    created_at: '2026-08-22T11:00:00Z',
    updated_at: '2026-09-02T16:00:00Z',
  },
  {
    id: 'task-dig-03',
    project_id: 'proj-dig-aerocloud',
    project: DEFAULT_PROJECTS[2],
    title: 'Core Web Vitals Optimization & High-Domain Authority Backlinks',
    priority: 'High',
    status: 'In Progress',
    due_date: '2026-09-10',
    assigned_to_name: 'Pooja Hegde',
    created_at: '2026-08-25T09:00:00Z',
    updated_at: '2026-09-03T14:00:00Z',
  },
  {
    id: 'task-dig-04',
    project_id: 'proj-dig-tatamobility',
    project: DEFAULT_PROJECTS[3],
    title: 'Implement Realtime WebSocket Fleet Telemetry Ingestion API',
    priority: 'High',
    status: 'To Do',
    due_date: '2026-09-12',
    assigned_to_name: 'Rohan Joshi',
    created_at: '2026-08-28T15:00:00Z',
    updated_at: '2026-09-04T08:30:00Z',
  },
  {
    id: 'task-dig-05',
    project_id: 'proj-dig-nexus',
    project: DEFAULT_PROJECTS[0],
    title: 'Staging Penetration Testing & OWASP Top 10 Audit',
    priority: 'Medium',
    status: 'To Do',
    due_date: '2026-09-15',
    assigned_to_name: 'Kavita Iyer',
    created_at: '2026-08-29T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'task-dig-06',
    project_id: 'proj-dig-starlight',
    project: DEFAULT_PROJECTS[1],
    title: 'E-Commerce Checkout Cart Conversion Funnel Redesign',
    priority: 'Low',
    status: 'Done',
    due_date: '2026-09-01',
    assigned_to_name: 'Sameer Sen',
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-09-01T18:00:00Z',
  },
];

const DEFAULT_INVOICES = [
  {
    id: 'inv-dig-01',
    client_id: 'cli-dig-nexus',
    client: DEFAULT_CLIENTS[0],
    project_id: 'proj-dig-nexus',
    project: DEFAULT_PROJECTS[0],
    invoice_no: 'INV-DIG-8841',
    amount: 725000,
    tax_amount: 130500,
    currency: 'INR',
    status: 'Paid',
    due_date: '2026-08-30',
    issued_at: '2026-08-15T10:00:00Z',
    paid_at: '2026-08-28T14:00:00Z',
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 'inv-dig-02',
    client_id: 'cli-dig-starlight',
    client: DEFAULT_CLIENTS[1],
    project_id: 'proj-dig-starlight',
    project: DEFAULT_PROJECTS[1],
    invoice_no: 'INV-DIG-8842',
    amount: 340000,
    tax_amount: 61200,
    currency: 'INR',
    status: 'Paid',
    due_date: '2026-08-28',
    issued_at: '2026-08-12T11:00:00Z',
    paid_at: '2026-08-26T16:00:00Z',
    created_at: '2026-08-12T11:00:00Z',
  },
  {
    id: 'inv-dig-03',
    client_id: 'cli-dig-nexus',
    client: DEFAULT_CLIENTS[0],
    project_id: 'proj-dig-nexus',
    project: DEFAULT_PROJECTS[0],
    invoice_no: 'INV-DIG-8843',
    amount: 725000,
    tax_amount: 130500,
    currency: 'INR',
    status: 'Sent',
    due_date: '2026-09-25',
    issued_at: '2026-09-01T10:00:00Z',
    paid_at: null,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'inv-dig-04',
    client_id: 'cli-dig-aerocloud',
    client: DEFAULT_CLIENTS[2],
    project_id: 'proj-dig-aerocloud',
    project: DEFAULT_PROJECTS[2],
    invoice_no: 'INV-DIG-8844',
    amount: 395000,
    tax_amount: 71100,
    currency: 'INR',
    status: 'Sent',
    due_date: '2026-09-20',
    issued_at: '2026-09-02T11:00:00Z',
    paid_at: null,
    created_at: '2026-09-02T11:00:00Z',
  },
  {
    id: 'inv-dig-05',
    client_id: 'cli-dig-tatadigital',
    client: DEFAULT_CLIENTS[3],
    project_id: 'proj-dig-tatamobility',
    project: DEFAULT_PROJECTS[3],
    invoice_no: 'INV-DIG-8845',
    amount: 925000,
    tax_amount: 166500,
    currency: 'INR',
    status: 'Draft',
    due_date: '2026-10-10',
    issued_at: '2026-09-03T12:00:00Z',
    paid_at: null,
    created_at: '2026-09-03T12:00:00Z',
  },
];

// ─── Digital Clients ────────────────────────────────────────────────────────
export async function getDigitalClients() {
  const seeded = isSeeded('clients');
  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (data.length > 0) {
        try { localStorage.setItem('ferex_digital_clients', JSON.stringify(data)); } catch {}
        if (!seeded) markSeeded('clients');
        return data;
      } else if (seeded) {
        // Seeded before but Supabase is empty → user deleted all records, respect it
        try { localStorage.setItem('ferex_digital_clients', JSON.stringify([])); } catch {}
        return [];
      }
    }

    // Supabase unavailable → use local cache (trust it even if empty[])
    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }

    // First-ever load: seed into Supabase + localStorage, mark seeded
    markSeeded('clients');
    try { localStorage.setItem('ferex_digital_clients', JSON.stringify(DEFAULT_CLIENTS)); } catch {}
    try { await supabase.from('digital_clients').insert(DEFAULT_CLIENTS); } catch {}
    return DEFAULT_CLIENTS;
  } catch {
    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return seeded ? [] : DEFAULT_CLIENTS;
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
  // Return actual leads from DB; never fall back to hardcoded mock leads
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
  const seeded = isSeeded('projects');
  try {
    let query = supabase.from('digital_projects').select('*, client:digital_clients(*)').order('created_at', { ascending: false });
    if (category && category !== 'All') {
      query = query.eq('service_category', category);
    }
    const { data, error } = await query;
    if (!error && data) {
      if (data.length > 0) {
        try { localStorage.setItem('ferex_digital_projects', JSON.stringify(data)); } catch {}
        if (!seeded) markSeeded('projects');
        if (category && category !== 'All') return data.filter((p: any) => p.service_category === category);
        return data;
      } else if (seeded) {
        try { localStorage.setItem('ferex_digital_projects', JSON.stringify([])); } catch {}
        return [];
      }
    }

    const local = localStorage.getItem('ferex_digital_projects');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (category && category !== 'All') return parsed.filter((p: any) => p.service_category === category);
        return parsed;
      } catch {}
    }

    // First-ever load: seed into Supabase + localStorage, mark seeded
    markSeeded('projects');
    try { localStorage.setItem('ferex_digital_projects', JSON.stringify(DEFAULT_PROJECTS)); } catch {}
    try { await supabase.from('digital_projects').insert(DEFAULT_PROJECTS.map(p => ({ ...p, client: undefined }))); } catch {}
    if (category && category !== 'All') return DEFAULT_PROJECTS.filter((p: any) => p.service_category === category);
    return DEFAULT_PROJECTS;
  } catch {
    const local = localStorage.getItem('ferex_digital_projects');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (category && category !== 'All') return parsed.filter((p: any) => p.service_category === category);
        return parsed;
      } catch {}
    }
    return seeded ? [] : DEFAULT_PROJECTS;
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

  if (!clientId) {
    if (clients.length > 0) {
      clientId = clients[0].id;
      clientObj = clients[0];
    } else {
      const created = await createDigitalClient({
        company_name: project.client_name || 'Nexus FinTech Global',
        contact_person: 'Ananya Deshmukh',
        email: 'ananya@nexusfintech.io'
      });
      clientId = created.id;
      clientObj = created;
    }
  }

  const payload = {
    id: generateUUID(),
    client_id: clientId,
    client: clientObj || { company_name: project.client_name || 'Enterprise Client' },
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

  const current = await getDigitalProjects();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_projects').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return payload;
}

export async function updateDigitalProject(id: string, updates: any) {
  const current = await getDigitalProjects();
  const updated = current.map((p: any) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id); } catch {}
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
  const seeded = isSeeded('tasks');
  try {
    let query = supabase.from('digital_tasks').select('*, project:digital_projects(*)').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (!error && data) {
      if (data.length > 0) {
        try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(data)); } catch {}
        if (!seeded) markSeeded('tasks');
        if (projectId) return data.filter((t: any) => t.project_id === projectId);
        return data;
      } else if (seeded) {
        try { localStorage.setItem('ferex_digital_tasks', JSON.stringify([])); } catch {}
        return [];
      }
    }

    const local = localStorage.getItem('ferex_digital_tasks');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (projectId) return parsed.filter((t: any) => t.project_id === projectId);
        return parsed;
      } catch {}
    }

    // First-ever load: seed into Supabase + localStorage, mark seeded
    markSeeded('tasks');
    try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(DEFAULT_TASKS)); } catch {}
    try { await supabase.from('digital_tasks').insert(DEFAULT_TASKS.map(t => ({ ...t, project: undefined }))); } catch {}
    if (projectId) return DEFAULT_TASKS.filter((t: any) => t.project_id === projectId);
    return DEFAULT_TASKS;
  } catch {
    const local = localStorage.getItem('ferex_digital_tasks');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (projectId) return parsed.filter((t: any) => t.project_id === projectId);
        return parsed;
      } catch {}
    }
    return seeded ? [] : DEFAULT_TASKS;
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
  const projects = await getDigitalProjects();
  let projObj = projects.find((p: any) => p.id === task.project_id);
  let projId = task.project_id || projObj?.id;

  if (!projId) {
    if (projects.length > 0) {
      projId = projects[0].id;
      projObj = projects[0];
    } else {
      const created = await createDigitalProject({ title: 'Nexus Web Platform' });
      projId = created.id;
      projObj = created;
    }
  }

  const payload = {
    id: generateUUID(),
    project_id: projId,
    project: projObj || { title: 'Project Deliverable' },
    title: task.title,
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to_name: task.assigned_to_name || 'Kavita Iyer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalTasks();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_tasks').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return payload;
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  const current = await getDigitalTasks();
  const updated = current.map((t: any) => t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return updated.find((t: any) => t.id === id) || { id, status };
}

export async function deleteDigitalTask(id: string) {
  const current = await getDigitalTasks();
  const updated = current.filter((t: any) => t.id !== id);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_tasks').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return true;
}

// ─── Digital Invoices & Payments ────────────────────────────────────────────
export async function getDigitalInvoices() {
  const seeded = isSeeded('invoices');
  try {
    const { data, error } = await supabase
      .from('digital_invoices')
      .select('*, client:digital_clients(*), project:digital_projects(*)')
      .order('issued_at', { ascending: false });

    if (!error && data) {
      if (data.length > 0) {
        try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(data)); } catch {}
        if (!seeded) markSeeded('invoices');
        return data;
      } else if (seeded) {
        try { localStorage.setItem('ferex_digital_invoices', JSON.stringify([])); } catch {}
        return [];
      }
    }

    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }

    // First-ever load: seed into Supabase + localStorage, mark seeded
    markSeeded('invoices');
    try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(DEFAULT_INVOICES)); } catch {}
    try {
      await supabase.from('digital_invoices').insert(
        DEFAULT_INVOICES.map(i => ({ ...i, client: undefined, project: undefined }))
      );
    } catch {}
    return DEFAULT_INVOICES;
  } catch {
    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return seeded ? [] : DEFAULT_INVOICES;
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
  const clients = await getDigitalClients();
  const projects = await getDigitalProjects();

  let clientObj = clients.find((c: any) => c.id === inv.client_id || c.company_name === inv.client_name);
  let clientId = inv.client_id || clientObj?.id;
  if (!clientId && clients.length > 0) {
    clientId = clients[0].id;
    clientObj = clients[0];
  }

  let projObj = projects.find((p: any) => p.id === inv.project_id);

  const payload = {
    id: generateUUID(),
    client_id: clientId,
    client: clientObj || { company_name: inv.client_name || 'Enterprise Client' },
    project_id: inv.project_id || null,
    project: projObj || null,
    invoice_no: inv.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: Number(inv.amount) || 150000,
    tax_amount: Number(inv.tax_amount) || Math.round((Number(inv.amount) || 150000) * 0.18),
    currency: 'INR',
    status: inv.status || 'Sent',
    due_date: inv.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const current = await getDigitalInvoices();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_invoices').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return payload;
}

export async function updateDigitalInvoiceStatus(id: string, status: string) {
  const current = await getDigitalInvoices();
  const updated = current.map((i: any) => i.id === id ? { ...i, status, paid_at: status === 'Paid' ? new Date().toISOString() : null } : i);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_invoices').update({ status, paid_at: status === 'Paid' ? new Date().toISOString() : null }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return updated.find((i: any) => i.id === id) || { id, status };
}

export async function deleteDigitalInvoice(id: string) {
  const current = await getDigitalInvoices();
  const updated = current.filter((i: any) => i.id !== id);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_invoices').delete().eq('id', id); } catch {}
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
    const [clients, projects, invoices, tasks] = await Promise.all([
      getDigitalClients(),
      getDigitalProjects(),
      getDigitalInvoices(),
      getDigitalTasks(),
    ]);

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
      activeClientsCount: clients.filter((c: any) => c.status !== 'Archived').length,
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: projects.length,
      totalPipelineValueStr: formatInr(totalPipelineBudget),
      totalCollectedStr: formatInr(totalCollected),
      pendingTasksCount: pendingTasks.length,
    };
  } catch {
    return {
      activeClientsCount: 4,
      activeProjectsCount: 4,
      totalProjectsCount: 4,
      totalPipelineValueStr: '₹47.70 Lakhs',
      totalCollectedStr: '₹10.65 Lakhs',
      pendingTasksCount: 5,
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
    
    // Save detailed items in localStorage for instant retrieval
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
    try {
      return JSON.parse(saved);
    } catch {}
  }
  const defaultAssets: DigitalAsset[] = [
    {
      id: 'AST-DIG-01',
      name: 'AWS Elastic Kubernetes (EKS Production Cluster)',
      type: 'Cloud Infrastructure',
      provider: 'Amazon Web Services',
      cost_per_month_inr: 88500,
      renewal_date: '2026-10-01',
      status: 'Active',
      assigned_to_project: 'Nexus FinTech Platform',
      assigned_team_lead: 'Kavita Iyer',
      license_seats: 12
    },
    {
      id: 'AST-DIG-02',
      name: 'Figma Enterprise Organization Workspace',
      type: 'Design & Dev Tools',
      provider: 'Figma Inc.',
      cost_per_month_inr: 32000,
      renewal_date: '2026-09-28',
      status: 'Active',
      assigned_to_project: 'Global Design System',
      assigned_team_lead: 'Sameer Sen',
      license_seats: 25
    },
    {
      id: 'AST-DIG-03',
      name: 'Cloudflare Enterprise SSL & DDoS Shield',
      type: 'SSL & Security',
      provider: 'Cloudflare Inc.',
      cost_per_month_inr: 21500,
      renewal_date: '2026-09-15',
      status: 'Expiring Soon',
      assigned_to_project: 'All Active Client Portals',
      assigned_team_lead: 'Rohan Joshi',
    },
    {
      id: 'AST-DIG-04',
      name: 'OpenAI GPT-4o Enterprise API Gateway',
      type: 'API Gateway',
      provider: 'OpenAI LLC',
      cost_per_month_inr: 54000,
      renewal_date: '2026-10-05',
      status: 'Active',
      assigned_to_project: 'AI Copilot & Workflow Engines',
      assigned_team_lead: 'Kavita Iyer',
    },
    {
      id: 'AST-DIG-05',
      name: 'GitHub Enterprise & Copilot Business Seats',
      type: 'SaaS License',
      provider: 'GitHub Inc.',
      cost_per_month_inr: 18000,
      renewal_date: '2026-11-01',
      status: 'Active',
      assigned_to_project: 'Core Engineering',
      assigned_team_lead: 'Kavita Iyer',
      license_seats: 18
    }
  ];
  try { localStorage.setItem('ferex_digital_assets', JSON.stringify(defaultAssets)); } catch {}
  return defaultAssets;
}

export async function createDigitalAsset(asset: Partial<DigitalAsset>): Promise<DigitalAsset> {
  const current = await getDigitalAssets();
  const created: DigitalAsset = {
    id: `AST-DIG-${Math.floor(10 + Math.random() * 90)}`,
    name: asset.name || 'Cloud Asset / License',
    type: asset.type || 'SaaS License',
    provider: asset.provider || 'SaaS Provider',
    cost_per_month_inr: Number(asset.cost_per_month_inr) || 12000,
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


