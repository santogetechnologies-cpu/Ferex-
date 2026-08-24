import { supabase } from '../supabase';

export async function getAdminDashboardStats() {
  try {
    const [
      { count: totalStudents },
      { count: activeApplications },
      { count: pendingApplications },
      { data: docsData },
      { data: paymentsData },
      { count: openTickets }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['Submitted', 'Under Review']),
      supabase.from('student_documents').select('status'),
      supabase.from('payments').select('status, amount'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['Open', 'Pending', 'In Progress'])
    ]);

    // Live Pending Documents count
    const pendingDocsCount = (docsData ?? []).filter((d: any) =>
      d.status === 'Pending Verification' || d.status === 'Pending' || d.status === 'Submitted'
    ).length;

    // Live Pending Payments count & total pending amount
    const pendingPayments = (paymentsData ?? []).filter((p: any) =>
      p.status === 'Pending Verification' || p.status === 'Pending' || p.status === 'Submitted' || p.status === 'Overdue'
    );

    const pendingPaymentsCount = pendingPayments.length;
    const pendingPaymentsAmount = pendingPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    return {
      totalStudents: totalStudents ?? 0,
      activeApplications: activeApplications ?? 0,
      pendingApplications: pendingApplications ?? 0,
      pendingDocuments: pendingDocsCount,
      pendingPaymentsCount: pendingPaymentsCount,
      pendingPaymentsAmount: pendingPaymentsAmount,
      openTickets: openTickets ?? 0,
      todaysMeetings: 2,
    };
  } catch (err) {
    return {
      totalStudents: 0,
      activeApplications: 0,
      pendingApplications: 0,
      pendingDocuments: 0,
      pendingPaymentsCount: 0,
      pendingPaymentsAmount: 0,
      openTickets: 0,
      todaysMeetings: 0,
    };
  }
}

