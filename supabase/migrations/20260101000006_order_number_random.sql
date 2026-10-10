-- ============================================================
-- 0006_order_number_random.sql
-- Order numbers become non-enumerable: YYYYMMDD-XXXXXX with a
-- random 6-character suffix instead of a sequential counter.
--
-- Rationale: sequential order numbers (YYYYMMDD-000001) combined
-- with public order tracking allowed anyone to enumerate every
-- order. Random suffixes make order numbers unguessable; lookups
-- additionally require the customer's phone number (see the
-- hardened getPublicOrder server action).
--
-- Existing orders keep their current numbers. The order_number_seq
-- sequence is left in place (harmless) for backward compatibility.
-- ============================================================

alter table orders
  alter column order_number
  set default (
    to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
  );