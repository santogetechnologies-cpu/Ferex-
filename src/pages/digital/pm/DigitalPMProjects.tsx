import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Search, ChevronRight, X, Layers, Target,
  Calendar, CheckCircle2, AlertCircle, FileText, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { supabase } from '../../../lib/supabase';
import { advanceDigitalProjectStage } from '../../../lib/api/digital';
import {
  getAssignedDigitalProjects,
  getAssignedDigitalMilestones,
  getAssignedDigitalDeliverables,
  createDigitalDeliverableDirect
} from '../../../lib/api/digitalPm';

const STAGES = ['Briefing', 'In Progress', 'Review', 'Revisions', 'Delivered', 'Closed'];

export const DigitalPMProjects: React.FC = () => {
  const { user, profile } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<any[]>([]);
  const [projectDeliverables, setProjectDeliverables] = useState<any[]>([]);

  // Add deliverable modal inside drawer
  const [showAddDeliv, setShowAddDeliv] = useState(false);
  const [newDeliv, setNewDeliv] = useState({ title: '', file_url: '', version: 'v1.0' });

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadProjects = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('digital_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter for PM assigned projects
      const myEmail = (profile?.email || user?.email || '').toLowerCase().trim();
      const myName = (profile?.full_name || '').toLowerCase().trim();
      const myId = user?.id;

      const filtered = (data || []).filter((p: any) => {
        if (!myEmail && !myName && !myId) return true;
        const pEmail = (p.assigned_staff_email || '').toLowerCase().trim();
        const pName = (p.assigned_staff_name || '').toLowerCase().trim();
        const pId = p.assigned_staff_id;

        return (
          (myId && pId === myId) ||
          (myEmail && pEmail.includes(myEmail)) ||
          (myName && pName.includes(myName))
        );
      });

      setProjects(filtered);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load projects from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    const channel = supabase
      .channel('realtime_pm_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadProjects())
      .subscribe();

    const handleLocalChange = () => loadProjects();
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const openProjectDrawer = async (p: any) => {
    setSelectedProject(p);
    try {
      const [mList, dList] = await Promise.all([
        getAssignedDigitalMilestones([p.id]),
        getAssignedDigitalDeliverables([p.id])
      ]);
      setProjectMilestones(mList || []);
      setProjectDeliverables(dList || []);
    } catch {}
  };

  const handleAdvanceStage = async (newStage: string) => {
    if (!selectedProject) return;
    try {
      const updated = await advanceDigitalProjectStage(
        selectedProject.id,
        newStage,
        profile?.full_name || 'Project Manager'
      );
      if (updated) {
        setSelectedProject(updated);
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newDeliv.title.trim()) return;

    try {
      const created = await createDigitalDeliverableDirect({
        project_id: selectedProject.id,
        title: newDeliv.title,
        file_url: newDeliv.file_url,
        version: newDeliv.version
      });

      setProjectDeliverables(prev => [created, ...prev]);
      setShowAddDeliv(false);
      setNewDeliv({ title: '', file_url: '', version: 'v1.0' });
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.service_category || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              My Assigned Projects
            </h1>
            <Badge variant="brand">{filteredProjects.length} Active</Badge>
          </div>
          <p className="text-xs text-slate-500">
            End-to-end milestone tracking, deliverable sign-offs, and 6-stage lifecycle management.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, clients..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Stage:</span>
          {['All', ...STAGES].map((stage) => (
            <button
              key={stage}
              onClick={() => setStatusFilter(stage)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === stage
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 text-xs">
          No projects matching your assigned filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => openProjectDrawer(p)}
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    [{p.client_type || 'Internal'}] {p.client_name || 'Client'}
                  </span>
                  <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/8 px-2 py-0.5 rounded-full border border-[#58051E]/20">
                    {p.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#58051E] transition-colors line-clamp-1 mb-1.5">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {p.scope || p.service_category || 'Digital Campaign Deliverable'}
                </p>
              </div>

              <div>
                {/* Progress bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Progress</span>
                    <span>{p.progress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#58051E] rounded-full transition-all"
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: {p.deadline || 'Ongoing'}
                  </span>
                  <span className="font-bold text-slate-700">
                    ₹{Number(p.budget || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Details Drawer */}
      <AnimatePresence>
        {selectedProject && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setSelectedProject(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto p-6 text-left flex flex-col justify-between"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      [{selectedProject.client_type || 'Internal'}] {selectedProject.client_name}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      {selectedProject.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Lifecycle Stage Advancer */}
                <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Project Stage Progression (Click to Advance)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {STAGES.map((st, i) => {
                      const isCurrent = selectedProject.status === st;
                      const currentIndex = STAGES.indexOf(selectedProject.status);
                      const isPassed = currentIndex > i;

                      return (
                        <button
                          key={st}
                          onClick={() => handleAdvanceStage(st)}
                          className={`p-2 rounded-lg text-[10.5px] font-bold text-center transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#58051E] text-white shadow-xs'
                              : isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scope & Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">Scope & Specifications</h4>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {selectedProject.scope || 'No detailed specifications provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Service Category</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        {selectedProject.service_category || 'General'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Budget</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        ₹{Number(selectedProject.budget || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Target Deadline</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        {selectedProject.deadline || 'TBD'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Assigned Staff</span>
                      <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
                        {selectedProject.assigned_staff_name || 'PM'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deliverables Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-900">Project Deliverables & Assets</h4>
                    <button
                      onClick={() => setShowAddDeliv(true)}
                      className="text-[11px] font-bold text-[#58051E] hover:underline cursor-pointer"
                    >
                      + Add Asset
                    </button>
                  </div>

                  {projectDeliverables.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
                      No deliverables uploaded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {projectDeliverables.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#58051E]" />
                            <span className="font-semibold text-slate-800">{d.title}</span>
                            <span className="text-[10px] text-slate-400">({d.version})</span>
                          </div>
                          {d.file_url && (
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#58051E] font-bold text-[11px] hover:underline flex items-center gap-1"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Project Milestones</h4>
                  {projectMilestones.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
                      No milestones defined for this project.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {projectMilestones.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{m.title}</p>
                            <p className="text-[10px] text-slate-400">Due: {m.due_date} • {m.completion_percentage}% done</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedProject(null)} className="w-full">
                  Close Details
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Deliverable Modal */}
      <AnimatePresence>
        {showAddDeliv && selectedProject && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddDeliv(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Add Project Deliverable / URL</h3>
                <button onClick={() => setShowAddDeliv(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDeliverable} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset Title *</label>
                  <input
                    type="text"
                    required
                    value={newDeliv.title}
                    onChange={(e) => setNewDeliv({ ...newDeliv, title: e.target.value })}
                    placeholder="e.g. Figma Design Specs v2"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset URL *</label>
                  <input
                    type="url"
                    required
                    value={newDeliv.file_url}
                    onChange={(e) => setNewDeliv({ ...newDeliv, file_url: e.target.value })}
                    placeholder="https://figma.com/... or https://drive.google.com/..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Version</label>
                  <input
                    type="text"
                    value={newDeliv.version}
                    onChange={(e) => setNewDeliv({ ...newDeliv, version: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddDeliv(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Save Asset</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
