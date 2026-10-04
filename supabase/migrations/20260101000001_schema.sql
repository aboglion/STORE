-- ============================================================
-- 0001_schema.sql
-- Core schema: extensions, enums, sequence, tables, triggers, indexes
-- Run this first in the Supabase SQL editor (or via supabase db push).
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type payment_method_enum as enum (
  'cash',
  'card_gateway',
  'card_link',
  'card_terminal'
);

create type payment_status_enum as enum (
  'unpaid',
  'authorized',
  'paid',
  'failed',
  'refunded'
);

create type order_status_enum as enum (
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'canceled'
);

-- ------------------------------------------------------------
-- Sequence for human-friendly order numbers
-- ------------------------------------------------------------
create sequence if not exists order_number_seq;

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  slug text unique not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  slug text unique not null,
  name_he text not null,
  description_he text,
  price_agorot int not null check (price_agorot >= 0),
  compare_at_price_agorot int check (compare_at_price_agorot >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 5,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- product_images
-- ------------------------------------------------------------
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone_norm text unique not null,
  phone_display text not null,
  full_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- addresses
-- ------------------------------------------------------------
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text,
  full_address text not null,
  normalized_address text not null,
  city text,
  street text,
  house_number text,
  entrance text,
  apartment text,
  notes text,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default (
    to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 6, '0')
  ),
  customer_id uuid not null references customers(id),
  customer_name_snapshot text not null,
  customer_phone_snapshot text not null,
  address_id uuid references addresses(id) on delete set null,
  address_snapshot jsonb not null,
  status order_status_enum not null default 'pending',
  payment_method payment_method_enum not null,
  payment_status payment_status_enum not null default 'unpaid',
  subtotal_agorot int not null check (subtotal_agorot >= 0),
  delivery_fee_agorot int not null default 0 check (delivery_fee_agorot >= 0),
  discount_agorot int not null default 0 check (discount_agorot >= 0),
  total_agorot int not null check (total_agorot >= 0),
  customer_notes text,
  location_source text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_agorot int not null check (unit_price_agorot >= 0),
  quantity int not null check (quantity > 0),
  line_total_agorot int not null check (line_total_agorot >= 0),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- inventory_logs
-- ------------------------------------------------------------
create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  admin_user_id uuid,
  change_quantity int not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- order_events
-- ------------------------------------------------------------
create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  admin_user_id uuid,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- admin_profiles
-- ------------------------------------------------------------
create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
before update on products
for each row execute function set_updated_at();

create trigger customers_updated_at
before update on customers
for each row execute function set_updated_at();

create trigger addresses_updated_at
before update on addresses
for each row execute function set_updated_at();

create trigger orders_updated_at
before update on orders
for each row execute function set_updated_at();

create trigger admin_profiles_updated_at
before update on admin_profiles
for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists idx_products_active
on products(is_active);

create index if not exists idx_products_category
on products(category_id);

create index if not exists idx_product_images_product
on product_images(product_id);

create index if not exists idx_customers_phone
on customers(phone_norm);

create index if not exists idx_addresses_customer
on addresses(customer_id);

create index if not exists idx_addresses_normalized
on addresses(normalized_address);

create index if not exists idx_orders_customer
on orders(customer_id);

create index if not exists idx_orders_status
on orders(status);

create index if not exists idx_orders_placed_at
on orders(placed_at);

create index if not exists idx_order_items_order
on order_items(order_id);

create index if not exists idx_order_items_product
on order_items(product_id);

create index if not exists idx_inventory_logs_product
on inventory_logs(product_id);

create index if not exists idx_order_events_order
on order_events(order_id);