-- Only the Trade Admin reassigns tasks, and a task that reached Delivered (Completed) stays there for logistics staff.
CREATE OR REPLACE FUNCTION public.guard_trade_task_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := coalesce(public.ferex_role(), '');
BEGIN
  IF auth.uid() IS NULL OR r IN ('trade', 'trade_admin', 'global_trade', 'admin', 'education_admin', 'central', 'superadmin', 'super_admin') THEN RETURN NEW; END IF;
  IF NEW.assigned_staff_name IS DISTINCT FROM OLD.assigned_staff_name OR NEW.assigned_staff_email IS DISTINCT FROM OLD.assigned_staff_email OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
    RAISE EXCEPTION 'Only the Trade Admin can reassign tasks.';
  END IF;
  IF OLD.status = 'Completed' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'A delivered task stays delivered. Ask the Trade Admin to reopen it.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_trade_task_changes() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_trade_task_changes ON public.trade_tasks;
CREATE TRIGGER trg_guard_trade_task_changes BEFORE UPDATE ON public.trade_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_trade_task_changes();
