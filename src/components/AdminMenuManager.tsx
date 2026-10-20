'use client';

import React, { useState } from 'react';
import type { Category, MenuItem } from '@/types/database';
import { toggleSoldOut, upsertMenuItem, deleteMenuItem } from '@/app/actions/admin-menu';
import { formatPaiseToRupees } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  Upload,
  Loader2,
  Utensils,
  X,
} from 'lucide-react';

interface AdminMenuManagerProps {
  initialCategories: Category[];
  initialItems: MenuItem[];
}

export function AdminMenuManager({
  initialCategories,
  initialItems,
}: AdminMenuManagerProps) {
  const [categories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [dietaryType, setDietaryType] = useState<'veg' | 'non-veg'>('veg');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPriceRupees('');
    setDietaryType('veg');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.category_id);
    setDescription(item.description || '');
    setPriceRupees((item.price_paise / 100).toString());
    setDietaryType(item.dietary_type);
    setImageUrl(item.image_url || '');
    setIsModalOpen(true);
  };

  const handleToggleSoldOut = async (item: MenuItem) => {
    const updatedStatus = !item.is_sold_out;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_sold_out: updatedStatus } : i))
    );
    await toggleSoldOut(item.id, updatedStatus);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this dish from the menu?')) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await deleteMenuItem(itemId);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `dish-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dish-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message);
        setIsUploadingPhoto(false);
        return;
      }

      const { data } = supabase.storage.from('dish-photos').getPublicUrl(filePath);
      if (data?.publicUrl) {
        setImageUrl(data.publicUrl);
      }
    } catch (err) {
      alert('Error uploading file');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rupees = parseFloat(priceRupees);
    if (isNaN(rupees) || rupees <= 0) {
      alert('Please enter a valid price in Rupees');
      return;
    }

    setIsSubmitting(true);
    const pricePaise = Math.round(rupees * 100);

    const payload = {
      ...(editingItem ? { id: editingItem.id } : {}),
      name: name.trim(),
      category_id: categoryId,
      description: description.trim() || null,
      price_paise: pricePaise,
      dietary_type: dietaryType,
      image_url: imageUrl.trim() || null,
      is_sold_out: editingItem?.is_sold_out ?? false,
      is_active: true,
    };

    const res = await upsertMenuItem(payload);
    if (!res.success) {
      alert('Failed to save dish: ' + res.error);
      setIsSubmitting(false);
      return;
    }

    // Refresh local list
    if (editingItem) {
      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...payload } : i))
      );
    } else {
      setItems((prev) => [
        {
          ...payload,
          id: `temp-${Date.now()}`,
          display_order: 99,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as MenuItem,
        ...prev,
      ]);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-amber-600" />
            <span>Menu & Dish Manager</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage your dishes, adjust prices, upload photos, and toggle sold-out availability.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Categories Sections */}
      {categories.map((category) => {
        const categoryDishes = items.filter((i) => i.category_id === category.id);

        return (
          <div
            key={category.id}
            className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                {category.name} ({categoryDishes.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryDishes.map((dish) => (
                <div
                  key={dish.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    dish.is_sold_out
                      ? 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 opacity-80'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[9px] font-bold ${
                          dish.dietary_type === 'veg'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-rose-600 text-rose-600'
                        }`}
                      >
                        ●
                      </span>

                      {/* 1-Click Sold Out Toggle Button */}
                      <button
                        onClick={() => handleToggleSoldOut(dish)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                          dish.is_sold_out
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        title="Click to toggle availability"
                      >
                        {dish.is_sold_out ? (
                          <>
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>Sold Out</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Available</span>
                          </>
                        )}
                      </button>
                    </div>

                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                      {dish.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                      {formatPaiseToRupees(dish.price_paise)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(dish)}
                        className="p-1.5 text-stone-500 hover:text-amber-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="Edit Dish"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(dish.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                {editingItem ? 'Edit Dish' : 'Add New Dish to Menu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Dosa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 240"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Dietary Preference *
                </label>
                <div className="flex gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dietary"
                      value="veg"
                      checked={dietaryType === 'veg'}
                      onChange={() => setDietaryType('veg')}
                      className="accent-emerald-600"
                    />
                    <span>🟢 Vegetarian</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dietary"
                      value="non-veg"
                      checked={dietaryType === 'non-veg'}
                      onChange={() => setDietaryType('non-veg')}
                      className="accent-rose-600"
                    />
                    <span>🔴 Non-Vegetarian</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation style..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Photo Upload to Supabase Storage */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Dish Photo (Upload to dish-photos bucket)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  {isUploadingPhoto && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
                </div>
                {imageUrl && (
                  <p className="text-[10px] text-emerald-600 truncate mt-1">
                    ✓ Photo attached: {imageUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Save Dish</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
