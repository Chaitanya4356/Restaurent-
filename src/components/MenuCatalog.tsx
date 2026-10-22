'use client';

import React, { useState, useMemo } from 'react';
import type { Category, MenuItem } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { DishImage } from '@/components/DishImage';
import { formatPaiseToRupees } from '@/lib/utils';
import { Search, Plus, Minus, Check, ShoppingBag, ArrowRight, Ban, Utensils } from 'lucide-react';

interface MenuCatalogProps {
  categories: Category[];
  items: MenuItem[];
  isAcceptingOrders?: boolean;
}

export function MenuCatalog({
  categories,
  items,
  isAcceptingOrders = true,
}: MenuCatalogProps) {
  const {
    items: cartItems,
    addToCart,
    updateQuantity,
    itemCount,
    subtotalPaise,
    setIsCartDrawerOpen,
  } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map cart items by ID for O(1) lookup
  const cartItemMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((ci) => map.set(ci.item.id, ci.quantity));
    return map;
  }, [cartItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
        return false;
      }

      // Dietary filter
      if (dietaryFilter !== 'all' && item.dietary_type !== dietaryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, selectedCategory, dietaryFilter, searchQuery]);

  // Group filtered items by category
  const groupedCategories = useMemo(() => {
    const activeCategories =
      selectedCategory === 'all'
        ? categories
        : categories.filter((c) => c.id === selectedCategory);

    return activeCategories
      .map((cat) => ({
        category: cat,
        dishes: filteredItems.filter((i) => i.category_id === cat.id),
      }))
      .filter((group) => group.dishes.length > 0);
  }, [categories, filteredItems, selectedCategory]);

  return (
    <div className="space-y-6 pb-20">
      {/* Kitchen paused notice (driven by restaurant_settings.is_accepting_orders) */}
      {!isAcceptingOrders && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm font-semibold flex items-start gap-3"
        >
          <Ban className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Online ordering is paused right now</p>
            <p className="text-xs font-medium mt-0.5">
              You can browse the menu, but orders cannot be placed at the moment. Please call the
              restaurant or check back shortly.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md py-3 border-b border-stone-200 dark:border-stone-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search Masala Dosa, Biryani, Coffee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm shadow-xs"
            aria-label="Search dishes"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Veg / Non-Veg Toggle */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
            <button
              onClick={() => setDietaryFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                dietaryFilter === 'all'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietaryFilter('veg')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                dietaryFilter === 'veg'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs'
                  : 'text-stone-500 hover:text-emerald-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Veg
            </button>
            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-xs'
                  : 'text-stone-500 hover:text-rose-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              Non-Veg
            </button>
          </div>
        </div>
      </div>

      {/* Dishes by Category */}
      {groupedCategories.length === 0 ? (
        <div className="text-center py-16 px-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
          <Utensils className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
            No dishes found matching your search
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Try resetting your search query or selecting a different dietary filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDietaryFilter('all');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        groupedCategories.map(({ category, dishes }) => (
          <section key={category.id} className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                {category.name}
              </h2>
              <span className="text-xs font-semibold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                {dishes.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dishes.map((dish) => {
                const qtyInCart = cartItemMap.get(dish.id) || 0;

                return (
                  <div
                    key={dish.id}
                    className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      dish.is_sold_out
                        ? 'bg-stone-50/70 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800/60 opacity-75'
                        : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700/50 shadow-xs hover:shadow-md'
                    }`}
                  >
                    <div>
                      <DishImage
                        src={dish.image_url}
                        alt={dish.name}
                        sizes="(min-width: 768px) 45vw, 100vw"
                        className={`w-full aspect-[16/10] rounded-xl mb-3 ${
                          dish.is_sold_out ? 'grayscale' : ''
                        }`}
                      />

                      {/* Dietary indicator & Sold-out tag */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[9px] font-bold ${
                              dish.dietary_type === 'veg'
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-rose-600 text-rose-600'
                            }`}
                            title={dish.dietary_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                          >
                            ●
                          </span>
                          <span className="text-[11px] font-medium text-stone-400 capitalize">
                            {dish.dietary_type}
                          </span>
                        </div>

                        {dish.is_sold_out && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold tracking-wide uppercase">
                            <Ban className="w-3 h-3 text-rose-500" />
                            Sold Out
                          </span>
                        )}
                      </div>

                      {/* Dish Title & Description */}
                      <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                        {dish.name}
                      </h3>
                      {dish.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                          {dish.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Price & Action */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-lg font-black text-stone-900 dark:text-stone-100">
                          {formatPaiseToRupees(dish.price_paise)}
                        </span>
                      </div>

                      {/* Add Button or Quantity Selector */}
                      {!isAcceptingOrders ? (
                        <button
                          disabled
                          aria-disabled="true"
                          className="px-4 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 text-xs font-bold cursor-not-allowed border border-stone-200 dark:border-stone-700"
                          title="Online ordering is currently paused by the restaurant"
                        >
                          Ordering Paused
                        </button>
                      ) : dish.is_sold_out ? (
                        <button
                          disabled
                          aria-disabled="true"
                          className="px-4 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 text-xs font-bold cursor-not-allowed border border-stone-200 dark:border-stone-700"
                        >
                          Sold Out
                        </button>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl p-1 shadow-xs">
                          <button
                            onClick={() => updateQuantity(dish.id, qtyInCart - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold transition"
                            aria-label={`Decrease ${dish.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black w-5 text-center text-amber-900 dark:text-amber-100">
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => updateQuantity(dish.id, qtyInCart + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-dark font-bold transition"
                            aria-label={`Increase ${dish.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(dish, 1)}
                          className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-dark active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-1.5"
                          aria-label={`Add ${dish.name} to order`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Sticky Mobile Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 sm:hidden">
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="w-full bg-gradient-to-r from-brand to-brand-dark text-white p-3.5 rounded-2xl shadow-xl shadow-brand/30 flex items-center justify-between font-bold text-sm active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white text-amber-700 flex items-center justify-center text-xs font-black">
                {itemCount}
              </span>
              <span>{formatPaiseToRupees(subtotalPaise)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>View Order</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
