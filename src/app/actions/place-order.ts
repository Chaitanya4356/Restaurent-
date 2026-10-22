'use server';

import { checkoutFormSchema, type CheckoutFormData } from '@/lib/validation/checkout';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateStoreStatus } from '@/lib/opening-hours';
import { calculateDeliveryFee, validateDeliveryMinimum } from '@/lib/pricing';
import { checkDeliveryServiceability } from '@/lib/delivery';
import { sendOwnerOrderNotificationEmail } from '@/lib/email/order-notification';
import { createTrackingToken } from '@/lib/tracking';
import type { Order } from '@/types/database';

export interface PlaceOrderResult {
  success: boolean;
  orderNumber?: string;
  orderId?: string;
  /** Signed capability token - required to view the live order tracking page. */
  trackToken?: string;
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

    // 4. Delivery Serviceability - exact distance when the customer shared their
    //    location, otherwise the owner's pincode allow-list. Same function the
    //    checkout uses, so the customer's answer is never contradicted.
    let deliveryDistanceKm: number | null = null;
    let estimatedDeliveryMinutes: number | null = null;

    if (data.orderType === 'delivery') {
      const { data: allowedPincodes, error: pincodeError } = await adminSupabase
        .from('delivery_pincodes')
        .select('pincode')
        .eq('is_active', true);

      if (pincodeError) {
        console.warn('Pincode list unavailable - falling back:', pincodeError.message);
      }

      const outlet =
        settings.outlet_latitude != null && settings.outlet_longitude != null
          ? {
              latitude: Number(settings.outlet_latitude),
              longitude: Number(settings.outlet_longitude),
            }
          : null;

      const coordinates =
        typeof data.deliveryLatitude === 'number' && typeof data.deliveryLongitude === 'number'
          ? { latitude: data.deliveryLatitude, longitude: data.deliveryLongitude }
          : null;

      const serviceability = checkDeliveryServiceability({
        pincode: data.deliveryPincode ?? null,
        coordinates,
        allowedPincodes: allowedPincodes ?? [],
        radiusKm: settings.delivery_radius_km ?? 20,
        outlet,
        prepTimeMinutes: settings.prep_time_minutes ?? 25,
        avgSpeedKmh: settings.avg_speed_kmh ?? 18,
      });

      if (!serviceability.serviceable) {
        return {
          success: false,
          error: serviceability.message ?? 'We do not deliver to your address yet.',
        };
      }

      deliveryDistanceKm = serviceability.distanceKm;
      estimatedDeliveryMinutes = serviceability.etaMinutes;
    }

    // 5. Validate Delivery Limits & Fees
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
    // The base payload works on every database version. `delivery_pincode` is
    // only added when it exists (see the retry below), so deploying this code
    // can never block orders before the migration has been run.
    const baseOrderPayload = {
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
    };

    const orderPayload = {
      ...baseOrderPayload,
      ...(data.orderType === 'delivery' && data.deliveryPincode
        ? { delivery_pincode: data.deliveryPincode }
        : {}),
      ...(data.orderType === 'delivery'
        ? {
            delivery_latitude: data.deliveryLatitude ?? null,
            delivery_longitude: data.deliveryLongitude ?? null,
            delivery_distance_km: deliveryDistanceKm,
            estimated_delivery_minutes: estimatedDeliveryMinutes,
          }
        : {}),
    };

    let insertResult = await adminSupabase
      .from('orders')
      .insert(orderPayload)
      .select('id, order_number')
      .single();

    // Pre-migration fallback: one or more of the newer delivery columns does not
    // exist yet. Retry with only the columns every version has, so a schema
    // change can never block a customer's order.
    if (insertResult.error && /schema cache|delivery_pincode|delivery_latitude|delivery_longitude|delivery_distance_km|estimated_delivery_minutes/i.test(insertResult.error.message)) {
      console.warn('Delivery columns missing - retrying with the core payload:', insertResult.error.message);
      insertResult = await adminSupabase
        .from('orders')
        .insert(baseOrderPayload)
        .select('id, order_number')
        .single();
    }

    const newOrder = insertResult.data;
    const orderInsertError = insertResult.error;

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
      trackToken: createTrackingToken(newOrder.id),
    };
  } catch (error) {
    console.error('Unexpected error placing order:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
