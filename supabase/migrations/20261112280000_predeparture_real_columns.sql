-- The app saves one pre-departure record per student, but the table was shaped like an item checklist
-- (required item_key/title, no unique student, none of the fields the app writes), so every save failed and a JSON
-- copy in system_config silently stood in for it.
ALTER TABLE public.pre_departure_checklists ALTER COLUMN item_key DROP NOT NULL;
ALTER TABLE public.pre_departure_checklists ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.pre_departure_checklists
  ADD COLUMN IF NOT EXISTS flight_booked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flight_details text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS airport_pickup_opted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dorm_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dorm_details text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS insurance_purchased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forex_card_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sim_card_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS luggage_packed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contacts_saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS briefing_attended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overall_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS pre_departure_student_unique ON public.pre_departure_checklists (student_id);
