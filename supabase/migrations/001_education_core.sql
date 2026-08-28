-- =============================================================================
-- Migration 001: Education Core Schema, RLS Policies & Realtime
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'staff', 'counselor', 'digital', 'trade', 'rimi', 'central')),
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  passport_no TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT 'India',
  department TEXT DEFAULT '',
  assigned_counselor TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]'::jsonb,
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Universities Table
CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  logo_url TEXT DEFAULT '',
  ranking INTEGER DEFAULT 100,
  rating NUMERIC(3, 2) DEFAULT 4.5,
  programs TEXT[] DEFAULT ARRAY['Computer Science', 'Business Management'],
  tuition_range TEXT DEFAULT '₹3,50,000 / yr',
  intakes TEXT[] DEFAULT ARRAY['Fall 2026', 'Spring 2027'],
  university_fee TEXT DEFAULT '₹3,50,000',
  vfs_fee TEXT DEFAULT '₹15,000',
  agency_fee TEXT DEFAULT '₹25,000',
  course_programs JSONB DEFAULT '[]'::jsonb,
  installments JSONB DEFAULT '[]'::jsonb,
  semesters JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT 'Student',
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  university_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  course TEXT NOT NULL,
  intake TEXT NOT NULL DEFAULT 'October 2026',
  tuition_fee TEXT DEFAULT '',
  course_fee TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'NAWA Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Enrolled', 'Rejected')),
  notes TEXT DEFAULT '',
  offer_letter_url TEXT DEFAULT '',
  final_acceptance_url TEXT DEFAULT '',
  applied_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Offer Letters Table
CREATE TABLE IF NOT EXISTS public.offer_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  offer_letter_url TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Issued',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Final Acceptance Certificates Table
CREATE TABLE IF NOT EXISTS public.final_acceptance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  final_acceptance_url TEXT NOT NULL,
  file_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Student Documents Table
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '1.2 MB',
  doc_type TEXT NOT NULL DEFAULT 'Transcripts',
  document_type TEXT DEFAULT 'Transcripts',
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Pending Verification', 'Verified', 'Approved', 'Rejected', 'Re-upload Requested')),
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL DEFAULT 'Student',
  ref_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_type TEXT NOT NULL DEFAULT 'Installment Fee',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Pending Verification', 'Paid', 'Verified', 'Partial', 'Rejected', 'Refunded', 'Cancelled', 'Overdue')),
  payment_method TEXT DEFAULT 'UPI / Bank Transfer',
  utr_number TEXT DEFAULT '',
  receipt_url TEXT DEFAULT '',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  reviewer_notes TEXT DEFAULT '',
  reminder_sent_at TIMESTAMPTZ,
  refund_amount NUMERIC(12, 2) DEFAULT 0,
  refund_reason TEXT DEFAULT '',
  credit_note_no TEXT DEFAULT '',
  partial_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Paid',
  file_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Receipts Table
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  file_url TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Credit Notes Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  credit_note_no TEXT NOT NULL UNIQUE,
  original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT DEFAULT '',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  advisor_name TEXT NOT NULL DEFAULT 'Academic Counselor',
  subject TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  meeting_link TEXT DEFAULT 'https://meet.google.com/fer-exed-app',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Support Tickets & Replies
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_no TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General Query',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Chat & Messaging
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  name TEXT NOT NULL DEFAULT 'Admissions Counselor',
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_attachment BOOLEAN DEFAULT false,
  attachment_url TEXT DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Support',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Journey Stages Table
CREATE TABLE IF NOT EXISTS public.journey_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Action Required')),
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, stage_number)
);

-- 17. Visa Tracking Table
CREATE TABLE IF NOT EXISTS public.visa_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  vfs_ref_no TEXT DEFAULT 'VFS-POL-2026',
  embassy_name TEXT DEFAULT 'Polish Embassy',
  vfs_center TEXT DEFAULT 'VFS Global Center',
  appointment_date TEXT DEFAULT 'Scheduled',
  passport_no TEXT DEFAULT '',
  courier_tracking_no TEXT DEFAULT '',
  current_stage INTEGER NOT NULL DEFAULT 1,
  status_label TEXT NOT NULL DEFAULT 'VFS Processing',
  decision_outcome TEXT DEFAULT 'Pending' CHECK (decision_outcome IN ('Pending', 'Approved', 'Rejected')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. NAWA Records Table
CREATE TABLE IF NOT EXISTS public.nawa_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT DEFAULT '',
  nawa_ref_no TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL DEFAULT 'High School & Bachelor Apostille',
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Review', 'Approved', 'Rejected')),
  submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_date TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  certificate_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Pre-Departure Records Table
CREATE TABLE IF NOT EXISTS public.pre_departure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT DEFAULT '',
  university_name TEXT NOT NULL DEFAULT 'University of Warsaw',
  flight_no TEXT DEFAULT '',
  airline TEXT DEFAULT '',
  departure_date TEXT DEFAULT '',
  arrival_date TEXT DEFAULT '',
  arrival_city TEXT DEFAULT 'Warsaw, Poland',
  dorm_name TEXT DEFAULT '',
  dorm_address TEXT DEFAULT '',
  room_no TEXT DEFAULT '',
  pickup_driver TEXT DEFAULT '',
  pickup_contact TEXT DEFAULT '',
  pickup_details TEXT DEFAULT '',
  orientation_date TEXT DEFAULT '',
  clearance_status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (clearance_status IN ('Pending Verification', 'Clearance Granted', 'Departed')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_name TEXT DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT 'Staff Member',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. System Config Table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper security function: Is current user an admin or staff?
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'staff', 'counselor', 'central')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Policy: Users can view/edit their own profile; admins can view/manage all.
CREATE POLICY "Users read policy" ON public.users FOR SELECT USING (id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Users update policy" ON public.users FOR UPDATE USING (id = auth.uid() OR public.is_admin_or_staff());

-- Universities Policy: Public read, Admin write
CREATE POLICY "Universities read policy" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Universities admin write" ON public.universities FOR ALL USING (public.is_admin_or_staff());

-- Applications Policy: Students see own applications, Admins see all
CREATE POLICY "Applications student read" ON public.applications FOR SELECT USING (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Applications student insert" ON public.applications FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Applications manage" ON public.applications FOR ALL USING (public.is_admin_or_staff() OR student_id = auth.uid());

-- Documents Policy:
CREATE POLICY "Documents view" ON public.student_documents FOR SELECT USING (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Documents insert" ON public.student_documents FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Documents update" ON public.student_documents FOR UPDATE USING (student_id = auth.uid() OR public.is_admin_or_staff());

-- Payments Policy:
CREATE POLICY "Payments view" ON public.payments FOR SELECT USING (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Payments insert" ON public.payments FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin_or_staff());
CREATE POLICY "Payments update" ON public.payments FOR UPDATE USING (public.is_admin_or_staff());

-- Notifications Policy:
CREATE POLICY "Notifications own user" ON public.notifications FOR ALL USING (user_id = auth.uid() OR public.is_admin_or_staff());

-- Realtime Publication for instant UI sync
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.applications,
  public.student_documents,
  public.payments,
  public.meetings,
  public.notifications,
  public.chat_messages,
  public.support_tickets,
  public.ticket_replies;
