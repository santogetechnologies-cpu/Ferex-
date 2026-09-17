import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare, Users, GraduationCap, FileText, Sparkles,
  ArrowRight, Building2, Ticket, AlertCircle, RotateCcw,
  Clock, CheckCircle2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { getStudents } from '../../lib/api/students';
import { getApplications } from '../../lib/api/applications';
import { getDocumentsForAdmin } from '../../lib/api/documents';
import type { Task } from '../../lib/types';

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const counselorIdentity = useMemo(() => {
    return {
      id: user?.id,
      email: user?.email,
      full_name: profile?.full_name || user?.user_metadata?.full_name,
      name: profile?.full_name || user?.user_metadata?.full_name,
    };
  }, [user?.id, user?.email, profile?.full_name, user?.user_metadata?.full_name]);

  const { tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks, changeStatus } = useTasks(counselorIdentity);

  const [students, setStudents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';
  const staffInitials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AC';

  const loadData = async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [stds, apps, docs] = await Promise.all([
        getStudents(),
        getApplications(),
        getDocumentsForAdmin(),
      ]);
      setStudents(stds || []);
      setApplications(apps || []);
      setDocuments(docs || []);
    } catch (err: any) {
      setDataError(err.message || 'Failed to load data from database');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_students_change', loadData);
    window.addEventListener('ferex_application_change', loadData);
    window.addEventListener('ferex_docs_change', loadData);
    return () => {
      window.removeEventListener('ferex_students_change', loadData);
      window.removeEventListener('ferex_application_change', loadData);
      window.removeEventListener('ferex_docs_change', loadData);
    };
  }, []);

  // Compute counselor's assigned students
  const assignedStudents = useMemo(() => {
    return students.filter(s => {
      if (!s.assigned_counselor) return false;
      const c = s.assigned_counselor.toLowerCase().trim();
      const meName = staffName.toLowerCase().trim();
      const meEmail = (user?.email || '').toLowerCase().trim();
      const mePrefix = meEmail.split('@')[0];
      return (
        c === meName ||
        c.includes(meName) ||
        meName.includes(c) ||
        (mePrefix && c.includes(mePrefix)) ||
        c === user?.id
      );
    });
  }, [students, staffName, user?.email, user?.id]);

  // Tasks metrics
  const pendingTasks = useMemo(() => {
    return tasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      return !s.includes('complete') && !s.includes('done');
    });
  }, [tasks]);

  const pendingDocs = useMemo(() => {
    return documents.filter(d => {
      const s = (d.status || '').toLowerCase();
      return s.includes('pending') || s.includes('review') || s.includes('submitted');
    });
  }, [documents]);

  const isLoading = tasksLoading || dataLoading;

  const handleQuickCompleteTask = async (taskId: string) => {
    try {
      await changeStatus(taskId, 'Completed');
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  return (
    <div className="space-y-8 text-left antialiased select-none font-sans">
      {/* Executive Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#2E030F] text-white p-8 shadow-xl relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 75% 50%, white 0%, transparent 65%)' }}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase bg-white/15 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Admissions Counselor
              </span>
              <span className="text-[10px] font-bold text-amber-300">● Education Module Only</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Welcome back, {staffName}!
            </h1>
            <p className="text-xs text-white/80 font-medium leading-relaxed">
              {isLoading
                ? 'Loading your operational workspace from Supabase...'
                : pendingTasks.length > 0
                ? `You have ${pendingTasks.length} pending operational task${pendingTasks.length > 1 ? 's' : ''} assigned to you and ${assignedStudents.length} students under your active counseling pipeline.`
                : `Your assigned task queue is clear. You have ${assignedStudents.length} assigned students under active counseling.`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl text-amber-300 shadow-inner">
              {staffInitials}
            </div>
            <Link to="/staff/tasks">
              <Button size="sm" className="bg-white text-[#58051E] hover:bg-slate-100 font-black text-xs shadow-md">
                My Tasks <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-[#58051E]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Real Supabase Database Error Alert */}
      {(tasksError || dataError) && (
        <Card className="p-4 border border-red-200 bg-red-50/50 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-red-900 block">Database Synchronization Notice</span>
              <span className="text-[11px] text-red-700 block">{tasksError || dataError}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { refreshTasks(); loadData(); }}
            className="bg-red-600 text-white hover:bg-red-700 text-xs font-bold shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </Card>
      )}

      {/* Real KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'My Assigned Tasks',
            val: isLoading ? '—' : `${pendingTasks.length} Pending`,
            sub: isLoading ? 'Loading...' : pendingTasks.length === 0 ? 'All tasks complete' : 'Action required',
            progress: isLoading ? 0 : Math.min((pendingTasks.length / Math.max(tasks.length, 1)) * 100, 100),
            color: 'text-amber-700',
            bg: 'bg-amber-500',
            path: '/staff/tasks',
          },
          {
            label: 'Assigned Students',
            val: isLoading ? '—' : `${assignedStudents.length} Active`,
            sub: isLoading ? 'Loading...' : assignedStudents.length === 0 ? 'No assigned students' : 'In your pipeline',
            progress: isLoading ? 0 : Math.min((assignedStudents.length / Math.max(students.length, 1)) * 100, 100),
            color: 'text-emerald-700',
            bg: 'bg-emerald-500',
            path: '/staff/students',
          },
          {
            label: 'Active Applications',
            val: isLoading ? '—' : `${applications.length} Live`,
            sub: isLoading ? 'Loading...' : applications.length === 0 ? 'No applications yet' : 'Under education processing',
            progress: isLoading ? 0 : 100,
            color: 'text-blue-700',
            bg: 'bg-blue-500',
            path: '/staff/applications',
          },
          {
            label: 'Pending Documents',
            val: isLoading ? '—' : `${pendingDocs.length} To Review`,
            sub: isLoading ? 'Loading...' : pendingDocs.length === 0 ? 'All documents verified' : 'Awaiting verification',
            progress: isLoading ? 0 : Math.min((pendingDocs.length / Math.max(documents.length, 1)) * 100, 100),
            color: 'text-[#58051E]',
            bg: 'bg-[#58051E]',
            path: '/staff/documents',
          },
        ].map((card, idx) => (
          <Card
            key={idx}
            onClick={() => navigate(card.path)}
            className="p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer group hover:border-slate-300"
          >
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.val}</div>
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-700 ${card.bg}`} style={{ width: `${card.progress}%` }} />
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 block">{card.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Assigned Tasks */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#58051E]" />
                <h3 className="text-sm font-black text-slate-900">Urgent Assigned Tasks</h3>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {pendingTasks.length} Pending
                </span>
              </div>
              <Link to="/staff/tasks" className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
                View All Tasks <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {tasksLoading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading assigned tasks...</div>
            ) : pendingTasks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckSquare className="w-10 h-10 text-slate-200 mx-auto" />
                <h4 className="text-xs font-black text-slate-700">No tasks assigned</h4>
                <p className="text-[11px] font-semibold text-slate-400">
                  When an administrator assigns a task to you, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.slice(0, 4).map(task => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/70 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.2 rounded border ${
                            task.priority === 'High' || task.priority === 'Critical'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {task.priority || 'Medium'}
                        </span>
                        {task.due_date && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Due: {task.due_date}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900">{task.title}</h4>
                      {task.student_name && (
                        <p className="text-[11px] font-semibold text-slate-500">
                          Student: <strong className="text-slate-700">{task.student_name}</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleQuickCompleteTask(task.id)}
                        className="px-3 py-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Student Applications */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Recent Student Applications</h3>
              </div>
              <Link to="/staff/applications" className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
                All Applications <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {dataLoading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <GraduationCap className="w-10 h-10 text-slate-200 mx-auto" />
                <h4 className="text-xs font-black text-slate-700">No applications found</h4>
                <p className="text-[11px] font-semibold text-slate-400">
                  Student applications submitted will appear here for admissions review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">University</th>
                      <th className="py-2.5 px-3">Program</th>
                      <th className="py-2.5 px-3">Stage / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {applications.slice(0, 5).map(app => (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-all"
                        onClick={() => navigate('/staff/applications')}
                      >
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {app.student_name || app.student_email || 'Student Applicant'}
                        </td>
                        <td className="py-3 px-3 text-slate-800 font-bold">
                          {app.university_name || 'Partner University'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {app.program_name || 'Undergraduate / Postgraduate'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                            {app.status || 'Submitted'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Quick Actions & Pipeline */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Counselor Quick Actions
            </h3>
            <div className="space-y-2">
              <Link to="/staff/students" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <Users className="w-4 h-4 mr-2 text-[#58051E]" /> View Assigned Students
                </Button>
              </Link>
              <Link to="/staff/applications" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <GraduationCap className="w-4 h-4 mr-2 text-blue-600" /> Review Applications
                </Button>
              </Link>
              <Link to="/staff/documents" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <FileText className="w-4 h-4 mr-2 text-emerald-600" /> Verify Student Documents
                </Button>
              </Link>
              <Link to="/staff/universities" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <Building2 className="w-4 h-4 mr-2 text-purple-600" /> University Catalog
                </Button>
              </Link>
              <Link to="/staff/tickets" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <Ticket className="w-4 h-4 mr-2 text-amber-600" /> Support Tickets
                </Button>
              </Link>
            </div>
          </Card>

          {/* Student Pipeline Card */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Admissions Pipeline
            </h3>
            {dataLoading ? (
              <p className="text-xs font-semibold text-slate-400 py-2">Loading pipeline...</p>
            ) : (
              <div className="space-y-2.5 text-xs font-bold text-slate-700">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Registered Students</span>
                  <span className="text-slate-900 font-extrabold">{students.length}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Assigned to You</span>
                  <span className="text-emerald-700 font-extrabold">{assignedStudents.length}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Live Applications</span>
                  <span className="text-blue-700 font-extrabold">{applications.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Documents Pending Review</span>
                  <span className="text-amber-700 font-extrabold">{pendingDocs.length}</span>
                </div>
              </div>
            )}
            <Link to="/staff/students" className="block mt-2">
              <Button size="sm" variant="outline" className="w-full text-xs font-bold">
                Open Student Directory →
              </Button>
            </Link>
          </Card>

          {/* Education Module Notice */}
          <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-4 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
              <span className="text-xs font-black text-amber-900">Education Exclusive</span>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
              Admissions Counselor access is restricted to Education operations. No central administrator or cross-module access is permitted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
