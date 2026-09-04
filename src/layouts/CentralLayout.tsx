import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShieldCheck, UserCheck,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Bell, X, Crown,
  Globe, Snowflake, Monitor, GraduationCap, ArrowUpRight
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

interface CentralLayoutProps {
  children: React.ReactNode;
}

export const CentralLayout: React.FC<CentralLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDivisionMenu, setShowDivisionMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
      setShowDivisionMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const menuSections = [
    {
      title: 'COMMAND HQ',
      items: [
        { name: 'Dashboard', path: '/central/dashboard', icon: LayoutDashboard, badge: 'HQ Live' },
      ]
    },
    {
      title: 'GOVERNANCE & ACCESS',
      items: [
        { name: 'Division Admins', path: '/central/admins', icon: ShieldCheck, badge: '4 Apps' },
        { name: 'Roles & Privileges', path: '/central/roles', icon: UserCheck, badge: 'RBAC' },
      ]
    }
  ];

  const allMenuItems = menuSections.flatMap(s => s.items);
  const activeItem = allMenuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';
  const superAdminName = profile?.full_name || 'Super Admin';
  const superAdminEmail = profile?.email || user?.email || 'admin@ferex.com';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#6A1B2E]/10 selection:text-[#6A1B2E]">
      
      {/* MOBILE SIDEBAR DRAWER BACKDROP */}
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

      {/* SIDEBAR PANEL */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between transition-all duration-300 ease-out shadow-xs
          ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[275px]'} 
          ${isMobileOpen ? 'translate-x-0 w-[275px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="SUPER ADMIN HQ" />
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin select-none text-left">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`relative flex items-center rounded-xl h-9 px-3 transition-all duration-200 text-xs font-bold group
                      ${isActive 
                        ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/15' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6A1B2E]'}`} />
                    
                    {!isCollapsed && (
                      <span className="truncate flex-1 font-extrabold">
                        {item.name}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 transition-colors
                        ${isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'HQ Live' || item.badge === 'Create'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.badge === 'Core' || item.badge === 'ERP' || item.badge === 'FMCG' || item.badge === 'Agency'
                              ? 'bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20'
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

        {/* Sidebar Footer – Super Admin profile strip */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-xs font-black shadow-xs">
                {superAdminName[0]?.toUpperCase() || 'S'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-extrabold text-slate-900 truncate">{superAdminName}</p>
                <p className="text-[9.5px] font-bold text-[#6A1B2E] uppercase tracking-wider truncate">SUPER ADMIN</p>
              </div>
            )}
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

      {/* CONTENT WORKSPACE VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* STICKY TOP NAVBAR */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-30 h-16 flex items-center justify-between px-4 sm:px-6 select-none shrink-0 shadow-xs">
          
          {/* Left part: Toggles, Breadcrumbs & Division Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Toggle sidebar menu"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Collapse sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/central/dashboard" className="hover:text-slate-700 transition-colors text-slate-500 font-extrabold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-[#6A1B2E]" /> Central Super Admin
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{activeItem}</span>
            </div>

            {/* Quick Division Switcher Dropdown */}
            <div className="relative hidden md:block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowDivisionMenu(!showDivisionMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6A1B2E]/10 hover:bg-[#6A1B2E]/15 text-[#6A1B2E] border border-[#6A1B2E]/20 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" /> 4 Apps Switcher <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {showDivisionMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-64 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Jump to Division App
                    </div>
                    {[
                      { name: 'Ferex Education', path: '/admin/dashboard', desc: 'Education Admin Portal', icon: GraduationCap, color: 'text-rose-600 bg-rose-50' },
                      { name: 'Global Trade', path: '/trade/dashboard', desc: 'Trade CRM, LC & Shipping', icon: Globe, color: 'text-indigo-600 bg-indigo-50' },
                      { name: 'Rimi Frozen', path: '/rimi/dashboard', desc: 'FMCG, Warehouse & Batch', icon: Snowflake, color: 'text-cyan-600 bg-cyan-50' },
                      { name: 'Ferex Digital', path: '/digital/dashboard', desc: 'Projects, Tasks & Invoices', icon: Monitor, color: 'text-emerald-600 bg-emerald-50' },
                    ].map((div) => (
                      <button
                        key={div.path}
                        onClick={() => {
                          setShowDivisionMenu(false);
                          navigate(div.path);
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group cursor-pointer"
                      >
                        <div className={`w-8 h-8 rounded-lg ${div.color} flex items-center justify-center shrink-0`}>
                          <div.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">{div.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400 truncate">{div.desc}</p>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right part: Search, Notification and Avatar Controls */}
          <div className="flex items-center gap-3">
            
            {/* Global Command Search Box */}
            <div className="relative hidden md:block w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search central database, logs..."
                className="w-full h-9 pl-9 pr-8 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/40 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileDropdown(false);
                }}
                className="relative p-2 text-slate-600 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
                aria-label="View notifications"
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
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-3 text-left z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2 select-none px-1">
                      <h4 className="text-xs font-extrabold text-slate-900">Executive Alert Desk</h4>
                      <span className="text-[10px] font-bold text-[#6A1B2E]">4 High Severity</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                        <p className="text-xs font-bold text-rose-800">Trade LC Settlement Due</p>
                        <p className="text-[10px] font-medium text-rose-600">EUR 120,000 Letter of Credit requires executive approval</p>
                      </div>
                      <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-xs font-bold text-amber-800">Rimi Cold Chain Expiry Warning</p>
                        <p className="text-[10px] font-medium text-amber-600">Batch B-884 entering 30-day expiry window</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-xs font-bold text-emerald-800">Education Fee Installment Received</p>
                        <p className="text-[10px] font-medium text-emerald-600">₹4.8L Wire transferred for Warsaw University batch</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Trigger Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 p-1 pl-2 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
                aria-label="User profile menu"
              >
                <span className="text-xs font-extrabold text-slate-800 hidden sm:inline-block">
                  Super Admin
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#6A1B2E] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {superAdminName[0]?.toUpperCase() || 'S'}
                </div>
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-extrabold text-slate-900">{superAdminName}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{superAdminEmail}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate('/central/admins');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#6A1B2E]" /> Manage Division Admins
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate('/central/roles');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Roles & Privileges
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* MAIN BODY OUTLET */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
