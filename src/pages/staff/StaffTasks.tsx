import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, CheckCircle2, Clock, LayoutGrid, List, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../contexts/AuthContext';
import type { Task } from '../../lib/types';

export const StaffTasks: React.FC = () => {
  const { user } = useAuth();
  const { tasks, loading, addTask, changeStatus } = useTasks();
  const [toast, setToast] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterPriority, setFilterPriority] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('Medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleStatusChange = async (id: string, newStatus: Task['status']) => {
    try {
      await changeStatus(id, newStatus);
      showToast(`Task updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Error updating task: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    try {
      setIsSubmitting(true);
      await addTask({
        created_by: user.id,
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        due_date: newDueDate || undefined,
      });
      showToast(`Task "${newTitle}" created!`);
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
    } catch (err: any) {
      showToast(`Error adding task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => filterPriority === 'All' || t.priority === filterPriority);

  return (
    <div className="space-y-6 text-left antialiased select-none min-h-[550px]">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#6A1B2E]" /> Task Management Board
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Manage assigned student tasks, document audits, and visa milestones.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
              <button key={p} onClick={() => setFilterPriority(p)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filterPriority === p ? 'bg-[#6A1B2E] text-white' : 'text-slate-600 hover:text-slate-900'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center space-y-3 border border-slate-200/80 bg-slate-50/50">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Tasks Found</h3>
            <p className="text-xs font-semibold text-slate-500">Your task board is completely clear.</p>
          </div>
          <Button size="sm" className="bg-[#6A1B2E] text-white text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Your First Task
          </Button>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredTasks.map(task => {
            const isCompleted = task.status === 'Completed';

            return (
              <Card key={task.id} className="p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{task.id.slice(0, 8)}</span>
                    <h3 className="text-base font-black text-slate-900">{task.title}</h3>
                    {task.description && <p className="text-xs font-semibold text-slate-500 mt-0.5">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.due_date && (
                      <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Due: {task.due_date}
                      </span>
                    )}
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {task.status || 'To Do'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-4">
                    <span>Priority: <span className="font-extrabold text-slate-900">{task.priority}</span></span>
                    {task.due_date && <span>Target: <span className="font-bold text-slate-900">{task.due_date}</span></span>}
                  </div>
                  <div className="flex gap-2">
                    {!isCompleted && task.status !== 'In Progress' && (
                      <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => handleStatusChange(task.id, 'In Progress')}>
                        Start Task
                      </Button>
                    )}
                    {!isCompleted && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" onClick={() => handleStatusChange(task.id, 'Completed')}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['To Do', 'In Progress', 'Completed'] as const).map(colStatus => (
            <div key={colStatus} className="space-y-3">
              <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between text-xs font-black text-slate-900 border border-slate-200">
                <span>{colStatus}</span>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                  {filteredTasks.filter(t => t.status === colStatus || (colStatus === 'To Do' && (t.status as string) === 'Pending')).length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredTasks.filter(t => t.status === colStatus || (colStatus === 'To Do' && (t.status as string) === 'Pending')).map(task => (
                  <Card key={task.id} className="p-4 border border-slate-200/80 shadow-xs space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{task.id.slice(0, 8)}</span>
                    <h4 className="text-xs font-black text-slate-900">{task.title}</h4>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Priority: {task.priority}</span>
                      <span>{task.due_date || 'No due date'}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Create New Advisory Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Task Title</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Audit student financial affidavit" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#6A1B2E]" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Due Date</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Description / Notes</label>
                  <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Task details..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} size="sm" className="bg-[#6A1B2E] text-white font-black">{isSubmitting ? 'Creating...' : 'Create Task'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
