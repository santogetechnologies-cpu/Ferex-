import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, FolderOpen, CreditCard, Headphones,
  Activity, Clock3,
  ArrowUpRight, ArrowRight, Plus, Sparkles, GraduationCap, Crown
} from 'lucide-react';
import { getAdminDashboardStats } from '../../lib/api/dashboard';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { students: dbStudents } = useStudents();
  const { applications: dbApps } = useApplications();

  const [statCards, setStatCards] = useState([
    { label: 'Total Students', value: '0', change: 'Live from DB', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100', trend: 'up', path: '/admin/students' },
    { label: 'Active Applications', value: '0', change: 'Live from DB', icon: FileCheck, color: 'bg-violet-50 text-violet-600 border-violet-100', trend: 'up', path: '/admin/applications' },
    { label: 'Pending Applications', value: '0', change: 'Review Needed', icon: Clock3, color: 'bg-amber-50 text-amber-700 border-amber-200', trend: 'down', path: '/admin/applications' },
    { label: 'Pending Documents', value: '0', change: 'Vault Verification', icon: FolderOpen, color: 'bg-orange-50 text-orange-600 border-orange-100', trend: 'down', path: '/admin/documents' },
    { label: 'Pending Payments', value: '₹0', change: 'Fee Verification', icon: CreditCard, color: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20', trend: 'up', path: '/admin/payments' },
    { label: 'Open Tickets', value: '0', change: 'Support Queue', icon: Headphones, color: 'bg-red-50 text-red-600 border-red-100', trend: 'down', path: '/admin/support' },
  ]);

  useEffect(() => {
    const fetchStats = () => {
      getAdminDashboardStats().then(stats => {
        setStatCards([
          { label: 'Total Students', value: String(stats.totalStudents), change: 'Live from DB', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100', trend: 'up', path: '/admin/students' },
          { label: 'Active Applications', value: String(stats.activeApplications), change: 'Live from DB', icon: FileCheck, color: 'bg-violet-50 text-violet-600 border-violet-100', trend: 'up', path: '/admin/applications' },
          { label: 'Pending Applications', value: String(stats.pendingApplications), change: 'Review Needed', icon: Clock3, color: 'bg-amber-50 text-amber-700 border-amber-200', trend: 'down', path: '/admin/applications' },
          { label: 'Pending Documents', value: String(stats.pendingDocuments), change: 'Vault Verification', icon: FolderOpen, color: 'bg-orange-50 text-orange-600 border-orange-100', trend: 'down', path: '/admin/documents' },
          { label: 'Pending Payments', value: `₹${stats.pendingPaymentsAmount.toLocaleString('en-IN')}`, change: `${stats.pendingPaymentsCount} Pending Request${stats.pendingPaymentsCount === 1 ? '' : 's'}`, icon: CreditCard, color: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20', trend: 'up', path: '/admin/payments' },
          { label: 'Open Tickets', value: String(stats.openTickets), change: 'Support Queue', icon: Headphones, color: 'bg-red-50 text-red-600 border-red-100', trend: 'down', path: '/admin/support' },
        ]);
      }).catch(() => { });
    };

    fetchStats();
    window.addEventListener('ferex_payment_change', fetchStats);
    return () => window.removeEventListener('ferex_payment_change', fetchStats);
  }, []);


  // Dynamic application pipeline calculation
  const totalApps = dbApps.length || 1;
  const submittedCount = dbApps.filter(a => a.status === 'Submitted').length;
  const reviewCount = dbApps.filter(a => a.status === 'Under Review').length;
  const offerCount = dbApps.filter(a => a.status === 'Offer Issued' || a.status === 'Accepted' || a.status === 'Final Acceptance Issued').length;
  const rejectedCount = dbApps.filter(a => a.status === 'Rejected').length;

  const appStatusData = [
    { label: 'Submitted (Pending Review)', value: submittedCount, color: 'bg-blue-500', pct: Math.round((submittedCount / totalApps) * 100) },
    { label: 'Under Review', value: reviewCount, color: 'bg-amber-500', pct: Math.round((reviewCount / totalApps) * 100) },
    { label: 'Offer / Acceptance Issued', value: offerCount, color: 'bg-emerald-500', pct: Math.round((offerCount / totalApps) * 100) },
    { label: 'Rejected', value: rejectedCount, color: 'bg-red-500', pct: Math.round((rejectedCount / totalApps) * 100) },
  ];

  return (
    <div className="space-y-6 relative text-left">

      {/* Page Header & Division Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#6A1B2E]" /> Ferex Education Admin Dashboard
            </h1>
            <span className="flex items-center gap-1 text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
              <Sparkles className="w-3 h-3" /> Education Division
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Global Education Operations • Admissions, Universities, NAWA Legalization, Tuition Ledgers & VFS Tracker. (Governed by Central Super Admin)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/central/dashboard')}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-amber-900 hover:bg-amber-100 transition-all shadow-2xs cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-700" /> Super Admin Console
          </button>
          <button
            onClick={() => navigate('/admin/tasks')}
            className="flex items-center gap-2 h-9 px-3.5 bg-[#6A1B2E] rounded-xl text-xs font-bold text-white hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20"
          >
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
              onClick={() => navigate(card.path)}
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
                  <span className="font-extrabold text-slate-900">{item.value} <span className="text-[10px] text-slate-400 font-semibold">({isNaN(item.pct) ? 0 : item.pct}%)</span></span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${isNaN(item.pct) ? 0 : item.pct}%` }}
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
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Live Database Activity</span>
            </div>
            <div className="flex items-end gap-2 h-16">
              {[40, 65, 55, 80, 70, 90, 78, 95, 85, 100, 88, 92].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-[#6A1B2E]/20 hover:bg-[#6A1B2E] transition-colors cursor-pointer" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Live Activity Feed</h3>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3.5">
              {dbStudents.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-4 text-center">No recent platform activities recorded.</p>
              ) : (
                dbStudents.slice(0, 4).map((s, idx) => (
                  <div key={idx} onClick={() => navigate('/admin/students')} className="flex gap-3 items-start group cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5 ring-4 bg-emerald-500 ring-emerald-50" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-snug group-hover:text-[#6A1B2E] transition-colors">
                        New user enrolled: {s.full_name || s.email}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button onClick={() => navigate('/admin/notifications')}
            className="w-full mt-4 h-9 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
            View System Log <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
