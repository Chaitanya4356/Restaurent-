'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';

interface DishImageProps {
  /** Public Supabase Storage URL, or null when the owner has not uploaded a photo. */
  src: string | null | undefined;
  alt: string;
  /** Applied to the wrapper - give it a size (e.g. `aspect-[16/10]` or `w-12 h-12`). */
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Dish photo with a graceful fallback.
 *
 * Photos live in the public `dish-photos` Supabase Storage bucket and are
 * optimised by next/image (see `images.remotePatterns` in next.config.ts).
 * When there is no photo - or the stored URL stops resolving - a branded
 * placeholder is shown instead of a broken image icon.
 */
export function DishImage({
  src,
  alt,
  className = '',
  sizes = '(min-width: 768px) 50vw, 100vw',
  priority = false,
}: DishImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 text-stone-400 dark:text-stone-600 ${className}`}
        role="img"
        aria-label={`${alt} - photo coming soon`}
      >
        <UtensilsCrossed className="w-1/3 h-1/3 max-w-8 max-h-8 min-w-5 min-h-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
