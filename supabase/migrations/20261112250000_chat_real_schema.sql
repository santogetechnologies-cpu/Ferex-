-- Chat: the app wrote to tables/columns that did not exist, so messages lived only in browsers, and any
-- signed-in user could read every message. This makes chat real and scoped:
--   * one thread per student, with their assigned counselor
--   * students see their own thread; counselors see their own threads and unassigned ones; admins see all
--   * last message / unread counters are maintained by the database, and inserts are broadcast in realtime

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_student_unique ON public.chat_conversations (student_id);

CREATE OR REPLACE FUNCTION public.chat_can_access(p_student uuid, p_counselor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_student = auth.uid() OR p_counselor = auth.uid()
    OR coalesce(public.get_auth_user_role(), '') IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'education')
    OR (coalesce(public.get_auth_user_role(), '') IN ('counselor', 'staff') AND p_counselor IS NULL)
$$;

DROP POLICY IF EXISTS "chat_conv_access" ON public.chat_conversations;
CREATE POLICY "chat_conv_access" ON public.chat_conversations FOR ALL TO authenticated
  USING (public.chat_can_access(student_id, counselor_id))
  WITH CHECK (public.chat_can_access(student_id, counselor_id));

DROP POLICY IF EXISTS "chat_msg_access" ON public.chat_messages;
CREATE POLICY "chat_msg_access" ON public.chat_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND public.chat_can_access(c.student_id, c.counselor_id)))
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND public.chat_can_access(c.student_id, c.counselor_id)));

-- Keep sender role, legacy columns and the conversation summary correct no matter which client writes.
CREATE OR REPLACE FUNCTION public.chat_before_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM public.users WHERE id = NEW.sender_id;
  NEW.sender_role := CASE WHEN r = 'student' THEN 'student' ELSE 'counselor' END;
  NEW.content := NEW.message;
  NEW.sent_at := coalesce(NEW.created_at, now());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_before_message ON public.chat_messages;
CREATE TRIGGER chat_before_message BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.chat_before_message();

CREATE OR REPLACE FUNCTION public.chat_after_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations SET
    last_message = left(NEW.message, 500), last_message_at = NEW.created_at, updated_at = now(),
    unread_count_student = unread_count_student + CASE WHEN NEW.sender_role = 'student' THEN 0 ELSE 1 END,
    unread_count_counselor = unread_count_counselor + CASE WHEN NEW.sender_role = 'student' THEN 1 ELSE 0 END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_after_message ON public.chat_messages;
CREATE TRIGGER chat_after_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.chat_after_message();

-- The counselor a student is assigned to (by email or name, as stored on the student profile).
CREATE OR REPLACE FUNCTION public.chat_counselor_for(p_student uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id FROM public.users s JOIN public.users u
    ON (lower(u.email) = lower(btrim(s.assigned_counselor)) OR lower(u.full_name) = lower(btrim(s.assigned_counselor)))
   AND u.role IN ('counselor', 'staff', 'education_admin', 'admin', 'education')
  WHERE s.id = p_student AND coalesce(btrim(s.assigned_counselor), '') <> '' LIMIT 1
$$;

-- Returns the student's thread, creating it (with their counselor) if needed. Students get only their own.
CREATE OR REPLACE FUNCTION public.ensure_chat_conversation(p_student uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student uuid := coalesce(p_student, auth.uid()); v_id uuid;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF v_student <> auth.uid() AND coalesce(public.get_auth_user_role(), '') NOT IN ('superadmin', 'super_admin', 'central', 'admin', 'education_admin', 'education', 'counselor', 'staff') THEN
    RAISE EXCEPTION 'Not allowed to open this conversation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_student AND role = 'student') THEN RAISE EXCEPTION 'Chat is for student accounts'; END IF;
  INSERT INTO public.chat_conversations (student_id, counselor_id) VALUES (v_student, public.chat_counselor_for(v_student))
  ON CONFLICT (student_id) DO UPDATE SET counselor_id = coalesce(chat_conversations.counselor_id, excluded.counselor_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ensure_chat_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_chat_conversation(uuid) TO authenticated;

-- Re-assigning a student's counselor moves their thread to the new counselor.
CREATE OR REPLACE FUNCTION public.chat_follow_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'student' AND NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
    UPDATE public.chat_conversations SET counselor_id = public.chat_counselor_for(NEW.id), updated_at = now() WHERE student_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_follow_assignment ON public.users;
CREATE TRIGGER chat_follow_assignment AFTER UPDATE OF assigned_counselor ON public.users FOR EACH ROW EXECUTE FUNCTION public.chat_follow_assignment();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
