'use client';

import React, { useState } from 'react';
import type { Promotion } from '@/lib/promotions/types';
import {
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion,
  type PromotionInput,
} from '@/app/actions/admin-promotions';
import { formatPaiseToRupees } from '@/lib/utils';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Power,
  Loader2,
  X,
  AlertTriangle,
  TicketPercent,
  Sparkles,
} from 'lucide-react';

interface AdminOffersManagerProps {
  initialPromotions: Promotion[];
  offersReady?: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FormState {
  name: string;
  description: string;
  code: string;
  discount_type: 'percent' | 'flat' | 'free_delivery';
  discount_value: string;
  max_discount_rupees: string;
  min_order_rupees: string;
  order_type: 'any' | 'delivery' | 'pickup';
  is_auto_apply: boolean;
  starts_at: string;
  ends_at: string;
  days: number[];
  time_from: string;
  time_to: string;
  total_limit: string;
  per_customer_limit: string;
  budget_cap_rupees: string;
  priority: string;
  is_active: boolean;
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  code: '',
  discount_type: 'percent',
  discount_value: '10',
  max_discount_rupees: '',
  min_order_rupees: '',
  order_type: 'any',
  is_auto_apply: false,
  starts_at: '',
  ends_at: '',
  days: [],
  time_from: '',
  time_to: '',
  total_limit: '0',
  per_customer_limit: '0',
  budget_cap_rupees: '',
  priority: '100',
  is_active: true,
});

/** ISO string -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formFromPromotion(promotion: Promotion): FormState {
  return {
    name: promotion.name,
    description: promotion.description ?? '',
    code: promotion.code ?? '',
    discount_type: promotion.discount_type,
    discount_value:
      promotion.discount_type === 'free_delivery' ? '0' : String(promotion.discount_value),
    max_discount_rupees: promotion.max_discount_paise
      ? String(promotion.max_discount_paise / 100)
      : '',
    min_order_rupees: promotion.min_order_paise ? String(promotion.min_order_paise / 100) : '',
    order_type: promotion.order_type,
    is_auto_apply: promotion.is_auto_apply,
    starts_at: toLocalInput(promotion.starts_at),
    ends_at: toLocalInput(promotion.ends_at),
    days: promotion.days_of_week ?? [],
    time_from: promotion.time_from?.slice(0, 5) ?? '',
    time_to: promotion.time_to?.slice(0, 5) ?? '',
    total_limit: String(promotion.total_redemption_limit ?? 0),
    per_customer_limit: String(promotion.per_customer_limit ?? 0),
    budget_cap_rupees: promotion.budget_cap_paise ? String(promotion.budget_cap_paise / 100) : '',
    priority: String(promotion.priority ?? 100),
    is_active: promotion.is_active,
  };
}

function rupeesToPaise(value: string): number {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function describe(promotion: Promotion): string {
  const base =
    promotion.discount_type === 'percent'
      ? `${promotion.discount_value}% off`
      : promotion.discount_type === 'flat'
      ? `${formatPaiseToRupees(promotion.discount_value)} off`
      : 'Free delivery';

  const cap =
    promotion.discount_type === 'percent' && promotion.max_discount_paise
      ? ` (max ${formatPaiseToRupees(promotion.max_discount_paise)})`
      : '';
  const min =
    promotion.min_order_paise > 0
      ? ` on orders above ${formatPaiseToRupees(promotion.min_order_paise)}`
      : '';
  const type = promotion.order_type !== 'any' ? ` · ${promotion.order_type} only` : '';

  return `${base}${cap}${min}${type}`;
}

export function AdminOffersManager({
  initialPromotions,
  offersReady = true,
}: AdminOffersManagerProps) {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setMessage(null);
    setIsModalOpen(true);
  };

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion);
    setForm(formFromPromotion(promotion));
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const input: PromotionInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      discount_type: form.discount_type,
      discount_value:
        form.discount_type === 'free_delivery'
          ? 1
          : form.discount_type === 'percent'
          ? Math.round(Number.parseFloat(form.discount_value) || 0)
          : rupeesToPaise(form.discount_value),
      max_discount_paise: form.max_discount_rupees
        ? rupeesToPaise(form.max_discount_rupees)
        : null,
      min_order_paise: rupeesToPaise(form.min_order_rupees),
      order_type: form.order_type,
      is_auto_apply: form.code.trim() ? false : form.is_auto_apply,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      days_of_week: form.days.length > 0 ? form.days : null,
      time_from: form.time_from || null,
      time_to: form.time_to || null,
      total_redemption_limit: Math.max(0, Number.parseInt(form.total_limit, 10) || 0),
      per_customer_limit: Math.max(0, Number.parseInt(form.per_customer_limit, 10) || 0),
      budget_cap_paise: form.budget_cap_rupees ? rupeesToPaise(form.budget_cap_rupees) : null,
      priority: Math.max(0, Number.parseInt(form.priority, 10) || 100),
      is_active: form.is_active,
    };

    const result = editing
      ? await updatePromotion(editing.id, input)
      : await createPromotion(input);

    setIsSaving(false);

    if (!result.success) {
      setMessage(result.error || 'Could not save the offer.');
      return;
    }

    setIsModalOpen(false);
    window.location.reload();
  };

  const handleToggle = async (promotion: Promotion) => {
    const next = !promotion.is_active;
    setPromotions((prev) =>
      prev.map((entry) => (entry.id === promotion.id ? { ...entry, is_active: next } : entry))
    );

    const result = await setPromotionActive(promotion.id, next);
    if (!result.success) {
      setPromotions((prev) =>
        prev.map((entry) =>
          entry.id === promotion.id ? { ...entry, is_active: promotion.is_active } : entry
        )
      );
      setMessage(result.error || 'Could not update the offer.');
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!confirm(`Delete "${promotion.name}"? This cannot be undone.`)) return;

    const previous = promotions;
    setPromotions((prev) => prev.filter((entry) => entry.id !== promotion.id));

    const result = await deletePromotion(promotion.id);
    if (!result.success) {
      setPromotions(previous);
      setMessage(result.error || 'Could not delete the offer.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <TicketPercent className="w-6 h-6 text-amber-600" />
            <span>Offers &amp; Discounts</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Automatic offers and coupon codes. Discounts are calculated on the server and applied
            across every eligible item.
          </p>
        </div>

        <button
          onClick={openCreate}
          disabled={!offersReady}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 active:scale-95 text-white font-bold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Offer</span>
        </button>
      </div>

      {!offersReady && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold">
          ⚠️ <strong>Database setup required.</strong> Open Supabase → SQL Editor and run{' '}
          <code className="font-mono">supabase/migrations/005_promotions_and_customer_accounts.sql</code>{' '}
          once. Until then offers cannot be saved.
        </div>
      )}

      {message && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* List */}
      {promotions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Tag className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">No offers yet</h3>
          <p className="text-xs text-stone-500 mt-1">
            Create your first offer — e.g. &quot;₹50 off orders above ₹500&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {promotions.map((promotion) => {
            const usageLimit = promotion.total_redemption_limit;
            const usagePct = usageLimit > 0 ? Math.min(100, (promotion.times_redeemed / usageLimit) * 100) : 0;

            return (
              <div
                key={promotion.id}
                className={`p-5 rounded-2xl border bg-white dark:bg-stone-900 shadow-xs space-y-3 ${
                  promotion.is_active
                    ? 'border-stone-200 dark:border-stone-800'
                    : 'border-stone-200 dark:border-stone-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-sm text-stone-900 dark:text-stone-100">
                      {promotion.name}
                    </h3>
                    <p className="text-[11px] text-stone-500">{describe(promotion)}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      promotion.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {promotion.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  {promotion.code ? (
                    <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-mono">
                      {promotion.code}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Automatic
                    </span>
                  )}
                  {promotion.order_type !== 'any' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                      {promotion.order_type}
                    </span>
                  )}
                  {promotion.starts_at || promotion.ends_at ? (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      Scheduled
                    </span>
                  ) : null}
                  {promotion.days_of_week?.length ? (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {promotion.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}
                    </span>
                  ) : null}
                </div>

                <div className="text-[11px] text-stone-500 space-y-1">
                  <p>
                    Used{' '}
                    <strong className="text-stone-800 dark:text-stone-200">
                      {promotion.times_redeemed}
                    </strong>{' '}
                    {usageLimit > 0 ? `of ${usageLimit}` : 'times'}
                    {promotion.per_customer_limit > 0
                      ? ` · ${promotion.per_customer_limit} per customer`
                      : ''}
                  </p>
                  <p>
                    Discount given:{' '}
                    <strong className="text-stone-800 dark:text-stone-200">
                      {formatPaiseToRupees(promotion.discount_given_paise)}
                    </strong>
                    {promotion.budget_cap_paise
                      ? ` of ${formatPaiseToRupees(promotion.budget_cap_paise)}`
                      : ''}
                  </p>
                  {usageLimit > 0 && (
                    <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${usagePct}%` }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => void handleToggle(promotion)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <Power className="w-3 h-3" />
                    {promotion.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(promotion)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(promotion)}
                    className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                {editing ? 'Edit offer' : 'New offer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Offer name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. BIG BITES — 20% off bills"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Description (shown to customers)
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Save on every bill this month"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Coupon code (optional)
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => set('code', e.target.value.toUpperCase())}
                    placeholder="Leave empty = automatic"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Type
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => set('discount_type', e.target.value as FormState['discount_type'])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  >
                    <option value="percent">Percentage off</option>
                    <option value="flat">Flat amount off</option>
                    <option value="free_delivery">Free delivery</option>
                  </select>
                </div>

                {form.discount_type !== 'free_delivery' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      {form.discount_type === 'percent' ? 'Percentage (%)' : 'Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step={form.discount_type === 'percent' ? '1' : '0.5'}
                      value={form.discount_value}
                      onChange={(e) => set('discount_value', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                    />
                  </div>
                )}

                {form.discount_type === 'percent' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      Maximum discount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.max_discount_rupees}
                      onChange={(e) => set('max_discount_rupees', e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Minimum order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_order_rupees}
                    onChange={(e) => set('min_order_rupees', e.target.value)}
                    placeholder="e.g. 499"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Applies to
                  </label>
                  <select
                    value={form.order_type}
                    onChange={(e) => set('order_type', e.target.value as FormState['order_type'])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  >
                    <option value="any">All orders</option>
                    <option value="delivery">Delivery only</option>
                    <option value="pickup">Pickup only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Total redemptions (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.total_limit}
                    onChange={(e) => set('total_limit', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Per customer (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.per_customer_limit}
                    onChange={(e) => set('per_customer_limit', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                  <p className="text-[10px] text-stone-500">
                    Soft limit: matched on phone number or signed-in account.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Discount budget (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.budget_cap_rupees}
                    onChange={(e) => set('budget_cap_rupees', e.target.value)}
                    placeholder="Auto-pauses when spent"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Starts (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => set('starts_at', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    Ends (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => set('ends_at', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Happy hours */}
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 space-y-2">
                <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Happy hours (optional)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((label, index) => {
                    const checked = form.days.includes(index);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          set(
                            'days',
                            checked ? form.days.filter((d) => d !== index) : [...form.days, index]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          checked
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={form.time_from}
                    onChange={(e) => set('time_from', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  />
                  <span className="text-xs text-stone-500">to</span>
                  <input
                    type="time"
                    value={form.time_to}
                    onChange={(e) => set('time_to', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={form.is_auto_apply}
                    disabled={!!form.code.trim()}
                    onChange={(e) => set('is_auto_apply', e.target.checked)}
                    className="accent-amber-600"
                  />
                  Apply automatically (no code)
                </label>

                <label className="inline-flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => set('is_active', e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Active
                </label>
              </div>

              {message && (
                <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] font-semibold">
                  {message}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editing ? 'Save changes' : 'Create offer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
