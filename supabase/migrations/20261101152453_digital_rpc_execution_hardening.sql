BEGIN;
-- Pin name resolution on legacy helpers and the currency calculation.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('get_auth_user_role','is_super_admin','create_division_admin','auto_confirm_auth_users','digital_currency_digits')
 LOOP EXECUTE format('ALTER FUNCTION %s SET search_path = public',f.signature); END LOOP;
 -- Trigger functions are invoked only through installed triggers, never as public RPCs.
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prorettype='trigger'::regtype
 LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature); END LOOP;
 -- Anonymous clients cannot call privileged role and administration helpers.
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prosecdef AND p.prorettype<>'trigger'::regtype
 LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
