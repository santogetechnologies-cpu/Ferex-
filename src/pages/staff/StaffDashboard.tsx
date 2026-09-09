import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare, Calendar, FileText, Sparkles,
  ArrowRight, Video, Users, ClipboardList, Inbox
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useMeetings } from '../../hooks/useMeetings';
import { useTasks } from '../../hooks/useTasks';
import { useStudents } from '../../hooks/useStudents';

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Real data from Supabase
  const { meetings, loading: meetingsLoading } = useMeetings(undefined);
  const { tasks, loading: tasksLoading } = useTasks();
  const { students, loading: studentsLoading } = useStudents();

  const staffName = profile?.full_name || user?.email?.split('@')[0] || 'Counselor';
  const staffRole = profile?.role === 'counselor' ? 'Admissions Counselor' : 'Education Staff';
  const staffInitials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'FX';

  // Compute real KPIs
  const pendingTasks = tasks.filter(t =>
    t.status === 'To Do' || t.status === 'In Progress' || (t.status as string) === 'Pending' || (t.status as string) === 'pending'
  );
  const upcomingMeetings = meetings.filter(m =>
    m.status === 'Scheduled' || (m.status as string) === 'Confirmed'
  );
  const assignedStudents = students.filter(s =>
    s.assigned_counselor && (
      s.assigned_counselor === staffName ||
      s.assigned_counselor.toLowerCase().includes(user?.email?.split('@')[0]?.toLowerCase() || '___')
    )
  );
  const completedTasks = tasks.filter(t =>
    t.status === 'Completed' || (t.status as string) === 'done' || (t.status as string) === 'Done'
  );

  const isLoading = meetingsLoading || tasksLoading || studentsLoading;

  return (
    <div className="space-y-8 text-left antialiased select-none">

      {/* Executive Hero Banner — real counselor name */}
      <div className="rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 70%)' }} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {staffRole}
              </span>
              <span className="text-[10px] font-bold text-emerald-300">● Ferex Education Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Welcome back, {staffName}!
            </h1>
            <p className="text-xs text-white/70 font-semibold leading-relaxed">
              {isLoading
                ? 'Loading your workspace...'
                : pendingTasks.length > 0 || upcomingMeetings.length > 0
                  ? `You have ${pendingTasks.length > 0 ? `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}` : ''}${pendingTasks.length > 0 && upcomingMeetings.length > 0 ? ' and ' : ''}${upcomingMeetings.length > 0 ? `${upcomingMeetings.length} upcoming session${upcomingMeetings.length > 1 ? 's' : ''}` : ''} today.`
                  : 'Your workspace is clear. No pending tasks or upcoming sessions.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg text-amber-300 select-none">
              {staffInitials}
            </div>
            <Link to="/staff/tasks">
              <Button size="sm" className="bg-white text-[#6A1B2E] hover:bg-slate-100 font-black text-xs">
                Task Board <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-[#6A1B2E]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Pending Tasks',
            val: isLoading ? '—' : `${pendingTasks.length} Pending`,
            sub: isLoading ? 'Loading...' : pendingTasks.length === 0 ? 'All tasks complete' : 'Require attention',
            progress: isLoading ? 0 : Math.min((pendingTasks.length / Math.max(tasks.length, 1)) * 100, 100),
            color: 'text-amber-700', bg: 'bg-amber-500', path: '/staff/tasks'
          },
          {
            label: 'Upcoming Sessions',
            val: isLoading ? '—' : `${upcomingMeetings.length} Scheduled`,
            sub: isLoading ? 'Loading...' : upcomingMeetings.length === 0 ? 'No sessions booked' : `${upcomingMeetings[0]?.scheduled_date || 'See calendar'}`,
            progress: isLoading ? 0 : Math.min((upcomingMeetings.length / Math.max(meetings.length, 1)) * 100, 100),
            color: 'text-blue-700', bg: 'bg-blue-500', path: '/staff/meetings'
          },
          {
            label: 'Assigned Students',
            val: isLoading ? '—' : `${assignedStudents.length} Active`,
            sub: isLoading ? 'Loading...' : assignedStudents.length === 0 ? 'None assigned yet' : 'In your pipeline',
            progress: isLoading ? 0 : Math.min((assignedStudents.length / Math.max(students.length, 1)) * 100, 100),
            color: 'text-emerald-700', bg: 'bg-emerald-500', path: '/staff/students'
          },
          {
            label: 'Completed Tasks',
            val: isLoading ? '—' : `${completedTasks.length} Done`,
            sub: isLoading ? 'Loading...' : completedTasks.length === 0 ? 'No tasks completed yet' : 'Great progress!',
            progress: isLoading ? 0 : Math.round((completedTasks.length / Math.max(tasks.length, 1)) * 100),
            color: 'text-[#6A1B2E]', bg: 'bg-[#6A1B2E]', path: '/staff/documents'
          },
        ].map((card, idx) => (
          <Card key={idx} onClick={() => navigate(card.path)} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer group hover:border-slate-300">
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming Consultations */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Upcoming Consultations
              </h3>
              <Link to="/staff/meetings" className="text-xs font-bold text-[#6A1B2E] hover:underline">View Calendar →</Link>
            </div>

            {meetingsLoading ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">Loading meetings...</div>
            ) : upcomingMeetings.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No upcoming sessions scheduled.</p>
                <Link to="/staff/meetings">
                  <Button size="sm" variant="outline" className="text-xs font-bold mt-1">View Meeting Calendar</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/80 transition-all">
                    <div>
                      <span className="text-[10px] font-black text-[#6A1B2E] uppercase">
                        {m.scheduled_date}{m.start_time ? ` • ${m.start_time}` : ''}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">{m.subject || 'Counselling Session'}</h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Student: {(m as any).student_name || m.student_id?.slice(0, 8) || 'Assigned Student'}
                      </span>
                    </div>
                    <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shrink-0" onClick={() => navigate('/staff/meetings')}>
                      <Video className="w-3.5 h-3.5 mr-1" /> View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tasks */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#6A1B2E]" /> Assigned Tasks Workload
              </h3>
              <Link to="/staff/tasks" className="text-xs font-bold text-[#6A1B2E] hover:underline">Open Task Board →</Link>
            </div>

            {tasksLoading ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">Loading tasks...</div>
            ) : pendingTasks.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <ClipboardList className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No pending tasks assigned to you.</p>
                <p className="text-[10.5px] text-slate-400">Tasks will appear here when assigned by your admin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Task Title</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {pendingTasks.slice(0, 5).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => navigate('/staff/tasks')}>
                        <td className="py-3 px-3 font-extrabold text-slate-900">{t.title}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            t.priority === 'High' || t.priority === 'Critical'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : t.priority === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {t.priority || 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{t.due_date || '—'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                            {t.status || 'Pending'}
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

        {/* Right Column */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/staff/students">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start">
                  <Users className="w-4 h-4 mr-2 text-[#6A1B2E]" /> View Assigned Students
                </Button>
              </Link>
              <Link to="/staff/documents">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start mt-2">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" /> Review Documents
                </Button>
              </Link>
              <Link to="/staff/notes">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start mt-2">
                  <ClipboardList className="w-4 h-4 mr-2 text-emerald-600" /> Add Advisory Note
                </Button>
              </Link>
            </div>
          </Card>

          {/* Student Pipeline (real data) */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Student Pipeline</h3>
            {studentsLoading ? (
              <p className="text-xs font-semibold text-slate-400 py-2">Loading...</p>
            ) : students.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No students registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Total Students</span>
                  <span className="text-blue-700">{students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned to You</span>
                  <span className="text-emerald-700">{assignedStudents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upcoming Sessions</span>
                  <span className="text-amber-700">{upcomingMeetings.length}</span>
                </div>
              </div>
            )}
            <Link to="/staff/students">
              <Button size="sm" variant="outline" className="w-full text-xs font-bold mt-1">
                View All Students →
              </Button>
            </Link>
          </Card>

          {/* Activity Feed */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Recent Activity</h3>
            {meetingsLoading || tasksLoading ? (
              <p className="text-xs font-semibold text-slate-400 py-2">Loading...</p>
            ) : meetings.length === 0 && tasks.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <Inbox className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No recent activity yet.</p>
                <p className="text-[10.5px] text-slate-400">Your actions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-semibold relative pl-4 border-l-2 border-slate-200">
                {[
                  ...meetings.slice(0, 2).map(m => ({
                    title: m.subject || 'Meeting Scheduled',
                    time: m.scheduled_date || 'Recent',
                    sub: `Student: ${(m as any).student_name || m.student_id?.slice(0, 8) || 'Unknown'}`,
                  })),
                  ...tasks.slice(0, 1).map(t => ({
                    title: t.title,
                    time: t.due_date || 'Recent',
                    sub: `Status: ${t.status || 'Pending'}`,
                  })),
                ].slice(0, 3).map((act, i) => (
                  <div key={i} className="relative space-y-0.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6A1B2E] absolute -left-[21px] top-1 border-2 border-white" />
                    <span className="text-[10px] text-slate-400 font-bold block">{act.time}</span>
                    <span className="font-bold text-slate-900 block">{act.title}</span>
                    <span className="text-[10.5px] text-slate-500 block">{act.sub}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};


