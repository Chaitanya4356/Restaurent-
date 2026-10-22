import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Address search for the checkout map picker.
 *
 * Uses OpenStreetMap's Nominatim (free, no API key). Their usage policy allows
 * a single search per user action but not "search-as-you-type" autocomplete,
 * which is why the UI has an explicit Find button.
 *
 * Server-side so we can send the identifying User-Agent they require.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'JoshRestaurantOrdering/1.0 (+https://joshrestaurent.vercel.app)';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') || '').trim();

  if (query.length < 3) {
    return NextResponse.json({ error: 'Please type at least 3 characters' }, { status: 400 });
  }

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    // Bias results to India so "Siripuram" doesn't resolve to another country.
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=in&addressdetails=0&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Address search is unavailable right now.' }, { status: 502 });
    }

    const results = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'No match found. Try a nearby landmark, area or street name.' },
        { status: 404 }
      );
    }

    const best = results[0];
    const latitude = Number.parseFloat(best.lat || '');
    const longitude = Number.parseFloat(best.lon || '');

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'No match found.' }, { status: 404 });
    }

    const payload = {
      latitude,
      longitude,
      label: best.display_name || query,
    };

    cache.set(key, { at: Date.now(), payload });

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.warn('Address search failed:', e);
    return NextResponse.json({ error: 'Address search is unavailable right now.' }, { status: 502 });
  }
}
