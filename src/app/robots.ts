import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://joshrestaurent.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/menu', '/track', '/contact', '/privacy', '/terms', '/refund'],
        disallow: ['/admin', '/admin/*', '/api/*', '/checkout'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
