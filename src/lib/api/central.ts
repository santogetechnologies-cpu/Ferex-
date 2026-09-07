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

export interface CentralActivityItem {
  id: string;
  division: 'Education' | 'Trade ERP' | 'Rimi Frozen' | 'Digital Agency' | 'HQ';
  divisionBadge: string;
  title: string;
  subtitle: string;
  time: string;
  amount: string;
  status: 'Action Required' | 'Cleared' | 'Pending';
  canApprove: boolean;
}

export async function getCentralEnterpriseMetrics(): Promise<CentralEnterpriseStats> {
  try {
    // 1. Try fetching from stored procedure / view if present
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
      supabase.from('digital_invoices').select('amount, status'),
      supabase.from('trade_shipments').select('*', { count: 'exact', head: true }).eq('status', 'In Transit'),
      supabase.from('trade_invoices').select('amount, status'),
      supabase.from('rimi_sales_orders').select('total_amount, payment_status, order_status'),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['staff', 'counselor', 'admin']),
    ]);

    const eduRevenue = (paymentsRes.data ?? []).filter((p: any) => p.status === 'Paid' || p.status === 'Verified').reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const digRevenue = (digInvoicesRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const tradeRevenue = (tradeInvRes.data ?? []).filter((i: any) => i.status === 'Paid').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
    const rimiRevenue = (rimiOrdersRes.data ?? []).filter((o: any) => o.payment_status === 'Paid' || o.order_status === 'Delivered').reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);

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

export async function getCentralLiveActivities(): Promise<CentralActivityItem[]> {
  try {
    const activities: CentralActivityItem[] = [];

    // Fetch real recent rows across divisions
    const [eduPayRes, tradeShipRes, rimiOrderRes, digInvRes] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(3),
      supabase.from('trade_shipments').select('*').order('created_at', { ascending: false }).limit(3),
      supabase.from('rimi_sales_orders').select('*, distributor:rimi_distributors(business_name)').order('created_at', { ascending: false }).limit(3),
      supabase.from('digital_invoices').select('*, client:digital_clients(company_name)').order('created_at', { ascending: false }).limit(3),
    ]);

    if (eduPayRes.data) {
      eduPayRes.data.forEach((p: any) => {
        activities.push({
          id: p.id,
          division: 'Education',
          divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
          title: `${p.purpose || 'Student Fee Settlement'}`,
          subtitle: `Receipt: ${p.receipt_number || p.reference_number || 'Ref #' + p.id?.slice(0, 6)}`,
          time: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
          amount: `₹${Number(p.amount || 0).toLocaleString('en-IN')}`,
          status: p.status === 'Paid' ? 'Cleared' : 'Action Required',
          canApprove: p.status !== 'Paid',
        });
      });
    }

    if (tradeShipRes.data) {
      tradeShipRes.data.forEach((s: any) => {
        activities.push({
          id: s.id,
          division: 'Trade ERP',
          divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          title: `Shipment ${s.shipment_no || s.container_no}`,
          subtitle: `${s.origin_port} → ${s.destination_port}`,
          time: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent',
          amount: s.cargo_value ? `₹${Number(s.cargo_value).toLocaleString('en-IN')}` : 'Cargo Transit',
          status: s.status === 'Delivered' ? 'Cleared' : 'Action Required',
          canApprove: s.status !== 'Delivered',
        });
      });
    }

    if (rimiOrderRes.data) {
      rimiOrderRes.data.forEach((o: any) => {
        activities.push({
          id: o.id,
          division: 'Rimi Frozen',
          divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          title: `Sales Order ${o.order_no || 'Ref #' + o.id?.slice(0, 6)}`,
          subtitle: o.distributor?.business_name || 'B2B Wholesale Order',
          time: o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent',
          amount: `₹${Number(o.total_amount || 0).toLocaleString('en-IN')}`,
          status: o.payment_status === 'Paid' ? 'Cleared' : 'Action Required',
          canApprove: o.payment_status !== 'Paid',
        });
      });
    }

    if (digInvRes.data) {
      digInvRes.data.forEach((i: any) => {
        activities.push({
          id: i.id,
          division: 'Digital Agency',
          divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          title: `Invoice ${i.invoice_no || 'INV-' + i.id?.slice(0, 6)}`,
          subtitle: i.client?.company_name || 'Client Project Milestone',
          time: i.created_at ? new Date(i.created_at).toLocaleDateString() : 'Recent',
          amount: `₹${Number(i.amount || 0).toLocaleString('en-IN')}`,
          status: i.status === 'Paid' ? 'Cleared' : 'Action Required',
          canApprove: i.status !== 'Paid',
        });
      });
    }

    return activities;
  } catch (e) {
    return [];
  }
}
