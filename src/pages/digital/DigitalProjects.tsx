import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Search, Plus, Eye, X, CheckCircle2, Calendar, Users, DollarSign } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Planning': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-slate-100 text-slate-600 border-slate-200',
  'Review': 'bg-purple-50 text-purple-700 border-purple-200',
};

const initialProjects = [
  { id: 'PRJ-001', title: 'Reliance Digital E-Commerce Overhaul', client: 'Reliance Digital', service: 'Web Development', manager: 'Arun Patel', budget: '₹22,00,000', spent: '₹14,50,000', status: 'In Progress', deadline: '2026-09-30', team: 5, progress: 65 },
  { id: 'PRJ-002', title: 'Tata Motors UI Redesign Portal', client: 'Tata Motors Digital', service: 'UI/UX Design', manager: 'Sneha Roy', budget: '₹8,20,000', spent: '₹2,80,000', status: 'In Progress', deadline: '2026-10-15', team: 3, progress: 34 },
  { id: 'PRJ-003', title: 'Mahindra Fintech Mobile App', client: 'Mahindra Fintech', service: 'Mobile App', manager: 'Vivek Sharma', budget: '₹12,00,000', spent: '₹0', status: 'Planning', deadline: '2026-11-30', team: 4, progress: 5 },
  { id: 'PRJ-004', title: 'BigBasket SEO + Content Campaign', client: 'BigBasket Growth', service: 'SEO', manager: 'Riya Thomas', budget: '₹85,000/mo', spent: '₹1,70,000', status: 'In Progress', deadline: '2026-12-31', team: 2, progress: 50 },
  { id: 'PRJ-005', title: 'HDFC Life Brand Identity System', client: 'HDFC Life Insurance', service: 'Branding', manager: 'Arun Patel', budget: '₹4,50,000', spent: '₹4,50,000', status: 'Completed', deadline: '2026-07-31', team: 3, progress: 100 },
];

export const DigitalProjects: React.FC = () => {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newProj, setNewProj] = useState({ title: '', client: '', service: 'Web Development', budget: '', deadline: '', manager: 'Arun Patel' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const p = { id: `PRJ-${Math.floor(Math.random() * 900 + 100)}`, ...newProj, spent: '₹0', status: 'Planning', team: 2, progress: 0 };
    setProjects([p, ...projects]);
    setShowAddModal(false);
    showToast(`Project "${newProj.title}" created!`);
    setNewProj({ title: '', client: '', service: 'Web Development', budget: '', deadline: '', manager: 'Arun Patel' });
  };

  const handleMarkDone = (id: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, status: 'Completed', progress: 100 } : p));
    setSelectedProject(null);
    showToast('Project marked as Completed!');
  };

  const filtered = projects.filter(p => {
    const matchS = p.title.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || p.status === filterStatus;
    return matchS && matchF;
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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><FolderKanban className="w-5 h-5 text-[#6A1B2E]" /> Project Portfolio Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Track all agency delivery projects across Web, Mobile, Design, Marketing, and SEO.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['In Progress', projects.filter(p => p.status === 'In Progress').length, 'text-blue-600 bg-blue-50'],
          ['Planning', projects.filter(p => p.status === 'Planning').length, 'text-amber-600 bg-amber-50'],
          ['Completed', projects.filter(p => p.status === 'Completed').length, 'text-emerald-600 bg-emerald-50'],
          ['On Hold / Review', projects.filter(p => ['On Hold', 'Review'].includes(p.status)).length, 'text-slate-600 bg-slate-50']
        ].map(([label, count, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs text-center">
            <div className={`text-xl font-black ${String(clr).split(' ')[0]}`}>{count}</div>
            <div className="text-[9.5px] font-extrabold uppercase text-slate-400 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by project name or client..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'In Progress', 'Planning', 'Completed', 'On Hold'].map(t => (
            <button key={t} onClick={() => setFilterStatus(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === t ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map(p => (
          <Card key={p.id} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900">{p.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{p.status}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{p.client}</span>
                  <span className="flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5" />{p.service}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Deadline: {p.deadline}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />Budget: {p.budget}</span>
                </div>
                {/* Progress Bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full bg-[#6A1B2E] transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-600 whitespace-nowrap">{p.progress}% Complete</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedProject(p)} className="px-3.5 py-2 text-xs font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 rounded-xl hover:bg-[#6A1B2E] hover:text-white transition-all flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create New Project</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project Title</label>
                  <input type="text" required value={newProj.title} onChange={e => setNewProj({...newProj, title: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client</label>
                    <input type="text" required value={newProj.client} onChange={e => setNewProj({...newProj, client: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service Type</label>
                    <select value={newProj.service} onChange={e => setNewProj({...newProj, service: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {['Web Development', 'Mobile App', 'UI/UX Design', 'Digital Marketing', 'SEO', 'Branding'].map(s => <option key={s}>{s}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Budget</label>
                    <input type="text" required value={newProj.budget} onChange={e => setNewProj({...newProj, budget: e.target.value})} placeholder="₹0" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Deadline</label>
                    <input type="date" required value={newProj.deadline} onChange={e => setNewProj({...newProj, deadline: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Create Project</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedProject && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedProject(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Project Details — {selectedProject.id}</h3>
                <button onClick={() => setSelectedProject(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${STATUS_COLORS[selectedProject.status]}`}>{selectedProject.status}</span>
                  <h4 className="text-sm font-black text-slate-900">{selectedProject.title}</h4>
                  <div className="text-xs font-semibold text-slate-600 space-y-1">
                    <p>Client: <span className="font-bold text-slate-800">{selectedProject.client}</span></p>
                    <p>Service: {selectedProject.service}</p>
                    <p>Manager: {selectedProject.manager}</p>
                    <p>Team Size: {selectedProject.team} Members</p>
                    <p>Budget: <span className="font-black text-slate-900">{selectedProject.budget}</span></p>
                    <p>Spent: <span className="font-black text-slate-900">{selectedProject.spent}</span></p>
                    <p>Deadline: {selectedProject.deadline}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                    <span>Project Progress</span><span>{selectedProject.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-[#6A1B2E]" style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handleMarkDone(selectedProject.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Completed
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => { showToast('Timeline exported!'); setSelectedProject(null); }}>
                    Export Report
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
