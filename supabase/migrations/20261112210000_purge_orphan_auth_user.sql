-- Removes a login that has no profile row, so an email left behind by an old delete can be registered again.
-- Never touches an email that still has a public.users profile.
CREATE OR REPLACE FUNCTION public.purge_orphan_auth_user(p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE n integer;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role only'; END IF;
  IF p_email IS NULL OR btrim(p_email) = '' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(btrim(p_email))) THEN RETURN false; END IF;
  DELETE FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.purge_orphan_auth_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_orphan_auth_user(text) TO service_role;
