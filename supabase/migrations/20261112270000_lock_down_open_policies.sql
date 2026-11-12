-- SECURITY: many tables had policies granting the public/anon role (anyone holding the web app's public key)
-- and every signed-in user full read/write/delete. That exposed all users, applications, documents, tickets,
-- settings and HR data, and let anyone edit or delete them. This replaces them with scoped access.
--   anon:     read universities/destinations/document requirements, two public settings, submit an enquiry
--   student:  own rows; education staff directory; configuration they need (fees, plans, workflows)
--   counselor/staff: education data; admins: everything in their division

CREATE OR REPLACE FUNCTION public.is_internal_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.role() = 'service_role'
      OR (auth.uid() IS NOT NULL
          AND coalesce(public.get_auth_user_role(), 'anon') NOT IN ('anon', 'student')
          AND coalesce(public.get_auth_user_role(), 'anon') NOT LIKE '%\_client')
$$;

CREATE OR REPLACE FUNCTION public.is_education_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.role() = 'service_role'
      OR coalesce(public.get_auth_user_role(), '') IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'counselor', 'staff')
$$;

-- ── users ───────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_all" ON public.users;
DROP POLICY IF EXISTS "users_anon_all" ON public.users;
DROP POLICY IF EXISTS "users_all_delete" ON public.users;
DROP POLICY IF EXISTS "users_all_insert" ON public.users;
DROP POLICY IF EXISTS "users_insert_service_or_self" ON public.users;
DROP POLICY IF EXISTS "users_all_select" ON public.users;
DROP POLICY IF EXISTS "users_read_all" ON public.users;
DROP POLICY IF EXISTS "users_all_update" ON public.users;
DROP POLICY IF EXISTS "ferex_users_read_guard" ON public.users;
CREATE POLICY "ferex_users_read_guard" ON public.users FOR SELECT TO authenticated USING (
  id = auth.uid()
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin')
  OR public.digital_is_admin()
  OR (public.digital_is_team() AND role <> 'student')
  OR (NOT public.digital_in_scope() AND (public.is_internal_staff() OR role IN ('counselor', 'staff', 'education_admin', 'education', 'admin')))
);

-- ── applications, documents, visa, nawa, notes ──────────────────────────────────────────────
DROP POLICY IF EXISTS "applications_all_delete" ON public.applications;
DROP POLICY IF EXISTS "applications_all_insert" ON public.applications;
DROP POLICY IF EXISTS "applications_all_select" ON public.applications;
DROP POLICY IF EXISTS "applications_all_update" ON public.applications;
DROP POLICY IF EXISTS "student_documents_all_delete" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_all_insert" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_all_select" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_all_update" ON public.student_documents;
DROP POLICY IF EXISTS "visa_applications_all_delete" ON public.visa_applications;
DROP POLICY IF EXISTS "visa_applications_all_insert" ON public.visa_applications;
DROP POLICY IF EXISTS "visa_applications_all_select" ON public.visa_applications;
DROP POLICY IF EXISTS "visa_applications_all_update" ON public.visa_applications;
DROP POLICY IF EXISTS "student_payments_all_delete" ON public.student_payments;
DROP POLICY IF EXISTS "student_payments_all_insert" ON public.student_payments;
DROP POLICY IF EXISTS "student_payments_all_select" ON public.student_payments;
DROP POLICY IF EXISTS "student_payments_all_update" ON public.student_payments;

DROP POLICY IF EXISTS "nawa_records_all_delete" ON public.nawa_records;
DROP POLICY IF EXISTS "nawa_records_all_insert" ON public.nawa_records;
DROP POLICY IF EXISTS "nawa_records_all_select" ON public.nawa_records;
DROP POLICY IF EXISTS "nawa_records_all_update" ON public.nawa_records;
CREATE POLICY "nawa_records_staff_all" ON public.nawa_records FOR ALL TO authenticated
  USING (public.is_education_staff()) WITH CHECK (public.is_education_staff());
CREATE POLICY "nawa_records_student_read" ON public.nawa_records FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "staff_notes_all_delete" ON public.staff_notes;
DROP POLICY IF EXISTS "staff_notes_all_insert" ON public.staff_notes;
DROP POLICY IF EXISTS "staff_notes_all_select" ON public.staff_notes;
DROP POLICY IF EXISTS "staff_notes_all_update" ON public.staff_notes;
CREATE POLICY "staff_notes_staff_all" ON public.staff_notes FOR ALL TO authenticated
  USING (public.is_education_staff()) WITH CHECK (public.is_education_staff());

-- ── universities & destinations: public read, admin write ───────────────────────────────────
DROP POLICY IF EXISTS "universities_all_delete" ON public.universities;
DROP POLICY IF EXISTS "universities_public_delete" ON public.universities;
DROP POLICY IF EXISTS "universities_all_insert" ON public.universities;
DROP POLICY IF EXISTS "universities_public_insert" ON public.universities;
DROP POLICY IF EXISTS "universities_all_select" ON public.universities;
DROP POLICY IF EXISTS "universities_all_update" ON public.universities;
DROP POLICY IF EXISTS "universities_public_update" ON public.universities;
CREATE POLICY "universities_admin_write" ON public.universities FOR ALL TO authenticated
  USING (public.education_lead_admin()) WITH CHECK (public.education_lead_admin());

DROP POLICY IF EXISTS "destinations_all_delete" ON public.destinations;
DROP POLICY IF EXISTS "destinations_public_delete" ON public.destinations;
DROP POLICY IF EXISTS "destinations_all_insert" ON public.destinations;
DROP POLICY IF EXISTS "destinations_public_insert" ON public.destinations;
DROP POLICY IF EXISTS "destinations_all_select" ON public.destinations;
DROP POLICY IF EXISTS "destinations_all_update" ON public.destinations;
DROP POLICY IF EXISTS "destinations_public_update" ON public.destinations;
CREATE POLICY "destinations_admin_write" ON public.destinations FOR ALL TO authenticated
  USING (public.education_lead_admin()) WITH CHECK (public.education_lead_admin());

-- ── support tickets ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "support_tickets_authenticated_access" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_all_delete" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_all_insert" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_all_select" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_all_update" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_anon_read" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_student_access" ON public.support_tickets;
CREATE POLICY "tickets_student_access" ON public.support_tickets FOR ALL TO authenticated
  USING (student_id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (student_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "ticket_msgs_all" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_all_delete" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_all_insert" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_all_select" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_all_update" ON public.ticket_messages;
CREATE POLICY "ticket_messages_staff_all" ON public.ticket_messages FOR ALL TO authenticated
  USING (public.is_internal_staff()) WITH CHECK (public.is_internal_staff());
CREATE POLICY "ticket_messages_owner_all" ON public.ticket_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.student_id = auth.uid() OR t.user_id = auth.uid())))
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.student_id = auth.uid() OR t.user_id = auth.uid())));

DROP POLICY IF EXISTS "ticket_replies_all" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies_all_delete" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies_all_insert" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies_all_select" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies_all_update" ON public.ticket_replies;
CREATE POLICY "ticket_replies_staff_all" ON public.ticket_replies FOR ALL TO authenticated
  USING (public.is_internal_staff()) WITH CHECK (public.is_internal_staff());
CREATE POLICY "ticket_replies_owner_all" ON public.ticket_replies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.student_id = auth.uid() OR t.user_id = auth.uid())))
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.student_id = auth.uid() OR t.user_id = auth.uid())));

-- ── tasks ───────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_anon_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_authenticated_all" ON public.tasks;
CREATE POLICY "tasks_internal_staff_all" ON public.tasks FOR ALL TO authenticated
  USING (public.is_internal_staff()) WITH CHECK (public.is_internal_staff());
CREATE POLICY "tasks_student_read" ON public.tasks FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ── settings: never expose messaging credentials; anon sees only two public keys; admins write ─
DROP POLICY IF EXISTS "system_config_all_delete" ON public.system_config;
DROP POLICY IF EXISTS "system_config_all_insert" ON public.system_config;
DROP POLICY IF EXISTS "system_config_all_select" ON public.system_config;
DROP POLICY IF EXISTS "system_config_all_update" ON public.system_config;
DROP POLICY IF EXISTS "system_config_auth_read" ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_write" ON public.system_config;
CREATE POLICY "system_config_read" ON public.system_config FOR SELECT TO authenticated USING (
  (key <> 'email_config' AND (key NOT LIKE 'agreement\_%' OR key = 'agreement_' || auth.uid()::text OR public.is_education_staff()))
  OR public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin')
  OR auth.role() = 'service_role');
CREATE POLICY "system_config_public_read" ON public.system_config FOR SELECT TO anon
  USING (key IN ('fee_config', 'ferex_system_customization_config'));
CREATE POLICY "system_config_admin_write" ON public.system_config FOR ALL TO authenticated
  USING (public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin') OR auth.role() = 'service_role')
  WITH CHECK (public.ferex_role() IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education', 'digital_admin', 'trade_admin', 'rimi_admin') OR auth.role() = 'service_role');

-- ── HR tables: not for the public, students or client accounts ──────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance_timesheets', 'employee_salaries', 'leave_permission_requests', 'leave_policy_configs', 'monthly_payrolls', 'shifts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_internal_staff', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_internal_staff()) WITH CHECK (public.is_internal_staff())', t || '_internal_staff', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "shifts_update_all" ON public.shifts;

-- ── leftover per-browser data that was mirrored into settings (deleted students, test keys, old copies) ─
DELETE FROM public.system_config WHERE key IN (
  'ferex_deleted_student_ids', 'test_key', 'ferex_shared_catalog', 'ferex_tasks_catalog', 'ferex_payments_catalog',
  'ferex_applications_catalog', 'ferex_destinations_catalog', 'ferex_universities_catalog',
  'ferex_legalization_catalog', 'ferex_meetings_catalog', 'ferex_visa_records_catalog', 'ferex_predeparture_catalog'
) OR key LIKE 'agreement\_%';
DELETE FROM public.system_config WHERE key = 'ferex_documents_catalog';

-- Anonymous visitors (anyone holding the public key) only need to read the public catalog and submit an enquiry.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT SELECT ON public.universities, public.destinations, public.document_requirements, public.system_config TO anon;
GRANT INSERT ON public.education_leads, public.education_lead_activities TO anon;
-- TRUNCATE/TRIGGER/REFERENCES bypass row-level security and are never needed by app users.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;
