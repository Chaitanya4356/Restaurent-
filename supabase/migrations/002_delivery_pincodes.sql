-- ============================================================================
-- 002_delivery_pincodes.sql
-- Delivery serviceability: an owner-managed allow-list of pincodes.
--
-- Behaviour:
--   * No rows  -> delivery is open to every address (backwards compatible)
--   * Rows     -> only those pincodes can place a delivery order
--                 (pickup orders are never restricted)
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_pincodes (
    pincode    TEXT PRIMARY KEY,
    area_name  TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT delivery_pincodes_format CHECK (pincode ~ '^[1-9][0-9]{5}$')
);

ALTER TABLE public.delivery_pincodes ENABLE ROW LEVEL SECURITY;

-- Customers may read the serviceable list (needed for the checkout hint)
DROP POLICY IF EXISTS "Public can view active delivery pincodes" ON public.delivery_pincodes;
CREATE POLICY "Public can view active delivery pincodes"
    ON public.delivery_pincodes FOR SELECT
    USING (is_active = true);

-- Staff manage the list from /admin/settings
DROP POLICY IF EXISTS "Authenticated staff manage delivery pincodes" ON public.delivery_pincodes;
CREATE POLICY "Authenticated staff manage delivery pincodes"
    ON public.delivery_pincodes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_delivery_pincodes_active
    ON public.delivery_pincodes(pincode) WHERE is_active = true;

-- Remember which pincode each delivery order went to (for reports/analysis)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;

-- ---------------------------------------------------------------------------
-- OPTIONAL starter list: uncomment and adjust to your actual service area.
-- ---------------------------------------------------------------------------
-- INSERT INTO public.delivery_pincodes (pincode, area_name) VALUES
--     ('530001', 'Visakhapatnam GPO'),
--     ('530002', 'Jagadamba Centre'),
--     ('530003', 'Siripuram / Beach Road'),
--     ('530004', 'Dwaraka Nagar'),
--     ('530016', 'MVP Colony'),
--     ('530017', 'Seethammadhara'),
--     ('530020', 'Gajuwaka')
-- ON CONFLICT (pincode) DO NOTHING;
