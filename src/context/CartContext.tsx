'use client';

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import type { MenuItem } from '@/types/database';
import {
  DEFAULT_DELIVERY_FEE_PAISE,
  DEFAULT_DELIVERY_RADIUS_KM,
  DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE,
  DEFAULT_MIN_DELIVERY_ORDER_PAISE,
  calculateOrderTotals,
} from '@/lib/pricing';

export interface CartItem {
  item: MenuItem;
  quantity: number;
  notes: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, notes?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  freeDeliveryThresholdPaise: number;
  amountToFreeDeliveryPaise: number;
  minOrderPaise: number;
  /** Advertised delivery radius in km (from restaurant settings). */
  deliveryRadiusKm: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

interface CartProviderProps {
  children: React.ReactNode;
  /** Live value from restaurant_settings (falls back to the platform defaults). */
  deliveryFeePaise?: number;
  freeDeliveryThresholdPaise?: number;
  minOrderPaise?: number;
  deliveryRadiusKm?: number;
}

const CART_STORAGE_KEY = 'josh_restaurant_cart_v1';
const EMPTY_CART: CartItem[] = [];

/**
 * The cart lives in a tiny module-level store backed by localStorage and is
 * read through `useSyncExternalStore`.
 *
 * Why not `useEffect` + `setState`? Reading localStorage inside an effect
 * causes a cascading render (and a lint error), and it flashes an empty cart
 * on every page load. `useSyncExternalStore` uses `getServerSnapshot` during
 * SSR/hydration and the real snapshot immediately after, so there is no
 * hydration mismatch and no effect needed.
 */
let cachedItems: CartItem[] | null = null;
const listeners = new Set<() => void>();

function readCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return EMPTY_CART;

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CART;

    // Defensive: ignore malformed entries instead of crashing the storefront.
    return parsed.filter(
      (entry): entry is CartItem =>
        !!entry &&
        typeof entry === 'object' &&
        'item' in entry &&
        'quantity' in entry &&
        typeof (entry as CartItem).quantity === 'number' &&
        !!(entry as CartItem).item?.id
    );
  } catch (e) {
    console.error('Failed to read cart from localStorage:', e);
    return EMPTY_CART;
  }
}

function getSnapshot(): CartItem[] {
  if (cachedItems === null) {
    cachedItems = readCartFromStorage();
  }
  return cachedItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commitCart(updater: (previous: CartItem[]) => CartItem[]) {
  const next = updater(getSnapshot());
  cachedItems = next;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save cart to localStorage:', e);
  }

  listeners.forEach((listener) => listener());
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
  deliveryFeePaise: configuredDeliveryFeePaise = DEFAULT_DELIVERY_FEE_PAISE,
  freeDeliveryThresholdPaise = DEFAULT_FREE_DELIVERY_THRESHOLD_PAISE,
  minOrderPaise = DEFAULT_MIN_DELIVERY_ORDER_PAISE,
  deliveryRadiusKm = DEFAULT_DELIVERY_RADIUS_KM,
}: CartProviderProps) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = React.useState(false);

  const addToCart = (item: MenuItem, quantity: number = 1, notes: string = '') => {
    if (item.is_sold_out) return;

    commitCart((previous) => {
      const existingIndex = previous.findIndex((cartItem) => cartItem.item.id === item.id);

      if (existingIndex > -1) {
        const updated = [...previous];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          notes: updated[existingIndex].notes || notes,
        };
        return updated;
      }

      return [...previous, { item, quantity, notes }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    commitCart((previous) =>
      previous.map((cartItem) =>
        cartItem.item.id === itemId ? { ...cartItem, quantity } : cartItem
      )
    );
  };

  const updateNotes = (itemId: string, notes: string) => {
    commitCart((previous) =>
      previous.map((cartItem) =>
        cartItem.item.id === itemId ? { ...cartItem, notes } : cartItem
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    commitCart((previous) => previous.filter((cartItem) => cartItem.item.id !== itemId));
  };

  const clearCart = () => {
    commitCart(() => EMPTY_CART);
  };

  const itemCount = items.reduce((sum, cartItem) => sum + cartItem.quantity, 0);

  // Single source of truth for the money maths: the same engine the server
  // uses, fed with the live delivery settings from the database.
  const totals = calculateOrderTotals({
    items: items.map((cartItem) => ({
      pricePaise: cartItem.item.price_paise,
      quantity: cartItem.quantity,
    })),
    orderType: 'delivery',
    thresholdPaise: freeDeliveryThresholdPaise,
    feePaise: configuredDeliveryFeePaise,
    minOrderPaise,
  });

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        updateNotes,
        removeFromCart,
        clearCart,
        itemCount,
        subtotalPaise: totals.subtotalPaise,
        deliveryFeePaise: totals.deliveryFeePaise,
        totalPaise: totals.totalPaise,
        freeDeliveryThresholdPaise,
        amountToFreeDeliveryPaise: totals.amountToFreeDeliveryPaise,
        minOrderPaise,
        deliveryRadiusKm,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
