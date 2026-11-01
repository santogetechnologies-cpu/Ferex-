BEGIN;
CREATE OR REPLACE FUNCTION public.digital_staff_directory() RETURNS TABLE(id uuid,name text,email text,role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT u.id,u.full_name,u.email,u.role FROM public.users u WHERE public.digital_is_team() AND u.role IN ('digital_admin','digital','ferex_digital','project_manager','digital_manager','pm','digimanager','digital_staff','designer','developer') ORDER BY u.full_name
$$;
REVOKE ALL ON FUNCTION public.digital_staff_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_staff_directory() TO authenticated;
CREATE TABLE public.digital_client_users(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,client_id uuid NOT NULL REFERENCES public.digital_clients(id));
ALTER TABLE public.digital_client_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.digital_client_users TO authenticated;
CREATE POLICY digital_client_mapping ON public.digital_client_users FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.digital_is_admin());
CREATE POLICY digital_own_client ON public.digital_clients FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.digital_client_users m WHERE m.user_id=auth.uid() AND m.client_id=digital_clients.id));
CREATE POLICY digital_own_projects ON public.digital_projects FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.digital_client_users m WHERE m.user_id=auth.uid() AND m.client_id=digital_projects.client_id));
CREATE POLICY digital_own_documents ON public.digital_financial_documents FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.digital_contracts c JOIN public.digital_projects p ON p.id=c.project_id JOIN public.digital_client_users m ON m.client_id=p.client_id WHERE c.id=contract_id AND m.user_id=auth.uid()));
CREATE POLICY digital_own_contracts ON public.digital_contracts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.digital_projects p JOIN public.digital_client_users m ON m.client_id=p.client_id WHERE p.id=project_id AND m.user_id=auth.uid()));

CREATE TABLE public.digital_refunds(id uuid PRIMARY KEY,collection_id uuid NOT NULL REFERENCES public.digital_collections(id),contract_id uuid NOT NULL REFERENCES public.digital_contracts(id),amount numeric NOT NULL CHECK(amount>0),reason text NOT NULL,actor uuid NOT NULL DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.digital_refunds ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.digital_refunds TO authenticated;
CREATE POLICY digital_refund_admin ON public.digital_refunds FOR SELECT TO authenticated USING(public.digital_is_admin());
CREATE OR REPLACE FUNCTION public.digital_refund_payment(p_collection uuid,p_amount numeric,p_reason text,p_key uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.digital_collections;c public.digital_contracts; refunded numeric;parts jsonb;d public.digital_financial_documents;n text;part jsonb;settled numeric;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 SELECT * INTO STRICT t FROM public.digital_collections WHERE id=p_collection;
 SELECT * INTO STRICT c FROM public.digital_contracts WHERE id=t.contract_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.digital_refunds WHERE id=p_key) THEN
  IF NOT EXISTS(SELECT 1 FROM public.digital_refunds WHERE id=p_key AND collection_id=p_collection AND amount=p_amount AND reason=p_reason) THEN RAISE EXCEPTION 'Refund key already used'; END IF;
  RETURN jsonb_build_object('duplicate',true);
 END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<>round(p_amount,public.digital_currency_digits(c.body->>'currency')) OR length(trim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'Valid refund amount and reason required'; END IF;
 SELECT coalesce(sum(amount),0) INTO refunded FROM public.digital_refunds WHERE collection_id=p_collection;
 IF p_amount>t.amount-refunded THEN RAISE EXCEPTION 'Refund exceeds unrefunded payment'; END IF;
 INSERT INTO public.digital_refunds(id,collection_id,contract_id,amount,reason) VALUES(p_key,p_collection,c.id,p_amount,p_reason);
 SELECT x INTO part FROM jsonb_array_elements(c.body->'parts') x WHERE x->>'id'=t.part_id;
 SELECT jsonb_agg(CASE WHEN x->>'id'=t.part_id THEN x||jsonb_build_object('received',(x->>'received')::numeric-p_amount) ELSE x END ORDER BY ord) INTO parts FROM jsonb_array_elements(c.body->'parts') WITH ORDINALITY a(x,ord);
 UPDATE public.digital_contracts SET body=jsonb_set(body,'{parts}',parts),revision=revision+1,updated_at=now() WHERE id=c.id;
 SELECT sum((x->>'received')::numeric) INTO settled FROM jsonb_array_elements(parts) x;
 UPDATE public.digital_projects SET payment_status=CASE WHEN settled<=0 THEN 'Pending' WHEN settled>=(c.body->>'total')::numeric THEN 'Paid' ELSE 'Partially Paid' END,advance_paid=coalesce((parts->0->>'received')::numeric,0),balance_paid=settled-coalesce((parts->0->>'received')::numeric,0) WHERE id=c.project_id;
 n:='CN-DIG-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.digital_document_number')::text,7,'0');
 INSERT INTO public.digital_financial_documents(contract_id,number,kind,body) VALUES(c.id,n,'Credit Note',c.body||public.digital_document_values(c.body,t.part_id,p_amount)||jsonb_build_object('amount',p_amount,'part_id',t.part_id,'part',part,'collection_id',t.id,'notes',p_reason)) RETURNING * INTO d;
 INSERT INTO public.digital_mail_outbox(document_id,recipient) VALUES(d.id,c.body->>'client_email');
 RETURN to_jsonb(d);
END $$;
REVOKE ALL ON FUNCTION public.digital_refund_payment(uuid,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_refund_payment(uuid,numeric,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.digital_guard_timesheet() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF coalesce(OLD.is_superadmin_locked,false) AND coalesce(public.ferex_role(),'') NOT IN ('central','superadmin','super_admin') AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Locked timesheets require central administrator'; END IF;
 IF NEW.is_superadmin_locked IS DISTINCT FROM OLD.is_superadmin_locked AND coalesce(public.ferex_role(),'') NOT IN ('central','superadmin','super_admin') AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Only central administrator can lock timesheets'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER digital_guard_timesheet BEFORE UPDATE ON public.attendance_timesheets FOR EACH ROW EXECUTE FUNCTION public.digital_guard_timesheet();
COMMIT;
