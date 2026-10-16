-- Ensure support_tickets table has division, student_name, user_name, user_email, and description columns
ALTER TABLE IF EXISTS public.support_tickets
  ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'Education',
  ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'Unassigned';

-- Ensure realtime publication includes support_tickets
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
