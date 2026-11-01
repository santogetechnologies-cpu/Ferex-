BEGIN;
-- Schema fields used by the operational forms; do not silently drop user-entered data.
ALTER TABLE public.digital_assets ADD COLUMN IF NOT EXISTS type text, ADD COLUMN IF NOT EXISTS provider text,
 ADD COLUMN IF NOT EXISTS cost_per_month_inr numeric DEFAULT 0, ADD COLUMN IF NOT EXISTS renewal_date date,
 ADD COLUMN IF NOT EXISTS assigned_to_project text, ADD COLUMN IF NOT EXISTS assigned_team_lead text, ADD COLUMN IF NOT EXISTS license_seats integer;
ALTER TABLE public.digital_assets DROP CONSTRAINT IF EXISTS digital_assets_status_check;
ALTER TABLE public.digital_assets ADD CONSTRAINT digital_assets_status_check CHECK(status IN ('Active','Pending','Renewing','Expired','Archived','Expiring Soon','Auto-Renewed','Suspended')) NOT VALID;
ALTER TABLE public.digital_notifications ADD COLUMN IF NOT EXISTS description text, ADD COLUMN IF NOT EXISTS category text,
 ADD COLUMN IF NOT EXISTS link text, ADD COLUMN IF NOT EXISTS recipient_id uuid, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP POLICY digital_read ON public.digital_notifications;
CREATE POLICY digital_read ON public.digital_notifications FOR SELECT TO authenticated USING(public.digital_is_team() AND (recipient_id IS NULL OR recipient_id=auth.uid()));
ALTER TABLE public.digital_meetings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.digital_projects(id);
ALTER TABLE public.digital_meetings ALTER COLUMN client_id DROP NOT NULL;
CREATE POLICY digital_meeting_host_read ON public.digital_meetings FOR SELECT TO authenticated USING(public.digital_is_team() AND (lower(host_staff_email)=lower(auth.jwt()->>'email') OR public.digital_project_access(project_id)));
ALTER TABLE public.digital_expenses ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR', ADD COLUMN IF NOT EXISTS vendor text,
 ADD COLUMN IF NOT EXISTS date date DEFAULT current_date, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.digital_expenses DROP CONSTRAINT IF EXISTS digital_expenses_status_check;
ALTER TABLE public.digital_expenses ADD CONSTRAINT digital_expenses_status_check CHECK(status IN ('Pending','Approved','Rejected','Paid')) NOT VALID;
ALTER TABLE public.digital_employees ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.digital_sprints ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Protect assignments and source metadata when assignees update task progress.
CREATE OR REPLACE FUNCTION public.digital_guard_task() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.digital_is_admin() AND pg_trigger_depth()=1 THEN
  IF NEW.central_task_id IS DISTINCT FROM OLD.central_task_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Task origin cannot be changed'; END IF;
  IF OLD.assigned_staff_id=auth.uid() AND NOT public.digital_project_access(OLD.project_id) AND
   (to_jsonb(NEW)-ARRAY['status','notes','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','notes','updated_at']) THEN RAISE EXCEPTION 'Assignees may update status and notes only'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_guard_task BEFORE UPDATE ON public.digital_tasks FOR EACH ROW EXECUTE FUNCTION public.digital_guard_task();

-- Shared tables retain their existing policies, with a restrictive fence for Digital and anonymous users.
DO $$ DECLARE t text; col text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('attendance_timesheets','employee_salaries','monthly_payrolls','shifts','leave_permission_requests','leave_policy_configs','email_logs','email_configurations','tasks','system_config') LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  IF t IN ('email_configurations') THEN
   EXECUTE format('CREATE POLICY digital_secret_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.ferex_role() IN (''central'',''superadmin'',''super_admin'')) WITH CHECK (public.ferex_role() IN (''central'',''superadmin'',''super_admin''))',t);
  ELSIF t='email_logs' THEN
   EXECUTE format('CREATE POLICY digital_scope_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_admin() AND division=''digital''))',t);
  ELSIF t='system_config' THEN
   EXECUTE format('CREATE POLICY digital_scope_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.digital_in_scope() OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR key=''ferex-digital-config-v1'') WITH CHECK (NOT public.digital_in_scope() OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_admin() AND key=''ferex-digital-config-v1''))',t);
  ELSIF t='tasks' THEN
   EXECUTE format('CREATE POLICY digital_scope_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((NOT public.digital_in_scope() AND lower(coalesce(category,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (lower(category)=''digital'' AND (public.digital_is_admin() OR assigned_staff_id=auth.uid()))) WITH CHECK ((NOT public.digital_in_scope() AND lower(coalesce(category,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (lower(category)=''digital'' AND public.digital_is_admin()))',t);
  ELSE
   SELECT CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='user_email') THEN 'user_email' ELSE NULL END INTO col;
   IF col IS NOT NULL THEN
    EXECUTE format('CREATE POLICY digital_scope_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (lower(division)=''digital'' AND (public.digital_is_admin() OR lower(user_email)=lower(auth.jwt()->>''email''))))',t);
   ELSE
    EXECUTE format('CREATE POLICY digital_scope_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_team() AND lower(division) IN (''digital'',''all'')))',t);
   END IF;
   EXECUTE format('CREATE POLICY digital_write_guard ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_admin() AND lower(division)=''digital''))',t);
   EXECUTE format('CREATE POLICY digital_update_guard ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_admin() AND lower(division)=''digital'')) WITH CHECK ((NOT public.digital_in_scope() AND lower(coalesce(division,''''))<>''digital'') OR public.ferex_role() IN (''central'',''superadmin'',''super_admin'') OR (public.digital_is_admin() AND lower(division)=''digital''))',t);
   EXECUTE format('CREATE POLICY digital_delete_guard ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.digital_in_scope() OR public.ferex_role() IN (''central'',''superadmin'',''super_admin''))',t);
  END IF;
 END LOOP;
END $$;

-- Database timestamps prevent fabricated hours and concurrent double clock-ins.
CREATE OR REPLACE FUNCTION public.ferex_clock_in(p_division text,p_shift uuid DEFAULT NULL) RETURNS public.attendance_timesheets
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u public.users; result public.attendance_timesheets;
BEGIN
 SELECT * INTO STRICT u FROM public.users WHERE id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(u.id::text,0));
 IF EXISTS(SELECT 1 FROM public.attendance_timesheets WHERE user_id=u.id AND clock_out IS NULL AND status IN ('active','Clocked In')) THEN RAISE EXCEPTION 'Already clocked in'; END IF;
 IF u.role IN ('student','digital_client','trade_client','rimi_client') THEN RAISE EXCEPTION 'Staff account required'; END IF;
 IF p_division NOT IN ('digital','education','trade','rimi') THEN RAISE EXCEPTION 'Invalid division'; END IF;
 IF public.digital_is_team() AND p_division<>'digital' AND u.role NOT IN ('central','superadmin','super_admin') THEN RAISE EXCEPTION 'Wrong division'; END IF;
 IF p_shift IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.shifts WHERE id=p_shift AND lower(division) IN (p_division,'all') AND is_active) THEN RAISE EXCEPTION 'Invalid shift'; END IF;
 INSERT INTO public.attendance_timesheets(id,user_id,user_email,user_name,user_role,division,shift_id,work_date,clock_in,total_hours,status)
 VALUES(gen_random_uuid(),u.id,u.email,u.full_name,u.role,p_division,p_shift,(now() AT TIME ZONE 'Asia/Kolkata')::date,now(),0,'active') RETURNING * INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.ferex_clock_out(p_id uuid,p_summary text) RETURNS public.attendance_timesheets
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.attendance_timesheets;
BEGIN
 IF length(trim(coalesce(p_summary,'')))=0 THEN RAISE EXCEPTION 'Work summary required'; END IF;
 SELECT * INTO STRICT result FROM public.attendance_timesheets WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF result.clock_out IS NOT NULL OR result.status NOT IN ('active','Clocked In') THEN RAISE EXCEPTION 'Timesheet is already closed'; END IF;
 UPDATE public.attendance_timesheets SET clock_out=now(),work_summary=p_summary,total_hours=round((extract(epoch FROM (now()-clock_in))/3600)::numeric,2),status='completed',updated_at=now() WHERE id=p_id RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ferex_clock_in(text,uuid),public.ferex_clock_out(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ferex_clock_in(text,uuid),public.ferex_clock_out(uuid,text) TO authenticated;

-- Atomic lead conversion. A retry returns the existing conversion rather than duplicating the project.
ALTER TABLE public.digital_clients ADD COLUMN IF NOT EXISTS converted_project_id uuid;
CREATE OR REPLACE FUNCTION public.digital_convert_lead(p_id uuid,p_project jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.digital_clients; p public.digital_projects;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 SELECT * INTO STRICT c FROM public.digital_clients WHERE id=p_id FOR UPDATE;
 IF c.converted_project_id IS NOT NULL THEN SELECT * INTO p FROM public.digital_projects WHERE id=c.converted_project_id; RETURN jsonb_build_object('client',to_jsonb(c),'project',to_jsonb(p)); END IF;
 IF p_project IS NOT NULL THEN
  IF coalesce(trim(p_project->>'title'),'')='' OR coalesce((p_project->>'budget')::numeric,0)<0 THEN RAISE EXCEPTION 'Valid project title and budget required'; END IF;
  INSERT INTO public.digital_projects(id,client_id,client_name,client_type,title,service_category,budget,scope,payment_terms,status,start_date,deadline,assigned_staff_name,payment_status,advance_amount,balance_amount,advance_paid,balance_paid,progress)
  VALUES(gen_random_uuid(),c.id,c.company_name,c.client_type,p_project->>'title',coalesce(p_project->>'service_category','Digital Services'),coalesce((p_project->>'budget')::numeric,0),p_project->>'scope',coalesce(p_project->>'payment_terms','Milestone-Based'),'Briefing',coalesce((p_project->>'start_date')::date,current_date),(p_project->>'deadline')::date,'','Pending',0,coalesce((p_project->>'budget')::numeric,0),0,0,0) RETURNING * INTO p;
 END IF;
 UPDATE public.digital_clients SET status='Active',lead_stage='Closed Won',converted_project_id=p.id,updated_at=now() WHERE id=c.id RETURNING * INTO c;
 RETURN jsonb_build_object('client',to_jsonb(c),'project',to_jsonb(p));
END $$;
REVOKE ALL ON FUNCTION public.digital_convert_lead(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_convert_lead(uuid,jsonb) TO authenticated;
COMMIT;
