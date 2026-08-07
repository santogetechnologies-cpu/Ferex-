import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, CreditCard, ShieldCheck, TrendingUp, ArrowUpRight,
  ChevronRight, DollarSign, CheckCircle2, RefreshCw, Shield,
  AlertTriangle, FileText, Activity, Clock
} from 'lucide-react';
import { Card } from '../../components/Card';

export const CentralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('Just now (15:03)');
  const [activeTab, setActiveTab] = useState<'approvals' | 'alerts' | 'payments' | 'docs' | 'meetings'>('approvals');

  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'APP-101', title: 'Warsaw Batch Fee Wire (₹4.8L)', type: 'Financial Payout', time: '10m ago' },
    { id: 'APP-102', title: 'Ashly NAWA Transcript Audit', type: 'Document Clearance', time: '35m ago' },
    { id: 'APP-103', title: 'Senior Counselor Role: Vikram Singh', type: 'Role Privilege', time: '1h ago' },
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = (id: string, title: string) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
    showToastMsg(`Approved: ${title}`);
  };

  const handleRefreshSync = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(timeStr);
    showToastMsg('Executive metrics re-synced successfully');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left antialiased"
    >
      {/* Toast Feedback */}
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

      {/* 1. Executive Command Center Hero Header */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-7 shadow-xl border border-[#6A1B2E]/30">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <svg width="300" height="300" viewBox="0 0 100 100" fill="none">
              <path d="M50 5 L92 23 L50 41 L8 23 Z" fill="white" />
              <path d="M30 36.5 C30 47.5, 70 47.5, 70 36.5 C70 42 63.5 46.5, 50 46.5 C36.5 46.5, 30 42, 30 36.5 Z" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                  Executive Command Center
                </span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Operational
                </span>
                <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                  Last Sync: {lastSyncTime}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Ferex Education Global Headquarters
              </h1>
              <p className="text-xs md:text-sm text-white/85 font-semibold leading-relaxed">
                Super Admin Control • Overseeing 1,480 active students, 120 partner European institutions, and ₹4.82 Cr annual fee volume across Poland, Germany & Netherlands.
              </p>
            </div>

            {/* CTAs with SOLID HIGH-CONTRAST VISIBLE TEXT (NO HOVER DEPENDENCY) */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => navigate('/central/reports')}
                className="h-9.5 px-4 rounded-xl text-xs font-extrabold text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-1.5 active:scale-98 cursor-pointer"
              >
                Executive Reports <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/central/admins')}
                className="h-9.5 px-4 rounded-xl text-xs font-extrabold text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs flex items-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-white" /> Manage Staff
              </button>

              <button
                onClick={handleRefreshSync}
                className="p-2.5 rounded-xl text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
                title="Sync Dashboard Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Executive KPI Cards with Structured Enterprise Metadata (No Decorative Sparklines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Enrolled Students',
            value: '1,480',
            growth: '+14%',
            growthColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            icon: Users,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            metaLeft: '+12 Today',
            metaLeftStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            metaRight: '92% of Target',
            sub: 'Updated 2m ago · Goal: 1,600',
            path: '/central/students',
          },
          {
            title: 'Gross Annual Volume',
            value: '₹4.82 Cr',
            growth: '+22% YoY',
            growthColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            icon: CreditCard,
            color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20',
            metaLeft: '₹84L This Mo',
            metaLeftStyle: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20',
            metaRight: '88% Cleared',
            sub: 'Updated Just now · Ledgers verified',
            path: '/central/financials',
          },
          {
            title: 'Partner Universities',
            value: '120',
            growth: '+18% Alliances',
            growthColor: 'text-blue-700 bg-blue-50 border-blue-200',
            icon: GraduationCap,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            metaLeft: '+4 This Qtr',
            metaLeftStyle: 'text-blue-700 bg-blue-50 border-blue-200',
            metaRight: '98 Active EU',
            sub: 'Target: 135 European Campuses',
            path: '/central/universities',
          },
          {
            title: 'Counselor Quotas',
            value: '24 Staff',
            growth: '100% SLA',
            growthColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            icon: ShieldCheck,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            metaLeft: '99.4% SLA Rate',
            metaLeftStyle: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            metaRight: '120 St/Staff',
            sub: 'Zero unresolved SLA backlogs',
            path: '/central/admins',
          },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} onClick={() => navigate(stat.path)}>
            <Card className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${stat.growthColor}`}>
                    <TrendingUp className="w-3 h-3" /> {stat.growth}
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
              </div>

              {/* Refined Enterprise KPI Metadata Area (Clean Typography & Small Badges, No Sparklines) */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${stat.metaLeftStyle}`}>
                    {stat.metaLeft}
                  </span>
                  <span className="text-[10.5px] font-extrabold text-slate-700">
                    {stat.metaRight}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 truncate">
                  {stat.sub}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 3. Multi-Widget Analytics Grid (2 Columns on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Columns: Multi-Widget Enterprise Analytics */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">

          {/* Widget 1: Revenue Trend Analytics */}
          <Card className="p-6 border border-slate-200/70 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Revenue Velocity & Financial Forecast</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">2026 Monthly tuition & fee ledger flow (₹ In Lakhs)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-3 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                  Forecast: ₹6.0 Cr
                </span>
              </div>
            </div>

            {/* SVG Line Chart */}
            <div className="h-[220px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rev-grad-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                <path d="M 0 170 Q 100 130, 200 110 T 400 45 T 500 30 L 500 200 L 0 200 Z" fill="url(#rev-grad-2)" />
                <path d="M 0 170 Q 100 130, 200 110 T 400 45 T 500 30" fill="none" stroke="#6A1B2E" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="200" cy="110" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="45" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
              </svg>

              <div className="absolute top-[25px] left-[360px] bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-md pointer-events-none select-none">
                Q3 Peak: ₹84.5 Lakhs
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
              <span>Q1 Jan-Mar</span>
              <span>Q2 Apr-Jun</span>
              <span>Q3 Jul-Sep (Active)</span>
              <span>Q4 Oct-Dec (Projected)</span>
            </div>
          </Card>

          {/* Widget 2 & 3 Dual Row: Applications by Country & University Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Widget 2: Applications by Country */}
            <Card className="p-5 border border-slate-200/70 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                Applications by Country
                <span className="text-[10px] font-bold text-slate-400">Total: 1,480</span>
              </h3>
              <div className="space-y-3.5 text-xs font-semibold text-slate-700">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold">🇵🇱 Poland (Warsaw, WUT)</span>
                    <span className="font-extrabold text-slate-900">640 (43%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6A1B2E] rounded-full" style={{ width: '43%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold">🇩🇪 Germany (TU Berlin, TUM)</span>
                    <span className="font-extrabold text-slate-900">480 (32%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '32%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="flex items-center gap-1.5 font-bold">🇳🇱 Netherlands (UvA, Leiden)</span>
                    <span className="font-extrabold text-slate-900">360 (25%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Widget 3: Target University Distribution */}
            <Card className="p-5 border border-slate-200/70 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
                Partner University Distribution
                <span className="text-[10px] font-extrabold text-[#6A1B2E]">Top 5</span>
              </h3>
              <div className="space-y-2.5 text-xs font-semibold">
                {[
                  { name: 'University of Warsaw', count: '640 Students', color: 'bg-red-500' },
                  { name: 'TU Berlin', count: '480 Students', color: 'bg-indigo-500' },
                  { name: 'University of Amsterdam', count: '360 Students', color: 'bg-sky-500' },
                  { name: 'Leiden University', count: '190 Students', color: 'bg-amber-500' },
                  { name: 'University of Gdansk', count: '120 Students', color: 'bg-emerald-500' },
                ].map((uni, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${uni.color}`} />
                      <span className="font-bold text-slate-900 truncate max-w-[140px]">{uni.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-700">{uni.count}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Widget 4: Top Performing Counselors */}
          <Card className="p-6 border border-slate-200/70 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              Top Performing Staff & Counselors
              <span className="text-[10px] font-extrabold text-[#6A1B2E] hover:underline cursor-pointer" onClick={() => navigate('/central/admins')}>
                Manage Team
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                    <th className="pb-2">Counselor</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Assigned Students</th>
                    <th className="pb-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {[
                    { name: 'Rahul Mehta', role: 'Senior Admissions Officer', count: '120 Students', rating: '4.9 ★' },
                    { name: 'Anita Roy', role: 'Visa & Document Officer', count: '95 Students', rating: '4.8 ★' },
                    { name: 'Adam Kowalski', role: 'Regional Rep (Warsaw)', count: '210 Students', rating: '4.9 ★' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">{row.name}</td>
                      <td className="py-2.5 text-slate-500">{row.role}</td>
                      <td className="py-2.5 font-extrabold text-slate-800">{row.count}</td>
                      <td className="py-2.5 text-right font-extrabold text-amber-600">{row.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </motion.div>

        {/* Right Panel: Executive Activity Center */}
        <motion.div variants={itemVariants} className="space-y-6 text-left">

          {/* Executive Activity Center Widget */}
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs">

            {/* Header with Navigation Pills */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-[#6A1B2E] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Executive Activity Center
              </h3>
            </div>

            {/* Multi-Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-hide">
              {[
                { key: 'approvals', label: 'Approvals' },
                { key: 'alerts', label: 'Alerts' },
                { key: 'payments', label: 'Payments' },
                { key: 'docs', label: 'Docs' },
                { key: 'meetings', label: 'Meetings' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition-all whitespace-nowrap cursor-pointer ${activeTab === t.key ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="space-y-3">
              {activeTab === 'approvals' && (
                <div>
                  {pendingApprovals.length > 0 ? (
                    pendingApprovals.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 mb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">{item.id} · {item.type}</span>
                            <h4 className="text-xs font-black text-slate-900 mt-0.5">{item.title}</h4>
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">{item.time}</span>
                        </div>
                        <button
                          onClick={() => handleApprove(item.id, item.title)}
                          className="w-full h-7 bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer"
                        >
                          Approve Now
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      All approvals cleared for today!
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> High Priority SLA Alert
                    </div>
                    <p className="text-[11px] font-semibold text-red-600 mt-1">
                      2 visa appointment slots for Embassy of Poland require approval.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-800">
                      <Clock className="w-3.5 h-3.5" /> Audit Warning
                    </div>
                    <p className="text-[11px] font-semibold text-amber-700 mt-1">
                      NAWA transcript batch evaluation pending verification.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {[
                    { id: 'TXN-9021', student: 'Ashly', amount: '₹15,000', status: 'Completed' },
                    { id: 'TXN-9022', student: 'Rahul Mehta', amount: '₹4,80,000', status: 'Completed' },
                  ].map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">{p.student}</div>
                        <span className="text-[9px] font-semibold text-slate-400">{p.id}</span>
                      </div>
                      <span className="font-black text-[#6A1B2E]">{p.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-2">
                  {[
                    { name: 'Ashly_Passport_Scan.pdf', type: 'Identity' },
                    { name: 'Ashly_IELTS_Scorecard.pdf', type: 'Language' },
                  ].map((d, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#6A1B2E]" />
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">{d.name}</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'meetings' && (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-black text-slate-900">
                      <span>Executive Board Briefing</span>
                      <span className="text-[9px] text-[#6A1B2E]">16:00</span>
                    </div>
                    <p className="text-[10.5px] font-semibold text-slate-500 mt-1">Reviewing European Q3 Intake & University Alliances</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Executive Quick Action Cards */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Executive Quick Control
            </h3>
            <div className="space-y-3">
              {[
                { title: 'Add Partner University', desc: 'Expand European campus alliances', path: '/central/education', icon: GraduationCap },
                { title: 'Configure Staff Roles', desc: 'Set RBAC permissions for counselors', path: '/central/roles', icon: ShieldCheck },
                { title: 'Authorize Batch Payout', desc: 'Release tuition transfers to partner accounts', path: '/central/payments', icon: DollarSign },
                { title: 'System Security Audit', desc: 'Inspect IP audit trail & 2FA status', path: '/central/activity', icon: Shield },
              ].map((act, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(act.path)}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-[#6A1B2E]/40 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                      <act.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">{act.title}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-tight">{act.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6A1B2E] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </Card>

          {/* Real-time Audit Activity Stream */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              Central Audit Log
              <span className="text-[10px] font-extrabold text-[#6A1B2E] hover:underline cursor-pointer" onClick={() => navigate('/central/activity')}>
                View All
              </span>
            </h3>

            <div className="relative border-l border-slate-200/80 pl-4 py-1 space-y-4 select-none">
              {[
                { time: '2m ago', title: 'Batch Fee Payment Cleared', desc: '₹4.8L transfer to Warsaw account.', color: 'bg-emerald-500' },
                { time: '18m ago', title: 'New Admin Registered', desc: 'Added Rahul Mehta as Senior Counselor.', color: 'bg-blue-500' },
                { time: '1h ago', title: 'Security 2FA Enforced', desc: 'Global 2FA policy active across staff.', color: 'bg-[#6A1B2E]' },
              ].map((log, idx) => (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${log.color}`} />
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase">{log.time}</span>
                  <h4 className="text-xs font-black text-slate-800 mt-0.5">{log.title}</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">{log.desc}</p>
                </div>
              ))}
            </div>
          </Card>

        </motion.div>

      </div>
    </motion.div>
  );
};
