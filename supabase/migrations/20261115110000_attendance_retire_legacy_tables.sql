-- The old per-platform attendance/leave/payroll tables are replaced by the unified attendance_* tables.
-- Their data is kept for reference, but they are no longer reachable from the app: every internal user could read salaries and payroll through them.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance_timesheets', 'leave_permission_requests', 'leave_policy_configs', 'monthly_payrolls', 'shifts', 'employee_salaries', 'digital_attendance'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('COMMENT ON TABLE public.%I IS %L', t, 'Retired: replaced by the unified attendance_* tables. Kept for reference only.');
    END IF;
  END LOOP;
END $$;
