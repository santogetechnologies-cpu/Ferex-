import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, PackageCheck, FolderArchive,
  CreditCard, MessageSquare, Bell, User, Settings, LogOut,
  Search, Menu, X, ArrowUpRight, ListTodo, LifeBuoy, Mail,
  Ship, ShieldCheck, DollarSign, Sparkles
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { AppSwitcher } from '../components/AppSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { getTradeNotifications, globalSearchTrade } from '../lib/api/trade';

interface TradeLayoutProps {
  children: React.ReactNode;
}

const TRADE_ADMIN_ROLES = ['trade_admin', 'global_trade', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const TradeLayout: React.FC<TradeLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const userRole = profile?.role || '';
  const userName = profile?.full_name || '';
  const userEmail = profile?.email || 'trade@ferex.com';
  const isAdmin = TRADE_ADMIN_ROLES.includes(userRole);

  const roleLabel = isAdmin ? 'Trade Director (Admin)' : 'Trade Logistics Officer (Staff Desk)';
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : (isAdmin ? 'TD' : 'LO');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [liveNotifs, setLiveNotifs] = useState<any[]>([]);

  // Global Search Omnibar (⌘K)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const notifs = await getTradeNotifications();
        setLiveNotifs(Array.isArray(notifs) ? notifs.slice(0, 8) : []);
      } catch {
        setLiveNotifs([]);
      }
    };
    loadNotifs();

    const handleNotifUpdate = () => loadNotifs();
    window.addEventListener('ferex_trade_emails_change', handleNotifUpdate);
    return () => {
      window.removeEventListener('ferex_trade_emails_change', handleNotifUpdate);
    };
  }, []);

  // Keyboard shortcut for ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Execute global search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await globalSearchTrade(searchQuery);
        setSearchResults(res);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [showSearchModal]);

  // ── Admin Menu (Full Control) ──
  const adminMenuSections = [
    {
      title: 'EXECUTIVE DESK',
      items: [
        { name: 'Dashboard', path: '/trade/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'TRADE OPERATIONS',
      items: [
        { name: 'Orders & Tracking', path: '/trade/shipments', icon: PackageCheck },
        { name: 'Documents Vault', path: '/trade/documents', icon: FolderArchive },
        { name: 'Task Assignment', path: '/trade/tasks', icon: ListTodo },
        { name: 'Support & Tickets', path: '/trade/tickets', icon: LifeBuoy },
        { name: 'Payment Ledger & LC', path: '/trade/payments', icon: CreditCard },
      ]
    },
    {
      title: 'COMMUNICATION & CRM',
      items: [
        { name: 'Automated Emails', path: '/trade/notifications', icon: Mail },
        { name: 'Trade CRM & Partners', path: '/trade/crm', icon: Users },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Profile & Settings', path: '/trade/profile', icon: User },
      ]
    }
  ];

  // ── Staff Menu (Trade / Logistics Officer) ──
  const staffMenuSections = [
    {
      title: 'STAFF OPERATIONS PORTAL',
      items: [
        { name: 'Dashboard', path: '/trade/dashboard', icon: LayoutDashboard },
        { name: 'Active Orders', path: '/trade/shipments', icon: PackageCheck },
        { name: 'My Assigned Tasks', path: '/trade/tasks', icon: ListTodo },
        { name: 'Document Verification', path: '/trade/documents', icon: FolderArchive },
        { name: 'Manual Ticket Logging', path: '/trade/tickets', icon: LifeBuoy },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { name: 'Automated Email Log', path: '/trade/notifications', icon: Mail },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Staff Profile', path: '/trade/profile', icon: User },
      ]
    }
  ];

  const menuSections = isAdmin ? adminMenuSections : staffMenuSections;
  const allMenuItems = menuSections.flatMap(s => s.items);
  const activeItem = allMenuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = () => {
    try { signOut(); } catch {}
    localStorage.removeItem('ferex_user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#58051E]/10 selection:text-[#58051E]">
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen bg-white border-r border-slate-200/80 z-40 flex flex-col justify-between transition-all duration-200 ease-out select-none
          ${isCollapsed ? 'lg:w-[70px]' : 'lg:w-[250px]'} 
          ${isMobileOpen ? 'translate-x-0 w-[250px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="GLOBAL TRADE" />
            )}
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin select-none">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = item.name === activeItem || location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <React.Fragment key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`relative flex items-center rounded-xl h-8.5 px-2.5 transition-all duration-150 text-xs font-semibold group
                        ${isActive 
                          ? 'bg-[#58051E]/8 text-[#58051E] font-bold border-l-2 border-[#58051E]' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'}`} />

                      {!isCollapsed && (
                        <span className="truncate flex-1">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200 ${isCollapsed ? 'lg:pl-[70px]' : 'lg:pl-[250px]'}`}>
        
        {/* Top Sticky Navbar */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 z-30 h-14 flex items-center justify-between px-4 sm:px-6 select-none shrink-0">
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>Trade</span>
              <span>/</span>
              <span className="text-slate-900 font-extrabold">{activeItem}</span>
            </div>
          </div>

          {/* Quick Search and Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearchModal(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-500 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search orders, docs...</span>
              <kbd className="px-1.5 py-0.2 bg-white rounded border border-slate-200 text-[10px] font-mono text-slate-400">⌘K</kbd>
            </button>

            <AppSwitcher />

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
              >
                <Bell size={18} />
                {liveNotifs.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#58051E] rounded-full" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-left"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-black text-slate-900">
                      <span>Automated Email Triggers</span>
                      <Link to="/trade/notifications" onClick={() => setShowNotifications(false)} className="text-[10px] text-[#58051E] hover:underline">
                        View Audit Log
                      </Link>
                    </div>
                    <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                      {liveNotifs.map((n) => (
                        <div key={n.id} className="p-2 bg-slate-50 rounded-xl text-xs space-y-0.5">
                          <div className="font-bold text-slate-900 text-[11px] truncate">{n.title}</div>
                          <div className="text-[10px] text-slate-500 truncate">{n.description}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-[#58051E] text-white flex items-center justify-center text-xs font-black">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-black text-slate-900 leading-tight">{userName || (isAdmin ? 'Trade Admin' : 'Trade Officer')}</div>
                <div className="text-[10px] font-bold text-[#58051E] leading-tight">{isAdmin ? 'Trade Director' : 'Logistics Officer'}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-x-hidden">
          {children}
        </div>
      </div>

      {/* ── GLOBAL SEARCH OMNIBAR ── */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setShowSearchModal(false)} />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed left-1/2 top-24 -translate-x-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-4 text-left">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trade orders, commodities, consignees..."
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
                {searchResults.map((r, i) => (
                  <Link
                    key={i}
                    to={r.path}
                    onClick={() => setShowSearchModal(false)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors block text-slate-800"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900">{r.title}</div>
                      <div className="text-[10px] text-slate-400">{r.subtitle}</div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                      {r.category}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeLayout;
