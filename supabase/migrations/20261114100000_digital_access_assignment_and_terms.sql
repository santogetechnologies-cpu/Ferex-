-- Digital: closes the "allow everyone" policies that undid the role-based security, makes staff assignment always resolve to
-- a real login (so project managers actually see what is assigned to them), and adds the pieces the milestone billing needs.

-- 1. Remove the leftover policies that let anyone, including people who are not signed in, read and change Digital data.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'digital\_%' AND policyname LIKE 'permit\_all\_%' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;
DO $$
DECLARE t record;
BEGIN
  -- Digital data is never meant for signed-out visitors.
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'digital\_%' LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tablename);
  END LOOP;
END $$;

-- 2. Who may be assigned Digital work.
CREATE OR REPLACE FUNCTION public.digital_staff_eligible(p_role text, p_dept text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(p_role, '') IN ('digital_admin', 'digital', 'ferex_digital', 'digital_director', 'project_manager', 'digital_manager', 'pm',
      'digimanager', 'account_manager', 'accountmanager', 'digital_account_manager', 'account_executive', 'client_manager', 'digital_staff',
      'designer', 'developer', 'lead_developer', 'creative', 'central', 'superadmin', 'super_admin', 'admin')
    OR lower(coalesce(p_dept, '')) LIKE '%digital%';
$$;

-- Fills the assignee's id, name and email from their real account, so the three always agree. A name that matches no
-- registered Digital login is refused instead of silently leaving the work unassigned.
CREATE OR REPLACE FUNCTION public.digital_fill_assignee() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; v_id uuid; v_email text; v_changed boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'digital_projects' THEN
    v_id := NEW.assigned_staff_id; v_email := nullif(trim(coalesce(NEW.assigned_staff_email, '')), '');
    v_changed := TG_OP = 'INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id OR NEW.assigned_staff_email IS DISTINCT FROM OLD.assigned_staff_email;
  ELSE
    v_id := NEW.assigned_staff_id; v_email := nullif(trim(coalesce(NEW.assigned_to_email, '')), '');
    v_changed := TG_OP = 'INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id OR NEW.assigned_to_email IS DISTINCT FROM OLD.assigned_to_email;
  END IF;
  IF NOT v_changed THEN RETURN NEW; END IF;
  IF v_id IS NULL AND v_email IS NULL THEN RETURN NEW; END IF; -- unassigned

  IF v_id IS NOT NULL THEN SELECT * INTO u FROM public.users WHERE id = v_id;
  ELSE SELECT * INTO u FROM public.users WHERE lower(email) = lower(v_email) LIMIT 1; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'That person has no login account. Create their Digital staff login first, then assign the work.'; END IF;
  IF NOT public.digital_staff_eligible(u.role, u.department) OR coalesce(u.status, 'active') IN ('inactive', 'deleted', 'suspended') THEN
    RAISE EXCEPTION '% cannot be assigned Digital work (their account is not an active Digital team member).', coalesce(nullif(u.full_name, ''), u.email);
  END IF;

  IF TG_TABLE_NAME = 'digital_projects' THEN
    NEW.assigned_staff_id := u.id; NEW.assigned_staff_name := coalesce(nullif(u.full_name, ''), split_part(u.email, '@', 1));
    NEW.assigned_staff_email := u.email; NEW.lead_developer := NEW.assigned_staff_name;
  ELSE
    NEW.assigned_staff_id := u.id; NEW.assigned_to_name := coalesce(nullif(u.full_name, ''), split_part(u.email, '@', 1));
    NEW.assigned_to_email := u.email;
    IF TG_TABLE_NAME = 'digital_tasks' THEN NEW.assigned_to := u.id; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_digital_fill_assignee ON public.digital_projects;
CREATE TRIGGER trg_digital_fill_assignee BEFORE INSERT OR UPDATE ON public.digital_projects FOR EACH ROW EXECUTE FUNCTION public.digital_fill_assignee();
DROP TRIGGER IF EXISTS trg_digital_fill_assignee ON public.digital_tasks;
CREATE TRIGGER trg_digital_fill_assignee BEFORE INSERT OR UPDATE ON public.digital_tasks FOR EACH ROW EXECUTE FUNCTION public.digital_fill_assignee();
DROP TRIGGER IF EXISTS trg_digital_fill_assignee ON public.digital_tickets;
CREATE TRIGGER trg_digital_fill_assignee BEFORE INSERT OR UPDATE ON public.digital_tickets FOR EACH ROW EXECUTE FUNCTION public.digital_fill_assignee();

-- The person a project is assigned to is told about it.
CREATE OR REPLACE FUNCTION public.digital_project_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_staff_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id) THEN
    INSERT INTO public.digital_notifications(title, message, type, category, link, recipient_id)
    VALUES ('Project assigned to you', NEW.title, 'Projects', 'Projects', '/digital/projects', NEW.assigned_staff_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_digital_project_notification ON public.digital_projects;
CREATE TRIGGER trg_digital_project_notification AFTER INSERT OR UPDATE OF assigned_staff_id ON public.digital_projects FOR EACH ROW EXECUTE FUNCTION public.digital_project_notification();

-- 3. Delivery milestones can be tied to a payment term, so an approved milestone tells the admin an invoice is due.
ALTER TABLE public.digital_milestones ADD COLUMN IF NOT EXISTS part_id text;
CREATE OR REPLACE FUNCTION public.digital_milestone_billing_notice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.part_id IS NOT NULL AND NEW.status IN ('Approved', 'Completed') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.digital_notifications(title, message, type, category, link)
    VALUES ('Milestone approved: payment term due', coalesce(NEW.project_title, '') || ' · ' || NEW.title || ' is complete. Raise the invoice for its payment term.', 'Billing', 'Billing', '/digital/billing');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_digital_milestone_billing_notice ON public.digital_milestones;
CREATE TRIGGER trg_digital_milestone_billing_notice AFTER INSERT OR UPDATE OF status ON public.digital_milestones FOR EACH ROW EXECUTE FUNCTION public.digital_milestone_billing_notice();

-- 4. A payment term can be renamed or rescheduled after the contract is issued (no money moves).
CREATE OR REPLACE FUNCTION public.digital_update_term(p_contract uuid, p_revision integer, p_part text, p_label text, p_due date, p_reason text)
RETURNS public.digital_contracts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.digital_contracts; parts jsonb;
BEGIN
  IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
  SELECT * INTO c FROM public.digital_contracts WHERE id = p_contract FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF c.revision <> p_revision THEN RAISE EXCEPTION 'Billing changed in another session. Refresh before editing'; END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Enter the reason for the change'; END IF;
  IF length(trim(coalesce(p_label, ''))) = 0 OR p_due IS NULL THEN RAISE EXCEPTION 'A term needs a name and a due date'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(c.body->'parts') x WHERE x->>'id' = p_part) THEN RAISE EXCEPTION 'Payment term not found'; END IF;
  SELECT jsonb_agg(CASE WHEN x->>'id' = p_part THEN x || jsonb_build_object('label', trim(p_label), 'due_date', p_due) ELSE x END ORDER BY ord)
    INTO parts FROM jsonb_array_elements(c.body->'parts') WITH ORDINALITY a(x, ord);
  INSERT INTO public.digital_contract_amendments(contract_id, previous_revision, reason, added_scope)
    VALUES (c.id, c.revision, p_reason, jsonb_build_object('term_change', jsonb_build_object('part', p_part, 'label', trim(p_label), 'due_date', p_due)));
  UPDATE public.digital_contracts SET body = jsonb_set(body, '{parts}', parts), revision = revision + 1, updated_at = now() WHERE id = c.id RETURNING * INTO c;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.digital_update_term(uuid, integer, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.digital_update_term(uuid, integer, text, text, date, text) TO authenticated;

-- 5. Projects with money collected are never hard-deleted; deleting archives the project and hides it.
CREATE OR REPLACE FUNCTION public.digital_delete_project(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE received numeric := 0;
BEGIN
  IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
  SELECT coalesce(sum((x->>'received')::numeric), 0) INTO received
    FROM public.digital_contracts c, jsonb_array_elements(c.body->'parts') x WHERE c.project_id = p_id;
  IF received > 0 THEN RAISE EXCEPTION 'This project has payments recorded. Refund them first, then delete the project.'; END IF;
  UPDATE public.digital_projects SET is_deleted = true, updated_at = now() WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  DELETE FROM public.digital_tasks WHERE project_id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.digital_delete_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.digital_delete_project(uuid) TO authenticated;

-- 6. One client per company name, and live sync for the commerce tables.
CREATE UNIQUE INDEX IF NOT EXISTS digital_clients_company_unique ON public.digital_clients (lower(company_name)) WHERE NOT coalesce(is_deleted, false);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['digital_contracts', 'digital_collections', 'digital_financial_documents', 'digital_refunds', 'digital_milestones', 'digital_deliverables', 'digital_mail_outbox'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
