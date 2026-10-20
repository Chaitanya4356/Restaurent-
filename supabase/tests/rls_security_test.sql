-- ==============================================================================
-- RLS Security Test: Proving Anonymous Users Cannot Read Orders
-- ==============================================================================

-- 1. Insert a test order as postgres / service_role (privileged backend)
INSERT INTO public.orders (
    id, order_number, status, order_type, customer_name, customer_phone,
    delivery_address, subtotal_paise, delivery_fee_paise, total_paise,
    payment_method, payment_status
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    'TEST-ORDER-001',
    'new',
    'delivery',
    'Private Customer',
    '9999999999',
    'Confidential Home Address',
    24000,
    4000,
    28000,
    'cash_on_delivery',
    'pending'
) ON CONFLICT (id) DO NOTHING;

-- 2. Switch session role to 'anon' (simulating anonymous customer or malicious scraper)
SET ROLE anon;

-- 3. Attempt to read from orders as anon
-- EXPECTED OUTCOME: 0 rows returned (blocked by Row Level Security)
SELECT
    count(*) AS anonymous_visible_orders_count,
    CASE 
        WHEN count(*) = 0 THEN 'PASSED: Anonymous users cannot read orders! RLS is strictly enforced.'
        ELSE 'FAILED: Security vulnerability detected! Anonymous users can read orders.'
    END AS test_result
FROM public.orders;

-- 4. Reset role back to postgres
RESET ROLE;

-- 5. Cleanup test order
DELETE FROM public.orders WHERE id = '99999999-9999-9999-9999-999999999999';
