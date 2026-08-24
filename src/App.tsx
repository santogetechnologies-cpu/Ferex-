import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
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
import { CentralEducation } from './pages/central/CentralEducation';
import { CentralStudents } from './pages/central/CentralStudents';
import { CentralAdmins } from './pages/central/CentralAdmins';
import { CentralTasks } from './pages/central/CentralTasks';
import { CentralPayments } from './pages/central/CentralPayments';
import { CentralDocuments } from './pages/central/CentralDocuments';
import { CentralSupport } from './pages/central/CentralSupport';
import { CentralReports } from './pages/central/CentralReports';
import { CentralInsights } from './pages/central/CentralInsights';
import { CentralActivity } from './pages/central/CentralActivity';
import { CentralRoles } from './pages/central/CentralRoles';
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

// Guards portal routes — redirects to login if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user, loading } = useAuth();
  const hasDemo = typeof window !== 'undefined' && Boolean(
    localStorage.getItem('ferex_demo_role') ||
    localStorage.getItem('ferex_demo_user') ||
    localStorage.getItem('ferex_user')
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#6A1B2E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!session && !user && !hasDemo) {
    return <Navigate to="/login" replace />;
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
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/trade/login" element={<Navigate to="/login" replace />} />
          <Route path="/rimi/login" element={<Navigate to="/login" replace />} />
          <Route path="/digital/login" element={<Navigate to="/login" replace />} />

          {/* ── Student Routes ── */}
          <Route path="/student/dashboard" element={<StudentLayout><StudentDashboard /></StudentLayout>} />
          <Route path="/student/journey-tracker" element={<StudentLayout><JourneyTracker /></StudentLayout>} />
          <Route path="/student/select-university" element={<StudentLayout><SelectUniversity /></StudentLayout>} />
          <Route path="/student/applications" element={<StudentLayout><UniversityApplications /></StudentLayout>} />
          <Route path="/student/offers" element={<StudentLayout><OfferLetters /></StudentLayout>} />
          <Route path="/student/documents" element={<StudentLayout><Documents /></StudentLayout>} />
          <Route path="/student/payments" element={<StudentLayout><Payments /></StudentLayout>} />
          <Route path="/student/invoices" element={<StudentLayout><Invoices /></StudentLayout>} />
          <Route path="/student/meetings" element={<StudentLayout><Meetings /></StudentLayout>} />
          <Route path="/student/chat" element={<StudentLayout><Chat /></StudentLayout>} />
          <Route path="/student/support" element={<StudentLayout><SupportTickets /></StudentLayout>} />
          <Route path="/student/notifications" element={<StudentLayout><Notifications /></StudentLayout>} />
          <Route path="/student/profile" element={<StudentLayout><MyProfile /></StudentLayout>} />
          <Route path="/student/visa-tracker" element={<StudentLayout><VisaTracker /></StudentLayout>} />
          <Route path="/student/pre-departure" element={<StudentLayout><PreDeparture /></StudentLayout>} />

          {/* ── Admin Routes ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><AdminLayout><AdminStudents /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/universities" element={<ProtectedRoute><AdminLayout><AdminUniversities /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/visa-tracker" element={<ProtectedRoute><AdminLayout><AdminVisaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/pre-departure" element={<ProtectedRoute><AdminLayout><AdminPreDeparture /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/tasks" element={<ProtectedRoute><AdminLayout><AdminTaskManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/applications" element={<ProtectedRoute><AdminLayout><AdminApplications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/documents" element={<ProtectedRoute><AdminLayout><AdminDocumentReview /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/nawa" element={<ProtectedRoute><AdminLayout><AdminNawaTracker /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute><AdminLayout><AdminPayments /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute><AdminLayout><AdminSupportTickets /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute><AdminLayout><AdminChatSupport /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><AdminLayout><AdminReports /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute><AdminLayout><AdminStaffManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/meetings" element={<ProtectedRoute><AdminLayout><AdminMeetings /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute><AdminLayout><AdminNotifications /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/fee-config" element={<ProtectedRoute><AdminLayout><AdminFeeConfig /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />

          {/* ── Central Super Admin Routes ── */}
          <Route path="/central/dashboard" element={<ProtectedRoute><CentralLayout><CentralDashboard /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/education" element={<ProtectedRoute><CentralLayout><CentralEducation /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/students" element={<ProtectedRoute><CentralLayout><CentralStudents /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/admins" element={<ProtectedRoute><CentralLayout><CentralAdmins /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/tasks" element={<ProtectedRoute><CentralLayout><CentralTasks /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/payments" element={<ProtectedRoute><CentralLayout><CentralPayments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/documents" element={<ProtectedRoute><CentralLayout><CentralDocuments /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/support" element={<ProtectedRoute><CentralLayout><CentralSupport /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/reports" element={<ProtectedRoute><CentralLayout><CentralReports /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/insights" element={<ProtectedRoute><CentralLayout><CentralInsights /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/activity" element={<ProtectedRoute><CentralLayout><CentralActivity /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/roles" element={<ProtectedRoute><CentralLayout><CentralRoles /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/notifications" element={<ProtectedRoute><CentralLayout><CentralNotifications /></CentralLayout></ProtectedRoute>} />
          <Route path="/central/settings" element={<ProtectedRoute><CentralLayout><CentralSettings /></CentralLayout></ProtectedRoute>} />

          {/* ── Global Trade Routes ── */}
          <Route path="/trade/dashboard" element={<ProtectedRoute><TradeLayout><TradeDashboard /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/crm" element={<ProtectedRoute><TradeLayout><TradeCRM /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipments" element={<ProtectedRoute><TradeLayout><TradeShipments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/invoices" element={<ProtectedRoute><TradeLayout><TradeInvoices /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/packing-lists" element={<ProtectedRoute><TradeLayout><TradePackingLists /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/bills-of-lading" element={<ProtectedRoute><TradeLayout><TradeBillsOfLading /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/certificates" element={<ProtectedRoute><TradeLayout><TradeCertificates /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/documents" element={<ProtectedRoute><TradeLayout><TradeDocuments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/letters-of-credit" element={<ProtectedRoute><TradeLayout><TradeLettersOfCredit /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/payments" element={<ProtectedRoute><TradeLayout><TradePayments /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/reports" element={<ProtectedRoute><TradeLayout><TradeReports /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/shipment-analytics" element={<ProtectedRoute><TradeLayout><TradeShipmentAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/financial-analytics" element={<ProtectedRoute><TradeLayout><TradeFinancialAnalytics /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/messages" element={<ProtectedRoute><TradeLayout><TradeMessages /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/notifications" element={<ProtectedRoute><TradeLayout><TradeNotifications /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/profile" element={<ProtectedRoute><TradeLayout><TradeProfile /></TradeLayout></ProtectedRoute>} />
          <Route path="/trade/settings" element={<ProtectedRoute><TradeLayout><TradeSettings /></TradeLayout></ProtectedRoute>} />

          {/* ── Rimi Frozen Distribution Routes ── */}
          <Route path="/rimi/dashboard" element={<ProtectedRoute><RimiLayout><RimiDashboard /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/customers" element={<ProtectedRoute><RimiLayout><RimiCustomers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/distributors" element={<ProtectedRoute><RimiLayout><RimiDistributors /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/retailers" element={<ProtectedRoute><RimiLayout><RimiRetailers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/wholesalers" element={<ProtectedRoute><RimiLayout><RimiWholesalers /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/sales-orders" element={<ProtectedRoute><RimiLayout><RimiSalesOrders /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/products" element={<ProtectedRoute><RimiLayout><RimiProducts /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/inventory" element={<ProtectedRoute><RimiLayout><RimiInventory /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/warehouses" element={<ProtectedRoute><RimiLayout><RimiWarehouses /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/batch-tracking" element={<ProtectedRoute><RimiLayout><RimiBatchTracking /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/expiry-tracking" element={<ProtectedRoute><RimiLayout><RimiExpiryTracking /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/deliveries" element={<ProtectedRoute><RimiLayout><RimiDeliveries /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/collections" element={<ProtectedRoute><RimiLayout><RimiCollections /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/vehicles" element={<ProtectedRoute><RimiLayout><RimiVehicles /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/delivery-routes" element={<ProtectedRoute><RimiLayout><RimiDeliveryRoutes /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/sales-reports" element={<ProtectedRoute><RimiLayout><RimiSalesReports /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/inventory-analytics" element={<ProtectedRoute><RimiLayout><RimiInventoryAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/revenue-analytics" element={<ProtectedRoute><RimiLayout><RimiRevenueAnalytics /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/messages" element={<ProtectedRoute><RimiLayout><RimiMessages /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/notifications" element={<ProtectedRoute><RimiLayout><RimiNotifications /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/profile" element={<ProtectedRoute><RimiLayout><RimiProfile /></RimiLayout></ProtectedRoute>} />
          <Route path="/rimi/settings" element={<ProtectedRoute><RimiLayout><RimiSettings /></RimiLayout></ProtectedRoute>} />

          {/* ── Ferex Digital Routes ── */}
          <Route path="/digital/dashboard" element={<ProtectedRoute><DigitalLayout><DigitalDashboard /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/clients" element={<ProtectedRoute><DigitalLayout><DigitalClients /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/leads" element={<ProtectedRoute><DigitalLayout><DigitalLeads /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/projects" element={<ProtectedRoute><DigitalLayout><DigitalProjects /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/tasks" element={<ProtectedRoute><DigitalLayout><DigitalTasks /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/meetings" element={<ProtectedRoute><DigitalLayout><DigitalMeetings /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Services */}
          <Route path="/digital/services" element={<ProtectedRoute><DigitalLayout><DigitalServicesHub /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/web-development" element={<ProtectedRoute><DigitalLayout><DigitalWebDevelopment /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/web-development" element={<ProtectedRoute><DigitalLayout><DigitalWebDevelopment /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/mobile-apps" element={<ProtectedRoute><DigitalLayout><DigitalMobileApps /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/mobile-apps" element={<ProtectedRoute><DigitalLayout><DigitalMobileApps /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/ui-ux-design" element={<ProtectedRoute><DigitalLayout><DigitalUIUX /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/ui-ux-design" element={<ProtectedRoute><DigitalLayout><DigitalUIUX /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/digital-marketing" element={<ProtectedRoute><DigitalLayout><DigitalMarketing /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/digital-marketing" element={<ProtectedRoute><DigitalLayout><DigitalMarketing /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/seo" element={<ProtectedRoute><DigitalLayout><DigitalSEO /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/seo" element={<ProtectedRoute><DigitalLayout><DigitalSEO /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/services/branding" element={<ProtectedRoute><DigitalLayout><DigitalBranding /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/branding" element={<ProtectedRoute><DigitalLayout><DigitalBranding /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Finance */}
          <Route path="/digital/invoices" element={<ProtectedRoute><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/invoices" element={<ProtectedRoute><DigitalLayout><DigitalInvoices /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/payments" element={<ProtectedRoute><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/payments" element={<ProtectedRoute><DigitalLayout><DigitalPayments /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/expenses" element={<ProtectedRoute><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/finance/expenses" element={<ProtectedRoute><DigitalLayout><DigitalExpenses /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Team */}
          <Route path="/digital/employees" element={<ProtectedRoute><DigitalLayout><DigitalEmployees /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/employees" element={<ProtectedRoute><DigitalLayout><DigitalEmployees /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/attendance" element={<ProtectedRoute><DigitalLayout><DigitalAttendance /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/attendance" element={<ProtectedRoute><DigitalLayout><DigitalAttendance /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/performance" element={<ProtectedRoute><DigitalLayout><DigitalPerformance /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/team/performance" element={<ProtectedRoute><DigitalLayout><DigitalPerformance /></DigitalLayout></ProtectedRoute>} />

          {/* Digital Analytics */}
          <Route path="/digital/reports" element={<ProtectedRoute><DigitalLayout><DigitalReports /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/reports" element={<ProtectedRoute><DigitalLayout><DigitalReports /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/revenue-analytics" element={<ProtectedRoute><DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/revenue" element={<ProtectedRoute><DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout></ProtectedRoute>} />

          <Route path="/digital/project-analytics" element={<ProtectedRoute><DigitalLayout><DigitalProjectAnalytics /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/analytics/project" element={<ProtectedRoute><DigitalLayout><DigitalProjectAnalytics /></DigitalLayout></ProtectedRoute>} />

          {/* Digital System */}
          <Route path="/digital/notifications" element={<ProtectedRoute><DigitalLayout><DigitalNotifications /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/profile" element={<ProtectedRoute><DigitalLayout><DigitalProfile /></DigitalLayout></ProtectedRoute>} />
          <Route path="/digital/settings" element={<ProtectedRoute><DigitalLayout><DigitalSettings /></DigitalLayout></ProtectedRoute>} />

          {/* ── Ferex Staff Panel Routes ── */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<ProtectedRoute><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tasks" element={<ProtectedRoute><StaffLayout><StaffTasks /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/students" element={<ProtectedRoute><StaffLayout><StaffStudents /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/meetings" element={<ProtectedRoute><StaffLayout><StaffMeetings /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/documents" element={<ProtectedRoute><StaffLayout><StaffDocuments /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/tickets" element={<ProtectedRoute><StaffLayout><StaffTickets /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notes" element={<ProtectedRoute><StaffLayout><StaffNotes /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/notifications" element={<ProtectedRoute><StaffLayout><StaffNotifications /></StaffLayout></ProtectedRoute>} />
          <Route path="/staff/profile" element={<ProtectedRoute><StaffLayout><StaffProfile /></StaffLayout></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
