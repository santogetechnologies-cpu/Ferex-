-- 1) Package GST: packages may carry gst {enabled, rate, mode: inclusive|exclusive}. Packages without it behave as before.
--    Exclusive GST is added on top of instalment/registration amounts; inclusive keeps the price and records the tax inside it.
DO $$
DECLARE def text; excl text;
BEGIN
  def := pg_get_functiondef('public.guard_education_payment'::regproc);
  IF position('''gst''' in def) > 0 THEN RETURN; END IF;
  excl := '(1 + CASE WHEN coalesce((pkg->''gst''->>''enabled'')::boolean, false) AND coalesce(pkg->''gst''->>''mode'', ''inclusive'') = ''exclusive'' THEN coalesce((pkg->''gst''->>''rate'')::numeric, 0) / 100 ELSE 0 END)';
  def := replace(def, '''amount'', (inst->>''amount'')::numeric,', '''amount'', round((inst->>''amount'')::numeric * ' || excl || ', 2),');
  def := replace(def, '''amount'', coalesce((pkg->''registration_fee''->>''amount'')::numeric, 0), ''currency'', pkg->>''currency'', ''recipient'', ''ferex'', ''stage'', 3',
                 '''amount'', round(coalesce((pkg->''registration_fee''->>''amount'')::numeric, 0) * ' || excl || ', 2), ''currency'', pkg->>''currency'', ''recipient'', ''ferex'', ''stage'', 3');
  def := replace(def, 'coalesce((inst->>''tax_rate_percent'')::numeric, (pkg->>''tax_rate_percent'')::numeric, 0)',
                 'CASE WHEN pkg ? ''gst'' THEN (CASE WHEN coalesce((pkg->''gst''->>''enabled'')::boolean, false) THEN coalesce((pkg->''gst''->>''rate'')::numeric, 0) ELSE 0 END) ELSE coalesce((inst->>''tax_rate_percent'')::numeric, (pkg->>''tax_rate_percent'')::numeric, 0) END');
  def := replace(def, '''tax_rate_percent'', coalesce((pkg->>''tax_rate_percent'')::numeric, 0));',
                 '''tax_rate_percent'', CASE WHEN pkg ? ''gst'' THEN (CASE WHEN coalesce((pkg->''gst''->>''enabled'')::boolean, false) THEN coalesce((pkg->''gst''->>''rate'')::numeric, 0) ELSE 0 END) ELSE coalesce((pkg->>''tax_rate_percent'')::numeric, 0) END);');
  IF position('''gst''' in def) = 0 THEN RAISE EXCEPTION 'guard patch did not apply'; END IF;
  EXECUTE def;
END $$;

-- 2) Poland packages as persistent records (appended; existing packages untouched, idempotent by id).
DO $$
DECLARE cur jsonb; add jsonb; now_ts text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  svc jsonb := '[{"id":"sworn_translation","title":"Sworn Translation of Academic Documents","is_included":true},{"id":"nawa_legalization","title":"NAWA Academic Recognition & Legalization","is_included":true},{"id":"university_application","title":"University Application & Admission Letter","is_included":true},{"id":"vfs_booking","title":"VFS Visa Appointment Booking","is_included":true},{"id":"visa_documentation","title":"Schengen D-Type Student Visa Dossier","is_included":true}]';
BEGIN
  SELECT coalesce(value, '[]'::jsonb) INTO cur FROM public.system_config WHERE key = 'ferex_country_fee_packages';
  IF cur IS NULL THEN cur := '[]'::jsonb; END IF;
  add := jsonb_build_array(
    jsonb_build_object('id','pkg-poland-basic','country','Poland','name','Poland Basic','specialization','Admission & Visa Support',
      'description','Core admission, legalization and visa support for Poland.','is_active',true,'total_amount',34999,'currency','INR',
      'covered_services',svc,'benefits',jsonb_build_array('University admission support','Document legalization','Visa dossier preparation'),
      'deliverables',jsonb_build_array('Admission letter','Legalized documents','Visa file'),
      'registration_fee',jsonb_build_object('enabled',true,'amount',10000,'included',true),
      'gst',jsonb_build_object('enabled',false,'rate',18,'mode','inclusive'),'tax_rate_percent',0,
      'installments',jsonb_build_array(
        jsonb_build_object('id','i1','title','Instalment 1 – Admission','amount',12500,'stage_trigger',5,'timing','before','due_description','Before Country Legalization'),
        jsonb_build_object('id','i2','title','Instalment 2 – Visa','amount',12499,'stage_trigger',9,'timing','before','due_description','Before Visa Application')),
      'terms_note','Package fees are non-refundable once legalization or visa processes are initiated.','created_at',now_ts,'updated_at',now_ts),
    jsonb_build_object('id','pkg-poland-plus','country','Poland','name','Poland Plus','specialization','Admission, Visa & Pre-Departure',
      'description','Basic plus pre-departure and arrival support.','is_active',true,'total_amount',54999,'currency','INR',
      'covered_services',svc,'benefits',jsonb_build_array('Everything in Basic','Pre-departure briefing','Accommodation guidance'),
      'deliverables',jsonb_build_array('Admission letter','Legalized documents','Visa file','Pre-departure kit'),
      'registration_fee',jsonb_build_object('enabled',true,'amount',10000,'included',true),
      'gst',jsonb_build_object('enabled',true,'rate',18,'mode','inclusive'),'tax_rate_percent',18,
      'installments',jsonb_build_array(
        jsonb_build_object('id','i1','title','Instalment 1 – Admission','amount',22500,'stage_trigger',5,'timing','before','due_description','Before Country Legalization'),
        jsonb_build_object('id','i2','title','Instalment 2 – Visa','amount',22499,'stage_trigger',9,'timing','before','due_description','Before Visa Application')),
      'terms_note','GST is included in the package price. Fees are non-refundable once legalization or visa processes are initiated.','created_at',now_ts,'updated_at',now_ts),
    jsonb_build_object('id','pkg-poland-premium','country','Poland','name','Poland Premium','specialization','End-to-End Concierge',
      'description','Complete concierge support from admission to arrival.','is_active',true,'total_amount',94999,'currency','INR',
      'covered_services',svc,'benefits',jsonb_build_array('Everything in Plus','Dedicated case manager','Priority processing'),
      'deliverables',jsonb_build_array('Admission letter','Legalized documents','Visa file','Pre-departure kit','Arrival support'),
      'registration_fee',jsonb_build_object('enabled',true,'amount',10000,'included',true),
      'gst',jsonb_build_object('enabled',false,'rate',18,'mode','inclusive'),'tax_rate_percent',0,
      'installments',jsonb_build_array(
        jsonb_build_object('id','i1','title','Instalment 1 – Admission','amount',42500,'stage_trigger',5,'timing','before','due_description','Before Country Legalization'),
        jsonb_build_object('id','i2','title','Instalment 2 – Visa','amount',42499,'stage_trigger',9,'timing','before','due_description','Before Visa Application')),
      'terms_note','Package fees are non-refundable once legalization or visa processes are initiated.','created_at',now_ts,'updated_at',now_ts));
  cur := (SELECT coalesce(jsonb_agg(e), '[]'::jsonb) FROM jsonb_array_elements(cur) e WHERE e->>'id' NOT IN ('pkg-poland-basic','pkg-poland-plus','pkg-poland-premium')) || add;
  INSERT INTO public.system_config(key, value, updated_at) VALUES ('ferex_country_fee_packages', cur, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END $$;
