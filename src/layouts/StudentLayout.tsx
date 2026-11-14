import { getActiveStudentFeeProfile } from '../lib/educationBilling';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Milestone, Target, GraduationCap, FileText, Folder, CreditCard,
  FileSpreadsheet, Calendar, LifeBuoy, Bell, User,
  Search, Menu, ChevronDown, ChevronRight, LogOut, Settings, X, ShieldCheck, Plane, MessageCircle, FileCheck, Receipt
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useStudentFeeProfile } from '../hooks/useStudentFeeProfile';
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
  const [impersonated, setImpersonated] = useState<ImpersonatedStudent | null>(() => getImpersonatedStudent());

  useEffect(() => {
    const handleImpersonationChange = () => {
      setImpersonated(getImpersonatedStudent());
    };
    window.addEventListener('ferex-impersonation-changed', handleImpersonationChange);
    return () => window.removeEventListener('ferex-impersonation-changed', handleImpersonationChange);
  }, []);

  const effectiveStudentId = impersonated?.id || user?.id;
  const { notifications, markRead } = useNotifications(effectiveStudentId);
  // Publishes the student's package/discounts for stage gating; pages remount when they change.
  const feeProfile = useStudentFeeProfile(effectiveStudentId, true);
  const feeKey = `${feeProfile.pkg?.id ?? ''}|${Object.entries(feeProfile.overrides ?? {}).map(([k, v]) => `${k}:${v.discount_percent ?? 0}:${v.custom_amount}`).join(',')}`;
  const { config } = useSystemConfig();

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
    if (returnRole === 'counselor' || returnRole === 'staff') {
      navigate('/staff/students');
    } else if (returnRole === 'central_admin' || returnRole === 'superadmin' || returnRole === 'central') {
      navigate('/central/students');
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [studentApps, setStudentApps] = useState<any[]>([]);

  // Live database profile resolution
  const [studentDetail, setStudentDetail] = useState<{ name: string; email: string }>({
    name: impersonated?.name || profile?.full_name || '',
    email: impersonated?.email || profile?.email || user?.email || '',
  });

  useEffect(() => {
    const loadLiveStudent = async () => {
      if (impersonated) {
        setStudentDetail({
          name: impersonated.name,
          email: impersonated.email,
        });
        return;
      }

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
  }, [impersonated, user, profile]);

  const displayName = impersonated?.name || studentDetail.name || profile?.full_name || user?.email?.split('@')[0] || 'Active Student';
  const displayEmail = impersonated?.email || studentDetail.email || profile?.email || user?.email || '';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'S';

  // Persistent avatar sync
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    const key = effectiveStudentId ? `ferex_student_profile_photo_${effectiveStudentId}` : 'ferex_student_profile_photo';
    return localStorage.getItem(key) || (impersonated ? null : profile?.avatar_url) || null;
  });

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileDropdown(false);
      setShowNotifications(false);
    };
    const syncPhoto = () => {
      const key = effectiveStudentId ? `ferex_student_profile_photo_${effectiveStudentId}` : 'ferex_student_profile_photo';
      setProfilePhoto(localStorage.getItem(key) || (impersonated ? null : profile?.avatar_url) || null);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('ferex_avatar_change', syncPhoto);
    window.addEventListener('storage', syncPhoto);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('ferex_avatar_change', syncPhoto);
      window.removeEventListener('storage', syncPhoto);
    };
  }, [effectiveStudentId, impersonated, profile?.avatar_url]);

  // Track visited pages to clear notification pointers once viewed
  const [visitedRoutes, setVisitedRoutes] = useState<Record<string, boolean>>(() => {
    try {
      const key = effectiveStudentId ? `ferex_visited_student_routes_${effectiveStudentId}` : 'ferex_visited_student_routes';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (location.pathname && effectiveStudentId) {
      const key = `ferex_visited_student_routes_${effectiveStudentId}`;
      setVisitedRoutes(prev => {
        if (prev[location.pathname]) return prev;
        const updated = { ...prev, [location.pathname]: true };
        try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
  }, [location.pathname, effectiveStudentId]);

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
    return isAgreementSigned(effectiveStudentId || '');
  });

  useEffect(() => {
    const checkAgreement = () => {
      setHasSignedAgreement(isAgreementSigned(effectiveStudentId || ''));
    };
    checkAgreement();
    window.addEventListener('ferex_agreement_change', checkAgreement);
    window.addEventListener('storage', checkAgreement);
    return () => {
      window.removeEventListener('ferex_agreement_change', checkAgreement);
      window.removeEventListener('storage', checkAgreement);
    };
  }, [effectiveStudentId]);

  const menuItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: Home, badge: null, hasUpdate: false },
    {
      name: 'Service Agreement',
      path: '/student/agreement',
      icon: FileCheck,
      badge: !hasSignedAgreement ? 'SIGN' : null,
      hasUpdate: !hasSignedAgreement,
    },
    { name: 'My Journey', path: '/student/journey-tracker', icon: Milestone, badge: hasUnreadJourney ? 'ROADMAP' : null, hasUpdate: hasUnreadJourney },
    { name: 'Universities', path: '/student/select-university', icon: Target, badge: null, hasUpdate: false },
    { name: 'Applications', path: '/student/applications', icon: GraduationCap, badge: null, hasUpdate: false },
    { name: 'Offer Letters', path: '/student/offers', icon: FileText, badge: hasUnreadOffer ? 'OFFER' : null, hasUpdate: hasUnreadOffer },
    { name: 'Documents', path: '/student/documents', icon: Folder, badge: null, hasUpdate: false },
    { name: 'Payments', path: '/student/payments', icon: CreditCard, badge: hasUnreadPayment ? 'DUE' : null, hasUpdate: hasUnreadPayment },
    { name: 'Receipts', path: '/student/receipts', icon: Receipt, badge: null, hasUpdate: false },
    { name: 'Visa', path: '/student/visa-tracker', icon: ShieldCheck, badge: hasUnreadVisa ? 'VFS' : null, hasUpdate: hasUnreadVisa },
    { name: 'Pre-Departure', path: '/student/pre-departure', icon: Plane, badge: null, hasUpdate: false },
    { name: 'Invoices', path: '/student/invoices', icon: FileSpreadsheet, badge: null, hasUpdate: false },
    { name: 'Meetings', path: '/student/meetings', icon: Calendar, badge: null, hasUpdate: false },
    { name: 'Chat', path: '/student/chat', icon: MessageCircle, badge: null, hasUpdate: false },
    { name: 'Notifications', path: '/student/notifications', icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : null, hasUpdate: unreadCount > 0 },
    { name: 'Support', path: '/student/support', icon: LifeBuoy, badge: null, hasUpdate: false },
    { name: 'Profile', path: '/student/profile', icon: User, badge: null, hasUpdate: false },
  ];

  const activeItem = menuItems.find(item => location.pathname === item.path)?.name || 'Dashboard';

  // Live student application tracking for search portal
  useEffect(() => {
    if (!effectiveStudentId) return;
    const fetchStudentApps = async () => {
      try {
        const { data } = await supabase
          .from('applications')
          .select('id, university_name, course, program_name, status, intake')
          .eq('student_id', effectiveStudentId);
        if (data && data.length > 0) {
          setStudentApps(data);
          return;
        }
      } catch {}
      try {
        const raw = localStorage.getItem('ferex_applications_backup');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setStudentApps(parsed.filter((a: any) => a.student_id === effectiveStudentId));
          }
        }
      } catch {}
    };
    fetchStudentApps();
    window.addEventListener('ferex_application_change', fetchStudentApps);
    return () => window.removeEventListener('ferex_application_change', fetchStudentApps);
  }, [effectiveStudentId]);

  // Global keyboard shortcut (⌘K / Ctrl+K / Escape) & click-outside
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowProfileDropdown(false);
        setShowNotifications(false);
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const baseSearchItems: {
    id: string;
    title: string;
    subtitle: string;
    path: string;
    category: 'Page' | 'Application' | 'Document' | 'Financial';
    icon: any;
    keywords: string[];
  }[] = [
    {
      id: 'page-dashboard',
      title: 'Student Dashboard',
      subtitle: 'Overview, quick metrics, announcements & next steps',
      path: '/student/dashboard',
      category: 'Page',
      icon: Home,
      keywords: ['dashboard', 'home', 'overview', 'summary', 'status', 'metrics'],
    },
    {
      id: 'page-agreement',
      title: 'Service Agreement',
      subtitle: 'Review & sign your educational consultancy contract',
      path: '/student/agreement',
      category: 'Page',
      icon: FileCheck,
      keywords: ['agreement', 'service agreement', 'sign', 'contract', 'legal', 'terms'],
    },
    {
      id: 'page-journey',
      title: 'My Journey',
      subtitle: 'Step-by-step roadmap from admission to campus arrival',
      path: '/student/journey-tracker',
      category: 'Page',
      icon: Milestone,
      keywords: ['journey', 'tracker', 'roadmap', 'milestones', 'stages', 'timeline', 'progress'],
    },
    {
      id: 'page-select-uni',
      title: 'Universities',
      subtitle: 'Browse accredited partner universities & academic programs',
      path: '/student/select-university',
      category: 'Page',
      icon: Target,
      keywords: ['select university', 'browse', 'universities', 'programs', 'degrees', 'courses', 'europe', 'medicine', 'engineering'],
    },
    {
      id: 'page-applications',
      title: 'Applications',
      subtitle: 'Track submitted applications, timelines & admission reviews',
      path: '/student/applications',
      category: 'Page',
      icon: GraduationCap,
      keywords: ['applications', 'university applications', 'apply', 'submitted', 'review', 'withdraw', 'track timeline', 'admission'],
    },
    {
      id: 'page-offers',
      title: 'Offer Letters & Acceptance',
      subtitle: 'Download official admission offer letters & accept seats',
      path: '/student/offers',
      category: 'Page',
      icon: FileText,
      keywords: ['offers', 'offer letter', 'acceptance', 'admission letter', 'download offer', 'accept offer'],
    },
    {
      id: 'page-documents',
      title: 'Compliance Documents Vault',
      subtitle: 'Upload mandatory passports, academic records & legalizations',
      path: '/student/documents',
      category: 'Page',
      icon: Folder,
      keywords: ['documents', 'docs', 'vault', 'upload document', 'compliance', 'checklist', 'files'],
    },
    {
      id: 'page-payments',
      title: 'Payments & Tuition Fees',
      subtitle: 'Pay tuition, agency fees, installment plans & billing',
      path: '/student/payments',
      category: 'Financial',
      icon: CreditCard,
      keywords: ['payments', 'tuition', 'fees', 'pay fees', 'installment', 'agency fee', 'billing', 'stripe', 'bank transfer'],
    },
    {
      id: 'page-receipts',
      title: 'Official Receipts',
      subtitle: 'Download payment receipts, transaction proofs & vouchers',
      path: '/student/receipts',
      category: 'Financial',
      icon: Receipt,
      keywords: ['receipts', 'receipt', 'voucher', 'payment proof', 'paid', 'transaction'],
    },
    {
      id: 'page-visa',
      title: 'Visa',
      subtitle: 'Schengen National D-Visa appointment, filing & stamping',
      path: '/student/visa-tracker',
      category: 'Page',
      icon: ShieldCheck,
      keywords: ['visa', 'vfs', 'schengen', 'd-visa', 'embassy', 'visa appointment', 'visa tracking', 'stamped'],
    },
    {
      id: 'page-predeparture',
      title: 'Pre-Departure Guide',
      subtitle: 'Flight booking, packing checklists, housing & arrival guidance',
      path: '/student/pre-departure',
      category: 'Page',
      icon: Plane,
      keywords: ['pre-departure', 'travel', 'flight', 'housing', 'packing', 'arrival', 'airport'],
    },
    {
      id: 'page-invoices',
      title: 'Invoices & Fee Statements',
      subtitle: 'View detailed itemized fee invoices & payment statuses',
      path: '/student/invoices',
      category: 'Financial',
      icon: FileSpreadsheet,
      keywords: ['invoices', 'invoice', 'statement', 'charges', 'bills'],
    },
    {
      id: 'page-meetings',
      title: 'Meetings & Video Calls',
      subtitle: 'Schedule 1-on-1 counseling calls & video consultations',
      path: '/student/meetings',
      category: 'Page',
      icon: Calendar,
      keywords: ['meetings', 'counseling', 'book call', 'video consultation', 'google meet', 'schedule appointment'],
    },
    {
      id: 'page-chat',
      title: 'Counselor Direct Chat',
      subtitle: 'Real-time messaging with your dedicated student advisor',
      path: '/student/chat',
      category: 'Page',
      icon: MessageCircle,
      keywords: ['chat', 'counselor chat', 'messages', 'advisor', 'inbox', 'talk to counselor'],
    },
    {
      id: 'page-tickets',
      title: 'Support Tickets Helpdesk',
      subtitle: 'Submit support inquiries, report issues & get rapid help',
      path: '/student/support',
      category: 'Page',
      icon: LifeBuoy,
      keywords: ['support', 'tickets', 'helpdesk', 'inquiry', 'help', 'report issue'],
    },
    {
      id: 'page-profile',
      title: 'My Profile & Account',
      subtitle: 'Manage personal details, contact info & passport profile',
      path: '/student/profile',
      category: 'Page',
      icon: User,
      keywords: ['profile', 'account', 'personal info', 'settings', 'passport number', 'email', 'phone'],
    },
    {
      id: 'page-notifications',
      title: 'Notifications Hub',
      subtitle: 'View all recent admission updates, status changes & alerts',
      path: '/student/notifications',
      category: 'Page',
      icon: Bell,
      keywords: ['notifications', 'alerts', 'announcements', 'updates', 'bell'],
    },
    // Specific Compliance Checklist Documents
    {
      id: 'doc-passport',
      title: 'Passport (Valid min. 18 months)',
      subtitle: 'Upload color biometric scan of all passport pages',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['passport', 'biometric', 'id', 'identification', 'upload passport'],
    },
    {
      id: 'doc-diploma',
      title: 'Academic Diplomas & Marksheets',
      subtitle: 'Upload high school certificates or bachelor transcripts',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['diploma', 'academic', 'marksheet', 'transcript', 'degree', '10th', '12th'],
    },
    {
      id: 'doc-apostille',
      title: 'Apostille / Legalization Attestation',
      subtitle: 'Upload MEA Apostille stamp on original certificates',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['apostille', 'attestation', 'mea', 'stamp', 'legalization'],
    },
    {
      id: 'doc-recognition',
      title: 'Legalization Recognition Certificate',
      subtitle: 'Higher education qualification recognition confirmation',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['recognition', 'kuratorium', 'nawa', 'legalization recognition'],
    },
    {
      id: 'doc-moi',
      title: 'Medium of Instruction (MOI) / English',
      subtitle: 'Official MOI certificate or IELTS / TOEFL score card',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['moi', 'medium of instruction', 'english', 'ielts', 'toefl', 'language proficiency'],
    },
    {
      id: 'doc-bank',
      title: 'Bank Solvency & Sponsor Affidavit',
      subtitle: '6-month bank statement & notarized sponsor affidavit',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['bank', 'solvency', 'statement', 'funds', 'sponsor', 'affidavit', 'financial proof'],
    },
    {
      id: 'doc-insurance',
      title: 'Schengen International Health Insurance',
      subtitle: 'Min. €30,000 medical coverage policy across Schengen states',
      path: '/student/documents',
      category: 'Document',
      icon: Folder,
      keywords: ['insurance', 'health insurance', 'schengen insurance', 'medical coverage'],
    },
  ];

  const allSearchItems = useMemo(() => {
    const dynamicApps = (studentApps || []).map((app: any, idx: number) => ({
      id: `app-${app.id || idx}`,
      title: app.university_name || app.program_name || 'University Application',
      subtitle: `${app.course || app.program_name || 'Program'}${app.intake ? ` (${app.intake})` : ''} • Status: ${app.status || 'Submitted'}`,
      path: '/student/applications',
      category: 'Application' as const,
      icon: GraduationCap,
      keywords: [
        'application',
        'university',
        (app.university_name || '').toLowerCase(),
        (app.course || '').toLowerCase(),
        (app.program_name || '').toLowerCase(),
        (app.status || '').toLowerCase(),
        (app.intake || '').toLowerCase(),
      ],
    }));

    return [...dynamicApps, ...baseSearchItems];
  }, [studentApps]);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return allSearchItems.slice(0, 8);
    }
    return allSearchItems.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      return item.keywords.some(k => k.toLowerCase().includes(q));
    }).slice(0, 10);
  }, [allSearchItems, searchQuery]);

  const handleSelectSearchResult = (item: { path: string }) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
    navigate(item.path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIndex(prev => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        handleSelectSearchResult(searchResults[activeSearchIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const handleSignOut = async () => {
    stopImpersonatingStudent();
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
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 antialiased selection:bg-[#58051E]/10 selection:text-[#58051E] print:h-auto print:min-h-0 print:overflow-visible print:block">

      {/* MOBILE SIDEBAR DRAWER BACKDROP */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden print:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`fixed top-0 left-0 bottom-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-40 flex flex-col transition-all duration-200 ease-out select-none print:hidden
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
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-200 ${isCollapsed ? 'lg:pl-18' : 'lg:pl-60'} print:pl-0 print:m-0 print:min-h-0 print:h-auto print:overflow-visible print:w-full print:block`}>

        {/* COUNSELOR / ADMIN IMPERSONATION BANNER */}
        {impersonated && (
          <div className="bg-gradient-to-r from-amber-600 via-[#58051E] to-[#3a0213] text-white px-4 py-2 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md shrink-0 z-40 print:hidden">
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

        {/* TOP NAVBAR */}
        <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 z-30 h-14 flex items-center justify-between px-4 sm:px-6 select-none shrink-0 print:hidden">

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
              <span className="text-slate-800 dark:white font-bold bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">{activeItem}</span>
            </div>
          </div>

          {/* Right part: Search, Notification and Avatar Controls */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Global Search Box */}
            <div className="relative hidden md:block w-56" ref={searchContainerRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setActiveSearchIndex(0);
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setShowNotifications(false);
                  setShowProfileDropdown(false);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search portal..."
                className="w-full h-8.5 pl-8.5 pr-8 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#58051E]/40 dark:focus:border-rose-400 focus:ring-2 focus:ring-[#58051E]/5 transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd
                  onClick={() => {
                    searchInputRef.current?.focus();
                    setIsSearchOpen(true);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.2 text-[9px] font-bold text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded select-none cursor-pointer"
                  title="Press ⌘K or Ctrl+K to search"
                >
                  ⌘K
                </kbd>
              )}

              {/* Search Dropdown Results */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-left overflow-hidden"
                  >
                    <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {searchQuery.trim() ? `Search Results (${searchResults.length})` : 'Quick Portal Navigation'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">ESC</kbd> to close
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1 py-0.5">
                      {searchResults.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          <Search className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
                          <p className="font-bold text-slate-600 dark:text-slate-400">No portal results found</p>
                          <p className="text-[10px] mt-0.5 text-slate-400">Try searching for "documents", "visa", "applications", or "fees"</p>
                        </div>
                      ) : (
                        searchResults.map((item, idx) => {
                          const Icon = item.icon;
                          const isSelected = idx === activeSearchIndex;
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSelectSearchResult(item)}
                              onMouseEnter={() => setActiveSearchIndex(idx)}
                              className={`p-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#58051E]/5 dark:bg-[#58051E]/20 text-[#58051E] dark:text-rose-300'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-[#58051E] text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                    {item.title}
                                  </div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                    {item.subtitle}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                {item.category}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="px-2.5 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5">
                          <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↑</kbd>
                          <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↓</kbd>
                          <span className="ml-0.5">navigate</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <kbd className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↵</kbd>
                          <span className="ml-0.5">select</span>
                        </span>
                      </div>
                      <span>Student Portal</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Bell Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileDropdown(false);
                }}
                className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 text-left"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications ({notifications.length})</span>
                      <Link
                        to="/student/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-[10px] font-bold text-[#58051E] hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    <div className="py-2 max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No notifications</p>
                      ) : (
                        notifications.slice(0, 5).map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markRead(n.id);
                              if (n.link) navigate(n.link);
                              setShowNotifications(false);
                            }}
                            className={`p-2 rounded-xl text-xs cursor-pointer transition-colors ${n.is_read ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-500' : 'bg-[#58051E]/5 text-slate-800 font-semibold'}`}
                          >
                            <p className="font-bold text-[11px] truncate">{n.title}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{n.body || n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
        <main className="app-main flex-1 min-h-0 overflow-y-auto overflow-x-hidden print:overflow-visible print:h-auto print:min-h-0 print:block">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full print:block print:h-auto print:overflow-visible">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="print:transform-none print:block print:h-auto print:overflow-visible"
            >
              <React.Fragment key={feeKey}>{children}</React.Fragment>
            </motion.div>
          </div>
        </main>
      </div>

      {/* ── 24/7 FEREX AI STUDENT COPILOT & REALTIME VOICE ── */}
      <div className="print:hidden">
        <EnterpriseAIChatbot
          role="student"
          studentContext={{
            studentName: displayName,
            email: displayEmail,
            targetCountry: ((getActiveStudentFeeProfile() as any)?.country || null) || impersonated?.country || 'European Union',
            targetUniversity: 'European Partner Universities',
            program: 'Higher Education Program',
            currentStep: hasSignedAgreement ? 3 : 2,
            stepTitle: hasSignedAgreement ? 'Document Review & University Application' : 'Service Agreement Signing',
            assignedCounselor: 'Admissions Officer',
            visaStatus: 'Document Preparation',
          }}
        />
      </div>
    </div>
  );
};
