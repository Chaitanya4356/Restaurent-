import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://joshrestaurent.vercel.app'),
  openGraph: {
    title: 'Josh Restaurant | Authentic South Indian Tiffins & Biryanis',
    description: 'Crispy dosas, ghee podi idlis, and fragrant slow-dum biryanis delivered hot across Vizag within 20km.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://joshrestaurent.vercel.app',
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
  // NOTE: The root layout intentionally contains ONLY the document shell
  // (<html> / <body>). Customer chrome lives in the `(site)` route group and
  // staff chrome lives in the `(staff)` route group, so the kitchen portal is
  // never wrapped in the customer header / footer / cart drawer.
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <RestaurantJsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 antialiased selection:bg-amber-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
