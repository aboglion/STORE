-- ============================================================
-- 0008_dispatch.sql
-- Uber/Bolt-style broadcast dispatch:
--
--   * Every unassigned, deliverable order (status = confirmed or
--     preparing, courier_id IS NULL) is broadcast to ALL active
--     couriers as a "request".
--   * claim_order()  — atomic first-come-first-served: the first
--     courier to accept gets the order locked to them (row-lock +
--     guarded update, so two concurrent claims cannot both win).
--   * decline_order() — returns the order to the pool; it is then
--     broadcast again to everyone, and whoever accepts next gets it.
--   * A courier may hold several orders simultaneously.
--
-- Admin assignment (set_orders_courier) still works and simply
-- removes the order from the public pool.
-- ============================================================

-- ------------------------------------------------------------
-- courier_events: new event types for dispatch
-- ------------------------------------------------------------
alter table courier_events
  drop constraint if exists courier_events_event_type_check;

alter table courier_events
  add constraint courier_events_event_type_check
  check (event_type in (
    'courier_created', 'courier_updated', 'courier_deactivated',
    'courier_activated', 'token_regenerated',
    'assigned', 'transferred', 'returned_to_store',
    'claimed', 'declined',
    'status_changed', 'problem_reported'
  ));

-- ------------------------------------------------------------
-- Pool index: fast "give me all broadcastable orders" queries
-- ------------------------------------------------------------
create index if not exists idx_orders_pool
  on orders(status) where courier_id is null;

-- ============================================================
-- claim_order
-- Atomic accept: only succeeds while the order is still in the
-- pool. Concurrency-safe (row lock + guarded UPDATE ... WHERE
-- courier_id IS NULL). Logs events for the order and the courier.
-- ============================================================
create or replace function claim_order(
  p_token text,
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid;
  v_courier_active boolean;
  v_courier_name text;
  v_status order_status_enum;
  v_order_courier_id uuid;
  v_claimed boolean := false;
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

  -- Lock the order row: concurrent claims serialize here.
  select status, courier_id
    into v_status, v_order_courier_id
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_status not in ('confirmed', 'preparing') then
    raise exception 'NOT_CLAIMABLE';
  end if;

  if v_order_courier_id is not null then
    raise exception 'ALREADY_CLAIMED';
  end if;

  -- Guarded update: even if another transaction slipped through,
  -- only an unassigned row can match.
  update orders
    set courier_id = v_courier_id,
        assigned_at = now(),
        updated_at = now()
  where id = p_order_id
    and courier_id is null;

  if not found then
    raise exception 'ALREADY_CLAIMED';
  end if;

  insert into order_events (order_id, from_status, to_status, note)
  values (p_order_id, v_status::text, v_status::text, 'ההזמנה נתפסה ע"י ' || v_courier_name);

  insert into courier_events (
    courier_id, order_id, actor, event_type, from_value, to_value, note
  )
  values (
    v_courier_id, p_order_id, 'courier', 'claimed',
    null, v_courier_id::text, null
  );

  return true;
end;
$$;

-- ============================================================
-- decline_order
-- Cancels the courier's claim and returns the order to the pool.
-- Only possible before the courier starts the delivery.
-- ============================================================
create or replace function decline_order(
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
    raise exception 'CANT_DECLINE_STARTED';
  end if;

  update orders
    set courier_id = null,
        assigned_at = null,
        updated_at = now()
  where id = p_order_id;

  insert into order_events (order_id, from_status, to_status, note)
  values (p_order_id, v_status::text, v_status::text, 'ההזמנה הוחזרה למאגר' || coalesce(': ' || p_note, ''));

  insert into courier_events (
    courier_id, order_id, actor, event_type, from_value, to_value, note
  )
  values (
    v_courier_id, p_order_id, 'courier', 'declined',
    v_courier_id::text, null, p_note
  );

  return true;
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
grant execute on function claim_order(text, uuid) to authenticated;
grant execute on function decline_order(text, uuid, text) to authenticated;