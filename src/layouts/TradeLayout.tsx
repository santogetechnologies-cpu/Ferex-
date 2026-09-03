import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Truck, FileSpreadsheet, PackageCheck,
  FileCheck2, Award, FolderArchive, Building2, CreditCard, BarChart3,
  TrendingUp, DollarSign, MessageSquare, Bell, User, Settings, LogOut,
  Search, Menu, ChevronRight, ChevronDown, X, Plus
} from 'lucide-react';

import { Logo } from '../components/Logo';

interface TradeLayoutProps {
  children: React.ReactNode;
}

export const TradeLayout: React.FC<TradeLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const menuSections = [
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
        { name: 'Payments', path: '/trade/payments', icon: CreditCard, badge: 'INR ₹' },
      ]
    },
    {
      title: 'ANALYTICS',
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

  const allMenuItems = menuSections.flatMap(s => s.items);
  const activeItem = allMenuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = () => {
    localStorage.removeItem('ferex_trade_demo_session');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#6A1B2E]/10 selection:text-[#6A1B2E]">
      
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
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between transition-all duration-300 ease-out shadow-xs
          ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[270px]'} 
          ${isMobileOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 select-none shrink-0">
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin select-none">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{section.title}</span>
                </div>
              )}
              {section.items.map((item) => {
                const isActive = item.name === activeItem;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`relative flex items-center rounded-xl h-9 px-3 transition-all duration-200 text-xs font-bold group
                      ${isActive 
                        ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/20' 
                        : 'text-slate-600 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/10'}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6A1B2E]'}`} />

                    {!isCollapsed && (
                      <span className="truncate flex-1 font-extrabold">
                        {item.name}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 transition-colors
                        ${isActive
                          ? 'bg-white/20 text-white'
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


      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Sticky Navbar */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-30 h-16 flex items-center justify-between px-4 sm:px-6 select-none shrink-0 shadow-xs">
          
          {/* Left Breadcrumbs & Toggles */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/trade/dashboard" className="hover:text-slate-700 transition-colors text-slate-500 font-extrabold">
                Ferex Trade
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{activeItem}</span>
            </div>
          </div>

          {/* Right Action Icons & Avatar */}
          <div className="flex items-center gap-3">
            
            {/* Search Box */}
            <div className="relative hidden md:block w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shipments, B/L, LCs..."
                className="w-full h-9 pl-9 pr-8 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/40 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Quick Actions Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowQuickActions(!showQuickActions);
                  setShowNotifications(false);
                  setShowProfileDropdown(false);
                }}
                className="h-9 px-3 rounded-xl bg-[#6A1B2E] text-white hover:bg-[#521221] text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
                    className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      Quick Operations
                    </div>
                    <div className="py-1 space-y-0.5 text-xs font-bold text-slate-700">
                      <button onClick={() => navigate('/trade/shipments')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" /> Book New Shipment
                      </button>
                      <button onClick={() => navigate('/trade/invoices')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Create Invoice
                      </button>
                      <button onClick={() => navigate('/trade/letters-of-credit')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
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
                className="relative p-2 text-slate-600 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#6A1B2E] rounded-full ring-2 ring-white animate-pulse" />
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
                      <button onClick={() => navigate('/trade/notifications')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">View All</button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div onClick={() => navigate('/trade/shipments')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">Container MSKU-9821 Arrived</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">Port of Hamburg clearance complete.</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">5m ago</span>
                      </div>
                      <div onClick={() => navigate('/trade/letters-of-credit')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">LC Approved by HSBC</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">LC-2026-8810 worth ₹1.45 Cr authorized.</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">1h ago</span>
                      </div>
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
                    <div className="w-6.5 h-6.5 rounded-lg bg-[#6A1B2E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      GT
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">Trade Director</span>
                  <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">trade@ferex.com</span>
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
                      <p className="text-xs font-extrabold text-slate-900">Ferex Global Trade Director</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">trade@ferex.com</p>
                    </div>
                    <div className="py-1 space-y-0.5 text-xs font-bold text-slate-700">
                      <button onClick={() => navigate('/trade/profile')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> Trade Profile
                      </button>
                      <button onClick={() => navigate('/trade/settings')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xl flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400" /> System Settings
                      </button>
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

    </div>
  );
};
