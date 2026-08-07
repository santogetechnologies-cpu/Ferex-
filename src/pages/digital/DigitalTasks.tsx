import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Search, Plus, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Todo' | 'In Progress' | 'Done';

const initialTasks = [
  { id: 'TSK-001', title: 'Design Reliance Digital Homepage Wireframes', project: 'Reliance Digital E-Commerce', assignee: 'Sneha Roy', priority: 'High' as Priority, status: 'In Progress' as Status, due: '2026-08-10' },
  { id: 'TSK-002', title: 'Develop Mahindra Fintech API Integration Docs', project: 'Mahindra Fintech Mobile App', assignee: 'Vivek Sharma', priority: 'Medium' as Priority, status: 'Todo' as Status, due: '2026-08-15' },
  { id: 'TSK-003', title: 'Write BigBasket SEO Content Batch #3', project: 'BigBasket SEO + Content', assignee: 'Riya Thomas', priority: 'Medium' as Priority, status: 'In Progress' as Status, due: '2026-08-12' },
  { id: 'TSK-004', title: 'Deploy Tata Motors UI to Staging', project: 'Tata Motors UI Redesign', assignee: 'Arun Patel', priority: 'High' as Priority, status: 'Todo' as Status, due: '2026-08-18' },
  { id: 'TSK-005', title: 'HDFC Life Final Brand Handoff Package', project: 'HDFC Life Brand Identity', assignee: 'Sneha Roy', priority: 'Low' as Priority, status: 'Done' as Status, due: '2026-07-31' },
];

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const STATUSES: Status[] = ['Todo', 'In Progress', 'Done'];

const priorityClr: Record<Priority, string> = {
  'High': 'bg-red-50 text-red-700 border-red-200',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
  'Low': 'bg-slate-100 text-slate-600 border-slate-200',
};
const statusClr: Record<Status, string> = {
  'Todo': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const DigitalTasks: React.FC = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | Status>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newTask, setNewTask] = useState({ title: '', project: '', assignee: '', priority: 'Medium' as Priority, due: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setTasks([{ id: `TSK-${Math.floor(Math.random() * 900 + 100)}`, status: 'Todo' as Status, ...newTask }, ...tasks]);
    setShowAddModal(false);
    showToast('Task created!');
    setNewTask({ title: '', project: '', assignee: '', priority: 'Medium', due: '' });
  };

  const advance = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const idx = STATUSES.indexOf(t.status);
      return { ...t, status: STATUSES[Math.min(idx + 1, STATUSES.length - 1)] };
    }));
    showToast('Task status updated!');
  };

  const remove = (id: string) => { setTasks(tasks.filter(t => t.id !== id)); showToast('Task removed'); };

  const filtered = tasks.filter(t => {
    const matchS = t.title.toLowerCase().includes(search.toLowerCase()) || t.project.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || t.status === filterStatus;
    return matchS && matchF;
  });

  const grouped: Record<Status, typeof tasks> = {
    'Todo': filtered.filter(t => t.status === 'Todo'),
    'In Progress': filtered.filter(t => t.status === 'In Progress'),
    'Done': filtered.filter(t => t.status === 'Done'),
  };

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-[#6A1B2E]" /> Agency Task Board</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Assign, track, and advance tasks across all projects and team members.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Task
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks or projects..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex gap-1.5">
          {(['All', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === s ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s}</button>
          ))}
        </div>
      </Card>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATUSES.map(col => (
          <div key={col} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[col]}`}>{col}</span>
              <span className="text-[10.5px] font-extrabold text-slate-400">{grouped[col].length} tasks</span>
            </div>
            <div className="space-y-2.5">
              {grouped[col].map(t => (
                <Card key={t.id} className="p-4 border border-slate-200/70 shadow-xs hover:shadow-md transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-extrabold text-slate-900 leading-snug">{t.title}</p>
                    <button onClick={() => remove(t.id)} className="p-1 text-slate-300 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-[10.5px] font-semibold text-slate-500">{t.project}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${priorityClr[t.priority]}`}>{t.priority}</span>
                    <span className="text-[10px] font-bold text-slate-400">{t.assignee}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-semibold text-slate-400">Due: {t.due}</span>
                    {col !== 'Done' && (
                      <button onClick={() => advance(t.id)} className="text-[10px] font-extrabold text-[#6A1B2E] hover:underline">
                        → {col === 'Todo' ? 'Start' : 'Mark Done'}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create New Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Task Title</label>
                  <input type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project</label>
                  <input type="text" required value={newTask.project} onChange={e => setNewTask({...newTask, project: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assignee</label>
                    <input type="text" required value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select></div>
                </div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                  <input type="date" required value={newTask.due} onChange={e => setNewTask({...newTask, due: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Create Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
