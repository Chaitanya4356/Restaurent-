-- ============================================================================
-- 005_promotions_and_customer_accounts.sql
--
-- Part 1: Promotions engine (offers, coupons, redemption limits, budget caps)
-- Part 2: Customer accounts (Google sign-in profiles, own-order history via RLS)
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================


-- ===========================================================================
-- PART 1: PROMOTIONS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    -- NULL = automatic offer (no code needed). Otherwise the customer types it.
    code TEXT UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat', 'free_delivery')),
    -- percent: 1-100.  flat/free_delivery: paise.
    discount_value INTEGER NOT NULL CHECK (discount_value > 0),
    -- "20% off, up to ₹100"
    max_discount_paise INTEGER,
    applies_to TEXT NOT NULL DEFAULT 'order' CHECK (applies_to IN ('order', 'category', 'item')),
    min_order_paise INTEGER NOT NULL DEFAULT 0,
    order_type TEXT NOT NULL DEFAULT 'any' CHECK (order_type IN ('any', 'delivery', 'pickup')),
    customer_segment TEXT NOT NULL DEFAULT 'all'
        CHECK (customer_segment IN ('all', 'first_order', 'returning', 'loyalty_pass')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    days_of_week INTEGER[],              -- 0=Sunday .. 6=Saturday
    time_from TIME,
    time_to TIME,
    total_redemption_limit INTEGER NOT NULL DEFAULT 0,   -- 0 = unlimited
    per_customer_limit INTEGER NOT NULL DEFAULT 0,       -- 0 = unlimited (soft: phone based)
    times_redeemed INTEGER NOT NULL DEFAULT 0,
    budget_cap_paise INTEGER,            -- auto-pauses once discount_given_paise reaches this
    discount_given_paise INTEGER NOT NULL DEFAULT 0,
    is_stackable BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 100,   -- lower wins ties
    is_auto_apply BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    CONSTRAINT promotion_items_one_scope CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_phone TEXT,
    customer_user_id UUID,
    discount_paise INTEGER NOT NULL CHECK (discount_paise >= 0),
    code_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, is_auto_apply);
CREATE INDEX IF NOT EXISTS idx_promotion_items_promotion ON public.promotion_items(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion ON public.promotion_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_phone ON public.promotion_redemptions(customer_phone);

-- Orders gain the discount audit trail
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS discount_paise INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS promotion_id UUID,
    ADD COLUMN IF NOT EXISTS promotion_code TEXT,
    ADD COLUMN IF NOT EXISTS discount_breakdown JSONB;

-- Per-line allocation (correct refunds + reporting)
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS discount_paise INTEGER NOT NULL DEFAULT 0;


-- ===========================================================================
-- PART 2: CUSTOMER ACCOUNTS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    default_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link orders to an account (nullable: guest checkout keeps working)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);


-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Promotions are NEVER publicly readable (codes must not leak). The server
-- reads them with the service role and returns a sanitised view to the browser.
DROP POLICY IF EXISTS "Authenticated staff manage promotions" ON public.promotions;
CREATE POLICY "Authenticated staff manage promotions"
    ON public.promotions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated staff manage promotion items" ON public.promotion_items;
CREATE POLICY "Authenticated staff manage promotion items"
    ON public.promotion_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated staff view redemptions" ON public.promotion_redemptions;
CREATE POLICY "Authenticated staff view redemptions"
    ON public.promotion_redemptions FOR SELECT TO authenticated USING (true);

-- Profiles: a customer may only see and edit their own row
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
    ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
    ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Customers may read ONLY their own orders (and their items)
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
CREATE POLICY "Customers view own orders"
    ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers view own order items" ON public.order_items;
CREATE POLICY "Customers view own order items"
    ON public.order_items FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    ));


-- ===========================================================================
-- FUNCTIONS
-- ===========================================================================

-- Create a profile automatically for every new auth user (Google sign-in etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic redemption: enforces the total limit and budget cap under a row lock,
-- so two simultaneous orders cannot both take the last redemption.
CREATE OR REPLACE FUNCTION public.redeem_promotion(
    p_promotion_id UUID,
    p_order_id UUID,
    p_phone TEXT,
    p_user_id UUID,
    p_discount_paise INTEGER,
    p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_limit INTEGER;
    v_times INTEGER;
    v_budget_cap INTEGER;
    v_given INTEGER;
BEGIN
    SELECT total_redemption_limit, times_redeemed, budget_cap_paise, discount_given_paise
      INTO v_total_limit, v_times, v_budget_cap, v_given
      FROM public.promotions
     WHERE id = p_promotion_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_total_limit > 0 AND v_times >= v_total_limit THEN
        RETURN FALSE;
    END IF;

    IF v_budget_cap IS NOT NULL AND (v_given + p_discount_paise) > v_budget_cap THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.promotion_redemptions
        (promotion_id, order_id, customer_phone, customer_user_id, discount_paise, code_used)
    VALUES
        (p_promotion_id, p_order_id, p_phone, p_user_id, p_discount_paise, p_code);

    UPDATE public.promotions
       SET times_redeemed = times_redeemed + 1,
           discount_given_paise = discount_given_paise + p_discount_paise,
           updated_at = now()
     WHERE id = p_promotion_id;

    RETURN TRUE;
END;
$$;
