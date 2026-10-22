import { NextRequest, NextResponse } from 'next/server';
import { parseCoordinates } from '@/lib/geo';

export const dynamic = 'force-dynamic';

/**
 * Resolves a pasted Google Maps link into coordinates.
 *
 * Short links (maps.app.goo.gl/…, goo.gl/maps/…) are what the Google Maps app
 * produces when you tap Share, and they contain no coordinates — they must be
 * followed to their final URL first. Long links and bare "lat, lng" pairs are
 * handled without any network call.
 *
 * This runs server-side so the customer/owner IP is not exposed to Google from
 * the browser and so redirects can be followed reliably.
 */
export async function POST(req: NextRequest) {
  let url = '';

  try {
    const body = (await req.json()) as { url?: string };
    url = (body.url || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: 'No link provided' }, { status: 400 });
  }

  // 1. Already contains coordinates (long link or bare pair)?
  const direct = parseCoordinates(url);
  if (direct) {
    return NextResponse.json(direct);
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Not a link or coordinate pair' }, { status: 400 });
  }

  // Only follow Google Maps links - never an arbitrary URL.
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return NextResponse.json({ error: 'That is not a valid URL' }, { status: 400 });
  }

  const isGoogleMaps =
    /(^|\.)google\.[a-z.]+$/.test(hostname) ||
    /(^|\.)goo\.gl$/.test(hostname) ||
    /(^|\.)googleusercontent\.com$/.test(hostname);

  if (!isGoogleMaps) {
    return NextResponse.json(
      { error: 'Please paste a Google Maps link (or type the coordinates directly).' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        // Google serves a lighter page to non-browser agents; either way the
        // coordinates appear in the final URL or in the HTML.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    // 2. Coordinates in the final (redirected) URL
    const fromFinalUrl = parseCoordinates(res.url);
    if (fromFinalUrl) {
      return NextResponse.json(fromFinalUrl);
    }

    // 3. Coordinates somewhere in the HTML payload
    const html = await res.text();
    const fromHtml = parseCoordinates(html);
    if (fromHtml) {
      return NextResponse.json(fromHtml);
    }

    return NextResponse.json(
      {
        error:
          'Could not find coordinates in that link. Open the location on Google Maps, right-click the exact spot and click the numbers that appear, then paste them here.',
      },
      { status: 422 }
    );
  } catch (e) {
    console.warn('Failed to resolve maps link:', e);
    return NextResponse.json(
      { error: 'Could not open that link. Please paste the coordinates instead.' },
      { status: 502 }
    );
  }
}
