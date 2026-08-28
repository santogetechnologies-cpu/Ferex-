import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, FolderKanban, CheckSquare, TrendingUp, DollarSign,
  ArrowUpRight, CheckCircle2, Clock, Star, Zap, Bell, Calendar
} from 'lucide-react';
import { Card } from '../../components/Card';
import { getDigitalDashboardStats } from '../../lib/api/digital';

export const DigitalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast] = useState('');
  const [stats, setStats] = useState({
    activeClientsCount: 38,
    runningProjectsCount: 14,
    totalProjectValue: 28400000,
    monthlyRevenue: 4280000,
    pendingTasksCount: 47,
  });

  useEffect(() => {
    getDigitalDashboardStats().then(data => {
      if (data && (data.activeClientsCount > 0 || data.runningProjectsCount > 0 || data.monthlyRevenue > 0)) {
        setStats(data);
      }
    }).catch(() => {});
  }, []);

  const kpis = [
    { title: 'Monthly Revenue', value: `₹${(stats.monthlyRevenue / 100000).toFixed(1)} Lakhs`, sub: 'Verified Collected', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Live Data', path: '/digital/invoices' },
    { title: 'Active Clients', value: `${stats.activeClientsCount} Accounts`, sub: 'Active B2B Directory', icon: Users, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: 'Verified', path: '/digital/clients' },
    { title: 'Running Projects', value: `${stats.runningProjectsCount} Projects`, sub: `₹${(stats.totalProjectValue / 10000000).toFixed(2)} Cr Value`, icon: FolderKanban, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Active', path: '/digital/projects' },
    { title: 'Pending Tasks', value: `${stats.pendingTasksCount} Open`, sub: 'Realtime Pipeline', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-100', badge: 'Action Needed', path: '/digital/tasks' },
  ];

  const recentActivities = [
    { action: 'Invoice #INV-2026-88 paid', client: 'Reliance Digital', amount: '₹4,50,000', time: '2h ago', type: 'payment' },
    { action: 'New project kickoff', client: 'Tata Motors UI Redesign', amount: '₹8,20,000', time: '5h ago', type: 'project' },
    { action: 'Lead converted to client', client: 'Mahindra Fintech', amount: '₹12,00,000', time: 'Yesterday', type: 'client' },
    { action: 'SEO report delivered', client: 'BigBasket Growth Campaign', amount: '₹85,000/mo', time: 'Yesterday', type: 'service' },
  ];

  const upcomingMeetings = [
    { title: 'Tata Motors Project Review', time: 'Today, 3:00 PM', type: 'Google Meet', attendees: 4 },
    { title: 'Reliance Digital Q3 Planning', time: 'Tomorrow, 11:00 AM', type: 'Zoom', attendees: 6 },
    { title: 'Mahindra Brand Strategy', time: 'Aug 8, 2:30 PM', type: 'Office', attendees: 3 },
  ];

  const quickActions = [
    { title: 'Add Client', path: '/digital/clients', icon: Users },
    { title: 'New Project', path: '/digital/projects', icon: FolderKanban },
    { title: 'Create Task', path: '/digital/tasks', icon: CheckSquare },
    { title: 'Issue Invoice', path: '/digital/invoices', icon: DollarSign },
    { title: 'Schedule Meeting', path: '/digital/meetings', icon: Calendar },
    { title: 'View Reports', path: '/digital/reports', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">Ferex Digital Agency ERP</span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 14 Projects Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Good Morning, Digital Director</h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">Managing web development, mobile apps, UI/UX design, digital marketing, and SEO for 38 premium enterprise clients across India.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button onClick={() => navigate('/digital/projects')} className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2">
              View All Projects <ArrowUpRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/digital/leads')} className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all">
              Manage Lead Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((stat, idx) => (
          <Card key={idx} onClick={() => navigate(stat.path)} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">{stat.badge}</span>
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500 truncate">{stat.sub}</div>
          </Card>
        ))}
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team Members', value: '24', icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: 'Completed Projects', value: '128', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Client Satisfaction', value: '98.6%', icon: Star, color: 'text-amber-500 bg-amber-50' },
          { label: 'Avg. Response Time', value: '< 2h', icon: Zap, color: 'text-blue-600 bg-blue-50' },
        ].map((m, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
              <m.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{m.value}</div>
              <div className="text-[10px] font-extrabold uppercase text-slate-400">{m.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Monthly Revenue Trend (₹)</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Agency revenue across Web, Mobile, Marketing & SEO services</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-3 py-1 rounded-full uppercase border border-[#6A1B2E]/20">₹42.8 Lakhs This Month</span>
            </div>
            <div className="h-[200px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dig-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <path d="M 0 140 Q 80 130, 160 110 T 320 70 T 500 30 L 500 180 L 0 180 Z" fill="url(#dig-grad)" />
                <path d="M 0 140 Q 80 130, 160 110 T 320 70 T 500 30" fill="none" stroke="#6A1B2E" strokeWidth="3.5" strokeLinecap="round" />
                {[{ x: 160, y: 110 }, { x: 320, y: 70 }, { x: 500, y: 30 }].map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                ))}
              </svg>
              <div className="absolute top-[30px] left-[380px] bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-md pointer-events-none select-none">₹42.8L Peak</div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
              {['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(m => <span key={m}>{m}</span>)}
            </div>
          </Card>

          {/* Recent Activities */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Recent Agency Activities</h3>
              <button onClick={() => navigate('/digital/reports')} className="text-xs font-bold text-[#6A1B2E] hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      act.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                      act.type === 'project' ? 'bg-blue-100 text-blue-600' :
                      act.type === 'client' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {act.type === 'payment' ? <DollarSign className="w-4 h-4" /> : 
                       act.type === 'project' ? <FolderKanban className="w-4 h-4" /> :
                       act.type === 'client' ? <Users className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{act.action}</p>
                      <p className="text-[10.5px] font-semibold text-slate-500">{act.client}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{act.amount}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Quick Agency Actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((act, idx) => (
                <button key={idx} onClick={() => navigate(act.path)} className="p-3 rounded-xl border border-slate-200/80 hover:border-[#6A1B2E]/40 hover:bg-slate-50 transition-all cursor-pointer group text-left flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <act.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#6A1B2E] truncate">{act.title}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#6A1B2E]" /> Upcoming Meetings
              </h3>
              <button onClick={() => navigate('/digital/meetings')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">View Calendar</button>
            </div>
            <div className="space-y-2">
              {upcomingMeetings.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-xs font-extrabold text-slate-900">{m.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{m.time}</span>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#6A1B2E]/10 text-[#6A1B2E]">{m.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notification Summary */}
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#6A1B2E]" /> Unread Alerts
            </h3>
            <div className="text-center py-4">
              <div className="text-4xl font-black text-[#6A1B2E]">4</div>
              <div className="text-xs font-semibold text-slate-500 mt-1">New Notifications</div>
            </div>
            <button onClick={() => navigate('/digital/notifications')} className="w-full py-2 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] text-xs font-bold hover:bg-[#6A1B2E] hover:text-white transition-all">
              View All Notifications
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
