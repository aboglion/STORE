-- ============================================================
-- seed.sql — demo data for development
-- Run AFTER migrations 0001-0004.
-- ============================================================

-- ------------------------------------------------------------
-- Settings
-- ------------------------------------------------------------
insert into settings (key, value) values
  ('store_name', jsonb_build_object('value', 'החנות שלי')),
  ('delivery_fee_agorot', jsonb_build_object('value', 1500)),           -- 15.00 ₪
  ('free_delivery_threshold_agorot', jsonb_build_object('value', 20000)), -- 200.00 ₪
  ('low_stock_threshold_default', jsonb_build_object('value', 5)),
  ('currency', jsonb_build_object('value', 'ILS')),
  ('contact_phone', jsonb_build_object('value', '03-0000000'))
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- Demo categories
-- ------------------------------------------------------------
insert into categories (name_he, slug, sort_order) values
  ('מאפים', 'baked-goods', 1),
  ('עוגות', 'cakes', 2),
  ('משקאות', 'drinks', 3),
  ('מעדנים', 'delicatessen', 4)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Demo products (prices in agorot)
-- ------------------------------------------------------------
insert into products (
  category_id, slug, name_he, description_he,
  price_agorot, compare_at_price_agorot,
  stock_quantity, low_stock_threshold, is_active, sort_order
)
select
  c.id, v.slug, v.name_he, v.description_he,
  v.price_agorot::int, v.compare_at_price_agorot::int,
  v.stock_quantity::int, v.low_stock_threshold::int, true, v.sort_order::int
from (values
  ('baked-goods', 'baguette', 'בגט כפרי', 'בגט פריך שנאפה הבוקר בתנור אבנים. פרוסות עבות עם קראסט פריך.',
   990, null, 25, 5, 1),
  ('baked-goods', 'sourdough', 'לחם מחמצת', 'לחם מחמצת טבעי עם קראסט זהוב ולבב אוורירי. תוסס 24 שעות בלי שמרים.',
   1490, 1790, 18, 5, 2),
  ('cakes', 'chocolate-cake', 'עוגת שוקולד', 'עוגת שוקולד ביתית עשירה עם גנאש כפול. מתאימה לכבוד אורחים.',
   5500, null, 6, 2, 1),
  ('cakes', 'cheesecake', 'עוגת גבינה', 'עוגת גבינה קרמית על בסיס פירורים פריך, אפויה בתנור על אש נמוכה.',
   6200, 6900, 8, 2, 2),
  ('drinks', 'orange-juice', 'מיץ תפוזים סחוט', 'מיץ תפוזים טבעי 100% סחוט במקום, בלי תוספת סוכר.',
   1290, null, 40, 10, 1),
  ('drinks', 'coffee-beans', 'פולי קפה קלויים', 'פולי קפה איכותיים קלייה בינונית, ארומה עשירה עם ניחוחות שוקולד ואגוזים.',
   3400, 3900, 4, 3, 2),
  ('delicatessen', 'olive-mix', 'מבחר זיתים', 'מבחר זיתים כבושים ביתי: ירוקים, שחורים וקלמטה עם עשבי תיבול.',
   1890, null, 30, 5, 1),
  ('delicatessen', 'feta', 'גבינת פטה', 'גבינת פטה מלוחה במלח, איכותית וקרמית. נהדרת לסלטים ולפאי.',
   2490, null, 0, 3, 2)
) as v(category_slug, slug, name_he, description_he, price_agorot, compare_at_price_agorot, stock_quantity, low_stock_threshold, sort_order)
join categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- ============================================================
-- BOOTSTRAP YOUR FIRST ADMIN (uncomment after creating the user):
-- 1. In Supabase Dashboard → Authentication → Users → Add user
--    (email + password).
-- 2. Copy the user's UUID and run:
--
-- insert into admin_profiles (id, email, role)
-- values (
--   'REPLACE_WITH_USER_UUID',
--   'admin@example.com',
--   'admin'
-- );
-- ============================================================