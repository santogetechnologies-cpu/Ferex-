import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Search, Plus, X, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getDigitalProjects, createDigitalProject, updateDigitalProject, deleteDigitalProject, getDigitalClients } from '../../lib/api/digital';

export const DigitalProjects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [newProj, setNewProj] = useState({
    title: '',
    client_id: '',
    client_name: '',
    service_category: 'Web & App Development',
    budget: 650000,
    progress: 25,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lead_developer: 'Kavita Iyer'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, clientData] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients()
      ]);
      setClients(clientData);

      if (Array.isArray(projData) && projData.length > 0) {
        setProjects(projData);
      } else {
        setProjects([
          { id: '1', title: 'Nexus NeoBanking Web & Mobile Platform', client: { company_name: 'Nexus FinTech Global' }, service_category: 'Web & App Development', status: 'In Progress', budget: 1450000, progress: 68, deadline: '2026-10-15', lead_developer: 'Kavita Iyer' },
          { id: '2', title: 'Starlight Multi-Brand Design System & UI/UX', client: { company_name: 'Starlight E-Commerce Brands' }, service_category: 'UI/UX Design', status: 'In Progress', budget: 820000, progress: 45, deadline: '2026-09-30', lead_developer: 'Sameer Sen' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.title) return;
    await createDigitalProject({
      title: newProj.title,
      client_id: newProj.client_id || (clients.length > 0 ? clients[0].id : undefined),
      client_name: newProj.client_name || (clients.length > 0 ? clients[0].company_name : 'Nexus FinTech Global'),
      service_category: newProj.service_category,
      budget: Number(newProj.budget),
      progress: Number(newProj.progress),
      deadline: newProj.deadline,
      lead_developer: newProj.lead_developer,
      status: 'In Progress'
    });
    setShowAddModal(false);
    showToast(`Created project "${newProj.title}"`);
    setNewProj({ title: '', client_id: '', client_name: '', service_category: 'Web & App Development', budget: 650000, progress: 25, deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], lead_developer: 'Kavita Iyer' });
    await loadData();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await updateDigitalProject(editingProject.id, {
      title: editingProject.title,
      service_category: editingProject.service_category,
      budget: Number(editingProject.budget),
      progress: Number(editingProject.progress),
      status: editingProject.status,
      lead_developer: editingProject.lead_developer
    });
    setEditingProject(null);
    showToast(`Updated "${editingProject.title}"`);
    await loadData();
  };

  const handleDelete = async (id: string, title: string) => {
    await deleteDigitalProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    showToast(`Removed project ${title}`);
  };

  const filtered = projects.filter(p => {
    return (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.service_category || '').toLowerCase().includes(search.toLowerCase());
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
            <FolderKanban className="w-5 h-5 text-[#6A1B2E]" /> Engineering & Design Projects Portfolio
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Live sprints, sprint velocity, completion deliverables, and budget tracking.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Launch New Project
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project title, client, or category..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Projects Tracked</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading project portfolio...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{p.service_category}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    {p.status || 'In Progress'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{p.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{p.client?.company_name || 'Enterprise Client'}</p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Sprint Progress</span>
                    <span className="text-[#6A1B2E] font-black">{p.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#6A1B2E] h-full rounded-full transition-all duration-500" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between font-bold">
                    <span>Budget:</span>
                    <span className="text-slate-900">₹{Number(p.budget || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Tech Lead:</span>
                    <span>{p.lead_developer || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Target Date:</span>
                    <span>{p.deadline || 'Pending'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => setEditingProject(p)}>
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Sprint
                </Button>
                <button onClick={() => handleDelete(p.id, p.title)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Launch New Project</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project Title</label>
                  <input type="text" required value={newProj.title} onChange={(e) => setNewProj({ ...newProj, title: e.target.value })} placeholder="e.g. NeoBanking Mobile App" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client</label>
                  {clients.length > 0 ? (
                    <select value={newProj.client_id} onChange={(e) => setNewProj({ ...newProj, client_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={newProj.client_name} onChange={(e) => setNewProj({ ...newProj, client_name: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service Domain</label>
                    <select value={newProj.service_category} onChange={(e) => setNewProj({ ...newProj, service_category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Web & App Development">Web & App Development</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="SEO & Performance">SEO & Performance</option>
                      <option value="Branding & Identity">Branding & Identity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Budget (₹ INR)</label>
                    <input type="number" required value={newProj.budget} onChange={(e) => setNewProj({ ...newProj, budget: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tech Lead</label>
                    <input type="text" value={newProj.lead_developer} onChange={(e) => setNewProj({ ...newProj, lead_developer: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Deadline Date</label>
                    <input type="date" value={newProj.deadline} onChange={(e) => setNewProj({ ...newProj, deadline: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProject && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingProject(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Project Sprint</h3>
                <button onClick={() => setEditingProject(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project Title</label>
                  <input type="text" required value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
                    <select value={editingProject.status} onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Progress: {editingProject.progress}%</label>
                    <input type="range" min="0" max="100" value={editingProject.progress || 0} onChange={(e) => setEditingProject({ ...editingProject, progress: Number(e.target.value) })} className="w-full mt-2" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingProject(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Project</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
