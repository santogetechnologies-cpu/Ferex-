import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Search, Clock, CheckCircle2, User, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTasks, createTask, updateTaskStatus } from '../../lib/api/tasks';

export const CentralTasks: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await getTasks();
    const formatted = data.map((d: any) => ({
      id: d.id ? `TSK-${d.id.slice(0, 4).toUpperCase()}` : 'TSK-101',
      rawId: d.id,
      title: d.title,
      student: d.student_name || 'Ashly',
      assignee: d.assigned_to || 'Super Admin',
      priority: d.priority || 'Medium',
      dueDate: d.due_date || '2026-08-15',
      status: d.status || 'Pending',
    }));
    setTasks(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const [newTask, setNewTask] = useState({
    title: '',
    student: 'Ashly',
    assignee: 'Super Admin',
    priority: 'High',
    dueDate: '2026-08-14'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    await createTask({
      title: newTask.title,
      assigned_to: newTask.assignee,
      student_name: newTask.student,
      priority: newTask.priority as any,
      due_date: newTask.dueDate,
    });
    setShowAddModal(false);
    showToastMsg('New central task dispatched!');
    setNewTask({ title: '', student: 'Ashly', assignee: 'Super Admin', priority: 'High', dueDate: '2026-08-14' });
    await loadData();
  };

  const toggleTaskStatus = async (id: string) => {
    const target = tasks.find(t => t.id === id || t.rawId === id);
    if (!target) return;
    const nextStatus = target.status === 'Completed' ? 'In Progress' : 'Completed';
    if (target.rawId) {
      await updateTaskStatus(target.rawId, nextStatus);
    }
    showToastMsg('Task status updated');
    await loadData();
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#6A1B2E]" /> Central Task Operations
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • System-wide tasks, urgent deadlines, and staff action items.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Dispatch New Task
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading central tasks...</div>
      ) : null}

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search task title or assignee..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('kanban')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              Kanban
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              List
            </button>
          </div>

          <div className="flex items-center gap-1">
            {['All', 'Urgent', 'High', 'Medium'].map((p) => (
              <button key={p} onClick={() => setFilterPriority(p)} className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${filterPriority === p ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Pending', 'In Progress', 'Completed'].map((statusCol) => {
            const colTasks = filteredTasks.filter(t => t.status === statusCol);
            return (
              <div key={statusCol} className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-100/80 rounded-xl border border-slate-200/80">
                  <h3 className="text-xs font-black text-slate-900">{statusCol}</h3>
                  <span className="text-[10px] font-black text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">{colTasks.length}</span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {colTasks.map((task) => (
                    <Card key={task.id} className="p-4 border border-slate-200/70 shadow-xs hover:border-slate-300 transition-all space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase">{task.id} · {task.student}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          task.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200' : task.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{task.title}</h4>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {task.assignee}</span>
                        <button onClick={() => toggleTaskStatus(task.id)} className="text-[#6A1B2E] hover:underline">
                          Move
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleTaskStatus(task.id)} className="mt-0.5 text-slate-400 hover:text-[#6A1B2E] transition-colors">
                  {task.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <div className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-[#6A1B2E]" />}
                </button>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">{task.id} · {task.student}</span>
                  <h4 className={`text-xs font-black ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</h4>
                  <div className="flex items-center gap-3 text-[10.5px] font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {task.assignee}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> Due: {task.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  task.priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : task.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {task.priority} Priority
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Dispatch Central Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Task Title</label>
                  <input type="text" required value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Verify Embassy Submission" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assignee</label>
                    <select value={newTask.assignee} onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Super Admin">Super Admin</option>
                      <option value="Rahul Mehta">Rahul Mehta</option>
                      <option value="Anita Roy">Anita Roy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority Level</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
