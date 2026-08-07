import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { StudentLayout } from './layouts/StudentLayout';
import { StudentDashboard } from './pages/StudentDashboard';
import { JourneyTracker } from './pages/JourneyTracker';
import { SelectUniversity } from './pages/SelectUniversity';
import { UniversityApplications } from './pages/UniversityApplications';
import { OfferLetters } from './pages/OfferLetters';
import { Documents } from './pages/Documents';
import { Payments } from './pages/Payments';
import { Invoices } from './pages/Invoices';
import { Receipts } from './pages/Receipts';
import { Meetings } from './pages/Meetings';
import { Chat } from './pages/Chat';
import { SupportTickets } from './pages/SupportTickets';
import { Notifications } from './pages/Notifications';
import { MyProfile } from './pages/MyProfile';

// Admin imports
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
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

// Resets route to Main Login on initial fresh load if at root
const AppInitializer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/', { replace: true });
    }
  }, []);
  return null;
};

function App() {
  return (
    <Router>
      <AppInitializer />
      <Routes>
        {/* ── Single Unified Central FEREX Auth ── */}
        <Route path="/" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/admin/login" element={<Navigate to="/" replace />} />
        <Route path="/trade/login" element={<Navigate to="/" replace />} />
        <Route path="/rimi/login" element={<Navigate to="/" replace />} />
        <Route path="/digital/login" element={<Navigate to="/" replace />} />

        {/* ── Student Routes ── */}
        <Route path="/student/dashboard" element={<StudentLayout><StudentDashboard /></StudentLayout>} />
        <Route path="/student/journey-tracker" element={<StudentLayout><JourneyTracker /></StudentLayout>} />
        <Route path="/student/select-university" element={<StudentLayout><SelectUniversity /></StudentLayout>} />
        <Route path="/student/applications" element={<StudentLayout><UniversityApplications /></StudentLayout>} />
        <Route path="/student/offers" element={<StudentLayout><OfferLetters /></StudentLayout>} />
        <Route path="/student/documents" element={<StudentLayout><Documents /></StudentLayout>} />
        <Route path="/student/payments" element={<StudentLayout><Payments /></StudentLayout>} />
        <Route path="/student/invoices" element={<StudentLayout><Invoices /></StudentLayout>} />
        <Route path="/student/receipts" element={<StudentLayout><Receipts /></StudentLayout>} />
        <Route path="/student/meetings" element={<StudentLayout><Meetings /></StudentLayout>} />
        <Route path="/student/chat" element={<StudentLayout><Chat /></StudentLayout>} />
        <Route path="/student/support" element={<StudentLayout><SupportTickets /></StudentLayout>} />
        <Route path="/student/notifications" element={<StudentLayout><Notifications /></StudentLayout>} />
        <Route path="/student/profile" element={<StudentLayout><MyProfile /></StudentLayout>} />

        {/* ── Admin Routes ── */}
        <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/students" element={<AdminLayout><AdminStudents /></AdminLayout>} />
        <Route path="/admin/tasks" element={<AdminLayout><AdminTaskManagement /></AdminLayout>} />
        <Route path="/admin/applications" element={<AdminLayout><AdminApplications /></AdminLayout>} />
        <Route path="/admin/documents" element={<AdminLayout><AdminDocumentReview /></AdminLayout>} />
        <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />
        <Route path="/admin/support" element={<AdminLayout><AdminSupportTickets /></AdminLayout>} />
        <Route path="/admin/chat" element={<AdminLayout><AdminChatSupport /></AdminLayout>} />
        <Route path="/admin/reports" element={<AdminLayout><AdminReports /></AdminLayout>} />
        <Route path="/admin/staff" element={<AdminLayout><AdminStaffManagement /></AdminLayout>} />
        <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />

        {/* ── Central Super Admin Routes ── */}
        <Route path="/central/dashboard" element={<CentralLayout><CentralDashboard /></CentralLayout>} />
        <Route path="/central/education" element={<CentralLayout><CentralEducation /></CentralLayout>} />
        <Route path="/central/students" element={<CentralLayout><CentralStudents /></CentralLayout>} />
        <Route path="/central/admins" element={<CentralLayout><CentralAdmins /></CentralLayout>} />
        <Route path="/central/tasks" element={<CentralLayout><CentralTasks /></CentralLayout>} />
        <Route path="/central/payments" element={<CentralLayout><CentralPayments /></CentralLayout>} />
        <Route path="/central/documents" element={<CentralLayout><CentralDocuments /></CentralLayout>} />
        <Route path="/central/support" element={<CentralLayout><CentralSupport /></CentralLayout>} />
        <Route path="/central/reports" element={<CentralLayout><CentralReports /></CentralLayout>} />
        <Route path="/central/insights" element={<CentralLayout><CentralInsights /></CentralLayout>} />
        <Route path="/central/activity" element={<CentralLayout><CentralActivity /></CentralLayout>} />
        <Route path="/central/roles" element={<CentralLayout><CentralRoles /></CentralLayout>} />
        <Route path="/central/notifications" element={<CentralLayout><CentralNotifications /></CentralLayout>} />
        <Route path="/central/settings" element={<CentralLayout><CentralSettings /></CentralLayout>} />

        {/* ── Global Trade Routes ── */}
        <Route path="/trade/dashboard" element={<TradeLayout><TradeDashboard /></TradeLayout>} />
        <Route path="/trade/crm" element={<TradeLayout><TradeCRM /></TradeLayout>} />
        <Route path="/trade/shipments" element={<TradeLayout><TradeShipments /></TradeLayout>} />
        <Route path="/trade/invoices" element={<TradeLayout><TradeInvoices /></TradeLayout>} />
        <Route path="/trade/packing-lists" element={<TradeLayout><TradePackingLists /></TradeLayout>} />
        <Route path="/trade/bills-of-lading" element={<TradeLayout><TradeBillsOfLading /></TradeLayout>} />
        <Route path="/trade/certificates" element={<TradeLayout><TradeCertificates /></TradeLayout>} />
        <Route path="/trade/documents" element={<TradeLayout><TradeDocuments /></TradeLayout>} />
        <Route path="/trade/letters-of-credit" element={<TradeLayout><TradeLettersOfCredit /></TradeLayout>} />
        <Route path="/trade/payments" element={<TradeLayout><TradePayments /></TradeLayout>} />
        <Route path="/trade/reports" element={<TradeLayout><TradeReports /></TradeLayout>} />
        <Route path="/trade/shipment-analytics" element={<TradeLayout><TradeShipmentAnalytics /></TradeLayout>} />
        <Route path="/trade/financial-analytics" element={<TradeLayout><TradeFinancialAnalytics /></TradeLayout>} />
        <Route path="/trade/messages" element={<TradeLayout><TradeMessages /></TradeLayout>} />
        <Route path="/trade/notifications" element={<TradeLayout><TradeNotifications /></TradeLayout>} />
        <Route path="/trade/profile" element={<TradeLayout><TradeProfile /></TradeLayout>} />
        <Route path="/trade/settings" element={<TradeLayout><TradeSettings /></TradeLayout>} />

        {/* ── Rimi Frozen Distribution Routes ── */}
        <Route path="/rimi/dashboard" element={<RimiLayout><RimiDashboard /></RimiLayout>} />
        <Route path="/rimi/customers" element={<RimiLayout><RimiCustomers /></RimiLayout>} />
        <Route path="/rimi/distributors" element={<RimiLayout><RimiDistributors /></RimiLayout>} />
        <Route path="/rimi/retailers" element={<RimiLayout><RimiRetailers /></RimiLayout>} />
        <Route path="/rimi/wholesalers" element={<RimiLayout><RimiWholesalers /></RimiLayout>} />
        <Route path="/rimi/sales-orders" element={<RimiLayout><RimiSalesOrders /></RimiLayout>} />
        <Route path="/rimi/products" element={<RimiLayout><RimiProducts /></RimiLayout>} />
        <Route path="/rimi/inventory" element={<RimiLayout><RimiInventory /></RimiLayout>} />
        <Route path="/rimi/warehouses" element={<RimiLayout><RimiWarehouses /></RimiLayout>} />
        <Route path="/rimi/batch-tracking" element={<RimiLayout><RimiBatchTracking /></RimiLayout>} />
        <Route path="/rimi/expiry-tracking" element={<RimiLayout><RimiExpiryTracking /></RimiLayout>} />
        <Route path="/rimi/deliveries" element={<RimiLayout><RimiDeliveries /></RimiLayout>} />
        <Route path="/rimi/collections" element={<RimiLayout><RimiCollections /></RimiLayout>} />
        <Route path="/rimi/vehicles" element={<RimiLayout><RimiVehicles /></RimiLayout>} />
        <Route path="/rimi/delivery-routes" element={<RimiLayout><RimiDeliveryRoutes /></RimiLayout>} />
        <Route path="/rimi/sales-reports" element={<RimiLayout><RimiSalesReports /></RimiLayout>} />
        <Route path="/rimi/inventory-analytics" element={<RimiLayout><RimiInventoryAnalytics /></RimiLayout>} />
        <Route path="/rimi/revenue-analytics" element={<RimiLayout><RimiRevenueAnalytics /></RimiLayout>} />
        <Route path="/rimi/messages" element={<RimiLayout><RimiMessages /></RimiLayout>} />
        <Route path="/rimi/notifications" element={<RimiLayout><RimiNotifications /></RimiLayout>} />
        <Route path="/rimi/profile" element={<RimiLayout><RimiProfile /></RimiLayout>} />
        <Route path="/rimi/settings" element={<RimiLayout><RimiSettings /></RimiLayout>} />

        {/* ── Ferex Digital Routes ── */}
        <Route path="/digital/dashboard" element={<DigitalLayout><DigitalDashboard /></DigitalLayout>} />
        <Route path="/digital/clients" element={<DigitalLayout><DigitalClients /></DigitalLayout>} />
        <Route path="/digital/leads" element={<DigitalLayout><DigitalLeads /></DigitalLayout>} />
        <Route path="/digital/projects" element={<DigitalLayout><DigitalProjects /></DigitalLayout>} />
        <Route path="/digital/tasks" element={<DigitalLayout><DigitalTasks /></DigitalLayout>} />
        <Route path="/digital/meetings" element={<DigitalLayout><DigitalMeetings /></DigitalLayout>} />

        {/* Digital Services */}
        <Route path="/digital/services" element={<DigitalLayout><DigitalServicesHub /></DigitalLayout>} />

        <Route path="/digital/services/web-development" element={<DigitalLayout><DigitalWebDevelopment /></DigitalLayout>} />
        <Route path="/digital/web-development" element={<DigitalLayout><DigitalWebDevelopment /></DigitalLayout>} />

        <Route path="/digital/services/mobile-apps" element={<DigitalLayout><DigitalMobileApps /></DigitalLayout>} />
        <Route path="/digital/mobile-apps" element={<DigitalLayout><DigitalMobileApps /></DigitalLayout>} />

        <Route path="/digital/services/ui-ux-design" element={<DigitalLayout><DigitalUIUX /></DigitalLayout>} />
        <Route path="/digital/ui-ux-design" element={<DigitalLayout><DigitalUIUX /></DigitalLayout>} />

        <Route path="/digital/services/digital-marketing" element={<DigitalLayout><DigitalMarketing /></DigitalLayout>} />
        <Route path="/digital/digital-marketing" element={<DigitalLayout><DigitalMarketing /></DigitalLayout>} />

        <Route path="/digital/services/seo" element={<DigitalLayout><DigitalSEO /></DigitalLayout>} />
        <Route path="/digital/seo" element={<DigitalLayout><DigitalSEO /></DigitalLayout>} />

        <Route path="/digital/services/branding" element={<DigitalLayout><DigitalBranding /></DigitalLayout>} />
        <Route path="/digital/branding" element={<DigitalLayout><DigitalBranding /></DigitalLayout>} />

        {/* Digital Finance */}
        <Route path="/digital/invoices" element={<DigitalLayout><DigitalInvoices /></DigitalLayout>} />
        <Route path="/digital/finance/invoices" element={<DigitalLayout><DigitalInvoices /></DigitalLayout>} />

        <Route path="/digital/payments" element={<DigitalLayout><DigitalPayments /></DigitalLayout>} />
        <Route path="/digital/finance/payments" element={<DigitalLayout><DigitalPayments /></DigitalLayout>} />

        <Route path="/digital/expenses" element={<DigitalLayout><DigitalExpenses /></DigitalLayout>} />
        <Route path="/digital/finance/expenses" element={<DigitalLayout><DigitalExpenses /></DigitalLayout>} />

        {/* Digital Team */}
        <Route path="/digital/employees" element={<DigitalLayout><DigitalEmployees /></DigitalLayout>} />
        <Route path="/digital/team/employees" element={<DigitalLayout><DigitalEmployees /></DigitalLayout>} />

        <Route path="/digital/attendance" element={<DigitalLayout><DigitalAttendance /></DigitalLayout>} />
        <Route path="/digital/team/attendance" element={<DigitalLayout><DigitalAttendance /></DigitalLayout>} />

        <Route path="/digital/performance" element={<DigitalLayout><DigitalPerformance /></DigitalLayout>} />
        <Route path="/digital/team/performance" element={<DigitalLayout><DigitalPerformance /></DigitalLayout>} />

        {/* Digital Analytics */}
        <Route path="/digital/reports" element={<DigitalLayout><DigitalReports /></DigitalLayout>} />
        <Route path="/digital/analytics/reports" element={<DigitalLayout><DigitalReports /></DigitalLayout>} />

        <Route path="/digital/revenue-analytics" element={<DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout>} />
        <Route path="/digital/analytics/revenue" element={<DigitalLayout><DigitalRevenueAnalytics /></DigitalLayout>} />

        <Route path="/digital/project-analytics" element={<DigitalLayout><DigitalProjectAnalytics /></DigitalLayout>} />
        <Route path="/digital/analytics/project" element={<DigitalLayout><DigitalProjectAnalytics /></DigitalLayout>} />

        {/* Digital System */}
        <Route path="/digital/notifications" element={<DigitalLayout><DigitalNotifications /></DigitalLayout>} />
        <Route path="/digital/profile" element={<DigitalLayout><DigitalProfile /></DigitalLayout>} />
        <Route path="/digital/settings" element={<DigitalLayout><DigitalSettings /></DigitalLayout>} />

        {/* ── Ferex Staff Panel Routes ── */}
        <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="/staff/dashboard" element={<StaffLayout><StaffDashboard /></StaffLayout>} />
        <Route path="/staff/tasks" element={<StaffLayout><StaffTasks /></StaffLayout>} />
        <Route path="/staff/students" element={<StaffLayout><StaffStudents /></StaffLayout>} />
        <Route path="/staff/meetings" element={<StaffLayout><StaffMeetings /></StaffLayout>} />
        <Route path="/staff/documents" element={<StaffLayout><StaffDocuments /></StaffLayout>} />
        <Route path="/staff/tickets" element={<StaffLayout><StaffTickets /></StaffLayout>} />
        <Route path="/staff/notes" element={<StaffLayout><StaffNotes /></StaffLayout>} />
        <Route path="/staff/notifications" element={<StaffLayout><StaffNotifications /></StaffLayout>} />
        <Route path="/staff/profile" element={<StaffLayout><StaffProfile /></StaffLayout>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
