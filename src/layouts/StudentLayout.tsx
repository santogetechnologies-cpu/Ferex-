import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Milestone, Target, GraduationCap, FileText, Folder, CreditCard,
  FileSpreadsheet, Receipt, Calendar, MessageSquare, LifeBuoy, Bell, User,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Settings, X
} from 'lucide-react';
import { Logo } from '../components/Logo';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Responsive states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Persistent avatar sync
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_student_profile_photo') || null;
  });

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
    };
    const syncPhoto = () => {
      setProfilePhoto(localStorage.getItem('ferex_student_profile_photo') || null);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('ferex_avatar_change', syncPhoto);
    window.addEventListener('storage', syncPhoto);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('ferex_avatar_change', syncPhoto);
      window.removeEventListener('storage', syncPhoto);
    };
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: Home, badge: null },
    { name: 'Journey Tracker', path: '/student/journey-tracker', icon: Milestone, badge: 'Step 4' },
    { name: 'Select University', path: '/student/select-university', icon: Target, badge: 'NEW' },
    { name: 'University Applications', path: '/student/applications', icon: GraduationCap, badge: '3' },
    { name: 'Offer Letters', path: '/student/offers', icon: FileText, badge: '1' },
    { name: 'Documents', path: '/student/documents', icon: Folder, badge: '5' },
    { name: 'Payments', path: '/student/payments', icon: CreditCard, badge: null },
    { name: 'Invoices', path: '/student/invoices', icon: FileSpreadsheet, badge: null },
    { name: 'Receipts', path: '/student/receipts', icon: Receipt, badge: null },
    { name: 'Meetings', path: '/student/meetings', icon: Calendar, badge: 'Today' },
    { name: 'Chat', path: '/student/chat', icon: MessageSquare, badge: '2' },
    { name: 'Support Tickets', path: '/student/support', icon: LifeBuoy, badge: null },
    { name: 'Notifications', path: '/student/notifications', icon: Bell, badge: '3' },
    { name: 'My Profile', path: '/student/profile', icon: User, badge: null },
  ];

  const activeItem = menuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

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
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-5 select-none shrink-0">
          <div className="flex items-center overflow-hidden">
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="STUDENT" />
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
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 scrollbar-thin select-none">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Student Portal</div>
          )}
          {menuItems.map((item) => {
            const isActive = item.name === activeItem;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`relative flex items-center rounded-xl h-9.5 px-3 transition-all duration-200 text-xs font-semibold group
                  ${isActive
                    ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isCollapsed ? 'mx-auto' : 'mr-3'} ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#6A1B2E]'}`} />

                {!isCollapsed && (
                  <span className="truncate flex-1">
                    {item.name}
                  </span>
                )}

                {!isCollapsed && item.badge && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 transition-colors
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : item.badge === 'NEW'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Collapse Trigger */}
        <div className="p-3 border-t border-slate-100 hidden lg:block select-none shrink-0 bg-slate-50/50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center h-9 border border-slate-200/80 rounded-xl hover:bg-white transition-all text-slate-500 hover:text-slate-800 shadow-2xs"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
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

            {/* Desktop toggle helper */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Collapse sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/student/dashboard" className="hover:text-slate-700 transition-colors text-slate-500 font-extrabold">
                Ferex Portal
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">{activeItem}</span>
            </div>
          </div>

          {/* Right part: Search, Notification and Avatar Controls */}
          <div className="flex items-center gap-3">

            {/* Global Search Box */}
            <div className="relative hidden md:block w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search portal, courses..."
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

              {/* Notification Popover Dropdown */}
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
                      <h4 className="text-xs font-extrabold text-slate-900">Notifications</h4>
                      <button onClick={() => navigate('/student/notifications')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">View All</button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div onClick={() => navigate('/student/applications')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">Application Status Update</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">Offer letter issued by University of Warsaw!</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">10m ago</span>
                      </div>
                      <div onClick={() => navigate('/student/documents')} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                        <p className="text-xs font-bold text-slate-900">Document Verified</p>
                        <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5">Your IELTS certificate has been verified.</p>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">2h ago</span>
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
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Ashly" className="w-6.5 h-6.5 rounded-lg object-cover border border-slate-200 shadow-2xs" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-lg bg-[#6A1B2E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      A
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">Ashly</span>
                  <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">Active Student</span>
                </div>

                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              {/* Dropdown Options */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-2 z-50 text-left"
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-900">Ashly</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">student@gmail.com</p>
                    </div>
                    <div className="py-1">
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        onClick={() => navigate('/student/profile')}
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        My Profile
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        onClick={() => navigate('/student/profile')}
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        Settings
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

