-- ============================================================================
-- Migration: 20261121100000_auto_delete_not_interested_enquiries.sql
-- Description: Automatic 14-day deletion rule exclusively for Student Enquiries
--              marked as "Not Interested". Includes database column, trigger,
--              safe deletion procedure, and pg_cron hourly scheduled job.
-- ============================================================================

-- 1. Add not_interested_at timestamp column to public.education_leads if not already present
ALTER TABLE public.education_leads
  ADD COLUMN IF NOT EXISTS not_interested_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_education_leads_not_interested_at
  ON public.education_leads(not_interested_at)
  WHERE status = 'Not Interested';

-- 2. Trigger function to manage not_interested_at lifecycle:
--    - When status is set to 'Not Interested', records the exact date and time.
--    - If status changes away from 'Not Interested', resets timestamp to NULL (cancels deletion).
--    - If status is changed back to 'Not Interested' later, starts a brand new 14-day period.
CREATE OR REPLACE FUNCTION public.sync_education_lead_not_interested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Not Interested' THEN
    -- If transitioning to Not Interested from another status, or if timestamp wasn't set, start new 14-day period
    IF OLD.status IS DISTINCT FROM 'Not Interested' OR OLD.not_interested_at IS NULL OR NEW.not_interested_at IS NULL THEN
      NEW.not_interested_at := COALESCE(NEW.not_interested_at, NOW());
    END IF;
  ELSE
    -- If status changed to any other status, cancel the scheduled deletion
    NEW.not_interested_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_education_lead_not_interested ON public.education_leads;
CREATE TRIGGER trg_sync_education_lead_not_interested
  BEFORE INSERT OR UPDATE OF status, not_interested_at ON public.education_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_education_lead_not_interested();

-- 3. Safe backend deletion procedure:
--    - ONLY deletes from public.education_leads
--    - ONLY where status = 'Not Interested'
--    - ONLY where not_interested_at has passed the 14-day mark (now() - interval '14 days')
--    - Explicit safety guard: NEVER deletes converted/enrolled leads
CREATE OR REPLACE FUNCTION public.delete_expired_not_interested_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.education_leads
    WHERE status = 'Not Interested'
      AND not_interested_at IS NOT NULL
      AND not_interested_at <= NOW() - INTERVAL '14 days'
      AND converted_student_id IS NULL
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_not_interested_leads() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_expired_not_interested_leads() TO authenticated, service_role;

-- 4. Hourly backend scheduled process via pg_cron:
--    Runs automatically in the background even if nobody visits the website or opens the page.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('purge-not-interested-enquiries')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-not-interested-enquiries');
    PERFORM cron.schedule(
      'purge-not-interested-enquiries',
      '0 * * * *', -- Run every hour at minute 0
      'SELECT public.delete_expired_not_interested_leads()'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron notice: %', SQLERRM;
  END;
END $$;
