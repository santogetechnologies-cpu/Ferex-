-- A trade payment can never take the amount recorded for an order past the order value (same currency).
CREATE OR REPLACE FUNCTION public.guard_trade_payment_total() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; already numeric;
BEGIN
  SELECT total_amount, currency INTO o FROM public.trade_orders WHERE order_no = NEW.order_no LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF coalesce(NEW.currency, o.currency) <> o.currency THEN RETURN NEW; END IF;
  SELECT coalesce(sum(amount), 0) INTO already FROM public.trade_payments
    WHERE order_no = NEW.order_no AND currency = o.currency AND id IS DISTINCT FROM NEW.id;
  IF already + NEW.amount > o.total_amount + 0.005 THEN
    RAISE EXCEPTION 'This payment would take the amount recorded for % past the order value (% % already recorded of % %).', NEW.order_no, o.currency, already, o.currency, o.total_amount;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_trade_payment_total() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_trade_payment_total ON public.trade_payments;
CREATE TRIGGER trg_guard_trade_payment_total BEFORE INSERT ON public.trade_payments FOR EACH ROW EXECUTE FUNCTION public.guard_trade_payment_total();
