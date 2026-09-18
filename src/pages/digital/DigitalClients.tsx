import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Edit3, Trash2, X, CheckCircle2, Mail, Phone, FolderKanban, FileText, CheckSquare, Eye, Lock, Globe, DollarSign, Building2, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import {
  getDigitalClients,
  createDigitalClient,
  updateDigitalClient,
  deleteDigitalClient,
  getDigitalProjects,
  getDigitalTasks,
  getDigitalInvoices
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

const INDUSTRY_OPTIONS = [
  'Fintech & Banking',
  'Healthcare & Pharmaceuticals',
  'E-Commerce & Retail',
  'EdTech & Education',
  'Real Estate & Infrastructure',
  'Cold Chain & Logistics',
  'FMCG & Consumer Goods',
  'Manufacturing & Heavy Industry',
  'Media, Entertainment & PR',
  'Hospitality & Tourism',
  'SaaS & Cloud Software',
  'Corporate Services & Holding'
];

export const DigitalClients: React.FC = () => {
  const { isAdmin } = useDigitalPermissions();

  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Dossier Drawer State
  const [dossierClient, setDossierClient] = useState<any>(null);
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);

  const [clientTypeFilter, setClientTypeFilter] = useState<'All' | 'Internal' | 'External'>('All');
  
  // Detailed Add Client Form State
  const [newClient, setNewClient] = useState({
    company_name: '',
    client_type: 'External' as 'Internal' | 'External',
    contact_person: '',
    email: '',
    phone: '',
    industry: 'Fintech & Banking',
    city: 'Mumbai',
    website: '',
    tax_id: '',
    estimated_budget: 250000,
    contract_value: 500000,
    notes: '',
    status: 'Active'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalClients();
      if (Array.isArray(data) && data.length > 0) {
        setClients(data.map(d => ({
          id: d.id,
          name: d.company_name || d.name || 'Enterprise Account',
          contact: d.contact_person || 'Point of Contact',
          email: d.email || 'client@company.com',
          phone: d.phone || '+91 98000 00000',
          city: d.city || 'Mumbai',
          type: d.industry || 'Digital Services',
          client_type: d.client_type || (d.company_name?.toLowerCase().includes('ferex') || d.company_name?.toLowerCase().includes('rimi') ? 'Internal' : 'External'),
          status: d.status || 'Active',
          spent: `₹${Number(d.total_revenue || 0).toLocaleString('en-IN')}`,
          notes: d.notes || '',
        })));
      } else {
        setClients([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();

    const channel = supabase
      .channel('realtime_digital_clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadClients())
      .subscribe();

    const handleLocalChange = () => loadClients();
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
    };
  }, [loadClients]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">Client Directory Restricted</h2>
          <p className="text-sm font-semibold text-slate-500 max-w-sm">
            The full enterprise client database is restricted to Digital Agency Administrators. You can view your allocated client projects under My Projects.
          </p>
        </div>
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.company_name.trim()) return;

    try {
      await createDigitalClient({
        company_name: newClient.company_name.trim(),
        contact_person: newClient.contact_person.trim(),
        email: newClient.email.trim(),
        phone: newClient.phone.trim(),
        industry: newClient.industry,
        city: newClient.city.trim(),
        client_type: newClient.client_type,
        status: newClient.status,
        notes: newClient.notes.trim() ? `${newClient.notes} | Website: ${newClient.website} | Tax ID: ${newClient.tax_id} | Initial Est Budget: ₹${newClient.estimated_budget} | Contract: ₹${newClient.contract_value}` : ''
      });

      setShowAddModal(false);
      showToast(`Added enterprise client ${newClient.company_name} (${newClient.client_type})`);
      setNewClient({
        company_name: '',
        client_type: 'External',
        contact_person: '',
        email: '',
        phone: '',
        industry: 'Fintech & Banking',
        city: 'Mumbai',
        website: '',
        tax_id: '',
        estimated_budget: 250000,
        contract_value: 500000,
        notes: '',
        status: 'Active'
      });
      await loadClients();
    } catch (err: any) {
      showToast(`Error creating client: ${err.message || 'Check database connection'}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await updateDigitalClient(editingClient.id, {
        company_name: editingClient.name,
        contact_person: editingClient.contact,
        email: editingClient.email,
        phone: editingClient.phone,
        industry: editingClient.type,
        client_type: editingClient.client_type,
        status: editingClient.status,
      });
      setEditingClient(null);
      showToast(`Updated ${editingClient.name}`);
      await loadClients();
    } catch (err: any) {
      showToast(`Error updating client: ${err.message || 'Check database connection'}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client account "${name}"?`)) return;
    try {
      await deleteDigitalClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      showToast(`Deleted ${name}`);
    } catch (err: any) {
      showToast(`Error deleting client: ${err.message || 'Unknown error'}`);
    }
  };

  const handleOpenDossier = async (client: any) => {
    setDossierClient(client);
    try {
      const [allProjects, allTasks, allInvoices] = await Promise.all([
        getDigitalProjects(),
        getDigitalTasks(),
        getDigitalInvoices()
      ]);
      setClientProjects(allProjects.filter((p: any) => p.client_id === client.id || p.client_name === client.name));
      setClientTasks(allTasks.filter((t: any) => t.project?.client_id === client.id || t.project?.client_name === client.name));
      setClientInvoices(allInvoices.filter((i: any) => i.client_id === client.id || i.client_name === client.name));
    } catch {
      setClientProjects([]);
      setClientTasks([]);
      setClientInvoices([]);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchType = clientTypeFilter === 'All' || c.client_type?.toLowerCase() === clientTypeFilter.toLowerCase();
    const matchSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#58051E]" /> Digital Agency Clients Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Centralized directory of Internal Subsidiaries & External Direct Enterprise Accounts.
          </p>
        </div>
        <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Enterprise Client
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact person, industry, email..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        {/* Client Type Filter Tabs (Only All / Internal / External) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', 'Internal', 'External'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setClientTypeFilter(tab); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                clientTypeFilter === tab
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'All' ? 'All Clients' : tab === 'Internal' ? 'Internal Subsidiaries' : 'External Accounts'}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-slate-400">{filteredClients.length} Accounts</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading client directory from database...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedClients.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    c.client_type === 'Internal'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {c.client_type === 'Internal' ? 'Internal Subsidiary' : 'External Enterprise'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{c.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" /> {c.contact}
                  </p>
                  <p className="text-[11px] font-bold text-[#58051E] mt-0.5">
                    {c.type}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}</div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.city}</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Total Invoiced</span>
                    <span className="text-xs font-black text-slate-900">{c.spent}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingClient(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer" title="Edit Client">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer" title="Delete Client">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[11px] font-bold h-8 border-slate-200 hover:border-slate-300"
                  onClick={() => handleOpenDossier(c)}
                >
                  <Eye className="w-3 h-3 mr-1 text-[#58051E]" /> View Client Dossier & Services
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredClients.length > 0 && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span>Showing {Math.min((currentPage - 1) * pageSize + 1, filteredClients.length)} to {Math.min(currentPage * pageSize, filteredClients.length)} of {filteredClients.length} clients</span>
            <span>·</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold bg-white focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="text-xs h-8 font-bold"
            >
              Previous
            </Button>
            <span className="text-xs font-bold text-slate-700 px-2">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="text-xs h-8 font-bold"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detailed Add Enterprise Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#58051E]" /> Add Enterprise Client Account
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Register a new internal subsidiary or external enterprise organization in Ferex Digital ERP.
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                {/* Account Type Selection */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Client Classification *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      newClient.client_type === 'External' ? 'bg-[#58051E]/5 border-[#58051E] text-[#58051E] font-bold' : 'bg-white border-slate-200 text-slate-600 font-medium'
                    }`}>
                      <input
                        type="radio"
                        name="client_type"
                        checked={newClient.client_type === 'External'}
                        onChange={() => setNewClient({ ...newClient, client_type: 'External' })}
                        className="accent-[#58051E]"
                      />
                      <div>
                        <span className="block text-xs font-black">External Enterprise Account</span>
                        <span className="text-[10px] text-slate-400 font-normal">Direct external corporate client</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      newClient.client_type === 'Internal' ? 'bg-[#58051E]/5 border-[#58051E] text-[#58051E] font-bold' : 'bg-white border-slate-200 text-slate-600 font-medium'
                    }`}>
                      <input
                        type="radio"
                        name="client_type"
                        checked={newClient.client_type === 'Internal'}
                        onChange={() => setNewClient({ ...newClient, client_type: 'Internal' })}
                        className="accent-[#58051E]"
                      />
                      <div>
                        <span className="block text-xs font-black">Internal Ferex Subsidiary</span>
                        <span className="text-[10px] text-slate-400 font-normal">Ferex Group sister division</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Company Name & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Company / Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={newClient.company_name}
                      onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                      placeholder="e.g. Apex Global Technologies Ltd."
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Industry / Domain Sector *</label>
                    <select
                      value={newClient.industry}
                      onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {INDUSTRY_OPTIONS.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Primary Contact & Official Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Primary Contact Person & Title *</label>
                    <input
                      type="text"
                      required
                      value={newClient.contact_person}
                      onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                      placeholder="e.g. John Doe, VP Marketing"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Official Work Email *</label>
                    <input
                      type="email"
                      required
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                {/* Phone & Operational City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone / WhatsApp Number</label>
                    <input
                      type="text"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="+91 98200 12345"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Headquarters City / State</label>
                    <input
                      type="text"
                      value={newClient.city}
                      onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                      placeholder="e.g. Mumbai / Maharashtra"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                {/* Commercials: Estimated Budget & Initial Contract Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Estimated Initial Project Budget (₹ INR)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        value={newClient.estimated_budget}
                        onChange={(e) => setNewClient({ ...newClient, estimated_budget: Number(e.target.value) })}
                        placeholder="250000"
                        className="w-full h-10 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Annual Contract Value (₹ INR)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        value={newClient.contract_value}
                        onChange={(e) => setNewClient({ ...newClient, contract_value: Number(e.target.value) })}
                        placeholder="500000"
                        className="w-full h-10 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Website & GSTIN / Tax ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Website URL (Optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={newClient.website}
                        onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                        placeholder="https://company.com"
                        className="w-full h-10 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">GSTIN / Corporate Tax ID (Optional)</label>
                    <input
                      type="text"
                      value={newClient.tax_id}
                      onChange={(e) => setNewClient({ ...newClient, tax_id: e.target.value })}
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                {/* Brief Notes */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Account Scope & Requirements Notes</label>
                  <textarea
                    rows={3}
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    placeholder="Enter project requirements, billing terms, key stakeholder notes..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Enterprise Client</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingClient(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Client Record</h3>
                <button onClick={() => setEditingClient(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company Name</label>
                  <input type="text" required value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={editingClient.contact} onChange={(e) => setEditingClient({ ...editingClient, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
                    <select value={editingClient.status} onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Active">Active</option>
                      <option value="Lead">Lead</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingClient(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dossier Drawer (Projects, Tasks, Invoices Mapping) */}
      <AnimatePresence>
        {dossierClient && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setDossierClient(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{dossierClient.name}</h3>
                  <span className="text-[10px] font-bold text-[#58051E] uppercase">Client Service Dossier & Ledger</span>
                </div>
                <button onClick={() => setDossierClient(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-6 text-left text-xs">
                {/* Contact info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Contact Person:</span>
                    <span className="font-bold text-slate-900">{dossierClient.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Official Email:</span>
                    <span className="font-bold text-slate-900">{dossierClient.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Phone:</span>
                    <span className="font-bold text-slate-900">{dossierClient.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Industry Tier:</span>
                    <span className="font-bold text-[#58051E]">{dossierClient.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Classification:</span>
                    <span className="font-bold text-emerald-700">{dossierClient.client_type === 'Internal' ? 'Internal Subsidiary' : 'External Enterprise'}</span>
                  </div>
                </div>

                {/* Subscribed Projects */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#58051E]" /> Active Digital Projects ({clientProjects.length})
                  </h4>
                  {clientProjects.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No projects currently mapped</div>
                  ) : (
                    <div className="space-y-2">
                      {clientProjects.map((p: any) => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{p.title}</span>
                            <span className="text-[#58051E]">₹{Number(p.budget || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Category: {p.service_category}</span>
                            <span className="font-bold text-emerald-700">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#58051E]" /> Active Engineering Tasks ({clientTasks.length})
                  </h4>
                  {clientTasks.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">All tasks cleared or in queue</div>
                  ) : (
                    <div className="space-y-1.5">
                      {clientTasks.map((t: any) => (
                        <div key={t.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <span className="font-bold text-slate-800">{t.title}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#58051E]" /> Billing Ledgers ({clientInvoices.length})
                  </h4>
                  {clientInvoices.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No invoices issued yet</div>
                  ) : (
                    <div className="space-y-1.5">
                      {clientInvoices.map((inv: any) => (
                        <div key={inv.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{inv.invoice_no || inv.id}</span>
                            <span className="text-[10px] text-slate-400">Due: {inv.due_date || 'Net 15'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{inv.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setDossierClient(null)}>
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

