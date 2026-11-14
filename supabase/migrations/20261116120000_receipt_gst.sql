-- Receipts carry the GST rate of the payment, so receipts and invoices both show the CGST / SGST split.
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS tax_rate_percent numeric NOT NULL DEFAULT 0;
UPDATE public.receipts r SET tax_rate_percent = coalesce(p.tax_rate_percent, 0) FROM public.payments p WHERE p.id = r.payment_id AND r.tax_rate_percent = 0;

CREATE OR REPLACE FUNCTION public.issue_education_payment_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status IN ('Paid', 'Verified') AND NEW.payment_type LIKE 'education:%' THEN
    INSERT INTO public.invoices (student_id, payment_id, invoice_no, description, amount, currency, status, tax_rate_percent)
      VALUES (NEW.student_id, NEW.id, 'EDU-INV-' || NEW.id, NEW.title, NEW.amount, NEW.currency, 'Paid', NEW.tax_rate_percent) ON CONFLICT (invoice_no) DO NOTHING;
    INSERT INTO public.receipts (student_id, payment_id, receipt_no, description, amount, currency, payment_method, tax_rate_percent)
      VALUES (NEW.student_id, NEW.id, 'EDU-RCP-' || NEW.id, NEW.title, NEW.amount, NEW.currency, NEW.payment_method, coalesce(NEW.tax_rate_percent, 0)) ON CONFLICT (receipt_no) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;
