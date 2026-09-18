import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Headphones,
  Layers, Target, FileText, Bell, User, LogOut, Menu, X,
  ChevronRight, Search, Sparkles
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { AppSwitcher } from '../components/AppSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAssignedDigitalTasks, getAssignedDigitalTickets } from '../lib/api/digitalPm';

interface DigitalPMLayoutProps {
  children: React.ReactNode;
}

const pmNavItems = [
  { name: 'Dashboard', path: '/digital/pm/dashboard', icon: LayoutDashboard },
  { name: 'My Projects', path: '/digital/pm/projects', icon: FolderKanban },
  { name: 'My Tasks', path: '/digital/pm/tasks', icon: CheckSquare },
  { name: 'Client Tickets', path: '/digital/pm/tickets', icon: Headphones },
  { name: 'Sprint Board', path: '/digital/pm/sprints', icon: Layers },
  { name: 'Milestones', path: '/digital/pm/milestones', icon: Target },
  { name: 'Documents', path: '/digital/pm/documents', icon: FileText },
  { name: 'Notifications', path: '/digital/pm/notifications', icon: Bell },
  { name: 'Profile', path: '/digital/pm/profile', icon: User },
];

export const DigitalPMLayout: React.FC<DigitalPMLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
  const [liveNotifs, setLiveNotifs] = useState<any[]>([]);

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadCounts = async () => {
    try {
      const [tasks, tickets] = await Promise.all([
        getAssignedDigitalTasks(pmIdentity),
        getAssignedDigitalTickets(undefined, pmIdentity)
      ]);
      const pending = (tasks || []).filter(t => t.status !== 'Done');
      const open = (tickets || []).filter(t => t.status === 'Open' || t.status === 'In Progress');
      setPendingTasksCount(pending.length);
      setOpenTicketsCount(open.length);
    } catch {}
  };

  useEffect(() => {
    loadCounts();

    const taskSub = supabase
      .channel('pm_layout_realtime_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tickets' }, () => loadCounts())
      .subscribe();

    const handleLocalChange = () => loadCounts();
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_tasks_change', handleLocalChange);
    window.addEventListener('ferex_digital_tickets_change', handleLocalChange);

    return () => {
      supabase.removeChannel(taskSub);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_digital_tickets_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const active = pmNavItems.find(m => location.pathname === m.path)?.name || 'Dashboard';
  const pmName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Project Manager';
  const pmEmail = profile?.email || user?.email || 'pm@ferex.com';

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

      {/* Sidebar Panel — Identical to FEREX Design Language */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen w-60 bg-white border-r border-slate-200/80 z-40 flex flex-col transition-transform duration-200 ease-out select-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <Link to="/digital/pm/dashboard" className="flex items-center gap-3 group">
            <Logo variant="compact" size="sm" subtitle="PROJECT MANAGER" />
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin">
          <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
            Project Manager Console
          </div>
          {pmNavItems.map((item) => {
            const isActive = item.name === active || location.pathname === item.path;
            const Icon = item.icon;

            let badge: string | null = null;
            if (item.name === 'My Tasks' && pendingTasksCount > 0) {
              badge = String(pendingTasksCount);
            } else if (item.name === 'Client Tickets' && openTicketsCount > 0) {
              badge = String(openTicketsCount);
            }

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
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate flex-1 flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                </span>

                {badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-[#58051E]/15 text-[#58051E]'
                        : item.name === 'Client Tickets'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {badge}
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
                {pmName[0]?.toUpperCase() || 'P'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{pmName}</p>
              <p className="text-[9.5px] font-medium text-slate-400 truncate">Digital Project Manager</p>
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
      <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:pl-60">
        {/* Sticky Header — Identical to FEREX Design Language */}
        <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30 select-none">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Breadcrumb & Division Identity */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-slate-400 min-w-0">
            <Link
              to="/digital/pm/dashboard"
              className="hover:text-slate-700 transition-colors flex items-center gap-1.5 text-slate-700 font-semibold shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[#58051E]" />
              <span className="hidden sm:inline">FEREX Digital</span>
            </Link>
            <span className="text-[9.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.2 rounded hidden md:inline-block">
              Project Manager
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 hidden sm:inline-block" />
            <span className="text-slate-800 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[120px] sm:max-w-none">
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
                placeholder="Search projects, tasks, tickets..."
                className="h-9 w-60 pl-9 pr-8 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#58051E]/40 focus:ring-4 focus:ring-[#58051E]/5 transition-all"
              />
            </div>

            {/* Google-Style 9-Dots App Switcher */}
            <AppSwitcher />

            {/* Quick Notification Bell */}
            <div className="relative">
              <button
                onClick={() => navigate('/digital/pm/notifications')}
                className="relative p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {openTicketsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>

            {/* Profile Avatar */}
            <Link
              to="/digital/pm/profile"
              className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-[#58051E] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {pmName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[130px]">
                  {pmName}
                </span>
                <span className="text-[9.5px] font-semibold text-emerald-600 block">
                  Project Manager
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
