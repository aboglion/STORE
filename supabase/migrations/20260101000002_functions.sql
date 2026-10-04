-- ============================================================
-- 0002_functions.sql
-- Business logic in the database:
--   * is_admin()            — helper used by RLS policies
--   * create_order()        — full checkout in one transaction
--   * cancel_order()        — cancel + restore stock + event log
--   * update_order_status() — validated status transitions + event log
-- ============================================================

-- ------------------------------------------------------------
-- Admin helper (security definer so RLS can use it safely)
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_profiles where id = auth.uid()
  );
$$;

grant execute on function is_admin() to anon, authenticated;

-- ============================================================
-- create_order
-- Creates customer + address if needed, locks product rows,
-- validates stock, inserts the order with snapshots, decrements
-- stock and writes inventory + event logs. All in one transaction:
-- any error rolls everything back.
-- ============================================================
create or replace function create_order(
  p_phone_norm text,
  p_phone_display text,
  p_customer_name text,
  p_address jsonb,
  p_payment_method payment_method_enum,
  p_delivery_fee_agorot int default 0,
  p_discount_agorot int default 0,
  p_customer_notes text default null,
  p_location_source text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal_agorot int := 0;
  v_total_agorot int;
  v_item jsonb;
  v_row record;
  v_product_id uuid;
  v_quantity int;
  v_price_agorot int;
  v_name_he text;
  v_stock int;
begin
  -- Basic input validation ----------------
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if p_phone_norm is null or btrim(p_phone_norm) = '' then
    raise exception 'INVALID_PHONE';
  end if;

  if p_address is null or coalesce(p_address->>'full_address', '') = '' then
    raise exception 'INVALID_ADDRESS';
  end if;

  -- 1. Upsert customer by normalized phone ------------------
  insert into customers (phone_norm, phone_display, full_name)
  values (p_phone_norm, p_phone_display, p_customer_name)
  on conflict (phone_norm) do update
    set full_name = excluded.full_name,
        phone_display = excluded.phone_display,
        updated_at = now()
  returning id into v_customer_id;

  -- 2. Find or create address --------------------------------
  select id into v_address_id
  from addresses
  where customer_id = v_customer_id
    and normalized_address = p_address->>'normalized_address'
  order by created_at desc
  limit 1;

  if v_address_id is null then
    insert into addresses (
      customer_id, full_address, normalized_address, city, street,
      house_number, entrance, apartment, notes, lat, lng, is_default
    )
    values (
      v_customer_id,
      p_address->>'full_address',
      p_address->>'normalized_address',
      nullif(p_address->>'city', ''),
      nullif(p_address->>'street', ''),
      nullif(p_address->>'house_number', ''),
      nullif(p_address->>'entrance', ''),
      nullif(p_address->>'apartment', ''),
      nullif(p_address->>'notes', ''),
      nullif(p_address->>'lat', '')::double precision,
      nullif(p_address->>'lng', '')::double precision,
      true
    )
    returning id into v_address_id;
  end if;

  -- 3. Lock products, validate stock, compute subtotal --------
  create temp table tmp_order_items (
    product_id uuid not null,
    quantity int not null,
    unit_price_agorot int not null,
    product_name_he text not null
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'INVALID_ITEM';
    end if;

    -- FOR UPDATE locks the row until commit: concurrent checkout
    -- of the last unit cannot oversell.
    select price_agorot, name_he, stock_quantity
      into v_price_agorot, v_name_he, v_stock
    from products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_stock < v_quantity then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    insert into tmp_order_items (product_id, quantity, unit_price_agorot, product_name_he)
    values (v_product_id, v_quantity, v_price_agorot, v_name_he);

    v_subtotal_agorot := v_subtotal_agorot + (v_price_agorot * v_quantity);
  end loop;

  v_total_agorot := v_subtotal_agorot + p_delivery_fee_agorot - p_discount_agorot;

  if v_total_agorot < 0 then
    raise exception 'INVALID_TOTAL';
  end if;

  -- 4. Create the order ---------------------------------------
  insert into orders (
    customer_id, customer_name_snapshot, customer_phone_snapshot,
    address_id, address_snapshot, status, payment_method, payment_status,
    subtotal_agorot, delivery_fee_agorot, discount_agorot, total_agorot,
    customer_notes, location_source
  )
  values (
    v_customer_id, p_customer_name, p_phone_display,
    v_address_id, p_address, 'pending', p_payment_method, 'unpaid',
    v_subtotal_agorot, p_delivery_fee_agorot, p_discount_agorot, v_total_agorot,
    nullif(p_customer_notes, ''), p_location_source
  )
  returning id, order_number into v_order_id, v_order_number;

  -- 5. Order items with snapshots ------------------------------
  insert into order_items (
    order_id, product_id, product_name_snapshot,
    unit_price_agorot, quantity, line_total_agorot
  )
  select
    v_order_id, product_id, product_name_he,
    unit_price_agorot, quantity, unit_price_agorot * quantity
  from tmp_order_items;

  -- 6. Decrement stock + inventory log -------------------------
  for v_row in select * from tmp_order_items
  loop
    update products
    set stock_quantity = stock_quantity - v_row.quantity
    where id = v_row.product_id;

    insert into inventory_logs (product_id, order_id, change_quantity, reason)
    values (v_row.product_id, v_order_id, -v_row.quantity, 'order_placed');
  end loop;

  -- 7. Initial status event -------------------------------------
  insert into order_events (order_id, from_status, to_status, note)
  values (v_order_id, null, 'pending', 'הזמנה נוצרה');

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal_agorot', v_subtotal_agorot,
    'delivery_fee_agorot', p_delivery_fee_agorot,
    'discount_agorot', p_discount_agorot,
    'total_agorot', v_total_agorot
  );
exception
  when others then
    -- Ensure the temp table is cleaned up even on error paths
    begin
      drop table if exists tmp_order_items;
    exception when others then null;
    end;
    raise;
end;
$$;

-- ============================================================
-- cancel_order
-- Cancels an order and restores the stock of its items.
-- ============================================================
create or replace function cancel_order(
  p_order_id uuid,
  p_admin_user_id uuid default null,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status order_status_enum;
  v_row record;
begin
  select status into v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_status = 'canceled' then
    return true;
  end if;

  if v_status = 'delivered' then
    raise exception 'CANNOT_CANCEL_DELIVERED';
  end if;

  -- Restore stock for every item that still references a product
  for v_row in
    select product_id, quantity
    from order_items
    where order_id = p_order_id
      and product_id is not null
  loop
    update products
    set stock_quantity = stock_quantity + v_row.quantity
    where id = v_row.product_id;

    insert into inventory_logs (product_id, order_id, admin_user_id, change_quantity, reason)
    values (v_row.product_id, p_order_id, p_admin_user_id, v_row.quantity, 'order_canceled');
  end loop;

  update orders
  set status = 'canceled',
      updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, admin_user_id, from_status, to_status, note)
  values (p_order_id, p_admin_user_id, v_status::text, 'canceled', coalesce(p_note, 'הזמנה בוטלה'));

  return true;
end;
$$;

-- ============================================================
-- update_order_status
-- Validates the transition, updates the order and logs an event.
-- Cancellation is handled by cancel_order (restores stock).
-- ============================================================
create or replace function update_order_status(
  p_order_id uuid,
  p_to_status order_status_enum,
  p_admin_user_id uuid default null,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_status order_status_enum;
begin
  select status into v_from_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_from_status = p_to_status then
    return true;
  end if;

  if p_to_status = 'canceled' then
    -- Cancellation must go through cancel_order so stock is restored.
    raise exception 'USE_CANCEL_ORDER';
  end if;

  if not (
    (v_from_status = 'pending' and p_to_status = 'confirmed')
    or (v_from_status = 'confirmed' and p_to_status = 'preparing')
    or (v_from_status = 'preparing' and p_to_status = 'out_for_delivery')
    or (v_from_status = 'out_for_delivery' and p_to_status = 'delivered')
  ) then
    raise exception 'INVALID_TRANSITION';
  end if;

  update orders
  set status = p_to_status,
      updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, admin_user_id, from_status, to_status, note)
  values (p_order_id, p_admin_user_id, v_from_status::text, p_to_status::text, p_note);

  return true;
end;
$$;