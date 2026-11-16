-- ============================================================================
-- Migration: 20261121110000_chat_sender_role_admin_counselor_student.sql
-- Description: Ensures chat messages record the actual sender role
--              ('admin', 'counselor', or 'student') based on the sender's
--              actual user profile role, instead of grouping admins as counselors.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.chat_before_message() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM public.users WHERE id = NEW.sender_id;
  NEW.sender_role := CASE
    WHEN lower(coalesce(r, '')) = 'student' THEN 'student'
    WHEN lower(coalesce(r, '')) = 'counselor' THEN 'counselor'
    ELSE 'admin'
  END;
  NEW.content := NEW.message;
  NEW.sent_at := coalesce(NEW.created_at, now());
  RETURN NEW;
END $$;

-- Update existing messages in public.chat_messages so their sender_role matches the sender's actual role
UPDATE public.chat_messages m
SET sender_role = CASE
  WHEN lower(coalesce(u.role, '')) = 'student' THEN 'student'
  WHEN lower(coalesce(u.role, '')) = 'counselor' THEN 'counselor'
  ELSE 'admin'
END
FROM public.users u
WHERE m.sender_id = u.id;
