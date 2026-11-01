import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Plus, Eye, X, CheckCircle2, Trash2, Printer,
  FolderKanban, Building2, CheckCircle, Clock, Zap, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, Shield, ArrowUpRight, Check, AlertCircle, Layers
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getDigitalInvoices,
  updateDigitalInvoiceStatus,
  deleteDigitalInvoice,
  getDigitalClients,
  getDigitalProjects,
  createDigitalMultiProjectInvoice,
  getDigitalInvoiceItems,
  type MultiProjectInvoiceItem
} from '../../lib/api/digital';
import { UnifiedPaymentModal } from '../../components/UnifiedPaymentModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';

// ─── Print Official B2B Invoice PDF ─────────────────────────────────────────
function printOfficialInvoicePDF(inv: any) {
  const baseAmt = Number(inv.amount || 0);
  const taxAmt = Number(inv.tax_amount || Math.round(baseAmt * 0.18));
  const total = baseAmt + taxAmt;
  const rcvd = Number(inv.amount_received !== undefined ? inv.amount_received : (inv.status === 'Paid' ? baseAmt : 0));
  const balance = Number(inv.balance_due !== undefined ? inv.balance_due : (inv.status === 'Paid' ? 0 : baseAmt));
  const items = inv.items || [];

  const itemsHtml = items.map((it: any) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 8px; font-size: 12px; color: #1e293b;">
        <strong>${it.projectTitle || it.title || 'Digital Deliverable'}</strong>
        ${it.description ? `<br><span style="color: #64748b; font-size: 11px;">${it.description}</span>` : ''}
      </td>
      <td style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">
        ₹${Number(it.amount || 0).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>B2B Tax Invoice — ${inv.invoice_no}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 40px; }
    .page { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #58051E; }
    .logo span { font-size: 12px; font-weight: 500; color: #64748b; display: block; margin-top: 2px; }
    .doc-no { font-size: 20px; font-weight: 800; color: #0f172a; }
    .divider { height: 2px; background: linear-gradient(to right, #58051E, #f1f5f9); margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f8fafc; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">FEREX DIGITAL ERP<br><span>Official Agency B2B Tax Invoice</span></div>
    <div style="text-align: right;">
      <div class="doc-no">${inv.invoice_no}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Issued: ${new Date(inv.issued_at || inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      <div style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; ${
        inv.status === 'Paid' ? 'background: #d1fae5; color: #065f46;' :
        inv.status === 'Partially Paid' ? 'background: #dbeafe; color: #1d4ed8;' :
        'background: #fef3c7; color: #92400e;'
      }; margin-top: 6px;">${inv.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
    <div>
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Billed To (Client)</div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${inv.client?.company_name || inv.client?.name || inv.client_name || 'Enterprise Client'}</div>
      <div style="font-size: 12px; color: #64748b;">Project: ${inv.project?.title || inv.project_title || 'Digital Campaign Services'}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Payment Due Date</div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${inv.due_date || 'Net 15 Days'}</div>
      <div style="font-size: 11px; color: #64748b;">Category: ${inv.service_category || 'Digital Engineering'}</div>
    </div>
  </div>

  <div style="margin-bottom: 24px;">
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Project Deliverables & Commercial Scope</div>
    <table>
      <thead>
        <tr>
          <th>Deliverable Scope & Component</th>
          <th style="text-align: right;">Commercial Fee</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml.length > 0 ? itemsHtml : `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-size: 12px; color: #1e293b;">
              <strong>${inv.project?.title || 'Digital Project Scope'}</strong>
            </td>
            <td style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700;">
              ₹${baseAmt.toLocaleString('en-IN')}
            </td>
          </tr>
        `}
      </tbody>
    </table>

    <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>Taxable Service Fee:</span>
        <span style="font-weight: 700;">₹${baseAmt.toLocaleString('en-IN')}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>CGST + SGST (18%):</span>
        <span style="font-weight: 700;">₹${taxAmt.toLocaleString('en-IN')}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; font-weight: 800; border-top: 1px solid #e2e8f0;">
        <span>Total Invoiced (INR):</span>
        <span style="color: #58051E;">₹${total.toLocaleString('en-IN')}</span>
      </div>
      ${rcvd > 0 ? `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
        <span>Actual Money Received to Date:</span>
        <span style="font-weight: 700;">₹${rcvd.toLocaleString('en-IN')}</span>
      </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; padding: 4px 0; color: ${balance > 0 ? '#b45309' : '#059669'}; font-weight: 800;">
        <span>Remaining Outstanding Balance:</span>
        <span>₹${balance.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>This is an official computer-generated B2B Invoice from Ferex Digital Agency Suite.</div>
    <div>Authorized Financial Accounts Sign-off</div>
  </div>
</div>
</body>
</html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
}

// ─── Print Multi-Project Client Account Statement PDF ───────────────────────
function printClientMultiProjectLedgerPDF(clientSummary: {
  clientName: string;
  totalAgreed: number;
  totalTax: number;
  totalPayable: number;
  totalCollected: number;
  totalOutstanding: number;
  projects: Array<{
    title: string;
    category?: string;
    invoiceNo: string;
    budget: number;
    collected: number;
    balance: number;
    status: string;
  }>;
}) {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const rowsHtml = clientSummary.projects.map((p) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px; font-size: 12px; color: #1e293b;">
        <strong>${p.title}</strong><br>
        <span style="color: #64748b; font-size: 11px;">${p.category || 'Digital Services'}</span>
      </td>
      <td style="padding: 10px 8px; font-size: 12px; font-family: monospace; color: #58051E; font-weight: 700;">${p.invoiceNo}</td>
      <td style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700;">₹${p.budget.toLocaleString('en-IN')}</td>
      <td style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #059669;">₹${p.collected.toLocaleString('en-IN')}</td>
      <td style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: ${p.balance > 0 ? '#b45309' : '#059669'};">₹${p.balance.toLocaleString('en-IN')}</td>
      <td style="padding: 10px 8px; text-align: center;">
        <span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; ${
          p.status === 'Paid' ? 'background: #d1fae5; color: #065f46;' :
          p.status === 'Partially Paid' ? 'background: #dbeafe; color: #1d4ed8;' :
          'background: #fef3c7; color: #92400e;'
        }">${p.status.toUpperCase()}</span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Client Account Statement & Multi-Project Ledger — ${clientSummary.clientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #58051E; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #58051E; }
    .logo span { display: block; font-size: 12px; font-weight: 600; color: #64748b; }
    .meta { text-align: right; font-size: 12px; color: #475569; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800; border-bottom: 2px solid #cbd5e1; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">FEREX DIGITAL ERP<br><span>Official Client Financial Services • Multi-Project Account Ledger</span></div>
    <div class="meta">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Account:</strong> ${clientSummary.clientName}</div>
      <div><strong>Currency:</strong> INR (₹)</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Contracted</div>
      <div class="kpi-val">₹${clientSummary.totalAgreed.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">GST Invoiced (18%)</div>
      <div class="kpi-val">₹${clientSummary.totalTax.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Actual Money Collected</div>
      <div class="kpi-val" style="color: #059669;">₹${clientSummary.totalCollected.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Outstanding Balance</div>
      <div class="kpi-val" style="color: ${clientSummary.totalOutstanding > 0 ? '#b45309' : '#059669'};">
        ₹${clientSummary.totalOutstanding.toLocaleString('en-IN')}
      </div>
    </div>
  </div>

  <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 24px;">
    Consolidated Project Portfolios & Invoices (${clientSummary.projects.length})
  </h3>
  <table>
    <thead>
      <tr>
        <th>Project Deliverable & Service</th>
        <th>Invoice Number</th>
        <th style="text-align: right;">Agreed Budget</th>
        <th style="text-align: right;">Collected</th>
        <th style="text-align: right;">Remaining Due</th>
        <th style="text-align: center;">Billing Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>Generated automatically by Ferex Digital ERP Single Source of Truth Billing Engine.</div>
    <div>Authorized Financial Accounts Sign-off</div>
  </div>
</body>
</html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
}

export const DigitalInvoices: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff, isCentral, canDelete } = useDigitalPermissions();

  const [activeTab, setActiveTab] = useState<'invoices' | 'ledgers'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [settlingInvoice, setSettlingInvoice] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Multi-Project Consolidated Invoice Form State
  const [newInvClient, setNewInvClient] = useState('');
  const [newInvNo, setNewInvNo] = useState(`INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newInvDueDate, setNewInvDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [newInvNotes, setNewInvNotes] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<MultiProjectInvoiceItem[]>([
    { projectId: '', projectTitle: 'Core Platform Architecture & UI', description: 'Sprint 1 & Sprint 2 deliverable milestones', amount: 150000 }
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, clientData, projData] = await Promise.all([
        getDigitalInvoices(),
        getDigitalClients(),
        getDigitalProjects()
      ]);
      setClients(clientData || []);
      setAllProjects(projData || []);
      setInvoices(invData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_invoices_change', handleLocalChange);
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);
    window.addEventListener('ferex_digital_centralized_billing_change', handleLocalChange);
    window.addEventListener('ferex_digital_payments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
      window.removeEventListener('ferex_digital_centralized_billing_change', handleLocalChange);
      window.removeEventListener('ferex_digital_payments_change', handleLocalChange);
    };
  }, [loadData]);

  // Set default client when modal opens
  useEffect(() => {
    if (clients.length > 0 && !newInvClient) {
      setNewInvClient(clients[0].id);
    }
  }, [clients, newInvClient]);

  // Add Item row to invoice
  const handleAddItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      { projectId: '', projectTitle: 'Additional Module / Service Milestone', description: 'Detailed deliverable scope', amount: 50000 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof MultiProjectInvoiceItem, value: any) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalTaxAmount = Math.round(totalInvoiceAmount * 0.18);
  const grandTotal = totalInvoiceAmount + totalTaxAmount;

  const handleAddMultiInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvClient || invoiceItems.length === 0) return;

    const selectedClientObj = clients.find(c => c.id === newInvClient);

    await createDigitalMultiProjectInvoice({
      client_id: newInvClient,
      client_name: selectedClientObj?.company_name || selectedClientObj?.name || 'Enterprise Client',
      invoice_no: newInvNo,
      due_date: newInvDueDate,
      items: invoiceItems,
      notes: newInvNotes
    });

    setShowAddModal(false);
    showToast(`Issued multi-project invoice ${newInvNo} (₹${grandTotal.toLocaleString('en-IN')})`);

    // Reset state
    setNewInvNo(`INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewInvDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setNewInvNotes('');
    setInvoiceItems([
      { projectId: '', projectTitle: 'Core Platform Architecture & UI', description: 'Sprint 1 & Sprint 2 deliverable milestones', amount: 150000 }
    ]);
    await loadData();
  };

  const handleTogglePaid = async (inv: any) => {
    if (!isAdmin && !isCentral) return;
    const nextStatus = inv.status === 'Paid' ? 'Sent' : 'Paid';
    await updateDigitalInvoiceStatus(inv.id, nextStatus);
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: nextStatus } : i));
    showToast(`Invoice ${inv.invoice_no || inv.id} marked as ${nextStatus}`);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteDigitalInvoice(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      showToast('Invoice deleted successfully');
    } catch (err: any) {
      showToast(`Error deleting invoice: ${err.message || 'Unknown error'}`);
    }
  };

  // Staff Isolation: Determine assigned project IDs
  const myName = (profile?.full_name || '').toLowerCase();
  const myEmail = (profile?.email || '').toLowerCase();
  const myAssignedProjectIds = new Set(
    allProjects
      .filter(p => {
        const staffId = p.assigned_staff_id || '';
        const staffName = (p.assigned_staff_name || '').toLowerCase();
        return staffId === profile?.id ||
          (myName && staffName.includes(myName)) ||
          (myEmail && (staffName.includes(myEmail.split('@')[0]) || staffName.includes('pm')));
      })
      .map(p => p.id)
  );

  const filtered = invoices.filter(i => {
    // Search match
    const matchSearch =
      (i.invoice_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.client?.company_name || i.client?.name || i.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.project?.title || i.project_title || '').toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchStatus = statusFilter === 'All' || i.status === statusFilter;

    // Staff confidentiality: Staff only see invoices belonging to their assigned projects
    if (isStaff) {
      const items = i.items || getDigitalInvoiceItems(i.id) || [];
      const matchesAssigned = (i.project_id && myAssignedProjectIds.has(i.project_id)) ||
        items.some((it: any) => it.projectId && myAssignedProjectIds.has(it.projectId));
      if (!matchesAssigned) return false;
    }

    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Client available projects for dropdown
  const clientAvailableProjects = allProjects.filter(p => p.client_id === newInvClient || p.client?.id === newInvClient);

  // Total Invoiced, Payments Collected, Outstanding Receivables (Clean Single Source of Truth)
  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalCollected = invoices.reduce((sum, i) => {
    const rcvd = i.amount_received !== undefined ? Number(i.amount_received) : (i.status === 'Paid' ? Number(i.amount || 0) : 0);
    return sum + rcvd;
  }, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

  // ─── Automatic Client Multi-Project Ledgers Aggregation ──────────────────────
  const clientLedgers = useMemo(() => {
    const clientMap = new Map<string, {
      clientId: string;
      clientName: string;
      projects: any[];
      invoices: any[];
      totalAgreed: number;
      totalTax: number;
      totalPayable: number;
      totalCollected: number;
      totalOutstanding: number;
    }>();

    // Group active projects
    allProjects.forEach(proj => {
      const cId = proj.client_id || 'unassigned';
      const cName = proj.client_name || proj.client?.company_name || 'Client Account';
      if (!clientMap.has(cId)) {
        clientMap.set(cId, {
          clientId: cId,
          clientName: cName,
          projects: [],
          invoices: [],
          totalAgreed: 0,
          totalTax: 0,
          totalPayable: 0,
          totalCollected: 0,
          totalOutstanding: 0
        });
      }
      const entry = clientMap.get(cId)!;
      entry.projects.push(proj);
    });

    // Attach invoices and compute financial totals
    invoices.forEach(inv => {
      const cId = inv.client_id || 'unassigned';
      if (!clientMap.has(cId)) {
        clientMap.set(cId, {
          clientId: cId,
          clientName: inv.client_name || inv.client?.company_name || 'Client Account',
          projects: [],
          invoices: [],
          totalAgreed: 0,
          totalTax: 0,
          totalPayable: 0,
          totalCollected: 0,
          totalOutstanding: 0
        });
      }
      const entry = clientMap.get(cId)!;
      entry.invoices.push(inv);

      const baseAmt = Number(inv.amount || 0);
      const taxAmt = Number(inv.tax_amount || Math.round(baseAmt * 0.18));
      const rcvd = Number(inv.amount_received !== undefined ? inv.amount_received : (inv.status === 'Paid' ? baseAmt : 0));
      const bal = Number(inv.balance_due !== undefined ? inv.balance_due : (inv.status === 'Paid' ? 0 : baseAmt));

      entry.totalAgreed += baseAmt;
      entry.totalTax += taxAmt;
      entry.totalPayable += (baseAmt + taxAmt);
      entry.totalCollected += rcvd;
      entry.totalOutstanding += bal;
    });

    return Array.from(clientMap.values()).filter(c => c.projects.length > 0 || c.invoices.length > 0);
  }, [allProjects, invoices]);

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#58051E]/10 text-[#58051E]">
              <FileText className="w-6 h-6 text-[#58051E]" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isStaff ? 'My Project Invoices & Billing Statements' : 'Agency B2B Invoicing & Multi-Project Ledgers'}
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isStaff
              ? 'Billing status, milestones, and tax receipts for your assigned project engagements.'
              : 'Automatic B2B Invoicing powered by Centralized Billing with multi-project client ledgers & tax compliance.'}
          </p>
        </div>
        {(isAdmin || isCentral) && (
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Issue Consolidated Invoice
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Banner (Automatic Single Source of Truth) */}
      {isAdmin || isCentral ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{totalInvoiced.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">
              {invoices.length} Bills • Auto-Linked to Centralized Scope
            </span>
          </Card>

          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {invoices.filter(i => i.status === 'Paid').length} Fully Settled Bills
            </span>
          </Card>

          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] font-semibold text-amber-700 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> {invoices.filter(i => i.status !== 'Paid').length} In Collection Pipeline
            </span>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Invoices</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{filtered.length}</div>
            <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">For your managed deliverables</span>
          </Card>

          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Settled Bills</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {filtered.filter(i => i.status === 'Paid').length}
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Fully Cleared
            </span>
          </Card>

          <Card className="p-4 border border-slate-200/80 bg-white shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Settlements</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {filtered.filter(i => i.status !== 'Paid').length}
            </div>
            <span className="text-[10px] font-semibold text-amber-700 mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> In Collection Pipeline
            </span>
          </Card>
        </div>
      )}

      {/* Tab Switcher: Agency B2B Invoices vs Multi-Project Client Ledgers */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-[#58051E] text-[#58051E]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Agency B2B Invoices ({filtered.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-600" /> Auto-Synced
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledgers')}
          className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ledgers'
              ? 'border-[#58051E] text-[#58051E]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Multi-Project Client Ledgers ({clientLedgers.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold border border-purple-200">
            Automatic Portfolios
          </span>
        </button>
      </div>

      {/* ─── TAB 1: AGENCY B2B INVOICES ─── */}
      {activeTab === 'invoices' && (
        <>
          {/* Filter Bar */}
          <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search invoice #, client, project title..."
                  className="w-full h-9 pl-9 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="h-9 px-3 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="All">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Sent">Sent / Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <span className="text-xs font-bold text-slate-400">{filtered.length} Bills Configured</span>
          </Card>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading invoice ledgers...</div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No invoices found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {isStaff ? 'No invoices linked to your assigned projects.' : 'Start a project in Marketing Portfolio to automatically generate B2B invoices and ledgers.'}
              </p>
              {(isAdmin || isCentral) && (
                <Button size="sm" className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Issue Consolidated Invoice
                </Button>
              )}
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                        <th className="py-3.5 px-4">Invoice # & Client Account</th>
                        <th className="py-3.5 px-4">Taxable Fee (₹)</th>
                        <th className="py-3.5 px-4">GST (18%)</th>
                        <th className="py-3.5 px-4">Total Amount (₹)</th>
                        <th className="py-3.5 px-4">Collected (₹)</th>
                        <th className="py-3.5 px-4">Balance (₹)</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {paginated.map((inv) => {
                        const items = inv.items || getDigitalInvoiceItems(inv.id);
                        const baseAmt = Number(inv.amount || 0);
                        const taxAmt = Number(inv.tax_amount || Math.round(baseAmt * 0.18));
                        const total = baseAmt + taxAmt;
                        const rcvd = Number(inv.amount_received !== undefined ? inv.amount_received : (inv.status === 'Paid' ? baseAmt : 0));
                        const bal = Number(inv.balance_due !== undefined ? inv.balance_due : (inv.status === 'Paid' ? 0 : baseAmt));

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#58051E]" />
                                {inv.client?.company_name || inv.client?.name || inv.client_name || 'Enterprise Client'}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-400">{inv.invoice_no || inv.id}</span>
                                {inv.project?.title && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {inv.project.title}
                                  </span>
                                )}
                                {inv.is_auto_synced && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                                    <Zap className="w-2.5 h-2.5" /> Auto-Synced
                                  </span>
                                )}
                                {items && items.length > 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                    {items.length} Scope Items
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900">₹{baseAmt.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-500">₹{taxAmt.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-black text-[#58051E]">₹{total.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-700">₹{rcvd.toLocaleString('en-IN')}</td>
                            <td className={`py-3.5 px-4 font-bold ${bal > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              ₹{bal.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-500">{inv.due_date || 'Net 15'}</td>
                            <td className="py-3.5 px-4">
                              {(isAdmin || isCentral) ? (
                                <button
                                  onClick={() => handleTogglePaid(inv)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold border cursor-pointer transition-all ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : inv.status === 'Partially Paid'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  {inv.status || 'Sent'}
                                </button>
                              ) : (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : inv.status === 'Partially Paid'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {inv.status || 'Sent'}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedInvoice({
                                      ...inv,
                                      items: inv.items || getDigitalInvoiceItems(inv.id)
                                    });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                                  title="Inspect Detailed Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => printOfficialInvoicePDF(inv)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Print Official Tax Invoice PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(inv.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Delete Invoice (Admin only)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500 pt-2">
                <div className="flex items-center gap-2">
                  <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} bills</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <span className="px-2 font-mono text-slate-700">Page {currentPage} of {totalPages}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ─── TAB 2: MULTI-PROJECT CLIENT LEDGERS ─── */}
      {activeTab === 'ledgers' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading client multi-project ledgers...</div>
          ) : clientLedgers.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No active client project accounts</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Start a digital project in the portfolio to automatically generate multi-project accounts and client statements.
              </p>
            </Card>
          ) : (
            clientLedgers.map((client) => {
              const collectionPct = client.totalAgreed > 0
                ? Math.min(100, Math.round((client.totalCollected / client.totalAgreed) * 100))
                : 0;

              return (
                <Card key={client.clientId} className="p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                  {/* Client Header & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#58051E]" />
                        <h3 className="text-base font-black text-slate-900">{client.clientName}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {client.projects.length} Project{client.projects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        Consolidated multi-project portfolio & billing reconciliation
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-slate-700 hover:text-[#58051E] hover:border-[#58051E]"
                      onClick={() => {
                        const summary = {
                          clientName: client.clientName,
                          totalAgreed: client.totalAgreed,
                          totalTax: client.totalTax,
                          totalPayable: client.totalPayable,
                          totalCollected: client.totalCollected,
                          totalOutstanding: client.totalOutstanding,
                          projects: client.invoices.map((inv: any) => ({
                            title: inv.project?.title || inv.project_title || 'Digital Project Scope',
                            category: inv.service_category || 'Digital Engineering',
                            invoiceNo: inv.invoice_no,
                            budget: Number(inv.amount || 0),
                            collected: Number(inv.amount_received || (inv.status === 'Paid' ? inv.amount : 0)),
                            balance: Number(inv.balance_due !== undefined ? inv.balance_due : (inv.status === 'Paid' ? 0 : inv.amount)),
                            status: inv.status
                          }))
                        };
                        printClientMultiProjectLedgerPDF(summary);
                      }}
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5 text-[#58051E]" /> Download Client Statement (PDF)
                    </Button>
                  </div>

                  {/* 4 Financial Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Contract Value</span>
                      <span className="text-sm font-black text-slate-900 mt-0.5 block">
                        ₹{client.totalAgreed.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">GST Invoiced (18%)</span>
                      <span className="text-sm font-black text-slate-700 mt-0.5 block">
                        ₹{client.totalTax.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Collected</span>
                      <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                        ₹{client.totalCollected.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Outstanding Balance</span>
                      <span className="text-sm font-black text-amber-800 mt-0.5 block">
                        ₹{client.totalOutstanding.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Collection Rate Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                      <span>Client Account Settlement Rate</span>
                      <span className="text-slate-800 font-extrabold">{collectionPct}% Settled</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${collectionPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Multi-Project Breakdown Table */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden mt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                          <th className="py-2.5 px-3">Project Deliverable</th>
                          <th className="py-2.5 px-3">Invoice Number</th>
                          <th className="py-2.5 px-3 text-right">Agreed Budget</th>
                          <th className="py-2.5 px-3 text-right">Collected</th>
                          <th className="py-2.5 px-3 text-right">Outstanding</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {client.invoices.map((inv: any) => {
                          const base = Number(inv.amount || 0);
                          const rcvd = Number(inv.amount_received !== undefined ? inv.amount_received : (inv.status === 'Paid' ? base : 0));
                          const bal = Number(inv.balance_due !== undefined ? inv.balance_due : (inv.status === 'Paid' ? 0 : base));

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{inv.project?.title || inv.project_title || 'Project Scope'}</div>
                                <span className="text-[10px] text-slate-400">{inv.service_category || 'Digital Engineering'}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[#58051E]">{inv.invoice_no}</td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{base.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-700">₹{rcvd.toLocaleString('en-IN')}</td>
                              <td className={`py-2.5 px-3 text-right font-black ${bal > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                ₹{bal.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  inv.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="p-1 text-slate-400 hover:text-slate-800 rounded"
                                    title="View Invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => printOfficialInvoicePDF(inv)}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="Print Invoice"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── MODAL: ISSUE MULTI-PROJECT CONSOLIDATED INVOICE ─── */}
      <AnimatePresence>
        {showAddModal && (isAdmin || isCentral) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#58051E]" /> Multi-Project Single Client Billing
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Consolidate multiple active sprints, designs, or apps into a single GST tax invoice.
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddMultiInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Client</label>
                    <select
                      value={newInvClient}
                      onChange={(e) => setNewInvClient(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Number</label>
                    <input
                      type="text"
                      required
                      value={newInvNo}
                      onChange={(e) => setNewInvNo(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      required
                      value={newInvDueDate}
                      onChange={(e) => setNewInvDueDate(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-[#58051E]" /> Project Line Items & Milestones ({invoiceItems.length})
                    </span>
                    <Button type="button" size="sm" variant="outline" className="text-xs font-bold" onClick={handleAddItem}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Project Scope
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Item #{index + 1}</span>
                          {invoiceItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {clientAvailableProjects.length > 0 ? (
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Linked Client Project</label>
                              <select
                                value={item.projectId}
                                onChange={(e) => {
                                  const selectedProj = clientAvailableProjects.find(p => p.id === e.target.value);
                                  handleItemChange(index, 'projectId', e.target.value);
                                  if (selectedProj) handleItemChange(index, 'projectTitle', selectedProj.title);
                                }}
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                <option value="">Select Project / Custom Milestone</option>
                                {clientAvailableProjects.map(p => (
                                  <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Project Scope / Milestone</label>
                              <input
                                type="text"
                                required
                                value={item.projectTitle}
                                onChange={(e) => handleItemChange(index, 'projectTitle', e.target.value)}
                                placeholder="e.g. Next.js Web App Redesign"
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Item Amount (INR ₹)</label>
                            <input
                              type="number"
                              required
                              value={item.amount}
                              onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))}
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Deliverables description (e.g. Sprint 1 UX & Figma token library)"
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-1.5 font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable Milestone Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{totalInvoiceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST + SGST (18%):</span>
                    <span className="font-bold text-slate-900">₹{totalTaxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Consolidated Total Payable:</span>
                    <span className="text-[#58051E]">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Generate & Dispatch Bill</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── INVOICE VIEWER & PRINT MODAL ─── */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedInvoice(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Tax Invoice {selectedInvoice.invoice_no}</h3>
                  <span className="text-[10px] font-bold text-slate-400">Issued by Ferex Digital Agency Suite</span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{selectedInvoice.client?.company_name || selectedInvoice.client?.name || selectedInvoice.client_name || 'Enterprise Client'}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Due Date: {selectedInvoice.due_date || 'Net 15'}</span>
                    {selectedInvoice.project?.title && (
                      <span className="text-[10px] font-semibold text-[#58051E] block mt-0.5">Project: {selectedInvoice.project.title}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                    <div className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${
                      selectedInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      selectedInvoice.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {selectedInvoice.status || 'Sent'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Consolidated Project Breakdown</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedInvoice.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center bg-white text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{it.projectTitle || it.title}</div>
                            <div className="text-[10px] text-slate-500">{it.description}</div>
                          </div>
                          <span className="font-black text-slate-800">₹{Number(it.amount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Base Digital Engineering Fee:</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>CGST + SGST (18%):</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedInvoice.tax_amount || Math.round(selectedInvoice.amount * 0.18)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 font-black text-slate-900 text-sm">
                    <span>Total Invoiced (INR):</span>
                    <span className="text-[#58051E]">₹{(Number(selectedInvoice.amount) + Number(selectedInvoice.tax_amount || Math.round(selectedInvoice.amount * 0.18))).toLocaleString('en-IN')}</span>
                  </div>
                  {selectedInvoice.amount_received !== undefined && Number(selectedInvoice.amount_received) > 0 && (
                    <div className="flex justify-between py-1 text-emerald-700 font-bold">
                      <span>Collected to Date:</span>
                      <span>₹{Number(selectedInvoice.amount_received).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedInvoice.balance_due !== undefined && (
                    <div className={`flex justify-between py-1 font-extrabold ${Number(selectedInvoice.balance_due) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      <span>Remaining Balance:</span>
                      <span>₹{Number(selectedInvoice.balance_due).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 flex gap-2">
                  {(isAdmin || isCentral) && selectedInvoice.status !== 'Paid' && (
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setSettlingInvoice(selectedInvoice)}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" /> Collect (Stripe / UPI)
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => printOfficialInvoicePDF(selectedInvoice)}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Official PDF
                  </Button>
                  <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setSelectedInvoice(null)}>Close</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Unified Payment Gateway Modal ── */}
      {settlingInvoice && (
        <UnifiedPaymentModal
          isOpen={!!settlingInvoice}
          onClose={() => setSettlingInvoice(null)}
          onSuccess={() => {
            setSettlingInvoice(null);
            setSelectedInvoice(null);
            showToast('Invoice collected & recorded via gateway successfully!');
            loadData();
          }}
          division="digital"
          amount={Number(settlingInvoice.amount) + Number(settlingInvoice.tax_amount || 0)}
          currency="INR"
          title={`Digital Settlement: ${settlingInvoice.invoice_no}`}
          invoiceNo={settlingInvoice.invoice_no}
          invoiceId={settlingInvoice.id}
          purpose={`Client invoice settlement ${settlingInvoice.invoice_no}`}
          payerName={settlingInvoice.client?.company_name || settlingInvoice.client?.name || 'Client'}
          payerEmail={settlingInvoice.client?.email || ''}
          clientId={settlingInvoice.client_id}
        />
      )}
    </div>
  );
};
