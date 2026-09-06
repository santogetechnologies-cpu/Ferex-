import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Search, FolderKanban, FileText, Users,
  CheckCircle2, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalProjects,
  getDigitalClients,
  getDigitalInvoices
} from '../../lib/api/digital';
import { sendDigitalProjectMilestoneEmail } from '../../lib/api/automatedEmails';

export const CentralDigital: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'clients' | 'invoices'>('projects');
  const [clientTypeFilter, setClientTypeFilter] = useState<'All' | 'Internal' | 'External'>('All');
  const [stageFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [, setLoading] = useState(true);

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [reassignProject, setReassignProject] = useState<any | null>(null);
  const [newLeadDev, setNewLeadDev] = useState('Priya Nair');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, cData, iData] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalInvoices()
      ]);
      setProjects(pData || []);
      setClients(cData || []);
      setInvoices(iData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const totalPipelineValueInr = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
  const internalProjectsCount = projects.filter(p => (p.client?.company_name || p.client_name || '').toLowerCase().includes('ferex') || p.client_type === 'Internal').length;
  const externalProjectsCount = projects.length - internalProjectsCount;
  const totalInvoicedInr = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const handleUpdateProjectStage = async (proj: any, newStage: string) => {
    // Send automated email to client
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
    showToast(`Project "${proj.title}" updated to ${newStage} & client notified!`);
    loadData();
  };

  const filteredProjects = projects.filter(p => {
    const isInternal = (p.client?.company_name || p.client_name || '').toLowerCase().includes('ferex') || p.client_type === 'Internal';
    const matchType = clientTypeFilter === 'All' || (clientTypeFilter === 'Internal' ? isInternal : !isInternal);
    const matchStage = stageFilter === 'All' || p.status === stageFilter;
    const matchSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client?.company_name || p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.lead_developer || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchStage && matchSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Monitor className="w-6 h-6 text-emerald-600" /> Ferex Digital & Engineering Central Oversight
            </h1>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Subsidiary Governance
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight of internal and external client accounts, project sprint delivery stages, and milestone billing.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Pipeline
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Engineering Pipeline Value', val: `₹${(totalPipelineValueInr / 100000).toFixed(2)}L`, sub: `${projects.length} Active Sprints`, color: 'text-emerald-700' },
          { label: 'Internal Subsidiary Sprints', val: `${internalProjectsCount} Projects`, sub: 'Ferex Education, Trade & Rimi', color: 'text-rose-700' },
          { label: 'External B2B Clients', val: `${externalProjectsCount} Projects`, sub: 'Commercial Enterprise Accounts', color: 'text-blue-700' },
          { label: 'Total Invoiced & Billed', val: `₹${(totalInvoicedInr / 100000).toFixed(2)}L`, sub: `${invoices.length} Milestone Invoices`, color: 'text-amber-700' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">{kpi.label}</span>
            <div className={`text-xl font-black ${kpi.color}`}>{kpi.val}</div>
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
              activeTab === tab.id ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search project title, client, lead dev..."
                className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['All', 'Internal', 'External'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setClientTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    clientTypeFilter === type ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'All' ? 'All Client Types' : `${type} Clients`}
                </button>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-3 px-4">Project Title & Client</th>
                    <th className="py-3 px-4">Client Classification</th>
                    <th className="py-3 px-4 text-right">Budget (INR)</th>
                    <th className="py-3 px-4">Lifecycle Stage</th>
                    <th className="py-3 px-4">Assigned Tech Lead</th>
                    <th className="py-3 px-4 text-right">Stage Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredProjects.map(p => {
                    const isInternal = (p.client?.company_name || p.client_name || '').toLowerCase().includes('ferex') || p.client_type === 'Internal';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{p.title}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{p.client?.company_name || p.client_name || 'Enterprise Client'}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isInternal ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isInternal ? 'Internal Ferex Project' : 'External B2B Client'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(p.budget || 350000).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.status || 'In Progress'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-slate-800">{p.lead_developer || 'Priya Nair'}</strong>
                            <button
                              onClick={() => setReassignProject(p)}
                              className="text-[10px] font-bold text-[#6A1B2E] hover:underline cursor-pointer"
                            >
                              (Reassign)
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={p.status || 'In Progress'}
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
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: CLIENT DIRECTORY ── */}
      {activeTab === 'clients' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">Internal vs External Client Directory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c, idx) => {
              const isInternal = (c.company_name || c.name || '').toLowerCase().includes('ferex');
              return (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 text-xs">{c.company_name || c.name}</h4>
                      <p className="text-[11px] text-slate-400">{c.contact_person || 'Account Lead'} · {c.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      isInternal ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {isInternal ? 'Internal' : 'External'}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 flex justify-between pt-2 border-t border-slate-200">
                    <span>Account Status: Active</span>
                    <span className="text-emerald-600 font-mono">Billed: ₹{Number(c.total_revenue || 450000).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── TAB 3: INVOICES ── */}
      {activeTab === 'invoices' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client Account</th>
                <th className="py-3 px-4 text-right">Tax Amount</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {invoices.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{i.invoice_no}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{i.client?.company_name || i.client?.name || 'Enterprise Account'}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">₹{Number(i.tax_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">₹{Number(i.amount).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {i.status || 'Settled'}
                    </span>
                  </td>
                </tr>
              ))}
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
                <button onClick={() => setReassignProject(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Project: <span className="text-slate-900">{reassignProject.title}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Tech Lead / Staff</label>
                  <select
                    value={newLeadDev}
                    onChange={e => setNewLeadDev(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Priya Nair (Engineering Lead)">Priya Nair (Engineering Lead)</option>
                    <option value="Arun Patel (Senior Full-Stack Dev)">Arun Patel (Senior Full-Stack Dev)</option>
                    <option value="Sneha Roy (Lead UI/UX Architect)">Sneha Roy (Lead UI/UX Architect)</option>
                    <option value="Super Admin HQ">Super Admin HQ</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignProject(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => {
                      setProjects(prev => prev.map(p => p.id === reassignProject.id ? { ...p, lead_developer: newLeadDev } : p));
                      setReassignProject(null);
                      showToast(`Reassigned "${reassignProject.title}" to ${newLeadDev}!`);
                    }}
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
