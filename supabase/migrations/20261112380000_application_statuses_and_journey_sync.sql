-- 1. The app uses four application statuses the database rejected, so choosing them failed.
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check CHECK (status IN (
  'Draft', 'Submitted', 'Legalization Lodged', 'Legalization Reviewed', 'Legalization Cleared',
  'NAWA Review', 'NAWA Submitted', 'NAWA Approved', 'Under Review', 'Offer Issued', 'Accepted',
  'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Visa Rejected', 'Approved',
  'Enrolled', 'Closed', 'Rejected', 'Withdrawn'));

-- 2. The student journey follows the application on the server. Students cannot write journey stages themselves,
-- so their own actions (applying, accepting an offer) used to "advance" the journey only in their browser.
CREATE OR REPLACE FUNCTION public.set_workflow_stage(p_student uuid, p_stage integer, p_status text, p_notes text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE names text[] := ARRAY['Lead inquiry', 'Service agreement', 'Advanced registration', 'Document review', 'Country legalization',
  'University application', 'Offer letter', 'University tuition', 'Visa application', 'Visa decision', 'Pre-departure', 'Enrollment'];
BEGIN
  INSERT INTO public.education_workflow_progress (student_id, stage_number, stage_name, status, notes, completed_at)
  VALUES (p_student, p_stage, names[p_stage], p_status, coalesce(p_notes, ''), CASE WHEN p_status = 'Completed' THEN now() END)
  ON CONFLICT (student_id, stage_number) DO UPDATE SET
    status = CASE WHEN education_workflow_progress.status = 'Completed' AND excluded.status <> 'Completed' THEN education_workflow_progress.status ELSE excluded.status END,
    notes = CASE WHEN excluded.notes <> '' THEN excluded.notes ELSE education_workflow_progress.notes END,
    completed_at = CASE WHEN excluded.status = 'Completed' THEN coalesce(education_workflow_progress.completed_at, now()) ELSE education_workflow_progress.completed_at END;
END $$;
REVOKE ALL ON FUNCTION public.set_workflow_stage(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_workflow_stage(uuid, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_workflow_from_application() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('Draft', 'Rejected', 'Withdrawn', 'Closed') THEN
    PERFORM public.set_workflow_stage(NEW.student_id, 6, 'Completed', 'Application submitted');
  END IF;
  IF NEW.status = 'Offer Issued' THEN PERFORM public.set_workflow_stage(NEW.student_id, 7, 'In Progress', 'Offer letter issued'); END IF;
  IF NEW.status IN ('Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Visa Rejected', 'Enrolled') THEN
    PERFORM public.set_workflow_stage(NEW.student_id, 7, 'Completed', 'Offer accepted');
    PERFORM public.set_workflow_stage(NEW.student_id, 8, 'In Progress', 'Pay tuition directly to the university');
  END IF;
  IF NEW.status IN ('Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Visa Rejected', 'Enrolled') THEN
    PERFORM public.set_workflow_stage(NEW.student_id, 8, 'Completed', 'Final acceptance issued');
  END IF;
  IF NEW.status = 'Visa Processing' THEN PERFORM public.set_workflow_stage(NEW.student_id, 9, 'In Progress', 'Visa application in progress'); END IF;
  IF NEW.status IN ('Visa Approved', 'Enrolled') THEN
    PERFORM public.set_workflow_stage(NEW.student_id, 9, 'Completed', 'Visa filed');
    PERFORM public.set_workflow_stage(NEW.student_id, 10, 'Completed', 'Visa approved');
    PERFORM public.set_workflow_stage(NEW.student_id, 11, 'In Progress', 'Pre-departure');
  END IF;
  IF NEW.status = 'Visa Rejected' THEN
    PERFORM public.set_workflow_stage(NEW.student_id, 9, 'Completed', 'Visa filed');
    PERFORM public.set_workflow_stage(NEW.student_id, 10, 'In Progress', 'Visa refused. Contact your counselor about an appeal.');
  END IF;
  IF NEW.status = 'Enrolled' THEN PERFORM public.set_workflow_stage(NEW.student_id, 12, 'Completed', 'Enrolled'); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_workflow_from_application ON public.applications;
CREATE TRIGGER trg_sync_workflow_from_application AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_workflow_from_application();
