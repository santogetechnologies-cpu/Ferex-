import { supabase } from '../supabase';

export interface CentralEnterpriseStats {
  educationStudents: number;
  educationApplications: number;
  educationRevenueInr: number;
  digitalClients: number;
  digitalProjects: number;
  digitalRevenueInr: number;
  tradeShipments: number;
  tradeRevenueEur: number;
  rimiOrders: number;
  rimiRevenueInr: number;
  staffCount: number;
}

export async function getCentralEnterpriseMetrics(): Promise<CentralEnterpriseStats> {
  try {
    // 1. Try fetching from stored procedure / view
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_central_dashboard_metrics');
    if (!rpcError && rpcData) {
      return {
        educationStudents: rpcData.education_students_total ?? 0,
        educationApplications: rpcData.education_applications_total ?? 0,
        educationRevenueInr: rpcData.education_revenue_inr ?? 0,
        digitalClients: rpcData.digital_active_clients ?? 0,
        digitalProjects: rpcData.digital_running_projects ?? 0,
        digitalRevenueInr: rpcData.digital_revenue_inr ?? 0,
        tradeShipments: rpcData.trade_active_shipments ?? 0,
        tradeRevenueEur: rpcData.trade_revenue_eur ?? 0,
        rimiOrders: rpcData.rimi_total_orders ?? 0,
        rimiRevenueInr: rpcData.rimi_revenue_inr ?? 0,
        staffCount: rpcData.staff_count_total ?? 0,
      };
    }

    // 2. Direct parallel aggregation queries across tables
    const [
      studentsRes,
      appsRes,
      paymentsRes,
      digClientsRes,
      digProjectsRes,
      digInvoicesRes,
      tradeShipRes,
      tradeInvRes,
      rimiOrdersRes,
      staffRes,
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('amount, status'),
      supabase.from('digital_clients').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('digital_projects').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
      supabase.from('digital_invoices').select('total_amount, status'),
      supabase.from('trade_shipments').select('*', { count: 'exact', head: true }).eq('status', 'In Transit'),
      supabase.from('trade_invoices').select('amount, status'),
      supabase.from('rimi_sales_orders').select('total_amount, status'),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['staff', 'counselor', 'admin']),
    ]);

    const eduRevenue = (paymentsRes.data ?? []).filter((p: any) => p.status === 'Paid' || p.status === 'Verified').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const digRevenue = (digInvoicesRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0);
    const tradeRevenue = (tradeInvRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const rimiRevenue = (rimiOrdersRes.data ?? []).filter((o: any) => o.status === 'Delivered & Paid').reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);

    return {
      educationStudents: studentsRes.count ?? 0,
      educationApplications: appsRes.count ?? 0,
      educationRevenueInr: eduRevenue,
      digitalClients: digClientsRes.count ?? 0,
      digitalProjects: digProjectsRes.count ?? 0,
      digitalRevenueInr: digRevenue,
      tradeShipments: tradeShipRes.count ?? 0,
      tradeRevenueEur: tradeRevenue,
      rimiOrders: rimiOrdersRes.data?.length ?? 0,
      rimiRevenueInr: rimiRevenue,
      staffCount: staffRes.count ?? 0,
    };
  } catch (err) {
    return {
      educationStudents: 0,
      educationApplications: 0,
      educationRevenueInr: 0,
      digitalClients: 0,
      digitalProjects: 0,
      digitalRevenueInr: 0,
      tradeShipments: 0,
      tradeRevenueEur: 0,
      rimiOrders: 0,
      rimiRevenueInr: 0,
      staffCount: 0,
    };
  }
}
