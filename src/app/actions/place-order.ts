'use server';

import { checkoutFormSchema, type CheckoutFormData } from '@/lib/validation/checkout';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateStoreStatus } from '@/lib/opening-hours';
import { calculateDeliveryFee, validateDeliveryMinimum } from '@/lib/pricing';
import { sendOwnerOrderNotificationEmail } from '@/lib/email/order-notification';
import type { Order } from '@/types/database';

export interface PlaceOrderResult {
  success: boolean;
  orderNumber?: string;
  orderId?: string;
  error?: string;
}

/**
 * Server action to securely place an order.
 * 
 * STRICT SECURITY & INTEGRITY RULES:
 * 1. Validates all inputs using Zod on the server.
 * 2. Checks store operating hours and order cutoff in Asia/Kolkata timezone.
 * 3. Never trusts client prices or totals. Recalculates every subtotal, delivery fee,
 *    and grand total directly from the database menu_items table.
 * 4. Verifies no items are sold out or inactive.
 * 5. Saves immutable historical snapshots in order_items.
 */
export async function placeOrder(formData: CheckoutFormData): Promise<PlaceOrderResult> {
  try {
    // 1. Zod Validation
    const parsed = checkoutFormSchema.safeParse(formData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid form data';
      return { success: false, error: firstError };
    }

    const data = parsed.data;
    const adminSupabase = createAdminClient();

    // 2. Fetch Restaurant Settings & Verify Store Hours
    const { data: settings, error: settingsError } = await adminSupabase
      .from('restaurant_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.error('Failed to load restaurant settings:', settingsError);
      return { success: false, error: 'Failed to verify store settings. Please try again.' };
    }

    const storeStatus = calculateStoreStatus(
      settings.is_accepting_orders,
      settings.opening_time,
      settings.closing_time,
      settings.order_cutoff_minutes,
      new Date()
    );

    if (!storeStatus.canAcceptOrders) {
      return {
        success: false,
        error: `Sorry, we are currently not accepting online orders (${storeStatus.statusText}).`,
      };
    }

    // 3. Fetch Items from Database & Verify Availability
    const itemIds = data.items.map((i) => i.menuItemId);
    const { data: dbItems, error: itemsError } = await adminSupabase
      .from('menu_items')
      .select('*')
      .in('id', itemIds);

    if (itemsError || !dbItems || dbItems.length === 0) {
      return { success: false, error: 'Could not retrieve menu items from the database.' };
    }

    const dbItemMap = new Map(dbItems.map((item) => [item.id, item]));

    // Check if every ordered item exists, is active, and not sold out
    let recalculatedSubtotalPaise = 0;
    const itemsToSnapshot: Array<{
      menu_item_id: string;
      item_name_snapshot: string;
      item_price_paise: number;
      quantity: number;
      subtotal_paise: number;
      item_notes: string | null;
    }> = [];

    for (const orderItem of data.items) {
      const dbItem = dbItemMap.get(orderItem.menuItemId);

      if (!dbItem) {
        return { success: false, error: 'One or more items in your cart no longer exist.' };
      }

      if (!dbItem.is_active) {
        return { success: false, error: `"${dbItem.name}" is currently unavailable.` };
      }

      if (dbItem.is_sold_out) {
        return { success: false, error: `Sorry, "${dbItem.name}" has just sold out.` };
      }

      const itemLineTotal = dbItem.price_paise * orderItem.quantity;
      recalculatedSubtotalPaise += itemLineTotal;

      itemsToSnapshot.push({
        menu_item_id: dbItem.id,
        item_name_snapshot: dbItem.name,
        item_price_paise: dbItem.price_paise,
        quantity: orderItem.quantity,
        subtotal_paise: itemLineTotal,
        item_notes: orderItem.notes?.trim() ? orderItem.notes.trim() : null,
      });
    }

    // 4. Validate Delivery Limits & Fees
    const deliveryCheck = validateDeliveryMinimum(
      recalculatedSubtotalPaise,
      data.orderType,
      settings.min_delivery_order_paise
    );

    if (!deliveryCheck.isValid) {
      const minRupees = settings.min_delivery_order_paise / 100;
      return {
        success: false,
        error: `Minimum order amount for delivery in Vizag is ₹${minRupees}. Please add more items.`,
      };
    }

    const deliveryFeePaise = calculateDeliveryFee(
      recalculatedSubtotalPaise,
      data.orderType,
      settings.free_delivery_threshold_paise,
      settings.delivery_fee_paise
    );

    const recalculatedTotalPaise = recalculatedSubtotalPaise + deliveryFeePaise;

    // 5. Generate Human-Readable Order Number (e.g. JOSH-20261020-4921)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `JOSH-${dateStr}-${randomSuffix}`;

    // 6. Insert Order into Database
    const { data: newOrder, error: orderInsertError } = await adminSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        status: 'new',
        order_type: data.orderType,
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone.trim(),
        delivery_address: data.orderType === 'delivery' ? data.deliveryAddress?.trim() : null,
        preferred_time: data.preferredTime,
        customer_notes: data.customerNotes?.trim() ? data.customerNotes.trim() : null,
        subtotal_paise: recalculatedSubtotalPaise,
        delivery_fee_paise: deliveryFeePaise,
        total_paise: recalculatedTotalPaise,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
      })
      .select('id, order_number')
      .single();

    if (orderInsertError || !newOrder) {
      console.error('Order insertion failed:', orderInsertError);
      return { success: false, error: 'Database error placing your order. Please try again.' };
    }

    // 7. Insert Historical Snapshots into order_items
    const orderItemsRows = itemsToSnapshot.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }));

    const { error: itemsInsertError } = await adminSupabase
      .from('order_items')
      .insert(orderItemsRows);

    if (itemsInsertError) {
      console.error('Failed to insert order items snapshot:', itemsInsertError);
      // Order header is already created, so we log and proceed
    }

    // 8. Send Transactional Email Notification to Owner (Resend)
    const { data: fullOrder } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('id', newOrder.id)
      .single();

    if (fullOrder) {
      sendOwnerOrderNotificationEmail({
        order: fullOrder as Order,
        items: itemsToSnapshot,
      }).catch((err) => console.warn('Email dispatch warning:', err));
    }

    return {
      success: true,
      orderNumber: newOrder.order_number,
      orderId: newOrder.id,
    };
  } catch (error) {
    console.error('Unexpected error placing order:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
