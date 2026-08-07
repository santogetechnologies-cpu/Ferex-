import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, CheckCircle2, Edit3, Trash2, LayoutGrid, List,
  Clock, Paperclip, MessageSquare, AlertCircle, CheckSquare
} from 'lucide-react';

type Priority = 'High' | 'Medium' | 'Low';
type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
  category: string;
  studentName: string;
  university: string;
  progress: number;
  subtasksCompleted: number;
  subtasksTotal: number;
  attachmentsCount: number;
  commentsCount: number;
  isDueToday?: boolean;
  isOverdue?: boolean;
}

const STAFF = ['Riya Shah', 'Arjun Pillai', 'Education Team', 'Meena Iyer', 'Kabir Nair'];

const INITIAL_TASKS: Task[] = [
  {
    id: 'TK-001',
    title: 'Review Ashly passport & identity documents',
    description: 'Verify passport validity, apostille attestation, and upload verification seal.',
    assignee: 'Riya Shah',
    priority: 'High',
    status: 'In Progress',
    due: 'Today',
    category: 'Documents',
    studentName: 'Ashly',
    university: 'University of Warsaw',
    progress: 75,
    subtasksCompleted: 3,
    subtasksTotal: 4,
    attachmentsCount: 3,
    commentsCount: 5,
    isDueToday: true,
  },
  {
    id: 'TK-002',
    title: 'Follow up TU Berlin admission status',
    description: 'Check status of Rahul Mehta application with TU Berlin international office.',
    assignee: 'Arjun Pillai',
    priority: 'High',
    status: 'To Do',
    due: 'Aug 8, 2026',
    category: 'Applications',
    studentName: 'Rahul Mehta',
    university: 'TU Berlin',
    progress: 25,
    subtasksCompleted: 1,
    subtasksTotal: 4,
    attachmentsCount: 2,
    commentsCount: 2,
  },
  {
    id: 'TK-003',
    title: 'Visa guidance session for Priya Sharma',
    description: 'Conduct a 30-minute embassy interview preparation call.',
    assignee: 'Education Team',
    priority: 'Medium',
    status: 'Done',
    due: 'Aug 5, 2026',
    category: 'Visa',
    studentName: 'Priya Sharma',
    university: 'University of Amsterdam',
    progress: 100,
    subtasksCompleted: 3,
    subtasksTotal: 3,
    attachmentsCount: 1,
    commentsCount: 4,
  },
  {
    id: 'TK-004',
    title: 'Prepare offer letter bundle for Ashly',
    description: 'Collate offer letter, tuition breakdown, and acceptance form for student review.',
    assignee: 'Meena Iyer',
    priority: 'Medium',
    status: 'Review',
    due: 'Aug 9, 2026',
    category: 'Documents',
    studentName: 'Ashly',
    university: 'University of Warsaw',
    progress: 50,
    subtasksCompleted: 2,
    subtasksTotal: 4,
    attachmentsCount: 4,
    commentsCount: 3,
  },
  {
    id: 'TK-005',
    title: 'IELTS certificate verification for Priya',
    description: 'Cross-verify IELTS score TRF code with British Council database.',
    assignee: 'Kabir Nair',
    priority: 'Low',
    status: 'To Do',
    due: 'Aug 12, 2026',
    category: 'Documents',
    studentName: 'Priya Sharma',
    university: 'University of Amsterdam',
    progress: 0,
    subtasksCompleted: 0,
    subtasksTotal: 2,
    attachmentsCount: 1,
    commentsCount: 1,
  },
  {
    id: 'TK-006',
    title: 'Pre-departure orientation guide for Rahul',
    description: 'Dispatch housing list, student insurance options, and airport pickup contact details.',
    assignee: 'Education Team',
    priority: 'High',
    status: 'In Progress',
    due: 'Today',
    category: 'Communication',
    studentName: 'Rahul Mehta',
    university: 'TU Berlin',
    progress: 60,
    subtasksCompleted: 3,
    subtasksTotal: 5,
    attachmentsCount: 2,
    commentsCount: 6,
    isDueToday: true,
  },
  {
    id: 'TK-007',
    title: 'Process application fee invoice for Ashly',
    description: 'Generate receipt and update fee tracking ledger.',
    assignee: 'Arjun Pillai',
    priority: 'Low',
    status: 'Done',
    due: 'Aug 3, 2026',
    category: 'Finance',
    studentName: 'Ashly',
    university: 'University of Warsaw',
    progress: 100,
    subtasksCompleted: 2,
    subtasksTotal: 2,
    attachmentsCount: 1,
    commentsCount: 2,
  },
  {
    id: 'TK-008',
    title: 'Collect dormitory housing preferences',
    description: 'Gather student room type preference and meal plan choices.',
    assignee: 'Riya Shah',
    priority: 'Medium',
    status: 'To Do',
    due: 'Aug 14, 2026',
    category: 'Administration',
    studentName: 'Rahul Mehta',
    university: 'TU Berlin',
    progress: 15,
    subtasksCompleted: 1,
    subtasksTotal: 6,
    attachmentsCount: 0,
    commentsCount: 1,
  },
];

const PRIORITY_BADGES: Record<Priority, { label: string; style: string }> = {
  High: { label: 'High', style: 'bg-red-50 text-red-700 border-red-200/80' },
  Medium: { label: 'Medium', style: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  Low: { label: 'Low', style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
};

const COLUMN_CONFIG: Record<TaskStatus, { color: string; dot: string }> = {
  'To Do': { color: 'border-slate-200/80 bg-slate-50/50', dot: 'bg-slate-400' },
  'In Progress': { color: 'border-blue-200/80 bg-blue-50/30', dot: 'bg-blue-500' },
  'Review': { color: 'border-violet-200/80 bg-violet-50/30', dot: 'bg-violet-500' },
  'Done': { color: 'border-emerald-200/80 bg-emerald-50/30', dot: 'bg-emerald-500' },
};

const COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];

export const AdminTaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: STAFF[0],
    priority: 'Medium' as Priority,
    due: '',
    category: 'Documents',
    studentName: 'Ashly',
    university: 'University of Warsaw',
  });

  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedProgress = newStatus === 'Done' ? 100 : t.progress === 100 ? 50 : t.progress;
        return { ...t, status: newStatus, progress: updatedProgress };
      }
      return t;
    }));
    showToast(`Task ${taskId} moved to ${newStatus}`);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    const created: Task = {
      id: `TK-${(tasks.length + 1).toString().padStart(3, '0')}`,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      assignee: newTask.assignee,
      priority: newTask.priority,
      status: 'To Do',
      due: newTask.due || 'Aug 15, 2026',
      category: newTask.category,
      studentName: newTask.studentName,
      university: newTask.university,
      progress: 0,
      subtasksCompleted: 0,
      subtasksTotal: 3,
      attachmentsCount: 0,
      commentsCount: 0,
    };

    setTasks([created, ...tasks]);
    setShowCreate(false);
    setNewTask({
      title: '',
      description: '',
      assignee: STAFF[0],
      priority: 'Medium',
      due: '',
      category: 'Documents',
      studentName: 'Ashly',
      university: 'University of Warsaw',
    });
    showToast(`Task ${created.id} created successfully`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask || !editTask.title.trim()) return;

    setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t));
    showToast(`Task ${editTask.id} updated`);
    setEditTask(null);
  };

  const handleDeleteTask = () => {
    if (!deleteId) return;
    setTasks(prev => prev.filter(t => t.id !== deleteId));
    showToast(`Task ${deleteId} deleted`);
    setDeleteId(null);
  };

  // Filter tasks based on active pill + search query
  const filtered = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.studentName.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'My Tasks') return t.assignee === 'Riya Shah';
    if (activeFilter === 'High Priority') return t.priority === 'High';
    if (activeFilter === 'Due Today') return t.due === 'Today' || t.isDueToday;
    if (activeFilter === 'Completed') return t.status === 'Done';

    return true;
  });

  const totalTasks = tasks.length;
  const dueTodayCount = tasks.filter(t => t.due === 'Today' || t.isDueToday).length;
  const overdueCount = tasks.filter(t => t.isOverdue).length;
  const completedCount = tasks.filter(t => t.status === 'Done').length;

  // Clean Task Card Component (Overflow Proof & Perfectly Aligned)
  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 group relative flex flex-col justify-between space-y-2.5 overflow-hidden"
    >
      <div className="space-y-2">
        {/* Top: Avatar + Student Name + University + Priority Badge */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100/80 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
              {task.assignee ? task.assignee[0] : task.studentName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate leading-none">
                {task.studentName}
              </p>
              <p className="text-[9.5px] font-semibold text-slate-400 truncate mt-0.5">{task.university}</p>
            </div>
          </div>
          
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider shrink-0 ${PRIORITY_BADGES[task.priority].style}`}>
            {task.priority}
          </span>
        </div>

        {/* Middle: ID + Category Badge + Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="font-black text-slate-400 uppercase tracking-wider">{task.id}</span>
            <span className="font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/5 px-2 py-0.5 rounded-md border border-[#6A1B2E]/10 shrink-0">
              {task.category}
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-[#6A1B2E] transition-colors">
            {task.title}
          </h4>
        </div>
      </div>

      {/* Bottom: Thin progress bar + Due date + Compact status badge + Counters */}
      <div className="space-y-2 pt-1.5 border-t border-slate-100/80 min-w-0">
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-[#6A1B2E]'}`}
            style={{ width: `${task.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 min-w-0 pt-0.5">
          {/* Left Metadata (Due Date, Attachments, Comments) */}
          <div className="flex items-center gap-2.5 min-w-0 shrink overflow-hidden">
            <span className={`flex items-center gap-1 font-bold shrink-0 ${task.due === 'Today' || task.isDueToday ? 'text-amber-600 font-black' : 'text-slate-500'}`}>
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{task.due}</span>
            </span>
            {task.attachmentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-slate-400 shrink-0" title={`${task.attachmentsCount} attachments`}>
                <Paperclip className="w-3 h-3 shrink-0" />
                <span>{task.attachmentsCount}</span>
              </span>
            )}
            {task.commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-slate-400 shrink-0" title={`${task.commentsCount} comments`}>
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span>{task.commentsCount}</span>
              </span>
            )}
          </div>

          {/* Right Status Dropdown (Never Overflows, max-w-[95px]) */}
          <div className="flex items-center gap-1 shrink-0 ml-auto max-w-[105px]">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
              className="h-7 max-w-[90px] px-1.5 text-[9.5px] font-extrabold text-slate-700 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6A1B2E]/30 cursor-pointer shadow-2xs transition-colors shrink-0 truncate"
            >
              {COLUMNS.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
              <button onClick={() => setEditTask({ ...task })} className="p-0.5 text-slate-400 hover:text-amber-600 rounded" title="Edit">
                <Edit3 className="w-3 h-3" />
              </button>
              <button onClick={() => setDeleteId(task.id)} className="p-0.5 text-slate-400 hover:text-red-600 rounded" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 text-left antialiased font-sans select-none relative max-w-full">
      {/* Success Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Status Tracker</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20">
              Operational Workflow
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">Assign work items, track progress, and manage staff deliverables.</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20 shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Tasks', value: totalTasks, color: 'bg-blue-50 text-blue-700 border-blue-200/80', icon: CheckSquare },
          { label: 'Due Today', value: dueTodayCount, color: 'bg-amber-50 text-amber-700 border-amber-200/80', icon: Clock },
          { label: 'Overdue', value: overdueCount, color: 'bg-red-50 text-red-700 border-red-200/80', icon: AlertCircle },
          { label: 'Completed', value: completedCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-slate-200/70 rounded-2xl shadow-2xs">
        
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {['All', 'My Tasks', 'High Priority', 'Due Today', 'Completed'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`h-8 px-3 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap active:scale-98 ${
                activeFilter === f
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, students..."
              className="w-full h-8.5 pl-8 pr-7 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/40 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-lg text-xs transition-all ${view === 'kanban' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg text-xs transition-all ${view === 'list' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slim & Compact Column Header Kanban Board */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter(t => t.status === col);
            const cfg = COLUMN_CONFIG[col];
            return (
              <div key={col} className={`rounded-2xl p-3 border ${cfg.color} min-h-[440px] flex flex-col justify-between shadow-2xs`}>
                <div>
                  {/* Slim 40px Enterprise Column Header */}
                  <div className="h-10 flex items-center justify-between mb-2.5 px-1 pb-2 border-b border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="text-[13px] font-bold text-slate-800 leading-none">{col}</span>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200/90 text-[10px] font-extrabold text-slate-700 flex items-center justify-center shadow-2xs shrink-0 leading-none">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Stack */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {colTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </AnimatePresence>

                    {colTasks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200/80 rounded-2xl bg-white/60">
                        <CheckSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-extrabold text-slate-400">No tasks in {col}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Task ID & Title</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filtered.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{task.id}</span>
                        <span className="font-extrabold text-slate-900">{task.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{task.studentName}</span>
                      <span className="text-slate-400 text-[10px] block">{task.university}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/5 px-2 py-0.5 rounded border border-[#6A1B2E]/10">{task.category}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{task.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-black border uppercase ${PRIORITY_BADGES[task.priority].style}`}>{task.priority}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-600">{task.due}</td>
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        {COLUMNS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditTask({ ...task })} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteId(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Create Operational Task</h3>
                <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Task Title</label>
                  <input required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Verify Ashly financial solvency certificate" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Provide task deliverables..." className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Assignee</label>
                    <select value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {STAFF.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as Priority })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Category</label>
                    <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      <option>Documents</option>
                      <option>Applications</option>
                      <option>Visa</option>
                      <option>Finance</option>
                      <option>Communication</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Due Date</label>
                    <input type="text" value={newTask.due} onChange={e => setNewTask({ ...newTask, due: e.target.value })} placeholder="e.g. Aug 15, 2026" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold bg-[#6A1B2E] text-white rounded-xl hover:bg-[#521221]">Create Task</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editTask && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setEditTask(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Edit Task — {editTask.id}</h3>
                <button onClick={() => setEditTask(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Task Title</label>
                  <input required value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Description</label>
                  <textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} className="w-full h-20 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Assignee</label>
                    <select value={editTask.assignee} onChange={e => setEditTask({ ...editTask, assignee: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {STAFF.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
                    <select value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value as Priority })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setEditTask(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-xs font-bold bg-[#6A1B2E] text-white rounded-xl hover:bg-[#521221]">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h3 className="text-base font-black text-slate-900">Delete Task {deleteId}?</h3>
              <p className="text-xs font-medium text-slate-500">Are you sure you want to delete this task? This action cannot be undone.</p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button onClick={handleDeleteTask} className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl">Confirm Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
