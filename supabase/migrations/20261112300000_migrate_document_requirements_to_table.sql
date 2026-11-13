-- The configured document requirements lived only in a JSON blob because their text ids (e.g. doc-pol-1) could not
-- be stored in the uuid table. Move them into public.document_requirements with stable uuids, then drop the blob.
INSERT INTO public.document_requirements (id, country, document_name, document_type, is_required, description, processing_time, authority_fee, checklist_items, created_at, updated_at)
SELECT
  CASE WHEN (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (e->>'id')::uuid
       ELSE md5('doc-req:' || coalesce((e->>'id'), (e->>'country') || (e->>'document_name')))::uuid END,
  (e->>'country'), (e->>'document_name'), coalesce((e->>'document_type'), 'General'),
  coalesce((e->>'is_required')::boolean, true), coalesce((e->>'description'), ''), (e->>'processing_time'), (e->>'authority_fee'),
  coalesce(e->'checklist_items', '[]'::jsonb),
  coalesce((e->>'created_at')::timestamptz, now()), coalesce((e->>'updated_at')::timestamptz, now())
FROM public.system_config s, jsonb_array_elements(s.value) e
WHERE s.key = 'ferex_document_requirements_catalog' AND jsonb_typeof(s.value) = 'array'
  AND coalesce((e->>'document_name'), '') <> '' AND coalesce((e->>'country'), '') <> ''
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.system_config WHERE key = 'ferex_document_requirements_catalog';
