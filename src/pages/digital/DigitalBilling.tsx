import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, X, Search, Eye, Trash2, Download, Printer,
  DollarSign, ChevronRight, Building2, CheckCircle2, Clock,
  AlertCircle, ChevronDown, ChevronUp, Edit2, Zap, Star,
  Package, TrendingUp, Layers, Receipt, Send, RefreshCw, CreditCard, Shield
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getDigitalClients,
  getDigitalProjects,
  getDigitalInvoices,
  createDigitalInvoice,
  updateDigitalInvoice,
  updateDigitalInvoiceStatus,
  deleteDigitalInvoice,
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScopeItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'base' | 'extra' | 'special_charge';
}

interface PaymentInstallment {
  id: string;
  label: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

interface ClientBilling {
  clientId: string;
  clientName: string;
  projectId: string;
  projectTitle: string;
  scopeItems: ScopeItem[];
  totalAmount: number;
  paymentSplit: 1 | 2 | 3;
  installments: PaymentInstallment[];
  invoiceNo: string;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue';
  createdAt: string;
  notes: string;
}

// ─── PDF Generator ─────────────────────────────────────────────────────────
function generateInvoicePDF(billing: ClientBilling) {
  const totalInr = billing.totalAmount.toLocaleString('en-IN');
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const scopeHtml = billing.scopeItems.map(item => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 8px;font-size:12px;color:#1e293b">
        <strong>${item.title}</strong>
        ${item.description ? `<br><span style="color:#64748b;font-size:11px">${item.description}</span>` : ''}
        ${item.type === 'extra' ? '<span style="background:#dbeafe;color:#1d4ed8;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px">Scope Extension</span>' : ''}
        ${item.type === 'special_charge' ? '<span style="background:#fef3c7;color:#d97706;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px">Special Charge</span>' : ''}
      </td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;color:#059669">₹${item.amount.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const installmentHtml = billing.installments.map(inst => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px;font-size:12px;color:#1e293b">${inst.label}</td>
      <td style="padding:8px;text-align:center;font-size:12px;color:#64748b">${inst.percentage}%</td>
      <td style="padding:8px;text-align:right;font-size:12px;font-weight:700">₹${inst.amount.toLocaleString('en-IN')}</td>
      <td style="padding:8px;text-align:center;font-size:11px">
        <span style="padding:2px 8px;border-radius:20px;font-weight:600;${
          inst.status === 'paid' ? 'background:#d1fae5;color:#065f46' :
          inst.status === 'overdue' ? 'background:#fee2e2;color:#991b1b' :
          'background:#fef3c7;color:#92400e'
        }">${inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}</span>
      </td>
      <td style="padding:8px;text-align:center;font-size:11px;color:#64748b">${inst.dueDate}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${billing.invoiceNo} — Ferex Digital</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { font-size: 24px; font-weight: 800; color: #58051E; letter-spacing: -0.5px; }
  .logo span { color: #94a3b8; font-size: 14px; font-weight: 500; display: block; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-no { font-size: 22px; font-weight: 800; color: #0f172a; }
  .invoice-date { font-size: 12px; color: #64748b; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 8px;
    background: ${billing.status === 'Paid' ? '#d1fae5' : billing.status === 'Partially Paid' ? '#dbeafe' : '#fef3c7'};
    color: ${billing.status === 'Paid' ? '#065f46' : billing.status === 'Partially Paid' ? '#1d4ed8' : '#92400e'};
  }
  .divider { height: 2px; background: linear-gradient(to right, #58051E, #f1f5f9); margin: 24px 0; }
  .bill-to { margin-bottom: 32px; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 4px; }
  .client-name { font-size: 18px; font-weight: 800; color: #0f172a; }
  .client-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .total-row td { padding: 14px 8px; font-size: 15px; font-weight: 800; border-top: 2px solid #0f172a; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 11px; color: #94a3b8; }
  .footer-right { text-align: right; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">FEREX<br><span>Digital Agency ERP</span></div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-no">${billing.invoiceNo}</div>
      <div class="invoice-date">Issued: ${invoiceDate}</div>
      <div class="status-badge">${billing.status}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="bill-to">
    <div class="label">Bill To</div>
    <div class="client-name">${billing.clientName}</div>
    <div class="client-sub">Project: ${billing.projectTitle}</div>
  </div>

  <div style="margin-bottom:28px">
    <div class="label" style="margin-bottom:12px">Scope of Work & Service Charges</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${scopeHtml}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td>Total Project Value</td>
          <td style="text-align:right;color:#059669">₹${totalInr}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${billing.installments.length > 1 ? `
  <div style="margin-bottom:28px">
    <div class="label" style="margin-bottom:12px">Payment Schedule (${billing.paymentSplit}-Installment Plan)</div>
    <table>
      <thead>
        <tr>
          <th>Installment</th>
          <th style="text-align:center">%</th>
          <th style="text-align:right">Amount</th>
          <th style="text-align:center">Status</th>
          <th style="text-align:center">Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${installmentHtml}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${billing.notes ? `
  <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:28px">
    <div class="label" style="margin-bottom:4px">Terms & Notes</div>
    <p style="font-size:12px;color:#475569">${billing.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-left">
      Ferex Digital Agency ERP<br>
      digital@ferex.com • www.ferex.com
    </div>
    <div class="footer-right">
      Thank you for your business.<br>
      Payments via RTGS / Bank Wire / UPI
    </div>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export const DigitalBilling: React.FC = () => {
  const { profile } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billings, setBillings] = useState<ClientBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<ClientBilling | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddScopeForm, setShowAddScopeForm] = useState(false);
  const [extraScope, setExtraScope] = useState({
    title: '',
    description: '',
    amount: 0,
    type: 'extra' as 'extra' | 'special_charge'
  });

  // Form state
  const [form, setForm] = useState({
    clientId: '',
    projectId: '',
    paymentSplit: 2 as 1 | 2 | 3,
    notes: 'Payment via RTGS / Bank Wire. GST applicable as per norms.',
    invoiceNo: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
  });
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([
    { id: '1', title: 'Core Project Delivery', description: 'Full project scope as agreed', amount: 0, type: 'base' }
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientData, projData, invData] = await Promise.all([
        getDigitalClients(),
        getDigitalProjects(),
        getDigitalInvoices()
      ]);
      setClients(clientData || []);
      setProjects(projData || []);

      // Build billing records from invoices
      const billingMap: ClientBilling[] = (invData || []).map((inv: any) => {
        let parsedScope: ScopeItem[] = [];
        let parsedInst: PaymentInstallment[] = [];
        let split: 1 | 2 | 3 = 1;

        if (inv.notes && typeof inv.notes === 'string') {
          const scopeMatch = inv.notes.match(/SCOPE:(\[.*?\])(?:\s*\||$)/);
          const instMatch = inv.notes.match(/INST:(\[.*?\])(?:\s*\||$)/);
          const splitMatch = inv.notes.match(/SPLIT:([123])/);
          if (scopeMatch) {
            try { parsedScope = JSON.parse(scopeMatch[1]); } catch {}
          }
          if (instMatch) {
            try { parsedInst = JSON.parse(instMatch[1]); } catch {}
          }
          if (splitMatch) {
            split = Number(splitMatch[1]) as 1 | 2 | 3;
          }
        }

        const scopeItems: ScopeItem[] = parsedScope.length > 0 ? parsedScope : (inv.scope_items ? JSON.parse(inv.scope_items) : [
          { id: '1', title: (inv.notes || '').split('|')[0].trim() || 'Project Services', description: '', amount: inv.amount || 0, type: 'base' }
        ]);

        const installments: PaymentInstallment[] = parsedInst.length > 0 ? parsedInst : (inv.installments ? JSON.parse(inv.installments) : [
          { id: '1', label: 'Full Payment', percentage: 100, amount: inv.amount || 0, dueDate: inv.due_date || '', status: inv.status === 'Paid' ? 'paid' : 'pending' }
        ]);

        return {
          clientId: inv.client_id || '',
          clientName: inv.client?.company_name || inv.client_name || 'Client',
          projectId: inv.project_id || '',
          projectTitle: inv.project?.title || inv.project_title || 'Project',
          scopeItems,
          totalAmount: Number(inv.amount) || 0,
          paymentSplit: split || (installments.length as 1 | 2 | 3) || 1,
          installments,
          invoiceNo: inv.invoice_no || `INV-${inv.id?.slice(-4)}`,
          status: inv.status || 'Sent',
          createdAt: inv.created_at || '',
          notes: typeof inv.notes === 'string' ? inv.notes : '',
        };
      });
      setBillings(billingMap);
      setInvoices(invData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_billing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .subscribe();

    window.addEventListener('ferex_digital_invoices_change', loadData);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_invoices_change', loadData);
    };
  }, [loadData]);

  const totalAmount = scopeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const computeInstallments = (total: number, split: 1 | 2 | 3): PaymentInstallment[] => {
    const now = new Date();
    if (split === 1) {
      return [{
        id: '1', label: 'Full Payment', percentage: 100, amount: total,
        dueDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0], status: 'pending'
      }];
    } else if (split === 2) {
      return [
        { id: '1', label: 'Advance (1st Installment)', percentage: 50, amount: Math.round(total * 0.5),
          dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0], status: 'pending' },
        { id: '2', label: 'Balance (2nd Installment)', percentage: 50, amount: total - Math.round(total * 0.5),
          dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0], status: 'pending' }
      ];
    } else {
      const first = Math.round(total * 0.4);
      const second = Math.round(total * 0.3);
      const third = total - first - second;
      return [
        { id: '1', label: '1st Installment (40%)', percentage: 40, amount: first,
          dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0], status: 'pending' },
        { id: '2', label: '2nd Installment (30%)', percentage: 30, amount: second,
          dueDate: new Date(now.getTime() + 20 * 86400000).toISOString().split('T')[0], status: 'pending' },
        { id: '3', label: '3rd Installment (30%)', percentage: 30, amount: third,
          dueDate: new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0], status: 'pending' }
      ];
    }
  };

  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || totalAmount <= 0) {
      showToast('Please select a client and add at least one scope item with an amount.');
      return;
    }
    const selectedClient = clients.find(c => c.id === form.clientId);
    const selectedProject = projects.find(p => p.id === form.projectId);
    const installments = computeInstallments(totalAmount, form.paymentSplit);

    const inv = await createDigitalInvoice({
      client_id: form.clientId,
      client_name: selectedClient?.company_name || 'Client',
      project_id: form.projectId || undefined,
      invoice_no: form.invoiceNo,
      amount: totalAmount,
      tax_amount: 0,
      due_date: installments[0].dueDate,
      status: 'Sent',
      notes: `${form.notes || ''} | SCOPE:${JSON.stringify(scopeItems)} | INST:${JSON.stringify(installments)} | SPLIT:${form.paymentSplit}`,
    });

    showToast(`✅ Invoice ${form.invoiceNo} created for ${selectedClient?.company_name}`);
    setShowCreateModal(false);
    setScopeItems([{ id: '1', title: 'Core Project Delivery', description: 'Full project scope as agreed', amount: 0, type: 'base' }]);
    setForm({ clientId: '', projectId: '', paymentSplit: 2, notes: 'Payment via RTGS / Bank Wire. GST applicable as per norms.', invoiceNo: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}` });
    await loadData();
  };

  const handleDeleteBilling = async (invoiceNo: string) => {
    if (!confirm('Delete this billing record?')) return;
    const inv = invoices.find(i => i.invoice_no === invoiceNo);
    if (inv) {
      await deleteDigitalInvoice(inv.id);
      showToast('Billing record deleted');
      await loadData();
    }
  };

  const handleMarkPaid = async (invoiceNo: string) => {
    const inv = invoices.find(i => i.invoice_no === invoiceNo);
    if (inv) {
      await updateDigitalInvoiceStatus(inv.id, 'Paid');
      showToast('Invoice marked as Paid');
      await loadData();
    }
  };

  const addScopeItem = (type: 'base' | 'extra' | 'special_charge') => {
    setScopeItems(prev => [...prev, {
      id: Date.now().toString(),
      title: type === 'extra' ? 'Scope Extension' : type === 'special_charge' ? 'Special Charge' : 'Service Item',
      description: '',
      amount: 0,
      type
    }]);
  };

  const updateScopeItem = (id: string, updates: Partial<ScopeItem>) => {
    setScopeItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeScopeItem = (id: string) => {
    if (scopeItems.length <= 1) return;
    setScopeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddScopeToExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBilling || !extraScope.title.trim() || Number(extraScope.amount) <= 0) {
      showToast('Please provide a title and valid amount');
      return;
    }

    const inv = invoices.find(i => i.invoice_no === selectedBilling.invoiceNo);
    if (!inv) return;

    const newItem: ScopeItem = {
      id: Date.now().toString(),
      title: extraScope.title.trim(),
      description: extraScope.description.trim(),
      amount: Number(extraScope.amount),
      type: extraScope.type
    };

    const newScopeItems = [...selectedBilling.scopeItems, newItem];
    const newTotal = selectedBilling.totalAmount + newItem.amount;
    const newInstallments = computeInstallments(newTotal, selectedBilling.paymentSplit);

    const baseNotes = selectedBilling.notes.split('| SCOPE:')[0].trim();
    const updatedNotes = `${baseNotes} | SCOPE:${JSON.stringify(newScopeItems)} | INST:${JSON.stringify(newInstallments)} | SPLIT:${selectedBilling.paymentSplit}`;

    await updateDigitalInvoice(inv.id, {
      amount: newTotal,
      tax_amount: Math.round(newTotal * 0.18),
      notes: updatedNotes
    });

    const updatedBilling: ClientBilling = {
      ...selectedBilling,
      scopeItems: newScopeItems,
      totalAmount: newTotal,
      installments: newInstallments,
      notes: updatedNotes
    };

    setSelectedBilling(updatedBilling);
    setExtraScope({ title: '', description: '', amount: 0, type: 'extra' });
    setShowAddScopeForm(false);
    showToast(`✅ Added ${extraScope.type === 'extra' ? 'Scope Extension' : 'Special Charge'} (₹${newItem.amount.toLocaleString('en-IN')}) to ${selectedBilling.invoiceNo}`);
    await loadData();
  };

  const filteredBillings = billings.filter(b =>
    b.clientName.toLowerCase().includes(search.toLowerCase()) ||
    b.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
    b.projectTitle.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = billings.reduce((sum, b) => sum + b.totalAmount, 0);
  const paidRevenue = billings.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.totalAmount, 0);
  const pendingRevenue = billings.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#58051E]" /> Centralised Digital Billing
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Per-client scope definitions, payment installment splits, special charges & PDF invoicing.
          </p>
        </div>
        <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Billed', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Collected', value: `₹${paidRevenue.toLocaleString('en-IN')}`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Pending', value: `₹${pendingRevenue.toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(stat => (
          <Card key={stat.label} className="p-4 border border-slate-200/70 shadow-xs flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">{stat.label}</p>
              <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card className="p-3 border border-slate-200/70 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, invoice no, project..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{filteredBillings.length} invoices</span>
      </Card>

      {/* Billing List */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredBillings.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No billing records yet. Create your first invoice.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBillings.map((b) => {
            const paidCount = b.installments.filter(i => i.status === 'paid').length;
            const progressPct = b.installments.length > 0 ? Math.round((paidCount / b.installments.length) * 100) : 0;
            return (
              <Card key={b.invoiceNo} className="p-5 border border-slate-200/70 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-black text-[#58051E]">{b.invoiceNo}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        b.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        b.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{b.status}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{b.paymentSplit}-installment plan</span>
                    </div>
                    <p className="text-sm font-black text-slate-900">{b.clientName}</p>
                    <p className="text-xs text-slate-500 truncate">{b.projectTitle}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-base font-black text-emerald-700">₹{b.totalAmount.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400">{b.scopeItems.length} scope item{b.scopeItems.length !== 1 ? 's' : ''}</span>
                      {b.scopeItems.some(s => s.type === 'extra') && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">+Scope Ext.</span>
                      )}
                      {b.scopeItems.some(s => s.type === 'special_charge') && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">+Special</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setSelectedBilling(b); setShowDetailModal(true); }}
                      className="p-2 text-slate-400 hover:text-[#58051E] hover:bg-[#58051E]/5 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generateInvoicePDF(b)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print / Download PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {b.status !== 'Paid' && (
                      <button
                        onClick={() => handleMarkPaid(b.invoiceNo)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Mark as Paid"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBilling(b.invoiceNo)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                {b.installments.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>Payment Progress ({paidCount}/{b.installments.length} installments)</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {b.installments.map(inst => (
                        <span key={inst.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          inst.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {inst.label}: ₹{inst.amount.toLocaleString('en-IN')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── CREATE INVOICE MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#58051E]" /> Create Client Invoice
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateBilling} className="space-y-5">
                {/* Client + Project */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client *</label>
                    <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="">-- Select Client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Project</label>
                    <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="">-- No Project --</option>
                      {projects.filter(p => !form.clientId || p.client_id === form.clientId).map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Number</label>
                    <input type="text" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Split</label>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setForm({ ...form, paymentSplit: n })}
                          className={`flex-1 h-9 rounded-xl text-xs font-black border transition-all ${form.paymentSplit === n ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#58051E]'}`}
                        >
                          {n === 1 ? 'Full' : `${n}-Part`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scope Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Scope & Charges *</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => addScopeItem('base')} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Add Item
                      </button>
                      <button type="button" onClick={() => addScopeItem('extra')} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Scope Ext.
                      </button>
                      <button type="button" onClick={() => addScopeItem('special_charge')} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Special
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {scopeItems.map((item, idx) => (
                      <div key={item.id} className={`p-3 rounded-xl border ${
                        item.type === 'extra' ? 'bg-blue-50/50 border-blue-200' :
                        item.type === 'special_charge' ? 'bg-amber-50/50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            item.type === 'extra' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'special_charge' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {item.type === 'extra' ? 'Scope Extension' : item.type === 'special_charge' ? 'Special Charge' : 'Base Item'}
                          </span>
                          {scopeItems.length > 1 && (
                            <button type="button" onClick={() => removeScopeItem(item.id)} className="ml-auto p-0.5 text-slate-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={e => updateScopeItem(item.id, { title: e.target.value })}
                              placeholder="Item title / description"
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold mb-1.5"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => updateScopeItem(item.id, { description: e.target.value })}
                              placeholder="Detailed description (optional)"
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={e => updateScopeItem(item.id, { amount: Number(e.target.value) })}
                              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">Total Invoice Amount</span>
                    <span className="text-lg font-black text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Payment schedule preview */}
                {totalAmount > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Payment Schedule Preview</p>
                    <div className="space-y-1.5">
                      {computeInstallments(totalAmount, form.paymentSplit).map(inst => (
                        <div key={inst.id} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{inst.label}</span>
                          <span className="font-black text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Terms & Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Create & Send Invoice
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BILLING DETAIL MODAL ── */}
      <AnimatePresence>
        {showDetailModal && selectedBilling && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedBilling.invoiceNo}</h3>
                  <p className="text-xs text-slate-500">{selectedBilling.clientName} • {selectedBilling.projectTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => generateInvoicePDF(selectedBilling)} className="p-2 rounded-lg bg-[#58051E]/10 text-[#58051E] hover:bg-[#58051E]/20 transition-colors" title="Print PDF">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Scope */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Scope of Work</p>
                <div className="space-y-2">
                  {selectedBilling.scopeItems.map(item => (
                    <div key={item.id} className={`flex items-start justify-between p-3 rounded-xl border ${
                      item.type === 'extra' ? 'bg-blue-50/50 border-blue-100' :
                      item.type === 'special_charge' ? 'bg-amber-50/50 border-amber-100' :
                      'bg-slate-50 border-slate-100'
                    }`}>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>}
                        {item.type !== 'base' && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block ${
                            item.type === 'extra' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.type === 'extra' ? 'Scope Extension' : 'Special Charge'}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black text-emerald-700 shrink-0 ml-3">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Total</span>
                  <span className="text-base font-black text-emerald-700">₹{selectedBilling.totalAmount.toLocaleString('en-IN')}</span>
                </div>

                {/* Add Scope Extension or Special Charge to existing work */}
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Extend Scope / Special Charge</span>
                    <button
                      type="button"
                      onClick={() => setShowAddScopeForm(!showAddScopeForm)}
                      className="text-[10px] font-bold px-2 py-1 bg-[#58051E] text-white rounded-lg hover:bg-[#430316] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {showAddScopeForm ? 'Cancel' : 'Add Scope / Charge'}
                    </button>
                  </div>

                  {showAddScopeForm && (
                    <form onSubmit={handleAddScopeToExisting} className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExtraScope({ ...extraScope, type: 'extra' })}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                            extraScope.type === 'extra' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          Scope Extension
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtraScope({ ...extraScope, type: 'special_charge' })}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                            extraScope.type === 'special_charge' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          Special Charge
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Title (e.g. Additional 5 Landing Pages, Priority SLA)"
                          value={extraScope.title}
                          onChange={e => setExtraScope({ ...extraScope, title: e.target.value })}
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Description / Reason (optional)"
                          value={extraScope.description}
                          onChange={e => setExtraScope({ ...extraScope, description: e.target.value })}
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="Amount (₹)"
                          value={extraScope.amount || ''}
                          onChange={e => setExtraScope({ ...extraScope, amount: Number(e.target.value) })}
                          className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                        />
                        <Button type="submit" size="sm" className="h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700">
                          Apply to Work
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Installments */}
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Payment Schedule ({selectedBilling.paymentSplit}-Installment)</p>
                <div className="space-y-2">
                  {selectedBilling.installments.map(inst => (
                    <div key={inst.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{inst.label}</p>
                        <p className="text-[10px] text-slate-400">Due: {inst.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">₹{inst.amount.toLocaleString('en-IN')}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          inst.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{inst.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedBilling.notes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</p>
                  <p className="text-xs text-slate-600">{selectedBilling.notes.split('|')[0]}</p>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button size="sm" className="flex-1 text-xs bg-[#58051E] hover:bg-[#430316]" onClick={() => generateInvoicePDF(selectedBilling)}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Download PDF
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
