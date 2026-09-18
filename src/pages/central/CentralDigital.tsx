import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Search, FolderKanban, FileText, Users,
  CheckCircle2, RefreshCw, X, Filter
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getDigitalProjects,
  getDigitalClients,
  getDigitalInvoices,
  getDigitalStaffMembers,
  reassignDigitalProject,
  updateDigitalProjectStage
} from '../../lib/api/digital';
import { sendDigitalProjectMilestoneEmail } from '../../lib/api/automatedEmails';
import { supabase } from '../../lib/supabase';

export const CentralDigital: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'clients' | 'invoices'>('projects');
  const [clientTypeFilter, setClientTypeFilter] = useState<'All' | 'Internal' | 'External'>('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [reassignProject, setReassignProject] = useState<any | null>(null);
  const [newLeadDev, setNewLeadDev] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, cData, iData, sData] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalInvoices(),
        getDigitalStaffMembers()
      ]);
      setProjects(pData || []);
      setClients(cData || []);
      setInvoices(iData || []);
      setStaffList(sData || []);
      if (sData && sData.length > 0 && !newLeadDev) {
        setNewLeadDev(sData[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [newLeadDev]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_digital_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_digital_projects_change', handleSync);
    window.addEventListener('ferex_digital_clients_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleSync);
      window.removeEventListener('ferex_digital_clients_change', handleSync);
    };
  }, [loadData]);

  // Aggregate Metrics — Live Supabase Calculations
  const totalPipelineValueInr = useMemo(() => {
    return projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
  }, [projects]);

  const internalProjectsCount = useMemo(() => {
    return projects.filter(p => (p.client?.company_name || p.client_name || '').toLowerCase().includes('ferex') || (p.client?.company_name || p.client_name || '').toLowerCase().includes('rimi') || p.client_type === 'Internal').length;
  }, [projects]);

  const externalProjectsCount = projects.length - internalProjectsCount;
  const totalInvoicedInr = useMemo(() => {
    return invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [invoices]);

  const handleUpdateProjectStage = async (proj: any, newStage: string) => {
    try {
      await updateDigitalProjectStage(proj.id, newStage);
      const clientObj = clients.find(c => c.id === proj.client_id) || proj.client;
      if (clientObj?.email) {
        await sendDigitalProjectMilestoneEmail({
          clientEmail: clientObj.email,
          clientName: clientObj.contact_person || clientObj.company_name || 'Client',
          projectTitle: proj.title,
          stage: newStage as any,
          amount: Number(proj.budget || 0)
        });
      }
      showToast(`Project "${proj.title}" updated to ${newStage} in Supabase & client notified!`);
      loadData();
    } catch (err: any) {
      showToast(`Failed to update project stage: ${err.message}`);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignProject || !newLeadDev) return;
    try {
      const staffMember = staffList.find(s => s.name === newLeadDev || s.email === newLeadDev);
      await reassignDigitalProject(reassignProject.id, newLeadDev, staffMember?.email, staffMember?.id);
      setProjects(prev => prev.map(p => p.id === reassignProject.id ? { ...p, lead_developer: newLeadDev, assigned_staff_name: newLeadDev } : p));
      showToast(`Reassigned "${reassignProject.title}" to ${newLeadDev} in Supabase!`);
      setReassignProject(null);
    } catch (err: any) {
      showToast(`Failed to reassign: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter(p => {
    const isInternal = (p.client?.company_name || p.client_name || '').toLowerCase().includes('ferex') || (p.client?.company_name || p.client_name || '').toLowerCase().includes('rimi') || p.client_type === 'Internal';
    const matchType = clientTypeFilter === 'All' || (clientTypeFilter === 'Internal' ? isInternal : !isInternal);
    const matchStage = stageFilter === 'All' || p.status === stageFilter;
    const matchPayment = paymentStatusFilter === 'All' || (p.payment_status || (p.status === 'Closed' ? 'Paid' : 'Pending')) === paymentStatusFilter;
    const staffName = p.assigned_staff_name || p.lead_developer || '';
    const matchStaff = staffFilter === 'All' || staffName.toLowerCase().includes(staffFilter.toLowerCase());
    const matchSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client?.company_name || p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      staffName.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStage && matchPayment && matchStaff && matchSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Monitor className="w-6 h-6 text-emerald-600" /> Ferex Digital & Engineering Central Oversight
            </h1>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight of internal subsidiaries and external B2B clients, project delivery stages, and billing.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Pipeline
        </Button>
      </div>

      {/* KPI Cards — Live Supabase Calculations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Engineering Pipeline Value', val: `₹${(totalPipelineValueInr / 100000).toFixed(2)}L`, sub: `${projects.length} Active Sprints`, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Internal Subsidiary Sprints', val: `${internalProjectsCount} Projects`, sub: 'Ferex Education, Trade & Rimi', color: 'text-rose-700 bg-rose-50 border-rose-100' },
          { label: 'External B2B Clients', val: `${externalProjectsCount} Projects`, sub: 'Commercial Enterprise Accounts', color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Total Invoiced & Billed', val: `₹${(totalInvoicedInr / 100000).toFixed(2)}L`, sub: `${invoices.length} Milestone Invoices`, color: 'text-amber-700 bg-amber-50 border-amber-100' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">{kpi.label}</span>
            <div className="text-xl font-black text-slate-900">{kpi.val}</div>
            <span className="text-[11px] font-bold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'projects', label: `Projects & Sprints (${projects.length})`, icon: FolderKanban },
          { id: 'clients', label: `Internal vs External Clients (${clients.length})`, icon: Users },
          { id: 'invoices', label: `Milestone Invoices (${invoices.length})`, icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: PROJECTS & SPRINTS ── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search project title, client, staff..."
                  className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Client Type Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto">
                {(['All', 'Internal', 'External'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setClientTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      clientTypeFilter === type ? 'bg-[#58051E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'All' ? 'All Clients' : `${type} Clients`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Stage, Payment Status & Staff */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Stage:</span>
                <select
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Stages</option>
                  <option value="Briefing">Briefing</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Revisions">Revisions</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Payment:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={e => setPaymentStatusFilter(e.target.value)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Payment Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Tech Lead:</span>
                <select
                  value={staffFilter}
                  onChange={e => setStaffFilter(e.target.value)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Staff / Developers</option>
                  {staffList.map((s: any) => (
                    <option key={s.id || s.email} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <span className="ml-auto text-xs font-bold text-slate-400">
                {filteredProjects.length} Filtered Sprints
              </span>
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 select-none">
                    <th className="py-3 px-4">Project Title & Scope</th>
                    <th className="py-3 px-4">Client / Subsidiary</th>
                    <th className="py-3 px-4">Service Category</th>
                    <th className="py-3 px-4 text-right">Budget (INR)</th>
                    <th className="py-3 px-4 text-center">Stage</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4">Assigned Tech Lead</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs font-bold text-slate-400">
                        Loading digital projects from Supabase...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs font-bold text-slate-400">
                        No digital projects found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map(p => {
                      const clientName = p.client?.company_name || p.client_name || 'Enterprise Client';
                      const isInternal = clientName.toLowerCase().includes('ferex') || clientName.toLowerCase().includes('rimi') || p.client_type === 'Internal';
                      const leadDev = p.lead_developer || p.assigned_staff_name || 'Digital Lead';
                      const paymentStatus = p.payment_status || (p.status === 'Closed' ? 'Paid' : 'Pending');

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{p.title}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{p.scope || 'Sprint Roadmap'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-800 font-bold">{clientName}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                isInternal ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {isInternal ? 'Internal' : 'External'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{p.service_category || 'Full-Stack Software'}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(p.budget || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              p.status === 'Delivered' || p.status === 'Closed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : p.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {p.status || 'Briefing'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">{leadDev}</strong>
                              <button
                                onClick={() => {
                                  setReassignProject(p);
                                  setNewLeadDev(leadDev || (staffList[0]?.name || ''));
                                }}
                                className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                              >
                                (Reassign)
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <select
                              value={p.status || 'Briefing'}
                              onChange={e => handleUpdateProjectStage(p, e.target.value)}
                              className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="Briefing">Briefing</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">Review</option>
                              <option value="Revisions">Revisions</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: CLIENTS ── */}
      {activeTab === 'clients' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Client Company</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{c.company_name}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      c.client_type === 'Internal' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {c.client_type || 'External'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">{c.contact_person || 'Managing Officer'}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{c.email}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── TAB 3: INVOICES ── */}
      {activeTab === 'invoices' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      <div>{i.invoice_no || i.id}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{i.issued_at || (i.created_at ? new Date(i.created_at).toLocaleDateString() : 'Recent')}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{i.client?.company_name || 'Enterprise Client'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                      ₹{Number(i.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        i.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {i.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Reassign Project Lead Modal */}
      <AnimatePresence>
        {reassignProject && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassignProject(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Digital Tech Lead</h3>
                <button onClick={() => setReassignProject(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Project: <span className="text-slate-900 font-extrabold">{reassignProject.title}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Tech Lead / Staff Member</label>
                  <select
                    value={newLeadDev}
                    onChange={e => setNewLeadDev(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {staffList.map((s: any) => (
                      <option key={s.id || s.email} value={s.name}>
                        {s.name} ({s.roleLabel || s.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignProject(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassign}
                  >
                    Confirm Reassignment
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
