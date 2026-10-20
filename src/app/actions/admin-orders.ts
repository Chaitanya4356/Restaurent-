'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderStatus, PaymentStatus } from '@/types/database';
import { revalidatePath } from 'next/cache';

/**
 * Server action to update an order's status (e.g. new -> preparing -> ready -> completed).
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update order status:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/order-confirmation');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateOrderStatus:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

/**
 * Server action to mark an order as paid.
 */
export async function updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update payment status' };
  }
}
