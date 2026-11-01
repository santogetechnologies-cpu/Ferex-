BEGIN;
-- Supabase default table privileges also apply to newly created tables.
-- RLS already denies anonymous rows; remove the underlying grants as well.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'digital\_%' ESCAPE '\'
 LOOP EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon',t.tablename); END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.digital_contracts,public.digital_financial_documents,public.digital_collections,public.digital_mail_outbox,public.digital_client_users,public.digital_refunds,public.digital_contract_amendments FROM authenticated;
COMMIT;
