-- ============================================================
-- 0003_views.sql
-- Read models for customers, duplicate detection and sales stats
-- ============================================================

-- ------------------------------------------------------------
-- GIN index on normalized addresses for pg_trgm similarity search
-- ------------------------------------------------------------
create index if not exists idx_addresses_normalized_trgm
on addresses using gin (normalized_address gin_trgm_ops);

-- ------------------------------------------------------------
-- customer_stats — per-customer aggregates for the dashboard
-- ------------------------------------------------------------
create or replace view customer_stats as
select
  c.id,
  c.phone_norm,
  c.phone_display,
  c.full_name,
  c.notes,
  c.created_at as first_order_at,
  count(o.id) filter (where o.status <> 'canceled') as orders_count,
  coalesce(
    sum(o.total_agorot) filter (where o.status <> 'canceled'),
    0
  ) as total_agorot,
  max(o.placed_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id
group by c.id, c.phone_norm, c.phone_display, c.full_name, c.notes, c.created_at;

-- ------------------------------------------------------------
-- duplicate_address_candidates — same normalized address
-- used by more than one customer (manual review only)
-- ------------------------------------------------------------
create or replace view duplicate_address_candidates as
select
  normalized_address,
  city,
  count(distinct customer_id) as customers_count,
  array_agg(distinct customer_id) as customer_ids
from addresses
where normalized_address is not null
group by normalized_address, city
having count(distinct customer_id) > 1;

-- ------------------------------------------------------------
-- daily_sales — revenue and order count per day
-- ------------------------------------------------------------
create or replace view daily_sales as
select
  date_trunc('day', placed_at)::date as day,
  count(*) filter (where status <> 'canceled') as orders_count,
  coalesce(
    sum(total_agorot) filter (where status <> 'canceled'),
    0
  ) as revenue_agorot
from orders
group by 1
order by 1;

-- ------------------------------------------------------------
-- monthly_sales — revenue and order count per month
-- ------------------------------------------------------------
create or replace view monthly_sales as
select
  date_trunc('month', placed_at)::date as month,
  count(*) filter (where status <> 'canceled') as orders_count,
  coalesce(
    sum(total_agorot) filter (where status <> 'canceled'),
    0
  ) as revenue_agorot
from orders
group by 1
order by 1;

-- ------------------------------------------------------------
-- top_products — units and revenue per product (non-canceled)
-- ------------------------------------------------------------
create or replace view top_products as
select
  oi.product_id,
  coalesce(p.name_he, oi.product_name_snapshot) as product_name,
  sum(oi.quantity) as units_sold,
  sum(oi.line_total_agorot) as revenue_agorot,
  count(distinct oi.order_id) as orders_count
from order_items oi
join orders o on o.id = oi.order_id
left join products p on p.id = oi.product_id
where o.status <> 'canceled'
group by oi.product_id, coalesce(p.name_he, oi.product_name_snapshot)
order by revenue_agorot desc;

-- ------------------------------------------------------------
-- orders_by_status — counts and revenue per order status
-- ------------------------------------------------------------
create or replace view orders_by_status as
select
  status,
  count(*) as orders_count,
  coalesce(sum(total_agorot), 0) as revenue_agorot
from orders
group by status;