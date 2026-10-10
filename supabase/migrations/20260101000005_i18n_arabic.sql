-- ============================================================
-- 0005_i18n_arabic.sql
-- Bilingual (Hebrew + Arabic) content support.
--   * categories.name_ar
--   * products.name_ar / products.description_ar
--   * order_items.product_name_ar_snapshot (bilingual order history)
-- Missing Arabic values fall back to Hebrew at display time.
-- ============================================================

alter table categories
  add column if not exists name_ar text;

alter table products
  add column if not exists name_ar text,
  add column if not exists description_ar text;

alter table order_items
  add column if not exists product_name_ar_snapshot text;

-- ------------------------------------------------------------
-- create_order — also snapshot the Arabic product name so order
-- history can be shown in either language.
-- ------------------------------------------------------------
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
  v_name_ar text;
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
    product_name_he text not null,
    product_name_ar text
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
    select price_agorot, name_he, name_ar, stock_quantity
      into v_price_agorot, v_name_he, v_name_ar, v_stock
    from products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_stock < v_quantity then
      raise exception 'INSUFFICIENT_STOCK';
    end if;

    insert into tmp_order_items (product_id, quantity, unit_price_agorot, product_name_he, product_name_ar)
    values (v_product_id, v_quantity, v_price_agorot, v_name_he, v_name_ar);

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
    order_id, product_id, product_name_snapshot, product_name_ar_snapshot,
    unit_price_agorot, quantity, line_total_agorot
  )
  select
    v_order_id, product_id, product_name_he, product_name_ar,
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
