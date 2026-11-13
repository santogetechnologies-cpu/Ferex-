-- 1. Students could edit their own document rows directly (including marking them Verified). Only staff review.
CREATE OR REPLACE FUNCTION public.guard_student_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_education_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.student_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only upload your own documents'; END IF;
    NEW.status := 'Submitted'; NEW.reviewer_id := NULL; NEW.reviewer_notes := ''; NEW.reviewed_at := NULL;
  ELSE
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN RAISE EXCEPTION 'A document cannot be moved to another student'; END IF;
    IF NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.file_name IS DISTINCT FROM OLD.file_name THEN
      NEW.status := 'Submitted'; NEW.reviewer_id := NULL; NEW.reviewer_notes := ''; NEW.reviewed_at := NULL;
    ELSIF (NEW.status, NEW.reviewer_id, NEW.reviewer_notes, NEW.reviewed_at) IS DISTINCT FROM (OLD.status, OLD.reviewer_id, OLD.reviewer_notes, OLD.reviewed_at) THEN
      RAISE EXCEPTION 'Only staff can review documents';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_student_document ON public.student_documents;
CREATE TRIGGER trg_guard_student_document BEFORE INSERT OR UPDATE ON public.student_documents FOR EACH ROW EXECUTE FUNCTION public.guard_student_document();

-- 2. Counselors set a student's destination (it decides the fee plan); fee plan/discount changes stay admin-only.
DROP POLICY IF EXISTS "education_preferences_staff_read" ON public.education_student_preferences;
CREATE POLICY "education_preferences_staff_read" ON public.education_student_preferences FOR SELECT TO authenticated USING (public.is_education_staff());

CREATE OR REPLACE FUNCTION public.set_student_destination(p_student uuid, p_country text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text := nullif(btrim(p_country), '');
BEGIN
  IF p_student IS DISTINCT FROM auth.uid() AND NOT public.is_education_staff() THEN RAISE EXCEPTION 'Not allowed to change this student''s destination'; END IF;
  IF c IS NULL THEN RAISE EXCEPTION 'Choose a destination country'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_student AND role = 'student') THEN RAISE EXCEPTION 'Student not found'; END IF;
  INSERT INTO public.education_student_preferences (student_id, country, updated_at) VALUES (p_student, c, now())
  ON CONFLICT (student_id) DO UPDATE SET country = excluded.country, updated_at = now();
  UPDATE public.users SET country = c, target_country = c, destination_country = c, updated_at = now() WHERE id = p_student;
END $$;
REVOKE ALL ON FUNCTION public.set_student_destination(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_destination(uuid, text) TO authenticated, service_role;
