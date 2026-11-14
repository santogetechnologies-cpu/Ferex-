const Receipts = lazy(() => import('./pages/Receipts').then(m => ({ default: m.Receipts })));
const DigitalBusinessInsights = lazy(() => import('./pages/digital/DigitalBusinessInsights').then(m => ({ default: m.DigitalBusinessInsights })));
const DigitalCommerce = lazy(() => import('./pages/digital/DigitalCommerce').then(m => ({ default: m.DigitalCommerce })));
import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthLayout } from './layouts/AuthLayout';
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const FerexLandingPage = lazy(() => import('./pages/FerexLandingPage').then(m => ({ default: m.FerexLandingPage })));
import { StudentLayout } from './layouts/StudentLayout';
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const ServiceAgreement = lazy(() => import('./pages/ServiceAgreement').then(m => ({ default: m.ServiceAgreement })));
const JourneyTracker = lazy(() => import('./pages/JourneyTracker').then(m => ({ default: m.JourneyTracker })));
const SelectUniversity = lazy(() => import('./pages/SelectUniversity').then(m => ({ default: m.SelectUniversity })));
const UniversityApplications = lazy(() => import('./pages/UniversityApplications').then(m => ({ default: m.UniversityApplications })));
const OfferLetters = lazy(() => import('./pages/OfferLetters').then(m => ({ default: m.OfferLetters })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const Meetings = lazy(() => import('./pages/Meetings').then(m => ({ default: m.Meetings })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const SupportTickets = lazy(() => import('./pages/SupportTickets').then(m => ({ default: m.SupportTickets })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const MyProfile = lazy(() => import('./pages/MyProfile').then(m => ({ default: m.MyProfile })));
const VisaTracker = lazy(() => import('./pages/VisaTracker').then(m => ({ default: m.VisaTracker })));
const PreDeparture = lazy(() => import('./pages/PreDeparture').then(m => ({ default: m.PreDeparture })));
const EnterpriseAIPage = lazy(() => import('./pages/EnterpriseAIPage').then(m => ({ default: m.EnterpriseAIPage })));

// Admin imports
import { AdminLayout } from './layouts/AdminLayout';
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents').then(m => ({ default: m.AdminStudents })));
const AdminUniversities = lazy(() => import('./pages/admin/AdminUniversities').then(m => ({ default: m.AdminUniversities })));
const AdminVisaTracker = lazy(() => import('./pages/admin/AdminVisaTracker').then(m => ({ default: m.AdminVisaTracker })));
const AdminPreDeparture = lazy(() => import('./pages/admin/AdminPreDeparture').then(m => ({ default: m.AdminPreDeparture })));
const AdminTaskManagement = lazy(() => import('./pages/admin/AdminTaskManagement').then(m => ({ default: m.AdminTaskManagement })));
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications').then(m => ({ default: m.AdminApplications })));
const AdminDocumentReview = lazy(() => import('./pages/admin/AdminDocumentReview').then(m => ({ default: m.AdminDocumentReview })));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments').then(m => ({ default: m.AdminPayments })));
const AdminSupportTickets = lazy(() => import('./pages/admin/AdminSupportTickets').then(m => ({ default: m.AdminSupportTickets })));
const AdminChatSupport = lazy(() => import('./pages/admin/AdminChatSupport').then(m => ({ default: m.AdminChatSupport })));
const AdminReports = lazy(() => import('./pages/admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminStaffManagement = lazy(() => import('./pages/admin/AdminStaffManagement').then(m => ({ default: m.AdminStaffManagement })));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminCustomizationPolicies = lazy(() => import('./pages/admin/AdminCustomizationPolicies').then(m => ({ default: m.AdminCustomizationPolicies })));
const AdminFeeConfig = lazy(() => import('./pages/admin/AdminFeeConfig').then(m => ({ default: m.AdminFeeConfig })));
const AdminMeetings = lazy(() => import('./pages/admin/AdminMeetings').then(m => ({ default: m.AdminMeetings })));
const AdminNawaTracker = lazy(() => import('./pages/admin/AdminNawaTracker').then(m => ({ default: m.AdminNawaTracker })));
const AdminDocumentConfig = lazy(() => import('./pages/admin/AdminDocumentConfig').then(m => ({ default: m.AdminDocumentConfig })));
const AdminPaymentControl = lazy(() => import('./pages/admin/AdminPaymentControl').then(m => ({ default: m.AdminPaymentControl })));
const StudyAbroadLeadLandingPage = lazy(() => import('./pages/StudyAbroadLeadLandingPage').then(m => ({ default: m.StudyAbroadLeadLandingPage })));
const AdminStudentEnquiries = lazy(() => import('./pages/admin/AdminStudentEnquiries').then(m => ({ default: m.AdminStudentEnquiries })));
import { getImpersonatedStudent } from './lib/api/studentImpersonation';

// Central imports
import { CentralLayout } from './layouts/CentralLayout';
const CentralDashboard = lazy(() => import('./pages/central/CentralDashboard').then(m => ({ default: m.CentralDashboard })));
const CentralPayments = lazy(() => import('./pages/central/CentralPayments').then(m => ({ default: m.CentralPayments })));
const CentralReports = lazy(() => import('./pages/central/CentralReports').then(m => ({ default: m.CentralReports })));
const CentralAdmins = lazy(() => import('./pages/central/CentralAdmins').then(m => ({ default: m.CentralAdmins })));
const RolesUsers = lazy(() => import('./pages/central/RolesUsers').then(m => ({ default: m.RolesUsers })));
const CentralTasks = lazy(() => import('./pages/central/CentralTasks').then(m => ({ default: m.CentralTasks })));
const CentralActivity = lazy(() => import('./pages/central/CentralActivity').then(m => ({ default: m.CentralActivity })));
const CentralNotifications = lazy(() => import('./pages/central/CentralNotifications').then(m => ({ default: m.CentralNotifications })));
const CentralSettings = lazy(() => import('./pages/central/CentralSettings').then(m => ({ default: m.CentralSettings })));
const CentralTrade = lazy(() => import('./pages/central/CentralTrade').then(m => ({ default: m.CentralTrade })));
const CentralRimi = lazy(() => import('./pages/central/CentralRimi').then(m => ({ default: m.CentralRimi })));
const CentralDigital = lazy(() => import('./pages/central/CentralDigital').then(m => ({ default: m.CentralDigital })));
const CentralSupport = lazy(() => import('./pages/central/CentralSupport').then(m => ({ default: m.CentralSupport })));
const CentralEducation = lazy(() => import('./pages/central/CentralEducation').then(m => ({ default: m.CentralEducation })));
const CentralStudents = lazy(() => import('./pages/central/CentralStudents').then(m => ({ default: m.CentralStudents })));
const CentralEmailLogs = lazy(() => import('./pages/central/CentralEmailLogs').then(m => ({ default: m.CentralEmailLogs })));

// Trade imports
import { TradeLayout } from './layouts/TradeLayout';
const TradeDashboard = lazy(() => import('./pages/trade/TradeDashboard').then(m => ({ default: m.TradeDashboard })));
const TradeCRM = lazy(() => import('./pages/trade/TradeCRM').then(m => ({ default: m.TradeCRM })));
const TradeShipments = lazy(() => import('./pages/trade/TradeShipments').then(m => ({ default: m.TradeShipments })));
const TradeInvoices = lazy(() => import('./pages/trade/TradeInvoices').then(m => ({ default: m.TradeInvoices })));
const TradePackingLists = lazy(() => import('./pages/trade/TradePackingLists').then(m => ({ default: m.TradePackingLists })));
const TradeBillsOfLading = lazy(() => import('./pages/trade/TradeBillsOfLading').then(m => ({ default: m.TradeBillsOfLading })));
const TradeCertificates = lazy(() => import('./pages/trade/TradeCertificates').then(m => ({ default: m.TradeCertificates })));
const TradeDocuments = lazy(() => import('./pages/trade/TradeDocuments').then(m => ({ default: m.TradeDocuments })));
const TradeLettersOfCredit = lazy(() => import('./pages/trade/TradeLettersOfCredit').then(m => ({ default: m.TradeLettersOfCredit })));
const TradePayments = lazy(() => import('./pages/trade/TradePayments').then(m => ({ default: m.TradePayments })));
const TradeReports = lazy(() => import('./pages/trade/TradeReports').then(m => ({ default: m.TradeReports })));
const TradeShipmentAnalytics = lazy(() => import('./pages/trade/TradeShipmentAnalytics').then(m => ({ default: m.TradeShipmentAnalytics })));
const TradeFinancialAnalytics = lazy(() => import('./pages/trade/TradeFinancialAnalytics').then(m => ({ default: m.TradeFinancialAnalytics })));
const TradeMessages = lazy(() => import('./pages/trade/TradeMessages').then(m => ({ default: m.TradeMessages })));
const TradeNotifications = lazy(() => import('./pages/trade/TradeNotifications').then(m => ({ default: m.TradeNotifications })));
const TradeProfile = lazy(() => import('./pages/trade/TradeProfile').then(m => ({ default: m.TradeProfile })));
const TradeSettings = lazy(() => import('./pages/trade/TradeSettings').then(m => ({ default: m.TradeSettings })));
const TradeTasks = lazy(() => import('./pages/trade/TradeTasks').then(m => ({ default: m.TradeTasks })));
const TradeTickets = lazy(() => import('./pages/trade/TradeTickets').then(m => ({ default: m.TradeTickets })));
const TradeClientPortal = lazy(() => import('./pages/trade/TradeClientPortal').then(m => ({ default: m.TradeClientPortal })));
const TradeLoginPage = lazy(() => import('./pages/trade/TradeLoginPage').then(m => ({ default: m.TradeLoginPage })));

// Rimi Frozen Distribution imports
import { RimiLayout } from './layouts/RimiLayout';
const RimiDashboard = lazy(() => import('./pages/rimi/RimiDashboard').then(m => ({ default: m.RimiDashboard })));
const RimiCustomers = lazy(() => import('./pages/rimi/RimiCustomers').then(m => ({ default: m.RimiCustomers })));
const RimiSalesOrders = lazy(() => import('./pages/rimi/RimiSalesOrders').then(m => ({ default: m.RimiSalesOrders })));
const RimiProducts = lazy(() => import('./pages/rimi/RimiProducts').then(m => ({ default: m.RimiProducts })));
const RimiInventory = lazy(() => import('./pages/rimi/RimiInventory').then(m => ({ default: m.RimiInventory })));
const RimiWarehouses = lazy(() => import('./pages/rimi/RimiWarehouses').then(m => ({ default: m.RimiWarehouses })));
const RimiDeliveries = lazy(() => import('./pages/rimi/RimiDeliveries').then(m => ({ default: m.RimiDeliveries })));
const RimiCollections = lazy(() => import('./pages/rimi/RimiCollections').then(m => ({ default: m.RimiCollections })));
const RimiVehicles = lazy(() => import('./pages/rimi/RimiVehicles').then(m => ({ default: m.RimiVehicles })));
const RimiDeliveryRoutes = lazy(() => import('./pages/rimi/RimiDeliveryRoutes').then(m => ({ default: m.RimiDeliveryRoutes })));
const RimiAnalytics = lazy(() => import('./pages/rimi/RimiAnalytics').then(m => ({ default: m.RimiAnalytics })));
const RimiNotifications = lazy(() => import('./pages/rimi/RimiNotifications').then(m => ({ default: m.RimiNotifications })));
const RimiProfile = lazy(() => import('./pages/rimi/RimiProfile').then(m => ({ default: m.RimiProfile })));
const RimiTasks = lazy(() => import('./pages/rimi/RimiTasks').then(m => ({ default: m.RimiTasks })));
const RimiLoginPage = lazy(() => import('./pages/rimi/RimiLoginPage').then(m => ({ default: m.RimiLoginPage })));

// Digital imports
import { DigitalLayout } from './layouts/DigitalLayout';
const DigitalDashboard = lazy(() => import('./pages/digital/DigitalDashboard').then(m => ({ default: m.DigitalDashboard })));
const DigitalClients = lazy(() => import('./pages/digital/DigitalClients').then(m => ({ default: m.DigitalClients })));
const DigitalLeads = lazy(() => import('./pages/digital/DigitalLeads').then(m => ({ default: m.DigitalLeads })));
const DigitalProjects = lazy(() => import('./pages/digital/DigitalProjects').then(m => ({ default: m.DigitalProjects })));
const DigitalTasks = lazy(() => import('./pages/digital/DigitalTasks').then(m => ({ default: m.DigitalTasks })));
const DigitalMeetings = lazy(() => import('./pages/digital/DigitalMeetings').then(m => ({ default: m.DigitalMeetings })));
const DigitalExpenses = lazy(() => import('./pages/digital/DigitalExpenses').then(m => ({ default: m.DigitalExpenses })));
const DigitalNotifications = lazy(() => import('./pages/digital/DigitalNotifications').then(m => ({ default: m.DigitalNotifications })));
const DigitalProfile = lazy(() => import('./pages/digital/DigitalProfile').then(m => ({ default: m.DigitalProfile })));
const DigitalSettings = lazy(() => import('./pages/digital/DigitalSettings').then(m => ({ default: m.DigitalSettings })));
const DigitalDeliverables = lazy(() => import('./pages/digital/DigitalDeliverables').then(m => ({ default: m.DigitalDeliverables })));
const DigitalStaff = lazy(() => import('./pages/digital/DigitalStaff').then(m => ({ default: m.DigitalStaff })));
const DigitalLoginPage = lazy(() => import('./pages/digital/DigitalLoginPage').then(m => ({ default: m.DigitalLoginPage })));
const DigitalClientPortal = lazy(() => import('./pages/digital/DigitalClientWorkspace'));

// Digital Project Manager imports (Pure Supabase Rebuild)
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage').then(m => ({ default: m.AttendancePage })));
import { DigitalPMLayout } from './layouts/DigitalPMLayout';
const DigitalPMDashboard = lazy(() => import('./pages/digital/pm/DigitalPMDashboard').then(m => ({ default: m.DigitalPMDashboard })));
const DigitalPMProjects = lazy(() => import('./pages/digital/pm/DigitalPMProjects').then(m => ({ default: m.DigitalPMProjects })));
const DigitalPMTickets = lazy(() => import('./pages/digital/pm/DigitalPMTickets').then(m => ({ default: m.DigitalPMTickets })));
const DigitalPMSprints = lazy(() => import('./pages/digital/pm/DigitalPMSprints').then(m => ({ default: m.DigitalPMSprints })));
const DigitalPMMilestones = lazy(() => import('./pages/digital/pm/DigitalPMMilestones').then(m => ({ default: m.DigitalPMMilestones })));
const DigitalPMDocuments = lazy(() => import('./pages/digital/pm/DigitalPMDocuments').then(m => ({ default: m.DigitalPMDocuments })));
const DigitalPMNotifications = lazy(() => import('./pages/digital/pm/DigitalPMNotifications').then(m => ({ default: m.DigitalPMNotifications })));
const DigitalPMProfile = lazy(() => import('./pages/digital/pm/DigitalPMProfile').then(m => ({ default: m.DigitalPMProfile })));

// Staff Panel Imports (Admissions Counselor)
import { StaffLayout } from './components/layout/StaffLayout';
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const StaffTasks = lazy(() => import('./pages/staff/StaffTasks').then(m => ({ default: m.StaffTasks })));
const StaffStudents = lazy(() => import('./pages/staff/StaffStudents').then(m => ({ default: m.StaffStudents })));
const StaffApplications = lazy(() => import('./pages/staff/StaffApplications').then(m => ({ default: m.StaffApplications })));
const StaffUniversities = lazy(() => import('./pages/staff/StaffUniversities').then(m => ({ default: m.StaffUniversities })));
const StaffDestinations = lazy(() => import('./pages/staff/StaffDestinations').then(m => ({ default: m.StaffDestinations })));
const StaffDocuments = lazy(() => import('./pages/staff/StaffDocuments').then(m => ({ default: m.StaffDocuments })));
const StaffTickets = lazy(() => import('./pages/staff/StaffTickets').then(m => ({ default: m.StaffTickets })));
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile').then(m => ({ default: m.StaffProfile })));



import { normalizeRole, getDashboardRoute, isSuperAdmin } from './lib/roleRouter';

// Resets route to Main Login on initial fresh load if at root and auto-seeds Supabase
const AppInitializer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Production navigation must never seed or delete business records.

    if (location.pathname === '/' || location.pathname === '') {
      navigate('/', { replace: true });
    }
  }, []);
  return null;
};

// Role equivalence lists across all 4 enterprise divisions + Central + Staff
const ADMIN_ROLES = ['admin', 'education_admin', 'education'];
const CENTRAL_ROLES = ['central', 'super_admin', 'superadmin'];
const TRADE_ROLES = ['trade', 'trade_admin', 'global_trade', 'logistics_officer'];
const RIMI_ROLES = ['rimi', 'rimi_admin', 'rimi_frozen', 'operations_manager', 'rimi_staff'];
const DIGITAL_ROLES = ['digital', 'digital_admin', 'ferex_digital', 'digital_director', 'digital_manager', 'project_manager', 'digimanager', 'pm', 'account_manager', 'accountmanager', 'digital_account_manager', 'account_executive', 'client_manager', 'digital_staff', 'designer', 'developer'];
const PM_ROLES = ['project_manager', 'digital_manager', 'digimanager', 'pm', 'digital_pm', 'account_manager', 'accountmanager', 'digital_account_manager', 'account_executive', 'client_manager', 'digital_admin', 'digital'];
const STAFF_ROLES = ['staff', 'counselor', 'admin', 'education_admin'];

// Guards portal routes — redirects to login if not authenticated, or to proper portal if role mismatched
const NotFound: React.FC = () => (
  <main className="min-h-screen grid place-items-center bg-slate-50 px-6 text-center">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#58051E] mb-2">Error 404</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">This page does not exist</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">The link may be old or mistyped.</p>
      <Link to="/" className="inline-flex mt-6 h-10 items-center px-5 rounded-xl bg-[#58051E] text-white text-sm font-semibold hover:bg-[#430316]">Go to the home page</Link>
    </div>
  </main>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { session, user, profile, loading } = useAuth();
  const location = useLocation();
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#58051E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  const effectiveUser = user || session?.user;
  if (!session || !effectiveUser) return <Navigate to={location.pathname.startsWith('/digital') ? '/digital/login' : '/login'} replace />;
  if (!profile || profile.is_active === false || ['deleted', 'inactive', 'deactivated', 'suspended'].includes(((profile as any).status || '').toLowerCase())) {
    return <Navigate to={location.pathname.startsWith('/digital') ? '/digital/login' : '/login'} replace />;
  }
  const rawRole = profile.role;
  const userEmail = effectiveUser?.email || profile?.email || '';
  const isSuper = isSuperAdmin(rawRole, userEmail);
  const currentRole = isSuper ? 'superadmin' : normalizeRole(rawRole || 'student', userEmail);

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const isCentralRoute = location.pathname.startsWith('/central');

    // 1. STRICT CENTRAL GUARD: Only real Central Super Admin can access Central Admin (/central/*)
    if (isCentralRoute && !isSuper) {
      const correctDashboard = getDashboardRoute(currentRole, userEmail);
      return <Navigate to={correctDashboard} replace />;
    }

    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

    const isStudentRoute = normalizedAllowed.includes('student');
    const isStaffOrAdmin = isSuper || ['admin', 'education_admin', 'counselor', 'staff'].includes(currentRole) || ['admin', 'education_admin', 'counselor', 'staff'].includes(rawRole || '');
    const isImpersonating = typeof window !== 'undefined' && Boolean(getImpersonatedStudent());

    let isAllowed = false;
    if (isStudentRoute && isStaffOrAdmin && isImpersonating) {
      // Allow authorized Education Admin & Counselors to navigate into student portal seamlessly
      isAllowed = true;
    } else if (isSuper) {
      // Super admin has universal governance across all enterprise apps (except pure student-only routes)
      isAllowed = !normalizedAllowed.includes('student') || normalizedAllowed.length > 1;
    } else {
      // Division users must match permitted roles
      isAllowed = normalizedAllowed.includes(currentRole) || allowedRoles.includes(rawRole || '');
    }

    if (!isAllowed) {
      const correctDashboard = getDashboardRoute(currentRole, userEmail);
      if (correctDashboard === location.pathname) {
        return <>{children}</>;
      }
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
};

function HashMigrationRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/')) {
      const cleanPath = window.location.hash.substring(1);
      navigate(cleanPath, { replace: true });
    }
  }, [navigate, location]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <HashMigrationRedirect />
          <AppInitializer />
          <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50"><div className="w-8 h-8 border-4 border-[#58051E] border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" /></div>}>
          <Routes>
            {/* ── Official FEREX Education Website & Login Portal ── */}
            <Route path="/" element={<FerexLandingPage />} />
            <Route path="/study-abroad" element={<StudyAbroadLeadLandingPage />} />
            <Route path="/apply" element={<StudyAbroadLeadLandingPage />} />
            <Route path="/enquiry" element={<StudyAbroadLeadLandingPage />} />
            <Route path="/admissions-lead" element={<StudyAbroadLeadLandingPage />} />
            <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
            <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/trade/login" element={<Navigate to="/login" replace />} />
            <Route path="/rimi/login" element={<RimiLoginPage />} />
            <Route path="/digital/login" element={<DigitalLoginPage />} />

            {/* ── Student Routes (STRICTLY role = 'student' ONLY) ── */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><StudentDashboard /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/agreement" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><ServiceAgreement /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/journey-tracker" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><JourneyTracker /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/journey" element={<Navigate to="/student/journey-tracker" replace />} />
            <Route path="/student/select-university" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><SelectUniversity /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/applications" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><UniversityApplications /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/offers" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><OfferLetters /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/documents" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Documents /></StudentLayout></ProtectedRoute>} />
            <Route path="/student/payments" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Payments /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/receipts" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Receipts /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/invoices" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Invoices /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/meetings" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Meetings /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/chat" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Chat /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/support" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><SupportTickets /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Notifications /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MyProfile /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MyProfile defaultTab="Account & Security" /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/visa-tracker" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><VisaTracker /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/pre-departure" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><PreDeparture /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/predeparture" element={<Navigate to="/student/pre-departure" replace />} />
          <Route path="/student/housing" element={<Navigate to="/student/dashboard" replace />} />

          {/* ── Admin Routes ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/enquiries" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminStudentEnquiries /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/leads" element={<Navigate to="/admin/enquiries" replace />} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminStudents /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/universities" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminUniversities /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/visa-tracker" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminVisaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/housing" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/pre-departure" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminPreDeparture /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/tasks" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminTaskManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminApplications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/offers" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminApplications initialFilter="Offer Issued" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/offer-letters" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminApplications initialFilter="Offer Issued" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/documents" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminDocumentReview /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/document-review" element={<Navigate to="/admin/documents" replace />} />
          <Route path="/admin/document-config" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminDocumentConfig /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/legalization" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminNawaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/nawa" element={<Navigate to="/admin/legalization" replace />} />
          <Route path="/admin/nawa-tracker" element={<Navigate to="/admin/legalization" replace />} />
          <Route path="/admin/payment-control" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminPaymentControl /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/payments" element={<Navigate to="/admin/payment-control" replace />} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminSupportTickets /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminChatSupport /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminStaffManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/meetings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminMeetings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminNotifications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/fee-config" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminFeeConfig /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AttendancePage platform="education" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/timesheets" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/admin/customization-policies" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminCustomizationPolicies /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/customization" element={<Navigate to="/admin/customization-policies" replace />} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/emails" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><CentralEmailLogs defaultDivision="education" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/ai-copilot" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><EnterpriseAIPage role="education_admin" portalName="Ferex Education" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/ai-assistant" element={<Navigate to="/admin/ai-copilot" replace />} />

          {/* ── Central Super Admin Routes (Strictly Super Admin Only) ── */}
          <Route path="/central/dashboard" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralDashboard /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/ai-copilot" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><EnterpriseAIPage role="central_admin" portalName="Central Super Admin HQ" /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/ai-assistant" element={<Navigate to="/central/ai-copilot" replace />} />
          <Route path="/central/education-billing" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><AdminPaymentControl /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/finance" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralPayments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/payments" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralPayments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/reports" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralReports /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/admins" element={<Navigate to="/central/roles-users" replace />} />
          <Route path="/central/roles" element={<Navigate to="/central/roles-users" replace />} />
          <Route path="/central/roles-users" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><RolesUsers /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/tasks" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralTasks /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/activity" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralActivity /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/notifications" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralNotifications /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/finance-analytics" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralReports /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/attendance" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><AttendancePage /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/payroll" element={<Navigate to="/central/attendance" replace />} />
          <Route path="/central/settings" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralSettings /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/workflow-guide" element={<Navigate to="/central/dashboard" replace />} />
          <Route path="/central/education" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralStudents /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/universities" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralEducation /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/students" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralStudents /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/trade" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralTrade /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/rimi" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralRimi /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/digital" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralDigital /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/support" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralSupport /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/emails" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralEmailLogs /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/email-settings" element={<Navigate to="/central/settings" replace />} />
          <Route path="/central/documents" element={<Navigate to="/admin/documents" replace />} />
          <Route path="/central/insights" element={<Navigate to="/central/reports" replace />} />

          {/* ── Global Trade Routes ── */}
          <Route path="/trade/dashboard" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeDashboard /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/ai-copilot" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><EnterpriseAIPage role="trade_admin" portalName="Global Trade ERP" /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/ai-assistant" element={<Navigate to="/trade/ai-copilot" replace />} />
          <Route path="/trade/crm" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeCRM /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipments" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeShipments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/invoices" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeInvoices /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/packing-lists" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradePackingLists /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/bills-of-lading" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeBillsOfLading /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/certificates" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeCertificates /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/documents" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeDocuments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/letters-of-credit" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeLettersOfCredit /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/payments" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradePayments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/reports" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeReports /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipment-analytics" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeShipmentAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/financial-analytics" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeFinancialAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/messages" element={<Navigate to="/trade/dashboard" replace />} />
          <Route path="/trade/notifications" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeNotifications /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/emails" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><CentralEmailLogs defaultDivision="trade" /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/tasks" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeTasks /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/tickets" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeTickets /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/attendance" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><AttendancePage platform="trade" /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/timesheets" element={<Navigate to="/trade/attendance" replace />} />
          <Route path="/trade/shifts" element={<Navigate to="/trade/attendance" replace />} />
          <Route path="/trade/shift-details" element={<Navigate to="/trade/attendance" replace />} />
          <Route path="/trade/profile" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeProfile /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/settings" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeSettings /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/client-portal" element={<Navigate to="/trade/dashboard" replace />} />

          {/* ── Rimi Frozen Distribution Routes ── */}
          <Route path="/rimi/dashboard" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiDashboard /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/ai-copilot" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><EnterpriseAIPage role="rimi_admin" portalName="Rimi Frozen FMCG" /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/ai-assistant" element={<Navigate to="/rimi/ai-copilot" replace />} />
          <Route path="/rimi/customers" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiCustomers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/distributors" element={<Navigate to="/rimi/customers" replace />} />
          <Route path="/rimi/retailers" element={<Navigate to="/rimi/customers" replace />} />
          <Route path="/rimi/wholesalers" element={<Navigate to="/rimi/customers" replace />} />
          <Route path="/rimi/sales-orders" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiSalesOrders /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/products" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiProducts /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/inventory" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiInventory /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/warehouses" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiWarehouses /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/batch-tracking" element={<Navigate to="/rimi/inventory" replace />} />
          <Route path="/rimi/expiry-tracking" element={<Navigate to="/rimi/inventory" replace />} />
          <Route path="/rimi/deliveries" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiDeliveries /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/collections" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiCollections /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/vehicles" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiVehicles /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/delivery-routes" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiDeliveryRoutes /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/analytics" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/finance" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/sales-reports" element={<Navigate to="/rimi/analytics" replace />} />
          <Route path="/rimi/inventory-analytics" element={<Navigate to="/rimi/analytics" replace />} />
          <Route path="/rimi/revenue-analytics" element={<Navigate to="/rimi/analytics" replace />} />
          <Route path="/rimi/messages" element={<Navigate to="/rimi/dashboard" replace />} />
          <Route path="/rimi/notifications" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiNotifications /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/emails" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><CentralEmailLogs defaultDivision="rimi" /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/attendance" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><AttendancePage platform="rimi" /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/timesheets" element={<Navigate to="/rimi/attendance" replace />} />
          <Route path="/rimi/shifts" element={<Navigate to="/rimi/attendance" replace />} />
          <Route path="/rimi/shift-details" element={<Navigate to="/rimi/attendance" replace />} />
          <Route path="/rimi/profile" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/settings" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/tasks" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiTasks /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/staff" element={<Navigate to="/central/roles-users" replace />} />

          {/* ── Ferex Digital Routes ── */}
          <Route path="/digital/dashboard" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalDashboard /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ai-copilot" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><EnterpriseAIPage role="digital_admin" portalName="Ferex Digital Agency" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ai-assistant" element={<Navigate to="/digital/ai-copilot" replace />} />
          <Route path="/digital/clients" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalClients /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/leads" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalLeads /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/projects" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalProjects /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/tasks" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalTasks /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/deliverables" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalDeliverables /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/staff" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalStaff /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/meetings" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalMeetings /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/emails" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalCommerce view="emails" /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Services - Redirect to Projects */}
          <Route path="/digital/services" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/services/*" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/web-development" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/mobile-apps" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/ui-ux-design" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/digital-marketing" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/seo" element={<Navigate to="/digital/projects" replace />} />
          <Route path="/digital/branding" element={<Navigate to="/digital/projects" replace />} />

          {/* Digital Finance */}
          <Route path="/digital/invoices" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalCommerce view="invoices" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/invoices" element={<Navigate to="/digital/invoices" replace />} />
          <Route path="/digital/payments" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalCommerce view="payments" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/payments" element={<Navigate to="/digital/payments" replace />} />
          <Route path="/digital/expenses" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/expenses" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/billing" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalCommerce view="billing" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/billing" element={<Navigate to="/digital/billing" replace />} />

          {/* Digital Team */}
          <Route path="/digital/attendance" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><AttendancePage platform="digital" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/timesheets" element={<Navigate to="/digital/attendance" replace />} />
          <Route path="/digital/shifts" element={<Navigate to="/digital/attendance" replace />} />
          <Route path="/digital/shift-details" element={<Navigate to="/digital/attendance" replace />} />
          <Route path="/digital/employees" element={<Navigate to="/central/roles-users" replace />} />
          <Route path="/digital/team/employees" element={<Navigate to="/central/roles-users" replace />} />
          <Route path="/digital/team/attendance" element={<Navigate to="/digital/attendance" replace />} />
          <Route path="/digital/performance" element={<Navigate to="/central/roles-users" replace />} />
          <Route path="/digital/team/performance" element={<Navigate to="/central/roles-users" replace />} />

          {/* Digital Analytics & Performance (Pure Supabase Telemetry) */}
          <Route path="/digital/analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/reports" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/reports" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/revenue-analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/revenue" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/project-analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/project" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalBusinessInsights /></DigitalLayout></ProtectedRoute>} />

          {/* Digital System */}
          <Route path="/digital/notifications" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalNotifications /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/profile" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalProfile /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/settings" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalSettings /></DigitalLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Project Manager Routes (Pure Supabase) ── */}
          <Route path="/digital/pm" element={<Navigate to="/digital/pm/dashboard" replace />} />
          <Route path="/digital/pm/dashboard" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMDashboard /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/projects" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMProjects /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/tasks" element={<Navigate to="/digital/pm/sprints" replace />} />
          <Route path="/digital/pm/tickets" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMTickets /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/sprints" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMSprints /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/milestones" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMMilestones /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/documents" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMDocuments /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/notifications" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMNotifications /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/attendance" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><AttendancePage platform="digital" /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/timesheets" element={<Navigate to="/digital/pm/attendance" replace />} />
          <Route path="/digital/pm/shifts" element={<Navigate to="/digital/pm/attendance" replace />} />
          <Route path="/digital/pm/shift-details" element={<Navigate to="/digital/pm/attendance" replace />} />
          <Route path="/digital/pm/profile" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMProfile /></DigitalPMLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Client Portal ── */}
          <Route path="/digital/client-portal" element={<ProtectedRoute allowedRoles={['digital_client']}><DigitalClientPortal /></ProtectedRoute>} />
          <Route path="/digital/client" element={<ProtectedRoute allowedRoles={['digital_client']}><DigitalClientPortal /></ProtectedRoute>} />

          {/* ── Ferex Staff Panel Routes (Admissions Counselor - Education Only) ── */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/enquiries" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminStudentEnquiries isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/leads" element={<Navigate to="/staff/enquiries" replace />} />
          <Route path="/staff/tasks" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffTasks /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/students" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffStudents /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/universities" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffUniversities /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/destinations" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffDestinations /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/applications" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffApplications /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/offers" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminApplications initialFilter="Offer Issued" isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/documents" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffDocuments /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/legalization" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminNawaTracker isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/nawa" element={<Navigate to="/staff/legalization" replace />} />
          <Route path="/staff/visa-tracker" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminVisaTracker isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/pre-departure" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminPreDeparture isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/support" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffTickets /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tickets" element={<Navigate to="/staff/support" replace />} />
          <Route path="/staff/attendance" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AttendancePage platform="education" /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/timesheets" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/staff/shifts" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/staff/shift-details" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/staff/meetings" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminMeetings isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/chat" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminChatSupport isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminNotifications isStaff={true} /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/settings" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />

          {/* ── Global Employee Shift Aliases ── */}
          <Route path="/shifts" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/shift-details" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/employee/shifts" element={<Navigate to="/staff/attendance" replace />} />
          <Route path="/employee/shift-details" element={<Navigate to="/staff/attendance" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
          </Suspense>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
