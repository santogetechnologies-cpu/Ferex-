import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Search, Plus, Eye, X, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getDigitalProjects, createDigitalProject, updateDigitalProject, deleteDigitalProject } from '../../lib/api/digital';

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Planning': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-slate-100 text-slate-600 border-slate-200',
  'Review': 'bg-purple-50 text-purple-700 border-purple-200',
};

export const DigitalProjects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newProj, setNewProj] = useState({ title: '', client_name: '', service_category: 'Web Development', budget: 500000, deadline: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDigitalProjects();
      setProjects(data || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();

    const channel = supabase
      .channel('realtime_digital_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => {
        loadProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.title || !newProj.client_name) {
      showToast('Please fill title and client name');
      return;
    }
    const created = await createDigitalProject(newProj);
    setProjects(prev => [created, ...prev]);
    setShowAddModal(false);
    showToast(`Project "${newProj.title}" created in Supabase!`);
    setNewProj({ title: '', client_name: '', service_category: 'Web Development', budget: 500000, deadline: '' });
  };

  const handleMarkDone = async (id: string) => {
    await updateDigitalProject(id, { status: 'Completed', progress: 100 });
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, status: 'Completed', progress: 100 } : p)));
    setSelectedProject(null);
    showToast('Project marked as Completed!');
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setSelectedProject(null);
    showToast('Project removed.');
  };

  const filtered = projects.filter(p => {
    const matchS = (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
                   (p.client_name || p.client || '').toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><FolderKanban className="w-5 h-5 text-[#6A1B2E]" /> Active Projects & Deliverables</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Ferex Digital Console • Manage web engineering, brand identity, UI/UX sprints, and campaign execution.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Search by project name or client..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6A1B2E]" />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {['All', 'In Progress', 'Planning', 'Completed'].map(status => (
              <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === status ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading projects from Supabase...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No active projects found</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">Create your first client deliverable or adjust search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(proj => (
            <Card key={proj.id} className="p-5 bg-white border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[proj.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{proj.status}</span>
                  <span className="text-[10px] font-extrabold text-slate-400">{proj.project_code || proj.id}</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 leading-tight mb-1">{proj.title}</h3>
                <p className="text-xs font-bold text-[#6A1B2E] mb-3">{proj.client_name || proj.client}</p>

                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="flex justify-between font-semibold"><span className="text-slate-500">Service:</span><span className="text-slate-800 font-bold">{proj.service_category || proj.service || 'Web'}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-slate-500">Budget:</span><span className="text-slate-800 font-bold">₹{Number(proj.budget || 0).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-slate-500">Deadline:</span><span className="text-slate-800 font-bold">{proj.deadline || '2026-10-31'}</span></div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-600">Sprint Progress</span>
                    <span className="text-[#6A1B2E]">{proj.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-[#6A1B2E] h-2 rounded-full" style={{ width: `${proj.progress || 0}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button onClick={() => setSelectedProject(proj)} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View Scope
                </button>
                <button onClick={() => handleDelete(proj.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add New Digital Project</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project Title</label>
                  <input required type="text" value={newProj.title} onChange={e => setNewProj({ ...newProj, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#6A1B2E]" placeholder="e.g. Mobile Banking App" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client Name</label>
                  <input required type="text" value={newProj.client_name} onChange={e => setNewProj({ ...newProj, client_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#6A1B2E]" placeholder="e.g. HDFC Life" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Budget (₹)</label>
                    <input type="number" value={newProj.budget} onChange={e => setNewProj({ ...newProj, budget: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Deadline</label>
                    <input type="date" value={newProj.deadline} onChange={e => setNewProj({ ...newProj, deadline: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#6A1B2E] text-white">Create Project</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scope Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedProject(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedProject.title}</h3>
                  <p className="text-xs font-bold text-[#6A1B2E]">{selectedProject.client_name || selectedProject.client}</p>
                </div>
                <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500 font-bold">Status:</span><span className="font-extrabold">{selectedProject.status}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500 font-bold">Service Category:</span><span className="font-extrabold">{selectedProject.service_category || selectedProject.service || 'Web Development'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500 font-bold">Total Budget:</span><span className="font-extrabold">₹{Number(selectedProject.budget || 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500 font-bold">Target Deadline:</span><span className="font-extrabold">{selectedProject.deadline || '2026-10-31'}</span></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {selectedProject.status !== 'Completed' && (
                  <Button size="sm" onClick={() => handleMarkDone(selectedProject.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                    Mark as Completed
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelectedProject(null)}>Close</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
