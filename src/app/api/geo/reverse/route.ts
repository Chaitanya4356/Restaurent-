import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Reverse geocoding for the checkout "Use my location" button.
 *
 * Uses OpenStreetMap's Nominatim because Phase 1 must work with no API key and
 * no billing account. Volume here is tiny (one call per customer tap), which
 * fits their usage policy. Phase 2 can swap this for Google's Geocoding API
 * without touching the client.
 *
 * The call is made server-side so we can send the identifying User-Agent that
 * Nominatim requires, and so the customer's IP is not exposed to a third party
 * from the browser.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'JoshRestaurantOrdering/1.0 (+https://joshrestaurent.vercel.app)';

/** Nominatim allows ~1 request/second; a tiny cache also avoids repeat lookups. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: ReverseGeocodeResult }>();

interface ReverseGeocodeResult {
  address: string | null;
  postcode: string | null;
}

function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function composeAddress(parts: Record<string, string> | undefined, displayName: string): string {
  if (!parts) return displayName;

  const segments = [
    parts.house_number && parts.road ? `${parts.house_number} ${parts.road}` : parts.road,
    parts.neighbourhood || parts.suburb || parts.residential,
    parts.city || parts.town || parts.village || parts.county,
    parts.state_district && parts.state_district !== parts.city ? undefined : undefined,
  ].filter(Boolean) as string[];

  const joined = segments.join(', ');
  return joined.length > 8 ? joined : displayName;
}

export async function GET(req: NextRequest) {
  const latParam = req.nextUrl.searchParams.get('lat');
  const lngParam = req.nextUrl.searchParams.get('lng');

  const latitude = Number.parseFloat(latParam ?? '');
  const longitude = Number.parseFloat(lngParam ?? '');

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('Reverse geocode failed:', res.status);
      return NextResponse.json({ address: null, postcode: null }, { status: 200 });
    }

    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };

    const payload: ReverseGeocodeResult = {
      address: data.display_name ? composeAddress(data.address, data.display_name) : null,
      postcode: data.address?.postcode?.replace(/\D/g, '').slice(0, 6) || null,
    };

    cache.set(key, { at: Date.now(), payload });

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.warn('Reverse geocode error:', e);
    // Never block checkout on a third-party lookup - the customer can type it.
    return NextResponse.json({ address: null, postcode: null }, { status: 200 });
  }
}
