-- ============================================================================
-- 006_favicon.sql
-- A dedicated browser-tab icon, separate from the header/footer logo.
-- (Favicons need a simple square mark; header logos are often wider lockups.)
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS brand_favicon_url TEXT;

NOTIFY pgrst, 'reload schema';
