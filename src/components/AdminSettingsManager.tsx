'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { RestaurantSettings, DeliveryPincode } from '@/types/database';
import { updateRestaurantSettings } from '@/app/actions/admin-menu';
import { addDeliveryPincode, removeDeliveryPincode } from '@/app/actions/admin-delivery';
import { parseCoordinates } from '@/lib/geo';
import { uploadPublicImage } from '@/lib/storage';
import {
  Settings,
  Clock,
  Bike,
  Store,
  Palette,
  CheckCircle,
  Loader2,
  AlertTriangle,
  QrCode,
  Upload,
  MapPin,
  Plus,
  X,
} from 'lucide-react';

interface AdminSettingsManagerProps {
  initialSettings: RestaurantSettings;
  initialPincodes?: DeliveryPincode[];
  /** false when the delivery_pincodes table has not been created yet. */
  pincodesReady?: boolean;
}

export function AdminSettingsManager({
  initialSettings,
  initialPincodes = [],
  pincodesReady = true,
}: AdminSettingsManagerProps) {
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
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(
    (initialSettings.delivery_radius_km ?? 20).toString()
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    (initialSettings.prep_time_minutes ?? 25).toString()
  );
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(
    (initialSettings.avg_speed_kmh ?? 18).toString()
  );

  // Restaurant location (drives distance gating + delivery ETA)
  const [outletLat, setOutletLat] = useState<number | null>(
    initialSettings.outlet_latitude ?? null
  );
  const [outletLng, setOutletLng] = useState<number | null>(
    initialSettings.outlet_longitude ?? null
  );
  const [outletInput, setOutletInput] = useState('');
  const [outletMessage, setOutletMessage] = useState<string | null>(null);
  const [isResolvingOutlet, setIsResolvingOutlet] = useState(false);
  const [phone, setPhone] = useState(initialSettings.phone_number);
  const [address, setAddress] = useState(initialSettings.address);
  const [brandColor, setBrandColor] = useState(initialSettings.brand_color_primary);
  const [logoUrl, setLogoUrl] = useState(initialSettings.brand_logo_url || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // UPI / online payment details
  const [upiId, setUpiId] = useState(initialSettings.upi_id || '');
  const [upiPhone, setUpiPhone] = useState(initialSettings.upi_phone || '');
  const [upiQrUrl, setUpiQrUrl] = useState(initialSettings.upi_qr_url || '');
  const [upiPayeeName, setUpiPayeeName] = useState(
    initialSettings.upi_payee_name || initialSettings.restaurant_name
  );
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  // Delivery serviceability allow-list
  const [pincodes, setPincodes] = useState<DeliveryPincode[]>(initialPincodes);
  const [newPincode, setNewPincode] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [isSavingPincode, setIsSavingPincode] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const result = await uploadPublicImage(file, 'brand');
    setIsUploadingLogo(false);
    e.target.value = '';

    if (result.error || !result.url) {
      alert('Logo upload failed: ' + (result.error || 'unknown error'));
      return;
    }

    setLogoUrl(result.url);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    const result = await uploadPublicImage(file, 'settings');

    if (result.error || !result.url) {
      alert('QR upload failed: ' + (result.error || 'unknown error'));
    } else {
      setUpiQrUrl(result.url);
    }

    setIsUploadingQr(false);
    e.target.value = '';
  };

  const handleAddPincode = async () => {
    setPincodeMessage(null);

    const pincode = newPincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setPincodeMessage('Enter a valid 6-digit pincode (e.g. 530003).');
      return;
    }

    setIsSavingPincode(true);
    const res = await addDeliveryPincode({ pincode, areaName: newAreaName.trim() || undefined });
    setIsSavingPincode(false);

    if (!res.success) {
      setPincodeMessage(res.error || 'Failed to add pincode.');
      return;
    }

    setPincodes((prev) => {
      const withoutDuplicate = prev.filter((p) => p.pincode !== pincode);
      return [...withoutDuplicate, { pincode, area_name: newAreaName.trim() || null, is_active: true }].sort(
        (a, b) => a.pincode.localeCompare(b.pincode)
      );
    });
    setNewPincode('');
    setNewAreaName('');
    setPincodeMessage(`Added ${pincode}.`);
  };

  const handleRemovePincode = async (pincode: string) => {
    setPincodeMessage(null);
    const previous = pincodes;
    setPincodes((prev) => prev.filter((p) => p.pincode !== pincode));

    const res = await removeDeliveryPincode(pincode);
    if (!res.success) {
      setPincodes(previous);
      setPincodeMessage(res.error || 'Failed to remove pincode.');
    }
  };

  const applyOutletInput = async () => {
    const raw = outletInput.trim();

    if (!raw) {
      setOutletMessage('Paste your Google Maps link (or the coordinates) first, then press Set Location.');
      return;
    }

    // 1. Long link or plain "lat, lng" - no network needed
    const direct = parseCoordinates(raw);
    if (direct) {
      setOutletLat(Number(direct.latitude.toFixed(6)));
      setOutletLng(Number(direct.longitude.toFixed(6)));
      setOutletMessage(
        `Location set to ${direct.latitude.toFixed(5)}, ${direct.longitude.toFixed(5)}. Press Save to apply.`
      );
      setOutletInput('');
      return;
    }

    // 2. Short links (maps.app.goo.gl/…) need resolving server-side
    if (/^https?:\/\//i.test(raw)) {
      setIsResolvingOutlet(true);
      setOutletMessage('Reading that link…');

      try {
        const res = await fetch('/api/geo/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        });
        const data = (await res.json()) as { latitude?: number; longitude?: number; error?: string };

        if (res.ok && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setOutletLat(Number(data.latitude.toFixed(6)));
          setOutletLng(Number(data.longitude.toFixed(6)));
          setOutletMessage(
            `Location set to ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}. Press Save to apply.`
          );
          setOutletInput('');
        } else {
          setOutletMessage(data.error || 'Could not read that link.');
        }
      } catch {
        setOutletMessage('Could not read that link. Please paste the coordinates instead.');
      } finally {
        setIsResolvingOutlet(false);
      }

      return;
    }

    setOutletMessage(
      'Could not read that. Paste a Google Maps link (short or long), or right-click your restaurant on the map and paste the numbers, e.g. 17.7231, 83.3012.'
    );
  };

  const handleSave = async (e: React.FormEvent) => {    e.preventDefault();
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
      delivery_radius_km: Math.min(100, Math.max(1, parseInt(deliveryRadiusKm, 10) || 20)),
      prep_time_minutes: Math.min(240, Math.max(0, parseInt(prepTimeMinutes, 10) || 25)),
      avg_speed_kmh: Math.min(120, Math.max(1, parseInt(avgSpeedKmh, 10) || 18)),
      outlet_latitude: outletLat,
      outlet_longitude: outletLng,
      phone_number: phone.trim(),
      address: address.trim(),
      brand_color_primary: brandColor.trim(),
      brand_logo_url: logoUrl.trim() || null,
      upi_id: upiId.trim() || null,
      upi_phone: upiPhone.trim() || null,
      upi_qr_url: upiQrUrl.trim() || null,
      upi_payee_name: upiPayeeName.trim() || null,
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
            <span>Delivery Fees, Minimums & Radius</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
              <p className="text-[10px] text-stone-500">
                Shown to customers across the site. Actual delivery eligibility is decided by the
                distance below (or the pincode list).
              </p>
            </div>
          </div>

          {/* Location + timing: powers distance gating and the delivery ETA */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Kitchen Prep Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="240"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                />
                <p className="text-[10px] text-stone-500">
                  Time to cook &amp; pack a typical order, added to every delivery ETA.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Average Delivery Speed (km/h)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={avgSpeedKmh}
                  onChange={(e) => setAvgSpeedKmh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                />
                <p className="text-[10px] text-stone-500">
                  Used to turn distance into time. 18 km/h suits city traffic.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Restaurant Location (enables distance &amp; ETA)
              </label>

              {outletLat !== null && outletLng !== null ? (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  ✓ {outletLat}, {outletLng} ·{' '}
                  <a
                    href={`https://www.google.com/maps?q=${outletLat},${outletLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    view on map
                  </a>
                </p>
              ) : (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                  ⚠️ Not set — customers can&apos;t use &quot;Use my location&quot; distance checks and no
                  delivery ETA is shown. The pincode list is used instead.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={outletInput}
                  onChange={(e) => setOutletInput(e.target.value)}
                  placeholder="Paste your Google Maps link, or 17.7231, 83.3012"
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => void applyOutletInput()}
                  disabled={isResolvingOutlet}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs transition inline-flex items-center justify-center gap-1.5"
                >
                  {isResolvingOutlet && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isResolvingOutlet ? 'Reading…' : 'Set Location'}</span>
                </button>
              </div>

              <p className="text-[10px] text-stone-500">
                Short links (<code className="font-mono">maps.app.goo.gl/…</code>) and full Google Maps URLs both
                work. Easiest: right-click your restaurant on Google Maps, click the numbers that appear
                (e.g. <code className="font-mono">17.7231, 83.3012</code>), paste here, then press{' '}
                <strong>Save</strong>.
              </p>

              {outletMessage && (
                <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                  {outletMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Serviceability (pincode allow-list) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Delivery Pincodes We Serve</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Customers entering a pincode that is <strong>not</strong> in this list cannot place a
              delivery order - they are offered Counter Pickup instead. Pickup orders are never
              restricted.
            </p>
            {!pincodesReady ? (
              <p className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-[11px] font-semibold">
                ⚠️ <strong>Database setup required.</strong> Open Supabase → SQL Editor and run{' '}
                <code className="font-mono">supabase/migrations/RUN_ALL_PENDING.sql</code> once. Until
                then pincodes cannot be saved (delivery stays open to every address).
              </p>
            ) : pincodes.length === 0 ? (
              <p className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-semibold">
                ⚠️ No pincodes configured yet - delivery is currently open to <strong>every</strong>{' '}
                address. Add your serviceable pincodes below to restrict it.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ Delivery restricted to {pincodes.length} pincode{pincodes.length === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {/* Add */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Pincode e.g. 530003"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddPincode();
                }
              }}
              className="w-full sm:w-40 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Area name (optional) e.g. Siripuram"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => void handleAddPincode()}
              disabled={isSavingPincode}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
            >
              {isSavingPincode ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add</span>
            </button>
          </div>

          {pincodeMessage && (
            <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
              {pincodeMessage}
            </p>
          )}

          {/* List */}
          {pincodes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {pincodes.map((entry) => (
                <span
                  key={entry.pincode}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs"
                >
                  <span className="font-mono font-bold text-stone-800 dark:text-stone-100">
                    {entry.pincode}
                  </span>
                  {entry.area_name && (
                    <span className="text-stone-500 dark:text-stone-400">{entry.area_name}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemovePincode(entry.pincode)}
                    className="p-0.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    aria-label={`Remove pincode ${entry.pincode}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
                Restaurant Logo
              </label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Current logo"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-xl object-cover bg-black border border-stone-200 dark:border-stone-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400">
                    <Store className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="block text-[10px] font-semibold text-rose-600 hover:underline"
                    >
                      Remove logo
                    </button>
                  )}
                  <p className="text-[10px] text-stone-500">
                    Square PNG works best (e.g. 512×512). Shown in the header and footer. Press Save to apply.
                  </p>
                </div>
              </div>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* UPI / Online Payment */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>UPI Payment (Scan &amp; Pay)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Shown to every customer who chooses <strong>Pay Online (UPI)</strong> instead of cash.
              They scan your QR or tap the UPI link after placing the order, then staff mark the
              order paid from the Kitchen dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Payee Name (shown to customer)
              </label>
              <input
                type="text"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                placeholder="Josh Restaurant"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="joshrestaurant@okhdfcbank"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono focus:outline-hidden"
              />
              <p className="text-[10px] text-stone-500">
                Powers the &quot;Open UPI app&quot; button with the exact amount pre-filled.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                UPI Phone Number (optional)
              </label>
              <input
                type="text"
                value={upiPhone}
                onChange={(e) => setUpiPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
              />
              <p className="text-[10px] text-stone-500">
                The mobile number linked to the UPI account, shown under the QR.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                UPI QR Code Image
              </label>
              <div className="flex items-center gap-3">
                {upiQrUrl ? (
                  <Image
                    src={upiQrUrl}
                    alt="Current UPI QR code"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-lg border border-stone-200 dark:border-stone-700 object-contain bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400">
                    <QrCode className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingQr ? 'Uploading...' : 'Upload QR'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleQrUpload}
                      disabled={isUploadingQr}
                      className="hidden"
                    />
                  </label>
                  {upiQrUrl && (
                    <button
                      type="button"
                      onClick={() => setUpiQrUrl('')}
                      className="block text-[10px] font-semibold text-rose-600 hover:underline"
                    >
                      Remove QR
                    </button>
                  )}
                  <p className="text-[10px] text-stone-500">
                    Download the QR from your UPI app (GPay / PhonePe / Paytm / bank app) and upload
                    it here. PNG or JPG, max 5 MB.
                  </p>
                </div>
              </div>
            </div>
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
