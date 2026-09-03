import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ClipboardList, FileCheck, FolderOpen,
  CreditCard, Headphones, BarChart3, UserCog,
  Bell, Settings, LogOut, Menu, X, ChevronDown, ChevronRight, Search, Building2, ShieldCheck, Calendar, Plane
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { getAllPaymentsAdmin } from '../lib/api/payments';

interface AdminLayoutProps { children: React.ReactNode; }

const baseMenuItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, badge: null, hasUpdate: false },
  { name: 'Students', path: '/admin/students', icon: Users, badge: null, hasUpdate: false },
  { name: 'Universities', path: '/admin/universities', icon: Building2, badge: null, hasUpdate: false },
  { name: 'Status Tracker', path: '/admin/tasks', icon: ClipboardList, badge: null, hasUpdate: false },
  { name: 'Applications', path: '/admin/applications', icon: FileCheck, badge: null, hasUpdate: false },
  { name: 'Documents Review', path: '/admin/documents', icon: FolderOpen, badge: null, hasUpdate: false },
  { name: 'NAWA Legalization', path: '/admin/nawa', icon: FileCheck, badge: null, hasUpdate: false },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard, badge: null, hasUpdate: false },
  { name: 'VFS Visa Tracker', path: '/admin/visa-tracker', icon: ShieldCheck, badge: null, hasUpdate: false },
  { name: 'Post Travel Management', path: '/admin/pre-departure', icon: Plane, badge: null, hasUpdate: false },
  { name: 'Support Tickets', path: '/admin/support', icon: Headphones, badge: null, hasUpdate: false },
  { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3, badge: null, hasUpdate: false },
  { name: 'Meetings & Planner', path: '/admin/meetings', icon: Calendar, badge: null, hasUpdate: false },
  { name: 'Notifications', path: '/admin/notifications', icon: Bell, badge: null, hasUpdate: false },
  { name: 'Settings', path: '/admin/settings', icon: Settings, badge: null, hasUpdate: false },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { notifications } = useNotifications();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);

  useEffect(() => {
    const close = () => {
      setShowProfileDropdown(false);
      setShowNotifDropdown(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const checkPendingPayments = async () => {
      try {
        const allPays = await getAllPaymentsAdmin();
        const pending = allPays.filter(p => p.status === 'Pending Verification' || p.status === 'Pending');
        setPendingPaymentsCount(pending.length);
      } catch (err) { }
    };

    checkPendingPayments();
    window.addEventListener('ferex_payment_change', checkPendingPayments);
    window.addEventListener('ferex_notification_change', checkPendingPayments);
    return () => {
      window.removeEventListener('ferex_payment_change', checkPendingPayments);
      window.removeEventListener('ferex_notification_change', checkPendingPayments);
    };
  }, []);

  const hasUnreadCategory = (categoryName: string) => {
    return notifications.some(
      (n: any) => !n.is_read && (
        n.category?.toLowerCase().includes(categoryName.toLowerCase()) ||
        n.title?.toLowerCase().includes(categoryName.toLowerCase()) ||
        n.body?.toLowerCase().includes(categoryName.toLowerCase())
      )
    );
  };

  const hasUnreadDocs = hasUnreadCategory('Document') || hasUnreadCategory('Doc') || hasUnreadCategory('Vault');
  const hasUnreadApps = hasUnreadCategory('Application') || hasUnreadCategory('App') || hasUnreadCategory('Admission');
  const hasUnreadPayments = hasUnreadCategory('Payment') || hasUnreadCategory('Pay') || hasUnreadCategory('Installment') || hasUnreadCategory('Receipt') || pendingPaymentsCount > 0;
  const hasUnreadVisa = hasUnreadCategory('Visa') || hasUnreadCategory('VFS') || hasUnreadCategory('Embassy');
  const hasUnreadNawa = hasUnreadCategory('NAWA') || hasUnreadCategory('Legalization');

  const active = baseMenuItems.find(m => location.pathname === m.path)?.name || 'Dashboard';
  const adminName = profile?.full_name || 'System Admin';
  const adminEmail = profile?.email || user?.email || 'admin@ferex.com';
  const unreadNotifs = notifications.filter(n => !n.is_read);
  const totalUnreadCount = unreadNotifs.length + pendingPaymentsCount;

  const menuItems = baseMenuItems.map(item => {
    if (item.path === '/admin/applications') return { ...item, badge: hasUnreadApps ? 'REVIEW' : null, hasUpdate: hasUnreadApps };
    if (item.path === '/admin/documents') return { ...item, badge: hasUnreadDocs ? 'NEW DOC' : null, hasUpdate: hasUnreadDocs };
    if (item.path === '/admin/payments') return { ...item, badge: hasUnreadPayments ? (pendingPaymentsCount > 0 ? `VERIFY (${pendingPaymentsCount})` : 'NEW PAYMENT') : null, hasUpdate: hasUnreadPayments };
    if (item.path === '/admin/nawa') return { ...item, badge: hasUnreadNawa ? 'NAWA' : null, hasUpdate: hasUnreadNawa };
    if (item.path === '/admin/visa-tracker') return { ...item, badge: hasUnreadVisa ? 'VFS' : null, hasUpdate: hasUnreadVisa };
    if (item.path === '/admin/notifications') return { ...item, badge: totalUnreadCount > 0 ? String(totalUnreadCount) : null, hasUpdate: totalUnreadCount > 0 };
    return item;
  });

  const handleSignOut = async () => {
    await signOut();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/#/login';
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#6A1B2E]/10 selection:text-[#6A1B2E]">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200/80 z-50 flex flex-col transition-transform duration-300 ease-out shadow-sm
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
          <Link to="/admin/dashboard" className="flex items-center gap-3 group">
            <Logo variant="compact" size="sm" subtitle="EDUCATION ADMIN" />
          </Link>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          <div className="px-3 pb-2 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Navigation</div>
          {menuItems.map((item) => {
            const isActive = item.name === active;
            const Icon = item.icon;
            const badgeValue = item.name === 'Notifications' && unreadNotifs.length > 0 ? String(unreadNotifs.length) : null;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`relative flex items-center gap-3 h-9.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 group
                  ${isActive
                    ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6A1B2E]'}`} />
                <span className="truncate flex-1 flex items-center justify-between">
                  <span>{item.name}</span>
                  {item.hasUpdate && (
                    <span className="relative flex h-2 w-2 ml-1 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </span>

                {(badgeValue || item.badge) && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 transition-colors ${isActive
                      ? 'bg-white/20 text-white'
                      : item.badge === 'VERIFY' || item.badge === 'REVIEW'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 font-black'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {badgeValue || item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Info */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-xs font-black shadow-xs">
                {adminName[0]?.toUpperCase() || 'A'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-slate-900 truncate">{adminName}</p>
              <p className="text-[9.5px] font-semibold text-slate-400 truncate">{adminEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Sticky Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30 shadow-xs">

          <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link to="/admin/dashboard" className="hover:text-slate-700 transition-colors flex items-center gap-1 text-slate-500 font-semibold">
              <span>Admin Console</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{active}</span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">

            {/* Search Input */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources, students..."
                className="h-9 w-60 pl-9 pr-8 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/40 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
              />
            </div>

            {/* Quick Notification Bell */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  setShowProfileDropdown(false);
                }}
                className="relative p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-3 z-50"
                  >
                    <div className="flex items-center justify-between px-2 pb-2.5 border-b border-slate-100">
                      <span className="text-xs font-extrabold text-slate-900">Notifications ({unreadNotifs.length})</span>
                      <button onClick={() => navigate('/admin/notifications')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">View All</button>
                    </div>
                    <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold py-4 text-center">No notifications available.</p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div key={n.id} className="flex gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => navigate('/admin/notifications')}>
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-slate-300' : 'bg-red-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{n.body}</p>
                              <span className="text-[9px] font-bold text-slate-400">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifDropdown(false);
                }}
                className="flex items-center gap-2.5 h-9.5 px-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors"
              >
                <div className="relative">
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                    {adminName[0]?.toUpperCase() || 'A'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">{adminName}</span>
                  <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">Administrator</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-900">{adminName}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">{adminEmail}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => navigate('/admin/settings')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                      </button>
                      <button
                        onClick={() => navigate('/admin/notifications')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-slate-400" /> Notifications
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content with smooth route transition */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
