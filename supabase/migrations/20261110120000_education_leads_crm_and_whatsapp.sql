-- Migration: 20261110120000_education_leads_crm_and_whatsapp.sql
-- Description: Creates education_leads, education_lead_activities, and grants permissions for Student Enquiries CRM & WhatsApp Automation

CREATE TABLE IF NOT EXISTS public.education_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_country TEXT,
  degree_level TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'New Lead',
  tags TEXT[] DEFAULT '{}'::TEXT[],
  assigned_counselor_id UUID,
  assigned_counselor_name TEXT,
  assigned_counselor_email TEXT,
  assigned_at TIMESTAMPTZ,
  source TEXT DEFAULT 'Landing Page',
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMPTZ,
  converted_student_id UUID,
  converted_at TIMESTAMPTZ,
  converted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.education_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  performed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.education_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lead_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can submit enquiries" ON public.education_leads;
DROP POLICY IF EXISTS "Education staff and admin have full access to leads" ON public.education_leads;
DROP POLICY IF EXISTS "Public can insert lead activities" ON public.education_lead_activities;
DROP POLICY IF EXISTS "Education staff and admin have full access to activities" ON public.education_lead_activities;

-- RLS Policies
CREATE POLICY "Public can submit enquiries"
  ON public.education_leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Education staff and admin have full access to leads"
  ON public.education_leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert lead activities"
  ON public.education_lead_activities
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Education staff and admin have full access to activities"
  ON public.education_lead_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Explicit Grants
GRANT ALL ON TABLE public.education_leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.education_lead_activities TO anon, authenticated, service_role;

-- Indexing for fast CRM lookups
CREATE INDEX IF NOT EXISTS idx_education_leads_status ON public.education_leads(status);
CREATE INDEX IF NOT EXISTS idx_education_leads_assigned ON public.education_leads(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_education_leads_phone ON public.education_leads(phone);
CREATE INDEX IF NOT EXISTS idx_education_leads_created ON public.education_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_education_lead_acts_lead ON public.education_lead_activities(lead_id);
