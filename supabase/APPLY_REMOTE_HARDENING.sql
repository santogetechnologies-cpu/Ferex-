-- =============================================================================
-- FEREX ZERO-TRUST PRODUCTION INFRASTRUCTURE & RLS HARDENING SCRIPT (FINAL PRODUCTION)
-- Standard: Zero-Trust / Zero-Bypass / Strict Ownership & Clean PostgreSQL DDL/DML
-- Safety: 100% IDEMPOTENT — ZERO DATA LOSS — NO DROP TABLE / TRUNCATE STATEMENTS
-- Target Database: Supabase PostgreSQL (FEREX Production Cloud)
-- =============================================================================

-- =============================================================================
-- PART 1: ENSURE REQUIRED ENTERPRISE TABLES EXIST SAFELY (IF NOT EXISTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  credit_note_no TEXT NOT NULL UNIQUE,
  original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.digital_projects(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  assigned_to TEXT DEFAULT 'Unassigned',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Todo',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_seo_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.digital_clients(id) ON DELETE SET NULL,
  target_domain TEXT NOT NULL,
  organic_traffic_monthly INTEGER DEFAULT 0,
  keywords_ranked_top10 INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 85,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no TEXT NOT NULL UNIQUE,
  container_no TEXT NOT NULL,
  carrier TEXT NOT NULL,
  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  cargo_description TEXT NOT NULL,
  cargo_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transport_mode TEXT NOT NULL DEFAULT 'Sea',
  eta DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Transit',
  customs_status TEXT NOT NULL DEFAULT 'Pending Clearance',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'Buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_no TEXT NOT NULL UNIQUE,
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  total_cartons INTEGER NOT NULL DEFAULT 0,
  gross_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_bills_of_lading (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bl_number TEXT NOT NULL UNIQUE,
  shipment_id UUID REFERENCES public.trade_shipments(id) ON DELETE CASCADE,
  vessel_name TEXT NOT NULL,
  voyage_no TEXT NOT NULL,
  shipper_details TEXT NOT NULL,
  consignee_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trade_letters_of_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_number TEXT NOT NULL UNIQUE,
  issuing_bank TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  lc_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rimi_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.rimi_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  invoice_ref TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  collected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 2: HARDENED SECURITY DEFINER FUNCTIONS & ROLE ESCALATION TRIGGER
-- =============================================================================

-- 1. Enterprise Administrator Check (admin, central, super_admin)
CREATE OR REPLACE FUNCTION public.is_enterprise_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text AND role IN ('admin', 'central', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Education Operations Staff or Admin Check (Daily counseling / document ops)
CREATE OR REPLACE FUNCTION public.is_education_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text AND role IN ('admin', 'staff', 'counselor', 'central', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Dedicated Portal Authorization Check
CREATE OR REPLACE FUNCTION public.has_portal_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text AND (role = required_role OR role IN ('admin', 'central', 'super_admin'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Role Escalation & Sensitive Column Protection Trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.role IS DISTINCT FROM OLD.role OR 
    NEW.permissions::text IS DISTINCT FROM OLD.permissions::text OR
    NEW.department IS DISTINCT FROM OLD.department OR
    NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor
  ) THEN
    IF NOT public.is_enterprise_admin() THEN
      RAISE EXCEPTION 'Access Denied: Non-admin users are strictly prohibited from changing roles, permissions, departments, or staff assignments.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- 5. Strict Student Document Access Helper
CREATE OR REPLACE FUNCTION public.can_access_student_document(object_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_education_staff_or_admin() THEN
    RETURN TRUE;
  END IF;

  -- Exact first folder segment matches authenticated user UUID
  IF (storage.foldername(object_name))[1] = auth.uid()::text THEN
    RETURN TRUE;
  END IF;

  -- Exact Legacy database record link for auth.uid()
  IF EXISTS (
    SELECT 1 FROM public.student_documents
    WHERE student_id::text = auth.uid()::text
      AND (file_url = object_name OR file_name = object_name OR file_url LIKE '%/' || object_name)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. Strict Receipt Access Helper
CREATE OR REPLACE FUNCTION public.can_access_receipt(object_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_education_staff_or_admin() THEN
    RETURN TRUE;
  END IF;

  IF (storage.foldername(object_name))[1] = auth.uid()::text THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE student_id::text = auth.uid()::text
      AND (receipt_url = object_name OR receipt_url LIKE '%/' || object_name)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7. Strict Offer Letter Access Helper
CREATE OR REPLACE FUNCTION public.can_access_offer_letter(object_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_education_staff_or_admin() THEN
    RETURN TRUE;
  END IF;

  IF (storage.foldername(object_name))[1] = auth.uid()::text THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.applications
    WHERE student_id::text = auth.uid()::text
      AND (offer_letter_url = object_name OR offer_letter_url LIKE '%/' || object_name)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Central Dashboard Aggregation RPC (With Revoked Public Execute)
CREATE OR REPLACE FUNCTION public.get_central_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_students INT := 0;
  total_apps INT := 0;
  total_ed_revenue NUMERIC := 0;
  total_digital_clients INT := 0;
  total_digital_projects INT := 0;
  total_digital_revenue NUMERIC := 0;
  total_shipments INT := 0;
  total_trade_revenue NUMERIC := 0;
  total_rimi_orders INT := 0;
  total_rimi_revenue NUMERIC := 0;
  total_staff INT := 0;
BEGIN
  -- Strict Authorization Check
  IF NOT (public.has_portal_role('central') OR public.is_enterprise_admin()) THEN
    RAISE EXCEPTION 'Access Denied: Enterprise Admin or Central Role required.';
  END IF;

  SELECT COUNT(*) INTO total_students FROM public.users WHERE role = 'student';
  SELECT COUNT(*) INTO total_apps FROM public.applications;
  SELECT COALESCE(SUM(amount), 0) INTO total_ed_revenue FROM public.payments WHERE status = 'Paid';
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'digital_clients') THEN
    SELECT COUNT(*) INTO total_digital_clients FROM public.digital_clients;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'digital_projects' AND tablename = 'digital_projects') THEN
    SELECT COUNT(*) INTO total_digital_projects FROM public.digital_projects;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'digital_invoices') THEN
    SELECT COALESCE(SUM(total_amount), 0) INTO total_digital_revenue FROM public.digital_invoices WHERE status = 'Paid';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trade_shipments') THEN
    SELECT COUNT(*) INTO total_shipments FROM public.trade_shipments;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trade_invoices') THEN
    SELECT COALESCE(SUM(total_amount), 0) INTO total_trade_revenue FROM public.trade_invoices WHERE status = 'Paid';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rimi_sales_orders') THEN
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO total_rimi_orders, total_rimi_revenue FROM public.rimi_sales_orders WHERE status = 'Delivered';
  END IF;
  SELECT COUNT(*) INTO total_staff FROM public.users WHERE role IN ('admin', 'staff', 'counselor', 'central', 'super_admin');

  result := jsonb_build_object(
    'educationStudents', total_students,
    'educationApplications', total_apps,
    'educationRevenueInr', total_ed_revenue,
    'digitalClients', total_digital_clients,
    'digitalProjects', total_digital_projects,
    'digitalRevenueInr', total_digital_revenue,
    'tradeShipments', total_shipments,
    'tradeRevenueUsd', total_trade_revenue,
    'rimiOrders', total_rimi_orders,
    'rimiRevenueInr', total_rimi_revenue,
    'staffCount', total_staff
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke public execution on sensitive central RPC
REVOKE EXECUTE ON FUNCTION public.get_central_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_central_dashboard_metrics() TO authenticated;

-- =============================================================================
-- PART 3: ENABLE RLS & CREATE HARDENED CRUD POLICIES ON EDUCATION TABLES
-- =============================================================================

-- 1. USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users select policy" ON public.users;
DROP POLICY IF EXISTS "Users update policy" ON public.users;
DROP POLICY IF EXISTS "Users insert policy" ON public.users;
DROP POLICY IF EXISTS "Users delete policy" ON public.users;

CREATE POLICY "Users select policy" ON public.users 
FOR SELECT USING (
  id::text = auth.uid()::text 
  OR public.is_enterprise_admin()
  OR (public.is_education_staff_or_admin() AND role = 'student')
);

CREATE POLICY "Users insert policy" ON public.users 
FOR INSERT WITH CHECK (
  public.is_enterprise_admin() 
  OR (id::text = auth.uid()::text AND (role = 'student' OR role IS NULL))
);

CREATE POLICY "Users update policy" ON public.users 
FOR UPDATE USING (
  id::text = auth.uid()::text OR public.is_enterprise_admin()
) WITH CHECK (
  id::text = auth.uid()::text OR public.is_enterprise_admin()
);

CREATE POLICY "Users delete policy" ON public.users 
FOR DELETE USING (public.is_enterprise_admin());

-- 2. UNIVERSITIES TABLE (Public Catalog Read)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Universities select policy" ON public.universities;
DROP POLICY IF EXISTS "Universities insert policy" ON public.universities;
DROP POLICY IF EXISTS "Universities update policy" ON public.universities;
DROP POLICY IF EXISTS "Universities delete policy" ON public.universities;

CREATE POLICY "Universities select policy" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Universities insert policy" ON public.universities FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Universities update policy" ON public.universities FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Universities delete policy" ON public.universities FOR DELETE USING (public.is_enterprise_admin());

-- 3. APPLICATIONS TABLE
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applications select policy" ON public.applications;
DROP POLICY IF EXISTS "Applications insert policy" ON public.applications;
DROP POLICY IF EXISTS "Applications update policy" ON public.applications;
DROP POLICY IF EXISTS "Applications delete policy" ON public.applications;

CREATE POLICY "Applications select policy" ON public.applications FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Applications insert policy" ON public.applications FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Applications update policy" ON public.applications FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Applications delete policy" ON public.applications FOR DELETE USING (public.is_education_staff_or_admin());

-- 4. APPLICATION CHECKLIST TABLE (Ownership derived from applications.student_id)
ALTER TABLE public.application_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Checklist select policy" ON public.application_checklist;
DROP POLICY IF EXISTS "Checklist insert policy" ON public.application_checklist;
DROP POLICY IF EXISTS "Checklist update policy" ON public.application_checklist;
DROP POLICY IF EXISTS "Checklist delete policy" ON public.application_checklist;

CREATE POLICY "Checklist select policy" ON public.application_checklist 
FOR SELECT USING (
  public.is_education_staff_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_checklist.application_id AND a.student_id::text = auth.uid()::text
  )
);

CREATE POLICY "Checklist insert policy" ON public.application_checklist 
FOR INSERT WITH CHECK (
  public.is_education_staff_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_checklist.application_id AND a.student_id::text = auth.uid()::text
  )
);

CREATE POLICY "Checklist update policy" ON public.application_checklist 
FOR UPDATE USING (
  public.is_education_staff_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_checklist.application_id AND a.student_id::text = auth.uid()::text
  )
) WITH CHECK (
  public.is_education_staff_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_checklist.application_id AND a.student_id::text = auth.uid()::text
  )
);

CREATE POLICY "Checklist delete policy" ON public.application_checklist 
FOR DELETE USING (public.is_education_staff_or_admin());

-- 5. OFFER LETTERS TABLE
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Offer letters select policy" ON public.offer_letters;
DROP POLICY IF EXISTS "Offer letters insert policy" ON public.offer_letters;
DROP POLICY IF EXISTS "Offer letters update policy" ON public.offer_letters;
DROP POLICY IF EXISTS "Offer letters delete policy" ON public.offer_letters;

CREATE POLICY "Offer letters select policy" ON public.offer_letters FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Offer letters insert policy" ON public.offer_letters FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Offer letters update policy" ON public.offer_letters FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Offer letters delete policy" ON public.offer_letters FOR DELETE USING (public.is_education_staff_or_admin());

-- 6. FINAL ACCEPTANCE TABLE
ALTER TABLE public.final_acceptance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Final acceptance select policy" ON public.final_acceptance;
DROP POLICY IF EXISTS "Final acceptance insert policy" ON public.final_acceptance;
DROP POLICY IF EXISTS "Final acceptance update policy" ON public.final_acceptance;
DROP POLICY IF EXISTS "Final acceptance delete policy" ON public.final_acceptance;

CREATE POLICY "Final acceptance select policy" ON public.final_acceptance FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Final acceptance insert policy" ON public.final_acceptance FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Final acceptance update policy" ON public.final_acceptance FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Final acceptance delete policy" ON public.final_acceptance FOR DELETE USING (public.is_education_staff_or_admin());

-- 7. STUDENT DOCUMENTS VAULT
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Documents select policy" ON public.student_documents;
DROP POLICY IF EXISTS "Documents insert policy" ON public.student_documents;
DROP POLICY IF EXISTS "Documents update policy" ON public.student_documents;
DROP POLICY IF EXISTS "Documents delete policy" ON public.student_documents;

CREATE POLICY "Documents select policy" ON public.student_documents FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Documents insert policy" ON public.student_documents FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Documents update policy" ON public.student_documents FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Documents delete policy" ON public.student_documents FOR DELETE USING (public.is_education_staff_or_admin());

-- 8. PAYMENTS TABLE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
DROP POLICY IF EXISTS "Payments update policy" ON public.payments;
DROP POLICY IF EXISTS "Payments delete policy" ON public.payments;

CREATE POLICY "Payments select policy" ON public.payments FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Payments insert policy" ON public.payments FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Payments update policy" ON public.payments FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Payments delete policy" ON public.payments FOR DELETE USING (public.is_education_staff_or_admin());

-- 9. INVOICES TABLE
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invoices select policy" ON public.invoices;
DROP POLICY IF EXISTS "Invoices insert policy" ON public.invoices;
DROP POLICY IF EXISTS "Invoices update policy" ON public.invoices;
DROP POLICY IF EXISTS "Invoices delete policy" ON public.invoices;

CREATE POLICY "Invoices select policy" ON public.invoices FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Invoices insert policy" ON public.invoices FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Invoices update policy" ON public.invoices FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Invoices delete policy" ON public.invoices FOR DELETE USING (public.is_education_staff_or_admin());

-- 10. RECEIPTS TABLE
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Receipts select policy" ON public.receipts;
DROP POLICY IF EXISTS "Receipts insert policy" ON public.receipts;
DROP POLICY IF EXISTS "Receipts update policy" ON public.receipts;
DROP POLICY IF EXISTS "Receipts delete policy" ON public.receipts;

CREATE POLICY "Receipts select policy" ON public.receipts FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Receipts insert policy" ON public.receipts FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Receipts update policy" ON public.receipts FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Receipts delete policy" ON public.receipts FOR DELETE USING (public.is_education_staff_or_admin());

-- 11. CREDIT NOTES TABLE (Ownership derived from payments.student_id)
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Credit notes select policy" ON public.credit_notes;
DROP POLICY IF EXISTS "Credit notes insert policy" ON public.credit_notes;
DROP POLICY IF EXISTS "Credit notes update policy" ON public.credit_notes;
DROP POLICY IF EXISTS "Credit notes delete policy" ON public.credit_notes;

CREATE POLICY "Credit notes select policy" ON public.credit_notes 
FOR SELECT USING (
  public.is_education_staff_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = credit_notes.payment_id AND p.student_id::text = auth.uid()::text
  )
);

CREATE POLICY "Credit notes insert policy" ON public.credit_notes 
FOR INSERT WITH CHECK (public.is_education_staff_or_admin());

CREATE POLICY "Credit notes update policy" ON public.credit_notes 
FOR UPDATE USING (public.is_education_staff_or_admin())
WITH CHECK (public.is_education_staff_or_admin());

CREATE POLICY "Credit notes delete policy" ON public.credit_notes 
FOR DELETE USING (public.is_education_staff_or_admin());

-- 12. MEETINGS TABLE
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Meetings select policy" ON public.meetings;
DROP POLICY IF EXISTS "Meetings insert policy" ON public.meetings;
DROP POLICY IF EXISTS "Meetings update policy" ON public.meetings;
DROP POLICY IF EXISTS "Meetings delete policy" ON public.meetings;

CREATE POLICY "Meetings select policy" ON public.meetings FOR SELECT USING (student_id::text = auth.uid()::text OR advisor_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Meetings insert policy" ON public.meetings FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR advisor_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Meetings update policy" ON public.meetings FOR UPDATE USING (student_id::text = auth.uid()::text OR advisor_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Meetings delete policy" ON public.meetings FOR DELETE USING (public.is_education_staff_or_admin());

-- 13. SUPPORT TICKETS & REPLIES
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tickets select policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets insert policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets update policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets delete policy" ON public.support_tickets;

CREATE POLICY "Tickets select policy" ON public.support_tickets FOR SELECT USING (student_id::text = auth.uid()::text OR assigned_to::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Tickets insert policy" ON public.support_tickets FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Tickets update policy" ON public.support_tickets FOR UPDATE USING (student_id::text = auth.uid()::text OR assigned_to::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Tickets delete policy" ON public.support_tickets FOR DELETE USING (public.is_education_staff_or_admin());

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Replies select policy" ON public.ticket_replies;
DROP POLICY IF EXISTS "Replies insert policy" ON public.ticket_replies;
DROP POLICY IF EXISTS "Replies delete policy" ON public.ticket_replies;

CREATE POLICY "Replies select policy" ON public.ticket_replies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_id AND (st.student_id::text = auth.uid()::text OR st.assigned_to::text = auth.uid()::text OR public.is_education_staff_or_admin())
  )
);
CREATE POLICY "Replies insert policy" ON public.ticket_replies FOR INSERT WITH CHECK (sender_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Replies delete policy" ON public.ticket_replies FOR DELETE USING (public.is_education_staff_or_admin());

-- 14. CHAT CONVERSATIONS & MESSAGES (Strict Type-Safe Array Cast)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Conversations select policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations insert policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations update policy" ON public.conversations;

CREATE POLICY "Conversations select policy" ON public.conversations 
FOR SELECT USING (auth.uid()::text = ANY(participant_ids::text[]) OR public.is_education_staff_or_admin());

CREATE POLICY "Conversations insert policy" ON public.conversations 
FOR INSERT WITH CHECK (auth.uid()::text = ANY(participant_ids::text[]) OR public.is_education_staff_or_admin());

CREATE POLICY "Conversations update policy" ON public.conversations 
FOR UPDATE USING (auth.uid()::text = ANY(participant_ids::text[]) OR public.is_education_staff_or_admin());

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages select policy" ON public.chat_messages;
DROP POLICY IF EXISTS "Messages insert policy" ON public.chat_messages;
DROP POLICY IF EXISTS "Messages delete policy" ON public.chat_messages;

CREATE POLICY "Messages select policy" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND (auth.uid()::text = ANY(c.participant_ids::text[]) OR public.is_education_staff_or_admin())
  )
);
CREATE POLICY "Messages insert policy" ON public.chat_messages FOR INSERT WITH CHECK (sender_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Messages delete policy" ON public.chat_messages FOR DELETE USING (public.is_education_staff_or_admin());

-- 15. NOTIFICATIONS TABLE
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete policy" ON public.notifications;

CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Notifications insert policy" ON public.notifications FOR INSERT WITH CHECK (public.is_education_staff_or_admin() OR user_id::text = auth.uid()::text);
CREATE POLICY "Notifications update policy" ON public.notifications FOR UPDATE USING (user_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Notifications delete policy" ON public.notifications FOR DELETE USING (user_id::text = auth.uid()::text OR public.is_education_staff_or_admin());

-- 16. JOURNEY STAGES TABLE
ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Journey select policy" ON public.journey_stages;
DROP POLICY IF EXISTS "Journey insert policy" ON public.journey_stages;
DROP POLICY IF EXISTS "Journey update policy" ON public.journey_stages;

CREATE POLICY "Journey select policy" ON public.journey_stages FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Journey insert policy" ON public.journey_stages FOR INSERT WITH CHECK (public.is_education_staff_or_admin() OR student_id::text = auth.uid()::text);
CREATE POLICY "Journey update policy" ON public.journey_stages FOR UPDATE USING (public.is_education_staff_or_admin() OR student_id::text = auth.uid()::text);

-- 17. VISA TRACKING TABLE
ALTER TABLE public.visa_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Visa select policy" ON public.visa_tracking;
DROP POLICY IF EXISTS "Visa insert policy" ON public.visa_tracking;
DROP POLICY IF EXISTS "Visa update policy" ON public.visa_tracking;

CREATE POLICY "Visa select policy" ON public.visa_tracking FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Visa insert policy" ON public.visa_tracking FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Visa update policy" ON public.visa_tracking FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());

-- 18. NAWA RECORDS TABLE
ALTER TABLE public.nawa_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nawa select policy" ON public.nawa_records;
DROP POLICY IF EXISTS "Nawa insert policy" ON public.nawa_records;
DROP POLICY IF EXISTS "Nawa update policy" ON public.nawa_records;

CREATE POLICY "Nawa select policy" ON public.nawa_records FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Nawa insert policy" ON public.nawa_records FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Nawa update policy" ON public.nawa_records FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());

-- 19. PRE DEPARTURE TABLE
ALTER TABLE public.pre_departure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PreDeparture select policy" ON public.pre_departure;
DROP POLICY IF EXISTS "PreDeparture insert policy" ON public.pre_departure;
DROP POLICY IF EXISTS "PreDeparture update policy" ON public.pre_departure;

CREATE POLICY "PreDeparture select policy" ON public.pre_departure FOR SELECT USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "PreDeparture insert policy" ON public.pre_departure FOR INSERT WITH CHECK (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "PreDeparture update policy" ON public.pre_departure FOR UPDATE USING (student_id::text = auth.uid()::text OR public.is_education_staff_or_admin());

-- 20. TASKS TABLE
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks select policy" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insert policy" ON public.tasks;
DROP POLICY IF EXISTS "Tasks update policy" ON public.tasks;
DROP POLICY IF EXISTS "Tasks delete policy" ON public.tasks;

CREATE POLICY "Tasks select policy" ON public.tasks FOR SELECT USING (student_id::text = auth.uid()::text OR created_by::text = auth.uid()::text OR public.is_education_staff_or_admin());
CREATE POLICY "Tasks insert policy" ON public.tasks FOR INSERT WITH CHECK (public.is_education_staff_or_admin());
CREATE POLICY "Tasks update policy" ON public.tasks FOR UPDATE USING (public.is_education_staff_or_admin());
CREATE POLICY "Tasks delete policy" ON public.tasks FOR DELETE USING (public.is_education_staff_or_admin());

-- 21. SYSTEM CONFIG TABLE (Authenticated Read Fee Configurations, Admin Write)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config select policy" ON public.system_config;
DROP POLICY IF EXISTS "Config manage policy" ON public.system_config;

CREATE POLICY "Config select policy" ON public.system_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Config manage policy" ON public.system_config FOR ALL USING (public.is_enterprise_admin()) WITH CHECK (public.is_enterprise_admin());

-- 22. ACTIVITY LOG TABLE (Audit Trail)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity log select" ON public.activity_log;
DROP POLICY IF EXISTS "Activity log insert" ON public.activity_log;
DROP POLICY IF EXISTS "Activity log manage" ON public.activity_log;

CREATE POLICY "Activity log select" ON public.activity_log FOR SELECT USING (public.is_education_staff_or_admin());
CREATE POLICY "Activity log insert" ON public.activity_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Activity log manage" ON public.activity_log FOR ALL USING (public.is_enterprise_admin()) WITH CHECK (public.is_enterprise_admin());

-- =============================================================================
-- PART 4: ENABLE RLS & CREATE POLICIES ON SECONDARY PORTAL TABLES
-- =============================================================================

-- DIGITAL AGENCY TABLES
ALTER TABLE public.digital_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital clients manage" ON public.digital_clients;
CREATE POLICY "Digital clients manage" ON public.digital_clients 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital leads manage" ON public.digital_leads;
CREATE POLICY "Digital leads manage" ON public.digital_leads 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital projects manage" ON public.digital_projects;
CREATE POLICY "Digital projects manage" ON public.digital_projects 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital tasks manage" ON public.digital_tasks;
CREATE POLICY "Digital tasks manage" ON public.digital_tasks 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital invoices manage" ON public.digital_invoices;
CREATE POLICY "Digital invoices manage" ON public.digital_invoices 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital expenses manage" ON public.digital_expenses;
CREATE POLICY "Digital expenses manage" ON public.digital_expenses 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital employees manage" ON public.digital_employees;
CREATE POLICY "Digital employees manage" ON public.digital_employees 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital attendance manage" ON public.digital_attendance;
CREATE POLICY "Digital attendance manage" ON public.digital_attendance 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

ALTER TABLE public.digital_seo_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Digital seo manage" ON public.digital_seo_projects;
CREATE POLICY "Digital seo manage" ON public.digital_seo_projects 
FOR ALL USING (public.has_portal_role('digital')) WITH CHECK (public.has_portal_role('digital'));

-- TRADE ERP TABLES
ALTER TABLE public.trade_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade shipments manage" ON public.trade_shipments;
CREATE POLICY "Trade shipments manage" ON public.trade_shipments 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_crm_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade contacts manage" ON public.trade_crm_contacts;
CREATE POLICY "Trade contacts manage" ON public.trade_crm_contacts 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade invoices manage" ON public.trade_invoices;
CREATE POLICY "Trade invoices manage" ON public.trade_invoices 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_packing_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade packing manage" ON public.trade_packing_lists;
CREATE POLICY "Trade packing manage" ON public.trade_packing_lists 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_bills_of_lading ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade bl manage" ON public.trade_bills_of_lading;
CREATE POLICY "Trade bl manage" ON public.trade_bills_of_lading 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_letters_of_credit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade lc manage" ON public.trade_letters_of_credit;
CREATE POLICY "Trade lc manage" ON public.trade_letters_of_credit 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

ALTER TABLE public.trade_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trade documents manage" ON public.trade_documents;
CREATE POLICY "Trade documents manage" ON public.trade_documents 
FOR ALL USING (public.has_portal_role('trade')) WITH CHECK (public.has_portal_role('trade'));

-- RIMI COLD CHAIN TABLES
ALTER TABLE public.rimi_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi products manage" ON public.rimi_products;
CREATE POLICY "Rimi products manage" ON public.rimi_products 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi warehouses manage" ON public.rimi_warehouses;
CREATE POLICY "Rimi warehouses manage" ON public.rimi_warehouses 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi batches manage" ON public.rimi_batches;
CREATE POLICY "Rimi batches manage" ON public.rimi_batches 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi customers manage" ON public.rimi_customers;
CREATE POLICY "Rimi customers manage" ON public.rimi_customers 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi orders manage" ON public.rimi_sales_orders;
CREATE POLICY "Rimi orders manage" ON public.rimi_sales_orders 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi deliveries manage" ON public.rimi_deliveries;
CREATE POLICY "Rimi deliveries manage" ON public.rimi_deliveries 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi vehicles manage" ON public.rimi_vehicles;
CREATE POLICY "Rimi vehicles manage" ON public.rimi_vehicles 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

ALTER TABLE public.rimi_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rimi collections manage" ON public.rimi_collections;
CREATE POLICY "Rimi collections manage" ON public.rimi_collections 
FOR ALL USING (public.has_portal_role('rimi')) WITH CHECK (public.has_portal_role('rimi'));

-- =============================================================================
-- PART 5: STORAGE BUCKETS CONFIGURATION & STRICT FOLDER OWNERSHIP POLICIES
-- =============================================================================

-- Ensure buckets exist and enforce privacy
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('student-documents', 'student-documents', false),
  ('offer-letters', 'offer-letters', false),
  ('receipts', 'receipts', false),
  ('trade-documents', 'trade-documents', false),
  ('digital-assets', 'digital-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop previous policies to avoid duplication
DROP POLICY IF EXISTS "Student Documents Read" ON storage.objects;
DROP POLICY IF EXISTS "Student Documents Insert" ON storage.objects;
DROP POLICY IF EXISTS "Student Documents Update" ON storage.objects;
DROP POLICY IF EXISTS "Student Documents Delete" ON storage.objects;

DROP POLICY IF EXISTS "Offer Letters Read" ON storage.objects;
DROP POLICY IF EXISTS "Offer Letters Insert" ON storage.objects;
DROP POLICY IF EXISTS "Offer Letters Update" ON storage.objects;
DROP POLICY IF EXISTS "Offer Letters Delete" ON storage.objects;

DROP POLICY IF EXISTS "Receipts Read" ON storage.objects;
DROP POLICY IF EXISTS "Receipts Insert" ON storage.objects;
DROP POLICY IF EXISTS "Receipts Update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts Delete" ON storage.objects;

DROP POLICY IF EXISTS "Trade Documents Manage" ON storage.objects;
DROP POLICY IF EXISTS "Digital Assets Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Digital Assets Manage" ON storage.objects;

-- 1. Student Documents Bucket: Strict Folder Ownership or Admin/Staff
CREATE POLICY "Student Documents Read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'student-documents' 
  AND public.can_access_student_document(name)
);

CREATE POLICY "Student Documents Insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'student-documents' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

-- Strict UPDATE: Object must remain inside own user folder before AND after update
CREATE POLICY "Student Documents Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'student-documents' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
) WITH CHECK (
  bucket_id = 'student-documents' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

CREATE POLICY "Student Documents Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'student-documents' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

-- 2. Offer Letters Bucket: Read Own, Admin/Staff Write
CREATE POLICY "Offer Letters Read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'offer-letters' 
  AND public.can_access_offer_letter(name)
);

CREATE POLICY "Offer Letters Insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'offer-letters' 
  AND public.is_education_staff_or_admin()
);

CREATE POLICY "Offer Letters Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'offer-letters' 
  AND public.is_education_staff_or_admin()
) WITH CHECK (
  bucket_id = 'offer-letters' 
  AND public.is_education_staff_or_admin()
);

CREATE POLICY "Offer Letters Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'offer-letters' 
  AND public.is_education_staff_or_admin()
);

-- 3. Receipts Bucket: Strict Folder Upload/Read Own, Admin/Staff Manage
CREATE POLICY "Receipts Read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts' 
  AND public.can_access_receipt(name)
);

CREATE POLICY "Receipts Insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

-- Strict UPDATE: Object must remain inside own user folder before AND after update
CREATE POLICY "Receipts Update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'receipts' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
) WITH CHECK (
  bucket_id = 'receipts' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

CREATE POLICY "Receipts Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts' 
  AND (
    public.is_education_staff_or_admin() 
    OR (
      auth.role() = 'authenticated' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

-- 4. Trade Documents Bucket (Private: Trade Role or Admin)
CREATE POLICY "Trade Documents Manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'trade-documents' 
  AND public.has_portal_role('trade')
) WITH CHECK (
  bucket_id = 'trade-documents' 
  AND public.has_portal_role('trade')
);

-- 5. Digital Assets Bucket (Public Read, Digital/Admin Manage)
CREATE POLICY "Digital Assets Public Read" ON storage.objects
FOR SELECT USING (bucket_id = 'digital-assets');

CREATE POLICY "Digital Assets Manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'digital-assets' 
  AND public.has_portal_role('digital')
) WITH CHECK (
  bucket_id = 'digital-assets' 
  AND public.has_portal_role('digital')
);

-- =============================================================================
-- PART 6: REALTIME PUBLICATION SYNCHRONIZATION
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  tables_to_add TEXT[] := ARRAY[
    'applications',
    'student_documents',
    'payments',
    'meetings',
    'notifications',
    'chat_messages',
    'support_tickets',
    'ticket_replies',
    'digital_projects',
    'trade_shipments',
    'rimi_sales_orders'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN
          NULL;
        WHEN undefined_object THEN
          NULL;
      END;
    END IF;
  END LOOP;
END $$;
