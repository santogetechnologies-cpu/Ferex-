import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
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

// Resets route to Main Login on fresh load / browser refresh (no storage persistence used)
const AppInitializer: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, []);
  return null;
};

function App() {
  return (
    <Router>
      <AppInitializer />
      <Routes>
        {/* ── Student Auth ── */}
        <Route path="/" element={<AuthLayout><LoginPage /></AuthLayout>} />

        {/* ── Admin Auth ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
