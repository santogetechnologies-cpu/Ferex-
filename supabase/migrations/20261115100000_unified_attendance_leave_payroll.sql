-- Attendance: one rule set for every platform (Education, Rimi, Trade, Digital, Central).
-- Everyone clocks in and out. Platform admins verify their team's days (daily or weekly), and their own days wait for the
-- superadmin. Leave, loss of pay, incentives/commission (manual log) and monthly salary all follow the rules stored here.
-- Every write goes through a function that checks who is allowed to do it, so no screen can skip the approval chain.

-- ───────────────────────── who is who ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_level_of(p_role text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(coalesce(p_role, '')) IN ('superadmin', 'super_admin', 'central') THEN 'superadmin'
    WHEN lower(coalesce(p_role, '')) IN ('admin', 'education_admin', 'education', 'rimi_admin', 'rimi', 'rimi_frozen', 'trade_admin', 'trade', 'global_trade',
         'digital_admin', 'digital', 'ferex_digital', 'digital_director') THEN 'admin'
    WHEN lower(coalesce(p_role, '')) IN ('', 'student', 'anon') OR lower(p_role) LIKE '%\_client' THEN 'none'
    ELSE 'staff' END
$$;

CREATE OR REPLACE FUNCTION public.attendance_division_of(p_role text, p_dept text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(coalesce(p_role, '')) IN ('superadmin', 'super_admin', 'central') THEN 'central'
    WHEN lower(coalesce(p_role, '')) LIKE 'rimi%' OR lower(coalesce(p_role, '')) = 'operations_manager' THEN 'rimi'
    WHEN lower(coalesce(p_role, '')) LIKE '%trade%' OR lower(coalesce(p_role, '')) = 'logistics_officer' THEN 'trade'
    WHEN lower(coalesce(p_role, '')) LIKE '%digital%' OR lower(coalesce(p_role, '')) IN ('project_manager', 'pm', 'digimanager', 'account_manager', 'accountmanager',
         'account_executive', 'client_manager', 'designer', 'developer', 'lead_developer', 'creative') THEN 'digital'
    WHEN lower(coalesce(p_dept, '')) LIKE '%rimi%' THEN 'rimi'
    WHEN lower(coalesce(p_dept, '')) LIKE '%trade%' THEN 'trade'
    WHEN lower(coalesce(p_dept, '')) LIKE '%digital%' THEN 'digital'
    ELSE 'education' END
$$;

CREATE OR REPLACE FUNCTION public.attendance_me_level() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT public.attendance_level_of(role) FROM public.users WHERE id = auth.uid()), 'none')
$$;
CREATE OR REPLACE FUNCTION public.attendance_me_division() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT public.attendance_division_of(role, department) FROM public.users WHERE id = auth.uid())
$$;

-- May the signed-in person verify/approve things for this user? Superadmin: anyone. Platform admin: staff of their own platform.
CREATE OR REPLACE FUNCTION public.attendance_can_manage(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.attendance_me_level()
    WHEN 'superadmin' THEN true
    WHEN 'admin' THEN p_user IS DISTINCT FROM auth.uid() AND EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = p_user AND public.attendance_level_of(u.role) = 'staff'
        AND public.attendance_division_of(u.role, u.department) = public.attendance_me_division())
    ELSE false END
$$;

-- ───────────────────────── rules ─────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_rules (
  division text PRIMARY KEY,
  work_start time NOT NULL DEFAULT '09:00',
  work_end time NOT NULL DEFAULT '18:00',
  grace_minutes integer NOT NULL DEFAULT 15 CHECK (grace_minutes >= 0),
  full_day_hours numeric NOT NULL DEFAULT 8 CHECK (full_day_hours > 0),
  half_day_hours numeric NOT NULL DEFAULT 4 CHECK (half_day_hours >= 0),
  weekly_off integer[] NOT NULL DEFAULT '{0}',
  pay_basis text NOT NULL DEFAULT 'working_days' CHECK (pay_basis IN ('working_days', 'calendar_30')),
  lop_factor numeric NOT NULL DEFAULT 1 CHECK (lop_factor >= 0),
  late_to_half_day integer NOT NULL DEFAULT 0 CHECK (late_to_half_day >= 0),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (half_day_hours <= full_day_hours)
);
INSERT INTO public.attendance_rules(division) VALUES ('all') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.attendance_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division text NOT NULL DEFAULT 'all',
  holiday_date date NOT NULL,
  name text NOT NULL,
  UNIQUE (division, holiday_date)
);

CREATE TABLE IF NOT EXISTS public.attendance_leave_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('full_day', 'half_day', 'hourly')),
  annual_quota numeric NOT NULL DEFAULT 0 CHECK (annual_quota >= 0),
  monthly_max_hours numeric NOT NULL DEFAULT 0 CHECK (monthly_max_hours >= 0),
  is_paid boolean NOT NULL DEFAULT true,
  on_exceed text NOT NULL DEFAULT 'lop' CHECK (on_exceed IN ('lop', 'block')),
  is_active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);
INSERT INTO public.attendance_leave_types(code, name, kind, annual_quota, monthly_max_hours, is_paid, on_exceed, sort) VALUES
  ('CL', 'Casual leave', 'full_day', 12, 0, true, 'lop', 1),
  ('SL', 'Sick leave', 'full_day', 10, 0, true, 'lop', 2),
  ('PL', 'Privilege leave', 'full_day', 15, 0, true, 'lop', 3),
  ('HALF', 'Half-day leave', 'half_day', 8, 0, true, 'lop', 4),
  ('PERM', 'Hourly permission', 'hourly', 0, 4, true, 'block', 5),
  ('LOP', 'Unpaid leave (loss of pay)', 'full_day', 0, 0, false, 'lop', 6)
ON CONFLICT DO NOTHING;

-- ───────────────────────── daily attendance ─────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  user_email text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  division text NOT NULL,
  work_date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  banked_minutes integer NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  late boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Present', 'Half Day', 'Absent', 'Leave')),
  source text NOT NULL DEFAULT 'clock' CHECK (source IN ('clock', 'admin', 'auto', 'leave')),
  work_summary text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  review text NOT NULL DEFAULT 'Pending' CHECK (review IN ('Pending', 'Verified')),
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date)
);
CREATE INDEX IF NOT EXISTS attendance_days_division_date ON public.attendance_days (division, work_date);

-- ───────────────────────── leave ─────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  division text NOT NULL,
  type_code text NOT NULL REFERENCES public.attendance_leave_types(code),
  type_name text NOT NULL DEFAULT '',
  kind text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  half_session text CHECK (half_session IN ('first_half', 'second_half')),
  from_time time,
  to_time time,
  hours numeric NOT NULL DEFAULT 0,
  total_days numeric NOT NULL DEFAULT 0,
  paid_days numeric NOT NULL DEFAULT 0,
  lop_days numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS attendance_leaves_user ON public.attendance_leaves (user_id, start_date);

-- ───────────────────────── pay ─────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_salaries (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  division text NOT NULL,
  monthly_salary numeric NOT NULL CHECK (monthly_salary >= 0),
  currency text NOT NULL DEFAULT 'INR',
  bank_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  ifsc text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  division text NOT NULL,
  month text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kind text NOT NULL CHECK (kind IN ('Student closing', 'Commission', 'Performance', 'Bonus', 'Other')),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  reference text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  logged_by uuid NOT NULL,
  logged_by_name text NOT NULL DEFAULT '',
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attendance_incentives_user_month ON public.attendance_incentives (user_id, month);

CREATE TABLE IF NOT EXISTS public.attendance_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  division text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_email text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'INR',
  base_salary numeric NOT NULL DEFAULT 0,
  working_days integer NOT NULL DEFAULT 0,
  present_days numeric NOT NULL DEFAULT 0,
  paid_leave_days numeric NOT NULL DEFAULT 0,
  lop_days numeric NOT NULL DEFAULT 0,
  unverified_days integer NOT NULL DEFAULT 0,
  per_day numeric NOT NULL DEFAULT 0,
  lop_deduction numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  deduction_note text NOT NULL DEFAULT '',
  incentives numeric NOT NULL DEFAULT 0,
  gross numeric NOT NULL DEFAULT 0,
  net numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Verified', 'Approved', 'Paid')),
  verified_by_name text,
  verified_at timestamptz,
  approved_by_name text,
  approved_at timestamptz,
  paid_at timestamptz,
  paid_reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

-- ───────────────────────── access: read only, everything else through the functions below ─────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance_rules', 'attendance_holidays', 'attendance_leave_types', 'attendance_days', 'attendance_leaves',
                           'attendance_salaries', 'attendance_incentives', 'attendance_payroll'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

CREATE POLICY att_read_rules ON public.attendance_rules FOR SELECT TO authenticated USING (public.attendance_me_level() <> 'none');
CREATE POLICY att_read_holidays ON public.attendance_holidays FOR SELECT TO authenticated USING (public.attendance_me_level() <> 'none');
CREATE POLICY att_read_types ON public.attendance_leave_types FOR SELECT TO authenticated USING (public.attendance_me_level() <> 'none');
CREATE POLICY att_read_days ON public.attendance_days FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.attendance_can_manage(user_id));
CREATE POLICY att_read_leaves ON public.attendance_leaves FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.attendance_can_manage(user_id));
CREATE POLICY att_read_salary ON public.attendance_salaries FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.attendance_can_manage(user_id));
CREATE POLICY att_read_incentives ON public.attendance_incentives FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.attendance_can_manage(user_id));
CREATE POLICY att_read_payroll ON public.attendance_payroll FOR SELECT TO authenticated
  USING ((user_id = auth.uid() AND status IN ('Approved', 'Paid')) OR public.attendance_can_manage(user_id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['attendance_days', 'attendance_leaves', 'attendance_incentives', 'attendance_payroll', 'attendance_rules', 'attendance_holidays', 'attendance_leave_types'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ───────────────────────── helpers ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_rules_for(p_division text) RETURNS public.attendance_rules LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r FROM public.attendance_rules r WHERE r.division IN (coalesce(p_division, 'all'), 'all') ORDER BY (r.division = 'all') LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.attendance_today(p_division text) RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (now() AT TIME ZONE (public.attendance_rules_for(p_division)).timezone)::date
$$;

CREATE OR REPLACE FUNCTION public.attendance_is_working_day(p_division text, p_date date) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT (extract(dow FROM p_date)::int = ANY ((public.attendance_rules_for(p_division)).weekly_off))
     AND NOT EXISTS (SELECT 1 FROM public.attendance_holidays h WHERE h.holiday_date = p_date AND h.division IN ('all', p_division))
$$;

CREATE OR REPLACE FUNCTION public.attendance_status_for_hours(p_division text, p_hours numeric) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_hours >= (public.attendance_rules_for(p_division)).full_day_hours THEN 'Present'
              WHEN p_hours >= (public.attendance_rules_for(p_division)).half_day_hours AND p_hours > 0 THEN 'Half Day'
              ELSE 'Absent' END
$$;

CREATE OR REPLACE FUNCTION public.attendance_month_locked(p_user uuid, p_date date) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.attendance_payroll WHERE user_id = p_user AND month = to_char(p_date, 'YYYY-MM') AND status IN ('Approved', 'Paid'))
$$;

CREATE OR REPLACE FUNCTION public.attendance_context() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; div text; r public.attendance_rules;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = auth.uid();
  IF NOT FOUND OR public.attendance_level_of(u.role) = 'none' THEN RAISE EXCEPTION 'Attendance is for team members only'; END IF;
  div := public.attendance_division_of(u.role, u.department);
  r := public.attendance_rules_for(div);
  RETURN jsonb_build_object('user_id', u.id, 'name', coalesce(nullif(u.full_name, ''), u.email), 'email', u.email, 'role', u.role,
    'level', public.attendance_level_of(u.role), 'division', div, 'rules', to_jsonb(r), 'today', public.attendance_today(div));
END $$;

-- The people the signed-in person is responsible for (and themselves).
CREATE OR REPLACE FUNCTION public.attendance_team() RETURNS TABLE (user_id uuid, name text, email text, role text, division text, level text, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, coalesce(nullif(u.full_name, ''), u.email), u.email, u.role, public.attendance_division_of(u.role, u.department),
         public.attendance_level_of(u.role), u.id = auth.uid()
  FROM public.users u
  WHERE public.attendance_level_of(u.role) IN ('staff', 'admin')
    AND coalesce(u.status, 'active') NOT IN ('inactive', 'deleted', 'suspended') AND coalesce(u.is_active, true)
    AND (u.id = auth.uid() OR public.attendance_can_manage(u.id))
  ORDER BY 5, 6 DESC, 2
$$;

-- ───────────────────────── clock in / out ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_clock_in(p_note text DEFAULT '') RETURNS public.attendance_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; div text; r public.attendance_rules; today date; d public.attendance_days; old record; is_late boolean; local_t time;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = auth.uid();
  IF NOT FOUND OR public.attendance_level_of(u.role) NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Only team members can clock in'; END IF;
  div := public.attendance_division_of(u.role, u.department); r := public.attendance_rules_for(div); today := public.attendance_today(div);

  -- A session left open on an earlier day is closed at the end of that working day so it cannot run on forever.
  FOR old IN SELECT * FROM public.attendance_days WHERE user_id = u.id AND clock_out IS NULL AND clock_in IS NOT NULL AND work_date < today AND review = 'Pending' LOOP
    UPDATE public.attendance_days SET
      clock_out = greatest(clock_in, ((work_date + r.work_end) AT TIME ZONE r.timezone)),
      hours = round((banked_minutes + extract(epoch FROM (greatest(clock_in, ((work_date + r.work_end) AT TIME ZONE r.timezone)) - clock_in)) / 60) / 60.0, 2),
      source = 'auto', note = trim(note || ' Closed automatically: no clock-out was recorded.'), updated_at = now()
    WHERE id = old.id;
    UPDATE public.attendance_days SET status = public.attendance_status_for_hours(div, hours) WHERE id = old.id;
  END LOOP;

  SELECT * INTO d FROM public.attendance_days WHERE user_id = u.id AND work_date = today FOR UPDATE;
  IF FOUND THEN
    IF d.review = 'Verified' THEN RAISE EXCEPTION 'Today is already verified; ask your administrator to reopen it'; END IF;
    IF d.clock_in IS NOT NULL AND d.clock_out IS NULL THEN RAISE EXCEPTION 'You are already clocked in'; END IF;
    UPDATE public.attendance_days SET banked_minutes = banked_minutes + CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN round(extract(epoch FROM (clock_out - clock_in)) / 60)::int ELSE 0 END,
      clock_in = now(), clock_out = NULL, status = 'Open', source = 'clock', updated_at = now() WHERE id = d.id RETURNING * INTO d;
    RETURN d;
  END IF;
  local_t := (now() AT TIME ZONE r.timezone)::time;
  is_late := local_t > r.work_start + make_interval(mins => r.grace_minutes);
  INSERT INTO public.attendance_days(user_id, user_name, user_email, user_role, division, work_date, clock_in, late, status, source, note)
    VALUES (u.id, coalesce(nullif(u.full_name, ''), u.email), u.email, u.role, div, today, now(), is_late, 'Open', 'clock', coalesce(p_note, ''))
    RETURNING * INTO d;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_clock_out(p_summary text DEFAULT '') RETURNS public.attendance_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.attendance_days; mins numeric;
BEGIN
  SELECT * INTO d FROM public.attendance_days WHERE user_id = auth.uid() AND clock_in IS NOT NULL AND clock_out IS NULL ORDER BY work_date DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not clocked in'; END IF;
  IF d.review = 'Verified' THEN RAISE EXCEPTION 'This day is already verified'; END IF;
  mins := d.banked_minutes + extract(epoch FROM (now() - d.clock_in)) / 60;
  UPDATE public.attendance_days SET clock_out = now(), hours = round(mins / 60.0, 2), status = public.attendance_status_for_hours(d.division, round(mins / 60.0, 2)),
    work_summary = coalesce(nullif(trim(p_summary), ''), work_summary), updated_at = now() WHERE id = d.id RETURNING * INTO d;
  RETURN d;
END $$;

-- ───────────────────────── marking and verifying (daily or weekly) ─────────────────────────
-- Records a day for someone who did not clock, or corrects one. A platform admin marking their team counts as verified;
-- an admin marking themselves waits for the superadmin.
CREATE OR REPLACE FUNCTION public.attendance_mark(p_user uuid, p_date date, p_status text, p_in time DEFAULT NULL, p_out time DEFAULT NULL, p_note text DEFAULT '')
RETURNS public.attendance_days LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; me public.users%ROWTYPE; div text; r public.attendance_rules; d public.attendance_days; ci timestamptz; co timestamptz; h numeric := 0; selfmark boolean; pending boolean;
BEGIN
  SELECT * INTO me FROM public.users WHERE id = auth.uid();
  SELECT * INTO u FROM public.users WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person not found'; END IF;
  selfmark := p_user = auth.uid();
  IF NOT (public.attendance_can_manage(p_user) OR (selfmark AND public.attendance_level_of(me.role) = 'admin')) THEN
    RAISE EXCEPTION 'You cannot mark attendance for this person';
  END IF;
  IF p_status NOT IN ('Present', 'Half Day', 'Absent', 'Leave') THEN RAISE EXCEPTION 'Choose Present, Half Day, Absent or Leave'; END IF;
  div := public.attendance_division_of(u.role, u.department); r := public.attendance_rules_for(div);
  IF p_date > public.attendance_today(div) THEN RAISE EXCEPTION 'You cannot mark a future day'; END IF;
  IF public.attendance_month_locked(p_user, p_date) THEN RAISE EXCEPTION 'Payroll for that month is already approved. Reopen the payroll first'; END IF;
  pending := selfmark AND public.attendance_level_of(me.role) <> 'superadmin';
  IF p_in IS NOT NULL AND p_out IS NOT NULL THEN
    IF p_out <= p_in THEN RAISE EXCEPTION 'Clock-out must be after clock-in'; END IF;
    ci := (p_date + p_in) AT TIME ZONE r.timezone; co := (p_date + p_out) AT TIME ZONE r.timezone;
    h := round(extract(epoch FROM (co - ci)) / 3600.0, 2);
  ELSIF p_status = 'Present' THEN h := r.full_day_hours; ELSIF p_status = 'Half Day' THEN h := r.half_day_hours; END IF;
  INSERT INTO public.attendance_days(user_id, user_name, user_email, user_role, division, work_date, clock_in, clock_out, hours, late, status, source, note, review, reviewed_by, reviewed_by_name, reviewed_at)
    VALUES (u.id, coalesce(nullif(u.full_name, ''), u.email), u.email, u.role, div, p_date, ci, co, h, false, p_status, 'admin', coalesce(p_note, ''),
      CASE WHEN pending THEN 'Pending' ELSE 'Verified' END,
      CASE WHEN pending THEN NULL ELSE me.id END,
      CASE WHEN pending THEN NULL ELSE coalesce(nullif(me.full_name, ''), me.email) END,
      CASE WHEN pending THEN NULL ELSE now() END)
  ON CONFLICT (user_id, work_date) DO UPDATE SET
    clock_in = coalesce(EXCLUDED.clock_in, public.attendance_days.clock_in), clock_out = coalesce(EXCLUDED.clock_out, public.attendance_days.clock_out),
    banked_minutes = 0, hours = EXCLUDED.hours, status = EXCLUDED.status, source = 'admin',
    note = trim(coalesce(nullif(EXCLUDED.note, ''), public.attendance_days.note)),
    review = EXCLUDED.review, reviewed_by = EXCLUDED.reviewed_by, reviewed_by_name = EXCLUDED.reviewed_by_name, reviewed_at = EXCLUDED.reviewed_at, updated_at = now()
  RETURNING * INTO d;
  RETURN d;
END $$;

-- Verifies a day, a week or any range for one person or everyone you are responsible for.
-- Days nobody clocked and no leave covers become Absent (that is the "even if they did not clock in" rule).
CREATE OR REPLACE FUNCTION public.attendance_verify(p_from date, p_to date, p_user uuid DEFAULT NULL, p_fill_absent boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.users%ROWTYPE; t record; d date; today date; rw public.attendance_days; verified int := 0; absent int := 0; open_days int := 0; skipped_self int := 0;
BEGIN
  SELECT * INTO me FROM public.users WHERE id = auth.uid();
  IF public.attendance_level_of(me.role) NOT IN ('admin', 'superadmin') THEN RAISE EXCEPTION 'Only administrators verify attendance'; END IF;
  IF p_to < p_from THEN RAISE EXCEPTION 'The end date must be on or after the start date'; END IF;
  IF p_to - p_from > 92 THEN RAISE EXCEPTION 'Verify at most three months at a time'; END IF;
  FOR t IN SELECT * FROM public.attendance_team() tt WHERE (p_user IS NULL OR tt.user_id = p_user) LOOP
    IF t.user_id = me.id AND public.attendance_level_of(me.role) <> 'superadmin' THEN skipped_self := skipped_self + 1; CONTINUE; END IF;
    IF NOT (public.attendance_can_manage(t.user_id)) THEN CONTINUE; END IF;
    today := public.attendance_today(t.division);
    FOR d IN SELECT generate_series(p_from, least(p_to, today), interval '1 day')::date LOOP
      IF NOT public.attendance_is_working_day(t.division, d) THEN CONTINUE; END IF;
      IF public.attendance_month_locked(t.user_id, d) THEN CONTINUE; END IF;
      SELECT * INTO rw FROM public.attendance_days WHERE user_id = t.user_id AND work_date = d;
      IF NOT FOUND THEN
        IF p_fill_absent AND d < today THEN
          INSERT INTO public.attendance_days(user_id, user_name, user_email, user_role, division, work_date, status, source, note, review, reviewed_by, reviewed_by_name, reviewed_at)
            SELECT t.user_id, t.name, t.email, t.role, t.division, d, 'Absent', 'admin', 'No clock-in recorded', 'Verified', me.id, coalesce(nullif(me.full_name, ''), me.email), now();
          absent := absent + 1;
        END IF;
      ELSIF rw.status = 'Open' THEN open_days := open_days + 1;
      ELSIF rw.review = 'Pending' THEN
        UPDATE public.attendance_days SET review = 'Verified', reviewed_by = me.id, reviewed_by_name = coalesce(nullif(me.full_name, ''), me.email), reviewed_at = now(), updated_at = now() WHERE id = rw.id;
        verified := verified + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('verified', verified, 'marked_absent', absent, 'still_open', open_days, 'own_days_left_for_superadmin', skipped_self);
END $$;

CREATE OR REPLACE FUNCTION public.attendance_reopen(p_day uuid, p_reason text) RETURNS public.attendance_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.attendance_days;
BEGIN
  SELECT * INTO d FROM public.attendance_days WHERE id = p_day FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Day not found'; END IF;
  IF NOT public.attendance_can_manage(d.user_id) THEN RAISE EXCEPTION 'You cannot reopen this day'; END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Enter the reason for reopening'; END IF;
  IF public.attendance_month_locked(d.user_id, d.work_date) THEN RAISE EXCEPTION 'Payroll for that month is already approved. Reopen the payroll first'; END IF;
  UPDATE public.attendance_days SET review = 'Pending', reviewed_by = NULL, reviewed_by_name = NULL, reviewed_at = NULL,
    note = trim(note || ' Reopened: ' || p_reason), updated_at = now() WHERE id = p_day RETURNING * INTO d;
  RETURN d;
END $$;

-- ───────────────────────── leave ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_leave_used(p_user uuid, p_code text, p_year int, p_exclude uuid DEFAULT NULL) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(paid_days), 0) FROM public.attendance_leaves
  WHERE user_id = p_user AND type_code = p_code AND status = 'approved' AND extract(year FROM start_date)::int = p_year AND id IS DISTINCT FROM p_exclude
$$;

CREATE OR REPLACE FUNCTION public.attendance_working_days_between(p_division text, p_from date, p_to date) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM generate_series(p_from, p_to, interval '1 day') g WHERE public.attendance_is_working_day(p_division, g::date)
$$;

-- Splits a leave into paid and loss-of-pay days against what is left of the yearly limit.
CREATE OR REPLACE FUNCTION public.attendance_leave_split(p_user uuid, p_type public.attendance_leave_types, p_total numeric, p_year int, p_exclude uuid DEFAULT NULL)
RETURNS TABLE (paid numeric, lop numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining numeric;
BEGIN
  IF NOT p_type.is_paid THEN RETURN QUERY SELECT 0::numeric, p_total; RETURN; END IF;
  remaining := greatest(0, p_type.annual_quota - public.attendance_leave_used(p_user, p_type.code, p_year, p_exclude));
  IF p_total <= remaining THEN RETURN QUERY SELECT p_total, 0::numeric;
  ELSIF p_type.on_exceed = 'block' THEN RAISE EXCEPTION 'Only % day(s) of % are left this year', remaining, p_type.name;
  ELSE RETURN QUERY SELECT remaining, p_total - remaining; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_leave_submit(p_type text, p_start date, p_end date, p_session text DEFAULT NULL, p_from time DEFAULT NULL, p_to time DEFAULT NULL, p_reason text DEFAULT '')
RETURNS public.attendance_leaves LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; lt public.attendance_leave_types; div text; total numeric; hrs numeric := 0; sp record; used numeric; l public.attendance_leaves; yr int;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = auth.uid();
  IF public.attendance_level_of(u.role) NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Only team members can apply for leave'; END IF;
  SELECT * INTO lt FROM public.attendance_leave_types WHERE code = p_type AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown leave type'; END IF;
  div := public.attendance_division_of(u.role, u.department);
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN RAISE EXCEPTION 'Choose valid dates'; END IF;
  IF p_start < public.attendance_today(div) - 31 THEN RAISE EXCEPTION 'Leave cannot start more than 31 days in the past'; END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Enter a reason'; END IF;
  IF EXISTS (SELECT 1 FROM public.attendance_leaves WHERE user_id = u.id AND status IN ('pending', 'approved') AND daterange(start_date, end_date, '[]') && daterange(p_start, p_end, '[]')
             AND NOT (kind = 'hourly' AND lt.kind = 'hourly' AND NOT (coalesce(from_time, '00:00') < coalesce(p_to, '23:59') AND coalesce(to_time, '23:59') > coalesce(p_from, '00:00')))) THEN
    RAISE EXCEPTION 'You already have leave on some of those dates';
  END IF;
  yr := extract(year FROM p_start)::int;
  IF lt.kind = 'half_day' THEN
    IF p_end <> p_start THEN RAISE EXCEPTION 'A half day is a single date'; END IF;
    IF p_session IS NULL THEN RAISE EXCEPTION 'Choose morning or afternoon'; END IF;
    IF NOT public.attendance_is_working_day(div, p_start) THEN RAISE EXCEPTION 'That date is a weekly off or holiday'; END IF;
    total := 0.5;
  ELSIF lt.kind = 'hourly' THEN
    IF p_end <> p_start OR p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN RAISE EXCEPTION 'Enter one date with a start and end time'; END IF;
    hrs := round(extract(epoch FROM (p_to - p_from)) / 3600.0, 2);
    SELECT coalesce(sum(hours), 0) INTO used FROM public.attendance_leaves WHERE user_id = u.id AND type_code = lt.code AND status IN ('pending', 'approved')
      AND to_char(start_date, 'YYYY-MM') = to_char(p_start, 'YYYY-MM');
    IF used + hrs > lt.monthly_max_hours THEN RAISE EXCEPTION 'Permission limit is % hours a month; % already used or requested', lt.monthly_max_hours, used; END IF;
    total := 0;
  ELSE
    total := public.attendance_working_days_between(div, p_start, p_end);
    IF total = 0 THEN RAISE EXCEPTION 'Those dates are all weekly offs or holidays'; END IF;
  END IF;
  SELECT * INTO sp FROM public.attendance_leave_split(u.id, lt, total, yr);
  INSERT INTO public.attendance_leaves(user_id, user_name, user_role, division, type_code, type_name, kind, start_date, end_date, half_session, from_time, to_time, hours, total_days, paid_days, lop_days, reason)
    VALUES (u.id, coalesce(nullif(u.full_name, ''), u.email), u.role, div, lt.code, lt.name, lt.kind, p_start, p_end, CASE WHEN lt.kind = 'half_day' THEN p_session END,
            p_from, p_to, hrs, total, coalesce(sp.paid, 0), coalesce(sp.lop, 0), trim(p_reason))
    RETURNING * INTO l;
  RETURN l;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_leave_decide(p_id uuid, p_approve boolean, p_note text DEFAULT '') RETURNS public.attendance_leaves
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.attendance_leaves; me public.users%ROWTYPE; lt public.attendance_leave_types; sp record; d date; u public.users%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.attendance_leaves WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leave request not found'; END IF;
  IF l.status <> 'pending' THEN RAISE EXCEPTION 'This request was already %', l.status; END IF;
  IF NOT public.attendance_can_manage(l.user_id) THEN RAISE EXCEPTION 'You cannot decide this request. Your own leave is approved by the next level up'; END IF;
  SELECT * INTO me FROM public.users WHERE id = auth.uid();
  IF NOT p_approve THEN
    UPDATE public.attendance_leaves SET status = 'rejected', decided_by = me.id, decided_by_name = coalesce(nullif(me.full_name, ''), me.email), decided_at = now(), decision_note = coalesce(p_note, '') WHERE id = p_id RETURNING * INTO l;
    RETURN l;
  END IF;
  SELECT * INTO lt FROM public.attendance_leave_types WHERE code = l.type_code;
  SELECT * INTO sp FROM public.attendance_leave_split(l.user_id, lt, l.total_days, extract(year FROM l.start_date)::int, l.id);
  IF public.attendance_month_locked(l.user_id, l.start_date) THEN RAISE EXCEPTION 'Payroll for that month is already approved'; END IF;
  UPDATE public.attendance_leaves SET status = 'approved', paid_days = coalesce(sp.paid, 0), lop_days = coalesce(sp.lop, 0), decided_by = me.id,
    decided_by_name = coalesce(nullif(me.full_name, ''), me.email), decided_at = now(), decision_note = coalesce(p_note, '') WHERE id = p_id RETURNING * INTO l;
  SELECT * INTO u FROM public.users WHERE id = l.user_id;
  -- The leave shows on the daily attendance so nobody has to mark those days by hand.
  IF l.kind IN ('full_day', 'half_day') THEN
    FOR d IN SELECT generate_series(l.start_date, l.end_date, interval '1 day')::date LOOP
      IF NOT public.attendance_is_working_day(l.division, d) THEN CONTINUE; END IF;
      INSERT INTO public.attendance_days(user_id, user_name, user_email, user_role, division, work_date, status, source, note, review, reviewed_by, reviewed_by_name, reviewed_at)
        VALUES (l.user_id, l.user_name, u.email, l.user_role, l.division, d, CASE WHEN l.kind = 'half_day' THEN 'Half Day' ELSE 'Leave' END, 'leave', l.type_name, 'Verified', me.id,
                coalesce(nullif(me.full_name, ''), me.email), now())
      ON CONFLICT (user_id, work_date) DO UPDATE SET note = trim(public.attendance_days.note || ' ' || l.type_name), updated_at = now()
        WHERE public.attendance_days.status IN ('Absent', 'Open') OR public.attendance_days.review = 'Pending';
    END LOOP;
  END IF;
  RETURN l;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_leave_cancel(p_id uuid) RETURNS public.attendance_leaves
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.attendance_leaves;
BEGIN
  UPDATE public.attendance_leaves SET status = 'cancelled' WHERE id = p_id AND user_id = auth.uid() AND status = 'pending' RETURNING * INTO l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only your own pending requests can be cancelled'; END IF;
  RETURN l;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_leave_balance(p_user uuid DEFAULT NULL, p_year int DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := coalesce(p_user, auth.uid()); yr int := coalesce(p_year, extract(year FROM now())::int);
BEGIN
  IF uid <> auth.uid() AND NOT public.attendance_can_manage(uid) THEN RAISE EXCEPTION 'You cannot see this balance'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'kind', t.kind, 'quota', t.annual_quota, 'monthly_max_hours', t.monthly_max_hours,
      'is_paid', t.is_paid, 'used', public.attendance_leave_used(uid, t.code, yr),
      'remaining', greatest(0, t.annual_quota - public.attendance_leave_used(uid, t.code, yr))) ORDER BY t.sort) FROM public.attendance_leave_types t WHERE t.is_active), '[]'::jsonb);
END $$;

-- ───────────────────────── incentives and commission (manual log) ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_incentive_add(p_user uuid, p_month text, p_kind text, p_amount numeric, p_reference text DEFAULT '', p_notes text DEFAULT '')
RETURNS public.attendance_incentives LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.users%ROWTYPE; u public.users%ROWTYPE; r public.attendance_incentives; self boolean; auto boolean; cur text;
BEGIN
  SELECT * INTO me FROM public.users WHERE id = auth.uid();
  SELECT * INTO u FROM public.users WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person not found'; END IF;
  self := p_user = auth.uid();
  IF NOT (public.attendance_can_manage(p_user) OR (self AND public.attendance_level_of(me.role) = 'admin')) THEN RAISE EXCEPTION 'You cannot log incentives for this person'; END IF;
  IF public.attendance_month_locked(p_user, (p_month || '-01')::date) THEN RAISE EXCEPTION 'Payroll for % is already approved', p_month; END IF;
  -- An admin's own incentive, like their own attendance, needs the superadmin; everything a manager logs for their team is approved on entry.
  auto := public.attendance_level_of(me.role) = 'superadmin' OR NOT self;
  SELECT currency INTO cur FROM public.attendance_salaries WHERE user_id = p_user;
  INSERT INTO public.attendance_incentives(user_id, user_name, division, month, kind, amount, currency, reference, notes, status, logged_by, logged_by_name, decided_by, decided_by_name, decided_at)
    VALUES (u.id, coalesce(nullif(u.full_name, ''), u.email), public.attendance_division_of(u.role, u.department), p_month, p_kind, p_amount, coalesce(cur, 'INR'),
      coalesce(p_reference, ''), coalesce(p_notes, ''), CASE WHEN auto THEN 'Approved' ELSE 'Pending' END, me.id, coalesce(nullif(me.full_name, ''), me.email),
      CASE WHEN auto THEN me.id END, CASE WHEN auto THEN coalesce(nullif(me.full_name, ''), me.email) END, CASE WHEN auto THEN now() END)
    RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_incentive_decide(p_id uuid, p_approve boolean) RETURNS public.attendance_incentives
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.attendance_incentives; me public.users%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.attendance_incentives WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incentive not found'; END IF;
  IF r.status <> 'Pending' THEN RAISE EXCEPTION 'Already %', lower(r.status); END IF;
  IF NOT public.attendance_can_manage(r.user_id) THEN RAISE EXCEPTION 'Only the next level up can decide this'; END IF;
  SELECT * INTO me FROM public.users WHERE id = auth.uid();
  UPDATE public.attendance_incentives SET status = CASE WHEN p_approve THEN 'Approved' ELSE 'Rejected' END, decided_by = me.id,
    decided_by_name = coalesce(nullif(me.full_name, ''), me.email), decided_at = now() WHERE id = p_id RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_incentive_remove(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.attendance_incentives;
BEGIN
  SELECT * INTO r FROM public.attendance_incentives WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incentive not found'; END IF;
  IF NOT (public.attendance_can_manage(r.user_id) OR (r.logged_by = auth.uid() AND r.status = 'Pending')) THEN RAISE EXCEPTION 'You cannot remove this entry'; END IF;
  IF EXISTS (SELECT 1 FROM public.attendance_payroll WHERE user_id = r.user_id AND month = r.month AND status <> 'Draft') THEN
    RAISE EXCEPTION 'This month''s payroll is already verified. Reopen it first';
  END IF;
  DELETE FROM public.attendance_incentives WHERE id = p_id;
END $$;

-- ───────────────────────── salary and monthly payroll ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_set_salary(p_user uuid, p_amount numeric, p_currency text DEFAULT 'INR', p_bank_name text DEFAULT '', p_account_name text DEFAULT '',
  p_account_number text DEFAULT '', p_ifsc text DEFAULT '') RETURNS public.attendance_salaries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; s public.attendance_salaries;
BEGIN
  IF NOT public.attendance_can_manage(p_user) THEN RAISE EXCEPTION 'You cannot set this person''s salary'; END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Enter the monthly salary'; END IF;
  SELECT * INTO u FROM public.users WHERE id = p_user;
  INSERT INTO public.attendance_salaries(user_id, division, monthly_salary, currency, bank_name, account_name, account_number, ifsc, updated_by)
    VALUES (p_user, public.attendance_division_of(u.role, u.department), p_amount, coalesce(nullif(p_currency, ''), 'INR'), coalesce(p_bank_name, ''), coalesce(p_account_name, ''),
            coalesce(p_account_number, ''), coalesce(p_ifsc, ''), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET monthly_salary = EXCLUDED.monthly_salary, currency = EXCLUDED.currency, bank_name = EXCLUDED.bank_name, account_name = EXCLUDED.account_name,
    account_number = EXCLUDED.account_number, ifsc = EXCLUDED.ifsc, updated_by = auth.uid(), updated_at = now()
  RETURNING * INTO s;
  RETURN s;
END $$;

-- Works out one person's month from verified days, approved leave, approved incentives and the loss-of-pay rules.
CREATE OR REPLACE FUNCTION public.attendance_calc(p_user uuid, p_month text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.users%ROWTYPE; div text; r public.attendance_rules; sal public.attendance_salaries; first_d date := (p_month || '-01')::date; last_d date;
  d date; wd int := 0; present numeric := 0; leavepaid numeric := 0; lop numeric := 0; unver int := 0; late_ct int := 0; day_rw public.attendance_days; leave_paid numeric[] := array_fill(0::numeric, ARRAY[31]);
  lv public.attendance_leaves; remaining numeric; len numeric; take numeric; p numeric; cover numeric; per_day numeric; ded numeric; inc numeric; late_pen numeric := 0;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = p_user;
  div := public.attendance_division_of(u.role, u.department); r := public.attendance_rules_for(div);
  SELECT * INTO sal FROM public.attendance_salaries WHERE user_id = p_user;
  last_d := (first_d + interval '1 month' - interval '1 day')::date;
  FOR lv IN SELECT * FROM public.attendance_leaves WHERE user_id = p_user AND status = 'approved' AND kind IN ('full_day', 'half_day') AND start_date <= last_d AND end_date >= first_d ORDER BY start_date LOOP
    remaining := lv.paid_days; len := CASE WHEN lv.kind = 'half_day' THEN 0.5 ELSE 1 END;
    FOR d IN SELECT generate_series(lv.start_date, lv.end_date, interval '1 day')::date LOOP
      IF NOT public.attendance_is_working_day(div, d) THEN CONTINUE; END IF;
      take := least(len, remaining); remaining := remaining - take;
      IF d BETWEEN first_d AND last_d THEN leave_paid[extract(day FROM d)::int] := leave_paid[extract(day FROM d)::int] + take; END IF;
    END LOOP;
  END LOOP;
  FOR d IN SELECT generate_series(first_d, last_d, interval '1 day')::date LOOP
    IF NOT public.attendance_is_working_day(div, d) THEN CONTINUE; END IF;
    wd := wd + 1;
    SELECT * INTO day_row FROM public.attendance_days WHERE user_id = p_user AND work_date = d;
    IF NOT FOUND OR day_row.review <> 'Verified' THEN unver := unver + 1; CONTINUE; END IF;
    p := CASE day_row.status WHEN 'Present' THEN 1 WHEN 'Half Day' THEN 0.5 ELSE 0 END;
    IF day_row.late AND day_row.status = 'Present' THEN late_ct := late_ct + 1; END IF;
    present := present + least(1, p);
    cover := least(1, p + leave_paid[extract(day FROM d)::int]);
    leavepaid := leavepaid + (cover - least(1, p));
    lop := lop + (1 - cover);
  END LOOP;
  IF r.late_to_half_day > 0 THEN late_pen := floor(late_ct::numeric / r.late_to_half_day) * 0.5; lop := lop + late_pen; END IF;
  per_day := CASE WHEN coalesce(sal.monthly_salary, 0) = 0 THEN 0 WHEN r.pay_basis = 'calendar_30' THEN sal.monthly_salary / 30 WHEN wd = 0 THEN 0 ELSE sal.monthly_salary / wd END;
  ded := round(lop * per_day * r.lop_factor, 2);
  SELECT coalesce(sum(amount), 0) INTO inc FROM public.attendance_incentives WHERE user_id = p_user AND month = p_month AND status = 'Approved';
  RETURN jsonb_build_object('working_days', wd, 'present_days', present, 'paid_leave_days', leavepaid, 'lop_days', lop, 'unverified_days', unver, 'late_penalty_days', late_pen,
    'per_day', round(per_day, 2), 'lop_deduction', ded, 'incentives', inc, 'base', coalesce(sal.monthly_salary, 0), 'currency', coalesce(sal.currency, 'INR'));
END $$;

CREATE OR REPLACE FUNCTION public.attendance_payroll_generate(p_month text, p_division text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me_level text := public.attendance_me_level(); t record; c jsonb; made int := 0; skipped_salary int := 0; kept int := 0; last_d date; today date;
BEGIN
  IF me_level NOT IN ('admin', 'superadmin') THEN RAISE EXCEPTION 'Only administrators prepare payroll'; END IF;
  IF p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Choose a month'; END IF;
  last_d := ((p_month || '-01')::date + interval '1 month' - interval '1 day')::date;
  today := public.attendance_today(coalesce(nullif(p_division, 'all'), public.attendance_me_division()));
  IF last_d >= today THEN RAISE EXCEPTION 'Payroll can be prepared once the month has ended'; END IF;
  FOR t IN SELECT * FROM public.attendance_team() tt WHERE tt.user_id <> auth.uid() AND (p_division IS NULL OR p_division = 'all' OR tt.division = p_division) LOOP
    IF NOT public.attendance_can_manage(t.user_id) THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.attendance_salaries WHERE user_id = t.user_id) THEN skipped_salary := skipped_salary + 1; CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM public.attendance_payroll WHERE user_id = t.user_id AND month = p_month AND status <> 'Draft') THEN kept := kept + 1; CONTINUE; END IF;
    c := public.attendance_calc(t.user_id, p_month);
    INSERT INTO public.attendance_payroll(user_id, month, division, user_name, user_email, user_role, currency, base_salary, working_days, present_days, paid_leave_days, lop_days, unverified_days,
        per_day, lop_deduction, incentives, gross, net)
      VALUES (t.user_id, p_month, t.division, t.name, t.email, t.role, c->>'currency', (c->>'base')::numeric, (c->>'working_days')::int, (c->>'present_days')::numeric,
        (c->>'paid_leave_days')::numeric, (c->>'lop_days')::numeric, (c->>'unverified_days')::int, (c->>'per_day')::numeric, (c->>'lop_deduction')::numeric, (c->>'incentives')::numeric,
        (c->>'base')::numeric + (c->>'incentives')::numeric, greatest(0, (c->>'base')::numeric + (c->>'incentives')::numeric - (c->>'lop_deduction')::numeric))
    ON CONFLICT (user_id, month) DO UPDATE SET base_salary = EXCLUDED.base_salary, currency = EXCLUDED.currency, working_days = EXCLUDED.working_days, present_days = EXCLUDED.present_days,
      paid_leave_days = EXCLUDED.paid_leave_days, lop_days = EXCLUDED.lop_days, unverified_days = EXCLUDED.unverified_days, per_day = EXCLUDED.per_day,
      lop_deduction = EXCLUDED.lop_deduction, incentives = EXCLUDED.incentives, gross = EXCLUDED.gross,
      net = greatest(0, EXCLUDED.gross - EXCLUDED.lop_deduction - public.attendance_payroll.other_deductions), updated_at = now();
    made := made + 1;
  END LOOP;
  RETURN jsonb_build_object('prepared', made, 'no_salary_set', skipped_salary, 'already_verified_or_paid', kept);
END $$;

CREATE OR REPLACE FUNCTION public.attendance_payroll_adjust(p_id uuid, p_other_deductions numeric, p_note text) RETURNS public.attendance_payroll
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.attendance_payroll;
BEGIN
  SELECT * INTO p FROM public.attendance_payroll WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll not found'; END IF;
  IF NOT public.attendance_can_manage(p.user_id) THEN RAISE EXCEPTION 'You cannot change this payroll'; END IF;
  IF p.status <> 'Draft' THEN RAISE EXCEPTION 'Only a draft can be adjusted'; END IF;
  IF p_other_deductions < 0 THEN RAISE EXCEPTION 'The deduction cannot be negative'; END IF;
  IF p_other_deductions > 0 AND length(trim(coalesce(p_note, ''))) < 3 THEN RAISE EXCEPTION 'Enter the reason for the deduction'; END IF;
  UPDATE public.attendance_payroll SET other_deductions = p_other_deductions, deduction_note = coalesce(p_note, ''), net = greatest(0, gross - lop_deduction - p_other_deductions), updated_at = now()
    WHERE id = p_id RETURNING * INTO p;
  RETURN p;
END $$;

-- Draft → Verified (platform admin for staff; superadmin for admins) → Approved → Paid (superadmin). The superadmin can send it back to Draft.
CREATE OR REPLACE FUNCTION public.attendance_payroll_advance(p_id uuid, p_to text, p_reference text DEFAULT '') RETURNS public.attendance_payroll
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.attendance_payroll; me public.users%ROWTYPE; lvl text; c jsonb; nm text;
BEGIN
  SELECT * INTO p FROM public.attendance_payroll WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll not found'; END IF;
  IF NOT public.attendance_can_manage(p.user_id) THEN RAISE EXCEPTION 'You cannot change this payroll'; END IF;
  SELECT * INTO me FROM public.users WHERE id = auth.uid(); lvl := public.attendance_level_of(me.role); nm := coalesce(nullif(me.full_name, ''), me.email);
  IF p_to = 'Verified' AND p.status = 'Draft' THEN
    c := public.attendance_calc(p.user_id, p.month);
    IF (c->>'unverified_days')::int > 0 THEN RAISE EXCEPTION '% day(s) of this month are not verified yet. Verify the attendance first', c->>'unverified_days'; END IF;
    UPDATE public.attendance_payroll SET working_days = (c->>'working_days')::int, present_days = (c->>'present_days')::numeric, paid_leave_days = (c->>'paid_leave_days')::numeric,
      lop_days = (c->>'lop_days')::numeric, unverified_days = 0, per_day = (c->>'per_day')::numeric, lop_deduction = (c->>'lop_deduction')::numeric, incentives = (c->>'incentives')::numeric,
      gross = base_salary + (c->>'incentives')::numeric, net = greatest(0, base_salary + (c->>'incentives')::numeric - (c->>'lop_deduction')::numeric - other_deductions),
      status = 'Verified', verified_by_name = nm, verified_at = now(), updated_at = now() WHERE id = p_id RETURNING * INTO p;
  ELSIF p_to = 'Approved' AND p.status = 'Verified' THEN
    IF lvl <> 'superadmin' THEN RAISE EXCEPTION 'The superadmin approves payroll'; END IF;
    UPDATE public.attendance_payroll SET status = 'Approved', approved_by_name = nm, approved_at = now(), updated_at = now() WHERE id = p_id RETURNING * INTO p;
  ELSIF p_to = 'Paid' AND p.status = 'Approved' THEN
    IF lvl <> 'superadmin' THEN RAISE EXCEPTION 'The superadmin marks payroll as paid'; END IF;
    IF length(trim(coalesce(p_reference, ''))) < 2 THEN RAISE EXCEPTION 'Enter the payment reference'; END IF;
    UPDATE public.attendance_payroll SET status = 'Paid', paid_at = now(), paid_reference = trim(p_reference), updated_at = now() WHERE id = p_id RETURNING * INTO p;
  ELSIF p_to = 'Draft' AND p.status IN ('Verified', 'Approved') THEN
    IF lvl <> 'superadmin' AND p.status <> 'Verified' THEN RAISE EXCEPTION 'Only the superadmin can reopen an approved payroll'; END IF;
    UPDATE public.attendance_payroll SET status = 'Draft', verified_by_name = NULL, verified_at = NULL, approved_by_name = NULL, approved_at = NULL, updated_at = now() WHERE id = p_id RETURNING * INTO p;
  ELSE RAISE EXCEPTION 'A % payroll cannot move to %', p.status, p_to;
  END IF;
  RETURN p;
END $$;

-- ───────────────────────── rules, leave types and holidays (superadmin; platform admins manage their holidays) ─────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_rules_save(p_division text, p_rules jsonb) RETURNS public.attendance_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.attendance_rules;
BEGIN
  IF public.attendance_me_level() <> 'superadmin' THEN RAISE EXCEPTION 'Only the superadmin changes attendance rules'; END IF;
  IF p_division NOT IN ('all', 'education', 'rimi', 'trade', 'digital') THEN RAISE EXCEPTION 'Unknown platform'; END IF;
  INSERT INTO public.attendance_rules(division) VALUES (p_division) ON CONFLICT DO NOTHING;
  UPDATE public.attendance_rules SET
    work_start = coalesce((p_rules->>'work_start')::time, work_start), work_end = coalesce((p_rules->>'work_end')::time, work_end),
    grace_minutes = coalesce((p_rules->>'grace_minutes')::int, grace_minutes), full_day_hours = coalesce((p_rules->>'full_day_hours')::numeric, full_day_hours),
    half_day_hours = coalesce((p_rules->>'half_day_hours')::numeric, half_day_hours),
    weekly_off = coalesce(ARRAY(SELECT jsonb_array_elements_text(p_rules->'weekly_off'))::int[], weekly_off),
    pay_basis = coalesce(p_rules->>'pay_basis', pay_basis), lop_factor = coalesce((p_rules->>'lop_factor')::numeric, lop_factor),
    late_to_half_day = coalesce((p_rules->>'late_to_half_day')::int, late_to_half_day), timezone = coalesce(p_rules->>'timezone', timezone), updated_at = now()
  WHERE division = p_division RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_leave_type_save(p_type jsonb) RETURNS public.attendance_leave_types
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.attendance_leave_types;
BEGIN
  IF public.attendance_me_level() <> 'superadmin' THEN RAISE EXCEPTION 'Only the superadmin changes leave limits'; END IF;
  IF coalesce(p_type->>'code', '') !~ '^[A-Z0-9_]{1,12}$' THEN RAISE EXCEPTION 'The code must be 1-12 capital letters or digits'; END IF;
  INSERT INTO public.attendance_leave_types(code, name, kind, annual_quota, monthly_max_hours, is_paid, on_exceed, is_active)
    VALUES (p_type->>'code', coalesce(nullif(p_type->>'name', ''), p_type->>'code'), coalesce(p_type->>'kind', 'full_day'), coalesce((p_type->>'annual_quota')::numeric, 0),
            coalesce((p_type->>'monthly_max_hours')::numeric, 0), coalesce((p_type->>'is_paid')::boolean, true), coalesce(p_type->>'on_exceed', 'lop'), coalesce((p_type->>'is_active')::boolean, true))
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, annual_quota = EXCLUDED.annual_quota, monthly_max_hours = EXCLUDED.monthly_max_hours,
    is_paid = EXCLUDED.is_paid, on_exceed = EXCLUDED.on_exceed, is_active = EXCLUDED.is_active
  RETURNING * INTO t;
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.attendance_holiday_save(p_division text, p_date date, p_name text, p_remove boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl text := public.attendance_me_level();
BEGIN
  IF lvl NOT IN ('admin', 'superadmin') THEN RAISE EXCEPTION 'Only administrators manage holidays'; END IF;
  IF lvl = 'admin' AND p_division IS DISTINCT FROM public.attendance_me_division() THEN RAISE EXCEPTION 'You can only manage your own platform''s holidays'; END IF;
  IF p_remove THEN DELETE FROM public.attendance_holidays WHERE division = p_division AND holiday_date = p_date; RETURN; END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 THEN RAISE EXCEPTION 'Enter the holiday name'; END IF;
  INSERT INTO public.attendance_holidays(division, holiday_date, name) VALUES (p_division, p_date, trim(p_name))
  ON CONFLICT (division, holiday_date) DO UPDATE SET name = EXCLUDED.name;
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'attendance_me_level()', 'attendance_me_division()', 'attendance_can_manage(uuid)', 'attendance_rules_for(text)', 'attendance_today(text)', 'attendance_is_working_day(text,date)',
    'attendance_context()', 'attendance_team()', 'attendance_clock_in(text)', 'attendance_clock_out(text)', 'attendance_mark(uuid,date,text,time,time,text)',
    'attendance_verify(date,date,uuid,boolean)', 'attendance_reopen(uuid,text)', 'attendance_leave_submit(text,date,date,text,time,time,text)', 'attendance_leave_decide(uuid,boolean,text)',
    'attendance_leave_cancel(uuid)', 'attendance_leave_balance(uuid,int)', 'attendance_incentive_add(uuid,text,text,numeric,text,text)', 'attendance_incentive_decide(uuid,boolean)',
    'attendance_incentive_remove(uuid)', 'attendance_set_salary(uuid,numeric,text,text,text,text,text)', 'attendance_payroll_generate(text,text)', 'attendance_payroll_adjust(uuid,numeric,text)',
    'attendance_payroll_advance(uuid,text,text)', 'attendance_rules_save(text,jsonb)', 'attendance_leave_type_save(jsonb)', 'attendance_holiday_save(text,date,text,boolean)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
