-- ============================================================
-- 0007_couriers.sql
-- Courier & delivery operations:
--   * couriers             — delivery personnel + shareable access token
--                             + live GPS position (last known)
--   * courier_events       — full audit trail (assign, transfer, return,
--                             status changes, problems, token regen, ...)
--   * orders additions     — courier_id, assigned_at, delivered_at,
--                             invoice_token (unguessable invoice URL)
--   * set_orders_courier   — assign / transfer / return-to-store RPC
--   * courier_update_order_status — token-scoped status transitions with
--                             ownership + transition matrix enforcement
--
-- Security notes:
--   * couriers are ACCESSED ONLY through the service role; RLS is
--     admin-only, anon/authenticated never read the table directly.
--   * The access token is 192 bits of entropy (hex) and can be
--     regenerated instantly by an admin (old links die).
--   * The invoice token is 128 bits — unguessable, per-order.
--   * Couriers can only mutate orders assigned to them, and only through
--     the whitelisted transitions below.
-- ============================================================

-- ------------------------------------------------------------
-- couriers
-- ------------------------------------------------------------
create table if not exists couriers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_norm text unique not null,
  phone_display text not null,
  access_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  vehicle_type text not null default 'car'
    check (vehicle_type in ('car', 'scooter', 'bike', 'foot')),
  color text not null default '#e11d48',
  is_active boolean not null default true,
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_couriers_token on couriers(access_token);
create index if not exists idx_couriers_active on couriers(is_active) where is_active = true;

-- ------------------------------------------------------------
-- courier_events — audit trail
-- ------------------------------------------------------------
create table if not exists courier_events (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid references couriers(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  actor text not null default 'admin'
    check (actor in ('admin', 'courier', 'system')),
  event_type text not null
    check (event_type in (
      'courier_created', 'courier_updated', 'courier_deactivated',
      'courier_activated', 'token_regenerated',
      'assigned', 'transferred', 'returned_to_store',
      'status_changed', 'problem_reported'
    )),
  from_value text,
  to_value text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_courier_events_courier
  on courier_events(courier_id, created_at desc);
create index if not exists idx_courier_events_order
  on courier_events(order_id, created_at desc);

-- ------------------------------------------------------------
-- orders — courier assignment + invoice token
-- ------------------------------------------------------------
alter table orders
  add column if not exists courier_id uuid references couriers(id) on delete set null;
alter table orders
  add column if not exists assigned_at timestamptz;
alter table orders
  add column if not exists delivered_at timestamptz;
alter table orders
  add column if not exists invoice_token text;

-- Backfill invoice tokens for existing orders, then lock the default in.
update orders
set invoice_token = encode(gen_random_bytes(16), 'hex')
where invoice_token is null;

alter table orders
  alter column invoice_token set default encode(gen_random_bytes(16), 'hex');
alter table orders
  add constraint orders_invoice_token_key unique (invoice_token);

create index if not exists idx_orders_courier
  on orders(courier_id) where courier_id is not null;

-- ------------------------------------------------------------
-- updated_at trigger for couriers
-- ------------------------------------------------------------
create trigger couriers_updated_at
before update on couriers
for each row execute function set_updated_at();

-- ============================================================
-- set_orders_courier
-- Bulk assign / transfer / return-to-store in one transaction.
--   * Skips delivered/canceled orders silently.
--   * Logs an event per touched order (assigned / transferred /
--     returned_to_store).
--   * p_courier_id = null  ->  return the order to the store pool.
-- ============================================================
create or replace function set_orders_courier(
  p_order_ids uuid[],
  p_courier_id uuid,
  p_admin_user_id uuid default null,
  p_note text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_prev_courier_id uuid;
  v_status order_status_enum;
  v_count int := 0;
  v_event_type text;
begin
  if p_order_ids is null or array_length(p_order_ids, 1) = 0 then
    raise exception 'EMPTY_ORDERS';
  end if;

  if p_courier_id is not null then
    if not exists (
      select 1 from couriers where id = p_courier_id and is_active = true
    ) then
      raise exception 'COURIER_NOT_FOUND';
    end if;
  end if;

  for v_order_id in select unnest(p_order_ids)
  loop
    select courier_id, status
      into v_prev_courier_id, v_status
    from orders
    where id = v_order_id
    for update;

    if not found then
      continue;
    end if;

    -- Never touch terminal orders.
    if v_status in ('delivered', 'canceled') then
      continue;
    end if;

    -- Nothing changed -> skip (also dedupes repeated ids).
    if v_prev_courier_id is not distinct from p_courier_id then
      continue;
    end if;

    if p_courier_id is null then
      v_event_type := 'returned_to_store';
    elsif v_prev_courier_id is null then
      v_event_type := 'assigned';
    else
      v_event_type := 'transferred';
    end if;

    update orders
    set courier_id = p_courier_id,
        assigned_at = case when p_courier_id is null then assigned_at else now() end,
        updated_at = now()
    where id = v_order_id;

    insert into courier_events (
      courier_id, order_id, actor, event_type, from_value, to_value, note
    )
    values (
      coalesce(p_courier_id, v_prev_courier_id),
      v_order_id,
      'admin',
      v_event_type,
      v_prev_courier_id::text,
      p_courier_id::text,
      coalesce(p_note, '')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ============================================================
-- courier_update_order_status
-- Token-scoped status changes for the courier portal.
-- Enforces in the database:
--   * token exists and courier is active
--   * the order is assigned to this courier (ownership)
--   * the transition is in the whitelist
--   * a note is required when reporting a problem (back to preparing)
-- ============================================================
create or replace function courier_update_order_status(
  p_token text,
  p_order_id uuid,
  p_to_status order_status_enum,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid;
  v_courier_name text;
  v_courier_active boolean;
  v_from_status order_status_enum;
  v_order_courier_id uuid;
  v_resolved text;
  v_event_type text;
begin
  select id, full_name, is_active
    into v_courier_id, v_courier_name, v_courier_active
  from couriers
  where access_token = p_token;

  if not found then
    raise exception 'INVALID_TOKEN';
  end if;

  if not v_courier_active then
    raise exception 'COURIER_INACTIVE';
  end if;

  select status, courier_id
    into v_from_status, v_order_courier_id
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order_courier_id is distinct from v_courier_id then
    raise exception 'ORDER_NOT_ASSIGNED';
  end if;

  if v_from_status = p_to_status then
    return v_from_status::text;
  end if;

  -- Whitelisted transitions for couriers.
  if p_to_status = 'out_for_delivery' and v_from_status in ('confirmed', 'preparing') then
    v_resolved := 'out_for_delivery';
    v_event_type := 'status_changed';
  elsif p_to_status = 'delivered' and v_from_status = 'out_for_delivery' then
    v_resolved := 'delivered';
    v_event_type := 'status_changed';
  elsif p_to_status = 'preparing' and v_from_status = 'out_for_delivery' then
    if p_note is null or btrim(p_note) = '' then
      raise exception 'NOTE_REQUIRED';
    end if;
    v_resolved := 'preparing';
    v_event_type := 'problem_reported';
  else
    raise exception 'INVALID_TRANSITION';
  end if;

  update orders
  set status = v_resolved,
      delivered_at = case when v_resolved = 'delivered' then now() else delivered_at end,
      updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, admin_user_id, from_status, to_status, note)
  values (p_order_id, null, v_from_status::text, v_resolved, coalesce(p_note, null));

  insert into courier_events (
    courier_id, order_id, actor, event_type, from_value, to_value, note
  )
  values (
    v_courier_id,
    p_order_id,
    'courier',
    v_event_type,
    v_from_status::text,
    v_resolved,
    coalesce(p_note, '')
  );

  return v_resolved;
end;
$$;

-- ------------------------------------------------------------
-- RLS — admin-only for the new tables
-- ------------------------------------------------------------
alter table couriers enable row level security;
alter table courier_events enable row level security;

drop policy if exists "admin_all_couriers" on couriers;
create policy "admin_all_couriers"
on couriers for all
using (is_admin())
with check (is_admin());

drop policy if exists "admin_all_courier_events" on courier_events;
create policy "admin_all_courier_events"
on courier_events for all
using (is_admin())
with check (is_admin());

-- ------------------------------------------------------------
-- Grants (authenticated admins; RLS still applies)
-- ------------------------------------------------------------
grant select, insert, update, delete on couriers to authenticated;
grant select, insert, update, delete on courier_events to authenticated;

grant execute on function set_orders_courier(uuid[], uuid, uuid, text)
  to authenticated;
grant execute on function courier_update_order_status(text, uuid, order_status_enum, text)
  to authenticated;

-- ------------------------------------------------------------
-- Realtime — live courier positions to the admin live map.
-- RLS (admin-only) authorizes postgres_changes for admins.
-- ------------------------------------------------------------
alter publication supabase_realtime add table couriers;