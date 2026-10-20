import { Resend } from 'resend';
import { formatPaiseToRupees } from '@/lib/utils';
import type { Order, OrderItem } from '@/types/database';

/**
 * Sends a transactional order alert email to the restaurant owner via Resend.
 */
export async function sendOwnerOrderNotificationEmail({
  order,
  items,
}: {
  order: Order;
  items: Array<{
    item_name_snapshot: string;
    item_price_paise: number;
    quantity: number;
    subtotal_paise: number;
    item_notes?: string | null;
  }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL || 'bchaitanya096@gmail.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://joshrestaurent.vercel.app';

  if (!apiKey || apiKey.includes('placeholder')) {
    console.log(
      `[Resend Email Mock] RESEND_API_KEY not configured. Order notification simulated for order #${order.order_number} to ${ownerEmail}.`
    );
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);

    const itemsHtml = items
      .map(
        (it) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 10px 0; font-size: 14px; color: #1c1917;">
            <strong>${it.quantity}x ${it.item_name_snapshot}</strong>
            ${it.item_notes ? `<div style="font-size: 12px; color: #b45309; font-style: italic;">Note: ${it.item_notes}</div>` : ''}
          </td>
          <td style="padding: 10px 0; text-align: right; font-size: 14px; font-weight: bold; color: #1c1917;">
            ${formatPaiseToRupees(it.subtotal_paise)}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Order #${order.order_number}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf9; margin: 0; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e7e5e4;">
          
          <!-- Header Banner -->
          <div style="background-color: #d97706; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">🍛 JOSH RESTAURANT</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.95;">New Customer Order Received!</p>
          </div>

          <!-- Order Summary Badge -->
          <div style="padding: 24px 24px 12px 24px;">
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <div style="font-size: 16px; font-weight: bold; color: #92400e; margin-bottom: 4px;">
                Order #${order.order_number}
              </div>
              <div style="font-size: 13px; color: #78350f;">
                Fulfillment: <strong>${order.order_type === 'delivery' ? '🚴 Vizag Doorstep Delivery' : '🛍️ Counter Pickup'}</strong>
              </div>
              <div style="font-size: 13px; color: #78350f; margin-top: 2px;">
                Preferred Timing: <strong>${order.preferred_time}</strong>
              </div>
            </div>

            <!-- Customer Details -->
            <div style="margin-bottom: 20px; font-size: 13px; color: #44403c;">
              <p style="margin: 0 0 4px 0;"><strong>Customer:</strong> ${order.customer_name}</p>
              <p style="margin: 0 0 4px 0;"><strong>Phone:</strong> <a href="tel:${order.customer_phone}" style="color: #d97706; text-decoration: none;">+91 ${order.customer_phone}</a></p>
              ${order.delivery_address ? `<p style="margin: 0 0 4px 0;"><strong>Delivery Address:</strong> ${order.delivery_address}</p>` : ''}
              ${order.customer_notes ? `<p style="margin: 0 0 4px 0; color: #b45309;"><strong>Kitchen Note:</strong> ${order.customer_notes}</p>` : ''}
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #e7e5e4;">
                  <th style="text-align: left; padding-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #78716c;">Items</th>
                  <th style="text-align: right; padding-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #78716c;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Financials -->
            <div style="border-top: 2px solid #e7e5e4; padding-top: 12px; font-size: 13px; color: #44403c;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Subtotal:</span>
                <span style="font-weight: 600;">${formatPaiseToRupees(order.subtotal_paise)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Delivery Fee:</span>
                <span style="font-weight: 600;">${order.delivery_fee_paise === 0 ? 'FREE' : formatPaiseToRupees(order.delivery_fee_paise)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #d6d3d1; font-size: 16px; font-weight: 900; color: #1c1917;">
                <span>Total to Collect:</span>
                <span style="color: #d97706;">${formatPaiseToRupees(order.total_paise)}</span>
              </div>
              <div style="font-size: 12px; color: #78716c; margin-top: 4px; text-align: right;">
                Payment: ${order.payment_method === 'upi_on_delivery' ? 'UPI QR on Handoff' : 'Cash on Handoff'} (${order.payment_status.toUpperCase()})
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-top: 24px;">
              <a href="${siteUrl}/admin/orders" style="display: inline-block; background-color: #d97706; color: #ffffff; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
                Open Kitchen Dashboard & Cook →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f4; padding: 16px; text-align: center; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4;">
            Josh Restaurant • Beach Road, Siripuram, Visakhapatnam • +91 98765 43210
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Josh Restaurant <orders@resend.dev>', // Use verified domain once configured or resend default for dev
      to: [ownerEmail],
      subject: `🚨 New Order #${order.order_number} (${formatPaiseToRupees(order.total_paise)}) - Josh Restaurant`,
      html: htmlContent,
    });

    if (error) {
      console.warn('Resend email notification warning:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.warn('Failed to send order email:', error);
    return { success: false, error: 'Email service error' };
  }
}
