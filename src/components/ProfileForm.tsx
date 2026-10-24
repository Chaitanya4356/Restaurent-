'use client';

import React, { useState } from 'react';
import { updateCustomerProfile } from '@/app/actions/customer-profile';
import { CheckCircle2, Loader2, Save } from 'lucide-react';

interface ProfileFormProps {
  initialName: string;
  initialPhone: string;
  initialAddress: string;
}

export function ProfileForm({ initialName, initialPhone, initialAddress }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateCustomerProfile({
      fullName,
      phone: phone.replace(/\D/g, '').slice(0, 10),
      defaultAddress: address,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(result.error || 'Could not save your details.');
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="profileName" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
          Full name
        </label>
        <input
          id="profileName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Ram Sri"
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="profilePhone" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
          Mobile number
        </label>
        <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
          <span className="px-3.5 py-2.5 text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-700/50 border-r border-stone-200 dark:border-stone-700 flex items-center">
            +91
          </span>
          <input
            id="profilePhone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            className="w-full px-3.5 py-2.5 bg-transparent text-sm focus:outline-hidden"
          />
        </div>
        <p className="text-[10px] text-stone-500">Used to pre-fill checkout and to call you about your order.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="profileAddress" className="block text-xs font-bold text-stone-700 dark:text-stone-300">
          Default delivery address
        </label>
        <textarea
          id="profileAddress"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Flat/House no., street, landmark, area, pincode"
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        />
        <p className="text-[10px] text-stone-500">Saved for next time — checkout will start with this address.</p>
      </div>

      {error && (
        <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold text-xs shadow-md transition"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save details</span>
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
