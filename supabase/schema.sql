-- ==============================================================================
-- Josh Restaurant - Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price_paise INTEGER NOT NULL CHECK (price_paise > 0),
    image_url TEXT,
    dietary_type TEXT NOT NULL CHECK (dietary_type IN ('veg', 'non-veg')),
    is_sold_out BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RESTAURANT SETTINGS (SINGLETON TABLE)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    restaurant_name TEXT NOT NULL DEFAULT 'Josh',
    phone_number TEXT NOT NULL DEFAULT '+91 98765 43210',
    address TEXT NOT NULL DEFAULT 'Beach Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003',
    city TEXT NOT NULL DEFAULT 'Visakhapatnam',
    time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    opening_time TIME NOT NULL DEFAULT '07:00:00',
    closing_time TIME NOT NULL DEFAULT '23:00:00',
    order_cutoff_minutes INTEGER NOT NULL DEFAULT 20,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
    delivery_fee_paise INTEGER NOT NULL DEFAULT 4000,           -- ₹40.00
    free_delivery_threshold_paise INTEGER NOT NULL DEFAULT 50000, -- Free above ₹500.00
    min_delivery_order_paise INTEGER NOT NULL DEFAULT 10000,    -- ₹100.00 minimum
    delivery_radius_km INTEGER NOT NULL DEFAULT 20 CHECK (delivery_radius_km >= 1 AND delivery_radius_km <= 100),
    -- Outlet location + ETA estimation (see migrations/004_delivery_eta.sql)
    outlet_latitude NUMERIC(9,6),
    outlet_longitude NUMERIC(9,6),
    prep_time_minutes INTEGER NOT NULL DEFAULT 25 CHECK (prep_time_minutes >= 0 AND prep_time_minutes <= 240),
    avg_speed_kmh INTEGER NOT NULL DEFAULT 18 CHECK (avg_speed_kmh >= 1 AND avg_speed_kmh <= 120),
    brand_color_primary TEXT NOT NULL DEFAULT '#E65100',
    brand_logo_url TEXT,
    -- Owner-configurable UPI collection details (shown to customers who
    -- choose online payment; see supabase/migrations/001_upi_payment_settings.sql)
    upi_id TEXT,
    upi_phone TEXT,
    upi_qr_url TEXT,
    upi_payee_name TEXT,
    -- Dedicated browser tab icon (falls back to brand_logo_url)
    brand_favicon_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
    order_type TEXT NOT NULL CHECK (order_type IN ('pickup', 'delivery')),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT,
    delivery_pincode TEXT,
    delivery_latitude NUMERIC(9,6),
    delivery_longitude NUMERIC(9,6),
    delivery_distance_km NUMERIC(5,2),
    estimated_delivery_minutes INTEGER,
    preferred_time TEXT NOT NULL DEFAULT 'ASAP',
    customer_notes TEXT,
    subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
    delivery_fee_paise INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_paise >= 0),
    total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash_on_delivery', 'upi_on_delivery', 'online_razorpay')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ORDER ITEMS (HISTORICAL SNAPSHOT TABLE)CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name_snapshot TEXT NOT NULL,
    item_price_paise INTEGER NOT NULL CHECK (item_price_paise > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise > 0),
    item_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. DELIVERY PINCODES (OWNER-MANAGED SERVICEABILITY ALLOW-LIST)
-- An empty table means "deliver anywhere". Any rows restrict delivery to them.
CREATE TABLE IF NOT EXISTS public.delivery_pincodes (
    pincode TEXT PRIMARY KEY,
    area_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT delivery_pincodes_format CHECK (pincode ~ '^[1-9][0-9]{5}$')
);

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_display ON public.categories(display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pincodes_active ON public.delivery_pincodes(pincode) WHERE is_active = true;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pincodes ENABLE ROW LEVEL SECURITY;

-- 8.1 CATEGORIES POLICIES
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated staff manage categories" ON public.categories;
CREATE POLICY "Authenticated staff manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.2 MENU ITEMS POLICIES
DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
CREATE POLICY "Public can view active menu items"
    ON public.menu_items FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated staff manage menu items" ON public.menu_items;
CREATE POLICY "Authenticated staff manage menu items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.3 RESTAURANT SETTINGS POLICIES
DROP POLICY IF EXISTS "Public can view restaurant settings" ON public.restaurant_settings;
CREATE POLICY "Public can view restaurant settings"
    ON public.restaurant_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated staff update settings" ON public.restaurant_settings;
CREATE POLICY "Authenticated staff update settings"
    ON public.restaurant_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.4 ORDERS POLICIES
-- NOTE: Anonymous public users have ZERO direct access to orders table.
-- Server actions insert orders via the secure server-side admin role.
DROP POLICY IF EXISTS "Authenticated staff can view all orders" ON public.orders;
CREATE POLICY "Authenticated staff can view all orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated staff can update orders" ON public.orders;
CREATE POLICY "Authenticated staff can update orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8.5 ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Authenticated staff can view order items" ON public.order_items;
CREATE POLICY "Authenticated staff can view order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (true);

-- 8.6 DELIVERY PINCODE POLICIES
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

-- ==============================================================================
-- 9. STORAGE BUCKET FOR DISH PHOTOS
-- ==============================================================================
--
-- NOTE: tables added after this base schema live in supabase/migrations/.
-- On a fresh project run, apply them in order:
--   001_upi_payment_settings.sql
--   002_delivery_pincodes.sql
--   003_delivery_radius.sql
--   004_delivery_eta.sql
--   005_promotions_and_customer_accounts.sql   (promotions + customer accounts)
-- or simply run RUN_ALL_PENDING.sql plus 005.

-- Create bucket 'dish-photos' if not already created
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-photos', 'dish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read dish photos
DROP POLICY IF EXISTS "Public can view dish photos" ON storage.objects;
CREATE POLICY "Public can view dish photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'dish-photos');

-- Authenticated staff can upload and manage dish photos
DROP POLICY IF EXISTS "Staff can upload dish photos" ON storage.objects;
CREATE POLICY "Staff can upload dish photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'dish-photos');

DROP POLICY IF EXISTS "Staff can update dish photos" ON storage.objects;
CREATE POLICY "Staff can update dish photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'dish-photos');

DROP POLICY IF EXISTS "Staff can delete dish photos" ON storage.objects;
CREATE POLICY "Staff can delete dish photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'dish-photos');

-- ==============================================================================
-- 10. REALTIME CONFIGURATION
-- ==============================================================================
-- Enable Supabase Realtime publication on orders table for instant kitchen alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ==============================================================================
-- 12. IDEMPOTENT UPGRADES (safe to re-run on an existing project)
-- ==============================================================================

-- UPI payment details for existing installations
ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS upi_id TEXT,
    ADD COLUMN IF NOT EXISTS upi_phone TEXT,
    ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
    ADD COLUMN IF NOT EXISTS upi_payee_name TEXT;

-- Delivery pincode on existing orders (see migrations/002_delivery_pincodes.sql)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;

-- Owner-configurable delivery radius (see migrations/003_delivery_radius.sql)
ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER NOT NULL DEFAULT 20;

-- Dedicated favicon (see migrations/006_favicon.sql)
ALTER TABLE public.restaurant_settings
    ADD COLUMN IF NOT EXISTS brand_favicon_url TEXT;

-- Outlet location + ETA estimation (see migrations/004_delivery_eta.sql)
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

-- ==============================================================================
-- 11. SEED DATA (JOSH RESTAURANT)
-- ==============================================================================

-- 11.1 Default Settings Row
INSERT INTO public.restaurant_settings (
    id, restaurant_name, phone_number, address, city, time_zone,
    opening_time, closing_time, order_cutoff_minutes, is_accepting_orders,
    delivery_fee_paise, free_delivery_threshold_paise, min_delivery_order_paise,
    brand_color_primary
) VALUES (
    1, 'Josh', '+91 98765 43210', 'Beach Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003',
    'Visakhapatnam', 'Asia/Kolkata', '07:00:00', '23:00:00', 20, true,
    4000, 50000, 10000, '#E65100'
)
ON CONFLICT (id) DO UPDATE SET
    restaurant_name = EXCLUDED.restaurant_name,
    phone_number = EXCLUDED.phone_number,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    time_zone = EXCLUDED.time_zone,
    opening_time = EXCLUDED.opening_time,
    closing_time = EXCLUDED.closing_time,
    order_cutoff_minutes = EXCLUDED.order_cutoff_minutes,
    delivery_fee_paise = EXCLUDED.delivery_fee_paise,
    free_delivery_threshold_paise = EXCLUDED.free_delivery_threshold_paise,
    min_delivery_order_paise = EXCLUDED.min_delivery_order_paise;

-- 11.2 Categories
INSERT INTO public.categories (id, name, slug, display_order, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tiffins', 'tiffins', 1, true),
    ('22222222-2222-2222-2222-222222222222', 'Biryanis', 'biryanis', 2, true),
    ('33333333-3333-3333-3333-333333333333', 'Beverages', 'beverages', 3, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    display_order = EXCLUDED.display_order;

-- 11.3 Sample Menu Items
INSERT INTO public.menu_items (
    id, category_id, name, description, price_paise, dietary_type, is_sold_out, is_active, display_order
) VALUES
    -- Tiffins
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
     'Masala Dosa', 'Crispy golden crepe roasted in pure ghee, filled with savory spiced potato masala, served with 3 chutneys & piping hot sambar.',
     7000, 'veg', false, true, 1),

    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
     'Ghee Podi Idli', 'Mini button idlis tossed generously in homemade aromatic gun powder (karam podi) and organic desi ghee.',
     6000, 'veg', false, true, 2),

    ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
     'Medu Vada (2 Pcs)', 'Deep-fried crispy lentil fritters with a fluffy soft interior, seasoned with crushed pepper, cumin, and fresh curry leaves.',
     5000, 'veg', false, true, 3),

    ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
     'Egg Dosa', 'Street-style crispy dosa cracked and smeared with spiced egg masala, fresh green chillies, and finely chopped shallots.',
     8500, 'non-veg', false, true, 4),

    -- Biryanis
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'Josh Special Chicken Biryani', 'Aromatic aged long-grain basmati rice slow-dum cooked with succulent tender chicken cuts in rich South Indian spices. Served with spiced salan & cucumber raita.',
     24000, 'non-veg', false, true, 1),

    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'Mutton Sukka Biryani', 'Signature Vizag-style dry pepper mutton sukka tossed and layered over fragrant dum biryani rice.',
     32000, 'non-veg', false, true, 2),

    ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
     'Paneer Butter Dum Biryani', 'Fresh malai paneer cubes simmered in a spiced marinade and slow-dum layered with saffron-infused basmati rice.',
     21000, 'veg', false, true, 3),

    ('b4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222',
     'Guntur Spicy Chicken Biryani', 'Fiery Andhra-style dum biryani with red chili infused tender chicken cuts. Extra spicy!',
     25000, 'non-veg', false, true, 4),

    -- Beverages
    ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
     'Traditional Filter Coffee', 'Freshly brewed chicory-infused South Indian filter decoction blended with frothy hot whole milk.',
     3500, 'veg', false, true, 1),

    ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
     'Fresh Sweet & Salty Lime Soda', 'Chilled sparkling club soda muddled with freshly hand-squeezed lime juice and a dash of rock salt.',
     4000, 'veg', false, true, 2)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_paise = EXCLUDED.price_paise,
    dietary_type = EXCLUDED.dietary_type,
    is_sold_out = EXCLUDED.is_sold_out,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;
