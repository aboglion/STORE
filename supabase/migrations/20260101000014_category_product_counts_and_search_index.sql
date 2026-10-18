-- Migration 20260101000014_category_product_counts_and_search_index.sql
-- Adds trigram indexing on products for fast Hebrew and Arabic search,
-- and creates category_product_counts view for real product totals per category.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_he_trgm ON products USING gin (name_he gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_ar_trgm ON products USING gin (name_ar gin_trgm_ops) WHERE name_ar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm ON products USING gin (barcode gin_trgm_ops) WHERE barcode IS NOT NULL;

CREATE OR REPLACE VIEW category_product_counts AS
SELECT c.id as category_id, COUNT(p.id)::int as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
WHERE c.is_active = true
GROUP BY c.id;

GRANT SELECT ON category_product_counts TO anon, authenticated;
