import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, CheckCircle2, MessageSquare, Clock, LayoutGrid, List } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const tasksData = [
  { id: 'TSK-101', title: 'Verify Passport & Academic Scans for Priya Sharma', priority: 'High', dueDate: '2026-08-07', countdown: 'Due Tomorrow', status: 'In Progress', assignedBy: 'Ananya Sharma (Central Director)', progress: 75, comments: 4 },
  { id: 'TSK-102', title: 'Upload Manchester University Conditional Offer Letter', priority: 'Medium', dueDate: '2026-08-08', countdown: 'Due in 2 days', status: 'Pending', assignedBy: 'Admin Team', progress: 40, comments: 2 },
  { id: 'TSK-103', title: 'Review IELTS Test Report Form & Authenticate ID', priority: 'Low', dueDate: '2026-08-10', countdown: 'Completed', status: 'Completed', assignedBy: 'Admin Team', progress: 100, comments: 1 },
  { id: 'TSK-104', title: 'Schedule Canada Visa Biometric Appointment', priority: 'High', dueDate: '2026-08-09', countdown: 'Due in 3 days', status: 'In Progress', assignedBy: 'Ananya Sharma (Central Director)', progress: 60, comments: 3 },
];

export const StaffTasks: React.FC = () => {
  const [toast, setToast] = useState('');
  const [tasks, setTasks] = useState(tasksData);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterPriority, setFilterPriority] = useState('All');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleStatusChange = (id: string, newStatus: string, newProgress: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, progress: newProgress } : t));
    showToast(`Task ${id} updated to ${newStatus} (${newProgress}%)`);
  };

  const filteredTasks = tasks.filter(t => filterPriority === 'All' || t.priority === filterPriority);

  return (
    <div className="space-y-6 text-left antialiased select-none">
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
            <CheckSquare className="w-5 h-5 text-[#6A1B2E]" /> Linear Task Management Board
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Manage assigned student tasks, document verifications, and visa submission deadlines.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500'}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['All', 'High', 'Medium', 'Low'].map(p => (
              <button key={p} onClick={() => setFilterPriority(p)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filterPriority === p ? 'bg-[#6A1B2E] text-white' : 'text-slate-600 hover:text-slate-900'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <Card key={task.id} className="p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{task.id} • Assigned by {task.assignedBy}</span>
                  <h3 className="text-base font-black text-slate-900">{task.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> {task.countdown}
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{task.status}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Task Completion Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-[#6A1B2E]" style={{ width: `${task.progress}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-4">
                  <span>Priority: <span className="font-extrabold text-slate-900">{task.priority}</span></span>
                  <span>Due Date: <span className="font-bold text-slate-900">{task.dueDate}</span></span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-slate-400" />{task.comments} Comments</span>
                </div>
                <div className="flex gap-2">
                  {task.status !== 'Completed' && (
                    <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => handleStatusChange(task.id, 'In Progress', 85)}>
                      Update Progress
                    </Button>
                  )}
                  {task.status !== 'Completed' && (
                    <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => handleStatusChange(task.id, 'Completed', 100)}>
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Pending', 'In Progress', 'Completed'].map(colStatus => (
            <div key={colStatus} className="space-y-3">
              <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between text-xs font-black text-slate-900 border border-slate-200">
                <span>{colStatus}</span>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                  {filteredTasks.filter(t => t.status === colStatus).length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredTasks.filter(t => t.status === colStatus).map(task => (
                  <Card key={task.id} className="p-4 border border-slate-200/80 shadow-xs space-y-3 text-left">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{task.id}</span>
                    <h4 className="text-xs font-black text-slate-900">{task.title}</h4>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>Priority: {task.priority}</span>
                      <span>{task.progress}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
