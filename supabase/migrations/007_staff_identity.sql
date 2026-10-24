-- ============================================================================
-- 007_staff_identity.sql
--
-- CRITICAL SECURITY FIX.
--
-- Until now "staff" meant "any authenticated user" (`USING (true)`), which was
-- fine while only the owner had an account. With customer Google sign-in that
-- becomes a hole: every signed-in customer would inherit staff powers (read all
-- orders, edit menu prices, change settings, manage storage).
--
-- This migration introduces an explicit staff list and rewrites every broad
-- policy to require it. Customers keep only their own-order policies.
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

-- 1. Who is staff?
CREATE TABLE IF NOT EXISTS public.staff_members (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- 2. Seed the owner (by email, so it works on any project)
INSERT INTO public.staff_members (user_id)
SELECT id FROM auth.users WHERE email = 'bchaitanya096@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Helper used by every policy. SECURITY DEFINER so it can read the staff
--    list without recursing through that table's own RLS.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = auth.uid());
$$;

-- Staff may see the staff list; nobody else can.
DROP POLICY IF EXISTS "Staff can view staff list" ON public.staff_members;
CREATE POLICY "Staff can view staff list"
    ON public.staff_members FOR SELECT TO authenticated
    USING (public.is_staff());


-- ============================================================================
-- 4. Replace every `TO authenticated USING (true)` policy with a staff check
-- ============================================================================

-- categories
DROP POLICY IF EXISTS "Authenticated staff manage categories" ON public.categories;
DROP POLICY IF EXISTS "Staff manage categories" ON public.categories;
CREATE POLICY "Staff manage categories"
    ON public.categories FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- menu_items
DROP POLICY IF EXISTS "Authenticated staff manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Staff manage menu items" ON public.menu_items;
CREATE POLICY "Staff manage menu items"
    ON public.menu_items FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- restaurant_settings
DROP POLICY IF EXISTS "Authenticated staff update settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Staff update settings" ON public.restaurant_settings;
CREATE POLICY "Staff update settings"
    ON public.restaurant_settings FOR UPDATE TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- orders: staff see/update everything; customers only their own
DROP POLICY IF EXISTS "Authenticated staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff view all orders" ON public.orders;
CREATE POLICY "Staff view all orders"
    ON public.orders FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Authenticated staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders"
    ON public.orders FOR UPDATE TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- order_items
DROP POLICY IF EXISTS "Authenticated staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff view order items" ON public.order_items;
CREATE POLICY "Staff view order items"
    ON public.order_items FOR SELECT TO authenticated
    USING (public.is_staff());

-- delivery_pincodes
DROP POLICY IF EXISTS "Authenticated staff manage delivery pincodes" ON public.delivery_pincodes;
DROP POLICY IF EXISTS "Staff manage delivery pincodes" ON public.delivery_pincodes;
CREATE POLICY "Staff manage delivery pincodes"
    ON public.delivery_pincodes FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

-- promotions
DROP POLICY IF EXISTS "Authenticated staff manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Staff manage promotions" ON public.promotions;
CREATE POLICY "Staff manage promotions"
    ON public.promotions FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Authenticated staff manage promotion items" ON public.promotion_items;
DROP POLICY IF EXISTS "Staff manage promotion items" ON public.promotion_items;
CREATE POLICY "Staff manage promotion items"
    ON public.promotion_items FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Authenticated staff view redemptions" ON public.promotion_redemptions;
DROP POLICY IF EXISTS "Staff view redemptions" ON public.promotion_redemptions;
CREATE POLICY "Staff view redemptions"
    ON public.promotion_redemptions FOR SELECT TO authenticated
    USING (public.is_staff());

-- storage: only staff may write dish photos / brand assets
DROP POLICY IF EXISTS "Staff can upload dish photos" ON storage.objects;
CREATE POLICY "Staff can upload dish photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'dish-photos' AND public.is_staff());

DROP POLICY IF EXISTS "Staff can update dish photos" ON storage.objects;
CREATE POLICY "Staff can update dish photos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'dish-photos' AND public.is_staff());

DROP POLICY IF EXISTS "Staff can delete dish photos" ON storage.objects;
CREATE POLICY "Staff can delete dish photos"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'dish-photos' AND public.is_staff());

NOTIFY pgrst, 'reload schema';
