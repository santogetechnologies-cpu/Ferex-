import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Milestone, Target, GraduationCap, FileText, Folder, CreditCard,
  FileSpreadsheet, Calendar, LifeBuoy, Bell, User,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Settings, X, ShieldCheck, Plane
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { notifications, markRead } = useNotifications(user?.id);

  // Responsive states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');



  // Live database profile resolution
  const [studentDetail, setStudentDetail] = useState<{ name: string; email: string }>({
    name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
  });

  useEffect(() => {
    const loadLiveStudent = async () => {
      let searchId = user?.id || profile?.id;
      let searchEmail = user?.email || profile?.email;

      if (!searchId && !searchEmail) {
        try {
          const raw = localStorage.getItem('ferex_user');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
              searchId = parsed.id;
              searchEmail = parsed.email;
            }
          }
        } catch (e) {}
      }

      if (!searchId && !searchEmail) return;

      try {
        let query = supabase.from('users').select('full_name, email').limit(1);
        if (searchId) {
          query = query.eq('id', searchId);
        } else if (searchEmail) {
          query = query.ilike('email', searchEmail);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          setStudentDetail({
            name: data.full_name || '',
            email: data.email || searchEmail || '',
          });
        } else if (profile?.full_name) {
          setStudentDetail({
            name: profile.full_name,
            email: profile.email || user?.email || searchEmail || '',
          });
        }
      } catch (e) {}
    };

    loadLiveStudent();
    window.addEventListener('ferex_auth_change', loadLiveStudent);
    return () => window.removeEventListener('ferex_auth_change', loadLiveStudent);
  }, [user, profile]);

  const displayName = studentDetail.name || profile?.full_name || user?.email?.split('@')[0] || 'Active Student';
  const displayEmail = studentDetail.email || profile?.email || user?.email || '';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'S';

  // Persistent avatar sync
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    const key = user?.id ? `ferex_student_profile_photo_${user.id}` : 'ferex_student_profile_photo';
    return localStorage.getItem(key) || profile?.avatar_url || null;
  });

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
    };
    const syncPhoto = () => {
      const key = user?.id ? `ferex_student_profile_photo_${user.id}` : 'ferex_student_profile_photo';
      setProfilePhoto(localStorage.getItem(key) || profile?.avatar_url || null);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('ferex_avatar_change', syncPhoto);
    window.addEventListener('storage', syncPhoto);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('ferex_avatar_change', syncPhoto);
      window.removeEventListener('storage', syncPhoto);
    };
  }, [user?.id, profile?.avatar_url]);

  // Track visited pages to clear notification pointers once viewed
  const [visitedRoutes, setVisitedRoutes] = useState<Record<string, boolean>>(() => {
    try {
      const key = user?.id ? `ferex_visited_student_routes_${user.id}` : 'ferex_visited_student_routes';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (location.pathname && user?.id) {
      const key = `ferex_visited_student_routes_${user.id}`;
      setVisitedRoutes(prev => {
        if (prev[location.pathname]) return prev;
        const updated = { ...prev, [location.pathname]: true };
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
  }, [location.pathname, user?.id]);



  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const hasUnreadCategory = (categoryName: string) => {
    return notifications.some(
      (n: any) => !n.is_read && n.category?.toLowerCase().includes(categoryName.toLowerCase())
    );
  };

  const hasUnreadOffer = hasUnreadCategory('Offer') && !visitedRoutes['/student/offers'];
  const hasUnreadPayment = hasUnreadCategory('Payment') && !visitedRoutes['/student/payments'];
  const hasUnreadVisa = hasUnreadCategory('Visa') && !visitedRoutes['/student/visa-tracker'];
  const hasUnreadJourney = hasUnreadCategory('Application') && !visitedRoutes['/student/journey-tracker'];

  const menuItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: Home, badge: null, hasUpdate: false },
    { name: 'Journey Tracker', path: '/student/journey-tracker', icon: Milestone, badge: hasUnreadJourney ? 'ROADMAP' : null, hasUpdate: hasUnreadJourney },
    { name: 'Select University', path: '/student/select-university', icon: Target, badge: null, hasUpdate: false },
    { name: 'University Applications', path: '/student/applications', icon: GraduationCap, badge: null, hasUpdate: false },
    { name: 'Offer Letters', path: '/student/offers', icon: FileText, badge: hasUnreadOffer ? 'OFFER' : null, hasUpdate: hasUnreadOffer },
    { name: 'Documents', path: '/student/documents', icon: Folder, badge: null, hasUpdate: false },
    { name: 'Payments', path: '/student/payments', icon: CreditCard, badge: hasUnreadPayment ? 'DUE' : null, hasUpdate: hasUnreadPayment },
    { name: 'VFS Visa Tracker', path: '/student/visa-tracker', icon: ShieldCheck, badge: hasUnreadVisa ? 'VFS' : null, hasUpdate: hasUnreadVisa },
    { name: 'Post Travel (Stage 12)', path: '/student/pre-departure', icon: Plane, badge: null, hasUpdate: false },
    { name: 'Invoices', path: '/student/invoices', icon: FileSpreadsheet, badge: null, hasUpdate: false },
    { name: 'Meetings', path: '/student/meetings', icon: Calendar, badge: null, hasUpdate: false },
    { name: 'Support Tickets', path: '/student/support', icon: LifeBuoy, badge: null, hasUpdate: false },
    { name: 'Notifications', path: '/student/notifications', icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : null, hasUpdate: unreadCount > 0 },
    { name: 'My Profile', path: '/student/profile', icon: User, badge: null, hasUpdate: false },
  ];

  const activeItem = menuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = async () => {
    await signOut();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/#/login';
  };



  return (
    <div className="min-h-screen bg-slate-50/80 flex text-slate-800 antialiased selection:bg-[#6A1B2E]/10 selection:text-[#6A1B2E]">

      {/* MOBILE SIDEBAR DRAWER BACKDROP */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200/80 z-50 flex flex-col transition-all duration-300 ease-out shadow-xs select-none
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center overflow-hidden">
            {isCollapsed ? (
              <Logo variant="icon" size="sm" />
            ) : (
              <Logo variant="compact" size="sm" subtitle="STUDENT" />
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
                  <span className="truncate flex-1 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.hasUpdate && (
                      <span className="relative flex h-2 w-2 ml-1 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </span>
                )}

                {!isCollapsed && item.badge && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 transition-colors
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : item.badge === 'OFFER' || item.badge === 'DUE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 font-black'
                        : 'bg-slate-100 text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>


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
                {notifications.some((n: any) => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#6A1B2E] rounded-full ring-2 ring-white animate-pulse" />
                )}
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
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900">Notifications</h4>
                        {notifications.filter((n: any) => !n.is_read).length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#6A1B2E] text-white">
                            {notifications.filter((n: any) => !n.is_read).length} New
                          </span>
                        )}
                      </div>
                      <button onClick={() => { setShowNotifications(false); navigate('/student/notifications'); }} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">View All</button>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {((notifications && notifications.length > 0) ? notifications : [
                        {
                          id: 'pop-1',
                          title: 'Offer Letter Available for Review',
                          body: 'Your official conditional offer letter from Warsaw University of Technology has been uploaded.',
                          category: 'Offer Letter',
                          is_read: false,
                          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        },
                        {
                          id: 'pop-2',
                          title: 'Payment Receipt Ready',
                          body: 'Your 1st installment payment receipt and invoice are ready in Payments.',
                          category: 'Payment',
                          is_read: false,
                          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                        },
                        {
                          id: 'pop-3',
                          title: 'VFS Visa Process Active',
                          body: 'Stage 3: NAWA clearance & VFS Slot booking is active. View live tracking on VFS Tracker.',
                          category: 'VFS Visa',
                          is_read: true,
                          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                        },
                      ]).slice(0, 5).map((n: any) => {
                        const routes: Record<string, string> = {
                          'Offer Letter': '/student/documents',
                          'Application': '/student/journey',
                          'Payment': '/student/payments',
                          'VFS Visa': '/student/visa',
                          'Counselor Session': '/student/meetings',
                          'Support': '/student/support',
                        };
                        const targetRoute = routes[n.category] || '/student/notifications';

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.is_read) markRead(n.id);
                              setShowNotifications(false);
                              navigate(targetRoute);
                            }}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                              !n.is_read ? 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-100/50' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                            </div>
                            <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                              {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
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
                    <img src={profilePhoto} alt={displayName} className="w-6.5 h-6.5 rounded-lg object-cover border border-slate-200 shadow-2xs" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-lg bg-[#6A1B2E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {initialLetter}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 leading-none">{displayName}</span>
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
                      <p className="text-xs font-extrabold text-slate-900">{displayName}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">{displayEmail}</p>
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

