'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Search, X, Check } from 'lucide-react';
import type { Coordinates } from '@/lib/geo';

interface LocationMapPickerProps {
  /** Where to centre the map initially. */
  initial: Coordinates | null;
  /** Used when nothing is known yet (falls back to Vizag city centre). */
  onConfirm: (coords: Coordinates, label?: string) => void;
  onClose: () => void;
}

interface LeafletMapLike {
  remove: () => void;
  setView: (latlng: [number, number], zoom: number) => void;
}

interface LeafletMarkerLike {
  setLatLng: (latlng: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
}

const FALLBACK_CENTRE: Coordinates = { latitude: 17.7231, longitude: 83.3012 };

/**
 * Interactive map picker so a customer can set their delivery point manually
 * (drag the pin / tap the map / search an area) instead of sharing GPS.
 *
 * Uses Leaflet with OpenStreetMap tiles: no API key, no billing account.
 * Leaflet is imported dynamically inside the effect because it touches `window`.
 */
export default function LocationMapPicker({ initial, onConfirm, onClose }: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);
  const markerRef = useRef<LeafletMarkerLike | null>(null);

  const [picked, setPicked] = useState<Coordinates>(initial ?? FALLBACK_CENTRE);
  const [isReady, setIsReady] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const centre = initial ?? FALLBACK_CENTRE;

      const map = L.map(containerRef.current, {
        center: [centre.latitude, centre.longitude],
        zoom: initial ? 16 : 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([centre.latitude, centre.longitude], { draggable: true }).addTo(map);

      const syncFromMarker = () => {
        const { lat, lng } = marker.getLatLng();
        setPicked({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
      };

      marker.on('dragend', syncFromMarker);
      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([event.latlng.lat, event.latlng.lng]);
        syncFromMarker();
      });

      mapRef.current = map as unknown as LeafletMapLike;
      markerRef.current = marker as unknown as LeafletMarkerLike;
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveTo = (coords: Coordinates) => {
    mapRef.current?.setView([coords.latitude, coords.longitude], 16);
    markerRef.current?.setLatLng([coords.latitude, coords.longitude]);
    setPicked(coords);
  };

  const handleSearch = async () => {
    const text = query.trim();
    if (text.length < 3) {
      setSearchMessage('Type at least 3 characters (e.g. Siripuram, MVP Colony).');
      return;
    }

    setIsSearching(true);
    setSearchMessage(null);

    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(text)}`, { cache: 'no-store' });
      const data = (await res.json()) as {
        latitude?: number;
        longitude?: number;
        label?: string;
        error?: string;
      };

      if (res.ok && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        moveTo({ latitude: data.latitude, longitude: data.longitude });
        setSearchMessage('Found it — drag the pin to your exact door if needed.');
      } else {
        setSearchMessage(data.error || 'No match found.');
      }
    } catch {
      setSearchMessage('Address search is unavailable. Drag the pin on the map instead.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Set your delivery location on the map"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Set your delivery location
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-2 border-b border-stone-200 dark:border-stone-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="Search your area, street or landmark (e.g. Siripuram, MVP Colony)"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 text-white font-bold text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Find</span>
            </button>
          </div>
          {searchMessage && (
            <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">{searchMessage}</p>
          )}
        </div>

        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-stone-100 dark:bg-stone-800">
          <div ref={containerRef} className="absolute inset-0 z-0" />
          {!isReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading map…
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 border-t border-stone-200 dark:border-stone-800">
          <p className="text-[11px] text-stone-500">
            Drag the pin or tap the map to mark your exact door. Chosen point:{' '}
            <span className="font-mono font-bold text-stone-700 dark:text-stone-200">
              {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}
            </span>
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(picked)}
              disabled={!isReady}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use this location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
