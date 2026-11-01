BEGIN;
CREATE OR REPLACE FUNCTION public.digital_commercial_consistency() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE contract jsonb;
BEGIN
 IF NEW.budget IS DISTINCT FROM OLD.budget OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.country IS DISTINCT FROM OLD.country THEN
  SELECT body INTO contract FROM public.digital_contracts WHERE project_id=NEW.id;
  IF contract IS NOT NULL AND (NEW.budget IS DISTINCT FROM (contract->>'subtotal')::numeric OR NEW.currency IS DISTINCT FROM contract->>'currency' OR NEW.country IS DISTINCT FROM contract->>'country') THEN
   RAISE EXCEPTION 'Change commercial values through Centralised Billing to preserve invoice and ledger consistency';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_commercial_consistency BEFORE UPDATE ON public.digital_projects FOR EACH ROW EXECUTE FUNCTION public.digital_commercial_consistency();
CREATE OR REPLACE FUNCTION public.digital_leave_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u public.users;
BEGIN
 IF auth.uid() IS NOT NULL AND public.digital_in_scope() THEN
  SELECT * INTO STRICT u FROM public.users WHERE id=NEW.user_id;
  NEW.user_email:=u.email;NEW.user_role:=u.role;NEW.user_name:=u.full_name;
  NEW.is_admin_request:=u.role IN ('digital','digital_admin','ferex_digital','central','superadmin','super_admin');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_leave_identity BEFORE INSERT ON public.leave_permission_requests FOR EACH ROW EXECUTE FUNCTION public.digital_leave_identity();
CREATE OR REPLACE FUNCTION public.digital_timesheet_verification_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF public.digital_in_scope() AND auth.uid() IS NOT NULL AND NEW.is_admin_verified IS DISTINCT FROM OLD.is_admin_verified AND NEW.is_admin_verified THEN
  IF OLD.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot verify your own timesheet'; END IF;
  IF OLD.user_role IN ('digital','digital_admin','ferex_digital') AND public.ferex_role() NOT IN ('central','superadmin','super_admin') THEN RAISE EXCEPTION 'Admin timesheets require Central verification'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_timesheet_verification_guard BEFORE UPDATE ON public.attendance_timesheets FOR EACH ROW EXECUTE FUNCTION public.digital_timesheet_verification_guard();
COMMIT;
