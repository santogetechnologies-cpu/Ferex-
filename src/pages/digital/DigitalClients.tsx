import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Edit3, Trash2, X, CheckCircle2, Mail, Phone, KeyRound, Copy, ShieldAlert, FolderKanban, FileText, CheckSquare, Eye } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalClients,
  createDigitalClient,
  updateDigitalClient,
  deleteDigitalClient,
  provisionDigitalClientLogin,
  getDigitalClientCredentials,
  getDigitalProjects,
  getDigitalTasks,
  getDigitalInvoices,
  type ProvisionedClientCredential
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalClients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Credential Modal State
  const [activeCredential, setActiveCredential] = useState<ProvisionedClientCredential | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Dossier Drawer State
  const [dossierClient, setDossierClient] = useState<any>(null);
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);

  const [newClient, setNewClient] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    city: 'Mumbai',
    type: 'Fintech & Banking'
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
          contact: d.contact_person,
          email: d.email,
          phone: d.phone || '+91 98190 33445',
          city: d.city || 'Mumbai',
          type: d.industry || d.client_type || 'Technology',
          status: d.status || 'Active',
          spent: `₹${Number(d.total_revenue || 0).toLocaleString('en-IN')}`,
          hasCredentials: !!getDigitalClientCredentials(d.id),
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    const created = await createDigitalClient({
      company_name: newClient.name,
      contact_person: newClient.contact,
      email: newClient.email,
      phone: newClient.phone,
      industry: newClient.type,
      city: newClient.city,
      status: 'Active'
    });
    setShowAddModal(false);
    showToast(`Added client ${newClient.name} to database`);
    setNewClient({ name: '', contact: '', email: '', phone: '', city: 'Mumbai', type: 'Fintech & Banking' });
    await loadClients();

    // Auto-prompt credential provisioning
    if (created?.id && created?.email) {
      handleProvisionCredentials({
        id: created.id,
        name: created.company_name,
        email: created.email,
        contact_person: created.contact_person
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    await updateDigitalClient(editingClient.id, {
      company_name: editingClient.name,
      contact_person: editingClient.contact,
      email: editingClient.email,
      phone: editingClient.phone,
      industry: editingClient.type,
      status: editingClient.status,
    });
    setEditingClient(null);
    showToast(`Updated ${editingClient.name}`);
    await loadClients();
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteDigitalClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
    showToast(`Deleted ${name}`);
  };

  const handleProvisionCredentials = async (client: any) => {
    const existing = getDigitalClientCredentials(client.id);
    if (existing) {
      setActiveCredential(existing);
      return;
    }

    const cred = await provisionDigitalClientLogin({
      id: client.id,
      email: client.email,
      name: client.name,
      company_name: client.name,
      contact_person: client.contact
    });
    setActiveCredential(cred);
    showToast(`Provisioned secure login credentials for ${client.name}`);
    loadClients();
  };

  const handleOpenDossier = async (client: any) => {
    setDossierClient(client);
    try {
      const [allProjects, allTasks, allInvoices] = await Promise.all([
        getDigitalProjects(),
        getDigitalTasks(),
        getDigitalInvoices()
      ]);
      setClientProjects(allProjects.filter((p: any) => p.client_id === client.id || p.client?.company_name === client.name));
      setClientTasks(allTasks.filter((t: any) => t.project?.client_id === client.id));
      setClientInvoices(allInvoices.filter((i: any) => i.client_id === client.id || i.client?.company_name === client.name));
    } catch {
      setClientProjects([]);
      setClientTasks([]);
      setClientInvoices([]);
    }
  };

  const copyCredentials = () => {
    if (!activeCredential) return;
    const text = `FEREX DIGITAL CLIENT PORTAL ACCESS\nPortal: Digital Operations Console\nEmail: ${activeCredential.email}\nTemporary Password: ${activeCredential.tempPassword}\nRole: ${activeCredential.role}\nNote: Mandatory password reset required on first sign-in.`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToast('Credentials copied to clipboard!');
  };

  const filteredClients = clients.filter(c => {
    return (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6A1B2E]" /> Enterprise Digital Clients Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Managed enterprise accounts, client portal credential provisioning, and mapped billing ledger.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
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
            placeholder="Search company, contact person, or email..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredClients.length} Verified Accounts</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading client directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((c) => (
            <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{c.type}</span>
                  <div className="flex items-center gap-1.5">
                    {c.hasCredentials && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <KeyRound className="w-2.5 h-2.5" /> Portal Active
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {c.status}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{c.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" /> {c.contact}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Total Invoiced</span>
                    <span className="text-xs font-black text-slate-900">{c.spent}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingClient(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded" title="Edit Client">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete Client">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] font-bold h-8 border-slate-200 hover:border-slate-300"
                    onClick={() => handleOpenDossier(c)}
                  >
                    <Eye className="w-3 h-3 mr-1 text-[#6A1B2E]" /> Dossier & Services
                  </Button>
                  <Button
                    size="sm"
                    className="text-[11px] font-bold h-8 bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => handleProvisionCredentials(c)}
                  >
                    <KeyRound className="w-3 h-3 mr-1 text-amber-300" />
                    {c.hasCredentials ? 'View Login' : 'Provision Login'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Enterprise Client</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Brand Name</label>
                  <input type="text" required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newClient.contact} onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Industry</label>
                    <input type="text" required value={newClient.type} onChange={(e) => setNewClient({ ...newClient, type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" required value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone</label>
                    <input type="text" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Create Client & Provision</Button>
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
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Credential Provisioning Modal */}
      <AnimatePresence>
        {activeCredential && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setActiveCredential(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Client Portal Login Access</h3>
                    <p className="text-[11px] font-semibold text-slate-500">{activeCredential.companyName}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCredential(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">First-Time Password Reset Active</span>
                  Client is enforced to choose a new permanent password on their first login session.
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Portal Login URL:</span>
                  <span className="font-mono text-slate-700">/login</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Client Email:</span>
                  <span className="font-bold text-slate-900">{activeCredential.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Temporary Password:</span>
                  <span className="font-mono font-black text-[#6A1B2E] text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{activeCredential.tempPassword}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Authorized Role:</span>
                  <span className="font-bold text-emerald-700 uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{activeCredential.role}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={copyCredentials}>
                  {copiedKey ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedKey ? 'Copied Details' : 'Copy Access Credentials'}
                </Button>
                <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setActiveCredential(null)}>Done</Button>
              </div>
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
                  <span className="text-[10px] font-bold text-[#6A1B2E] uppercase">Client Service Dossier & Ledger</span>
                </div>
                <button onClick={() => setDossierClient(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
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
                    <span className="font-bold text-[#6A1B2E]">{dossierClient.type}</span>
                  </div>
                </div>

                {/* Subscribed Projects */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#6A1B2E]" /> Active Digital Projects ({clientProjects.length})
                  </h4>
                  {clientProjects.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center font-medium">No projects currently mapped</div>
                  ) : (
                    <div className="space-y-2">
                      {clientProjects.map((p: any) => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>{p.title}</span>
                            <span className="text-[#6A1B2E]">₹{Number(p.budget || 0).toLocaleString('en-IN')}</span>
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
                    <CheckSquare className="w-3.5 h-3.5 text-[#6A1B2E]" /> Active Engineering Tasks ({clientTasks.length})
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
                    <FileText className="w-3.5 h-3.5 text-[#6A1B2E]" /> Billing Ledgers ({clientInvoices.length})
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

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setDossierClient(null)}>
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
