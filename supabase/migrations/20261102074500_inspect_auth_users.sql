BEGIN;

-- Check any auth users that have digital in metadata or email, and sync to public.users
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id, email, raw_user_meta_data, raw_app_meta_data
    FROM auth.users
  LOOP
    RAISE NOTICE 'AUTH USER: id=%, email=%, user_meta=%, app_meta=%',
      rec.id, rec.email, rec.raw_user_meta_data, rec.raw_app_meta_data;
  END LOOP;
END $$;

COMMIT;

