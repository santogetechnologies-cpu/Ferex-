import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, X, Search, Eye, Trash2, Printer,
  Building2, CheckCircle2, Clock, AlertCircle, Edit2, Zap,
  Package, TrendingUp, Layers, Send, Shield, History, ArrowRight,
  DollarSign, Check, ChevronDown, ChevronUp, Lock, RefreshCw, FileText
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getCentralizedBillings,
  updateCentralizedBillingScope,
  deleteCentralizedBilling,
  type CentralizedProjectBilling,
  type ScopeItem,
  type ScopeBreakdownItem,
  type PaymentPart,
  type BillingChangeAudit,
  type MilestoneSplitType
} from '../../lib/api/digitalBilling';
import { getDigitalClients, getDigitalProjects } from '../../lib/api/digital';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';

// ─── PDF Scope & Invoice Generator ──────────────────────────────────────────
function printScopeAgreementPDF(billing: CentralizedProjectBilling) {
  const totalInr = billing.total_agreed_amount.toLocaleString('en-IN');
  const issueDate = new Date(billing.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const scopeHtml = billing.scope_items.map(item => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 8px;font-size:12px;color:#1e293b">
        <strong>${item.title}</strong>
        ${item.description ? `<br><span style="color:#64748b;font-size:11px">${item.description}</span>` : ''}
        ${item.type === 'extra' ? '<span style="background:#dbeafe;color:#1d4ed8;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px">Scope Extension</span>' : ''}
        ${item.type === 'special_charge' ? '<span style="background:#fef3c7;color:#d97706;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px">Special Charge</span>' : ''}
      </td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;color:#059669">₹${Number(item.amount || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const partsHtml = billing.payment_parts.map(part => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px;font-size:12px;color:#1e293b">${part.label}</td>
      <td style="padding:8px;text-align:center;font-size:12px;color:#64748b">${part.percentage}%</td>
      <td style="padding:8px;text-align:right;font-size:12px;font-weight:700">₹${part.configured_amount.toLocaleString('en-IN')}</td>
      <td style="padding:8px;text-align:right;font-size:12px;color:#059669">₹${(part.amount_received || 0).toLocaleString('en-IN')}</td>
      <td style="padding:8px;text-align:right;font-size:12px;font-weight:700;color:${part.remaining_balance > 0 ? '#b45309' : '#059669'}">
        ₹${(part.remaining_balance ?? part.configured_amount).toLocaleString('en-IN')}
      </td>
      <td style="padding:8px;text-align:center;font-size:11px">
        <span style="padding:2px 8px;border-radius:20px;font-weight:600;${
          part.status === 'paid' ? 'background:#d1fae5;color:#065f46' :
          part.status === 'partially_paid' ? 'background:#dbeafe;color:#1d4ed8' :
          'background:#fef3c7;color:#92400e'
        }">${part.status.toUpperCase()}</span>
      </td>
      <td style="padding:8px;text-align:center;font-size:11px;color:#64748b">${part.due_date || 'Milestone'}</td>
    </tr>
  `).join('');

  const auditHtml = (billing.audit_trail || []).slice(0, 5).map(a => `
    <tr style="border-bottom:1px solid #f1f5f9;font-size:11px">
      <td style="padding:6px;color:#64748b">${new Date(a.timestamp).toLocaleDateString('en-IN')}</td>
      <td style="padding:6px;font-weight:600;color:#1e293b">${a.user}</td>
      <td style="padding:6px;color:#059669">₹${a.previous_value.toLocaleString('en-IN')} → ₹${a.updated_value.toLocaleString('en-IN')}</td>
      <td style="padding:6px;color:#475569">${a.reason}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Commercial Financial Agreement — ${billing.invoice_no}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: 800; color: #58051E; }
  .logo span { color: #94a3b8; font-size: 13px; font-weight: 500; display: block; margin-top: 2px; }
  .meta { text-align: right; }
  .doc-no { font-size: 20px; font-weight: 800; color: #0f172a; }
  .divider { height: 2px; background: linear-gradient(to right, #58051E, #f1f5f9); margin: 20px 0; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8fafc; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .total-box { margin-top: 16px; padding: 12px 16px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">FEREX DIGITAL ERP<br><span>Single Source of Truth • Commercial Project Financial Agreement</span></div>
    <div class="meta">
      <div class="doc-no">${billing.invoice_no}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Approved: ${issueDate}</div>
      <div style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;background:#d1fae5;color:#065f46;margin-top:6px">${billing.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div style="display:flex;justify-content:space-between;margin-bottom:24px">
    <div>
      <div class="label">Client Information</div>
      <div style="font-size:16px;font-weight:800;color:#0f172a">${billing.client_name}</div>
      <div style="font-size:12px;color:#64748b">Project: ${billing.project_title}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Financial Terms</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a">${billing.payment_split}-Part Milestone Schedule</div>
      <div style="font-size:12px;color:#64748b">Category: ${billing.service_category || 'Software Engineering'}</div>
    </div>
  </div>

  <div style="margin-bottom:24px">
    <div class="label">Approved Scope of Work & Commercial Value</div>
    <table>
      <thead>
        <tr>
          <th>Deliverable Scope & Component</th>
          <th style="text-align:right">Commercial Value</th>
        </tr>
      </thead>
      <tbody>
        ${scopeHtml}
      </tbody>
    </table>
    <div class="total-box">
      <span style="font-size:13px;font-weight:700;color:#065f46">Total Agreed Commercial Value</span>
      <span style="font-size:18px;font-weight:800;color:#065f46">₹${totalInr}</span>
    </div>
  </div>

  <div style="margin-bottom:24px">
    <div class="label">Milestone Payment Parts Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Payment Part</th>
          <th style="text-align:center">%</th>
          <th style="text-align:right">Configured Amount</th>
          <th style="text-align:right">Received to Date</th>
          <th style="text-align:right">Balance</th>
          <th style="text-align:center">Status</th>
          <th style="text-align:center">Due Date</th>
        </tr>
      </thead>
      <tbody>
        ${partsHtml}
      </tbody>
    </table>
  </div>

  ${billing.audit_trail && billing.audit_trail.length > 0 ? `
  <div style="margin-bottom:24px">
    <div class="label">Controlled Change Log & Audit Trail</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Authorized User</th>
          <th>Value Adjustment</th>
          <th>Reason for Modification</th>
        </tr>
      </thead>
      <tbody>
        ${auditHtml}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <div>Single Source of Truth • Governed by Ferex Digital Agency Financial Controller</div>
    <div>Generated on ${new Date().toLocaleString('en-IN')}</div>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 500);
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export const DigitalBilling: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, canDelete } = useDigitalPermissions();

  const [billings, setBillings] = useState<CentralizedProjectBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Selected Billing for Detail / Audit View
  const [selectedBilling, setSelectedBilling] = useState<CentralizedProjectBilling | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Controlled Scope & Value Modification Modal
  const [showEditScopeModal, setShowEditScopeModal] = useState(false);
  const [editingScopeItems, setEditingScopeItems] = useState<ScopeItem[]>([]);
  const [editingScopeBreakdown, setEditingScopeBreakdown] = useState<Array<{id:string;component:string;description:string;amount:number}>>([]);
  const [showBreakdownSection, setShowBreakdownSection] = useState(false);
  const [editingSplit, setEditingSplit] = useState<1 | 2 | 3>(2);
  const [editingMilestoneType, setEditingMilestoneType] = useState<'full' | 'advance_30' | 'advance_50' | 'three_milestones' | 'custom'>('advance_50');
  const [editingCustomParts, setEditingCustomParts] = useState<Array<{label:string;percentage:number}>>([
    { label: 'Advance', percentage: 40 },
    { label: 'Milestone', percentage: 30 },
    { label: 'Final', percentage: 30 },
  ]);
  const [changeReason, setChangeReason] = useState('');
  const [changeType, setChangeType] = useState<'scope_added' | 'scope_modified' | 'special_charge' | 'payment_split_changed'>('scope_added');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCentralizedBillings();
      setBillings(data);
      if (selectedBilling) {
        const fresh = data.find(b => b.id === selectedBilling.id);
        if (fresh) setSelectedBilling(fresh);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBilling]);

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('ferex_digital_centralized_billing_change', handleSync);
    window.addEventListener('ferex_digital_projects_change', handleSync);
    window.addEventListener('ferex_digital_payments_change', handleSync);

    return () => {
      window.removeEventListener('ferex_digital_centralized_billing_change', handleSync);
      window.removeEventListener('ferex_digital_projects_change', handleSync);
      window.removeEventListener('ferex_digital_payments_change', handleSync);
    };
  }, [loadData]);

  const openControlledEdit = (billing: CentralizedProjectBilling) => {
    setSelectedBilling(billing);
    setEditingScopeItems([...billing.scope_items]);
    setEditingScopeBreakdown(billing.scope_breakdown ? [...billing.scope_breakdown] : []);
    setShowBreakdownSection(!!(billing.scope_breakdown && billing.scope_breakdown.length > 0));
    const mType = billing.milestone_split_type || (billing.payment_split === 1 ? 'full' : billing.payment_split === 3 ? 'three_milestones' : 'advance_50');
    setEditingMilestoneType(mType as any);
    setEditingSplit(billing.payment_split as 1 | 2 | 3);
    // Restore custom parts if any
    if (mType === 'custom' && billing.custom_milestone_parts && billing.custom_milestone_parts.length > 0) {
      setEditingCustomParts(billing.custom_milestone_parts);
    }
    setChangeReason('');
    setChangeType('scope_added');
    setShowEditScopeModal(true);
  };

  const addScopeItemRow = (type: 'base' | 'extra' | 'special_charge') => {
    setEditingScopeItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: type === 'extra' ? 'Scope Extension' : type === 'special_charge' ? 'Special Charge' : 'Core Deliverable',
        description: '',
        amount: 0,
        type
      }
    ]);
  };

  const updateScopeItemRow = (id: string, updates: Partial<ScopeItem>) => {
    setEditingScopeItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeScopeItemRow = (id: string) => {
    if (editingScopeItems.length <= 1) {
      showToast('Project must have at least one scope item');
      return;
    }
    setEditingScopeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveControlledUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBilling) return;

    if (!changeReason.trim()) {
      showToast('Controlled Update requires a documented Reason for Change');
      return;
    }

    const newTotal = editingScopeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (newTotal <= 0) {
      showToast('Total project value must be greater than zero');
      return;
    }

    // Validate custom milestone percentages
    if (editingMilestoneType === 'custom') {
      const totalPct = editingCustomParts.reduce((s, p) => s + Number(p.percentage || 0), 0);
      if (Math.abs(totalPct - 100) > 1) {
        showToast(`Custom milestone percentages must sum to 100% (currently ${totalPct}%)`);
        return;
      }
    }

    // Determine split number for custom type
    const effectiveSplit: 1 | 2 | 3 = editingMilestoneType === 'custom'
      ? (editingCustomParts.length === 1 ? 1 : editingCustomParts.length === 2 ? 2 : 3)
      : editingSplit;

    try {
      const updated = await updateCentralizedBillingScope({
        billingId: selectedBilling.id,
        newScopeItems: editingScopeItems,
        newPaymentSplit: effectiveSplit,
        newMilestoneSplitType: editingMilestoneType as MilestoneSplitType,
        newAdvancePercentage: editingMilestoneType === 'advance_30' ? 30 : editingMilestoneType === 'advance_50' ? 50 : undefined,
        newScopeBreakdown: editingScopeBreakdown,
        newCustomParts: editingMilestoneType === 'custom' ? editingCustomParts : undefined,
        reason: changeReason.trim(),
        userName: profile?.full_name || profile?.email || 'Digital Admin',
        userEmail: profile?.email || '',
        changeType
      });

      setSelectedBilling(updated);
      setShowEditScopeModal(false);
      showToast(`✅ Single Source of Truth updated. Commercial value: ₹${newTotal.toLocaleString('en-IN')}`);
      await loadData();
    } catch (err: any) {
      showToast(`Error updating billing: ${err.message}`);
    }
  };

  const handleDeleteBilling = async (billingId: string, title: string) => {
    if (!window.confirm(`Delete billing configuration for "${title}"? This will permanently remove its financial definitions, payment ledgers, and auto-generated invoices.`)) return;
    try {
      await deleteCentralizedBilling(billingId);
      showToast(`Billing configuration for "${title}" deleted.`);
      if (selectedBilling?.id === billingId) {
        setSelectedBilling(null);
        setShowDetailModal(false);
        setShowEditScopeModal(false);
      }
      await loadData();
    } catch (err: any) {
      showToast(`Error deleting billing: ${err.message}`);
    }
  };

  const filteredBillings = billings.filter(b =>
    b.client_name.toLowerCase().includes(search.toLowerCase()) ||
    b.project_title.toLowerCase().includes(search.toLowerCase()) ||
    b.invoice_no.toLowerCase().includes(search.toLowerCase())
  );

  const totalCommercialValue = billings.reduce((sum, b) => sum + b.total_agreed_amount, 0);
  const totalCollected = billings.reduce((sum, b) => {
    return sum + b.payment_parts.reduce((pSum, p) => pSum + (p.amount_received || 0), 0);
  }, 0);
  const totalOutstanding = Math.max(0, totalCommercialValue - totalCollected);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#58051E]/10 text-[#58051E]">
              <Shield className="w-5 h-5 text-[#58051E]" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Single Source of Truth: Centralised Billing
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Primary financial authority defining scope, commercial value, milestones & controlled change management.
          </p>
        </div>
      </div>

      {/* Financial Health Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Agreed Commercial Value', value: `₹${totalCommercialValue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-slate-800', bg: 'bg-slate-50' },
          { label: 'Total Actual Money Collected', value: `₹${totalCollected.toLocaleString('en-IN')}`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Total Outstanding Balance', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(stat => (
          <Card key={stat.label} className="p-4 border border-slate-200/70 shadow-xs flex items-center gap-3">
            <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">{stat.label}</p>
              <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Info Banner */}
      <div className="space-y-3">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Primary Financial Authority:</strong> Projects configured here automatically govern Payment Ledgers, Invoices, Client Portals, and Financial Reports. No repeated data entry required.
          </span>
        </div>

        <Card className="p-3 border border-slate-200/70 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client, project title, or reference ID..."
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{filteredBillings.length} Configured Projects</span>
        </Card>
      </div>

      {/* Configured Projects List */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredBillings.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No project billing definitions configured yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBillings.map((b) => {
            const received = b.payment_parts.reduce((sum, p) => sum + (p.amount_received || 0), 0);
            const balance = Math.max(0, b.total_agreed_amount - received);
            const progress = b.total_agreed_amount > 0 ? Math.min(100, Math.round((received / b.total_agreed_amount) * 100)) : 0;

            return (
              <Card key={b.id} className="p-5 border border-slate-200/70 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Project & Commercial Value */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-black text-[#58051E]">{b.invoice_no}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{b.payment_split}-Part Milestone Schedule</span>
                      {b.audit_trail && b.audit_trail.length > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <History className="w-3 h-3" /> {b.audit_trail.length} Revisions
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-slate-900">{b.project_title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {b.client_name}
                    </p>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Agreed Value</span>
                        <span className="text-sm font-black text-slate-900">₹{b.total_agreed_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Actual Collected</span>
                        <span className="text-sm font-black text-emerald-700">₹{received.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Balance Due</span>
                        <span className="text-sm font-black text-amber-700">₹{balance.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Scope Items</span>
                        <span className="text-xs font-bold text-slate-600">{b.scope_items.length} Deliverable{b.scope_items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold border-slate-200"
                      onClick={() => { setSelectedBilling(b); setShowDetailModal(true); }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Definition
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold"
                      onClick={() => openControlledEdit(b)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Controlled Update
                    </Button>
                    <button
                      onClick={() => printScopeAgreementPDF(b)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print Commercial Agreement PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteBilling(b.id, b.project_title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Centralized Billing Definition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Milestones Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>Milestone Payment Progress</span>
                    <span className="text-slate-700 font-extrabold">{progress}% Settled</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {b.payment_parts.map(part => (
                      <span
                        key={part.id}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          part.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          part.status === 'partially_paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {part.label}: ₹{part.configured_amount.toLocaleString('en-IN')}
                        {part.amount_received > 0 && part.status !== 'paid' && (
                          <span className="ml-1 text-[9px] text-blue-600 font-extrabold">
                            (₹{part.amount_received.toLocaleString('en-IN')} recvd)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── CONTROLLED SCOPE & VALUE UPDATE MODAL ── */}
      <AnimatePresence>
        {showEditScopeModal && selectedBilling && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowEditScopeModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#58051E]" /> Controlled Scope & Commercial Value Update
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modifying: <strong>{selectedBilling.project_title}</strong> ({selectedBilling.client_name})
                  </p>
                </div>
                <button onClick={() => setShowEditScopeModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveControlledUpdate} className="space-y-4">
                {/* Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  <strong>Audited Financial Process:</strong> Any changes will be recorded in the immutable audit trail with your identity, previous vs new value, and documented justification.
                </div>

                {/* Scope Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Deliverables & Scope Breakdown *</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => addScopeItemRow('base')} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Base Item
                      </button>
                      <button type="button" onClick={() => addScopeItemRow('extra')} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Scope Extension
                      </button>
                      <button type="button" onClick={() => addScopeItemRow('special_charge')} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Special Charge
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editingScopeItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border ${
                          item.type === 'extra' ? 'bg-blue-50/40 border-blue-200' :
                          item.type === 'special_charge' ? 'bg-amber-50/40 border-amber-200' :
                          'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            item.type === 'extra' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'special_charge' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {item.type === 'extra' ? 'Scope Extension' : item.type === 'special_charge' ? 'Special Charge' : 'Base Deliverable'}
                          </span>
                          {editingScopeItems.length > 1 && (
                            <button type="button" onClick={() => removeScopeItemRow(item.id)} className="p-0.5 text-slate-400 hover:text-red-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={e => updateScopeItemRow(item.id, { title: e.target.value })}
                              placeholder="Deliverable title"
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold mb-1"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => updateScopeItemRow(item.id, { description: e.target.value })}
                              placeholder="Scope specifications (optional)"
                              className="w-full h-7 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Value (₹)</label>
                            <input
                              type="number"
                              min={0}
                              value={item.amount || ''}
                              onChange={e => updateScopeItemRow(item.id, { amount: Number(e.target.value) })}
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Comparison */}
                  {(() => {
                    const newTotal = editingScopeItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
                    const diff = newTotal - selectedBilling.total_agreed_amount;
                    return (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Commercial Comparison</span>
                          <span className="text-xs font-bold text-slate-600">
                            Previous: ₹{selectedBilling.total_agreed_amount.toLocaleString('en-IN')} → New: ₹{newTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className={`text-xs font-extrabold px-2 py-1 rounded-lg ${
                          diff > 0 ? 'bg-emerald-100 text-emerald-800' :
                          diff < 0 ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {diff > 0 ? `+₹${diff.toLocaleString('en-IN')}` : diff < 0 ? `-₹${Math.abs(diff).toLocaleString('en-IN')}` : 'No Change'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Milestone Split */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Milestone Structure</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { id: 'advance_30', label: '30% Advance', desc: '30% / 70%', split: 2 as const },
                      { id: 'advance_50', label: '50% Advance', desc: '50% / 50%', split: 2 as const },
                      { id: 'three_milestones', label: '3-Part Split', desc: '40% / 30% / 30%', split: 3 as const },
                      { id: 'full', label: '100% Full', desc: 'Single Payment', split: 1 as const },
                      { id: 'custom', label: 'Custom', desc: 'Define your own %', split: 2 as const },
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setEditingMilestoneType(opt.id as any);
                          setEditingSplit(opt.id === 'custom' ? (editingCustomParts.length === 1 ? 1 : editingCustomParts.length === 3 ? 3 : 2) : opt.split);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          editingMilestoneType === opt.id
                            ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[11px] font-black">{opt.label}</div>
                        <div className={`text-[9px] mt-0.5 ${editingMilestoneType === opt.id ? 'text-white/70' : 'text-slate-400'}`}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Milestone Part Editor */}
                  {editingMilestoneType === 'custom' && (
                    <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-violet-700 uppercase">Custom Milestone Parts</p>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                          Math.abs(editingCustomParts.reduce((s,p) => s + Number(p.percentage||0), 0) - 100) <= 1
                            ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          Total: {editingCustomParts.reduce((s,p) => s + Number(p.percentage||0), 0)}%
                        </span>
                      </div>
                      {editingCustomParts.map((cp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cp.label}
                            onChange={e => setEditingCustomParts(prev => prev.map((p, i) => i === idx ? { ...p, label: e.target.value } : p))}
                            placeholder={`Part ${idx+1} label`}
                            className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={cp.percentage || ''}
                            onChange={e => setEditingCustomParts(prev => prev.map((p, i) => i === idx ? { ...p, percentage: Number(e.target.value) } : p))}
                            placeholder="%"
                            className="w-16 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 text-center"
                          />
                          {editingCustomParts.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setEditingCustomParts(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {editingCustomParts.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setEditingCustomParts(prev => [...prev, { label: `Part ${prev.length+1}`, percentage: 0 }])}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200"
                        >
                          + Add Part
                        </button>
                      )}
                    </div>
                  )}

                  {/* Live milestone preview */}
                  {selectedBilling && (() => {
                    const total = editingScopeItems.reduce((s, i) => s + Number(i.amount || 0), 0);
                    const previews: Array<{label:string;pct:number;amount:number}> = editingMilestoneType === 'full'
                      ? [{ label: 'Full Payment', pct: 100, amount: total }]
                      : editingMilestoneType === 'advance_30'
                      ? [
                          { label: 'Part 1: Advance (30%)', pct: 30, amount: Math.round(total * 0.3) },
                          { label: 'Part 2: Balance (70%)', pct: 70, amount: total - Math.round(total * 0.3) }
                        ]
                      : editingMilestoneType === 'advance_50'
                      ? [
                          { label: 'Part 1: Advance (50%)', pct: 50, amount: Math.round(total * 0.5) },
                          { label: 'Part 2: Balance (50%)', pct: 50, amount: total - Math.round(total * 0.5) }
                        ]
                      : editingMilestoneType === 'custom'
                      ? editingCustomParts.map((cp, i) => ({
                          label: `Part ${i+1}: ${cp.label} (${cp.percentage}%)`,
                          pct: cp.percentage,
                          amount: Math.round(total * (cp.percentage / 100))
                        }))
                      : [
                          { label: 'Part 1: Kickoff (40%)', pct: 40, amount: Math.round(total * 0.4) },
                          { label: 'Part 2: Milestone (30%)', pct: 30, amount: Math.round(total * 0.3) },
                          { label: 'Part 3: Handover (30%)', pct: 30, amount: total - Math.round(total * 0.4) - Math.round(total * 0.3) }
                        ];
                    return (
                      <div className="mt-2 space-y-1">
                        {previews.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-700">{p.label}</span>
                            <span className="font-black text-emerald-700">₹{p.amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Scope Breakdown Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">
                      Cost Breakdown by Component <span className="text-slate-300 font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBreakdownSection(v => !v);
                        if (!showBreakdownSection && editingScopeBreakdown.length === 0) {
                          setEditingScopeBreakdown([
                            { id: '1', component: 'UI/UX Design', description: '', amount: 0 },
                            { id: '2', component: 'Frontend Development', description: '', amount: 0 },
                            { id: '3', component: 'Backend / API', description: '', amount: 0 },
                          ]);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {showBreakdownSection ? 'Hide Breakdown' : '+ Add Cost Breakdown'}
                    </button>
                  </div>

                  {showBreakdownSection && (
                    <div className="space-y-2 p-3 bg-blue-50/40 rounded-xl border border-blue-200">
                      <p className="text-[10px] text-blue-700 font-semibold mb-1">
                        Specify how the total project value is split across components (e.g. design, frontend, backend). This is separate from payment milestones.
                      </p>
                      {editingScopeBreakdown.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.component}
                            onChange={e => setEditingScopeBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, component: e.target.value } : b))}
                            placeholder="Component (e.g. Frontend Dev)"
                            className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.amount || ''}
                            onChange={e => setEditingScopeBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, amount: Number(e.target.value) } : b))}
                            placeholder="Amount ₹"
                            className="w-28 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingScopeBreakdown(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditingScopeBreakdown(prev => [...prev, { id: Date.now().toString(), component: '', description: '', amount: 0 }])}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        + Add Component
                      </button>
                    </div>
                  )}
                </div>

                {/* Documented Reason for Change (Mandatory) */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                    Documented Reason for Modification * (Required for Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={changeReason}
                    onChange={e => setChangeReason(e.target.value)}
                    placeholder="e.g. Scope extension approved by client: Added 3 additional landing pages and payment term split."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowEditScopeModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs bg-[#58051E] hover:bg-[#430316]">
                    Apply Controlled Update
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DEFINITION & AUDIT DETAIL MODAL ── */}
      <AnimatePresence>
        {showDetailModal && selectedBilling && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedBilling.project_title}</h3>
                  <p className="text-xs text-slate-500">{selectedBilling.client_name} • {selectedBilling.invoice_no}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => printScopeAgreementPDF(selectedBilling)} className="p-2 rounded-lg bg-[#58051E]/10 text-[#58051E]" title="Print Commercial Agreement">
                    <Printer className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteBilling(selectedBilling.id, selectedBilling.project_title)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      title="Delete Centralized Billing Definition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Scope Breakdown */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Approved Scope & Commercial Deliverables</p>
                <div className="space-y-1.5">
                  {selectedBilling.scope_items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-[10px] text-slate-500">{item.description}</p>}
                        {item.type !== 'base' && (
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            item.type === 'extra' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.type === 'extra' ? 'Scope Extension' : 'Special Charge'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-emerald-700">₹{Number(item.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Parts */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Configured Payment Parts ({selectedBilling.payment_split}-Part Structure)</p>
                <div className="space-y-1.5">
                  {selectedBilling.payment_parts.map(p => (
                    <div key={p.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{p.label}</p>
                        <p className="text-[10px] text-slate-400">Due: {p.due_date || 'Milestone'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">₹{p.configured_amount.toLocaleString('en-IN')}</p>
                        {(p.amount_received || 0) > 0 && (
                          <p className="text-[9px] text-emerald-600 font-bold">Rcvd: ₹{(p.amount_received||0).toLocaleString('en-IN')}</p>
                        )}
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'partially_paid' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{p.status.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown by Component (if configured) */}
              {selectedBilling.scope_breakdown && selectedBilling.scope_breakdown.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Cost Breakdown by Component</p>
                  <div className="space-y-1.5">
                    {selectedBilling.scope_breakdown.map(bd => (
                      <div key={bd.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                        <span className="font-semibold text-slate-700">{bd.component}</span>
                        <span className="font-black text-blue-700">₹{Number(bd.amount||0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-2 bg-blue-100 rounded-lg border border-blue-200 text-xs">
                      <span className="font-extrabold text-blue-900">Total Components</span>
                      <span className="font-black text-blue-900">
                        ₹{selectedBilling.scope_breakdown.reduce((s,b) => s + Number(b.amount||0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Controlled Audit Trail */}
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" /> Controlled Change Audit History
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedBilling.audit_trail || []).map(a => (
                    <div key={a.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>{new Date(a.timestamp).toLocaleString('en-IN')} • By {a.user}</span>
                        <span className="text-emerald-700 font-extrabold">₹{a.previous_value.toLocaleString('en-IN')} → ₹{a.updated_value.toLocaleString('en-IN')}</span>
                      </div>
                      <p className="font-semibold text-slate-800">{a.reason}</p>
                      {a.details && <p className="text-[10px] text-slate-500 mt-0.5">{a.details}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button size="sm" className="flex-1 text-xs bg-[#58051E] hover:bg-[#430316]" onClick={() => { setShowDetailModal(false); openControlledEdit(selectedBilling); }}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Controlled Update
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
