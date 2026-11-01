BEGIN;
CREATE OR REPLACE FUNCTION public.digital_guard_task_origin() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.digital_is_admin() AND pg_trigger_depth()=1 THEN
  IF TG_OP='INSERT' THEN
   IF NEW.central_task_id IS NOT NULL THEN RAISE EXCEPTION 'Only central administrators can create a Central directive'; END IF;
   NEW.created_by:=auth.uid()::text;
  END IF;
 END IF;
 IF NEW.assigned_staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.digital_staff_directory() s WHERE s.id=NEW.assigned_staff_id) AND pg_trigger_depth()=1 THEN RAISE EXCEPTION 'Choose a registered Digital assignee'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_guard_task_origin BEFORE INSERT OR UPDATE ON public.digital_tasks FOR EACH ROW EXECUTE FUNCTION public.digital_guard_task_origin();

CREATE OR REPLACE FUNCTION public.digital_guard_deliverable_approval() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.digital_is_admin() THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.deliverables,'[]')) n WHERE n->>'status'='Approved' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(OLD.deliverables,'[]')) o WHERE o=n)) THEN RAISE EXCEPTION 'Deliverable approval requires Digital admin'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(OLD.deliverables,'[]')) o WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.deliverables,'[]')) n WHERE n->>'id'=o->>'id')) THEN RAISE EXCEPTION 'Deliverable removal requires Digital admin'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_guard_deliverable_approval BEFORE UPDATE OF deliverables ON public.digital_projects FOR EACH ROW EXECUTE FUNCTION public.digital_guard_deliverable_approval();
CREATE OR REPLACE FUNCTION public.digital_review_deliverable(p_project uuid,p_deliverable text,p_status text) RETURNS jsonb
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 IF p_status NOT IN ('Submitted','Approved','Draft') THEN RAISE EXCEPTION 'Invalid deliverable status'; END IF;
 UPDATE public.digital_projects SET deliverables=(SELECT jsonb_agg(CASE WHEN x->>'id'=p_deliverable THEN x||jsonb_build_object('status',p_status) ELSE x END ORDER BY ord) FROM jsonb_array_elements(deliverables) WITH ORDINALITY a(x,ord)),updated_at=now()
 WHERE id=p_project AND EXISTS(SELECT 1 FROM jsonb_array_elements(deliverables) x WHERE x->>'id'=p_deliverable) RETURNING deliverables INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'Deliverable not found'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.digital_review_deliverable(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_review_deliverable(uuid,text,text) TO authenticated;
COMMIT;
