-- ============================================================================
-- 003_delivery_radius.sql
-- Owner-configurable delivery radius (shown to customers).
--
-- NOTE: this value is the *advertised* delivery area. Actual delivery
-- eligibility is enforced by the pincode allow-list (002_delivery_pincodes.sql).
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER NOT NULL DEFAULT 20;

-- Keep it sane: 1 km .. 100 km
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_radius_range'
    ) THEN
        ALTER TABLE public.restaurant_settings
            ADD CONSTRAINT restaurant_settings_radius_range
            CHECK (delivery_radius_km >= 1 AND delivery_radius_km <= 100);
    END IF;
END $$;
