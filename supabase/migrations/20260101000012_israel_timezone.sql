-- ============================================================
-- 0012_israel_timezone.sql
-- Configure database and reporting views to use Israel time (Asia/Jerusalem)
-- ============================================================

-- 1. Database and role default timezone
alter database postgres set timezone to 'Asia/Jerusalem';
alter role postgres set timezone to 'Asia/Jerusalem';
alter role anon set timezone to 'Asia/Jerusalem';
alter role authenticated set timezone to 'Asia/Jerusalem';
alter role service_role set timezone to 'Asia/Jerusalem';

-- 2. Non-enumerable order numbers default to current date in Israel timezone
alter table orders
  alter column order_number
  set default (
    to_char(now() at time zone 'Asia/Jerusalem', 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
  );

-- 3. Reporting views grouped by Israel wall-clock calendar boundaries
create or replace view daily_sales as
select
  date_trunc('day', placed_at at time zone 'Asia/Jerusalem')::date as day,
  count(*) filter (where status <> 'canceled') as orders_count,
  coalesce(
    sum(total_agorot) filter (where status <> 'canceled'),
    0
  ) as revenue_agorot
from orders
group by 1
order by 1;

create or replace view monthly_sales as
select
  date_trunc('month', placed_at at time zone 'Asia/Jerusalem')::date as month,
  count(*) filter (where status <> 'canceled') as orders_count,
  coalesce(
    sum(total_agorot) filter (where status <> 'canceled'),
    0
  ) as revenue_agorot
from orders
group by 1
order by 1;

create or replace view profit_loss_monthly as
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
  date_trunc('month', d.delivered_at at time zone 'Asia/Jerusalem')::date as month,
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

-- 4. Update ETA event function to record timestamp in Israel timezone
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
    'זמן הגעה משוער עודכן: ' || to_char(p_eta_at at time zone 'Asia/Jerusalem', 'DD/MM/YYYY HH24:MI')
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
