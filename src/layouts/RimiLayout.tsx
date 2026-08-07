import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake, LayoutDashboard, Users, Store, Building2, ShoppingCart,
  Package, Boxes, Warehouse, QrCode, Clock, Truck, DollarSign,
  Navigation, BarChart3, TrendingUp, DollarSign as DollarIcon, MessageSquare,
  Bell, User, Settings, LogOut, Search, Menu, ChevronRight, ChevronDown, X, Plus, CheckCircle2
} from 'lucide-react';

import { Logo } from '../components/Logo';

interface RimiLayoutProps {
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

export const RimiLayout: React.FC<RimiLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  // Avatar state persistence
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_rimi_profile_photo') || null;
  });

  useEffect(() => {
    const handleAvatarChange = () => {
      setProfilePhoto(localStorage.getItem('ferex_rimi_profile_photo') || null);
    };
    window.addEventListener('ferex_rimi_avatar_change', handleAvatarChange);
    return () => window.removeEventListener('ferex_rimi_avatar_change', handleAvatarChange);
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const navSections: NavSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { label: 'Dashboard', path: '/rimi/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'SALES',
      items: [
        { label: 'Customers', path: '/rimi/customers', icon: Users },
        { label: 'Distributors', path: '/rimi/distributors', icon: Building2 },
        { label: 'Retailers', path: '/rimi/retailers', icon: Store },
        { label: 'Wholesalers', path: '/rimi/wholesalers', icon: Boxes },
        { label: 'Sales Orders', path: '/rimi/sales-orders', icon: ShoppingCart }
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { label: 'Products', path: '/rimi/products', icon: Package },
        { label: 'Inventory', path: '/rimi/inventory', icon: Boxes },
        { label: 'Warehouses', path: '/rimi/warehouses', icon: Warehouse },
        { label: 'Batch Tracking', path: '/rimi/batch-tracking', icon: QrCode },
        { label: 'Expiry Tracking', path: '/rimi/expiry-tracking', icon: Clock }
      ]
    },
    {
      title: 'LOGISTICS',
      items: [
        { label: 'Deliveries', path: '/rimi/deliveries', icon: Truck },
        { label: 'Collections', path: '/rimi/collections', icon: DollarSign },
        { label: 'Vehicles', path: '/rimi/vehicles', icon: Truck },
        { label: 'Delivery Routes', path: '/rimi/delivery-routes', icon: Navigation }
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { label: 'Sales Reports', path: '/rimi/sales-reports', icon: BarChart3 },
        { label: 'Inventory Analytics', path: '/rimi/inventory-analytics', icon: TrendingUp },
        { label: 'Revenue Analytics', path: '/rimi/revenue-analytics', icon: DollarIcon }
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Messages', path: '/rimi/messages', icon: MessageSquare, badge: '3' },
        { label: 'Notifications', path: '/rimi/notifications', icon: Bell, badge: '5' }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Profile', path: '/rimi/profile', icon: User },
        { label: 'Settings', path: '/rimi/settings', icon: Settings },
        { label: 'Logout', path: '/', icon: LogOut, isLogout: true }
      ]
    }
  ];

  const handleLogout = () => {
    showToastMsg('Logging out from Rimi Distribution Console...');
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  const activeItem = navSections.flatMap(s => s.items).find(i => i.path === location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 flex text-left font-sans antialiased text-slate-900 selection:bg-[#6A1B2E] selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <Link to="/rimi/dashboard" className="flex items-center gap-3 overflow-hidden">
            {!sidebarOpen ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="RIMI FROZEN" />
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Toggle Sidebar"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {sidebarOpen && (
                <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  {section.title}
                </span>
              )}
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all group ${
                      isActive
                        ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#6A1B2E]'}`} />
                    {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {sidebarOpen && item.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-[#6A1B2E]' : 'bg-[#6A1B2E]/10 text-[#6A1B2E]'}`}>
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
        {sidebarOpen && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] text-white text-xs font-black flex items-center justify-center overflow-hidden shrink-0">
                {profilePhoto ? <img src={profilePhoto} alt="Rimi User" className="w-full h-full object-cover" /> : 'RF'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-black text-slate-900 truncate">Rimi Cold Manager</span>
                <span className="text-[10px] font-semibold text-slate-400 truncate">rimi@ferex.com</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace Layout */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
              <span className="text-slate-700">Rimi Distribution</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#6A1B2E] font-black">{activeItem?.label || 'Console'}</span>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Bar Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 h-9 px-3 bg-slate-100/80 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-400 border border-slate-200/60 transition-all w-36 sm:w-64"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Search products, orders...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[9px] font-extrabold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">⌘K</kbd>
            </button>

            {/* Quick Actions Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="h-9 px-3 rounded-xl bg-[#6A1B2E] text-white text-xs font-bold hover:bg-[#521221] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Entry</span>
              </button>

              <AnimatePresence>
                {showQuickActions && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowQuickActions(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-40 space-y-1"
                    >
                      <span className="text-[10px] font-black uppercase text-slate-400 px-3 py-1 block">FMCG Operations</span>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/sales-orders'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#6A1B2E] flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-[#6A1B2E]" /> Create Sales Order
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/products'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#6A1B2E] flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-[#6A1B2E]" /> Add Frozen SKU
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/deliveries'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#6A1B2E] flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-[#6A1B2E]" /> Dispatch Reefer Truck
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
                className="w-9 h-9 rounded-xl bg-slate-100/80 hover:bg-slate-100 flex items-center justify-center text-slate-600 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              <AnimatePresence>
                {showNotifPopover && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifPopover(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-40 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-900">Cold Chain Alerts</span>
                        <span className="text-[10px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-full">3 New</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 space-y-0.5">
                          <span className="font-extrabold text-amber-900 block">Reefer Truck #MH-12 Temp Alert</span>
                          <span className="text-[10.5px] font-semibold text-amber-700 block">Temperature reached -14°C (Limit -18°C)</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                          <span className="font-extrabold text-slate-900 block">Order #SO-2026-901 Delivered</span>
                          <span className="text-[10.5px] font-semibold text-slate-500 block">Reliance Fresh Cold Hub confirmed stock</span>
                        </div>
                      </div>
                      <button onClick={() => { setShowNotifPopover(false); navigate('/rimi/notifications'); }} className="w-full text-center text-xs font-bold text-[#6A1B2E] hover:underline pt-1 block">
                        View All Notifications →
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
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] text-white text-xs font-black flex items-center justify-center overflow-hidden border border-white shadow-2xs">
                  {profilePhoto ? <img src={profilePhoto} alt="Rimi Profile" className="w-full h-full object-cover" /> : 'RF'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-40 space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-900 block">Rimi Cold Manager</span>
                        <span className="text-[10px] font-semibold text-slate-400 block">rimi@ferex.com</span>
                      </div>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/rimi/profile'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Account Profile
                      </button>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/rimi/settings'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-slate-500" /> Cold Chain Settings
                      </button>
                      <button onClick={() => { setShowProfileDropdown(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" /> Logout
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search FMCG Products, Orders, Warehouses, Batches..."
                  className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
                />
                <button onClick={() => setShowSearchModal(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 block">Quick Navigation Suggestions</span>
                {[
                  { label: 'Frozen Poultry & Chicken Nuggets SKU', path: '/rimi/products' },
                  { label: 'Active Sales Orders (SO-2026-901)', path: '/rimi/sales-orders' },
                  { label: 'Mumbai Central Cold Storage Warehouse', path: '/rimi/warehouses' },
                  { label: 'Lot & Batch Expiry Monitor', path: '/rimi/expiry-tracking' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setShowSearchModal(false); navigate(s.path); }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between"
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
            <motion.div initial={{ translateX: '-100%' }} animate={{ translateX: 0 }} exit={{ translateX: '-100%' }} transition={{ duration: 0.25 }} className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl p-4 overflow-y-auto lg:hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] text-white flex items-center justify-center font-black">
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-slate-900">RIMI FROZEN</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                {navSections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 px-2 block">{sec.title}</span>
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                          location.pathname === item.path ? 'bg-[#6A1B2E] text-white' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
