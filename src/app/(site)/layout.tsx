import { CartProvider } from '@/context/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';

/**
 * Public customer storefront layout.
 *
 * Everything in the `(site)` group is publicly reachable and renders the full
 * customer experience: sticky header with cart counter, slide-out cart drawer
 * and the site footer. The `(staff)` group deliberately does NOT use this
 * layout, so staff screens never ship the customer cart/header bundle.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <CartDrawer />
      <Footer />
    </CartProvider>
  );
}
