-- Fixes "Could not find the 'not_interested_at' column of 'education_leads'": the column, its index and the trigger that
-- stamps it when an enquiry is marked Not Interested (and clears it when it is reopened). The automatic 14-day deletion job
-- from 20261121100000 is deliberately not part of this migration.
ALTER TABLE public.education_leads ADD COLUMN IF NOT EXISTS not_interested_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_education_leads_not_interested_at ON public.education_leads(not_interested_at) WHERE status = 'Not Interested';

CREATE OR REPLACE FUNCTION public.sync_education_lead_not_interested() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Not Interested' THEN
    IF OLD.status IS DISTINCT FROM 'Not Interested' OR OLD.not_interested_at IS NULL OR NEW.not_interested_at IS NULL THEN
      NEW.not_interested_at := COALESCE(NEW.not_interested_at, NOW());
    END IF;
  ELSE
    NEW.not_interested_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_education_lead_not_interested ON public.education_leads;
CREATE TRIGGER trg_sync_education_lead_not_interested BEFORE INSERT OR UPDATE OF status, not_interested_at ON public.education_leads FOR EACH ROW EXECUTE FUNCTION public.sync_education_lead_not_interested();
NOTIFY pgrst, 'reload schema';
