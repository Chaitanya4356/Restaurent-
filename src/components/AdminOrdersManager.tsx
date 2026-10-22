'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Order, OrderItem, OrderStatus } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { updateOrderStatus, updateOrderPaymentStatus } from '@/app/actions/admin-orders';
import { formatPaiseToRupees } from '@/lib/utils';
import { playOrderChime } from '@/lib/audio-chime';
import {
  ChefHat,
  Volume2,
  VolumeX,
  Phone,
  Bike,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  RefreshCw,
  BellRing,
  Navigation,
} from 'lucide-react';

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface AdminOrdersManagerProps {
  initialOrders: OrderWithItems[];
}

export function AdminOrdersManager({ initialOrders }: AdminOrdersManagerProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to Supabase Realtime changes on orders
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (e) {
      console.warn('Realtime client not available:', e);
      return;
    }

    const channel = supabase
      .channel('admin-orders-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          if (isSoundEnabled) {
            playOrderChime();
          }
          setOrders((prev) => [{ ...newOrder, items: [] }, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [isSoundEnabled]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length,
      new: orders.filter((o) => o.status === 'new').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') {
      return orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    }
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    await updateOrderStatus(orderId, newStatus);
  };

  const handlePaymentToggle = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status: 'paid' } : o))
    );
    await updateOrderPaymentStatus(orderId, 'paid');
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Audio Chime Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-600" />
            <span>Live Kitchen Orders</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time kitchen display screen with live status controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Alert Toggle */}
          <button
            onClick={() => {
              setIsSoundEnabled(!isSoundEnabled);
              if (!isSoundEnabled) playOrderChime();
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              isSoundEnabled
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'
            }`}
          >
            {isSoundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>Audio Alerts ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-stone-400" />
                <span>Audio Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 dark:border-stone-800 no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span>Active Orders</span>
          <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center text-[10px]">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'new'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span className={counts.new > 0 ? 'animate-pulse text-amber-500' : ''}>●</span>
          <span>New Orders</span>
          {counts.new > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
              {counts.new}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preparing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'preparing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span>Cooking</span>
          <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] flex items-center justify-center">
            {counts.preparing}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'ready'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span>Ready / Out</span>
          <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] flex items-center justify-center">
            {counts.ready}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span>Completed</span>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
            activeTab === 'cancelled'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
          }`}
        >
          <span>Cancelled</span>
        </button>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6">
          <CheckCircle2 className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            No orders in this view
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            New customer orders will appear here automatically with a sound chime.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const isNew = order.status === 'new';

            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isNew
                    ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2.5">
                    <div>
                      <span className="font-mono text-sm font-black text-stone-900 dark:text-stone-100 block">
                        #{order.order_number}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          order.order_type === 'delivery'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {order.order_type}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          order.status === 'new'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : order.status === 'preparing'
                            ? 'bg-blue-500 text-white'
                            : order.status === 'ready'
                            ? 'bg-purple-500 text-white'
                            : order.status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-stone-900 dark:text-stone-100">
                      {order.customer_name}
                    </p>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex items-center gap-1 text-amber-600 font-semibold hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+91 {order.customer_phone}</span>
                    </a>
                    {order.delivery_address && (
                      <p className="text-stone-500 text-[11px] pt-0.5 leading-relaxed">
                        📍 {order.delivery_address}
                      </p>
                    )}

                    {/* Distance / ETA / navigation for the driver */}
                    {(order.delivery_distance_km != null || order.delivery_latitude != null) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {order.delivery_distance_km != null && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold">
                            {Number(order.delivery_distance_km).toFixed(1)} km
                          </span>
                        )}
                        {order.estimated_delivery_minutes != null && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            ETA {order.estimated_delivery_minutes} min
                          </span>
                        )}
                        {order.delivery_latitude != null && order.delivery_longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-[10px] font-bold hover:border-amber-500 transition"
                          >
                            <Navigation className="w-3 h-3 text-amber-600" />
                            <span>Navigate</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dishes Ordered */}
                  <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3 space-y-1.5 text-xs">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            {it.quantity}x {it.item_name_snapshot}
                          </span>
                          {it.item_notes && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 italic">
                              ({it.item_notes})
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-400 italic text-[11px]">
                        Items loaded with order receipt
                      </p>
                    )}

                    {order.customer_notes && (
                      <div className="mt-2 pt-1.5 border-t border-stone-200 dark:border-stone-700 text-[11px] text-amber-800 dark:text-amber-200">
                        <strong>Kitchen Note:</strong> {order.customer_notes}
                      </div>
                    )}
                  </div>

                  {/* Financials & Payment Status */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                        {formatPaiseToRupees(order.total_paise)}
                      </span>
                      <span className="text-[10px] text-stone-400 block capitalize">
                        {order.payment_method === 'upi_on_delivery' ? 'UPI QR' : 'Cash'}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePaymentToggle(order.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                        order.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {order.payment_status === 'paid' ? '✓ Paid' : 'Mark as Paid'}
                    </button>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-2">
                  {order.status === 'new' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      👨‍🍳 Accept & Cook
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'ready')}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      📦 Mark Ready / Dispatch
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'completed')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      ✅ Complete Order
                    </button>
                  )}

                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'cancelled')}
                      className="py-2 px-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-bold transition"
                      title="Cancel Order"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
