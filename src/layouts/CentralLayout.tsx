import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GraduationCap, Users, ShieldCheck, CheckSquare,
  CreditCard, Folder, LifeBuoy, BarChart3, TrendingUp, Activity, UserCheck, Settings,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Bell, X, Crown
} from 'lucide-react';
import { Logo } from '../components/Logo';

interface CentralLayoutProps {
  children: React.ReactNode;
}

export const CentralLayout: React.FC<CentralLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const menuSections = [
    {
      title: 'CENTRAL HQ',
      items: [
        { name: 'Dashboard', path: '/central/dashboard', icon: LayoutDashboard, badge: 'Live' },
      ]
    },
    {
      title: 'EDUCATION',
      items: [
        { name: 'Education Overview', path: '/central/education', icon: GraduationCap, badge: null },
        { name: 'Students', path: '/central/students', icon: Users, badge: '1.4k' },
        { name: 'Admins', path: '/central/admins', icon: ShieldCheck, badge: '24' },
        { name: 'Tasks', path: '/central/tasks', icon: CheckSquare, badge: '8' },
        { name: 'Payments', path: '/central/payments', icon: CreditCard, badge: '₹4.8Cr' },
        { name: 'Documents', path: '/central/documents', icon: Folder, badge: null },
        { name: 'Support', path: '/central/support', icon: LifeBuoy, badge: '3' },
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { name: 'Reports', path: '/central/reports', icon: BarChart3, badge: null },
        { name: 'Executive Insights', path: '/central/insights', icon: TrendingUp, badge: 'CEO' },
        { name: 'Activity Logs', path: '/central/activity', icon: Activity, badge: 'Audit' },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Users & Roles', path: '/central/roles', icon: UserCheck, badge: null },
        { name: 'Notifications', path: '/central/notifications', icon: Bell, badge: '4' },
        { name: 'Settings', path: '/central/settings', icon: Settings, badge: null },
      ]
    }
  ];

  const allMenuItems = menuSections.flatMap(s => s.items);
  const activeItem = allMenuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = () => {
    navigate('/');
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
          ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[270px]'} 
          ${isMobileOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="SUPER ADMIN" />
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
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400">
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
                          : item.badge === 'Live' || item.badge === 'CEO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

        {/* Sidebar Footer – profile/settings strip, no collapse button here */}
      </aside>

      {/* CONTENT WORKSPACE VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* STICKY TOP NAVBAR */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-30 h-16 flex items-center justify-between px-4 sm:px-6 select-none shrink-0 shadow-xs">
          
          {/* Left part: Toggles & Breadcrumbs */}
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
                <Crown className="w-3.5 h-3.5 text-[#6A1B2E]" /> Central Admin
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{activeItem}</span>
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
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Notification Bell */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileDropdown(false);
                }}
                className="relative p-2 text-slate-600 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors"
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
                      <div onClick={() => navigate('/central/payments')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">High Volume Payment Cleared</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">₹4.8L batch payout processed to Warsaw partner.</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">5m ago</span>
                      </div>
                      <div onClick={() => navigate('/central/activity')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">Role Permission Changed</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">Superadmin granted Counselor access to Rahul Mehta.</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">1h ago</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown Trigger */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 h-9.5 px-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors select-none group"
              >
                <div className="relative">
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#6A1B2E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    SA
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>
                
                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">Super Admin</span>
                  <span className="block text-[9px] font-semibold text-[#6A1B2E] mt-0.5 font-black">Owner Console</span>
                </div>
                
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-900">Ferex Super Admin</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">superadmin@gmail.com</p>
                    </div>
                    <div className="py-1">
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        onClick={() => navigate('/central/settings')}
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        System Settings
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        onClick={() => navigate('/central/roles')}
                      >
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        Manage Roles
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out to Main Login
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* MAIN BODY AREA */}
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
