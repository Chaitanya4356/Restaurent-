import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTrackingToken } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ orderNumber: string }>;
}

/**
 * Token-verified order status feed for the customer tracking page.
 *
 * Why this exists: Supabase Realtime `postgres_changes` honours RLS, and
 * anonymous visitors have no SELECT policy on `orders` (by design). A customer
 * tracking page therefore cannot subscribe to order changes directly.
 *
 * This endpoint reads with the service-role client, but only reveals the
 * STATUS of an order - never the customer's name, phone or address - and only
 * when the caller presents the signed tracking token for that exact order.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { orderNumber } = await params;
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing tracking token' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, payment_status, updated_at')
      .eq('order_number', orderNumber)
      .maybeSingle();

    // Unknown order and bad token return the same response.
    if (error || !data || !verifyTrackingToken(data.id, token)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Status history for the customer timeline (best effort - may be pre-migration)
    let events: Array<{ status: string; created_at: string; note: string | null }> = [];
    try {
      const { data: eventRows, error: eventError } = await supabase
        .from('order_status_events')
        .select('status, created_at, note')
        .eq('order_id', data.id)
        .order('created_at', { ascending: true });

      if (!eventError && eventRows) events = eventRows;
    } catch {
      // ignore - the timeline falls back to the order's created_at
    }

    return NextResponse.json(
      {
        status: data.status,
        paymentStatus: data.payment_status,
        updatedAt: data.updated_at,
        events,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('Failed to read order status:', e);
    return NextResponse.json({ error: 'Unable to read order status' }, { status: 500 });
  }
}
