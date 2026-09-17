import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, FolderOpen, CreditCard, Headphones,
  Activity, Clock3, ArrowUpRight, ArrowRight, Plus,
  GraduationCap, Crown
} from 'lucide-react';
import { getAdminDashboardStats } from '../../lib/api/dashboard';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/roleRouter';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

import { useTasks } from '../../hooks/useTasks';
import { ClipboardList } from 'lucide-react';

interface AdminDashboardProps {
  isStaff?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isStaff = false }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const localSavedUser = (() => {
    try {
      const r = localStorage.getItem('ferex_user');
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  })();
  const userRole = (profile?.role || user?.role || user?.user_metadata?.role || localSavedUser?.role || '').toLowerCase().trim();
  const isSuper = isSuperAdmin(userRole, profile?.email || user?.email || localSavedUser?.email);

  const counselorIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };
  const { tasks: assignedTasks } = useTasks(isStaff ? counselorIdentity : undefined);

  const { students: dbStudents } = useStudents();
  const { applications: dbApps } = useApplications();

  const [statCards, setStatCards] = useState([
    { label: 'Total Students', value: '0', change: 'Live from DB', icon: Users, color: 'text-blue-600 bg-blue-50/80', trend: 'up', path: isStaff ? '/staff/students' : '/admin/students' },
    { label: 'Active Applications', value: '0', change: 'Live from DB', icon: FileCheck, color: 'text-violet-600 bg-violet-50/80', trend: 'up', path: isStaff ? '/staff/applications' : '/admin/applications' },
    { label: 'Pending Applications', value: '0', change: 'Review Needed', icon: Clock3, color: 'text-amber-700 bg-amber-50/80', trend: 'down', path: isStaff ? '/staff/applications' : '/admin/applications' },
    { label: 'Pending Documents', value: '0', change: 'Vault Verification', icon: FolderOpen, color: 'text-orange-600 bg-orange-50/80', trend: 'down', path: isStaff ? '/staff/documents' : '/admin/documents' },
    ...(isStaff ? [{
      label: 'Assigned Tasks',
      value: String(assignedTasks?.length || 0),
      change: 'Assigned by Admin',
      icon: ClipboardList,
      color: 'text-emerald-700 bg-emerald-50/80',
      trend: 'up',
      path: '/staff/tasks'
    }] : [{
      label: 'Pending Payments',
      value: '₹0',
      change: 'Fee Verification',
      icon: CreditCard,
      color: 'text-[#58051E] bg-[#58051E]/8',
      trend: 'up',
      path: '/admin/payments'
    }]),
    { label: 'Open Tickets', value: '0', change: 'Support Queue', icon: Headphones, color: 'text-red-600 bg-red-50/80', trend: 'down', path: isStaff ? '/staff/support' : '/admin/support' },
  ]);

  useEffect(() => {
    const fetchStats = () => {
      getAdminDashboardStats().then(stats => {
        if (!stats) return;
        const pendingAmount = Number(stats.pendingPaymentsAmount) || 0;
        const pendingCount = Number(stats.pendingPaymentsCount) || 0;
        setStatCards([
          { label: 'Total Students', value: String(stats.totalStudents ?? 0), change: 'Live from DB', icon: Users, color: 'text-blue-600 bg-blue-50/80', trend: 'up', path: isStaff ? '/staff/students' : '/admin/students' },
          { label: 'Active Applications', value: String(stats.activeApplications ?? 0), change: 'Live from DB', icon: FileCheck, color: 'text-violet-600 bg-violet-50/80', trend: 'up', path: isStaff ? '/staff/applications' : '/admin/applications' },
          { label: 'Pending Applications', value: String(stats.pendingApplications ?? 0), change: 'Review Needed', icon: Clock3, color: 'text-amber-700 bg-amber-50/80', trend: 'down', path: isStaff ? '/staff/applications' : '/admin/applications' },
          { label: 'Pending Documents', value: String(stats.pendingDocuments ?? 0), change: 'Vault Verification', icon: FolderOpen, color: 'text-orange-600 bg-orange-50/80', trend: 'down', path: isStaff ? '/staff/documents' : '/admin/documents' },
          ...(isStaff ? [{
            label: 'Assigned Tasks',
            value: String(assignedTasks?.length || 0),
            change: 'Assigned by Admin',
            icon: ClipboardList,
            color: 'text-emerald-700 bg-emerald-50/80',
            trend: 'up',
            path: '/staff/tasks'
          }] : [{
            label: 'Pending Payments',
            value: `₹${pendingAmount.toLocaleString('en-IN')}`,
            change: `${pendingCount} Pending Request${pendingCount === 1 ? '' : 's'}`,
            icon: CreditCard,
            color: 'text-[#58051E] bg-[#58051E]/8',
            trend: 'up',
            path: '/admin/payments'
          }]),
          { label: 'Open Tickets', value: String(stats.openTickets ?? 0), change: 'Support Queue', icon: Headphones, color: 'text-red-600 bg-red-50/80', trend: 'down', path: isStaff ? '/staff/support' : '/admin/support' },
        ]);
      }).catch(() => { });
    };

    fetchStats();
    window.addEventListener('ferex_payment_change', fetchStats);
    return () => window.removeEventListener('ferex_payment_change', fetchStats);
  }, [isStaff, assignedTasks?.length]);

  // Dynamic application pipeline calculation
  const safeApps = dbApps || [];
  const safeStudents = dbStudents || [];
  const totalApps = safeApps.length || 1;
  const submittedCount = safeApps.filter(a => a.status === 'Submitted').length;
  const reviewCount = safeApps.filter(a => a.status === 'Under Review').length;
  const offerCount = safeApps.filter(a => a.status === 'Offer Issued' || a.status === 'Accepted' || a.status === 'Final Acceptance Issued').length;
  const rejectedCount = safeApps.filter(a => a.status === 'Rejected').length;

  const appStatusData = [
    { label: 'Submitted (Pending Review)', value: submittedCount, color: 'bg-blue-600', pct: Math.round((submittedCount / totalApps) * 100) },
    { label: 'Under Review', value: reviewCount, color: 'bg-amber-500', pct: Math.round((reviewCount / totalApps) * 100) },
    { label: 'Offer / Acceptance Issued', value: offerCount, color: 'bg-emerald-600', pct: Math.round((offerCount / totalApps) * 100) },
    { label: 'Rejected', value: rejectedCount, color: 'bg-red-500', pct: Math.round((rejectedCount / totalApps) * 100) },
  ];

  return (
    <div className="space-y-6 relative text-left pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isStaff ? 'Admissions Counselor Workspace' : 'Education Admin Console'}
            </h1>
            <Badge variant="brand">{isStaff ? 'Admissions Counselor' : 'Education Division'}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            {isStaff
              ? 'Student dossiers, university admissions pipeline, assigned tasks, and document compliance.'
              : 'Admissions pipeline, multi-country legalization dossiers, tuition ledgers, and consular mobility tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isStaff && isSuper && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/central/dashboard')}
              leftIcon={<Crown className="w-3.5 h-3.5 text-amber-600" />}
            >
              Super Admin Console
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate(isStaff ? '/staff/tasks' : '/admin/tasks')}
            leftIcon={isStaff ? <ClipboardList className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          >
            {isStaff ? 'My Assigned Tasks' : 'New Task'}
          </Button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.15 }}
              onClick={() => navigate(card.path)}
              className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors`} />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Application Status Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Application Pipeline Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status breakdown across active student dossiers</p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate(isStaff ? '/staff/applications' : '/admin/applications')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Manage Applications
            </Button>
          </div>

          <div className="space-y-3.5">
            {appStatusData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="font-semibold text-slate-900">
                    {item.value} <span className="text-[11px] text-slate-400 font-normal">({isNaN(item.pct) ? 0 : item.pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${isNaN(item.pct) ? 0 : item.pct}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Activity Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weekly Activity Volume</p>
              <Badge variant="success" dot>Live Sync</Badge>
            </div>
            <div className="flex items-end gap-2 h-14">
              {[40, 65, 55, 80, 70, 90, 78, 95, 85, 100, 88, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-[#58051E]/15 hover:bg-[#58051E] transition-colors cursor-pointer"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Live Intake Activity</h3>
              <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200/60">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-3">
              {safeStudents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No recent platform activities recorded.</p>
              ) : (
                safeStudents.slice(0, 4).map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(isStaff ? '/staff/students' : '/admin/students')}
                    className="flex gap-2.5 items-start group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-800 leading-snug group-hover:text-[#58051E] transition-colors">
                        New student registered: {s.full_name || s.email}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.created_at && !isNaN(new Date(s.created_at).getTime()) ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(isStaff ? '/staff/notifications' : '/admin/notifications')}
            className="w-full mt-4"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            System Audit Log
          </Button>
        </div>
      </div>
    </div>
  );
};
