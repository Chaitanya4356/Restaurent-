-- ============================================================================
-- 008_order_status_events.sql
-- Real status history, so customers see a timeline with timestamps
-- ("Ordered 7:10 PM → Cooking 7:14 PM → Ready 7:38 PM") instead of just the
-- current status.
--
-- Safe to run more than once. Paste into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order
    ON public.order_status_events(order_id, created_at);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- A customer may read the timeline of their own orders only
DROP POLICY IF EXISTS "Customers view own order events" ON public.order_status_events;
CREATE POLICY "Customers view own order events"
    ON public.order_status_events FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_status_events.order_id AND o.user_id = auth.uid()
    ));

-- Staff may read every timeline
DROP POLICY IF EXISTS "Staff view order events" ON public.order_status_events;
CREATE POLICY "Staff view order events"
    ON public.order_status_events FOR SELECT TO authenticated
    USING (public.is_staff());

-- Backfill existing orders so their history is not empty
INSERT INTO public.order_status_events (order_id, status, created_at)
SELECT o.id, 'new', o.created_at
FROM public.orders o
WHERE NOT EXISTS (
    SELECT 1 FROM public.order_status_events e WHERE e.order_id = o.id
);

INSERT INTO public.order_status_events (order_id, status, created_at)
SELECT o.id, o.status, o.updated_at
FROM public.orders o
WHERE o.status <> 'new'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_status_events e
    WHERE e.order_id = o.id AND e.status = o.status
  );

NOTIFY pgrst, 'reload schema';
