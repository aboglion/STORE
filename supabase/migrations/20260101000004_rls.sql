-- ============================================================
-- 0004_rls.sql
-- Row Level Security.
--
-- Strategy:
--   * Public (anon): read only active products, active categories
--     and their images + public settings. No public writes.
--   * Admins (users present in admin_profiles): full access.
--   * Order creation goes through the create_order() security-definer
--     RPC called by the server action (service role), never directly.
-- ============================================================

-- ------------------------------------------------------------
-- Enable RLS everywhere
-- ------------------------------------------------------------
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_logs enable row level security;
alter table order_events enable row level security;
alter table settings enable row level security;
alter table admin_profiles enable row level security;

-- ------------------------------------------------------------
-- Public read policies
-- ------------------------------------------------------------
drop policy if exists "public_read_active_products" on products;
create policy "public_read_active_products"
on products for select
using (is_active = true);

drop policy if exists "public_read_active_categories" on categories;
create policy "public_read_active_categories"
on categories for select
using (is_active = true);

-- Images of active products only
drop policy if exists "public_read_product_images" on product_images;
create policy "public_read_product_images"
on product_images for select
using (
  exists (
    select 1 from products p
    where p.id = product_images.product_id
      and p.is_active = true
  )
);

-- Settings are not sensitive (store name, delivery fee, thresholds)
drop policy if exists "public_read_settings" on settings;
create policy "public_read_settings"
on settings for select
using (true);

-- ------------------------------------------------------------
-- Admin policies — full CRUD for users in admin_profiles
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_images', 'customers',
    'addresses', 'orders', 'order_items', 'inventory_logs',
    'order_events', 'settings', 'admin_profiles'
  ]
  loop
    execute format(
      'drop policy if exists "admin_all_%1$s" on %1$s;', t
    );
    execute format(
      'create policy "admin_all_%1$s" on %1$s
       for all using (is_admin()) with check (is_admin());', t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Storage bucket for product images
-- Public read (served to the storefront), admin-only write.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_product_images_storage" on storage.objects;
create policy "public_read_product_images_storage"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "admin_write_product_images_storage" on storage.objects;
create policy "admin_write_product_images_storage"
on storage.objects for insert
with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin_update_product_images_storage" on storage.objects;
create policy "admin_update_product_images_storage"
on storage.objects for update
using (bucket_id = 'product-images' and is_admin());

drop policy if exists "admin_delete_product_images_storage" on storage.objects;
create policy "admin_delete_product_images_storage"
on storage.objects for delete
using (bucket_id = 'product-images' and is_admin());

-- ------------------------------------------------------------
-- Function grants
-- create_order is called from the public checkout but only through
-- the server action (service role). Authenticated users get access
-- for future server-side admin flows; anon has no direct access.
-- ------------------------------------------------------------
grant execute on function create_order(
  text, text, text, jsonb, payment_method_enum, int, int, text, text, jsonb
) to authenticated;

grant execute on function cancel_order(uuid, uuid, text) to authenticated;
grant execute on function update_order_status(uuid, order_status_enum, uuid, text) to authenticated;