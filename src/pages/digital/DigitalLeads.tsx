import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Plus, Eye, X, CheckCircle2, Target, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalLeads, createDigitalLead, updateDigitalClient, deleteDigitalClient, createDigitalProject } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newLead, setNewLead] = useState({ company: '', contact: '', email: '', service: 'Web & App Development', value: 850000 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalLeads();
      if (Array.isArray(data) && data.length > 0) {
        setLeads(data.map(d => ({
          id: d.id,
          company: d.company_name || 'Prospect Company',
          contact: d.contact_person,
          email: d.email,
          service: d.industry || 'Web & App Development',
          value: `₹${Number(d.total_revenue || 850000).toLocaleString('en-IN')}`,
          valueNum: Number(d.total_revenue || 850000),
          status: 'Lead',
        })));
      } else {
        setLeads([
          { id: '1', company: 'Global BioTech Innovations', contact: 'Dr. Sameer Roy', email: 's.roy@globalbiotech.com', service: 'UI/UX Design', value: '₹6,50,000', valueNum: 650000, status: 'Lead' },
          { id: '2', company: 'Vanguard Retail Logistics', contact: 'Karan Mehra', email: 'karan@vanguardlogistics.in', service: 'Web & App Development', value: '₹12,00,000', valueNum: 1200000, status: 'Lead' }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
    };
  }, [loadData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.company) return;
    await createDigitalLead({
      company_name: newLead.company,
      contact_person: newLead.contact,
      email: newLead.email,
      industry: newLead.service,
      estimated_budget: Number(newLead.value)
    });
    setShowAddModal(false);
    showToast(`Added lead ${newLead.company}`);
    setNewLead({ company: '', contact: '', email: '', service: 'Web & App Development', value: 850000 });
    await loadData();
  };

  const handleConvertLead = async (lead: any) => {
    await updateDigitalClient(lead.id, { status: 'Active' });
    await createDigitalProject({
      client_id: lead.id,
      client_name: lead.company,
      title: `${lead.company} Project Kickoff`,
      service_category: lead.service,
      budget: lead.valueNum || 850000,
      progress: 10,
      status: 'In Progress'
    });
    showToast(`Converted ${lead.company} to Active Client & created project!`);
    await loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteDigitalClient(id);
    setLeads(prev => prev.filter(l => l.id !== id));
    showToast(`Removed lead ${name}`);
  };

  const filtered = leads.filter(l =>
    (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.contact || '').toLowerCase().includes(search.toLowerCase())
  );

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
            <Target className="w-5 h-5 text-[#6A1B2E]" /> New Business Opportunity Leads
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Pipeline deal qualification, conversion to active retainers, and deal values.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Log Opportunity Lead
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospect company or contact..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Leads Active</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading opportunity leads...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((l) => (
            <Card key={l.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{l.service}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-50 text-amber-700 border-amber-200">
                    Lead Opportunity
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{l.company}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Contact: {l.contact} ({l.email})</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400">Estimated Deal Value</span>
                  <div className="text-sm font-black text-emerald-700">{l.value}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handleConvertLead(l)}>
                  Convert to Client
                </Button>
                <button onClick={() => handleDelete(l.id, l.company)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Log Opportunity Lead</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Brand Name</label>
                  <input type="text" required value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="e.g. Apex BioSciences" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person</label>
                    <input type="text" required value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service Interest</label>
                    <select value={newLead.service} onChange={(e) => setNewLead({ ...newLead, service: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Web & App Development">Web & App Development</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="SEO & Performance">SEO & Performance</option>
                      <option value="Branding & Identity">Branding & Identity</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" required value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated Budget (₹)</label>
                    <input type="number" required value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Lead</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
