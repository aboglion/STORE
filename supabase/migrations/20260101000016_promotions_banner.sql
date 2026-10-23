-- ============================================================
-- 0016_promotions_banner.sql
-- Adds a per-promotion display image and a site-wide promotions
-- banner (stored in the settings table) shown at the top of the
-- public promotions page.
-- ============================================================

-- Per-promotion card image (storage path in the product-images bucket).
alter table promotions add column if not exists image_path text;

-- The banner is a settings row: key = 'promotions_banner',
-- value = { image_path, title_he, title_ar, enabled }.
-- No schema change needed — settings.value is jsonb and RLS already
-- covers public reads + admin writes.