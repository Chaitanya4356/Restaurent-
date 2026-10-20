'use client';

import React, { useState } from 'react';
import type { RestaurantSettings } from '@/types/database';
import { updateRestaurantSettings } from '@/app/actions/admin-menu';
import {
  Settings,
  Clock,
  Bike,
  Store,
  Palette,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface AdminSettingsManagerProps {
  initialSettings: RestaurantSettings;
}

export function AdminSettingsManager({ initialSettings }: AdminSettingsManagerProps) {
  const [settings, setSettings] = useState<RestaurantSettings>(initialSettings);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(initialSettings.is_accepting_orders);
  const [openingTime, setOpeningTime] = useState(initialSettings.opening_time);
  const [closingTime, setClosingTime] = useState(initialSettings.closing_time);
  const [cutoffMinutes, setCutoffMinutes] = useState(initialSettings.order_cutoff_minutes);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState(
    (initialSettings.delivery_fee_paise / 100).toString()
  );
  const [freeDeliveryThresholdRupees, setFreeDeliveryThresholdRupees] = useState(
    (initialSettings.free_delivery_threshold_paise / 100).toString()
  );
  const [minDeliveryOrderRupees, setMinDeliveryOrderRupees] = useState(
    (initialSettings.min_delivery_order_paise / 100).toString()
  );
  const [phone, setPhone] = useState(initialSettings.phone_number);
  const [address, setAddress] = useState(initialSettings.address);
  const [brandColor, setBrandColor] = useState(initialSettings.brand_color_primary);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    const payload: Partial<RestaurantSettings> = {
      is_accepting_orders: isAcceptingOrders,
      opening_time: openingTime,
      closing_time: closingTime,
      order_cutoff_minutes: parseInt(cutoffMinutes.toString(), 10) || 20,
      delivery_fee_paise: Math.round(parseFloat(deliveryFeeRupees) * 100),
      free_delivery_threshold_paise: Math.round(parseFloat(freeDeliveryThresholdRupees) * 100),
      min_delivery_order_paise: Math.round(parseFloat(minDeliveryOrderRupees) * 100),
      phone_number: phone.trim(),
      address: address.trim(),
      brand_color_primary: brandColor.trim(),
    };

    const res = await updateRestaurantSettings(payload);

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      alert('Failed to update settings: ' + res.error);
    }

    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-600" />
          <span>Restaurant Settings</span>
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Configure operating hours, order acceptance override, delivery fees, and restaurant contact information.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings successfully updated across the website!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Emergency Master Ordering Switch */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Accepting Online Orders Switch</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Toggle this switch to immediately turn online ordering on or off (e.g. during heavy kitchen rushes or holidays).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAcceptingOrders(!isAcceptingOrders)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isAcceptingOrders ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
              }`}
              role="switch"
              aria-checked={isAcceptingOrders}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isAcceptingOrders ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Current Status:{' '}
            <span className={isAcceptingOrders ? 'text-emerald-600' : 'text-rose-600'}>
              {isAcceptingOrders ? '🟢 Actively Accepting Orders' : '🔴 Online Orders Paused'}
            </span>
          </p>
        </div>

        {/* Operating Hours in Asia/Kolkata */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Operating Hours (Asia/Kolkata IST)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Opening Time (Daily)
              </label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Closing Time (Daily)
              </label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Stop Orders Before Closing (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={cutoffMinutes}
                onChange={(e) => setCutoffMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Delivery Fees & Limits */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Bike className="w-4 h-4 text-amber-600" />
            <span>Delivery Fees & Minimums (Vizag 20 km)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Flat Delivery Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={deliveryFeeRupees}
                onChange={(e) => setDeliveryFeeRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Free Delivery Above (₹)
              </label>
              <input
                type="number"
                min="0"
                value={freeDeliveryThresholdRupees}
                onChange={(e) => setFreeDeliveryThresholdRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Minimum Delivery Order (₹)
              </label>
              <input
                type="number"
                min="0"
                value={minDeliveryOrderRupees}
                onChange={(e) => setMinDeliveryOrderRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Contact Info & Dynamic Brand Color */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-600" />
            <span>Store Contact & Dynamic Branding</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Contact Phone (Click-to-Call)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Primary Brand Color (Hex)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-stone-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              Restaurant Display Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm shadow-md transition flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <span>Save & Update Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
