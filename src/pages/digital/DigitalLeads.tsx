import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Target, Trash2, Settings, Edit2, Phone,
  Mail, DollarSign, Tag, User, Building, Globe, CheckCircle2,
  ArrowRight, ChevronDown, Briefcase, Star, Clock, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { getDigitalLeads, createDigitalLead, updateDigitalClient, deleteDigitalClient, createDigitalProject, convertDigitalLead } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

const DEFAULT_CATEGORIES = [
  'Web Development',
  'Mobile App Development',
  'UI/UX Design',
  'Digital Marketing',
  'SEO & Content',
  'Branding & Identity',
  'E-Commerce',
  'Enterprise Software',
  'AI / ML Solutions',
  'Social Media Management',
];

const LEAD_STAGES = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
const LEAD_SOURCES = ['Referral', 'Website', 'Cold Outreach', 'Social Media', 'Event', 'Partner', 'Advertisement', 'Other'];
const CONVERT_PAYMENT_TERMS = ['Advance Payment', 'Milestone-Based', 'Full Payment'];

const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  'Contacted': 'bg-violet-50 text-violet-700 border-violet-200',
  'Proposal Sent': 'bg-amber-50 text-amber-700 border-amber-200',
  'Negotiation': 'bg-orange-50 text-orange-700 border-orange-200',
  'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Closed Lost': 'bg-red-50 text-red-700 border-red-200',
};

export const DigitalLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLead, setConvertLead] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [editLead, setEditLead] = useState<any>(null);

  const [newLead, setNewLead] = useState({
    company: '', contact: '', email: '', phone: '',
    service: DEFAULT_CATEGORIES[0], value: 0,
    stage: 'New Lead', source: 'Referral',
    website: '', notes: '', priority: 'Medium'
  });

  const [convertForm, setConvertForm] = useState({
    paymentTerms: 'Milestone-Based',
    projectTitle: '',
    projectScope: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    serviceCategory: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalLeads();
      if (Array.isArray(data) && data.length > 0) {
        setLeads(data.map(d => ({
          id: d.id,
          company: d.company_name || 'Prospect Company',
          contact: d.contact_person || 'Direct Contact',
          email: d.email || '',
          phone: d.phone || '',
          service: d.industry || DEFAULT_CATEGORIES[0],
          value: `₹${Number(d.estimated_budget ?? d.total_revenue ?? 0).toLocaleString('en-IN')}`,
          valueNum: Number(d.estimated_budget ?? d.total_revenue ?? 0),
          status: 'Lead',
          stage: d.lead_stage || 'New Lead',
          source: d.lead_source || 'Referral',
          website: d.website || '',
          notes: d.notes || '',
          priority: d.priority || 'Medium',
        })));
      } else {
        setLeads([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Load saved categories
    const saved = localStorage.getItem('ferex_lead_categories');
    if (saved) {
      try { setCategories(JSON.parse(saved)); } catch {}
    }

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

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    localStorage.setItem('ferex_lead_categories', JSON.stringify(cats));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.company.trim()) return;

    const valNum = Number(newLead.value) || 0;
    const created = await createDigitalLead({
      company_name: newLead.company.trim(),
      contact_person: newLead.contact.trim() || 'Direct Contact',
      email: newLead.email.trim(),
      phone: newLead.phone.trim(),
      industry: newLead.service,
      estimated_budget: valNum,
      lead_stage: newLead.stage,
      lead_source: newLead.source,
      website: newLead.website.trim(),
      notes: newLead.notes.trim(),
      priority: newLead.priority,
    });

    const newLeadItem = {
      id: created.id,
      company: created.company_name,
      contact: created.contact_person,
      email: created.email,
      phone: newLead.phone,
      service: created.industry || newLead.service,
      value: `₹${valNum.toLocaleString('en-IN')}`,
      valueNum: valNum,
      status: 'Lead',
      stage: newLead.stage,
      source: newLead.source,
      website: newLead.website,
      notes: newLead.notes,
      priority: newLead.priority,
    };

    setLeads(prev => [newLeadItem, ...prev.filter(l => l.id !== created.id)]);
    setShowAddModal(false);
    showToast(`Lead "${newLead.company}" added successfully`);
    setNewLead({ company: '', contact: '', email: '', phone: '', service: categories[0] || DEFAULT_CATEGORIES[0], value: 0, stage: 'New Lead', source: 'Referral', website: '', notes: '', priority: 'Medium' });
    await loadData();
  };

  const openConvert = (lead: any) => {
    setConvertLead(lead);
    setConvertForm({
      paymentTerms: 'Milestone-Based',
      projectTitle: `${lead.company} — ${lead.service}`,
      projectScope: lead.notes || '',
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      serviceCategory: lead.service
    });
    setShowConvertModal(true);
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertLead) return;

    try {
      await convertDigitalLead(convertLead.id, {
        title: convertForm.projectTitle || `${convertLead.company} Project Kickoff`,
        service_category: convertForm.serviceCategory || convertLead.service,
        budget: convertLead.valueNum || 0,
        scope: convertForm.projectScope,
        payment_terms: convertForm.paymentTerms,
        start_date: convertForm.startDate,
        deadline: convertForm.deadline,
      });

      const companyName = convertLead.company;
      setLeads(prev => prev.filter(l => l.id !== convertLead.id));
      setShowConvertModal(false);
      setConvertLead(null);
      showToast(`✅ "${companyName}" converted to Active Client & moved to Clients Directory!`);
      await loadData();
    } catch (err: any) {
      showToast(`Conversion failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdateStage = async (lead: any, newStage: string) => {
    try {
      await updateDigitalClient(lead.id, { lead_stage: newStage });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));
      showToast(`Stage updated to "${newStage}"`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove lead "${name}"?`)) return;
    try {
      await deleteDigitalClient(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      showToast(`Lead "${name}" removed`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const filtered = leads.filter(l => {
    const matchSearch =
      (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.contact || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || l.service === categoryFilter;
    const matchStage = stageFilter === 'All' || l.stage === stageFilter;
    return matchSearch && matchCat && matchStage;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-[#58051E]" /> New Business Opportunity Leads
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Pipeline deal qualification, lead stage tracking, and client conversion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setShowCategoryMgr(true)}>
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Categories
          </Button>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log Opportunity Lead
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, email..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="All">All Stages</option>
            {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{filtered.length} Leads</span>
        </div>
      </Card>

      {/* Lead Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading opportunity leads...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No leads found. Log your first opportunity.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((l) => (
            <Card key={l.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-md truncate max-w-[140px]">{l.service}</span>
                  <select
                    value={l.stage}
                    onChange={(e) => handleUpdateStage(l, e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-full px-2 py-0.5 cursor-pointer ${STAGE_COLORS[l.stage] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                  >
                    {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{l.company}</h3>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <User className="w-3 h-3 shrink-0" /> {l.contact}
                    </p>
                    {l.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 shrink-0" /> {l.email}
                      </p>
                    )}
                    {l.phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0" /> {l.phone}
                      </p>
                    )}
                    {l.website && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 shrink-0" /> {l.website}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400">Estimated Value</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Via {l.source}</span>
                  </div>
                  <div className="text-sm font-black text-emerald-700">{l.value}</div>
                </div>

                {l.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">{l.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                  onClick={() => openConvert(l)}
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1" /> Convert to Client
                </Button>
                <button onClick={() => handleDelete(l.id, l.company)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── ADD LEAD MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><Target className="w-4 h-4 text-[#58051E]" /> Log Opportunity Lead</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                {/* Company */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Company / Brand Name *</label>
                  <input type="text" required value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="e.g. Apex BioSciences Pvt. Ltd." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>

                {/* Contact + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Person *</label>
                    <input type="text" required value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone Number</label>
                    <input type="tel" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>

                {/* Email + Website */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email *</label>
                    <input type="email" required value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Website / URL</label>
                    <input type="url" value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} placeholder="https://..." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>

                {/* Service Category + Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service Category *</label>
                    <select value={newLead.service} onChange={(e) => setNewLead({ ...newLead, service: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated Budget (₹)</label>
                    <input type="number" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>

                {/* Stage + Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Lead Stage</label>
                    <select value={newLead.stage} onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Lead Source</label>
                    <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Priority + Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select value={newLead.priority} onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Notes / Requirements</label>
                  <textarea rows={3} value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} placeholder="Key requirements, timeline expectations, special notes..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Lead</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CONVERT TO CLIENT MODAL ── */}
      <AnimatePresence>
        {showConvertModal && convertLead && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowConvertModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Convert to Active Client
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Converting: <strong>{convertLead.company}</strong></p>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleConvertLead} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project Title *</label>
                  <input type="text" required value={convertForm.projectTitle} onChange={(e) => setConvertForm({ ...convertForm, projectTitle: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service Category</label>
                  <select value={convertForm.serviceCategory} onChange={(e) => setConvertForm({ ...convertForm, serviceCategory: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Terms</label>
                  <select value={convertForm.paymentTerms} onChange={(e) => setConvertForm({ ...convertForm, paymentTerms: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    {CONVERT_PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Start Date</label>
                    <input type="date" value={convertForm.startDate} onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Deadline</label>
                    <input type="date" value={convertForm.deadline} onChange={(e) => setConvertForm({ ...convertForm, deadline: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project Scope / Notes</label>
                  <textarea rows={3} value={convertForm.projectScope} onChange={(e) => setConvertForm({ ...convertForm, projectScope: e.target.value })} placeholder="Describe the project deliverables and scope..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                  <strong>{convertLead.company}</strong> will be marked as Active Client and a new Briefing project will be created with budget <strong>{convertLead.value}</strong>.
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowConvertModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700">Convert to Client</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CATEGORY MANAGER MODAL ── */}
      <AnimatePresence>
        {showCategoryMgr && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCategoryMgr(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><Settings className="w-4 h-4 text-[#58051E]" /> Manage Service Categories</h3>
                <button onClick={() => setShowCategoryMgr(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                  <div key={cat} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">{cat}</span>
                    <button
                      onClick={() => saveCategories(categories.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategory.trim()) {
                      saveCategories([...categories, newCategory.trim()]);
                      setNewCategory('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold"
                  onClick={() => {
                    if (newCategory.trim()) {
                      saveCategories([...categories, newCategory.trim()]);
                      setNewCategory('');
                    }
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" className="text-xs font-bold" onClick={() => setShowCategoryMgr(false)}>Done</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
