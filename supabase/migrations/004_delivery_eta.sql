-- ============================================================================
-- 004_delivery_eta.sql
-- Outlet location + delivery ETA estimation.
--
-- Enables "Use my location" at checkout: the customer's coordinates give an
-- exact distance from the outlet, which gates delivery by radius and produces
-- a realistic estimated delivery time.
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS outlet_latitude NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS outlet_longitude NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS avg_speed_kmh INTEGER NOT NULL DEFAULT 18;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER;

-- Keep the numbers sane
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_prep_time_range') THEN
        ALTER TABLE public.restaurant_settings
            ADD CONSTRAINT restaurant_settings_prep_time_range
            CHECK (prep_time_minutes >= 0 AND prep_time_minutes <= 240);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_avg_speed_range') THEN
        ALTER TABLE public.restaurant_settings
            ADD CONSTRAINT restaurant_settings_avg_speed_range
            CHECK (avg_speed_kmh >= 1 AND avg_speed_kmh <= 120);
    END IF;
END $$;
