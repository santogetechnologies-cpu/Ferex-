BEGIN;
ALTER TABLE public.digital_projects DROP CONSTRAINT IF EXISTS digital_projects_service_category_check;
ALTER TABLE public.digital_projects DROP CONSTRAINT IF EXISTS digital_projects_status_check;
ALTER TABLE public.digital_projects DROP CONSTRAINT IF EXISTS digital_projects_payment_terms_check;
ALTER TABLE public.digital_projects ALTER COLUMN budget TYPE numeric USING budget::numeric;
ALTER TABLE public.digital_projects ALTER COLUMN advance_amount TYPE numeric USING advance_amount::numeric;
ALTER TABLE public.digital_projects ALTER COLUMN balance_amount TYPE numeric USING balance_amount::numeric;
ALTER TABLE public.digital_projects ALTER COLUMN advance_paid TYPE numeric USING advance_paid::numeric;
ALTER TABLE public.digital_projects ALTER COLUMN balance_paid TYPE numeric USING balance_paid::numeric;
ALTER TABLE public.digital_projects ADD CONSTRAINT digital_project_valid CHECK(budget>=0 AND progress BETWEEN 0 AND 100 AND length(trim(title))>0) NOT VALID;

-- Staff can file their own requests; approval remains with a different administrator.
DROP POLICY digital_write_guard ON public.leave_permission_requests;
CREATE POLICY digital_write_guard ON public.leave_permission_requests AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK(NOT public.digital_in_scope() OR public.ferex_role() IN ('central','superadmin','super_admin') OR (public.digital_is_team() AND user_id=auth.uid() AND lower(division)='digital' AND status='pending'));
CREATE OR REPLACE FUNCTION public.digital_guard_leave_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF public.digital_in_scope() AND auth.uid() IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF OLD.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot approve your own leave request'; END IF;
  IF coalesce(OLD.is_admin_request,false) AND public.ferex_role() NOT IN ('central','superadmin','super_admin') THEN RAISE EXCEPTION 'Admin leave requires central approval'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_guard_leave_review BEFORE UPDATE ON public.leave_permission_requests FOR EACH ROW EXECUTE FUNCTION public.digital_guard_leave_review();

CREATE OR REPLACE FUNCTION public.digital_task_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.assigned_staff_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id) THEN
  INSERT INTO public.digital_notifications(title,message,type,category,link,recipient_id) VALUES('Task assigned',NEW.title,'Tasks','Tasks','/digital/pm/tasks',NEW.assigned_staff_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_task_notification AFTER INSERT OR UPDATE OF assigned_staff_id ON public.digital_tasks FOR EACH ROW EXECUTE FUNCTION public.digital_task_notification();
COMMIT;
