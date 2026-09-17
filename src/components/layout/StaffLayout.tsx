import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ClipboardList, FileCheck, FolderOpen,
  Headphones, GraduationCap, Bell, LogOut, Menu, X, ChevronRight,
  Search, Building2, ShieldCheck, Calendar, Plane, FileText
} from 'lucide-react';
import { Logo } from '../Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface StaffLayoutProps {
  children: React.ReactNode;
}

const baseStaffMenuItems = [
  { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'Students', path: '/staff/students', icon: Users },
  { name: 'Universities', path: '/staff/universities', icon: Building2 },
  { name: 'Status Tracker', path: '/staff/tasks', icon: ClipboardList },
  { name: 'Applications', path: '/staff/applications', icon: FileCheck },
  { name: 'Offer Letters', path: '/staff/offers', icon: FileText },
  { name: 'Documents Review', path: '/staff/documents', icon: FolderOpen },
  { name: 'VFS Visa Tracker', path: '/staff/visa-tracker', icon: ShieldCheck },
  { name: 'Pre-Departure', path: '/staff/pre-departure', icon: Plane },
  { name: 'Support Tickets', path: '/staff/support', icon: Headphones },
  { name: 'Meetings & Planner', path: '/staff/meetings', icon: Calendar },
  { name: 'Notifications', path: '/staff/notifications', icon: Bell },
];

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { notifications } = useNotifications();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const close = () => {
      setShowProfileDropdown(false);
      setShowNotifDropdown(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const active = baseStaffMenuItems.find(m => location.pathname === m.path)?.name || 'Dashboard';
  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';
  const staffEmail = profile?.email || user?.email || 'counselor@ferex.com';
  const unreadNotifs = (notifications || []).filter(n => !n.is_read);

  const handleSignOut = async () => {
    await signOut();
    try {
      localStorage.removeItem('ferex_user');
      localStorage.removeItem('ferex_role');
      sessionStorage.clear();
    } catch {}
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#58051E]/10 selection:text-[#58051E] overflow-x-hidden">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel — Identical to AdminLayout */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-60 bg-white border-r border-slate-200/80 z-50 flex flex-col transition-transform duration-200 ease-out select-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <Link to="/staff/dashboard" className="flex items-center gap-3 group">
            <Logo variant="compact" size="sm" subtitle="ADMISSIONS COUNSELOR" />
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin">
          <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
            Counselor Workspace
          </div>
          {baseStaffMenuItems.map((item) => {
            const isActive = item.name === active || location.pathname === item.path;
            const Icon = item.icon;
            const badgeValue = item.name === 'Notifications' && unreadNotifs.length > 0 ? String(unreadNotifs.length) : null;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`relative flex items-center gap-2.5 h-9 px-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group
                  ${isActive
                    ? 'bg-[#58051E]/8 text-[#58051E] font-bold border-l-2 border-[#58051E]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="truncate flex-1 flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                </span>

                {badgeValue && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 bg-rose-50 text-rose-700 border border-rose-200">
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Info */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
            <div className="relative">
              <div className="w-7.5 h-7.5 rounded-lg bg-[#58051E] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {staffName[0]?.toUpperCase() || 'C'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{staffName}</p>
              <p className="text-[9.5px] font-medium text-slate-400 truncate">Admissions Counselor</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Sticky Header — Identical to AdminLayout */}
        <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30 select-none">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Breadcrumb & Division Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-slate-400 min-w-0">
            <Link to="/staff/dashboard" className="hover:text-slate-700 transition-colors flex items-center gap-1.5 text-slate-700 font-semibold shrink-0">
              <GraduationCap className="w-4 h-4 text-[#58051E]" />
              <span className="hidden sm:inline">FEREX Education</span>
            </Link>
            <span className="text-[9.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.2 rounded hidden md:inline-block">
              Admissions Counselor
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 hidden sm:inline-block" />
            <span className="text-slate-800 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[110px] sm:max-w-none">
              {active}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students, tasks..."
                className="h-9 w-60 pl-9 pr-8 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#58051E]/40 focus:ring-4 focus:ring-[#58051E]/5 transition-all"
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
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 z-50 text-left"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      <Link to="/staff/notifications" onClick={() => setShowNotifDropdown(false)} className="text-[10px] font-bold text-[#58051E] hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                      {unreadNotifs.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">No unread notifications</p>
                      ) : (
                        unreadNotifs.slice(0, 4).map(n => (
                          <div key={n.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <span className="font-bold text-slate-900 block">{n.title}</span>
                            <span className="text-slate-500 text-[11px] block">{n.body}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-[#58051E] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {staffName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-900 block leading-tight">{staffName}</span>
                <span className="text-[9.5px] font-semibold text-emerald-600 block">Admissions Counselor</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 p-5 md:p-7 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
