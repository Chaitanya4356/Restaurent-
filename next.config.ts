import type { NextConfig } from 'next';

/**
 * Allow next/image to optimise dish photos served from the Supabase Storage
 * public bucket. The host is derived from the project URL so the same config
 * works for local, preview and production environments.
 */
function supabaseImageHost(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : '**.supabase.co';
  } catch {
    return '**.supabase.co';
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseImageHost(),
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
