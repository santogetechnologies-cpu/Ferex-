import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

// Admin imports
import { AdminLayout } from './layouts/AdminLayout';
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

// Central imports
import { CentralLayout } from './layouts/CentralLayout';
import { CentralDashboard } from './pages/central/CentralDashboard';
import { CentralPayments } from './pages/central/CentralPayments';
import { CentralReports } from './pages/central/CentralReports';
import { CentralAdmins } from './pages/central/CentralAdmins';
import { CentralRoles } from './pages/central/CentralRoles';
import { CentralTasks } from './pages/central/CentralTasks';
import { CentralActivity } from './pages/central/CentralActivity';
import { CentralNotifications } from './pages/central/CentralNotifications';
import { CentralSettings } from './pages/central/CentralSettings';

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
import { TradeClientPortal } from './pages/trade/TradeClientPortal';

// Rimi Frozen Distribution imports
import { RimiLayout } from './layouts/RimiLayout';
import { RimiDashboard } from './pages/rimi/RimiDashboard';
import { RimiCustomers } from './pages/rimi/RimiCustomers';
import { RimiDistributors } from './pages/rimi/RimiDistributors';
import { RimiRetailers } from './pages/rimi/RimiRetailers';
import { RimiWholesalers } from './pages/rimi/RimiWholesalers';
import { RimiSalesOrders } from './pages/rimi/RimiSalesOrders';
import { RimiProducts } from './pages/rimi/RimiProducts';
import { RimiInventory } from './pages/rimi/RimiInventory';
import { RimiWarehouses } from './pages/rimi/RimiWarehouses';
import { RimiBatchTracking } from './pages/rimi/RimiBatchTracking';
import { RimiExpiryTracking } from './pages/rimi/RimiExpiryTracking';
import { RimiDeliveries } from './pages/rimi/RimiDeliveries';
import { RimiCollections } from './pages/rimi/RimiCollections';
import { RimiVehicles } from './pages/rimi/RimiVehicles';
import { RimiDeliveryRoutes } from './pages/rimi/RimiDeliveryRoutes';
import { RimiSalesReports } from './pages/rimi/RimiSalesReports';
import { RimiInventoryAnalytics } from './pages/rimi/RimiInventoryAnalytics';
import { RimiRevenueAnalytics } from './pages/rimi/RimiRevenueAnalytics';
import { RimiMessages } from './pages/rimi/RimiMessages';
import { RimiNotifications } from './pages/rimi/RimiNotifications';
import { RimiProfile } from './pages/rimi/RimiProfile';
import { RimiSettings } from './pages/rimi/RimiSettings';
import { RimiLoginPage } from './pages/rimi/RimiLoginPage';
import { RimiCustomerPortal } from './pages/rimi/RimiCustomerPortal';

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
import { DigitalNotifications } from './pages/digital/DigitalNotifications';
import { DigitalProfile } from './pages/digital/DigitalProfile';
import { DigitalSettings } from './pages/digital/DigitalSettings';
import { DigitalLoginPage } from './pages/digital/DigitalLoginPage';
import DigitalClientPortal from './pages/digital/DigitalClientPortal';

// Staff Panel Imports
import { StaffLayout } from './components/layout/StaffLayout';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffTasks } from './pages/staff/StaffTasks';
import { StaffStudents } from './pages/staff/StaffStudents';
import { StaffMeetings } from './pages/staff/StaffMeetings';
import { StaffDocuments } from './pages/staff/StaffDocuments';
import { StaffTickets } from './pages/staff/StaffTickets';
import { StaffNotes } from './pages/staff/StaffNotes';
import { StaffNotifications } from './pages/staff/StaffNotifications';
import { StaffProfile } from './pages/staff/StaffProfile';

import { autoSeedAllDataToSupabase } from './lib/api/supabaseAutoSeeder';

import { normalizeRole, getDashboardRoute } from './lib/roleRouter';

// Resets route to Main Login on initial fresh load if at root and auto-seeds Supabase
const AppInitializer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    autoSeedAllDataToSupabase();

    if (location.pathname === '/' || location.pathname === '') {
      navigate('/', { replace: true });
    }
  }, []);
  return null;
};

// Guards portal routes — redirects to login if not authenticated, or to proper portal if role mismatched
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { session, user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#6A1B2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!session && !user) {
    return <Navigate to="/login" replace />;
  }

  // Authoritative role from public.users profile
  const rawRole = profile?.role;
  if (!rawRole) {
    // Profile is still resolving or user has no profile record
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#6A1B2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Resolving user permissions...</p>
        </div>
      </div>
    );
  }

  const currentRole = normalizeRole(rawRole);

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));
    const isSuper = currentRole === 'superadmin' || currentRole === 'super_admin' || currentRole === 'central';
    // Superadmin has universal access to all admin/division/staff portals (except student portal which is student-only)
    const isAllowed = normalizedAllowed.includes(currentRole) || (isSuper && !normalizedAllowed.includes('student'));

    if (!isAllowed) {
      // Unauthorized for this specific portal -> Redirect to user's authoritative dashboard
      const correctDashboard = getDashboardRoute(currentRole);
      return <Navigate to={correctDashboard} replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
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
          <Route path="/student/visa-tracker" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><VisaTracker /></StudentLayout></ProtectedRoute>} />
          <Route path="/student/pre-departure" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout><PreDeparture /></StudentLayout></ProtectedRoute>} />

          {/* ── Admin Routes (role = 'admin', 'super_admin', 'central') ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminStudents /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/universities" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminUniversities /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/visa-tracker" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminVisaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/pre-departure" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminPreDeparture /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/tasks" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminTaskManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminApplications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/documents" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminDocumentReview /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/nawa" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminNawaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminPayments /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminSupportTickets /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminChatSupport /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminStaffManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/meetings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminMeetings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminNotifications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/fee-config" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminFeeConfig /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'central']}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />

          {/* ── Central Super Admin Routes (Strictly Super Admin Only) ── */}
          <Route path="/central/dashboard" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralDashboard /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/finance" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralPayments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/payments" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralPayments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/reports" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralReports /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/admins" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralAdmins /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/roles" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralRoles /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/tasks" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralTasks /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/activity" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralActivity /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/notifications" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralNotifications /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/settings" element={<ProtectedRoute allowedRoles={['central', 'super_admin', 'superadmin']}><CentralLayout><CentralSettings /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/education" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/central/students" element={<Navigate to="/admin/students" replace />} />
          <Route path="/central/documents" element={<Navigate to="/admin/documents" replace />} />
          <Route path="/central/support" element={<Navigate to="/admin/support" replace />} />
          <Route path="/central/insights" element={<Navigate to="/central/reports" replace />} />

          {/* ── Global Trade Routes ── */}
          <Route path="/trade/dashboard" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeDashboard /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/crm" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeCRM /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipments" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeShipments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/invoices" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeInvoices /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/packing-lists" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradePackingLists /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/bills-of-lading" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeBillsOfLading /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/certificates" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeCertificates /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/documents" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeDocuments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/letters-of-credit" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeLettersOfCredit /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/payments" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradePayments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/reports" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeReports /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipment-analytics" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeShipmentAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/financial-analytics" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeFinancialAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/messages" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeMessages /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/notifications" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeNotifications /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/profile" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeProfile /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/settings" element={<ProtectedRoute allowedRoles={['trade', 'admin', 'central', 'super_admin']}><TradeLayout><TradeSettings /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/client-portal" element={<ProtectedRoute allowedRoles={['trade_client']}><TradeClientPortal /></ProtectedRoute>} />

          {/* ── Rimi Frozen Distribution Routes ── */}
          <Route path="/rimi/dashboard" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiDashboard /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/customers" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiCustomers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/distributors" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiDistributors /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/retailers" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiRetailers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/wholesalers" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiWholesalers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/sales-orders" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiSalesOrders /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/products" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiProducts /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/inventory" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiInventory /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/warehouses" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiWarehouses /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/batch-tracking" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiBatchTracking /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/expiry-tracking" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiExpiryTracking /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/deliveries" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiDeliveries /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/collections" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiCollections /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/vehicles" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiVehicles /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/delivery-routes" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiDeliveryRoutes /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/sales-reports" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiSalesReports /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/inventory-analytics" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiInventoryAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/revenue-analytics" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiRevenueAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/messages" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiMessages /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/notifications" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiNotifications /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/profile" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/settings" element={<ProtectedRoute allowedRoles={['rimi', 'rimi_admin', 'rimi_frozen', 'admin', 'central', 'super_admin']}><RimiLayout><RimiSettings /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/customer-portal" element={<ProtectedRoute allowedRoles={['rimi_client']}><RimiCustomerPortal /></ProtectedRoute>} />

          {/* ── Ferex Digital Routes ── */}
          <Route path="/digital/dashboard" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalDashboard /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/clients" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalClients /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/leads" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalLeads /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/projects" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalProjects /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/tasks" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalTasks /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/meetings" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalMeetings /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Services */}
          <Route path="/digital/services" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalServicesHub /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/web-development" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalWebDevelopment /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/web-development" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalWebDevelopment /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/mobile-apps" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalMobileApps /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/mobile-apps" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalMobileApps /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/ui-ux-design" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalUIUX /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ui-ux-design" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalUIUX /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/digital-marketing" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalMarketing /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/digital-marketing" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalMarketing /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/seo" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalSEO /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/seo" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalSEO /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/services/branding" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalBranding /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/branding" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalBranding /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Finance */}
          <Route path="/digital/invoices" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/invoices" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/payments" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/payments" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/expenses" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/expenses" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Team */}
          <Route path="/digital/employees" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalEmployees /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/employees" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalEmployees /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/attendance" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalAttendance /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/attendance" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalAttendance /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/performance" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalPerformance /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/performance" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalPerformance /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Analytics */}
          <Route path="/digital/reports" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalReports /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/reports" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalReports /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/revenue-analytics" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/revenue" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/project-analytics" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalProjectAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/project" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalProjectAnalytics /></DigitalLayout></ProtectedRoute>} />

          {/* Digital System */}
          <Route path="/digital/notifications" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalNotifications /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/profile" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalProfile /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/settings" element={<ProtectedRoute allowedRoles={['digital', 'digital_admin', 'ferex_digital', 'admin', 'central', 'super_admin']}><DigitalLayout><DigitalSettings /></DigitalLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Client Portal (restricted view for provisioned clients) ── */}
          <Route path="/digital/client-portal" element={<ProtectedRoute allowedRoles={['digital_client']}><DigitalClientPortal /></ProtectedRoute>} />

          {/* ── Ferex Staff Panel Routes ── */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tasks" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffTasks /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/students" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffStudents /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/meetings" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffMeetings /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/documents" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffDocuments /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tickets" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffTickets /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notes" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffNotes /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffNotifications /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={['staff', 'counselor', 'admin', 'central', 'super_admin']}><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
