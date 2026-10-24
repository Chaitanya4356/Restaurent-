'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import type { MenuItem } from '@/types/database';
import { Loader2, RotateCcw } from 'lucide-react';

/**
 * "Order again" - rebuilds the cart from a past order using the CURRENT menu
 * (so prices and availability are always correct). Items that have since been
 * removed or sold out are skipped.
 */
export function ReorderButton({
  items,
}: {
  items: Array<{ item: MenuItem; quantity: number }>;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleReorder = () => {
    if (items.length === 0) return;
    setIsLoading(true);

    for (const entry of items) {
      addToCart(entry.item, entry.quantity);
    }

    router.push('/checkout');
  };

  if (items.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-[11px] font-bold shadow-xs transition"
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <RotateCcw className="w-3 h-3" />
      )}
      <span>Order again</span>
    </button>
  );
}
