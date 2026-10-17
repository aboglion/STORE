-- ============================================================
-- 0011_product_barcode.sql
-- Catalog import support:
--   * products.barcode — verified EAN, UNIQUE business key (the
--     import script upserts ON CONFLICT (barcode)). NULL is allowed
--     so legacy demo rows without a barcode keep working.
--   * products.barcode_original — raw barcode column from the CSV
--   * products.item_code — internal item code (קוד פריט)
--   * products.is_weighted — sold-by-weight flag (שקיל)
--   * products.barcode_status — barcode verification status text
--   * categories.image_path — storage path of the category generic
--     image (used as product placeholder when no photo exists)
-- ============================================================

alter table products
  add column if not exists barcode text unique,
  add column if not exists barcode_original text,
  add column if not exists item_code text,
  add column if not exists is_weighted boolean not null default false,
  add column if not exists barcode_status text;

create index if not exists idx_products_barcode
  on products(barcode);

alter table categories
  add column if not exists image_path text;