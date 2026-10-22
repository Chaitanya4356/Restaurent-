'use client';

import React, { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { formatPaiseToRupees } from '@/lib/utils';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function CartDrawer() {
  const {
    items,
    updateQuantity,
    updateNotes,
    removeFromCart,
    clearCart,
    itemCount,
    subtotalPaise,
    deliveryFeePaise,
    totalPaise,
    freeDeliveryThresholdPaise,
    amountToFreeDeliveryPaise,
    minOrderPaise,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isCartDrawerOpen) {
        setIsCartDrawerOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartDrawerOpen, setIsCartDrawerOpen]);

  if (!isCartDrawerOpen) return null;

  const freeDeliveryProgressPercent = Math.min(
    100,
    Math.round((subtotalPaise / freeDeliveryThresholdPaise) * 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-white dark:bg-stone-900 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Your Order ({itemCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Meter */}
          {items.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 border-b border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {amountToFreeDeliveryPaise === 0
                    ? '🎉 You unlocked FREE delivery in Vizag!'
                    : `Add ${formatPaiseToRupees(amountToFreeDeliveryPaise)} more for FREE delivery`}
                </span>
                <span>{freeDeliveryProgressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${freeDeliveryProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
                <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
                  Your cart is empty
                </h3>
                <p className="text-sm text-stone-500 mb-6">
                  Add some freshly prepared South Indian tiffins or fragrant biryanis to start!
                </p>
                <Link
                  href="/menu"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-medium shadow-md transition"
                >
                  Explore Menu
                </Link>
              </div>
            ) : (
              items.map((cartItem) => (
                <div
                  key={cartItem.item.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-xs flex items-center justify-center border text-[8px] font-bold ${
                            cartItem.item.dietary_type === 'veg'
                              ? 'border-emerald-600 text-emerald-600'
                              : 'border-red-600 text-red-600'
                          }`}
                          title={cartItem.item.dietary_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          ●
                        </span>
                        <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                          {cartItem.item.name}
                        </h4>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {formatPaiseToRupees(cartItem.item.price_paise)} each
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-1">
                      <button
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.quantity - 1)
                        }
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                        aria-label={`Decrease quantity of ${cartItem.item.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.quantity + 1)
                        }
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                        aria-label={`Increase quantity of ${cartItem.item.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {formatPaiseToRupees(
                          cartItem.item.price_paise * cartItem.quantity
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Special Cooking Note for Item */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Special note (e.g. extra chutney, less spicy)"
                      value={cartItem.notes || ''}
                      onChange={(e) =>
                        updateNotes(cartItem.item.id, e.target.value)
                      }
                      className="text-xs w-full px-2.5 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => removeFromCart(cartItem.item.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                      aria-label={`Remove ${cartItem.item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatPaiseToRupees(subtotalPaise)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Vizag Delivery Fee (up to 20 km)</span>
                  <span className="font-medium">
                    {deliveryFeePaise === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      formatPaiseToRupees(deliveryFeePaise)
                    )}
                  </span>
                </div>
                <div className="border-t border-stone-200 dark:border-stone-700 pt-2 flex justify-between text-base font-bold text-stone-900 dark:text-stone-100">
                  <span>Estimated Total</span>
                  <span className="text-brand">
                    {formatPaiseToRupees(totalPaise)}
                  </span>
                </div>
              </div>

              {subtotalPaise < minOrderPaise && (
                <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-xs">
                  ⚠️ Minimum order for delivery is {formatPaiseToRupees(minOrderPaise)}.
                </div>
              )}

              <Link
                href="/checkout"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark active:scale-[0.98] text-white font-semibold shadow-lg shadow-brand/20 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
