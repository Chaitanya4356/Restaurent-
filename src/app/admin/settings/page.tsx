import React from 'react';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminSettingsManager } from '@/components/AdminSettingsManager';
import type { RestaurantSettings } from '@/types/database';

export const metadata: Metadata = {
  title: 'Restaurant Settings | Josh Admin',
  description: 'Manage store hours, emergency order switch, and delivery policies.',
};

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const initialSettings: RestaurantSettings = settings || {
    id: 1,
    restaurant_name: 'Josh',
    phone_number: '+91 98765 43210',
    address: 'Beach Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003',
    city: 'Visakhapatnam',
    time_zone: 'Asia/Kolkata',
    opening_time: '07:00:00',
    closing_time: '23:00:00',
    order_cutoff_minutes: 20,
    is_accepting_orders: true,
    delivery_fee_paise: 4000,
    free_delivery_threshold_paise: 50000,
    min_delivery_order_paise: 10000,
    brand_color_primary: '#E65100',
    brand_logo_url: null,
  };

  return <AdminSettingsManager initialSettings={initialSettings} />;
}
