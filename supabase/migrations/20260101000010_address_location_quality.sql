-- ============================================================
-- 0010_address_location_quality.sql
-- Address location quality: confidence metadata on addresses,
-- a persistent geocode cache, and an updated create_order RPC
-- that persists coordinates and enriches existing addresses
-- with more authoritative sources.
-- ============================================================

-- ------------------------------------------------------------
-- 1. addresses — location quality columns
--    location_source:      where the coordinates came from
--      (browser_geolocation | map_pin | manual | geocoded |
--       admin_pinned | courier_pinned)
--    location_confidence:  high (building/house), medium (street),
--      low (city centroid)
--    location_accuracy_m:  GPS accuracy or geocoder estimate
--    geocoded_at:          when the coordinates were resolved
-- ------------------------------------------------------------
alter table addresses
  add column if not exists location_source text,
  add column if not exists location_confidence text
    check (location_confidence in ('high', 'medium', 'low')),
  add column if not exists location_accuracy_m double precision,
  add column if not exists geocoded_at timestamptz;

-- Hot path for the create_order address lookup.
create index if not exists addresses_customer_normalized_idx
  on addresses (customer_id, normalized_address);

-- ------------------------------------------------------------
-- 2. geocode_cache — persistent Nominatim result cache
--    Keyed by the normalized query so repeated addresses never
--    re-hit the public Nominatim service (usage policy).
--    confidence 'none' caches failed lookups too.
-- ------------------------------------------------------------
create table if not exists geocode_cache (
  query_norm text primary key,
  lat double precision,
  lng double precision,
  confidence text not null
    check (confidence in ('high', 'medium', 'low', 'none')),
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists geocode_cache_created_at_idx
  on geocode_cache (created_at);

-- ------------------------------------------------------------
-- 3. orders — GIN index on address_snapshot for the admin
--    "missing / imprecise location" filter.
-- ------------------------------------------------------------
create index if not exists orders_address_snapshot_gin
  on orders using gin (address_snapshot);

-- ============================================================
-- 4. create_order — recreated from 0009 with location quality.
--    New address fields are persisted, and existing addresses
--    are enriched when the incoming source is at least as
--    authoritative as the stored one.
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
  -- Location quality ----------------------------------------
  v_new_lat double precision;
  v_new_lng double precision;
  v_new_confidence text;
  v_new_accuracy double precision;
  v_new_geocoded_at timestamptz;
  v_new_priority int;
  v_existing_source text;
  v_existing_priority int;
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
  --    Extract location quality from the payload once.
  v_new_lat := nullif(p_address->>'lat', '')::double precision;
  v_new_lng := nullif(p_address->>'lng', '')::double precision;
  v_new_confidence := nullif(p_address->>'location_confidence', '');
  v_new_accuracy := nullif(p_address->>'location_accuracy_m', '')::double precision;
  v_new_geocoded_at := nullif(p_address->>'geocoded_at', '')::timestamptz;
  v_new_priority := case p_location_source
    when 'courier_pinned' then 5
    when 'admin_pinned' then 4
    when 'map_pin' then 3
    when 'browser_geolocation' then 3
    when 'geocoded' then 2
    else 1
  end;

  select id into v_address_id
  from addresses
  where customer_id = v_customer_id
    and normalized_address = p_address->>'normalized_address'
  order by created_at desc
  limit 1;

  if v_address_id is null then
    insert into addresses (
      customer_id, full_address, normalized_address, city, street,
      house_number, entrance, apartment, notes, lat, lng, is_default,
      location_source, location_confidence, location_accuracy_m, geocoded_at
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
      v_new_lat,
      v_new_lng,
      true,
      p_location_source,
      v_new_confidence,
      v_new_accuracy,
      v_new_geocoded_at
    )
    returning id into v_address_id;
  else
    -- Address already exists: enrich with better coordinates when the
    -- incoming source is at least as authoritative as the stored one
    -- (courier_pinned > admin_pinned > map_pin/browser_geolocation >
    --  geocoded > manual). This is how a courier/admin pin permanently
    -- improves future orders to the same normalized address.
    select coalesce(location_source, 'manual') into v_existing_source
    from addresses
    where id = v_address_id;

    v_existing_priority := case v_existing_source
      when 'courier_pinned' then 5
      when 'admin_pinned' then 4
      when 'map_pin' then 3
      when 'browser_geolocation' then 3
      when 'geocoded' then 2
      else 1
    end;

    if v_new_lat is not null and v_new_lng is not null
       and v_existing_priority <= v_new_priority then
      update addresses
      set lat = v_new_lat,
          lng = v_new_lng,
          location_source = p_location_source,
          location_confidence = coalesce(v_new_confidence, location_confidence),
          location_accuracy_m = coalesce(v_new_accuracy, location_accuracy_m),
          geocoded_at = coalesce(v_new_geocoded_at, geocoded_at),
          updated_at = now()
      where id = v_address_id;
    end if;
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

  -- 4. Create the order — AUTO-CONFIRMED so it is broadcast to
  --    all active couriers immediately (no manual admin step).
  insert into orders (
    customer_id, customer_name_snapshot, customer_phone_snapshot,
    address_id, address_snapshot, status, payment_method, payment_status,
    subtotal_agorot, delivery_fee_agorot, discount_agorot, total_agorot,
    customer_notes, location_source
  )
  values (
    v_customer_id, p_customer_name, p_phone_display,
    v_address_id, p_address, 'confirmed', p_payment_method, 'unpaid',
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

  -- 7. Status events -------------------------------------------
  insert into order_events (order_id, from_status, to_status, note)
  values (v_order_id, null, 'confirmed', 'הזמנה נוצרה ואושרה אוטומטית — נשלחה לשליחים');

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