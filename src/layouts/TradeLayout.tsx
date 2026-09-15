import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Truck, FileSpreadsheet, PackageCheck,
  FileCheck2, Award, FolderArchive, Building2, CreditCard, BarChart3,
  TrendingUp, DollarSign, MessageSquare, Bell, User, Settings, LogOut,
  Search, Menu, ChevronRight, ChevronDown, X, Plus, ArrowUpRight
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { AppSwitcher } from '../components/AppSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { getTradeNotifications, globalSearchTrade } from '../lib/api/trade';

interface TradeLayoutProps {
  children: React.ReactNode;
}

// Admin-level roles for Global Trade
const TRADE_ADMIN_ROLES = ['trade_admin', 'global_trade', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const TradeLayout: React.FC<TradeLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const userRole = profile?.role || '';
  const userName = profile?.full_name || '';
  const userEmail = profile?.email || 'trade@ferex.com';
  const isAdmin = TRADE_ADMIN_ROLES.includes(userRole);

  const roleLabel = isAdmin ? 'Trade Director' : 'Logistics Officer';
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : (isAdmin ? 'GT' : 'LO');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
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
        setLiveNotifs(Array.isArray(notifs) ? notifs.filter((n: any) => !n.is_archived && !n.archived) : []);
      } catch {
        setLiveNotifs([]);
      }
    };
    loadNotifs();

    const handleNotifUpdate = () => loadNotifs();
    window.addEventListener('ferex_trade_notifs_change', handleNotifUpdate);
    return () => {
      window.removeEventListener('ferex_trade_notifs_change', handleNotifUpdate);
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

  // Execute global search when query changes
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

  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_trade_profile_photo') || null;
  });

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
      setShowQuickActions(false);
    };
    const syncPhoto = () => {
      setProfilePhoto(localStorage.getItem('ferex_trade_profile_photo') || null);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('ferex_trade_avatar_change', syncPhoto);
    window.addEventListener('storage', syncPhoto);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('ferex_trade_avatar_change', syncPhoto);
      window.removeEventListener('storage', syncPhoto);
    };
  }, []);

  // ── Admin nav: full access ────────────────────────────────────────────
  const adminMenuSections = [
    {
      title: 'FEREX GLOBAL TRADE',
      items: [
        { name: 'Dashboard', path: '/trade/dashboard', icon: LayoutDashboard, badge: 'Live' }
      ]
    },
    {
      title: 'TRADE OPERATIONS',
      items: [
        { name: 'Trade CRM', path: '/trade/crm', icon: Users, badge: null },
        { name: 'Shipments', path: '/trade/shipments', icon: Truck, badge: 'Active' },
        { name: 'Commercial Invoices', path: '/trade/invoices', icon: FileSpreadsheet, badge: null },
        { name: 'Packing Lists', path: '/trade/packing-lists', icon: PackageCheck, badge: null },
        { name: 'Bills of Lading', path: '/trade/bills-of-lading', icon: FileCheck2, badge: 'Ocean' },
        { name: 'Certificates', path: '/trade/certificates', icon: Award, badge: null },
        { name: 'Trade Documents', path: '/trade/documents', icon: FolderArchive, badge: 'Vault' },
        { name: 'Letters of Credit', path: '/trade/letters-of-credit', icon: Building2, badge: 'LC Duty' },
        { name: 'Payments & Ledger', path: '/trade/payments', icon: CreditCard, badge: 'Cashflow' },
      ]
    },
    {
      title: 'ANALYTICS & REPORTS',
      items: [
        { name: 'Reports', path: '/trade/reports', icon: BarChart3, badge: null },
        { name: 'Shipment Analytics', path: '/trade/shipment-analytics', icon: TrendingUp, badge: 'Realtime' },
        { name: 'Financial Analytics', path: '/trade/financial-analytics', icon: DollarSign, badge: 'Ledger' },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { name: 'Messages', path: '/trade/messages', icon: MessageSquare, badge: 'Chat' },
        { name: 'Notifications', path: '/trade/notifications', icon: Bell, badge: null },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Profile', path: '/trade/profile', icon: User, badge: null },
        { name: 'Settings', path: '/trade/settings', icon: Settings, badge: null },
      ]
    }
  ];

  // ── Staff nav: restricted — logistics operations only ─────────────────
  const staffMenuSections = [
    {
      title: 'LOGISTICS DESK',
      items: [
        { name: 'Dashboard', path: '/trade/dashboard', icon: LayoutDashboard, badge: 'Live' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Shipments', path: '/trade/shipments', icon: Truck, badge: 'Active' },
        { name: 'Packing Lists', path: '/trade/packing-lists', icon: PackageCheck, badge: null },
        { name: 'Bills of Lading', path: '/trade/bills-of-lading', icon: FileCheck2, badge: 'Ocean' },
        { name: 'Certificates', path: '/trade/certificates', icon: Award, badge: null },
        { name: 'Trade Documents', path: '/trade/documents', icon: FolderArchive, badge: 'Vault' },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { name: 'Messages', path: '/trade/messages', icon: MessageSquare, badge: 'Chat' },
        { name: 'Notifications', path: '/trade/notifications', icon: Bell, badge: null },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Profile', path: '/trade/profile', icon: User, badge: null },
      ]
    }
  ];

  const menuSections = isAdmin ? adminMenuSections : staffMenuSections;
  const allMenuItems = menuSections.flatMap(s => s.items);
  const activeItem = allMenuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = () => {
    localStorage.removeItem('ferex_trade_demo_session');
    navigate('/');
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
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between transition-all duration-200 ease-out select-none
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

          {/* Mobile close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 scrollbar-thin select-none">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{section.title}</span>
                </div>
              )}
              {section.items.map((item) => {
                const isActive = item.name === activeItem || (item.path === '/trade/payments' && location.pathname.startsWith('/trade/payments'));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
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

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 transition-colors
                        ${isActive
                          ? 'bg-[#58051E]/15 text-[#58051E]'
                          : 'bg-slate-100 text-slate-500'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Portal Switcher info banner for Trade Director */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <Link
              to="/trade/client-portal"
              className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#58051E]/40 hover:bg-[#58051E]/5 transition-all text-left group"
            >
              <div>
                <span className="text-[10px] font-extrabold text-[#58051E] uppercase block">Client Portal</span>
                <span className="text-[11px] font-semibold text-slate-600">Partner View Console</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#58051E]" />
            </Link>
          </div>
        )}

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Sticky Navbar */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 z-30 h-14 flex items-center justify-between px-4 sm:px-6 select-none shrink-0">
          
          {/* Left Breadcrumbs & Toggles */}
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

            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Link to="/trade/dashboard" className="hover:text-slate-700 transition-colors text-slate-500 font-semibold">
                Trade
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-slate-800 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60">{activeItem}</span>
            </div>
          </div>

          {/* Right Action Icons & Avatar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Global Search Omnibar Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="relative hidden md:flex items-center w-64 h-8.5 pl-3 pr-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-400 hover:border-[#58051E]/40 hover:bg-white transition-all cursor-pointer text-left group"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#58051E] mr-2 shrink-0" />
              <span className="truncate flex-1">Search trade records...</span>
              <kbd className="px-1.5 py-0.2 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Mobile search button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
              title="Search"
            >
              <Search size={16} />
            </button>

            {/* Google-Style 9-Dots 4-App Switcher */}
            <AppSwitcher />

            {/* Quick Actions Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowQuickActions(!showQuickActions);
                  setShowNotifications(false);
                  setShowProfileDropdown(false);
                }}
                className="h-9 px-3 rounded-xl bg-[#58051E] text-white hover:bg-[#430316] text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Action</span>
              </button>

              <AnimatePresence>
                {showQuickActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      Quick Operations
                    </div>
                    <div className="py-1 space-y-0.5 text-xs font-bold text-slate-700">
                      <button onClick={() => { setShowQuickActions(false); navigate('/trade/crm'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" /> Add Trade Partner
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/trade/shipments'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" /> Book New Shipment
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/trade/invoices'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Create Commercial Invoice
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/trade/payments'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-400" /> Record Settlement / Payment
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/trade/letters-of-credit'); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" /> Issue Letter of Credit
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications Bell */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileDropdown(false);
                  setShowQuickActions(false);
                }}
                className="relative p-2 text-slate-600 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
              >
                <Bell size={18} />
                {liveNotifs.some(n => !n.is_read && !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#58051E] rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-3 text-left z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2 select-none px-1">
                      <h4 className="text-xs font-extrabold text-slate-900">Trade Alerts</h4>
                      <button onClick={() => navigate('/trade/notifications')} className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer">View All</button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {liveNotifs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 font-bold">
                          No active trade alerts
                        </div>
                      ) : (
                        liveNotifs.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => navigate('/trade/notifications')}
                            className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-1.5 py-0.2 rounded">
                                {n.category || 'Alert'}
                              </span>
                              <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            </div>
                            <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5 line-clamp-2">
                              {n.description || n.desc}
                            </p>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                  setShowQuickActions(false);
                }}
                className="flex items-center gap-2.5 h-9.5 px-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors select-none group cursor-pointer"
              >
                <div className="relative">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Trade Exec" className="w-6.5 h-6.5 rounded-lg object-cover border border-slate-200 shadow-2xs" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-lg bg-[#58051E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">{userName ? userName.split(' ')[0] : roleLabel}</span>
                  <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">{roleLabel}</span>
                </div>

                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-900">{userName || roleLabel}</p>
                      <p className="text-[10px] font-bold text-[#58051E]">{roleLabel}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">{userEmail}</p>
                    </div>
                    <div className="py-1 space-y-0.5 text-xs font-bold text-slate-700">
                      <button onClick={() => navigate('/trade/profile')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> Trade Profile
                      </button>
                      {isAdmin && (
                        <button onClick={() => navigate('/trade/settings')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" /> System Settings
                        </button>
                      )}
                      <button onClick={() => navigate('/trade/notifications')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-400" /> Trade Notifications
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* Workspace Body */}
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

      {/* ── GLOBAL SEARCH ⌘K MODAL ── */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
                <Search className="w-5 h-5 text-[#58051E]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search partners, shipments, invoices, B/Ls, LCs, payments..."
                  className="flex-1 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded border border-slate-200">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-3">
                {searchLoading ? (
                  <div className="p-6 text-center text-xs font-bold text-slate-400">Searching global trade databases...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                    {searchQuery.trim().length >= 2 ? 'No matching trade entities found.' : 'Enter at least 2 characters to search across all trade modules.'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((r) => (
                      <div
                        key={`${r.category}-${r.id}`}
                        onClick={() => {
                          setShowSearchModal(false);
                          navigate(r.path);
                        }}
                        className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#58051E]/10 text-[#58051E]">
                              {r.category}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 group-hover:text-[#58051E] truncate">
                              {r.title}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                            {r.subtitle}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#58051E] shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Navigate directly to connected record dossiers</span>
                <span>⌘K / CTRL+K</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
