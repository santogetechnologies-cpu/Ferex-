BEGIN;
CREATE TABLE public.digital_contract_amendments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contract_id uuid NOT NULL REFERENCES public.digital_contracts(id),previous_revision integer NOT NULL,reason text NOT NULL,added_scope jsonb NOT NULL,actor uuid NOT NULL DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.digital_contract_amendments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.digital_contract_amendments TO authenticated;
CREATE POLICY amendment_admin ON public.digital_contract_amendments FOR SELECT TO authenticated USING(public.digital_is_admin());
CREATE OR REPLACE FUNCTION public.digital_amend_contract(p_contract uuid,p_revision integer,p_lines jsonb,p_parts jsonb,p_reason text) RETURNS public.digital_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.digital_contracts;line jsonb;part jsonb;lines jsonb:='[]';parts jsonb:='[]';ids text[]:='{}';partids text[]:='{}';base numeric;rate numeric;net numeric:=0;tax numeric:=0;total numeric;pct numeric:=0;allocated numeric:=0;amt numeric;i integer:=0;digits integer;oldparts jsonb;
BEGIN
 IF NOT public.digital_is_admin() THEN RAISE EXCEPTION 'Digital admin required'; END IF;
 SELECT * INTO STRICT c FROM public.digital_contracts WHERE id=p_contract FOR UPDATE;
 IF c.revision<>p_revision THEN RAISE EXCEPTION 'Billing changed in another session. Refresh before amending'; END IF;
 IF length(trim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'Scope amendment reason required'; END IF;
 digits:=public.digital_currency_digits(c.body->>'currency');
 IF jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)=0 OR jsonb_typeof(p_parts)<>'array' OR jsonb_array_length(p_parts)=0 THEN RAISE EXCEPTION 'Add services and payment terms'; END IF;
 FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
  IF coalesce(line->>'id','')='' OR line->>'id'=ANY(ids) OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.body->'lines') x WHERE x->>'id'=line->>'id') OR coalesce(trim(line->>'title'),'')='' THEN RAISE EXCEPTION 'New services require unique IDs and titles'; END IF;
  ids:=array_append(ids,line->>'id');base:=round((line->>'amount')::numeric,digits);rate:=(line->>'tax_rate')::numeric;
  IF base IS NULL OR base<0 OR base::text IN ('NaN','Infinity','-Infinity') OR rate IS NULL OR rate<0 OR rate>100 OR rate::text='NaN' THEN RAISE EXCEPTION 'Invalid amount or tax'; END IF;
  net:=net+base;tax:=tax+round(base*rate/100,digits);lines:=lines||jsonb_build_array(line||jsonb_build_object('amount',base,'tax_amount',round(base*rate/100,digits)));
 END LOOP;
 total:=net+tax;IF total<=0 THEN RAISE EXCEPTION 'Additional scope must have positive value'; END IF;
 FOR part IN SELECT * FROM jsonb_array_elements(p_parts) LOOP
  i:=i+1;
  IF coalesce(part->>'id','')='' OR part->>'id'=ANY(partids) OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.body->'parts') x WHERE x->>'id'=part->>'id') OR coalesce(trim(part->>'label'),'')='' THEN RAISE EXCEPTION 'New terms require unique IDs and labels'; END IF;
  partids:=array_append(partids,part->>'id');
  IF (part->>'percentage')::numeric<=0 OR (part->>'percentage')::numeric>100 OR part->>'percentage' IS NULL THEN RAISE EXCEPTION 'Invalid percentage'; END IF;
  IF jsonb_array_length(coalesce(part->'service_ids','[]'))=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(part->'service_ids') x WHERE NOT x=ANY(ids)) THEN RAISE EXCEPTION 'Link terms to new services'; END IF;
  IF nullif(part->>'due_date','') IS NULL THEN RAISE EXCEPTION 'Due date required'; END IF;PERFORM (part->>'due_date')::date;
  pct:=pct+(part->>'percentage')::numeric;amt:=CASE WHEN i=jsonb_array_length(p_parts) THEN total-allocated ELSE round(total*(part->>'percentage')::numeric/100,digits) END;
  IF amt<=0 THEN RAISE EXCEPTION 'Payment term must have positive amount'; END IF;
  allocated:=allocated+amt;parts:=parts||jsonb_build_array(part||jsonb_build_object('amount',amt,'received',0,'percentage',amt/((c.body->>'total')::numeric+total)*100));
 END LOOP;
 IF pct<>100 THEN RAISE EXCEPTION 'Additional scope percentages must total 100'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(parts) p WHERE p->'service_ids' ? x)) THEN RAISE EXCEPTION 'Link every new service to a term'; END IF;
 SELECT jsonb_agg(x||jsonb_build_object('percentage',(x->>'amount')::numeric/((c.body->>'total')::numeric+total)*100) ORDER BY ord) INTO oldparts FROM jsonb_array_elements(c.body->'parts') WITH ORDINALITY a(x,ord);
 INSERT INTO public.digital_contract_amendments(contract_id,previous_revision,reason,added_scope) VALUES(c.id,c.revision,p_reason,jsonb_build_object('lines',lines,'parts',parts,'subtotal',net,'tax',tax,'total',total));
 UPDATE public.digital_contracts SET body=body||jsonb_build_object('lines',(body->'lines')||lines,'parts',oldparts||parts,'subtotal',(body->>'subtotal')::numeric+net,'tax',(body->>'tax')::numeric+tax,'total',(body->>'total')::numeric+total),revision=revision+1,updated_at=now() WHERE id=c.id RETURNING * INTO c;
 UPDATE public.digital_projects SET budget=(c.body->>'subtotal')::numeric,payment_status=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(c.body->'parts') x WHERE (x->>'received')::numeric>0) THEN 'Partially Paid' ELSE 'Pending' END WHERE id=c.project_id;
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.digital_amend_contract(uuid,integer,jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.digital_amend_contract(uuid,integer,jsonb,jsonb,text) TO authenticated;
COMMIT;
