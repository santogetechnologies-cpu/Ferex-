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
  studentFlag: string;
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
    studentFlag: '🇮🇳',
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
  'To Do': { color: 'border-slate-200 bg-slate-100/60', dot: 'bg-slate-400' },
  'In Progress': { color: 'border-blue-200 bg-blue-50/40', dot: 'bg-blue-500' },
  'Review': { color: 'border-violet-200 bg-violet-50/40', dot: 'bg-violet-500' },
  'Done': { color: 'border-emerald-200 bg-emerald-50/40', dot: 'bg-emerald-500' },
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
  
  // New task form state
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
    setTimeout(() => setToast(''), 2500);
  };

  // Filter tasks based on search & quick filters
  const filtered = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase()) ||
      t.studentName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'My Tasks') return t.assignee === STAFF[0];
    if (activeFilter === 'High Priority') return t.priority === 'High';
    if (activeFilter === 'Due Today') return t.due === 'Today' || t.isDueToday;
    if (activeFilter === 'Completed') return t.status === 'Done';

    return true;
  });

  // KPI Calculations
  const totalTasks = tasks.length;
  const dueTodayCount = tasks.filter(t => t.due === 'Today' || t.isDueToday).length;
  const overdueCount = tasks.filter(t => t.isOverdue).length;
  const completedCount = tasks.filter(t => t.status === 'Done').length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.due) return;
    const id = `TK-${String(tasks.length + 1).padStart(3, '0')}`;
    setTasks(prev => [{
      ...newTask,
      id,
      status: 'To Do',
      studentFlag: '🇮🇳',
      progress: 0,
      subtasksCompleted: 0,
      subtasksTotal: 3,
      attachmentsCount: 1,
      commentsCount: 0,
      isDueToday: newTask.due === 'Today',
    }, ...prev]);
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
    showToast('Task created successfully!');
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      status,
      progress: status === 'Done' ? 100 : t.progress === 100 ? 50 : t.progress
    } : t));
    showToast(`Task moved to "${status}"`);
  };

  const handleDelete = () => {
    setTasks(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
    showToast('Task permanently deleted.');
  };

  const handleSaveEdit = () => {
    if (!editTask) return;
    setTasks(prev => prev.map(t => t.id === editTask.id ? editTask : t));
    setEditTask(null);
    showToast('Task details updated.');
  };

  // Rich Task Card Component
  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group relative flex flex-col justify-between"
    >
      <div>
        {/* Student & University Badge Header */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#6A1B2E] text-white text-[9px] font-black flex items-center justify-center shrink-0 shadow-2xs">
              {task.studentName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 leading-none truncate">
                {task.studentName} <span className="text-[10px] font-normal">{task.studentFlag}</span>
              </p>
              <p className="text-[9.5px] font-semibold text-slate-400 truncate mt-0.5">{task.university}</p>
            </div>
          </div>
          
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${PRIORITY_BADGES[task.priority].style}`}>
            {task.priority}
          </span>
        </div>

        {/* Task Title & Description */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{task.id}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[9.5px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/5 px-1.5 py-0.2 rounded border border-[#6A1B2E]/10">{task.category}</span>
          </div>
          <h4 className="text-xs font-extrabold text-slate-900 leading-snug group-hover:text-[#6A1B2E] transition-colors">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[10.5px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Subtask Progress Bar */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-[9.5px] font-extrabold text-slate-400 mb-1">
            <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-slate-400" /> Subtasks</span>
            <span className="text-slate-700">{task.subtasksCompleted}/{task.subtasksTotal} ({task.progress}%)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-[#6A1B2E]'}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task Card Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
        
        {/* Meta Counts & Due Date */}
        <div className="flex items-center gap-2 text-slate-400 font-bold">
          {task.attachmentsCount > 0 && (
            <span className="flex items-center gap-0.5 hover:text-slate-600" title={`${task.attachmentsCount} attachments`}>
              <Paperclip className="w-3 h-3 text-slate-400" /> {task.attachmentsCount}
            </span>
          )}
          {task.commentsCount > 0 && (
            <span className="flex items-center gap-0.5 hover:text-slate-600" title={`${task.commentsCount} comments`}>
              <MessageSquare className="w-3 h-3 text-slate-400" /> {task.commentsCount}
            </span>
          )}
          <span className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded ${task.due === 'Today' || task.isDueToday ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-500'}`}>
            <Clock className="w-3 h-3" /> {task.due}
          </span>
        </div>

        {/* Assignee & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-[9px] flex items-center justify-center shrink-0 shadow-2xs" title={`Assigned to ${task.assignee}`}>
            {task.assignee[0]}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
              className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              {COLUMNS.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => setEditTask({ ...task })} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={() => setDeleteId(task.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Success Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Task Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20">
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
          <div key={label} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-slate-200/70 rounded-2xl shadow-xs">
        
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

      {/* Kanban Board View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter(t => t.status === col);
            const cfg = COLUMN_CONFIG[col];
            return (
              <div key={col} className={`rounded-2xl p-3 border ${cfg.color} min-h-[440px] flex flex-col justify-between`}>
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-black text-slate-800">{col}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Stack */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {colTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </AnimatePresence>

                    {colTasks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200/80 rounded-xl bg-white/50">
                        <CheckSquare className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-extrabold text-slate-400">No tasks in {col}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Button at column bottom */}
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 w-full h-8 border border-dashed border-slate-300 hover:border-[#6A1B2E]/50 bg-white/60 hover:bg-white text-slate-500 hover:text-[#6A1B2E] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase text-[9.5px] font-extrabold tracking-wider">
                <th className="text-left px-5 py-3.5">Task & Description</th>
                <th className="text-left px-4 py-3.5">Student / University</th>
                <th className="text-left px-4 py-3.5">Subtask Progress</th>
                <th className="text-left px-4 py-3.5">Assignee</th>
                <th className="text-left px-4 py-3.5">Priority</th>
                <th className="text-left px-4 py-3.5">Status</th>
                <th className="text-[#6A1B2E] text-right px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 max-w-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9.5px] font-black text-slate-400">{t.id}</span>
                      <span className="text-[9px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/5 px-1.5 py-0.2 rounded border border-[#6A1B2E]/10">{t.category}</span>
                    </div>
                    <p className="font-extrabold text-slate-900 leading-snug">{t.title}</p>
                    <p className="text-[10.5px] font-semibold text-slate-400 truncate mt-0.5">{t.description}</p>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="font-extrabold text-slate-800">{t.studentFlag} {t.studentName}</p>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">{t.university}</p>
                  </td>

                  <td className="px-4 py-3.5 min-w-[140px]">
                    <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 mb-1">
                      <span>{t.subtasksCompleted}/{t.subtasksTotal} completed</span>
                      <span>{t.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${t.progress === 100 ? 'bg-emerald-500' : 'bg-[#6A1B2E]'}`} style={{ width: `${t.progress}%` }} />
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        {t.assignee[0]}
                      </div>
                      <span className="font-bold text-slate-700">{t.assignee}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${PRIORITY_BADGES[t.priority].style}`}>
                      {t.priority}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                      className="text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                    >
                      {COLUMNS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditTask({ ...t })} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Create New Work Task</h3>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Task Title *</label>
                  <input required value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Review student visa documents"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                    <select value={newTask.studentName} onChange={(e) => setNewTask({ ...newTask, studentName: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none">
                      <option value="Ashly">Ashly</option>
                      <option value="Rahul Mehta">Rahul Mehta</option>
                      <option value="Priya Sharma">Priya Sharma</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">University</label>
                    <input value={newTask.university} onChange={(e) => setNewTask({ ...newTask, university: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea rows={3} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Provide detailed instructions for staff member..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Assignee</label>
                    <select value={newTask.assignee} onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none">
                      {STAFF.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none">
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Due Date *</label>
                    <input required type="text" value={newTask.due} onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                      placeholder="e.g. Today or Aug 10"
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 h-10 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-sm">Create Task</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editTask && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditTask(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Edit Task — {editTask.id}</h3>
                <button onClick={() => setEditTask(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                  <input value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea rows={2} value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Assignee</label>
                    <select value={editTask.assignee} onChange={(e) => setEditTask({ ...editTask, assignee: e.target.value })}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none">
                      {STAFF.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                    <select value={editTask.priority} onChange={(e) => setEditTask({ ...editTask, priority: e.target.value as Priority })}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none">
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select value={editTask.status} onChange={(e) => setEditTask({ ...editTask, status: e.target.value as TaskStatus })}
                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none">
                      {COLUMNS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditTask(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221]">Save Changes</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <h3 className="text-sm font-black text-slate-900">Delete Task?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">Task {deleteId} will be permanently removed from staff workflow.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
