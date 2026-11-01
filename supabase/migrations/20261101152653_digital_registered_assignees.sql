BEGIN;
CREATE OR REPLACE FUNCTION public.digital_staff_directory() RETURNS TABLE(id uuid,name text,email text,role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT u.id,u.full_name,u.email,u.role FROM public.users u JOIN auth.users a ON a.id=u.id
 WHERE public.digital_is_team() AND u.role IN ('digital_admin','digital','ferex_digital','project_manager','digital_manager','pm','digimanager','digital_staff','designer','developer') ORDER BY u.full_name
$$;
REVOKE ALL ON FUNCTION public.digital_staff_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_staff_directory() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.digital_validate_central_assignee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF lower(coalesce(NEW.category,''))='digital' AND
 (TG_OP='INSERT' OR NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.category IS DISTINCT FROM OLD.category) THEN
  IF NEW.assigned_staff_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.users u JOIN auth.users a ON a.id=u.id WHERE u.id=NEW.assigned_staff_id AND u.role IN ('digital_admin','digital','ferex_digital','project_manager','digital_manager','pm','digimanager','digital_staff','designer','developer')) THEN RAISE EXCEPTION 'Choose a Digital assignee with a registered login account'; END IF;
  IF NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.digital_projects WHERE id=NEW.project_id AND NOT coalesce(is_deleted,false)) THEN RAISE EXCEPTION 'Choose an active Digital project'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_validate_central_assignee BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.digital_validate_central_assignee();
REVOKE EXECUTE ON FUNCTION public.digital_validate_central_assignee() FROM PUBLIC,anon,authenticated;
COMMIT;
