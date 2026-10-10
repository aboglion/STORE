-- ============================================================
-- 0009_auto_dispatch_finance.sql
-- Automatic dispatch + realtime status feed + finance/inventory.
--
--   * orders.eta_at        — courier-provided estimated arrival time
--   * products.cost_agorot — unit cost for P&L (COGS)
--   * order_status_updates — public realtime feed (status/eta only,
--                            NO customer data) so the courier app and
--                            the customer tracking page update instantly
--   * courier_cancel_order — courier cancels the deal when there is no
--                            stock (restores stock, logs events)
--   * courier_set_eta      — courier records exactly when the goods
--                            will arrive; shown in the delivery status
--   * create_order()       — now AUTO-CONFIRMS: new orders are created
--                            as 'confirmed' and broadcast to all active
--                            couriers immediately (no manual admin step)
--   * profit_loss_*        — P&L views (revenue, delivery fees,
--                            discounts, COGS, gross profit)
--   * inventory_balance    — full inventory balance (units, retail
--                            value, cost value, low-stock flags)
-- ============================================================

-- ------------------------------------------------------------
-- 1. orders.eta_at — estimated arrival time set by the courier
-- ------------------------------------------------------------
alter table orders
  add column if not exists eta_at timestamptz;

-- ------------------------------------------------------------
-- 2. products.cost_agorot — unit cost (for COGS / P&L)
-- ------------------------------------------------------------
alter table products
  add column if not exists cost_agorot int check (cost_agorot >= 0);

-- ------------------------------------------------------------
-- 3. order_status_updates — public realtime feed
-- Only non-sensitive fields are exposed (order id/number, status,
-- eta, timestamp). RLS allows anon SELECT so the courier app and
-- the customer tracking page can subscribe with the anon key.
-- ------------------------------------------------------------
create table if not exists order_status_updates (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  order_number text not null,
  status order_status_enum not null,
  eta_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_status_updates_order
  on order_status_updates(order_id, id desc);

alter table order_status_updates enable row level security;

drop policy if exists "public_read_order_status_updates" on order_status_updates;
create policy "public_read_order_status_updates"
on order_status_updates for select
using (true);

alter publication supabase_realtime add table order_status_updates;

-- Trigger: broadcast status / eta / courier changes to the feed.
-- Fires on INSERT (new order -> appears in every courier's pool) and
-- on UPDATE of status, eta_at or courier_id (claim/decline/status/eta).
create or replace function notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into order_status_updates (order_id, order_number, status, eta_at)
  values (new.id, new.order_number, new.status, new.eta_at);
  return new;
end;
$$;

drop trigger if exists orders_status_notify on orders;
create trigger orders_status_notify
after insert or update of status, eta_at, courier_id on orders
for each row execute function notify_order_status_change();

-- ============================================================
-- 4. courier_cancel_order
-- The courier discovered there is no stock -> the deal is
-- cancelled. Restores stock, clears the assignment, logs events.
-- Only allowed while the order is still in confirmed/preparing.
-- ============================================================
create or replace function courier_cancel_order(
  p_token text,
  p_order_id uuid,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid;
  v_courier_active boolean;
  v_status order_status_enum;
  v_order_courier_id uuid;
  v_row record;
begin
  select id, is_active
    into v_courier_id, v_courier_active
  from couriers
  where access_token = p_token;

  if not found then
    raise exception 'INVALID_TOKEN';
  end if;

  if not v_courier_active then
    raise exception 'COURIER_INACTIVE';
  end if;

  select status, courier_id
    into v_status, v_order_courier_id
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order_courier_id is distinct from v_courier_id then
    raise exception 'ORDER_NOT_ASSIGNED';
  end if;

  if v_status not in ('confirmed', 'preparing') then
    raise exception 'CANT_CANCEL_STARTED';
  end if;

  -- Restore stock for every item that still references a product.
  for v_row in
    select product_id, quantity
    from order_items
    where order_id = p_order_id
      and product_id is not null
  loop
    update products
    set stock_quantity = stock_quantity + v_row.quantity
    where id = v_row.product_id;

    insert into inventory_logs (product_id, order_id, change_quantity, reason)
    values (v_row.product_id, p_order_id, v_row.quantity, 'order_canceled_courier');
  end loop;

  update orders
  set status = 'canceled',
      courier_id = null,
      assigned_at = null,
      updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, from_status, to_status, note)
  values (
    p_order_id,
    v_status::text,
    'canceled',
    coalesce(p_note, 'ההזמנה בוטלה ע"י השליח — אין מלאי')
  );

  insert into courier_events (
    courier_id, order_id, actor, event_type, from_value, to_value, note
  )
  values (
    v_courier_id, p_order_id, 'courier', 'status_changed',
    v_status::text, 'canceled', coalesce(p_note, '')
  );

  return true;
end;
$$;

-- ============================================================
-- 5. courier_set_eta
-- The courier records exactly when the goods will arrive.
-- The value is stored on the order and pushed to the realtime
-- feed so the customer tracking page updates immediately.
-- ============================================================
create or replace function courier_set_eta(
  p_token text,
  p_order_id uuid,
  p_eta_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid;
  v_courier_active boolean;
  v_status order_status_enum;
  v_order_courier_id uuid;
begin
  select id, is_active
    into v_courier_id, v_courier_active
  from couriers
  where access_token = p_token;

  if not found then
    raise exception 'INVALID_TOKEN';
  end if;

  if not v_courier_active then
    raise exception 'COURIER_INACTIVE';
  end if;

  select status, courier_id
    into v_status, v_order_courier_id
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order_courier_id is distinct from v_courier_id then
    raise exception 'ORDER_NOT_ASSIGNED';
  end if;

  if v_status in ('delivered', 'canceled') then
    raise exception 'ORDER_CLOSED';
  end if;

  if p_eta_at is null then
    raise exception 'ETA_REQUIRED';
  end if;

  update orders
  set eta_at = p_eta_at,
      updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, from_status, to_status, note)
  values (
    p_order_id,
    v_status::text,
    v_status::text,
    'זמן הגעה משוער עודכן: ' || to_char(p_eta_at, 'DD/MM/YYYY HH24:MI')
  );

  insert into courier_events (
    courier_id, order_id, actor, event_type, from_value, to_value, note
  )
  values (
    v_courier_id, p_order_id, 'courier', 'status_changed',
    null, p_eta_at::text, 'עדכן זמן הגעה משוער'
  );

  return true;
end;
$$;

-- ============================================================
-- 6. create_order — AUTO-CONFIRM + broadcast
-- New orders are created directly as 'confirmed' so they are
-- immediately offered to every active courier (the pool query
-- targets confirmed/preparing with courier_id IS NULL). The
-- admin no longer has to confirm each order manually.
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

-- ============================================================
-- 7. P&L views
-- ============================================================
create or replace view profit_loss_summary as
with delivered_orders as (
  select o.id, o.total_agorot, o.delivery_fee_agorot, o.discount_agorot, o.delivered_at
  from orders o
  where o.status = 'delivered'
),
cogs as (
  select oi.order_id,
         coalesce(sum(oi.quantity * coalesce(p.cost_agorot, 0)), 0) as cogs_agorot
  from order_items oi
  left join products p on p.id = oi.product_id
  join delivered_orders d on d.id = oi.order_id
  group by oi.order_id
)
select
  date_trunc('month', d.delivered_at)::date as month,
  count(*) as orders_count,
  coalesce(sum(d.total_agorot), 0) as revenue_agorot,
  coalesce(sum(d.delivery_fee_agorot), 0) as delivery_fees_agorot,
  coalesce(sum(d.discount_agorot), 0) as discounts_agorot,
  coalesce(sum(c.cogs_agorot), 0) as cogs_agorot,
  coalesce(sum(d.total_agorot), 0) - coalesce(sum(c.cogs_agorot), 0) as gross_profit_agorot
from delivered_orders d
left join cogs c on c.order_id = d.id
group by 1
order by 1 desc;

create or replace view profit_loss_totals as
with delivered_orders as (
  select o.id, o.total_agorot, o.delivery_fee_agorot, o.discount_agorot
  from orders o
  where o.status = 'delivered'
),
cogs as (
  select oi.order_id,
         coalesce(sum(oi.quantity * coalesce(p.cost_agorot, 0)), 0) as cogs_agorot
  from order_items oi
  left join products p on p.id = oi.product_id
  join delivered_orders d on d.id = oi.order_id
  group by oi.order_id
)
select
  count(*) as orders_count,
  coalesce(sum(d.total_agorot), 0) as revenue_agorot,
  coalesce(sum(d.delivery_fee_agorot), 0) as delivery_fees_agorot,
  coalesce(sum(d.discount_agorot), 0) as discounts_agorot,
  coalesce(sum(c.cogs_agorot), 0) as cogs_agorot,
  coalesce(sum(d.total_agorot), 0) - coalesce(sum(c.cogs_agorot), 0) as gross_profit_agorot
from delivered_orders d
left join cogs c on c.order_id = d.id;

-- ============================================================
-- 8. inventory_balance — full inventory balance
-- ============================================================
create or replace view inventory_balance as
select
  p.id as product_id,
  p.name_he,
  p.name_ar,
  p.slug,
  p.stock_quantity,
  p.low_stock_threshold,
  p.price_agorot,
  p.cost_agorot,
  p.is_active,
  (p.stock_quantity * p.price_agorot) as retail_value_agorot,
  (p.stock_quantity * coalesce(p.cost_agorot, 0)) as cost_value_agorot
from products p;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant execute on function courier_cancel_order(text, uuid, text) to authenticated;
grant execute on function courier_set_eta(text, uuid, timestamptz) to authenticated;