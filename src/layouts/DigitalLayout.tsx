import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, LayoutDashboard, Users, UserPlus, FolderKanban, CheckSquare, Calendar,
  FileText, CreditCard, DollarSign, BarChart3, Mail,
  Bell, User, Settings, LogOut, Search, Menu, ChevronRight, ChevronDown, X, Plus,
  Layers, Shield
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { AppSwitcher } from '../components/AppSwitcher';
import { ToastNotification } from '../components/ToastNotification';
import { useAuth } from '../contexts/AuthContext';
import { getDigitalNotifications } from '../lib/api/digital';
import { supabase } from '../lib/supabase';

interface DigitalLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
  isLogout?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const DIGITAL_ADMIN_ROLES = ['digital_admin', 'ferex_digital', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const DigitalLayout: React.FC<DigitalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const userRole = profile?.role || '';
  const userName = profile?.full_name || '';
  const userEmail = profile?.email || 'digital@ferex.com';
  const isAdmin = DIGITAL_ADMIN_ROLES.includes(userRole);
  const isStaff = !isAdmin;

  const roleLabel = isAdmin ? 'Digital Director' : 'Project Manager';
  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (isAdmin ? 'FD' : 'PM');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [liveNotifs, setLiveNotifs] = useState<any[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_digital_profile_photo') || null;
  });

  const loadNotifs = async () => {
    try {
      const notifs = await getDigitalNotifications();
      setLiveNotifs(notifs || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifs();

    const channel = supabase
      .channel('realtime_digital_layout_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_notifications' }, () => {
        loadNotifs();
      })
      .subscribe();

    const handleAvatarChange = () => {
      setProfilePhoto(localStorage.getItem('ferex_digital_profile_photo') || null);
    };
    const handleNotifChange = () => loadNotifs();

    window.addEventListener('ferex_digital_avatar_change', handleAvatarChange);
    window.addEventListener('ferex_digital_notifications_change', handleNotifChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_avatar_change', handleAvatarChange);
      window.removeEventListener('ferex_digital_notifications_change', handleNotifChange);
    };
  }, []);

  const unreadNotifCount = liveNotifs.filter(n => !n.is_read).length;

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const adminNavSections: NavSection[] = [
    {
      title: 'Executive',
      items: [
        { label: 'Dashboard', path: '/digital/dashboard', icon: LayoutDashboard },
        { label: 'AI Copilot', path: '/digital/ai-copilot', icon: Sparkles }
      ]
    },
    {
      title: 'Agency Operations',
      items: [
        { label: 'Clients', path: '/digital/clients', icon: Users },
        { label: 'Staff Team', path: '/digital/staff', icon: Users },
        { label: 'Projects', path: '/digital/projects', icon: FolderKanban },
        { label: 'Deliverables', path: '/digital/deliverables', icon: Layers },
        { label: 'Task Assignment', path: '/digital/tasks', icon: CheckSquare },
        { label: 'Leads & Pipeline', path: '/digital/leads', icon: UserPlus },
        { label: 'Meetings', path: '/digital/meetings', icon: Calendar }
      ]
    },
    {
      title: 'Finance & Billing',
      items: [
        { label: 'Invoices', path: '/digital/invoices', icon: FileText },
        { label: 'Payments Ledger', path: '/digital/payments', icon: CreditCard },
        { label: 'Expenses', path: '/digital/expenses', icon: DollarSign }
      ]
    },
    {
      title: 'Analytics & Alerts',
      items: [
        { label: 'Performance BI', path: '/digital/analytics', icon: BarChart3 },
        { label: 'Notifications', path: '/digital/notifications', icon: Bell, badge: unreadNotifCount > 0 ? String(unreadNotifCount) : undefined },
        { label: 'Email Delivery Logs', path: '/digital/emails', icon: Mail }
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Account Profile', path: '/digital/profile', icon: User },
        { label: 'Agency Settings', path: '/digital/settings', icon: Settings },
        { label: 'Sign Out', path: '/', icon: LogOut, isLogout: true }
      ]
    }
  ];

  const staffNavSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Dashboard', path: '/digital/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Projects & Tasks',
      items: [
        { label: 'My Projects', path: '/digital/projects', icon: FolderKanban },
        { label: 'Deliverables', path: '/digital/deliverables', icon: Layers },
        { label: 'Tasks Queue', path: '/digital/tasks', icon: CheckSquare },
        { label: 'Meetings', path: '/digital/meetings', icon: Calendar }
      ]
    },
    {
      title: 'Alerts & System',
      items: [
        { label: 'Notifications', path: '/digital/notifications', icon: Bell, badge: unreadNotifCount > 0 ? String(unreadNotifCount) : undefined },
        { label: 'Email Delivery Logs', path: '/digital/emails', icon: Mail },
        { label: 'Account Profile', path: '/digital/profile', icon: User },
        { label: 'Sign Out', path: '/', icon: LogOut, isLogout: true }
      ]
    }
  ];

  const navSections = isAdmin ? adminNavSections : staffNavSections;

  const handleLogout = () => {
    showToastMsg('Signing out from Ferex Digital...');
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const activeItem = navSections.flatMap(s => s.items).find(i => i.path === location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 flex text-left font-sans antialiased text-slate-900 selection:bg-[#58051E] selection:text-white">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Modern SaaS Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200/80 fixed top-0 bottom-0 left-0 z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center shrink-0">
          <Link to="/digital/dashboard" className="flex items-center gap-3">
            <Logo variant="compact" size="sm" subtitle="FEREX DIGITAL" />
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                {section.title}
              </span>
              {section.items.map((item, iIdx) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={iIdx}
                    onClick={() => {
                      if (item.isLogout) {
                        handleLogout();
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-[#58051E]/10 text-[#58051E] font-semibold border-l-2 border-[#58051E]'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card Bottom */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {profilePhoto ? <img src={profilePhoto} alt="Digital User" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex flex-col truncate flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">{userName || roleLabel}</span>
              <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-[#58051E]" />
                {roleLabel}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-700">Ferex Digital</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 truncate">
                {activeItem?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2.5">
            {/* Search Bar Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 h-9 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-400 border border-slate-200 transition-all w-36 sm:w-56 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Search clients, projects...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[9px] font-semibold bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">⌘K</kbd>
            </button>

            {/* 4-App Switcher */}
            <AppSwitcher />

            {/* Quick Actions Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="h-9 px-3.5 rounded-xl bg-[#58051E] text-white text-xs font-semibold hover:bg-[#430316] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Action</span>
              </button>

              <AnimatePresence>
                {showQuickActions && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowQuickActions(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 p-2 z-40 space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1 block">Quick Actions</span>
                      <button onClick={() => { setShowQuickActions(false); navigate('/digital/clients'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <Users className="w-3.5 h-3.5 text-[#58051E]" /> Add Client
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/digital/projects'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <FolderKanban className="w-3.5 h-3.5 text-[#58051E]" /> Create Project
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/digital/tasks'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <CheckSquare className="w-3.5 h-3.5 text-[#58051E]" /> Assign Task
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/digital/invoices'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <FileText className="w-3.5 h-3.5 text-[#58051E]" /> Issue Invoice
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/70 flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </button>

              <AnimatePresence>
                {showNotifPopover && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifPopover(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 z-40 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-bold text-slate-900">Notifications</span>
                        <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-full">
                          {unreadNotifCount > 0 ? `${unreadNotifCount} unread` : 'All caught up'}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs max-h-64 overflow-y-auto scrollbar-thin">
                        {liveNotifs.length > 0 ? (
                          liveNotifs.slice(0, 4).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                setShowNotifPopover(false);
                                if (n.link) navigate(n.link);
                                else navigate('/digital/notifications');
                              }}
                              className={`p-2.5 rounded-xl border space-y-1 cursor-pointer transition-colors ${
                                !n.is_read ? 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-100/50' : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.message || n.description}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 font-medium">No recent notifications</div>
                        )}
                      </div>
                      <button
                        onClick={() => { setShowNotifPopover(false); navigate('/digital/notifications'); }}
                        className="w-full text-center text-xs font-semibold text-[#58051E] hover:underline pt-1 block cursor-pointer"
                      >
                        View all notifications →
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white text-xs font-bold flex items-center justify-center overflow-hidden border border-white shadow-2xs">
                  {profilePhoto ? <img src={profilePhoto} alt="Digital Profile" className="w-full h-full object-cover" /> : initials}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 p-2 z-40 space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 block">{userName || roleLabel}</span>
                        <span className="text-[10px] text-[#58051E] block font-semibold">{roleLabel}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{userEmail}</span>
                      </div>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/digital/profile'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Account Profile
                      </button>
                      {isAdmin && (
                        <button onClick={() => { setShowProfileDropdown(false); navigate('/digital/settings'); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                          <Settings className="w-3.5 h-3.5 text-slate-500" /> Agency Settings
                        </button>
                      )}
                      <button onClick={() => { setShowProfileDropdown(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Body Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal overlay */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-50" onClick={() => setShowSearchModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-200/80 p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients, projects, tasks, invoices..."
                  className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <button onClick={() => setShowSearchModal(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block">Quick Navigation</span>
                {[
                  { label: 'Clients Directory & Accounts', path: '/digital/clients' },
                  { label: 'Active Projects & Timeline', path: '/digital/projects' },
                  { label: 'Client Invoices & Billings', path: '/digital/invoices' },
                  { label: 'Task Assignments & Backlog', path: '/digital/tasks' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setShowSearchModal(false); navigate(s.path); }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>{s.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div initial={{ translateX: '-100%' }} animate={{ translateX: 0 }} exit={{ translateX: '-100%' }} transition={{ duration: 0.25 }} className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl p-4 overflow-y-auto lg:hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">FEREX DIGITAL</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                  {navSections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 px-2 block">{sec.title}</span>
                      {sec.items.map((item, iIdx) => (
                        <button
                          key={iIdx}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            if (item.isLogout) {
                              handleLogout();
                            } else {
                              navigate(item.path);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                            location.pathname === item.path ? 'bg-[#58051E] text-white' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${location.pathname === item.path ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
