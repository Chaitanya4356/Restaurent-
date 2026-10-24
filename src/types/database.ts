export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DietaryType = 'veg' | 'non-veg';
export type OrderType = 'pickup' | 'delivery';
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'upi_on_delivery' | 'online_razorpay';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_paise: number;
  image_url: string | null;
  dietary_type: DietaryType;
  is_sold_out: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  /** Pincode captured at checkout (delivery orders only). */
  delivery_pincode?: string | null;
  /** Customer coordinates from "Use my location", when shared. */
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_distance_km?: number | null;
  estimated_delivery_minutes?: number | null;
  preferred_time: string;
  customer_notes: string | null;
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name_snapshot: string;
  item_price_paise: number;
  quantity: number;
  subtotal_paise: number;
  item_notes: string | null;
}

export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  phone_number: string;
  address: string;
  city: string;
  time_zone: string;
  opening_time: string;
  closing_time: string;
  order_cutoff_minutes: number;
  is_accepting_orders: boolean;
  delivery_fee_paise: number;
  free_delivery_threshold_paise: number;
  min_delivery_order_paise: number;
  /** Advertised delivery radius in km (owner-configurable). */
  delivery_radius_km?: number;
  /** Outlet coordinates - enable distance-based gating and ETA. */
  outlet_latitude?: number | null;
  outlet_longitude?: number | null;
  /** Kitchen prep time (minutes) used in the delivery ETA. */
  prep_time_minutes?: number;
  /** Average city speed (km/h) used in the delivery ETA. */
  avg_speed_kmh?: number;
  brand_color_primary: string;
  brand_logo_url: string | null;
  /** Browser tab icon (falls back to the logo when empty). */
  brand_favicon_url?: string | null;
  /** UPI collection details - owner-configurable, shown to online-payment customers. */
  upi_id?: string | null;
  upi_phone?: string | null;
  upi_qr_url?: string | null;
  upi_payee_name?: string | null;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

/** Owner-managed delivery serviceability entry. */
export interface DeliveryPincode {
  pincode: string;
  area_name: string | null;
  is_active: boolean;
  created_at?: string;
}
