import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { RestaurantJsonLd } from '@/components/RestaurantJsonLd';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Josh Restaurant | Authentic South Indian Tiffins & Biryanis in Vizag',
  description:
    'Order fresh South Indian tiffins, crispy dosas, and authentic slow-dum biryanis online from Josh Restaurant in Visakhapatnam. Fast delivery within 20km.',
  metadataBase: new URL('https://joshrestaurent.vercel.app'),
  openGraph: {
    title: 'Josh Restaurant | Authentic South Indian Tiffins & Biryanis',
    description: 'Crispy dosas, ghee podi idlis, and fragrant slow-dum biryanis delivered hot across Vizag within 20km.',
    url: 'https://joshrestaurent.vercel.app',
    siteName: 'Josh Restaurant',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Josh Restaurant Vizag',
    description: 'Authentic South Indian dining and online delivery in Visakhapatnam.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <RestaurantJsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 antialiased selection:bg-amber-500 selection:text-white">
        <CartProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </main>
          <CartDrawer />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
