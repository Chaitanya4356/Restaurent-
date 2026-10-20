import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Webhook route handler for verified Razorpay payments.
 * 
 * STRICT RULE:
 * An order is marked 'paid' ONLY by this verified payment webhook, never by the browser.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not configured in server environment');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing x-razorpay-signature header' },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    console.warn('Tampered or invalid Razorpay webhook signature received');
    return NextResponse.json(
      { error: 'Invalid cryptographic signature' },
      { status: 400 }
    );
  }

  try {
    const event = JSON.parse(rawBody);

    // Handle payment.captured or order.paid
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const supabase = createAdminClient();

        // Update order status to paid
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_id: paymentId || null,
            updated_at: new Date().toISOString(),
          })
          .or(`payment_id.eq.${orderId},order_number.eq.${paymentEntity?.notes?.order_number}`);

        if (error) {
          console.error('Failed to update order payment status via webhook:', error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        console.log(`[Razorpay Webhook] Successfully marked order paid: paymentId=${paymentId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook body:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
