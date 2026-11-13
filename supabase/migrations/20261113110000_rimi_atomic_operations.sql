-- Rimi: order, payment and stock operations run as single database transactions so Admin and Warehouse always
-- see the same numbers (previously each browser patched its own cache and could double-deduct stock).

CREATE SEQUENCE IF NOT EXISTS public.rimi_order_no_seq;
CREATE SEQUENCE IF NOT EXISTS public.rimi_payment_no_seq;

-- Stock movements record which hub they happened in, so a hub's history shows only that hub.
UPDATE public.rimi_stock_movements m SET warehouse_id = b.warehouse_id
  FROM public.rimi_inventory_batches b WHERE m.batch_id = b.id AND m.warehouse_id IS NULL;
CREATE OR REPLACE FUNCTION public.rimi_movement_set_warehouse() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.warehouse_id IS NULL AND NEW.batch_id IS NOT NULL THEN
    SELECT warehouse_id INTO NEW.warehouse_id FROM public.rimi_inventory_batches WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rimi_movement_warehouse ON public.rimi_stock_movements;
CREATE TRIGGER trg_rimi_movement_warehouse BEFORE INSERT ON public.rimi_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.rimi_movement_set_warehouse();

-- ── Sales orders ────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rimi_create_sales_order(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cust public.rimi_customers%ROWTYPE; v_prod public.rimi_products%ROWTYPE; b public.rimi_inventory_batches%ROWTYPE;
  v_id uuid := gen_random_uuid(); v_no text; v_total numeric := 0; it jsonb; v_qty numeric; v_price numeric;
  v_need numeric; v_take numeric; v_batch uuid; v_row public.rimi_sales_orders%ROWTYPE;
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO v_cust FROM public.rimi_customers WHERE id = nullif(p->>'customer_id', '')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a customer for the order'; END IF;
  IF jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Add at least one product to the order'; END IF;
  v_no := 'SO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rimi_order_no_seq')::text, 5, '0');

  INSERT INTO public.rimi_sales_orders (id, order_no, customer_id, customer_name, customer_type, assigned_staff_name,
    total_amount, paid_amount, balance_amount, order_status, payment_status, delivery_date, delivery_address, territory, notes)
  VALUES (v_id, v_no, v_cust.id, v_cust.business_name, v_cust.customer_type,
    coalesce(nullif(p->>'assigned_staff_name', ''), v_cust.assigned_staff_name, ''), 0, 0, 0, 'Confirmed', 'Unpaid',
    coalesce(nullif(p->>'delivery_date', '')::date, current_date + 2),
    coalesce(nullif(p->>'delivery_address', ''), v_cust.address, v_cust.city, ''),
    coalesce(nullif(p->>'territory', ''), v_cust.territory, ''), coalesce(p->>'notes', ''));

  FOR it IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
    v_qty := coalesce(nullif(it->>'quantity', '')::numeric, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
    SELECT * INTO v_prod FROM public.rimi_products WHERE id = nullif(it->>'product_id', '')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected product no longer exists'; END IF;
    v_price := coalesce(nullif(it->>'unit_price', '')::numeric, v_prod.unit_price);
    v_batch := nullif(it->>'batch_id', '')::uuid;
    v_need := v_qty;
    FOR b IN SELECT * FROM public.rimi_inventory_batches
        WHERE product_id = v_prod.id AND quantity > 0 AND expiry_date > current_date AND (v_batch IS NULL OR id = v_batch)
        ORDER BY expiry_date, created_at FOR UPDATE LOOP
      EXIT WHEN v_need <= 0;
      v_take := least(b.quantity, v_need);
      UPDATE public.rimi_inventory_batches SET quantity = quantity - v_take,
        status = CASE WHEN quantity - v_take <= 0 THEN 'Depleted' WHEN quantity - v_take <= 20 THEN 'Low Stock' ELSE status END,
        updated_at = now() WHERE id = b.id;
      INSERT INTO public.rimi_order_items (order_id, product_id, product_name, batch_id, batch_no, quantity, unit, unit_price, total_price, total_line_amount)
        VALUES (v_id, v_prod.id, v_prod.name, b.id, b.batch_no, v_take, v_prod.unit, v_price, v_take * v_price, v_take * v_price);
      INSERT INTO public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, order_id, reference_no, warehouse_id, performed_by, notes)
        VALUES (b.id, v_prod.id, 'Dispatch', -v_take, b.quantity - v_take, v_id, v_no, b.warehouse_id, coalesce(nullif(p->>'performed_by', ''), 'Staff'), 'Sales order ' || v_no);
      v_total := v_total + v_take * v_price;
      v_need := v_need - v_take;
    END LOOP;
    IF v_need > 0 THEN RAISE EXCEPTION 'Not enough stock for % (% short)', v_prod.name, v_need; END IF;
  END LOOP;

  UPDATE public.rimi_sales_orders SET total_amount = v_total, balance_amount = v_total WHERE id = v_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.rimi_restore_order_stock(p_order uuid, p_ref text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i record; v_new numeric;
BEGIN
  FOR i IN SELECT * FROM public.rimi_order_items WHERE order_id = p_order AND batch_id IS NOT NULL LOOP
    UPDATE public.rimi_inventory_batches SET quantity = quantity + i.quantity,
      status = CASE WHEN quantity + i.quantity > 20 THEN 'Active' ELSE 'Low Stock' END, updated_at = now()
      WHERE id = i.batch_id RETURNING quantity INTO v_new;
    IF FOUND THEN
      INSERT INTO public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, order_id, reference_no, performed_by, notes)
        VALUES (i.batch_id, i.product_id, 'Return', i.quantity, v_new, p_order, p_ref, 'System', 'Stock returned: ' || p_ref);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.rimi_restore_order_stock(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rimi_set_sales_order_status(p_order uuid, p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.rimi_sales_orders%ROWTYPE;
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_status NOT IN ('Received', 'Confirmed', 'Cold Storage Picking', 'Dispatched', 'Delivered', 'Cancelled') THEN
    RAISE EXCEPTION 'Unknown order status %', p_status;
  END IF;
  SELECT * INTO o FROM public.rimi_sales_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found (it may have been deleted)'; END IF;
  IF o.order_status = p_status THEN RETURN to_jsonb(o); END IF;
  IF o.order_status = 'Cancelled' THEN RAISE EXCEPTION 'A cancelled order cannot be reopened. Create a new order instead.'; END IF;
  IF p_status = 'Cancelled' THEN
    IF o.order_status NOT IN ('Dispatched', 'Delivered') THEN PERFORM public.rimi_restore_order_stock(o.id, o.order_no); END IF;
    UPDATE public.rimi_sales_orders SET order_status = p_status, balance_amount = 0, updated_at = now() WHERE id = p_order RETURNING * INTO o;
  ELSE
    UPDATE public.rimi_sales_orders SET order_status = p_status, updated_at = now() WHERE id = p_order RETURNING * INTO o;
  END IF;
  RETURN to_jsonb(o);
END $$;

CREATE OR REPLACE FUNCTION public.rimi_delete_sales_order(p_order uuid, p_with_payments boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.rimi_sales_orders%ROWTYPE; n integer;
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO o FROM public.rimi_sales_orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) INTO n FROM public.rimi_payments WHERE order_id = p_order;
  IF n > 0 AND NOT p_with_payments THEN
    RAISE EXCEPTION 'This order has % payment(s) recorded. Confirm deleting them too, or cancel the order instead.', n;
  END IF;
  IF o.order_status NOT IN ('Cancelled', 'Dispatched', 'Delivered') THEN PERFORM public.rimi_restore_order_stock(o.id, o.order_no); END IF;
  DELETE FROM public.rimi_payments WHERE order_id = p_order;
  DELETE FROM public.rimi_sales_orders WHERE id = p_order;
END $$;

-- ── Payments ────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rimi_record_payment(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cust public.rimi_customers%ROWTYPE; o public.rimi_sales_orders%ROWTYPE; v_amt numeric; v_row public.rimi_payments%ROWTYPE;
  v_paid numeric; v_bal numeric;
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  v_amt := coalesce(nullif(p->>'amount', '')::numeric, 0);
  IF v_amt <= 0 THEN RAISE EXCEPTION 'Enter an amount greater than zero'; END IF;
  SELECT * INTO v_cust FROM public.rimi_customers WHERE id = nullif(p->>'customer_id', '')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a customer'; END IF;
  IF nullif(p->>'order_id', '') IS NOT NULL THEN
    SELECT * INTO o FROM public.rimi_sales_orders WHERE id = (p->>'order_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'That order no longer exists'; END IF;
    IF o.order_status = 'Cancelled' THEN RAISE EXCEPTION 'Payments cannot be recorded against a cancelled order'; END IF;
    IF v_amt > o.balance_amount THEN RAISE EXCEPTION 'Amount exceeds the order balance of %', o.balance_amount; END IF;
  END IF;
  INSERT INTO public.rimi_payments (payment_no, customer_id, customer_name, order_id, order_no, amount, payment_method, reference_no,
    payment_date, collected_by_name, collected_by_email, receipt_url, notes, status)
  VALUES ('PAY-RF-' || lpad(nextval('public.rimi_payment_no_seq')::text, 6, '0'), v_cust.id, v_cust.business_name, o.id, o.order_no, v_amt,
    coalesce(nullif(p->>'payment_method', ''), 'Bank Transfer'), coalesce(p->>'reference_no', ''),
    coalesce(nullif(p->>'payment_date', '')::date, current_date), coalesce(nullif(p->>'collected_by_name', ''), 'Finance Team'),
    coalesce(p->>'collected_by_email', ''), coalesce(p->>'receipt_url', ''), coalesce(p->>'notes', ''), 'Completed')
  RETURNING * INTO v_row;
  IF o.id IS NOT NULL THEN
    v_paid := o.paid_amount + v_amt; v_bal := greatest(0, o.total_amount - v_paid);
    UPDATE public.rimi_sales_orders SET paid_amount = v_paid, balance_amount = v_bal,
      payment_status = CASE WHEN v_bal = 0 THEN 'Paid' ELSE 'Partially Paid' END, updated_at = now() WHERE id = o.id;
  END IF;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.rimi_delete_payment(p_payment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pay public.rimi_payments%ROWTYPE; o public.rimi_sales_orders%ROWTYPE; v_paid numeric; v_bal numeric;
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO pay FROM public.rimi_payments WHERE id = p_payment FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF pay.order_id IS NOT NULL THEN
    SELECT * INTO o FROM public.rimi_sales_orders WHERE id = pay.order_id FOR UPDATE;
    IF FOUND THEN
      v_paid := greatest(0, o.paid_amount - pay.amount);
      v_bal := CASE WHEN o.order_status = 'Cancelled' THEN 0 ELSE greatest(0, o.total_amount - v_paid) END;
      UPDATE public.rimi_sales_orders SET paid_amount = v_paid, balance_amount = v_bal,
        payment_status = CASE WHEN v_paid <= 0 THEN 'Unpaid' WHEN v_bal = 0 THEN 'Paid' ELSE 'Partially Paid' END, updated_at = now()
        WHERE id = o.id;
    END IF;
  END IF;
  DELETE FROM public.rimi_payments WHERE id = p_payment;
END $$;

-- ── Products and stock ──────────────────────────────────────────────────────────────────────────────────────────
-- Adds stock to an existing batch (p_batch_id) or creates a new batch at a cold storage hub.
CREATE OR REPLACE FUNCTION public.rimi_add_stock(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prod public.rimi_products%ROWTYPE; v_wh public.rimi_warehouses%ROWTYPE; b public.rimi_inventory_batches%ROWTYPE;
  v_qty numeric; v_no text; v_user text := coalesce(nullif(p->>'performed_by', ''), 'Staff');
BEGIN
  IF NOT public.is_rimi_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  v_qty := coalesce(nullif(p->>'quantity', '')::numeric, 0);
  IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  SELECT * INTO v_prod FROM public.rimi_products WHERE id = nullif(p->>'product_id', '')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  IF nullif(p->>'batch_id', '') IS NOT NULL THEN
    SELECT * INTO b FROM public.rimi_inventory_batches WHERE id = (p->>'batch_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
    IF b.product_id <> v_prod.id THEN RAISE EXCEPTION 'That batch belongs to a different product'; END IF;
    UPDATE public.rimi_inventory_batches SET quantity = quantity + v_qty, initial_quantity = initial_quantity + v_qty,
      status = 'Active', updated_at = now() WHERE id = b.id RETURNING * INTO b;
    INSERT INTO public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, reference_no, warehouse_id, performed_by, notes)
      VALUES (b.id, v_prod.id, 'Restock', v_qty, b.quantity, b.batch_no, b.warehouse_id, v_user, 'Stock added to existing batch');
    RETURN to_jsonb(b);
  END IF;

  IF nullif(p->>'warehouse_id', '') IS NOT NULL THEN
    SELECT * INTO v_wh FROM public.rimi_warehouses WHERE id = (p->>'warehouse_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cold storage hub not found'; END IF;
  END IF;
  IF nullif(p->>'expiry_date', '') IS NULL THEN RAISE EXCEPTION 'Enter the expiry date for the batch'; END IF;
  v_no := coalesce(nullif(trim(p->>'batch_no'), ''), 'LOT-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0'));
  SELECT * INTO b FROM public.rimi_inventory_batches WHERE batch_no = v_no FOR UPDATE;
  IF FOUND THEN
    IF b.product_id <> v_prod.id THEN RAISE EXCEPTION 'Batch number % is already used by another product', v_no; END IF;
    UPDATE public.rimi_inventory_batches SET quantity = quantity + v_qty, initial_quantity = initial_quantity + v_qty,
      status = 'Active', updated_at = now() WHERE id = b.id RETURNING * INTO b;
    INSERT INTO public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, reference_no, warehouse_id, performed_by, notes)
      VALUES (b.id, v_prod.id, 'Restock', v_qty, b.quantity, b.batch_no, b.warehouse_id, v_user, 'Stock added to existing batch');
    RETURN to_jsonb(b);
  END IF;
  INSERT INTO public.rimi_inventory_batches (batch_no, product_id, product_name, product_category, mfg_date, expiry_date, quantity, initial_quantity,
    unit, warehouse_id, warehouse_name, storage_temp, status, notes)
  VALUES (v_no, v_prod.id, v_prod.name, v_prod.category, coalesce(nullif(p->>'mfg_date', '')::date, current_date), (p->>'expiry_date')::date,
    v_qty, v_qty, v_prod.unit, v_wh.id, v_wh.name, coalesce(nullif(p->>'storage_temp', ''), v_prod.storage_temp), 'Active', coalesce(p->>'notes', ''))
  RETURNING * INTO b;
  INSERT INTO public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, reference_no, warehouse_id, performed_by, notes)
    VALUES (b.id, v_prod.id, 'Initial Stock', v_qty, v_qty, v_no, b.warehouse_id, v_user, 'Initial stock received (' || v_no || ')');
  RETURN to_jsonb(b);
END $$;

GRANT EXECUTE ON FUNCTION public.rimi_create_sales_order(jsonb), public.rimi_set_sales_order_status(uuid, text),
  public.rimi_delete_sales_order(uuid, boolean), public.rimi_record_payment(jsonb), public.rimi_delete_payment(uuid),
  public.rimi_add_stock(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.rimi_create_sales_order(jsonb), public.rimi_set_sales_order_status(uuid, text),
  public.rimi_delete_sales_order(uuid, boolean), public.rimi_record_payment(jsonb), public.rimi_delete_payment(uuid),
  public.rimi_add_stock(jsonb) FROM PUBLIC, anon;
