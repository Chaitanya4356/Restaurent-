'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { MenuItem } from '@/types/database';

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
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CART_STORAGE_KEY = 'josh_restaurant_cart_v1';
const DELIVERY_FEE_PAISE = 4000; // ₹40.00
const FREE_DELIVERY_THRESHOLD_PAISE = 50000; // ₹500.00
const MIN_ORDER_PAISE = 10000; // ₹100.00

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
  }, [items, isInitialized]);

  const addToCart = (item: MenuItem, quantity: number = 1, notes: string = '') => {
    if (item.is_sold_out) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.item.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        if (notes && !updated[existingIndex].notes) {
          updated[existingIndex].notes = notes;
        }
        return updated;
      }
      return [...prev, { item, quantity, notes }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, quantity } : ci))
    );
  };

  const updateNotes = (itemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, notes } : ci))
    );
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.item.price_paise * item.quantity,
    0
  );

  const deliveryFeePaise =
    subtotalPaise === 0 || subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE
      ? 0
      : DELIVERY_FEE_PAISE;

  const totalPaise = subtotalPaise + deliveryFeePaise;
  const amountToFreeDeliveryPaise = Math.max(
    0,
    FREE_DELIVERY_THRESHOLD_PAISE - subtotalPaise
  );

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
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        freeDeliveryThresholdPaise: FREE_DELIVERY_THRESHOLD_PAISE,
        amountToFreeDeliveryPaise,
        minOrderPaise: MIN_ORDER_PAISE,
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
