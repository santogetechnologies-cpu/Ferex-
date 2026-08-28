-- =============================================================================
-- Migration 005: Central Super Admin & Staff Portal Analytics Views & RPC
-- =============================================================================

-- View: Central Super Admin Unified Enterprise Metrics
CREATE OR REPLACE VIEW public.central_enterprise_overview AS
SELECT
  (SELECT COUNT(*) FROM public.users WHERE role = 'student') AS education_students_total,
  (SELECT COUNT(*) FROM public.applications) AS education_applications_total,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status IN ('Paid', 'Verified')) AS education_revenue_inr,
  (SELECT COUNT(*) FROM public.digital_clients WHERE status = 'Active') AS digital_active_clients,
  (SELECT COUNT(*) FROM public.digital_projects WHERE status = 'In Progress') AS digital_running_projects,
  (SELECT COALESCE(SUM(total_amount), 0) FROM public.digital_invoices WHERE status = 'Paid') AS digital_revenue_inr,
  (SELECT COUNT(*) FROM public.trade_shipments WHERE status = 'In Transit') AS trade_active_shipments,
  (SELECT COALESCE(SUM(amount), 0) FROM public.trade_invoices WHERE status = 'Paid') AS trade_revenue_eur,
  (SELECT COUNT(*) FROM public.rimi_sales_orders WHERE status != 'Cancelled') AS rimi_total_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM public.rimi_sales_orders WHERE status = 'Delivered & Paid') AS rimi_revenue_inr,
  (SELECT COUNT(*) FROM public.users WHERE role IN ('staff', 'counselor', 'admin')) AS staff_count_total;

-- RPC Function to safely fetch Central Portal Statistics for authorized Admins
CREATE OR REPLACE FUNCTION public.get_central_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT row_to_json(ceo)::jsonb INTO result FROM public.central_enterprise_overview ceo;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
