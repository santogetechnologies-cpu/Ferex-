-- Deleting a student removes their applications. Payments are financial records and must survive: only the link to the application is cleared.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_billing_application_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_billing_application_id_fkey FOREIGN KEY (billing_application_id) REFERENCES public.applications(id) ON DELETE SET NULL;
