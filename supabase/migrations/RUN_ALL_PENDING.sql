-- ============================================================================
-- RUN_ALL_PENDING.sql
-- One-shot migration for an existing Josh Restaurant project.
--
-- Paste this whole file into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- It is idempotent: running it twice (or after the individual migrations in
-- supabase/migrations/) is safe.
--
-- Contents:
--   001  UPI payment settings
--   002  Delivery pincode allow-list
--   003  Delivery radius
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 001 - UPI payment settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS upi_id TEXT,
    ADD COLUMN IF NOT EXISTS upi_phone TEXT,
    ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
    ADD COLUMN IF NOT EXISTS upi_payee_name TEXT;

-- ---------------------------------------------------------------------------
-- 002 - Delivery pincode allow-list
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_pincodes (
    pincode    TEXT PRIMARY KEY,
    area_name  TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT delivery_pincodes_format CHECK (pincode ~ '^[1-9][0-9]{5}$')
);

ALTER TABLE public.delivery_pincodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active delivery pincodes" ON public.delivery_pincodes;
CREATE POLICY "Public can view active delivery pincodes"
    ON public.delivery_pincodes FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated staff manage delivery pincodes" ON public.delivery_pincodes;
CREATE POLICY "Authenticated staff manage delivery pincodes"
    ON public.delivery_pincodes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_delivery_pincodes_active
    ON public.delivery_pincodes(pincode) WHERE is_active = true;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;

-- ---------------------------------------------------------------------------
-- 003 - Delivery radius
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER NOT NULL DEFAULT 20;

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
