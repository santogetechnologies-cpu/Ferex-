import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FerexLandingPage } from './pages/FerexLandingPage';
import { StudentLayout } from './layouts/StudentLayout';
import { StudentDashboard } from './pages/StudentDashboard';
import { JourneyTracker } from './pages/JourneyTracker';
import { SelectUniversity } from './pages/SelectUniversity';
import { UniversityApplications } from './pages/UniversityApplications';
import { OfferLetters } from './pages/OfferLetters';
import { Documents } from './pages/Documents';
import { Payments } from './pages/Payments';
import { Invoices } from './pages/Invoices';
import { Meetings } from './pages/Meetings';
import { Chat } from './pages/Chat';
import { SupportTickets } from './pages/SupportTickets';
import { Notifications } from './pages/Notifications';
import { MyProfile } from './pages/MyProfile';
import { VisaTracker } from './pages/VisaTracker';
import { PreDeparture } from './pages/PreDeparture';
import { EnterpriseAIPage } from './pages/EnterpriseAIPage';

// Admin imports
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminUniversities } from './pages/admin/AdminUniversities';
import { AdminVisaTracker } from './pages/admin/AdminVisaTracker';
import { AdminPreDeparture } from './pages/admin/AdminPreDeparture';
import { AdminTaskManagement } from './pages/admin/AdminTaskManagement';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminDocumentReview } from './pages/admin/AdminDocumentReview';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminSupportTickets } from './pages/admin/AdminSupportTickets';
import { AdminChatSupport } from './pages/admin/AdminChatSupport';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminStaffManagement } from './pages/admin/AdminStaffManagement';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminFeeConfig } from './pages/admin/AdminFeeConfig';
import { AdminMeetings } from './pages/admin/AdminMeetings';
import { AdminNawaTracker } from './pages/admin/AdminNawaTracker';
import { AdminDocumentConfig } from './pages/admin/AdminDocumentConfig';
import { AdminPaymentControl } from './pages/admin/AdminPaymentControl';

// Central imports
import { CentralLayout } from './layouts/CentralLayout';
import { CentralDashboard } from './pages/central/CentralDashboard';
import { CentralPayments } from './pages/central/CentralPayments';
import { CentralReports } from './pages/central/CentralReports';
import { CentralAdmins } from './pages/central/CentralAdmins';
import { RolesUsers } from './pages/central/RolesUsers';
import { CentralTasks } from './pages/central/CentralTasks';
import { CentralActivity } from './pages/central/CentralActivity';
import { CentralNotifications } from './pages/central/CentralNotifications';
import { CentralSettings } from './pages/central/CentralSettings';
import { CentralTrade } from './pages/central/CentralTrade';
import { CentralRimi } from './pages/central/CentralRimi';
import { CentralDigital } from './pages/central/CentralDigital';
import { CentralSupport } from './pages/central/CentralSupport';
import { CentralEducation } from './pages/central/CentralEducation';
import { CentralStudents } from './pages/central/CentralStudents';
import { CentralEmailLogs } from './pages/central/CentralEmailLogs';

// Trade imports
import { TradeLayout } from './layouts/TradeLayout';
import { TradeDashboard } from './pages/trade/TradeDashboard';
import { TradeCRM } from './pages/trade/TradeCRM';
import { TradeShipments } from './pages/trade/TradeShipments';
import { TradeInvoices } from './pages/trade/TradeInvoices';
import { TradePackingLists } from './pages/trade/TradePackingLists';
import { TradeBillsOfLading } from './pages/trade/TradeBillsOfLading';
import { TradeCertificates } from './pages/trade/TradeCertificates';
import { TradeDocuments } from './pages/trade/TradeDocuments';
import { TradeLettersOfCredit } from './pages/trade/TradeLettersOfCredit';
import { TradePayments } from './pages/trade/TradePayments';
import { TradeReports } from './pages/trade/TradeReports';
import { TradeShipmentAnalytics } from './pages/trade/TradeShipmentAnalytics';
import { TradeFinancialAnalytics } from './pages/trade/TradeFinancialAnalytics';
import { TradeMessages } from './pages/trade/TradeMessages';
import { TradeNotifications } from './pages/trade/TradeNotifications';
import { TradeProfile } from './pages/trade/TradeProfile';
import { TradeSettings } from './pages/trade/TradeSettings';
import { TradeTasks } from './pages/trade/TradeTasks';
import { TradeTickets } from './pages/trade/TradeTickets';
import { TradeClientPortal } from './pages/trade/TradeClientPortal';
import { TradeLoginPage } from './pages/trade/TradeLoginPage';

// Rimi Frozen Distribution imports
import { RimiLayout } from './layouts/RimiLayout';
import { RimiDashboard } from './pages/rimi/RimiDashboard';
import { RimiCustomers } from './pages/rimi/RimiCustomers';
import { RimiSalesOrders } from './pages/rimi/RimiSalesOrders';
import { RimiProducts } from './pages/rimi/RimiProducts';
import { RimiInventory } from './pages/rimi/RimiInventory';
import { RimiWarehouses } from './pages/rimi/RimiWarehouses';
import { RimiDeliveries } from './pages/rimi/RimiDeliveries';
import { RimiCollections } from './pages/rimi/RimiCollections';
import { RimiVehicles } from './pages/rimi/RimiVehicles';
import { RimiDeliveryRoutes } from './pages/rimi/RimiDeliveryRoutes';
import { RimiAnalytics } from './pages/rimi/RimiAnalytics';
import { RimiNotifications } from './pages/rimi/RimiNotifications';
import { RimiProfile } from './pages/rimi/RimiProfile';
import { RimiTasks } from './pages/rimi/RimiTasks';
import { RimiLoginPage } from './pages/rimi/RimiLoginPage';

// Digital imports
import { DigitalLayout } from './layouts/DigitalLayout';
import { DigitalDashboard } from './pages/digital/DigitalDashboard';
import { DigitalClients } from './pages/digital/DigitalClients';
import { DigitalLeads } from './pages/digital/DigitalLeads';
import { DigitalProjects } from './pages/digital/DigitalProjects';
import { DigitalTasks } from './pages/digital/DigitalTasks';
import { DigitalMeetings } from './pages/digital/DigitalMeetings';
import { DigitalServicesHub } from './pages/digital/DigitalServices';
import { DigitalWebDevelopment } from './pages/digital/DigitalWebDevelopment';
import { DigitalMobileApps } from './pages/digital/DigitalMobileApps';
import { DigitalUIUX } from './pages/digital/DigitalUIUX';
import { DigitalMarketing } from './pages/digital/DigitalMarketing';
import { DigitalSEO } from './pages/digital/DigitalSEO';
import { DigitalBranding } from './pages/digital/DigitalBranding';
import { DigitalInvoices } from './pages/digital/DigitalInvoices';
import { DigitalPayments } from './pages/digital/DigitalPayments';
import { DigitalExpenses } from './pages/digital/DigitalExpenses';
import { DigitalEmployees } from './pages/digital/DigitalEmployees';
import { DigitalAttendance } from './pages/digital/DigitalAttendance';
import { DigitalPerformance } from './pages/digital/DigitalPerformance';
import { DigitalReports } from './pages/digital/DigitalReports';
import { DigitalRevenueAnalytics } from './pages/digital/DigitalRevenueAnalytics';
import { DigitalProjectAnalytics } from './pages/digital/DigitalProjectAnalytics';
import { DigitalAnalytics } from './pages/digital/DigitalAnalytics';
import { DigitalNotifications } from './pages/digital/DigitalNotifications';
import { DigitalProfile } from './pages/digital/DigitalProfile';
import { DigitalSettings } from './pages/digital/DigitalSettings';
import { DigitalDeliverables } from './pages/digital/DigitalDeliverables';
import { DigitalStaff } from './pages/digital/DigitalStaff';
import { DigitalLoginPage } from './pages/digital/DigitalLoginPage';
import DigitalClientPortal from './pages/digital/DigitalClientPortal';

// Digital Project Manager imports (Pure Supabase Rebuild)
import { DigitalPMLayout } from './layouts/DigitalPMLayout';
import { DigitalPMDashboard } from './pages/digital/pm/DigitalPMDashboard';
import { DigitalPMProjects } from './pages/digital/pm/DigitalPMProjects';
import { DigitalPMTasks } from './pages/digital/pm/DigitalPMTasks';
import { DigitalPMTickets } from './pages/digital/pm/DigitalPMTickets';
import { DigitalPMSprints } from './pages/digital/pm/DigitalPMSprints';
import { DigitalPMMilestones } from './pages/digital/pm/DigitalPMMilestones';
import { DigitalPMDocuments } from './pages/digital/pm/DigitalPMDocuments';
import { DigitalPMNotifications } from './pages/digital/pm/DigitalPMNotifications';
import { DigitalPMProfile } from './pages/digital/pm/DigitalPMProfile';

// Staff Panel Imports (Admissions Counselor)
import { StaffLayout } from './components/layout/StaffLayout';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffTasks } from './pages/staff/StaffTasks';
import { StaffStudents } from './pages/staff/StaffStudents';
import { StaffApplications } from './pages/staff/StaffApplications';
import { StaffUniversities } from './pages/staff/StaffUniversities';
import { StaffDestinations } from './pages/staff/StaffDestinations';
import { StaffDocuments } from './pages/staff/StaffDocuments';
import { StaffTickets } from './pages/staff/StaffTickets';
import { StaffProfile } from './pages/staff/StaffProfile';

import { autoSeedAllDataToSupabase } from './lib/api/supabaseAutoSeeder';

import { normalizeRole, getDashboardRoute, isSuperAdmin } from './lib/roleRouter';

// Resets route to Main Login on initial fresh load if at root and auto-seeds Supabase
const AppInitializer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    autoSeedAllDataToSupabase().catch(() => {});

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
const DIGITAL_ROLES = ['digital', 'digital_admin', 'ferex_digital', 'project_manager', 'digital_staff'];
const PM_ROLES = ['project_manager', 'digital_pm', 'digital_admin', 'digital'];
const STAFF_ROLES = ['staff', 'counselor', 'admin', 'education_admin'];

// Guards portal routes — redirects to login if not authenticated, or to proper portal if role mismatched
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { session, user, profile, loading } = useAuth();
  const location = useLocation();
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setAuthTimeout(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !authTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#58051E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // Check active user in session, Supabase auth, or local storage
  const localSavedUser = (() => {
    try {
      const raw = localStorage.getItem('ferex_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const effectiveUser = user || (session?.user ?? null) || (localSavedUser ? { id: localSavedUser.id, email: localSavedUser.email } : null);

  if (!session && !effectiveUser) {
    return <Navigate to="/login" replace />;
  }

  // Authoritative role from profile, user metadata, or local fallback
  const rawRole =
    profile?.role ||
    user?.user_metadata?.role ||
    user?.role ||
    localSavedUser?.role;

  const userEmail = effectiveUser?.email || profile?.email || localSavedUser?.email || '';
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

    let isAllowed = false;
    if (isSuper) {
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
    <AuthProvider>
      <Router>
        <HashMigrationRedirect />
        <AppInitializer />
        <Routes>
          {/* ── Official FEREX Education Website & Login Portal ── */}
          <Route path="/" element={<FerexLandingPage />} />
          <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/trade/login" element={<Navigate to="/login" replace />} />
          <Route path="/rimi/login" element={<RimiLoginPage />} />
          <Route path="/digital/login" element={<DigitalLoginPage />} />

          {/* ── Student Routes (STRICTLY role = 'student' ONLY) ── */}
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><StudentDashboard /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/journey-tracker" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><JourneyTracker /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/select-university" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><SelectUniversity /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/applications" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><UniversityApplications /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/offers" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><OfferLetters /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/documents" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Documents /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/payments" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Payments /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/invoices" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Invoices /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/meetings" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Meetings /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/chat" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Chat /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/support" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><SupportTickets /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><Notifications /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MyProfile /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><MyProfile defaultTab="Account & Security" /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/visa-tracker" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><VisaTracker /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/pre-departure" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><PreDeparture /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/housing" element={<Navigate to="/student/dashboard" replace />} />

          {/* ── Admin Routes ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
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
          <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminPayments /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminSupportTickets /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminChatSupport /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminStaffManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/meetings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminMeetings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminNotifications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/fee-config" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminFeeConfig /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/ai-copilot" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout><EnterpriseAIPage role="education_admin" portalName="Ferex Education" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/ai-assistant" element={<Navigate to="/admin/ai-copilot" replace />} />

          {/* ── Central Super Admin Routes (Strictly Super Admin Only) ── */}
          <Route path="/central/dashboard" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><CentralDashboard /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/ai-copilot" element={<ProtectedRoute allowedRoles={CENTRAL_ROLES}><CentralLayout><EnterpriseAIPage role="central_admin" portalName="Central Super Admin HQ" /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/ai-assistant" element={<Navigate to="/central/ai-copilot" replace />} />
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
          <Route path="/trade/tasks" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeTasks /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/tickets" element={<ProtectedRoute allowedRoles={TRADE_ROLES}><TradeLayout><TradeTickets /></TradeLayout></ProtectedRoute>} />
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
          <Route path="/rimi/profile" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/settings" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/tasks" element={<ProtectedRoute allowedRoles={RIMI_ROLES}><RimiLayout><RimiTasks /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/staff" element={<Navigate to="/central/staff" replace />} />

          {/* ── Ferex Digital Routes ── */}
          <Route path="/digital/dashboard" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalDashboard /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ai-copilot" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><EnterpriseAIPage role="digital_admin" portalName="Ferex Digital Agency" /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ai-assistant" element={<Navigate to="/digital/ai-copilot" replace />} />
          <Route path="/digital/clients" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalClients /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/leads" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalLeads /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/projects" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalProjects /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/tasks" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalTasks /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/deliverables" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalDeliverables /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/staff" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/meetings" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalMeetings /></DigitalLayout></ProtectedRoute>} />

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
          <Route path="/digital/invoices" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/invoices" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/payments" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/payments" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/expenses" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/expenses" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Team - Handled by Superadmin */}
          <Route path="/digital/employees" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/team/employees" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/attendance" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/team/attendance" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/performance" element={<Navigate to="/central/staff" replace />} />
          <Route path="/digital/team/performance" element={<Navigate to="/central/staff" replace />} />

          {/* Digital Analytics & Performance (Pure Supabase Telemetry) */}
          <Route path="/digital/analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/reports" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/reports" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/revenue-analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/revenue" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/project-analytics" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/project" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalAnalytics /></DigitalLayout></ProtectedRoute>} />

          {/* Digital System */}
          <Route path="/digital/notifications" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalNotifications /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/profile" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalProfile /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/settings" element={<ProtectedRoute allowedRoles={DIGITAL_ROLES}><DigitalLayout><DigitalSettings /></DigitalLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Project Manager Routes (Pure Supabase) ── */}
          <Route path="/digital/pm" element={<Navigate to="/digital/pm/dashboard" replace />} />
          <Route path="/digital/pm/dashboard" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMDashboard /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/projects" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMProjects /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/tasks" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMTasks /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/tickets" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMTickets /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/sprints" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMSprints /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/milestones" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMMilestones /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/documents" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMDocuments /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/notifications" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMNotifications /></DigitalPMLayout></ProtectedRoute>} />
          <Route path="/digital/pm/profile" element={<ProtectedRoute allowedRoles={PM_ROLES}><DigitalPMLayout><DigitalPMProfile /></DigitalPMLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Client Portal ── */}
          <Route path="/digital/client-portal" element={<ProtectedRoute allowedRoles={['digital_client']}><DigitalClientPortal /></ProtectedRoute>} />
          <Route path="/digital/client" element={<ProtectedRoute allowedRoles={['digital_client']}><DigitalClientPortal /></ProtectedRoute>} />

          {/* ── Ferex Staff Panel Routes (Admissions Counselor - Education Only) ── */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tasks" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffTasks /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/students" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffStudents /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/universities" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffUniversities /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/destinations" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffUniversities /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/applications" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffApplications /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/offers" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminApplications initialFilter="Offer Issued" /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/documents" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffDocuments /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/visa-tracker" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminVisaTracker /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/pre-departure" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminPreDeparture /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/support" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffTickets /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tickets" element={<Navigate to="/staff/support" replace />} />
          <Route path="/staff/meetings" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminMeetings /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><AdminNotifications /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/settings" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
