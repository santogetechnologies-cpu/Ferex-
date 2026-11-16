-- Staff review documents; they do not replace a student's file, and a document sent back for re-upload cannot be approved
-- until the student has uploaded a corrected copy (which puts it back to "Submitted").
do $$ declare f text; old text; new text; begin
  select pg_get_functiondef(p.oid) into f from pg_proc p where p.proname = 'guard_student_document' and p.pronamespace = 'public'::regnamespace;
  old := E'IF public.is_education_staff() THEN RETURN NEW; END IF;';
  new := E'IF public.is_education_staff() THEN\n    IF TG_OP = ''UPDATE'' THEN\n      IF NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.file_name IS DISTINCT FROM OLD.file_name THEN RAISE EXCEPTION ''Only the student can replace a document''; END IF;\n      IF lower(coalesce(OLD.status, '''')) ~ ''(reject|re-upload|reupload)'' AND lower(coalesce(NEW.status, '''')) ~ ''(approve|verified)'' THEN RAISE EXCEPTION ''The student has not uploaded a corrected copy yet''; END IF;\n    END IF;\n    RETURN NEW;\n  END IF;';
  if position(old in f) = 0 then raise exception 'guard text changed'; end if;
  execute replace(f, old, new);
end $$;
