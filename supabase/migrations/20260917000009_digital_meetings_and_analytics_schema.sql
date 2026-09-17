-- Migration: 20260917000009_digital_meetings_and_analytics_schema.sql
-- Description: Extends digital_meetings table with comprehensive fields and ensures RLS policies for pure Supabase operations.

CREATE TABLE IF NOT EXISTS public.digital_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  host_staff_name TEXT DEFAULT '',
  host_staff_email TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_display TEXT DEFAULT '',
  date_display DATE DEFAULT CURRENT_DATE,
  platform TEXT DEFAULT 'Google Meet',
  meeting_type TEXT DEFAULT 'Discovery Call' CHECK (meeting_type IN ('Discovery Call', 'Sprint Review', 'Architecture Review', 'Deliverable Sign-off', 'Client Demo', 'General Meeting')),
  meeting_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
  agenda TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.digital_meetings
  ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_staff_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_staff_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS time_display TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_display DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'Google Meet',
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'Discovery Call',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

ALTER TABLE public.digital_meetings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "digital_meetings_all" ON public.digital_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
