import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Plus, Search, Calendar, CheckCircle2, AlertCircle,
  X, CheckSquare, Clock, ArrowRight, Award, DollarSign
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ToastNotification } from '../../../components/ToastNotification';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalMilestones,
  createDigitalMilestoneDirect,
  updateDigitalMilestoneDirect,
  getAssignedDigitalProjects,
  type DigitalMilestone
} from '../../../lib/api/digitalPm';

export const DigitalPMMilestones: React.FC = () => {
  const { user, profile } = useAuth();

  const [milestones, setMilestones] = useState<DigitalMilestone[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    project_id: '',
    description: '',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    completion_percentage: 0,
    payment_percentage: 25,
    deliverables_summary: ''
  });

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadMilestoneData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [mList, pList] = await Promise.all([
        getAssignedDigitalMilestones(),
        getAssignedDigitalProjects(pmIdentity)
      ]);
      setMilestones(mList || []);
      setProjects(pList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load milestones from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestoneData();

    const channel = supabase
      .channel('realtime_pm_milestones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_milestones' }, () => loadMilestoneData())
      .subscribe();

    const handleLocalChange = () => loadMilestoneData();
    window.addEventListener('ferex_digital_milestones_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_milestones_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleUpdateStatus = async (milestone: DigitalMilestone, newStatus: DigitalMilestone['status']) => {
    const nextPct = newStatus === 'Completed' || newStatus === 'Approved' ? 100 : newStatus === 'In Progress' ? 50 : 0;
    try {
      await updateDigitalMilestoneDirect(milestone.id, {
        status: newStatus,
        completion_percentage: nextPct
      });
      setMilestones(prev => prev.map(m => m.id === milestone.id ? { ...m, status: newStatus, completion_percentage: nextPct } : m));
      showToast(`Milestone status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title.trim()) return;

    try {
      const selectedProj = projects.find(p => p.id === newMilestone.project_id);
      const created = await createDigitalMilestoneDirect({
        title: newMilestone.title,
        project_id: selectedProj?.id,
        project_title: selectedProj?.title || 'General Milestone',
        description: newMilestone.description,
        due_date: newMilestone.due_date,
        completion_percentage: Number(newMilestone.completion_percentage) || 0,
        payment_percentage: Number(newMilestone.payment_percentage) || 0,
        deliverables_summary: newMilestone.deliverables_summary,
        status: 'Pending'
      });

      setMilestones(prev => [created, ...prev]);
      setShowAddModal(false);
      showToast(`Created milestone "${newMilestone.title}" successfully`);
      setNewMilestone({
        title: '',
        project_id: '',
        description: '',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        completion_percentage: 0,
        payment_percentage: 25,
        deliverables_summary: ''
      });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const filteredMilestones = milestones.filter(m => {
    const matchesSearch =
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.project_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Project Milestones & Deliverables Roadmap
            </h1>
            <Badge variant="brand">{filteredMilestones.length} Milestones</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Track key client deliverables, payment milestones, and sign-offs across active projects.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Milestone
        </Button>
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
            placeholder="Search milestones, projects..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Pending', 'In Progress', 'In Review', 'Completed', 'Approved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Milestones Grid */}
      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMilestones.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 text-xs">
          No milestones defined matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMilestones.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[170px]">
                    {m.project_title || 'Project Milestone'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    m.status === 'Completed' || m.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : m.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {m.description || m.deliverables_summary || 'Deliverables and review sign-off milestone.'}
                </p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Completion</span>
                    <span>{m.completion_percentage || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${m.completion_percentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Due: {m.due_date}
                </span>

                <select
                  value={m.status}
                  onChange={(e) => handleUpdateStatus(m, e.target.value as any)}
                  className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Milestone Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Define Project Milestone</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Milestone Title *</label>
                  <input
                    type="text"
                    required
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    placeholder="e.g. Milestone 2: Responsive Frontend & Component Library"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project</label>
                    <select
                      value={newMilestone.project_id}
                      onChange={(e) => setNewMilestone({ ...newMilestone, project_id: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">General Project Milestone</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Due Date</label>
                    <input
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment % Trigger</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newMilestone.payment_percentage}
                      onChange={(e) => setNewMilestone({ ...newMilestone, payment_percentage: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deliverables Summary</label>
                    <input
                      type="text"
                      value={newMilestone.deliverables_summary}
                      onChange={(e) => setNewMilestone({ ...newMilestone, deliverables_summary: e.target.value })}
                      placeholder="e.g. 12 UI screens, Figma specs"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Milestone Description</label>
                  <textarea
                    rows={3}
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    placeholder="Milestone success criteria and review guidelines..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create Milestone</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
