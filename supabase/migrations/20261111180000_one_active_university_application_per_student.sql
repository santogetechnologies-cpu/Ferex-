-- ============================================================================
-- Migration: 20261111180000_one_active_university_application_per_student.sql
-- Description: Enforces the business rule: One Active University Application Per Student.
--              1. A student can apply to only ONE university at a time.
--              2. Once submitted, they cannot apply to another university while active.
--              3. To apply to another university, they must first withdraw.
--              4. After withdrawal, a new application can be submitted.
--              5. Withdrawn applications remain preserved in application history.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_one_active_application_per_student()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_active_id UUID;
  v_existing_uni TEXT;
BEGIN
  -- Only validate if student_id is set and not a placeholder application
  IF NEW.student_id IS NOT NULL 
     AND NEW.university_name IS NOT NULL 
     AND lower(TRIM(NEW.university_name)) NOT LIKE '%pending university%' 
     AND lower(TRIM(NEW.university_name)) <> 'not set'
     AND NEW.status NOT IN ('Withdrawn', 'Rejected') THEN

    SELECT id, university_name INTO v_existing_active_id, v_existing_uni
    FROM public.applications
    WHERE student_id = NEW.student_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('Withdrawn', 'Rejected')
      AND university_name IS NOT NULL
      AND lower(TRIM(university_name)) NOT LIKE '%pending university%'
      AND lower(TRIM(university_name)) <> 'not set'
    LIMIT 1;

    IF v_existing_active_id IS NOT NULL THEN
      RAISE EXCEPTION 'A student can apply to only ONE university at a time. Active application exists for % (ID: %). Please withdraw your existing application before applying to another university.', v_existing_uni, v_existing_active_id
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_one_active_application ON public.applications;
CREATE TRIGGER trg_check_one_active_application
  BEFORE INSERT OR UPDATE OF status, university_name, student_id
  ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_one_active_application_per_student();
