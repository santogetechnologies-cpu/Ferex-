-- Education admins can feature up to three destination countries. Rank 1 is shown first in student
-- university selection and on the landing page.
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS featured_rank smallint CHECK (featured_rank IS NULL OR featured_rank BETWEEN 1 AND 3);

CREATE UNIQUE INDEX IF NOT EXISTS destinations_featured_rank_unique
  ON public.destinations (featured_rank) WHERE featured_rank IS NOT NULL;

-- Sets the featured countries in order (first id = rank 1) and clears every other country, atomically.
CREATE OR REPLACE FUNCTION public.set_featured_destinations(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[] := coalesce(p_ids, '{}');
BEGIN
  IF auth.role() <> 'service_role' AND coalesce(public.ferex_role(), '') NOT IN ('central', 'superadmin', 'super_admin', 'admin', 'education_admin', 'education') THEN
    RAISE EXCEPTION 'Only education administrators can change featured countries';
  END IF;
  IF cardinality(ids) > 3 THEN RAISE EXCEPTION 'You can feature at most three countries'; END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(ids) x) <> cardinality(ids) THEN RAISE EXCEPTION 'A country can only be featured once'; END IF;
  UPDATE public.destinations SET featured_rank = NULL WHERE featured_rank IS NOT NULL;
  UPDATE public.destinations d SET featured_rank = o.ord::smallint, updated_at = now()
    FROM unnest(ids) WITH ORDINALITY AS o(id, ord) WHERE d.id = o.id;
END $$;
REVOKE ALL ON FUNCTION public.set_featured_destinations(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_featured_destinations(uuid[]) TO authenticated, service_role;
