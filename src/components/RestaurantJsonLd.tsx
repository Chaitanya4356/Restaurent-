import React from 'react';

/**
 * Structured Data (Schema.org Restaurant JSON-LD) for rich Google search results.
 */
export function RestaurantJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://joshrestaurent.vercel.app';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Josh Restaurant',
    alternateName: 'Josh South Indian Restaurant Vizag',
    description:
      'Authentic South Indian vegetarian tiffins, crispy dosas, and slow-dum fragrant biryanis prepared with pure desi ghee and fresh coastal spices.',
    url: siteUrl,
    telephone: '+919876543210',
    servesCuisine: ['South Indian', 'Vegetarian', 'Non-Vegetarian', 'Biryani', 'Andhra'],
    priceRange: '₹₹ (₹50 - ₹350)',
    acceptsReservations: 'False',
    hasMenu: `${siteUrl}/menu`,
    menu: `${siteUrl}/menu`,
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Beach Road, Siripuram',
      addressLocality: 'Visakhapatnam',
      addressRegion: 'Andhra Pradesh',
      postalCode: '530003',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '17.7214',
      longitude: '83.3155',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '07:00',
        closes: '23:00',
      },
    ],
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/menu`,
        inLanguage: 'en-US',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: [
        'http://purl.org/goodrelations/v1#DeliveryModeOwnFleet',
        'http://purl.org/goodrelations/v1#DeliveryModePickUp',
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
