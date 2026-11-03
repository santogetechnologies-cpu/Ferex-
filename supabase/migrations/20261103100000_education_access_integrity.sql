BEGIN;

-- Public signup metadata and email spelling never confer administrator access.
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'student';
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users(id,email,full_name,role,department,phone,status,created_at,updated_at)
  VALUES (NEW.id, NEW.email,
    coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)),
    coalesce(nullif(NEW.raw_app_meta_data->>'role',''),'student'),
    coalesce(NEW.raw_user_meta_data->>'department','General'),
    coalesce(NEW.raw_user_meta_data->>'phone',''),'active',now(),now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_education_application_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.education_finance_admin() OR public.get_auth_user_role() IN ('staff','counselor') OR auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.student_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Applications must belong to the signed-in student'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('Draft','Submitted') OR nullif(NEW.offer_letter_url,'') IS NOT NULL OR nullif(NEW.final_acceptance_url,'') IS NOT NULL THEN
      RAISE EXCEPTION 'Students cannot issue admission offers or approve their own application';
    END IF;
  ELSE
    IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.offer_letter_url IS DISTINCT FROM OLD.offer_letter_url OR NEW.final_acceptance_url IS DISTINCT FROM OLD.final_acceptance_url THEN
      RAISE EXCEPTION 'Only admissions staff may change official admission documents';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'Draft' AND NEW.status = 'Submitted') OR
      (OLD.status = 'Offer Issued' AND NEW.status IN ('Accepted','Rejected')) OR
      (NEW.status = 'Withdrawn' AND OLD.status NOT IN ('Enrolled','Closed'))
    ) THEN RAISE EXCEPTION 'Only admissions staff may approve application and visa milestones'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER education_application_status_guard BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_education_application_status();

COMMIT;
