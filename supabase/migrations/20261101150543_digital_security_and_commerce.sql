-- Apply in staging first. Removes anonymous access and makes financial writes atomic.
BEGIN;
CREATE OR REPLACE FUNCTION public.ferex_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT lower(role) FROM public.users WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.digital_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(public.ferex_role() IN ('digital','digital_admin','ferex_digital','central','superadmin','super_admin'),false) $$;
CREATE OR REPLACE FUNCTION public.digital_is_team() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(public.digital_is_admin() OR public.ferex_role() IN ('digital_manager','project_manager','pm','digimanager','digital_staff','designer','developer'),false) $$;
CREATE OR REPLACE FUNCTION public.digital_in_scope() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT public.digital_is_team() OR coalesce(public.ferex_role()='digital_client',false) $$;
CREATE OR REPLACE FUNCTION public.digital_project_access(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.digital_is_admin() OR EXISTS (SELECT 1 FROM public.digital_projects p WHERE p.id=p_id AND p.assigned_staff_id=auth.uid()) $$;

-- Public registration can never choose an administrator role.
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'student';
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.users(id,email,full_name,role,created_at,updated_at)
 VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'full_name','User'),
 coalesce(nullif(NEW.raw_app_meta_data->>'role',''),'student'),now(),now()) ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.ferex_guard_user_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND coalesce(auth.role(),'') <> 'service_role'
 AND coalesce(public.ferex_role(),'') NOT IN ('central','superadmin','super_admin') THEN
   IF TG_OP='INSERT' AND NEW.role <> 'student' THEN RAISE EXCEPTION 'Only central administrators can assign roles'; END IF;
   IF TG_OP='UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email) THEN
     RAISE EXCEPTION 'Account identity and role require a trusted administrator';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ferex_guard_user_role ON public.users;
CREATE TRIGGER ferex_guard_user_role BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.ferex_guard_user_role();
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY ferex_users_read_guard ON public.users AS RESTRICTIVE FOR SELECT USING (id=auth.uid() OR (auth.uid() IS NOT NULL AND NOT public.digital_in_scope()) OR public.ferex_role() IN ('central','superadmin','super_admin'));
CREATE POLICY ferex_users_write_guard ON public.users AS RESTRICTIVE FOR UPDATE USING (id=auth.uid() OR public.ferex_role() IN ('central','superadmin','super_admin')) WITH CHECK (id=auth.uid() OR public.ferex_role() IN ('central','superadmin','super_admin'));
CREATE POLICY ferex_users_insert_guard ON public.users AS RESTRICTIVE FOR INSERT WITH CHECK (id=auth.uid() OR public.ferex_role() IN ('central','superadmin','super_admin') OR auth.role()='service_role');
CREATE POLICY ferex_users_delete_guard ON public.users AS RESTRICTIVE FOR DELETE USING (public.ferex_role() IN ('central','superadmin','super_admin'));

ALTER TABLE public.digital_projects ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR', ADD COLUMN IF NOT EXISTS country text,
 ADD COLUMN IF NOT EXISTS payment_split_type text, ADD COLUMN IF NOT EXISTS advance_percentage numeric,
 ADD COLUMN IF NOT EXISTS deliverables jsonb DEFAULT '[]', ADD COLUMN IF NOT EXISTS stage_history jsonb DEFAULT '[]',
 ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.digital_clients ADD COLUMN IF NOT EXISTS country text, ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
 ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false, ADD COLUMN IF NOT EXISTS updated_by text,
 ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'External', ADD COLUMN IF NOT EXISTS estimated_budget numeric DEFAULT 0,
 ADD COLUMN IF NOT EXISTS notes text, ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]', ADD COLUMN IF NOT EXISTS lead_stage text,
 ADD COLUMN IF NOT EXISTS lead_source text, ADD COLUMN IF NOT EXISTS website text, ADD COLUMN IF NOT EXISTS priority text,
 ADD COLUMN IF NOT EXISTS created_by text, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.digital_tasks ADD COLUMN IF NOT EXISTS central_task_id uuid,
 ADD COLUMN IF NOT EXISTS created_by text, ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'Task',
 ADD COLUMN IF NOT EXISTS assigned_staff_id uuid, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS digital_tasks_central_source ON public.digital_tasks(central_task_id) WHERE central_task_id IS NOT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.digital_projects(id);

-- Supersede every open Digital policy, including authenticated/anon policies from prior migrations.
DO $$ DECLARE t text; pol record; has_project boolean; has_assignee boolean;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'digital\_%' ESCAPE '\' LOOP
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='project_id') INTO has_project;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='assigned_staff_id') INTO has_assignee;
  IF t='digital_projects' THEN
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_project_access(id))',t);
  ELSIF t='digital_clients' THEN
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_is_admin() OR EXISTS (SELECT 1 FROM public.digital_projects p WHERE p.client_id=digital_clients.id AND p.assigned_staff_id=auth.uid()))',t);
  ELSIF t='digital_tasks' THEN
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_is_admin() OR assigned_staff_id=auth.uid() OR public.digital_project_access(project_id))',t);
   EXECUTE format('CREATE POLICY digital_team_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.digital_is_team() AND (public.digital_project_access(project_id) OR (project_id IS NULL AND assigned_staff_id=auth.uid())))',t);
   EXECUTE format('CREATE POLICY digital_team_update ON public.%I FOR UPDATE TO authenticated USING (public.digital_is_team() AND (assigned_staff_id=auth.uid() OR public.digital_project_access(project_id))) WITH CHECK (public.digital_is_team() AND (assigned_staff_id=auth.uid() OR public.digital_project_access(project_id)))',t);
  ELSIF t IN ('digital_sprints','digital_milestones','digital_deliverables','digital_tickets') AND has_project THEN
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_project_access(project_id))',t);
   EXECUTE format('CREATE POLICY digital_team_write ON public.%I FOR ALL TO authenticated USING (public.digital_is_team() AND public.digital_project_access(project_id)) WITH CHECK (public.digital_is_team() AND public.digital_project_access(project_id))',t);
  ELSIF t='digital_notifications' THEN
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_is_team())',t);
  ELSE
   EXECUTE format('CREATE POLICY digital_read ON public.%I FOR SELECT TO authenticated USING (public.digital_is_admin())',t);
  END IF;
  EXECUTE format('CREATE POLICY digital_admin_write ON public.%I FOR ALL TO authenticated USING (public.digital_is_admin()) WITH CHECK (public.digital_is_admin())',t);
 END LOOP;
END $$;

-- Limit manager edits of projects to operational fields; commercial and assignment changes remain admin-only.
CREATE OR REPLACE FUNCTION public.digital_guard_project() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.digital_is_admin() AND auth.role()<>'service_role' AND
 (to_jsonb(NEW)-ARRAY['status','progress','stage_history','deliverables','updated_at']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['status','progress','stage_history','deliverables','updated_at']) THEN RAISE EXCEPTION 'Commercial and assignment changes require Digital admin'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS digital_guard_project ON public.digital_projects;
CREATE TRIGGER digital_guard_project BEFORE UPDATE ON public.digital_projects FOR EACH ROW EXECUTE FUNCTION public.digital_guard_project();
CREATE POLICY digital_project_team_update ON public.digital_projects FOR UPDATE TO authenticated USING (public.digital_is_team() AND public.digital_project_access(id)) WITH CHECK (public.digital_is_team() AND public.digital_project_access(id));

CREATE OR REPLACE FUNCTION public.digital_add_deliverable(p_project uuid,p_deliverable jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.digital_is_team() OR NOT public.digital_project_access(p_project) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF coalesce(p_deliverable->>'url','') !~ '^https?://' THEN RAISE EXCEPTION 'Invalid asset URL'; END IF;
 UPDATE public.digital_projects SET deliverables=coalesce(deliverables,'[]'::jsonb)||jsonb_build_array(p_deliverable),updated_at=now() WHERE id=p_project;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 RETURN p_deliverable;
END $$;
CREATE OR REPLACE FUNCTION public.digital_remove_deliverable(p_project uuid,p_deliverable text) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 UPDATE public.digital_projects SET deliverables=coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(deliverables) x WHERE x->>'id'<>p_deliverable),'[]'::jsonb),updated_at=now() WHERE id=p_project;
END $$;

-- Central directives have one canonical row and a transactional Digital projection.
CREATE OR REPLACE FUNCTION public.digital_sync_central_task() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN DELETE FROM public.digital_tasks WHERE central_task_id=OLD.id; RETURN OLD; END IF;
 IF lower(coalesce(NEW.category,''))='digital' THEN
 INSERT INTO public.digital_tasks(id,central_task_id,project_id,title,notes,status,priority,due_date,assigned_staff_id,assigned_to_name,created_by,task_type)
 VALUES(NEW.id,NEW.id,NEW.project_id,NEW.title,NEW.description,CASE WHEN NEW.status IN ('Completed','Done') THEN 'Done' WHEN NEW.status='In Progress' THEN 'In Progress' ELSE 'To Do' END,NEW.priority,nullif(NEW.due_date::text,'')::date,NEW.assigned_staff_id,NEW.assigned_to,'Central Admin','Central Directive')
 ON CONFLICT(id) DO UPDATE SET central_task_id=EXCLUDED.central_task_id,project_id=EXCLUDED.project_id,title=EXCLUDED.title,notes=EXCLUDED.notes,status=EXCLUDED.status,assigned_staff_id=EXCLUDED.assigned_staff_id,assigned_to_name=EXCLUDED.assigned_to_name,priority=EXCLUDED.priority,due_date=EXCLUDED.due_date,updated_at=now();
 ELSIF TG_OP='UPDATE' THEN DELETE FROM public.digital_tasks WHERE central_task_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS digital_sync_central_task ON public.tasks;
CREATE TRIGGER digital_sync_central_task AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.digital_sync_central_task();
CREATE OR REPLACE FUNCTION public.digital_sync_task_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth()=1 AND NEW.central_task_id IS NOT NULL THEN
 UPDATE public.tasks SET status=CASE WHEN NEW.status='Done' THEN 'Completed' WHEN NEW.status='In Progress' THEN 'In Progress' ELSE 'Pending' END,updated_at=now() WHERE id=NEW.central_task_id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS digital_sync_task_status ON public.digital_tasks;
CREATE TRIGGER digital_sync_task_status AFTER UPDATE OF status ON public.digital_tasks FOR EACH ROW EXECUTE FUNCTION public.digital_sync_task_status();
UPDATE public.digital_tasks d SET central_task_id=t.id,created_by='Central Admin',task_type='Central Directive' FROM public.tasks t WHERE d.id=t.id AND lower(t.category)='digital';

CREATE TABLE public.digital_commerce_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),config jsonb NOT NULL DEFAULT '{}',updated_at timestamptz DEFAULT now());
INSERT INTO public.digital_commerce_settings(id) VALUES(true);
CREATE TABLE public.digital_contracts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.digital_projects(id),
 revision integer NOT NULL DEFAULT 1, body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id)
);
CREATE TABLE public.digital_financial_documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES public.digital_contracts(id),
 number text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('Proposal','Invoice','Receipt','Credit Note')),
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.digital_collections(
 id uuid PRIMARY KEY,contract_id uuid NOT NULL REFERENCES public.digital_contracts(id), part_id text NOT NULL,
 amount numeric NOT NULL CHECK(amount>0), reference text, method text NOT NULL, payment_date date NOT NULL,
 actor uuid NOT NULL DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX digital_collection_reference ON public.digital_collections(lower(btrim(reference))) WHERE nullif(btrim(reference),'') IS NOT NULL;
CREATE TABLE public.digital_mail_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES public.digital_financial_documents(id),
 recipient text NOT NULL, status text NOT NULL DEFAULT 'Queued' CHECK(status IN ('Queued','Sending','Sent','Failed')),
 provider_id text,error text,attempts integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,recipient)
);
CREATE TABLE public.digital_notification_reads(user_id uuid NOT NULL DEFAULT auth.uid(),notification_id text NOT NULL,PRIMARY KEY(user_id,notification_id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['digital_commerce_settings','digital_contracts','digital_financial_documents','digital_collections','digital_mail_outbox'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY commerce_admin_read ON public.%I FOR SELECT TO authenticated USING (public.digital_is_admin())',t);
 END LOOP;
END $$;
GRANT UPDATE ON public.digital_commerce_settings TO authenticated;
CREATE POLICY commerce_settings_write ON public.digital_commerce_settings FOR UPDATE TO authenticated USING(public.digital_is_admin()) WITH CHECK(public.digital_is_admin());
ALTER TABLE public.digital_notification_reads ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.digital_notification_reads TO authenticated;
CREATE POLICY notification_own ON public.digital_notification_reads FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.digital_mark_notification_read(p_id text) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 INSERT INTO public.digital_notification_reads(notification_id) SELECT id::text FROM public.digital_notifications WHERE p_id IS NULL OR id::text=p_id ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.digital_currency_digits(code text) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN code IN ('JPY','KRW','VND','CLP','XAF','XOF','XPF','RWF','UGX','BIF','DJF','GNF','KMF','PYG','VUV','ISK') THEN 0 WHEN code IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND') THEN 3 WHEN code IN ('CLF','UYW') THEN 4 ELSE 2 END
$$;

CREATE OR REPLACE FUNCTION public.digital_save_contract(p_id uuid,p_revision integer,p_body jsonb) RETURNS public.digital_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.digital_contracts; line jsonb; part jsonb; subtotal numeric:=0; tax numeric:=0; pct numeric:=0; digits integer; total numeric; allocated numeric:=0; part_amount numeric; lines jsonb:='[]'; parts jsonb:='[]'; i integer:=0; ids text[]:='{}'; part_ids text[]:='{}'; rate numeric; base numeric;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 SELECT * INTO c FROM public.digital_contracts WHERE id=p_id FOR UPDATE;
 IF FOUND AND c.revision<>p_revision THEN RAISE EXCEPTION 'Billing changed in another session. Refresh before saving'; END IF;
 IF c.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.digital_financial_documents WHERE contract_id=c.id) THEN RAISE EXCEPTION 'Issued contracts are locked. Create a separately scoped project for an amendment'; END IF;
 IF coalesce(p_body->>'currency','') !~ '^[A-Z]{3}$' OR coalesce(p_body->>'country','') !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Country and currency codes are required'; END IF;
 IF coalesce(p_body->>'client_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Client email is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.digital_projects WHERE id=(p_body->>'project_id')::uuid AND NOT coalesce(is_deleted,false)) THEN RAISE EXCEPTION 'Active project required'; END IF;
 digits:=public.digital_currency_digits(p_body->>'currency');
 IF jsonb_array_length(coalesce(p_body->'lines','[]'))=0 THEN RAISE EXCEPTION 'Add at least one service'; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(p_body->'lines') LOOP
  IF coalesce(line->>'title','')='' OR coalesce(line->>'id','')='' OR line->>'id'=ANY(ids) THEN RAISE EXCEPTION 'Service titles and unique IDs are required'; END IF;
  ids:=array_append(ids,line->>'id'); base:=round((line->>'amount')::numeric,digits); rate:=(line->>'tax_rate')::numeric;
  IF base IS NULL OR base<0 OR base::text IN ('NaN','Infinity','-Infinity') OR rate IS NULL OR rate<0 OR rate>100 OR rate::text='NaN' THEN RAISE EXCEPTION 'Invalid service amount or tax'; END IF;
  subtotal:=subtotal+base; tax:=tax+round(base*rate/100,digits);
  lines:=lines||jsonb_build_array(line||jsonb_build_object('amount',base,'tax_amount',round(base*rate/100,digits)));
 END LOOP;
 total:=subtotal+tax;
 IF total<=0 THEN RAISE EXCEPTION 'Contract total must be positive'; END IF;
 IF jsonb_array_length(coalesce(p_body->'parts','[]'))=0 THEN RAISE EXCEPTION 'Add payment terms'; END IF;
 FOR part IN SELECT * FROM jsonb_array_elements(p_body->'parts') LOOP
  i:=i+1;
  IF coalesce(part->>'label','')='' OR coalesce(part->>'id','')='' OR part->>'id'=ANY(part_ids) THEN RAISE EXCEPTION 'Payment terms require labels and unique IDs'; END IF;
  part_ids:=array_append(part_ids,part->>'id');
  IF (part->>'percentage')::numeric<=0 OR (part->>'percentage')::numeric>100 OR part->>'percentage' IS NULL THEN RAISE EXCEPTION 'Invalid payment percentage'; END IF;
  IF jsonb_array_length(coalesce(part->'service_ids','[]'))=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(part->'service_ids') x WHERE NOT x=ANY(ids)) THEN RAISE EXCEPTION 'Link each term to valid services'; END IF;
  PERFORM (part->>'due_date')::date; IF nullif(part->>'due_date','') IS NULL THEN RAISE EXCEPTION 'Payment due date required'; END IF;
  pct:=pct+(part->>'percentage')::numeric;
  part_amount:=CASE WHEN i=jsonb_array_length(p_body->'parts') THEN total-allocated ELSE round(total*(part->>'percentage')::numeric/100,digits) END;
  IF part_amount<=0 THEN RAISE EXCEPTION 'Each term must have a positive amount'; END IF;
  allocated:=allocated+part_amount;
  parts:=parts||jsonb_build_array(part||jsonb_build_object('amount',part_amount,'received',0));
 END LOOP;
 IF pct<>100 THEN RAISE EXCEPTION 'Payment percentages must total 100'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(parts) p WHERE p->'service_ids' ? x)) THEN RAISE EXCEPTION 'Every service must be linked to a payment term'; END IF;
 p_body:=p_body||jsonb_build_object('lines',lines,'parts',parts,'subtotal',subtotal,'tax',tax,'total',total,'currency_digits',digits);
 IF c.id IS NULL THEN
  INSERT INTO public.digital_contracts(project_id,body) VALUES((p_body->>'project_id')::uuid,p_body) RETURNING * INTO c;
 ELSE
  UPDATE public.digital_contracts SET body=p_body,revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO c;
 END IF;
 UPDATE public.digital_projects SET currency=p_body->>'currency',country=p_body->>'country',budget=subtotal WHERE id=c.project_id;
 RETURN c;
END $$;

CREATE SEQUENCE public.digital_document_number;
-- Allocate a term or partial collection across its linked services, retaining each tax rate.
CREATE OR REPLACE FUNCTION public.digital_document_values(p_body jsonb,p_part text,p_amount numeric) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE scope jsonb;part jsonb;line jsonb;result jsonb:='[]';weight numeric;gross numeric;net numeric;tax numeric;used numeric:=0;net_total numeric:=0;tax_total numeric:=0;i integer:=0;digits integer;
BEGIN
 digits:=public.digital_currency_digits(p_body->>'currency');
 SELECT x INTO part FROM jsonb_array_elements(p_body->'parts') x WHERE x->>'id'=p_part;
 SELECT jsonb_agg(x) INTO scope FROM jsonb_array_elements(p_body->'lines') x WHERE p_part IS NULL OR part->'service_ids' ? (x->>'id');
 SELECT sum((x->>'amount')::numeric+coalesce((x->>'tax_amount')::numeric,0)) INTO weight FROM jsonb_array_elements(scope) x;
 IF coalesce(weight,0)<=0 THEN RAISE EXCEPTION 'Payment term must link to services with positive value'; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(scope) LOOP
  i:=i+1;
  gross:=CASE WHEN i=jsonb_array_length(scope) THEN p_amount-used ELSE round(p_amount*((line->>'amount')::numeric+coalesce((line->>'tax_amount')::numeric,0))/weight,digits) END;
  net:=round(gross/(1+(line->>'tax_rate')::numeric/100),digits);tax:=gross-net;used:=used+gross;net_total:=net_total+net;tax_total:=tax_total+tax;
  result:=result||jsonb_build_array(line||jsonb_build_object('amount',net,'tax_amount',tax,'gross',gross));
 END LOOP;
 RETURN jsonb_build_object('document_lines',result,'document_subtotal',net_total,'document_tax',tax_total);
END $$;
CREATE OR REPLACE FUNCTION public.digital_issue_document(p_contract uuid,p_kind text,p_part text DEFAULT NULL) RETURNS public.digital_financial_documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.digital_contracts; d public.digital_financial_documents; part jsonb; n text;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 IF p_kind NOT IN ('Proposal','Invoice') THEN RAISE EXCEPTION 'Invalid document type'; END IF;
 SELECT * INTO STRICT c FROM public.digital_contracts WHERE id=p_contract FOR UPDATE;
 IF p_kind='Invoice' THEN
  SELECT x INTO part FROM jsonb_array_elements(c.body->'parts') x WHERE x->>'id'=p_part;
  IF part IS NULL THEN RAISE EXCEPTION 'Select a payment term'; END IF;
 END IF;
 SELECT * INTO d FROM public.digital_financial_documents WHERE contract_id=p_contract AND kind=p_kind AND coalesce(body->>'part_id','')=coalesce(p_part,'') AND (p_kind='Invoice' OR body->>'contract_revision'=c.revision::text);
 IF FOUND THEN RETURN d; END IF;
 n:=CASE WHEN p_kind='Proposal' THEN 'PROP' ELSE 'INV' END||'-DIG-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.digital_document_number')::text,7,'0');
 INSERT INTO public.digital_financial_documents(contract_id,number,kind,body) VALUES(c.id,n,p_kind,c.body||public.digital_document_values(c.body,p_part,coalesce((part->>'amount')::numeric,(c.body->>'total')::numeric))||jsonb_build_object('contract_revision',c.revision,'part_id',p_part,'part',part,'amount',coalesce((part->>'amount')::numeric,(c.body->>'total')::numeric))) RETURNING * INTO d;
 INSERT INTO public.digital_mail_outbox(document_id,recipient) VALUES(d.id,c.body->>'client_email');
 RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.digital_collect_payment(p_contract uuid,p_part text,p_amount numeric,p_method text,p_reference text,p_date date,p_key uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.digital_contracts; part jsonb; parts jsonb; received numeric; n text; d public.digital_financial_documents; digits integer; settled numeric;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 SELECT * INTO STRICT c FROM public.digital_contracts WHERE id=p_contract FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.digital_collections WHERE id=p_key) THEN
  IF NOT EXISTS(SELECT 1 FROM public.digital_collections WHERE id=p_key AND contract_id=p_contract AND part_id=p_part AND amount=p_amount AND method=p_method AND coalesce(reference,'')=coalesce(p_reference,'') AND payment_date=p_date) THEN RAISE EXCEPTION 'Payment key already used with different details'; END IF;
  RETURN jsonb_build_object('duplicate',true);
 END IF;
 digits:=public.digital_currency_digits(c.body->>'currency');
 IF p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<>round(p_amount,digits) THEN RAISE EXCEPTION 'Invalid payment amount or currency precision'; END IF;
 IF nullif(trim(p_method),'') IS NULL OR p_date IS NULL OR p_date>current_date THEN RAISE EXCEPTION 'Payment method and non-future date required'; END IF;
 SELECT x INTO part FROM jsonb_array_elements(c.body->'parts') x WHERE x->>'id'=p_part;
 IF part IS NULL THEN RAISE EXCEPTION 'Payment term not found'; END IF;
 received:=coalesce((part->>'received')::numeric,0)+p_amount;
 IF received>(part->>'amount')::numeric THEN RAISE EXCEPTION 'Payment exceeds the selected term balance'; END IF;
 PERFORM public.digital_issue_document(c.id,'Invoice',p_part);
 INSERT INTO public.digital_collections(id,contract_id,part_id,amount,method,reference,payment_date) VALUES(p_key,c.id,p_part,p_amount,p_method,nullif(trim(p_reference),''),p_date);
 SELECT jsonb_agg(CASE WHEN x->>'id'=p_part THEN x||jsonb_build_object('received',received) ELSE x END ORDER BY ord) INTO parts FROM jsonb_array_elements(c.body->'parts') WITH ORDINALITY a(x,ord);
 UPDATE public.digital_contracts SET body=jsonb_set(body,'{parts}',parts),revision=revision+1,updated_at=now() WHERE id=c.id;
 SELECT sum((x->>'received')::numeric) INTO settled FROM jsonb_array_elements(parts) x;
 UPDATE public.digital_projects SET payment_status=CASE WHEN settled>=(c.body->>'total')::numeric THEN 'Paid' ELSE 'Partially Paid' END,advance_paid=coalesce((parts->0->>'received')::numeric,0),balance_paid=settled-coalesce((parts->0->>'received')::numeric,0) WHERE id=c.project_id;
 n:='REC-DIG-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.digital_document_number')::text,7,'0');
 INSERT INTO public.digital_financial_documents(contract_id,number,kind,body) VALUES(c.id,n,'Receipt',c.body||public.digital_document_values(c.body,p_part,p_amount)||jsonb_build_object('amount',p_amount,'part_id',p_part,'part',part,'reference',p_reference,'method',p_method,'payment_date',p_date,'balance',((part->>'amount')::numeric-received),'collection_id',p_key)) RETURNING * INTO d;
 INSERT INTO public.digital_mail_outbox(document_id,recipient) VALUES(d.id,c.body->>'client_email');
 RETURN jsonb_build_object('receipt',to_jsonb(d));
END $$;

-- Only authenticated callers may invoke privileged RPCs; each verifies server-side role.
REVOKE ALL ON FUNCTION public.digital_save_contract(uuid,integer,jsonb),public.digital_issue_document(uuid,text,text),public.digital_collect_payment(uuid,text,numeric,text,text,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_save_contract(uuid,integer,jsonb),public.digital_issue_document(uuid,text,text),public.digital_collect_payment(uuid,text,numeric,text,text,date,uuid) TO authenticated;
COMMIT;
