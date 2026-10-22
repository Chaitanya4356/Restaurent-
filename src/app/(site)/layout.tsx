import type { CSSProperties } from 'react';
import { CartProvider } from '@/context/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { getPublicSettings } from '@/lib/settings';

/**
 * Public customer storefront layout.
 *
 * Everything in the `(site)` group is publicly reachable and renders the full
 * customer experience: sticky header with cart counter, slide-out cart drawer
 * and the site footer. The `(staff)` group deliberately does NOT use this
 * layout, so staff screens never ship the customer cart/header bundle.
 *
 * Live values from `restaurant_settings` (fees, contact details, brand colour)
 * are loaded here once and handed to every child component, so owner changes
 * in `/admin/settings` take effect across the storefront immediately.
 *
 * Rendered per request (not statically baked at build time) so those settings
 * are always current - the open/closed badge needs a live clock anyway.
 */
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();

  return (
    <div
      className="flex flex-1 flex-col"
      style={
        {
          '--brand': settings.brand_color_primary,
        } as CSSProperties
      }
    >
      <CartProvider
        deliveryFeePaise={settings.delivery_fee_paise}
        freeDeliveryThresholdPaise={settings.free_delivery_threshold_paise}
        minOrderPaise={settings.min_delivery_order_paise}
      >
        <Header
          restaurantName={settings.restaurant_name}
          phone={settings.phone_number}
          isAcceptingOrders={settings.is_accepting_orders}
          openingTime={settings.opening_time}
          closingTime={settings.closing_time}
          orderCutoffMinutes={settings.order_cutoff_minutes}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <CartDrawer />
        <Footer
          restaurantName={settings.restaurant_name}
          phone={settings.phone_number}
          address={settings.address}
          city={settings.city}
          openingTime={settings.opening_time}
          closingTime={settings.closing_time}
          orderCutoffMinutes={settings.order_cutoff_minutes}
          deliveryFeePaise={settings.delivery_fee_paise}
          freeDeliveryThresholdPaise={settings.free_delivery_threshold_paise}
          minDeliveryOrderPaise={settings.min_delivery_order_paise}
        />
      </CartProvider>
    </div>
  );
}
