import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Search, Plus, X, CheckCircle2, Trash2, Calendar } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalTasks, createDigitalTask, updateDigitalTaskStatus, deleteDigitalTask, getDigitalProjects } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalTasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    project_id: '',
    priority: 'Medium',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, projData] = await Promise.all([
        getDigitalTasks(),
        getDigitalProjects()
      ]);
      setProjects(projData);

      setTasks(tasksData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    await createDigitalTask({
      title: newTask.title,
      project_id: newTask.project_id || (projects.length > 0 ? projects[0].id : undefined),
      priority: newTask.priority,
      due_date: newTask.due_date,
      status: 'To Do'
    });
    setShowAddModal(false);
    showToast(`Created task "${newTask.title}"`);
    setNewTask({ title: '', project_id: '', priority: 'Medium', due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] });
    await loadData();
  };

  const handleToggleStatus = async (task: any) => {
    const nextStatus = task.status === 'Done' ? 'To Do' : task.status === 'To Do' ? 'In Progress' : 'Done';
    await updateDigitalTaskStatus(task.id, nextStatus);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    showToast(`Task status updated to ${nextStatus}`);
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast('Task removed from sprint');
  };

  const filtered = tasks.filter(t => {
    return (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project?.title || '').toLowerCase().includes(search.toLowerCase());
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
            <CheckSquare className="w-5 h-5 text-[#6A1B2E]" /> Sprint Task Management Pipeline
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Engineering backlogs, task prioritization, due dates, and sprint execution.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Sprint Task
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task title or project..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Sprint Tasks</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading sprint tasks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <Card key={t.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${t.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {t.priority} Priority
                  </span>
                  <button onClick={() => handleToggleStatus(t)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer ${t.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {t.status}
                  </button>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{t.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{t.project?.title || 'General Engineering Sprint'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Date:</span>
                    <span className="font-bold text-slate-800">{t.due_date || 'Ongoing'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs font-bold" onClick={() => handleToggleStatus(t)}>
                  Toggle Status
                </Button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
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
                <h3 className="text-sm font-black text-slate-900">Create Sprint Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Task Title</label>
                  <input type="text" required value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Implement Webhook Handlers" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Associated Project</label>
                  {projects.length > 0 ? (
                    <select value={newTask.project_id} onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" disabled value="Default Sprint Project" className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                    <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
