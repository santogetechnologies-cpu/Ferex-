import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, FolderOpen, CreditCard, Headphones,
  Clock3, ArrowRight, Plus, Crown
} from 'lucide-react';
import { getAdminDashboardStats } from '../../lib/api/dashboard';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/roleRouter';
import { Button } from '../../components/Button';
import { PageHeader, StatTile, Section, EmptyState } from '../../components/Kit';

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

  const { students: allStudents } = useStudents();
  const { applications: allApps } = useApplications();
  const cEmail = (profile?.email || user?.email || '').toLowerCase().trim();
  const cName = (profile?.full_name || '').toLowerCase().trim();
  const dbStudents = isStaff ? allStudents.filter(s => {
    const ac = (s.assigned_counselor || '').toLowerCase().trim();
    return Boolean(ac && ((cEmail && ac.includes(cEmail)) || (cName && ac.includes(cName))));
  }) : allStudents;
  const studentIds = new Set(dbStudents.map(s => s.id));
  const dbApps = isStaff ? allApps.filter(a => studentIds.has(a.student_id)) : allApps;

  const [statCards, setStatCards] = useState([
    { label: 'Total Students', value: '0', change: 'All time', icon: Users, color: 'text-blue-600 bg-blue-50/80', trend: 'up', path: isStaff ? '/staff/students' : '/admin/students' },
    { label: 'Active Applications', value: '0', change: 'All time', icon: FileCheck, color: 'text-violet-600 bg-violet-50/80', trend: 'up', path: isStaff ? '/staff/applications' : '/admin/applications' },
    { label: 'Pending Applications', value: '0', change: 'Review Needed', icon: Clock3, color: 'text-amber-700 bg-amber-50/80', trend: 'down', path: isStaff ? '/staff/applications' : '/admin/applications' },
    { label: 'Pending Documents', value: '0', change: 'Verification Queue', icon: FolderOpen, color: 'text-orange-600 bg-orange-50/80', trend: 'down', path: isStaff ? '/staff/documents' : '/admin/documents' },
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
      path: '/admin/payment-control'
    }]),
    { label: 'Open Tickets', value: '0', change: 'Support Queue', icon: Headphones, color: 'text-red-600 bg-red-50/80', trend: 'down', path: isStaff ? '/staff/support' : '/admin/support' },
  ]);

  useEffect(() => {
    const fetchStats = () => {
      getAdminDashboardStats().then(stats => {
        if (!stats) return;
        const pendingAmount = Number(stats.pendingPaymentsAmount) || 0;
        const pendingCount = Number(stats.pendingPaymentsCount) || 0;
        const studentCount = isStaff ? dbStudents.length : (stats.totalStudents ?? 0);
        const activeAppsCount = isStaff ? dbApps.filter(a => a.status !== 'Draft' && a.status !== 'Rejected' && a.status !== 'Withdrawn').length : (stats.activeApplications ?? 0);
        const pendingAppsCount = isStaff ? dbApps.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length : (stats.pendingApplications ?? 0);
        setStatCards([
          { label: isStaff ? 'My Assigned Students' : 'Total Students', value: String(studentCount), change: isStaff ? 'My Portfolio' : 'All time', icon: Users, color: 'text-blue-600 bg-blue-50/80', trend: 'up', path: isStaff ? '/staff/students' : '/admin/students' },
          { label: isStaff ? 'My Active Applications' : 'Active Applications', value: String(activeAppsCount), change: isStaff ? 'Portfolio Queue' : 'All time', icon: FileCheck, color: 'text-violet-600 bg-violet-50/80', trend: 'up', path: isStaff ? '/staff/applications' : '/admin/applications' },
          { label: isStaff ? 'Applications Under Review' : 'Pending Applications', value: String(pendingAppsCount), change: 'Review Needed', icon: Clock3, color: 'text-amber-700 bg-amber-50/80', trend: 'down', path: isStaff ? '/staff/applications' : '/admin/applications' },
          { label: 'Pending Documents', value: String(stats.pendingDocuments ?? 0), change: 'Verification Queue', icon: FolderOpen, color: 'text-orange-600 bg-orange-50/80', trend: 'down', path: isStaff ? '/staff/documents' : '/admin/documents' },
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

  // Dynamic Weekly Activity Volume computed directly from real database application and student records
  const activityBuckets = React.useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      return { dateStr, dayLabel, count: 0 };
    });

    const incrementDate = (dateVal?: string) => {
      if (!dateVal) return;
      try {
        const itemDate = new Date(dateVal).toISOString().split('T')[0];
        const bucket = buckets.find(b => b.dateStr === itemDate);
        if (bucket) bucket.count += 1;
      } catch {}
    };

    safeApps.forEach(a => incrementDate((a as any).created_at));
    safeStudents.forEach(s => incrementDate((s as any).created_at));

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      heightPct: b.count > 0 ? Math.max(15, Math.round((b.count / maxCount) * 100)) : 8,
    }));
  }, [safeApps, safeStudents]);

  const first = (profile?.full_name || '').split(' ')[0];
  const base = isStaff ? '/staff' : '/admin';
  const peak = Math.max(...activityBuckets.map(b => b.count), 0);

  return (
    <div className="space-y-6 relative text-left pb-8">
      <PageHeader
        eyebrow={isStaff ? 'Ferex Education · Counselor' : 'Ferex Education'}
        title={first ? `Welcome back, ${first}` : 'Welcome back'}
        subtitle={isStaff ? 'Your students, applications, documents and tasks.' : 'Applications, documents, payments and your team across every student.'}
        actions={<>
          {!isStaff && isSuper && <Button variant="outline" size="md" onClick={() => navigate('/central/dashboard')} leftIcon={<Crown className="w-4 h-4 text-amber-600" />}>Central admin</Button>}
          <Button size="md" onClick={() => navigate(`${base}/tasks`)} leftIcon={isStaff ? <ClipboardList className="w-4 h-4" /> : <Plus className="w-4 h-4" />}>{isStaff ? 'My tasks' : 'New task'}</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(card => (
          <StatTile key={card.label} label={card.label} value={card.value} hint={card.change} icon={card.icon} to={card.path}
            tone={card.label.includes('Payment') ? 'brand' : card.label.includes('Ticket') ? 'rose' : card.label.includes('Document') ? 'amber' : card.label.includes('Application') ? 'violet' : card.label.includes('Task') ? 'green' : 'blue'} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section className="lg:col-span-2" title="Applications by status" hint="Across the student files you can see" action={{ label: 'Manage applications', to: `${base}/applications` }}>
          <div className="space-y-4">
            {appStatusData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-bold text-slate-900 tabular-nums">{item.value} <span className="text-slate-400 font-medium">({isNaN(item.pct) ? 0 : item.pct}%)</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${isNaN(item.pct) ? 0 : item.pct}%` }} transition={{ duration: 0.5 }} className={`h-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-3">New students and applications, last 7 days</p>
            <div className="flex items-end gap-2 h-20">
              {activityBuckets.map((bucket, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5" title={`${bucket.dayLabel}: ${bucket.count}`}>
                  <div className="w-full flex-1 flex items-end"><div className={`w-full rounded-md transition-colors ${bucket.count === peak && peak > 0 ? 'bg-[#58051E]' : 'bg-[#58051E]/20 hover:bg-[#58051E]/60'}`} style={{ height: `${Math.max(4, Math.round(bucket.heightPct * 0.56))}px` }} /></div>
                  <span className="text-[10px] font-semibold text-slate-400">{bucket.dayLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Newest students" hint="Most recent registrations" action={{ label: 'All students', to: `${base}/students` }}>
          {safeStudents.length === 0 ? <EmptyState icon={Users} title="No students yet" hint="New registrations will appear here." /> : (
            <ul className="divide-y divide-slate-100">
              {safeStudents.slice(0, 5).map((st, idx) => (
                <li key={idx}>
                  <button type="button" onClick={() => navigate(`${base}/students`)} className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group">
                    <span className="grid place-items-center w-9 h-9 rounded-full bg-[#58051E]/8 text-[#58051E] text-xs font-bold shrink-0">{(st.full_name || st.email || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900 truncate group-hover:text-[#58051E]">{st.full_name || st.email}</span>
                      <span className="block text-xs text-slate-500">{st.created_at && !isNaN(new Date(st.created_at).getTime()) ? new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recently'}</span></span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#58051E]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
};
