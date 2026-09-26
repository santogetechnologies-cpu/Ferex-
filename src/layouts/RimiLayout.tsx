import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Snowflake, LayoutDashboard, Users, ShoppingCart,
  Package, Boxes, Warehouse, Truck, DollarSign,
  Navigation, BarChart3, MessageSquare,
  Bell, User, Settings, LogOut, Search, Menu, ChevronRight, ChevronDown, X, Plus, CheckCircle2, Shield, Sparkles
} from 'lucide-react';

import { Logo } from '../components/Logo';
import { AppSwitcher } from '../components/AppSwitcher';
import { ToastNotification } from '../components/ToastNotification';
import { useAuth } from '../contexts/AuthContext';

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

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiLayout: React.FC<RimiLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const userRole = profile?.role || '';
  const userName = profile?.full_name || '';
  const userEmail = profile?.email || 'rimi@ferex.com';
  const isAdmin = RIMI_ADMIN_ROLES.includes(userRole);
  const isStaff = !isAdmin;

  const roleLabel = isAdmin ? 'Cold Chain Admin' : 'Operations Manager';
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : (isAdmin ? 'RA' : 'OM');

  const sidebarOpen = true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

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

  // Unified Navigation for RIMI Frozen Distribution (Shared UI for Admin & Staff)
  const navSections: NavSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { label: 'Dashboard', path: '/rimi/dashboard', icon: LayoutDashboard },
        ...(isAdmin ? [{ label: 'AI Copilot', path: '/rimi/ai-copilot', icon: Sparkles, badge: 'AI' }] : [])
      ]
    },
    {
      title: 'CRM & SALES',
      items: [
        { label: 'Customer Directory', path: '/rimi/customers', icon: Users },
        { label: 'Sales Orders', path: '/rimi/sales-orders', icon: ShoppingCart },
        { label: 'Payment Collections', path: '/rimi/collections', icon: DollarSign }
      ]
    },
    {
      title: 'INVENTORY & COLD CHAIN',
      items: [
        { label: 'Products Catalog', path: '/rimi/products', icon: Package },
        { label: 'Inventory & Batches', path: '/rimi/inventory', icon: Boxes },
        { label: 'Cold Warehouses', path: '/rimi/warehouses', icon: Warehouse }
      ]
    },
    {
      title: 'LOGISTICS & FLEET',
      items: [
        { label: 'Deliveries & Dispatch', path: '/rimi/deliveries', icon: Truck },
        { label: 'Reefer Vehicles', path: '/rimi/vehicles', icon: Truck },
        { label: 'Delivery Routes', path: '/rimi/delivery-routes', icon: Navigation }
      ]
    },
    {
      title: 'FINANCE & BI',
      items: [
        { label: 'Finance & Analytics', path: '/rimi/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Tasks & Assignments', path: '/rimi/tasks', icon: CheckCircle2 },
        { label: 'Notifications', path: '/rimi/notifications', icon: Bell }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Profile', path: '/rimi/profile', icon: User },
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
    <div className="min-h-screen bg-slate-50 flex text-left font-sans antialiased text-slate-900 selection:bg-[#58051E] selection:text-white">
      {/* Toast Notification */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 select-none ${
          sidebarOpen ? 'w-60' : 'w-18'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-slate-100 flex items-center shrink-0">
          <Link to="/rimi/dashboard" className="flex items-center gap-3 overflow-hidden">
            {!sidebarOpen ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="RIMI FROZEN" />
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {sidebarOpen && (
                <span className="px-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
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
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-[#58051E]/8 text-[#58051E] font-bold border-l-2 border-[#58051E]'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {sidebarOpen && item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Pill with Role Indicator */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
            <div className="w-7.5 h-7.5 rounded-lg bg-[#58051E] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {profilePhoto ? <img src={profilePhoto} alt="Rimi Profile" className="w-full h-full object-cover" /> : initials}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{userName || 'Rimi Lead'}</p>
                <p className="text-[9px] font-medium text-slate-400 truncate flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-[#58051E]" /> {roleLabel}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarOpen ? 'lg:pl-60' : 'lg:pl-18'}`}>
        {/* Sticky Header */}
        <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 min-w-0">
              <Link to="/rimi/dashboard" className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1.5 shrink-0">
                <Snowflake className="w-4 h-4 text-cyan-600" />
                <span>Rimi Cold Chain</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-slate-800 font-bold bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 truncate">
                {activeItem?.label || 'Console'}
              </span>
            </div>
          </div>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Bar Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 h-8.5 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-400 border border-slate-200/80 transition-all w-36 sm:w-56 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Search products & orders...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[9px] font-bold bg-white text-slate-400 px-1.5 py-0.2 rounded border border-slate-200">⌘K</kbd>
            </button>

            {/* Google-Style 9-Dots 4-App Switcher */}
            <AppSwitcher />

            {/* Quick Actions Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="h-9 px-3 rounded-xl bg-[#58051E] text-white text-xs font-bold hover:bg-[#430316] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/sales-orders'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <ShoppingCart className="w-3.5 h-3.5 text-[#58051E]" /> Create Sales Order
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/customers'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <Users className="w-3.5 h-3.5 text-[#58051E]" /> Add Enterprise Customer
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/inventory'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <Boxes className="w-3.5 h-3.5 text-[#58051E]" /> Receive Production Batch
                      </button>
                      <button onClick={() => { setShowQuickActions(false); navigate('/rimi/deliveries'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#58051E] flex items-center gap-2 cursor-pointer">
                        <Truck className="w-3.5 h-3.5 text-[#58051E]" /> Dispatch Reefer Truck
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
                <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white text-xs font-black flex items-center justify-center overflow-hidden border border-white shadow-2xs">
                  {profilePhoto ? <img src={profilePhoto} alt="Rimi Profile" className="w-full h-full object-cover" /> : initials}
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
                        <span className="text-xs font-black text-slate-900 block">{userName || roleLabel}</span>
                        <span className="text-[10px] font-bold text-[#58051E] block">{roleLabel}</span>
                        <span className="text-[10px] font-semibold text-slate-400 block">{userEmail}</span>
                      </div>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/rimi/profile'); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Account Profile
                      </button>
                      <button onClick={() => { setShowProfileDropdown(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer">
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
                  className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <button onClick={() => setShowSearchModal(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 block">Quick Navigation Suggestions</span>
                {[
                  { label: 'Customer Directory & Accounts CRM', path: '/rimi/customers' },
                  { label: 'Sales & Distribution Orders', path: '/rimi/sales-orders' },
                  { label: 'Inventory Batches & Expiry Monitor', path: '/rimi/inventory' },
                  { label: 'Cold Storage Warehouses', path: '/rimi/warehouses' },
                  { label: 'Reefer Truck Fleet & Deliveries', path: '/rimi/deliveries' },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setShowSearchModal(false); navigate(s.path); }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer"
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
                  <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white flex items-center justify-center font-black">
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-slate-900">RIMI FROZEN</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                          location.pathname === item.path ? 'bg-[#58051E] text-white' : 'text-slate-700 hover:bg-slate-50'
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
