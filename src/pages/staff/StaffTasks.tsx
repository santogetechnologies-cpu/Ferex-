import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Clock, CheckCircle2, AlertCircle, Search,
  Calendar, User, ArrowRight, RotateCcw, ShieldCheck, Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../contexts/AuthContext';
import type { Task } from '../../lib/types';

export const StaffTasks: React.FC = () => {
  const { user, profile } = useAuth();

  // Counselor identity for strict backend scoping & RLS query
  const counselorIdentity = useMemo(() => {
    return {
      id: user?.id,
      email: user?.email,
      full_name: profile?.full_name || user?.user_metadata?.full_name,
      name: profile?.full_name || user?.user_metadata?.full_name,
    };
  }, [user?.id, user?.email, profile?.full_name, user?.user_metadata?.full_name]);

  const { tasks, loading, error, refresh, changeStatus } = useTasks(counselorIdentity);

  const [toast, setToast] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Helper to normalize task status
  const normalizeStatus = (status: string): 'Pending' | 'In Progress' | 'Completed' => {
    const s = (status || '').toLowerCase();
    if (s.includes('complete') || s.includes('done')) return 'Completed';
    if (s.includes('progress') || s.includes('process') || s.includes('review')) return 'In Progress';
    return 'Pending';
  };

  const handleStatusChange = async (id: string, newStatus: Task['status']) => {
    try {
      setUpdatingTaskId(id);
      await changeStatus(id, newStatus);
      showToast(`Task status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Failed to update task: ${err.message || 'Database error'}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Metrics computed strictly from real assigned tasks
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter(t => normalizeStatus(t.status) === 'Pending').length,
      inProgress: tasks.filter(t => normalizeStatus(t.status) === 'In Progress').length,
      completed: tasks.filter(t => normalizeStatus(t.status) === 'Completed').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const norm = normalizeStatus(t.status);
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Pending' && norm === 'Pending') ||
        (filterStatus === 'In Progress' && norm === 'In Progress') ||
        (filterStatus === 'Completed' && norm === 'Completed');

      const matchesPriority =
        filterPriority === 'All' ||
        t.priority?.toLowerCase() === filterPriority.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.student_name || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, filterStatus, filterPriority, searchQuery]);

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-md border border-[#58051E]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> ADMISSIONS COUNSELOR SCOPE
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Realtime Supabase Synchronized</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#58051E]" /> My Tasks
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Operational tasks assigned to you by administrators for student counseling, document reviews, and admissions follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refresh()}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Sync Tasks
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned to Me', count: counts.all, color: 'text-slate-900', border: 'border-slate-200' },
          { label: 'Pending Action', count: counts.pending, color: 'text-amber-700', border: 'border-amber-200 bg-amber-50/20' },
          { label: 'In Progress', count: counts.inProgress, color: 'text-blue-700', border: 'border-blue-200 bg-blue-50/20' },
          { label: 'Completed', count: counts.completed, color: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50/20' },
        ].map((kpi, idx) => (
          <Card key={idx} className={`p-4 border ${kpi.border} shadow-xs`}>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{kpi.label}</span>
            <span className={`text-2xl font-black ${kpi.color} block mt-1`}>
              {loading ? '—' : kpi.count}
            </span>
          </Card>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'Pending', 'In Progress', 'Completed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === tab
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] opacity-75">
                  ({tab === 'All' ? counts.all : tab === 'Pending' ? counts.pending : tab === 'In Progress' ? counts.inProgress : counts.completed})
                </span>
              </button>
            ))}
          </div>

          {/* Search Input & Priority Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search my tasks..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
              />
            </div>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Database Error State with Retry Button */}
      {error && (
        <Card className="p-6 border border-red-200 bg-red-50/40 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-red-900">Database Synchronization Error</h3>
            <p className="text-xs font-semibold text-red-700 mt-1 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => refresh()}
            className="bg-[#58051E] text-white hover:bg-[#430316] font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Retry Database Connection
          </Button>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 border border-slate-200/80 shadow-xs animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State — Strictly no fake/mock data */}
      {!loading && !error && filteredTasks.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              {tasks.length === 0 ? 'No tasks assigned' : 'No matching tasks'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {tasks.length === 0
                ? 'You currently have no operational tasks assigned. When an administrator assigns a task to your counselor account, it will automatically appear here.'
                : 'No tasks match your current filter and search query. Try resetting your search filters.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Assigned Tasks List */}
      {!loading && !error && filteredTasks.length > 0 && (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const currentNorm = normalizeStatus(task.status);
            const isUpdating = updatingTaskId === task.id;

            return (
              <Card
                key={task.id}
                className="p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                          task.priority === 'High' || task.priority === 'Critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : task.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        Priority: {task.priority || 'Normal'}
                      </span>

                      {task.category && (
                        <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {task.category}
                        </span>
                      )}

                      {task.due_date && (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Due: {task.due_date}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-900">
                      {task.title}
                    </h3>
                  </div>

                  {/* Status Badges & Quick Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full border ${
                        currentNorm === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : currentNorm === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {task.status || 'Pending'}
                    </span>

                    {/* Counselor Status Progression */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      {currentNorm !== 'Pending' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'Pending')}
                          disabled={isUpdating}
                          className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer"
                        >
                          Mark Pending
                        </button>
                      )}

                      {currentNorm !== 'In Progress' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'In Progress')}
                          disabled={isUpdating}
                          className="px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-white rounded-lg transition-all cursor-pointer"
                        >
                          In Progress
                        </button>
                      )}

                      {currentNorm !== 'Completed' && (
                        <button
                          onClick={() => handleStatusChange(task.id, 'Completed')}
                          disabled={isUpdating}
                          className="px-2.5 py-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {task.description}
                  </p>
                )}

                {/* Footer metadata: Associated student and assigned scope */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {task.student_name ? (
                        <>Student: <strong className="text-slate-700">{task.student_name}</strong></>
                      ) : (
                        'General Operational Task'
                      )}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400">
                    Task ID: {task.id.slice(0, 8)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
