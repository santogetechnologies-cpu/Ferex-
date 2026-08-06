import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, FolderOpen, CreditCard, Headphones, Clock,
  Activity, BarChart3,
  ArrowUpRight, ArrowRight, UserPlus, FilePlus, Plus, Sparkles
} from 'lucide-react';

const statCards = [
  { label: 'Total Students', value: '247', change: '+12 this month', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100', trend: 'up' },
  { label: 'Active Applications', value: '89', change: '23 pending review', icon: FileCheck, color: 'bg-violet-50 text-violet-600 border-violet-100', trend: 'up' },
  { label: 'Pending Documents', value: '34', change: '8 need urgent review', icon: FolderOpen, color: 'bg-amber-50 text-amber-600 border-amber-100', trend: 'down' },
  { label: 'Pending Payments', value: '₹12.4L', change: '18 invoices due', icon: CreditCard, color: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20', trend: 'up' },
  { label: 'Open Tickets', value: '21', change: '4 critical priority', icon: Headphones, color: 'bg-red-50 text-red-600 border-red-100', trend: 'down' },
  { label: "Today's Meetings", value: '7', change: 'Next at 2:30 PM', icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', trend: 'up' },
];

const recentStudents = [
  { id: 'FX-2026-001', name: 'Ashly', country: '🇮🇳', university: 'University of Warsaw', status: 'Offer Received', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'FX-2026-002', name: 'Rahul Mehta', country: '🇮🇳', university: 'TU Berlin', status: 'Under Review', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'FX-2026-003', name: 'Priya Sharma', country: '🇮🇳', university: 'University of Amsterdam', status: 'Docs Pending', statusColor: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const recentActivities = [
  { text: 'Ashly submitted Passport document', time: '5 min ago', type: 'doc' },
  { text: 'Rahul Mehta application approved by University of Berlin', time: '22 min ago', type: 'app' },
  { text: 'New support ticket opened: Visa query #TK-045', time: '1h ago', type: 'ticket' },
  { text: 'Payment of ₹45,000 received from Priya Sharma', time: '2h ago', type: 'payment' },
  { text: 'Staff member Riya assigned to application #APP-004', time: '3h ago', type: 'task' },
];

const appStatusData = [
  { label: 'Submitted', value: 89, color: 'bg-blue-500', pct: 36 },
  { label: 'Under Review', value: 54, color: 'bg-amber-500', pct: 22 },
  { label: 'Offer Received', value: 67, color: 'bg-emerald-500', pct: 27 },
  { label: 'Visa Processing', value: 37, color: 'bg-violet-500', pct: 15 },
];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 relative">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
            <span className="flex items-center gap-1 text-[10px] font-extrabold bg-[#6A1B2E]/10 text-[#6A1B2E] px-2 py-0.5 rounded-full border border-[#6A1B2E]/20">
              <Sparkles className="w-3 h-3" /> Live Overview
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">Welcome back, Admin. Real-time platform metrics and tasks.</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={() => navigate('/admin/students')}
            className="flex items-center gap-2 h-9 px-3.5 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-98 transition-all shadow-xs">
            <UserPlus className="w-3.5 h-3.5 text-slate-500" /> Add Student
          </button>
          <button onClick={() => navigate('/admin/tasks')}
            className="flex items-center gap-2 h-9 px-3.5 bg-[#6A1B2E] rounded-xl text-xs font-bold text-white hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20">
            <Plus className="w-3.5 h-3.5" /> New Task
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className={`w-3.5 h-3.5 ${card.trend === 'up' ? 'text-emerald-500' : 'text-slate-400'}`} />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{card.value}</p>
              <p className="text-[9.5px] font-bold text-slate-400 mt-1 truncate">{card.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Application Status Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-black text-slate-900">Application Pipeline Status</h3>
              <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">Real-time status breakdown across active applicants</p>
            </div>
            <button onClick={() => navigate('/admin/applications')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#6A1B2E] hover:underline hover:text-[#521221] transition-colors">
              Manage Applications <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {appStatusData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className="font-extrabold text-slate-900">{item.value} <span className="text-[10px] text-slate-400 font-semibold">({item.pct}%)</span></span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Activity Bar simulation */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Weekly Activity Trend</p>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">+24% volume</span>
            </div>
            <div className="flex items-end gap-2 h-16">
              {[40, 65, 55, 80, 70, 90, 78, 95, 85, 100, 88, 92].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-[#6A1B2E]/20 hover:bg-[#6A1B2E] transition-colors cursor-pointer" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[9.5px] font-bold text-slate-400">
              <span>Jul 26</span>
              <span>Aug 6</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Live Activity Feed</h3>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3.5">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex gap-3 items-start group">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ring-4 ${act.type === 'doc' ? 'bg-blue-500 ring-blue-50' : act.type === 'app' ? 'bg-emerald-500 ring-emerald-50' : act.type === 'ticket' ? 'bg-red-500 ring-red-50' : act.type === 'payment' ? 'bg-violet-500 ring-violet-50' : 'bg-amber-500 ring-amber-50'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-snug group-hover:text-[#6A1B2E] transition-colors">{act.text}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate('/admin/notifications')}
            className="w-full mt-4 h-9 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
            View All Activity
          </button>
        </div>
      </div>

      {/* Recent Students Table */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900">Enrolled Students</h3>
            <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">Quick access to active student profiles</p>
          </div>
          <button
            onClick={() => navigate('/admin/students')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#6A1B2E] hover:underline"
          >
            All Students <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase text-[9.5px] font-extrabold tracking-wider">
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">University</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-xs">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{s.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{s.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-600">{s.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700 max-w-[200px] truncate">{s.university}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.statusColor}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => navigate('/admin/students')}
                      className="h-7 px-3 bg-slate-100 hover:bg-[#6A1B2E] hover:text-white text-slate-600 text-[10px] font-extrabold rounded-lg transition-colors">
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Manage Students', icon: UserPlus, path: '/admin/students' },
          { label: 'Assign Task', icon: FilePlus, path: '/admin/tasks' },
          { label: 'Review Documents', icon: FolderOpen, path: '/admin/documents' },
          { label: 'View Reports', icon: BarChart3, path: '/admin/reports' },
        ].map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="flex flex-col items-center justify-center gap-2.5 p-4.5 bg-white border border-slate-200/70 rounded-2xl shadow-xs hover:shadow-md hover:border-[#6A1B2E]/30 hover:bg-[#6A1B2E]/5 active:scale-98 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center group-hover:bg-[#6A1B2E] transition-colors">
              <Icon className="w-5 h-5 text-[#6A1B2E] group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#6A1B2E] transition-colors">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

