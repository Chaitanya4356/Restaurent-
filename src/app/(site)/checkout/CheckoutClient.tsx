'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '@/context/CartContext';
import {
  checkoutCustomerFieldsSchema,
  type CheckoutFormData,
  type CheckoutCustomerFields,
} from '@/lib/validation/checkout';
import { placeOrder } from '@/app/actions/place-order';
import {
  checkDeliveryServiceability,
  isPincodeServiceable,
  PINCODE_PATTERN,
} from '@/lib/delivery';
import { formatEta, roundEtaForDisplay, type Coordinates } from '@/lib/geo';
import dynamic from 'next/dynamic';

// Leaflet touches `window`, so the map picker is loaded on demand, client-only.
const LocationMapPicker = dynamic(() => import('@/components/LocationMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-stone-900 rounded-2xl px-6 py-4 text-sm font-semibold text-stone-600 dark:text-stone-300">
        Loading map…
      </div>
    </div>
  ),
});
import { formatPaiseToRupees } from '@/lib/utils';
import Link from 'next/link';
import {
  Bike,
  Store,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  Lock,
  QrCode,
  Banknote,
  MapPin,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

export interface CheckoutDeliveryConfig {
  allowedPincodes: string[];
  radiusKm: number;
  outlet: Coordinates | null;
  prepTimeMinutes: number;
  avgSpeedKmh: number;
}

export function CheckoutClient({ deliveryConfig }: { deliveryConfig: CheckoutDeliveryConfig }) {
  const {
    allowedPincodes,
    radiusKm,
    outlet,
    prepTimeMinutes,
    avgSpeedKmh,
  } = deliveryConfig;

  const router = useRouter();
  const {
    items,
    itemCount,
    subtotalPaise,
    deliveryFeePaise,
    freeDeliveryThresholdPaise,
    amountToFreeDeliveryPaise,
    minOrderPaise,
    deliveryRadiusKm,
    clearCart,
  } = useCart();

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutCustomerFields>({
    // The Zod schema declares defaults for preferredTime / customerNotes, so its
    // INPUT type has them optional while its OUTPUT type (CheckoutCustomerFields)
    // has them required. Cast to the output type - the values RHF hands to
    // onSubmit are always the parsed output.
    resolver: zodResolver(checkoutCustomerFieldsSchema) as unknown as Resolver<CheckoutCustomerFields>,
    defaultValues: {
      orderType: 'delivery',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      deliveryPincode: '',
      preferredTime: 'ASAP',
      customerNotes: '',
      paymentMethod: 'upi_on_delivery',
    },
  });

  const selectedPaymentMethod = watch('paymentMethod');
  const watchedPincode = watch('deliveryPincode') ?? '';
  const watchedAddress = watch('deliveryAddress') ?? '';
  const watchedLat = watch('deliveryLatitude');
  const watchedLng = watch('deliveryLongitude');

  // "Use my location" state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationUsed, setLocationUsed] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  /**
   * Applies a set of coordinates: stores them on the form, fills in the address
   * and pincode (best effort) and flips the UI into "location set" mode.
   * Shared by the GPS button and the map picker.
   */
  const applyCoordinates = async (coords: Coordinates) => {
    const latitude = Number(coords.latitude.toFixed(6));
    const longitude = Number(coords.longitude.toFixed(6));

    setValue('deliveryLatitude', latitude);
    setValue('deliveryLongitude', longitude);
    setLocationUsed(true);
    setLocationError(null);

    try {
      const res = await fetch(`/api/geo/reverse?lat=${latitude}&lng=${longitude}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as { address: string | null; postcode: string | null };
        if (data.address && !watchedAddress.trim()) {
          setValue('deliveryAddress', data.address.slice(0, 300));
        }
        if (data.postcode) {
          setValue('deliveryPincode', data.postcode);
        }
      }
    } catch {
      // Address lookup is a convenience - the customer can type it.
    }
  };

  const sharedCoordinates: Coordinates | null =
    typeof watchedLat === 'number' && typeof watchedLng === 'number'
      ? { latitude: watchedLat, longitude: watchedLng }
      : null;

  /**
   * Single source of truth for delivery eligibility - the same function the
   * server runs in placeOrder(), so the customer can never be shown one answer
   * and given another.
   */
  const serviceability = checkDeliveryServiceability({
    pincode: watchedPincode,
    coordinates: sharedCoordinates,
    allowedPincodes: allowedPincodes.map((p) => ({ pincode: p })),
    radiusKm,
    outlet,
    prepTimeMinutes,
    avgSpeedKmh,
  });

  const pincodeIsComplete = PINCODE_PATTERN.test(watchedPincode);
  const pincodeServiceable =
    serviceability.decidedBy === 'distance' ||
    !pincodeIsComplete ||
    isPincodeServiceable(watchedPincode, allowedPincodes.map((p) => ({ pincode: p })));

  /**
   * Whether delivery may be submitted.
   * Note: an *incomplete* pincode must not disable the button - the schema
   * already requires it, and the server re-checks. Only a complete pincode that
   * is not serviceable (or an out-of-range location) blocks submission.
   */
  const deliveryAllowed =
    serviceability.serviceable || (serviceability.decidedBy === 'pincode' && !pincodeIsComplete);

  const handleUseMyLocation = () => {
    setLocationError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Your browser does not support location sharing. Please type your address.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Please type your address and pincode instead.'
            : 'We could not read your location. Please type your address and pincode instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const clearLocation = () => {
    setValue('deliveryLatitude', undefined);
    setValue('deliveryLongitude', undefined);
    setLocationUsed(false);
    setLocationError(null);
  };

  // If cart is empty, show return to menu
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-400">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Your cart is empty
        </h1>
        <p className="text-sm text-stone-500">
          Please select some delicious South Indian dishes from our menu before checking out.
        </p>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Menu</span>
        </Link>
      </div>
    );
  }

  const effectiveDeliveryFeePaise = orderType === 'pickup' ? 0 : deliveryFeePaise;
  const effectiveTotalPaise = subtotalPaise + effectiveDeliveryFeePaise;

  const onSubmit = async (customerData: CheckoutCustomerFields) => {
    setIsSubmitting(true);
    setServerError(null);

    if (items.length === 0) {
      setServerError('Your cart is empty. Please add items from the menu.');
      setIsSubmitting(false);
      return;
    }

    // Assemble validated customer fields with current items from cart
    const payload: CheckoutFormData = {
      ...customerData,
      orderType,
      items: items.map((i) => ({
        menuItemId: i.item.id,
        quantity: i.quantity,
        notes: i.notes || '',
      })),
    };

    const result = await placeOrder(payload);

    if (!result.success) {
      setServerError(result.error || 'Failed to place order. Please review your details.');
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Success: clear cart and redirect to the signed live tracking URL
    clearCart();
    if (!result.trackToken) {
      // Should never happen, but never expose an untokenised tracking URL.
      router.push('/track');
      return;
    }
    router.push(`/order-confirmation/${result.orderNumber}/${result.trackToken}`);
  };

  const onFormError = (formErrors: FieldErrors<CheckoutCustomerFields>) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const el = document.getElementById(firstKey) || document.getElementsByName(firstKey)[0];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {isMapOpen && (
        <LocationMapPicker
          initial={sharedCoordinates ?? outlet}
          onConfirm={async (coords) => {
            setIsMapOpen(false);
            await applyCoordinates(coords);
          }}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* Page Title & Back Link */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Safe & Secure Checkout</span>
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Unable to complete order</h4>
            <p className="mt-0.5 text-xs">{serverError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Checkout Form (7 cols) */}
        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="lg:col-span-7 space-y-6">
          {/* Step 1: Order Type Selector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              1. Choose Fulfillment
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOrderType('delivery');
                  setValue('orderType', 'delivery');
                }}
                className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition ${
                  orderType === 'delivery'
                    ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Bike className="w-4 h-4 text-amber-600" />
                    <span>Vizag Delivery</span>
                  </div>
                  {orderType === 'delivery' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Within {deliveryRadiusKm} km • {formatPaiseToRupees(deliveryFeePaise)} (Free &gt;{' '}
                  {formatPaiseToRupees(freeDeliveryThresholdPaise)})
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('pickup');
                  setValue('orderType', 'pickup');
                }}
                className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition ${
                  orderType === 'pickup'
                    ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>Counter Pickup</span>
                  </div>
                  {orderType === 'pickup' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Siripuram Counter • Free
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Contact Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              2. Contact Information
            </h2>

            <div className="space-y-1">
              <label htmlFor="customerName" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="customerName"
                type="text"
                placeholder="e.g. Chaitanya"
                {...register('customerName')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              {errors.customerName && (
                <p className="text-xs text-rose-500 mt-1">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="customerPhone" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                10-Digit Mobile Number (+91) <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                <span className="px-3.5 py-2.5 text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-700/50 border-r border-stone-200 dark:border-stone-700 flex items-center">
                  +91
                </span>
                <input
                  id="customerPhone"
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  {...register('customerPhone')}
                  className="w-full px-3.5 py-2.5 bg-transparent text-sm focus:outline-hidden"
                />
              </div>
              {errors.customerPhone && (
                <p className="text-xs text-rose-500 mt-1">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>

          {/* Step 3: Delivery Address (Shown when Delivery selected) */}
          {orderType === 'delivery' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                  3. Delivery Address (Vizag)
                </h2>
                <span className="text-xs text-amber-600 font-medium">Within {deliveryRadiusKm} km</span>
              </div>

              <div className="space-y-1">
                <label htmlFor="deliveryAddress" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Flat/House No., Street, Landmark, Area <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="deliveryAddress"
                  rows={3}
                  placeholder="e.g. Flat 302, Sri Krishna Heights, Near Waltair Club, Siripuram, Visakhapatnam"
                  {...register('deliveryAddress')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                {errors.deliveryAddress && (
                  <p className="text-xs text-rose-500 mt-1">{errors.deliveryAddress.message}</p>
                )}
              </div>

              {/* Use my location - sets the address and unlocks distance + ETA */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 disabled:opacity-60 text-amber-900 dark:text-amber-200 font-bold text-xs transition"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Getting your location...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{locationUsed ? 'Update my location' : 'Use my current location'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Set location on map</span>
                  </button>

                  {locationUsed && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="text-[11px] font-semibold text-stone-500 hover:text-rose-600 underline"
                    >
                      Remove location
                    </button>
                  )}

                  <span className="text-[10px] text-stone-400">
                    Fills your address automatically and checks if we deliver to you
                  </span>
                </div>

                {locationError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    {locationError}
                  </p>
                )}

                {locationUsed && serviceability.distanceKm !== null && serviceability.etaMinutes !== null && (
                  <div
                    role="status"
                    className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
                      deliveryAllowed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {deliveryAllowed ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>
                      {deliveryAllowed ? (
                        <>
                          You&apos;re about <strong>{serviceability.distanceKm.toFixed(1)} km</strong>{' '}
                          away · Estimated delivery{' '}
                          <strong>{formatEta(roundEtaForDisplay(serviceability.etaMinutes))}</strong>
                        </>
                      ) : (
                        serviceability.message
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Pincode - gates our delivery service area */}              <div className="space-y-1 max-w-[12rem]">
                <label htmlFor="deliveryPincode" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Pincode <span className="text-rose-500">*</span>
                </label>
                <input
                  id="deliveryPincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="530003"
                  {...register('deliveryPincode')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setValue('deliveryPincode', digits, { shouldValidate: false });
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-stone-800 text-sm font-mono focus:outline-hidden focus:ring-2 ${
                    pincodeIsComplete && !pincodeServiceable
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-stone-200 dark:border-stone-700 focus:ring-amber-500'
                  }`}
                />
                {errors.deliveryPincode && (
                  <p className="text-xs text-rose-500 mt-1">{errors.deliveryPincode.message}</p>
                )}

                {pincodeIsComplete && !pincodeServiceable && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] flex items-start gap-2"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Sorry, we don&apos;t deliver to <strong>{watchedPincode}</strong> yet. You can
                      still order for <strong>Counter Pickup</strong>.
                    </span>
                  </div>
                )}

                {pincodeIsComplete && pincodeServiceable && allowedPincodes.length > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    ✓ We deliver to {watchedPincode}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Timing & Special Instructions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              {orderType === 'delivery' ? '4. Timing & Notes' : '3. Timing & Notes'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="preferredTime" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Preferred Time
                </label>
                <select
                  id="preferredTime"
                  {...register('preferredTime')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ASAP">As soon as possible (30-45 mins)</option>
                  <option value="In 1 hour">In about 1 hour</option>
                  <option value="In 2 hours">In about 2 hours</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="customerNotes" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Order Note (Optional)
                </label>
                <input
                  id="customerNotes"
                  type="text"
                  placeholder="e.g. Ring the bell twice"
                  {...register('customerNotes')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Step 5: Payment Method */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              {orderType === 'delivery' ? '5. Payment Method' : '4. Payment Method'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  selectedPaymentMethod === 'upi_on_delivery'
                    ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300'
                }`}
              >
                <input
                  type="radio"
                  value="upi_on_delivery"
                  {...register('paymentMethod')}
                  className="accent-amber-600"
                />
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold">Pay Online (UPI)</p>
                    <p className="text-[11px] text-stone-500">Scan our UPI QR after ordering</p>
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  selectedPaymentMethod === 'cash_on_delivery'
                    ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300'
                }`}
              >
                <input
                  type="radio"
                  value="cash_on_delivery"
                  {...register('paymentMethod')}
                  className="accent-amber-600"
                />
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold">Cash on Handoff</p>
                    <p className="text-[11px] text-stone-500">Pay cash on receipt</p>
                  </div>
                </div>
              </label>
            </div>

            {selectedPaymentMethod === 'upi_on_delivery' && (
              <p className="text-[11px] text-stone-500 flex items-start gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  You&apos;ll see our UPI QR code and UPI ID on the confirmation page, with the exact
                  amount filled in. Show the payment confirmation to our staff at handoff.
                </span>
              </p>
            )}
          </div>

          {/* Place Order CTA Button */}
          <div className="space-y-3">
            {Object.keys(errors).length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please fill in your Name, 10-digit Phone Number, and Address above.</span>
              </div>
            )}

            {serverError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                (orderType === 'delivery' && subtotalPaise < minOrderPaise) ||
                (orderType === 'delivery' && !deliveryAllowed)
              }
              className="w-full py-4 px-6 rounded-2xl bg-brand hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base shadow-xl shadow-brand/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Confirming Order with Kitchen...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirm Order • {formatPaiseToRupees(effectiveTotalPaise)}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Order Summary Sidebar (5 cols) */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Order Summary ({itemCount})
              </h3>
              <Link href="/menu" className="text-xs font-semibold text-amber-600 hover:underline">
                Edit items
              </Link>
            </div>

            {/* Itemized Snapshot */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((cartItem) => (
                <div key={cartItem.item.id} className="flex items-start justify-between text-xs gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {cartItem.quantity}x {cartItem.item.name}
                    </p>
                    {cartItem.notes && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                        Note: {cartItem.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {formatPaiseToRupees(cartItem.item.price_paise * cartItem.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Delivery fee & totals breakdown */}
            <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatPaiseToRupees(subtotalPaise)}
                </span>
              </div>

              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>
                  {orderType === 'delivery' ? `Vizag Delivery (up to ${deliveryRadiusKm} km)` : 'Counter Pickup'}
                </span>
                <span className="font-semibold">
                  {effectiveDeliveryFeePaise === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    formatPaiseToRupees(effectiveDeliveryFeePaise)
                  )}
                </span>
              </div>

              {orderType === 'delivery' && amountToFreeDeliveryPaise > 0 && (
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Add {formatPaiseToRupees(amountToFreeDeliveryPaise)} more for free delivery!
                  </span>
                </div>
              )}

              {orderType === 'delivery' && subtotalPaise < minOrderPaise && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px]">
                  ⚠️ Minimum delivery order is {formatPaiseToRupees(minOrderPaise)}.
                </div>
              )}

              <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex justify-between text-base font-black text-stone-900 dark:text-stone-100">
                <span>Total Amount</span>
                <span className="text-brand">
                  {formatPaiseToRupees(effectiveTotalPaise)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-stone-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Price snapshot verified strictly on server</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Estimated handoff in 25–40 minutes</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
