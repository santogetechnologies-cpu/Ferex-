import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Search, CheckCircle2, Trash2, X
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

interface ExecutiveTask {
  id: string;
  division: 'Education' | 'Trade' | 'Rimi' | 'Digital';
  divisionBadge: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Normal';
  priorityBadge: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export const CentralTasks: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [tasks, setTasks] = useState<ExecutiveTask[]>([
    {
      id: 'TSK-901',
      division: 'Trade',
      divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      title: 'Approve Hamburg Port Letter of Credit Release (€120,000)',
      description: 'Review bill of lading BL-DE-882 and issue bank wire confirmation.',
      assignee: 'Executive Super Admin',
      priority: 'High',
      priorityBadge: 'bg-red-50 text-red-700 border-red-200',
      dueDate: 'Today, 5:00 PM',
      status: 'Pending',
    },
    {
      id: 'TSK-902',
      division: 'Education',
      divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      title: 'Verify Warsaw University Tuition Wire Receipt Batch #12',
      description: 'Audit 12 student wire receipts against university bank records.',
      assignee: 'Rahul Mehta (Admissions Admin)',
      priority: 'High',
      priorityBadge: 'bg-red-50 text-red-700 border-red-200',
      dueDate: 'Tomorrow',
      status: 'In Progress',
    },
    {
      id: 'TSK-903',
      division: 'Rimi',
      divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      title: 'Cold-Chain Warehouse Hub-4 Inspection Audit',
      description: 'Verify temperature compliance and batch lifecycle sensor telemetry.',
      assignee: 'Suresh Kumar (Rimi Admin)',
      priority: 'Medium',
      priorityBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      dueDate: 'In 2 days',
      status: 'Pending',
    },
    {
      id: 'TSK-904',
      division: 'Digital',
      divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Client Sign-off & Milestone 3 Invoicing for Nexus FinTech',
      description: 'Finalize sprint deliverable review and trigger automated webhook settlement.',
      assignee: 'Priya Nair (Digital Admin)',
      priority: 'Normal',
      priorityBadge: 'bg-slate-100 text-slate-700 border-slate-200',
      dueDate: 'In 3 days',
      status: 'In Progress',
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    division: 'Education' as 'Education' | 'Trade' | 'Rimi' | 'Digital',
    assignee: 'Division Admin',
    priority: 'High' as 'High' | 'Medium' | 'Normal',
    dueDate: '2026-09-10',
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleToggleStatus = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
    showToastMsg('Task status updated');
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    showToastMsg('Task removed from executive registry');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const divBadges: Record<string, string> = {
      Education: 'bg-rose-50 text-rose-700 border-rose-200',
      Trade: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      Rimi: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      Digital: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };

    const prioBadges: Record<string, string> = {
      High: 'bg-red-50 text-red-700 border-red-200',
      Medium: 'bg-amber-50 text-amber-700 border-amber-200',
      Normal: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    const item: ExecutiveTask = {
      id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      division: newTask.division,
      divisionBadge: divBadges[newTask.division] || 'bg-slate-100 text-slate-700 border-slate-200',
      title: newTask.title.trim(),
      description: newTask.description.trim() || 'Cross-divisional executive operational requirement.',
      assignee: newTask.assignee,
      priority: newTask.priority,
      priorityBadge: prioBadges[newTask.priority],
      dueDate: newTask.dueDate,
      status: 'Pending',
    };

    setTasks([item, ...tasks]);
    setShowAddModal(false);
    setNewTask({
      title: '',
      description: '',
      division: 'Education',
      assignee: 'Division Admin',
      priority: 'High',
      dueDate: '2026-09-10',
    });
    showToastMsg('New Executive Operation Task Created');
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivision === 'All' || t.division === selectedDivision;
    const matchPrio = selectedPriority === 'All' || t.priority === selectedPriority;
    return matchSearch && matchDiv && matchPrio;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-[#6A1B2E]" /> Cross-Divisional Operations & Task Center
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              Live Governance
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Centrally delegate, track, and enforce high-priority operational workflows across all 4 enterprise subsidiary platforms.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Executive Task
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Division Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
              {['All', 'Education', 'Trade', 'Rimi', 'Digital'].map(div => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedDivision === div
                      ? 'bg-[#6A1B2E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {div === 'All' ? 'All Divisions' : div}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
              {['All', 'High', 'Medium', 'Normal'].map(prio => (
                <button
                  key={prio}
                  onClick={() => setSelectedPriority(prio)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedPriority === prio
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, assignees..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#6A1B2E]"
            />
          </div>
        </div>
      </Card>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map(t => (
          <Card
            key={t.id}
            className={`p-5 border transition-all flex flex-col justify-between ${
              t.status === 'Completed'
                ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
                : 'bg-white border-slate-200/80 hover:shadow-md'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${t.divisionBadge}`}>
                    {t.division}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold border ${t.priorityBadge}`}>
                    {t.priority} Priority
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{t.dueDate}</span>
              </div>

              <h3 className={`text-sm font-black text-slate-900 leading-snug ${t.status === 'Completed' ? 'line-through text-slate-500' : ''}`}>
                {t.title}
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">{t.description}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-500">
                Assigned to: <strong className="text-slate-800">{t.assignee}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    t.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-[#6A1B2E] text-white hover:bg-[#521221] shadow-xs'
                  }`}
                >
                  {t.status === 'Completed' ? 'Completed ✓' : 'Mark Done'}
                </button>
                <button
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal to Create Executive Task */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Create Executive Operation Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit Trade Bill of Lading..."
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Operational requirements and deadlines..."
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Division</label>
                    <select
                      value={newTask.division}
                      onChange={e => setNewTask({ ...newTask, division: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="Education">Ferex Education</option>
                      <option value="Trade">Global Trade</option>
                      <option value="Rimi">Rimi Frozen</option>
                      <option value="Digital">Ferex Digital</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">
                    Create Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
