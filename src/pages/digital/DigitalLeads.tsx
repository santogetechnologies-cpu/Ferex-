import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Plus, Eye, X, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialLeads = [
  { id: 'LED-001', company: 'HDFC Life Insurance', contact: 'Nisha Agarwal', email: 'nisha@hdfclife.com', phone: '+91 98200 44321', service: 'Web Development', value: '₹18,00,000', stage: 'Proposal Sent', priority: 'High', created: '2026-07-28' },
  { id: 'LED-002', company: 'Swiggy Tech', contact: 'Arjun Rao', email: 'arjun@swiggy.com', phone: '+91 95001 88765', service: 'Mobile App', value: '₹24,50,000', stage: 'Qualified', priority: 'High', created: '2026-07-30' },
  { id: 'LED-003', company: 'PhonePe Branding', contact: 'Kavya Menon', email: 'kavya@phonepe.com', phone: '+91 80012 33456', service: 'Branding + SEO', value: '₹9,80,000', stage: 'Discovery', priority: 'Medium', created: '2026-08-01' },
  { id: 'LED-004', company: 'Zomato Digital Growth', contact: 'Prateek Joshi', email: 'prateek@zomato.com', phone: '+91 91234 12345', service: 'Digital Marketing', value: '₹6,00,000', stage: 'New', priority: 'Low', created: '2026-08-04' },
  { id: 'LED-005', company: 'Paytm Merchant UX', contact: 'Sana Sheikh', email: 'sana@paytm.com', phone: '+91 99811 44567', service: 'UI/UX Design', value: '₹11,20,000', stage: 'Negotiation', priority: 'High', created: '2026-08-05' },
];

const STAGES = ['New', 'Discovery', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

const stageBadge = (s: string) => {
  const cfg: Record<string, string> = {
    'New': 'bg-slate-100 text-slate-700 border-slate-200',
    'Discovery': 'bg-blue-50 text-blue-700 border-blue-200',
    'Qualified': 'bg-purple-50 text-purple-700 border-purple-200',
    'Proposal Sent': 'bg-amber-50 text-amber-700 border-amber-200',
    'Negotiation': 'bg-orange-50 text-orange-700 border-orange-200',
    'Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Lost': 'bg-red-50 text-red-700 border-red-200',
  };
  return cfg[s] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const priorityBadge = (p: string) => p === 'High' ? 'bg-red-50 text-red-700 border-red-200' : p === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';

export const DigitalLeads: React.FC = () => {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newLead, setNewLead] = useState({ company: '', contact: '', email: '', service: 'Web Development', value: '', stage: 'New', priority: 'Medium' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setLeads([{ id: `LED-${Math.floor(Math.random() * 900 + 100)}`, phone: '+91 00000 00000', created: new Date().toISOString().slice(0, 10), ...newLead }, ...leads]);
    setShowAddModal(false);
    showToast(`Lead "${newLead.company}" added!`);
    setNewLead({ company: '', contact: '', email: '', service: 'Web Development', value: '', stage: 'New', priority: 'Medium' });
  };

  const handleAdvanceStage = (id: string) => {
    setLeads(leads.map(l => {
      if (l.id !== id) return l;
      const idx = STAGES.indexOf(l.stage);
      return { ...l, stage: STAGES[Math.min(idx + 1, STAGES.length - 1)] };
    }));
    showToast('Stage advanced!');
  };

  const handleDelete = (id: string) => { setLeads(leads.filter(l => l.id !== id)); showToast('Lead removed'); };

  const filtered = leads.filter(l => {
    const matchS = l.company.toLowerCase().includes(search.toLowerCase()) || l.contact.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStage === 'All' || l.stage === filterStage;
    return matchS && matchF;
  });

  const stages = ['New', 'Discovery', 'Qualified', 'Proposal Sent', 'Negotiation'];
  const stageCount = (s: string) => leads.filter(l => l.stage === s).length;

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-[#6A1B2E]" /> Lead Pipeline & Sales Funnel</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Track, qualify, and convert leads into agency clients. Advance stages from Discovery to Closed Won.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Lead
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {stages.map(s => (
          <Card key={s} className="p-3 border border-slate-200/70 shadow-xs text-center">
            <div className="text-xl font-black text-slate-900">{stageCount(s)}</div>
            <div className="text-[9.5px] font-extrabold uppercase text-slate-400 mt-0.5 truncate">{s}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', ...STAGES.slice(0, 5)].map(t => (
            <button key={t} onClick={() => setFilterStage(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStage === t ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Lead & Company</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Deal Value</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{l.company}</div>
                    <div className="text-[10px] font-bold text-slate-400">{l.contact} · {l.id}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{l.service}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{l.value}</td>
                  <td className="py-3.5 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${stageBadge(l.stage)}`}>{l.stage}</span></td>
                  <td className="py-3.5 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${priorityBadge(l.priority)}`}>{l.priority}</span></td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedLead(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleAdvanceStage(l.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Advance Stage"><ChevronRight className="w-4 h-4" /></button>
                      <button onClick={() => { handleAdvanceStage(l.id); showToast(`${l.company} promoted to next stage!`); }} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold hover:bg-emerald-100 border border-emerald-200">Advance</button>
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Lead to Pipeline</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company</label>
                  <input type="text" required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Name</label>
                    <input type="text" required value={newLead.contact} onChange={e => setNewLead({...newLead, contact: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service</label>
                    <select value={newLead.service} onChange={e => setNewLead({...newLead, service: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {['Web Development', 'Mobile App', 'UI/UX Design', 'Digital Marketing', 'SEO', 'Branding'].map(s => <option key={s}>{s}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Deal Value</label>
                    <input type="text" required value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} placeholder="₹0" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select value={newLead.priority} onChange={e => setNewLead({...newLead, priority: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select></div>
                </div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Add to Pipeline</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedLead(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Lead Details — {selectedLead.id}</h3>
                <button onClick={() => setSelectedLead(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${stageBadge(selectedLead.stage)}`}>{selectedLead.stage}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${priorityBadge(selectedLead.priority)}`}>{selectedLead.priority} Priority</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900">{selectedLead.company}</h4>
                  <div className="text-xs font-semibold text-slate-600 space-y-1">
                    <p>Contact: {selectedLead.contact}</p>
                    <p>Service: {selectedLead.service}</p>
                    <p>Deal Value: <span className="font-black text-slate-900">{selectedLead.value}</span></p>
                    <p>Created: {selectedLead.created}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => { handleAdvanceStage(selectedLead.id); setSelectedLead(null); showToast('Stage advanced!'); }}>
                    <TrendingUp className="w-4 h-4 mr-1.5" /> Advance Stage
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => { showToast('Converted to client!'); setSelectedLead(null); }}>
                    Mark as Won
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
