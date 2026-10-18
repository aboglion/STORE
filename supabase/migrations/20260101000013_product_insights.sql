-- ============================================================
-- 0013_product_insights.sql
-- Business insights: top categories + full product performance
-- (best sellers, unsold products, low stock, out of stock)
-- ============================================================

-- ------------------------------------------------------------
-- top_categories — categories ranked by revenue / units / orders
-- ------------------------------------------------------------
create or replace view top_categories as
select
  c.id as category_id,
  coalesce(c.name_he, 'ללא קטגוריה') as category_name,
  count(distinct oi.order_id) as orders_count,
  sum(oi.quantity) as units_sold,
  sum(oi.line_total_agorot) as revenue_agorot
from order_items oi
join orders o on o.id = oi.order_id
left join products p on p.id = oi.product_id
left join categories c on c.id = p.category_id
where o.status <> 'canceled'
group by c.id, coalesce(c.name_he, 'ללא קטגוריה')
order by revenue_agorot desc;

-- ------------------------------------------------------------
-- product_performance — every catalog product with its sales
-- and stock status, so the dashboard can rank best sellers,
-- flag unsold products and surface stock problems.
-- ------------------------------------------------------------
create or replace view product_performance as
select
  p.id as product_id,
  p.name_he as product_name,
  p.category_id,
  coalesce(c.name_he, 'ללא קטגוריה') as category_name,
  p.is_active,
  p.stock_quantity,
  p.low_stock_threshold,
  coalesce(s.units_sold, 0) as units_sold,
  coalesce(s.revenue_agorot, 0) as revenue_agorot,
  coalesce(s.orders_count, 0) as orders_count,
  s.last_sold_at
from products p
left join categories c on c.id = p.category_id
left join (
  select
    oi.product_id,
    sum(oi.quantity) as units_sold,
    sum(oi.line_total_agorot) as revenue_agorot,
    count(distinct oi.order_id) as orders_count,
    max(o.placed_at) as last_sold_at
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.status <> 'canceled'
  group by oi.product_id
) s on s.product_id = p.id
order by s.units_sold desc nulls last;