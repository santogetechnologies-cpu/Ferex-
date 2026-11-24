-- Add or remove products on a sales order that has not left the warehouse yet. Stock from the old lines is returned,
-- the new lines are allocated from the earliest-expiring batches (or the chosen batch), movements are logged and the
-- order total, balance and payment status are recalculated. Fails as a whole if stock is short or the new total is
-- lower than what has already been paid.
create or replace function public.rimi_update_sales_order_items(p_order uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  o public.rimi_sales_orders%rowtype; v_prod public.rimi_products%rowtype; b public.rimi_inventory_batches%rowtype;
  it jsonb; v_qty numeric; v_price numeric; v_need numeric; v_take numeric; v_batch uuid; v_total numeric := 0; v_bal numeric;
begin
  if not public.is_rimi_staff() then raise exception 'Not allowed'; end if;
  select * into o from public.rimi_sales_orders where id = p_order for update;
  if not found then raise exception 'Order not found (it may have been deleted)'; end if;
  if o.order_status not in ('Received', 'Confirmed', 'Cold Storage Picking') then
    raise exception 'Products can only be changed before the order is dispatched (this order is %).', o.order_status;
  end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'An order needs at least one product. Cancel the order instead.'; end if;

  perform public.rimi_restore_order_stock(o.id, o.order_no);
  delete from public.rimi_order_items where order_id = o.id;

  for it in select * from jsonb_array_elements(p->'items') loop
    v_qty := coalesce(nullif(it->>'quantity', '')::numeric, 0);
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    select * into v_prod from public.rimi_products where id = nullif(it->>'product_id', '')::uuid;
    if not found then raise exception 'A selected product no longer exists'; end if;
    v_price := coalesce(nullif(it->>'unit_price', '')::numeric, v_prod.unit_price);
    v_batch := nullif(it->>'batch_id', '')::uuid;
    v_need := v_qty;
    for b in select * from public.rimi_inventory_batches
        where product_id = v_prod.id and quantity > 0 and expiry_date > current_date and (v_batch is null or id = v_batch)
        order by expiry_date, created_at for update loop
      exit when v_need <= 0;
      v_take := least(b.quantity, v_need);
      update public.rimi_inventory_batches set quantity = quantity - v_take,
        status = case when quantity - v_take <= 0 then 'Depleted' when quantity - v_take <= 20 then 'Low Stock' else status end,
        updated_at = now() where id = b.id;
      insert into public.rimi_order_items (order_id, product_id, product_name, batch_id, batch_no, quantity, unit, unit_price, total_price, total_line_amount)
        values (o.id, v_prod.id, v_prod.name, b.id, b.batch_no, v_take, v_prod.unit, v_price, v_take * v_price, v_take * v_price);
      insert into public.rimi_stock_movements (batch_id, product_id, movement_type, quantity_change, resulting_quantity, order_id, reference_no, warehouse_id, performed_by, notes)
        values (b.id, v_prod.id, 'Dispatch', -v_take, b.quantity - v_take, o.id, o.order_no, b.warehouse_id, coalesce(nullif(p->>'performed_by', ''), 'Staff'), 'Order edited ' || o.order_no);
      v_total := v_total + v_take * v_price;
      v_need := v_need - v_take;
    end loop;
    if v_need > 0 then raise exception 'Not enough stock for % (% short)', v_prod.name, v_need; end if;
  end loop;

  if v_total < o.paid_amount then raise exception 'The new total (%) is lower than the % already paid on this order.', v_total, o.paid_amount; end if;
  v_bal := v_total - o.paid_amount;
  update public.rimi_sales_orders set total_amount = v_total, balance_amount = v_bal,
    payment_status = case when o.paid_amount <= 0 then 'Unpaid' when v_bal = 0 then 'Paid' else 'Partially Paid' end, updated_at = now()
    where id = o.id returning * into o;
  return to_jsonb(o);
end $function$;
grant execute on function public.rimi_update_sales_order_items(uuid, jsonb) to authenticated;
