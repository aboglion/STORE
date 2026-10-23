-- ============================================================
-- 0015_promotions.sql
-- Promotions engine: multi-buy (buy X get Y), price deals and
-- free-shipping promotions, plus a snapshot of applied promotions
-- stored on each order so receipts can show what was discounted.
--
-- Promotion type-specific parameters live in `config` (jsonb):
--   * multi_buy:      { buy_quantity, get_quantity, discount_percent }
--                     (discount_percent = 100 means the Y units are free)
--   * price_deal:     { deal_price_agorot }
--   * free_shipping:  { min_quantity, min_subtotal_agorot }
-- ============================================================

-- ------------------------------------------------------------
-- promotions
-- ------------------------------------------------------------
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_ar text,
  type text not null check (type in ('multi_buy', 'price_deal', 'free_shipping')),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  scope_type text not null default 'all' check (scope_type in ('all', 'category', 'products')),
  category_id uuid references categories(id) on delete cascade,
  product_ids uuid[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promotions_active on promotions(is_active);
create index if not exists idx_promotions_type on promotions(type);

create trigger promotions_updated_at
before update on promotions
for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- orders.promotions_snapshot — which promotions were applied
-- ------------------------------------------------------------
alter table orders add column if not exists promotions_snapshot jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table promotions enable row level security;

drop policy if exists "public_read_active_promotions" on promotions;
create policy "public_read_active_promotions"
on promotions for select
using (is_active = true);

drop policy if exists "admin_all_promotions" on promotions;
create policy "admin_all_promotions"
on promotions for all
using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- create_order — accept + store the promotions snapshot
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
  p_items jsonb default '[]'::jsonb,
  p_promotions_snapshot jsonb default '[]'::jsonb
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
    customer_notes, location_source, promotions_snapshot
  )
  values (
    v_customer_id, p_customer_name, p_phone_display,
    v_address_id, p_address, 'pending', p_payment_method, 'unpaid',
    v_subtotal_agorot, p_delivery_fee_agorot, p_discount_agorot, v_total_agorot,
    nullif(p_customer_notes, ''), p_location_source, p_promotions_snapshot
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

grant execute on function create_order(
  text, text, text, jsonb, payment_method_enum, int, int, text, text, jsonb, jsonb
) to authenticated;