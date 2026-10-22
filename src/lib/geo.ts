/**
 * Geospatial helpers for delivery distance and ETA estimation.
 *
 * Phase 1 is intentionally API-free: the outlet coordinates come from settings
 * and the customer's coordinates come from their own device ("Use my location").
 * Distance is a haversine straight line, and the ETA is prep time + travel time
 * at a configurable average city speed.
 *
 * Swapping in Google's Routes API later only changes `estimateTravelMinutes` -
 * everything else (gating, display, storage) stays the same.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance between two points, in kilometres. */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Road distance estimate. Real driving distance in a city is roughly 1.3x the
 * straight line (grid streets, one-ways, the coast). Phase 2 can replace this
 * with Google's Compute Routes distance.
 */
export function estimateRoadDistanceKm(straightLineKm: number): number {
  return straightLineKm * 1.3;
}

/** Travel time in whole minutes at the configured average speed. */
export function estimateTravelMinutes(distanceKm: number, avgSpeedKmh: number): number {
  if (avgSpeedKmh <= 0) return 0;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Full delivery ETA = kitchen prep + travel.
 */
export function estimateDeliveryMinutes(params: {
  distanceKm: number;
  prepTimeMinutes: number;
  avgSpeedKmh: number;
}): number {
  const { distanceKm, prepTimeMinutes, avgSpeedKmh } = params;
  return prepTimeMinutes + estimateTravelMinutes(distanceKm, avgSpeedKmh);
}

/** Rounds an ETA to the nearest 5 minutes for customer-facing display. */
export function roundEtaForDisplay(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** "~50 min" / "~1 hr 5 min" */
export function formatEta(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `~${hours} hr` : `~${hours} hr ${rest} min`;
}

/**
 * Extracts coordinates from the many shapes a Google Maps link can take:
 *   https://www.google.com/maps/@17.7231,83.3012,15z
 *   https://maps.google.com/?q=17.7231,83.3012
 *   https://www.google.com/maps/place/.../@17.7231,83.3012,17z/data=...
 *   https://maps.app.goo.gl/...        (short links - not supported, paste the
 *                                       full URL or the plain coordinates)
 * Also accepts a bare "17.7231, 83.3012" string.
 */
export function parseCoordinates(input: string): Coordinates | null {
  const text = (input || '').trim();
  if (!text) return null;

  const patterns = [
    // !3d/!4d is the actual place marker - more precise than the map viewport
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/, // /@lat,lng,zoom
    /[?&](?:q|query|ll|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=lat,lng
    /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/, // bare pair
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const latitude = Number.parseFloat(match[1]);
      const longitude = Number.parseFloat(match[2]);

      if (isValidCoordinates({ latitude, longitude })) {
        return { latitude, longitude };
      }
    }
  }

  // Last resort: any "lat, lng" pair embedded in surrounding text
  // (e.g. "17.7231, 83.3012 Josh Restaurant, Vizag").
  const loose = text.match(/(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
  if (loose) {
    const latitude = Number.parseFloat(loose[1]);
    const longitude = Number.parseFloat(loose[2]);

    if (isValidCoordinates({ latitude, longitude })) {
      return { latitude, longitude };
    }
  }

  return null;
}

export function isValidCoordinates(coords: Coordinates | null | undefined): boolean {
  if (!coords) return false;
  const { latitude, longitude } = coords;

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
