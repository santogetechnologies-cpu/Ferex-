import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Milestone, Target, GraduationCap, FileText, Folder, CreditCard,
  FileSpreadsheet, Calendar, LifeBuoy, Bell, User,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Settings, X, ShieldCheck, Plane, MessageCircle, FileCheck
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { supabase } from '../lib/supabase';
import { normalizeRole, getDashboardRoute } from '../lib/roleRouter';
import { EnterpriseAIChatbot } from '../components/EnterpriseAIChatbot';
import { isAgreementSigned } from '../lib/api/agreement';
import { getImpersonatedStudent, stopImpersonatingStudent, type ImpersonatedStudent } from '../lib/api/studentImpersonation';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { notifications, markRead } = useNotifications(user?.id);
  const { config } = useSystemConfig();

  const [impersonated, setImpersonated] = useState<ImpersonatedStudent | null>(() => getImpersonatedStudent());

  useEffect(() => {
    const handleImpersonationChange = () => {
      setImpersonated(getImpersonatedStudent());
    };
    window.addEventListener('ferex-impersonation-changed', handleImpersonationChange);
    return () => window.removeEventListener('ferex-impersonation-changed', handleImpersonationChange);
  }, []);

  // Authoritative role guard: if non-student is here and NOT impersonating, redirect immediately to their dashboard
  useEffect(() => {
    const isImpersonating = Boolean(getImpersonatedStudent());
    if (isImpersonating) return; // Allow admin/counselor to manage student portal

    const rawRole = profile?.role || user?.user_metadata?.role;
    if (rawRole) {
      const normalized = normalizeRole(rawRole, user?.email);
      if (normalized !== 'student') {
        navigate(getDashboardRoute(normalized, user?.email), { replace: true });
      }
    }
  }, [profile?.role, user?.user_metadata?.role, user?.email, navigate]);

  const handleExitImpersonation = () => {
    const returnRole = impersonated?.originalAdminRole;
    stopImpersonatingStudent();
    if (returnRole === 'counselor') {
      navigate('/staff/students');
    } else {
      navigate('/admin/students');
    }
  };

  // Responsive states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live database profile resolution
  const [studentDetail, setStudentDetail] = useState<{ name: string; email: string }>({
    name: impersonated?.name || profile?.full_name || '',
    email: impersonated?.email || profile?.email || user?.email || '',
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

  // Track service agreement status
  const [hasSignedAgreement, setHasSignedAgreement] = useState<boolean>(() => {
    return isAgreementSigned(user?.id || profile?.id || '');
  });

  useEffect(() => {
    const checkAgreement = () => {
      setHasSignedAgreement(isAgreementSigned(user?.id || profile?.id || ''));
    };
    checkAgreement();
    window.addEventListener('ferex_agreement_change', checkAgreement);
    window.addEventListener('storage', checkAgreement);
    return () => {
      window.removeEventListener('ferex_agreement_change', checkAgreement);
      window.removeEventListener('storage', checkAgreement);
    };
  }, [user?.id, profile?.id]);

  const menuItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: Home, badge: null, hasUpdate: false },
    {
      name: 'Service Agreement',
      path: '/student/agreement',
      icon: FileCheck,
      badge: !hasSignedAgreement ? 'SIGN' : null,
      hasUpdate: !hasSignedAgreement,
    },
    { name: 'Journey Tracker', path: '/student/journey-tracker', icon: Milestone, badge: hasUnreadJourney ? 'ROADMAP' : null, hasUpdate: hasUnreadJourney },
    { name: 'Select University', path: '/student/select-university', icon: Target, badge: null, hasUpdate: false },
    { name: 'University Applications', path: '/student/applications', icon: GraduationCap, badge: null, hasUpdate: false },
    { name: 'Offer Letters', path: '/student/offers', icon: FileText, badge: hasUnreadOffer ? 'OFFER' : null, hasUpdate: hasUnreadOffer },
    { name: 'Documents', path: '/student/documents', icon: Folder, badge: null, hasUpdate: false },
    { name: 'Payments', path: '/student/payments', icon: CreditCard, badge: hasUnreadPayment ? 'DUE' : null, hasUpdate: hasUnreadPayment },
    { name: 'VFS Visa Tracker', path: '/student/visa-tracker', icon: ShieldCheck, badge: hasUnreadVisa ? 'VFS' : null, hasUpdate: hasUnreadVisa },
    { name: 'Pre-Departure', path: '/student/pre-departure', icon: Plane, badge: null, hasUpdate: false },
    { name: 'Invoices', path: '/student/invoices', icon: FileSpreadsheet, badge: null, hasUpdate: false },
    { name: 'Meetings', path: '/student/meetings', icon: Calendar, badge: null, hasUpdate: false },
    { name: 'Support Tickets', path: '/student/support', icon: LifeBuoy, badge: null, hasUpdate: false },
    { name: 'My Profile', path: '/student/profile', icon: User, badge: null, hasUpdate: false },
  ];

  const activeItem = menuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  const handleSignOut = async () => {
    await signOut();
    try {
      localStorage.removeItem('ferex_user');
      localStorage.removeItem('ferex_role');
      localStorage.removeItem('ferex_staff_demo_session');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 antialiased selection:bg-[#58051E]/10 selection:text-[#58051E]">

      {/* MOBILE SIDEBAR DRAWER BACKDROP */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`fixed top-0 left-0 bottom-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-40 flex flex-col transition-all duration-200 ease-out select-none
        ${isCollapsed ? 'w-18' : 'w-60'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Sidebar Header */}
        <div className="h-14 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 select-none shrink-0">
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
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin select-none">
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Portal Menu</div>
          )}
          {menuItems.map((item) => {
            const isActive = item.name === activeItem;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`relative flex items-center rounded-xl h-9 px-2.5 transition-all duration-150 text-xs font-semibold group
                  ${isActive
                    ? 'bg-[#58051E]/8 text-[#58051E] font-bold border-l-2 border-[#58051E]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isCollapsed ? 'mx-auto' : 'mr-2.5'} ${isActive ? 'text-[#58051E]' : 'text-slate-400 group-hover:text-slate-700'}`} />

                {!isCollapsed && (
                  <span className="truncate flex-1 flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.hasUpdate && (
                      <span className="relative flex h-1.5 w-1.5 ml-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                    )}
                  </span>
                )}

                {!isCollapsed && item.badge && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 transition-colors
                    ${isActive
                      ? 'bg-[#58051E]/15 text-[#58051E]'
                      : item.badge === 'OFFER' || item.badge === 'DUE'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
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
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200 ${isCollapsed ? 'lg:pl-18' : 'lg:pl-60'}`}>

        {/* COUNSELOR / ADMIN IMPERSONATION BANNER */}
        {impersonated && (
          <div className="bg-gradient-to-r from-amber-600 via-[#58051E] to-[#3a0213] text-white px-4 py-2 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                👑 <strong>Admissions Staff Impersonation</strong>: You are managing the portal as student <strong>{impersonated.name}</strong> ({impersonated.email}) • Destination: {impersonated.country || 'Europe'}
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Exit Student Portal & Return to Admin</span>
            </button>
          </div>
        )}

        {/* STICKY TOP NAVBAR */}
        <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 z-30 h-14 flex items-center justify-between px-4 sm:px-6 select-none shrink-0">

          {/* Left part: Toggles & Breadcrumbs */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle sidebar menu"
            >
              <Menu size={18} />
            </button>

            {/* Desktop toggle helper */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Link to="/student/dashboard" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-slate-500 dark:text-slate-400 font-semibold">
                Portal
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="text-slate-800 dark:text-white font-bold bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">{activeItem}</span>
            </div>
          </div>

          {/* Right part: Search, Notification and Avatar Controls */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Global Search Box */}
            <div className="relative hidden md:block w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search portal..."
                className="w-full h-8.5 pl-8.5 pr-8 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#58051E]/40 dark:focus:border-rose-400 focus:ring-2 focus:ring-[#58051E]/5 transition-all"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.2 text-[9px] font-bold text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Dark Mode / Light Mode Switcher */}
            <ThemeToggle size="sm" />

            {/* Profile Dropdown Trigger */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 h-9.5 px-3 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none group"
              >
                <div className="relative">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={displayName} className="w-6.5 h-6.5 rounded-lg object-cover border border-slate-200 shadow-2xs" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-lg bg-[#58051E] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {initialLetter}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <span className="block text-xs font-extrabold text-slate-800 dark:text-white leading-none">{displayName}</span>
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
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-left"
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
                        onClick={() => navigate('/student/settings')}
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

      {/* ── 24/7 FEREX AI STUDENT COPILOT & REALTIME VOICE ── */}
      <EnterpriseAIChatbot
        role="student"
        studentContext={{
          studentName: studentDetail.name || profile?.full_name || 'Student',
          email: studentDetail.email || profile?.email || user?.email,
          targetCountry: (user?.id ? localStorage.getItem(`ferex_student_target_country_${user.id}`) : null) || 'European Union',
          targetUniversity: 'European Partner Universities',
          program: 'Higher Education Program',
          currentStep: hasSignedAgreement ? 3 : 2,
          stepTitle: hasSignedAgreement ? 'Document Review & University Application' : 'Service Agreement Signing',
          assignedCounselor: 'Admissions Officer',
          visaStatus: 'Document Preparation',
        }}
      />
    </div>
  );
};

