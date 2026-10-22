import { describe, it, expect } from 'vitest';
import {
  estimateDeliveryMinutes,
  estimateRoadDistanceKm,
  estimateTravelMinutes,
  formatEta,
  haversineKm,
  isValidCoordinates,
  parseCoordinates,
  roundEtaForDisplay,
} from '@/lib/geo';
import { checkDeliveryServiceability } from '@/lib/delivery';

// Vizag city centre (approximately Siripuram)
const OUTLET = { latitude: 17.7231, longitude: 83.3012 };

/** Builds a point roughly `km` north of the outlet (1 deg lat ≈ 111.32 km). */
function pointNorthKm(km: number) {
  return { latitude: OUTLET.latitude + km / 111.32, longitude: OUTLET.longitude };
}

describe('geospatial helpers', () => {
  it('measures a known distance', () => {
    const distance = haversineKm(OUTLET, pointNorthKm(10));
    expect(distance).toBeGreaterThan(9.9);
    expect(distance).toBeLessThan(10.1);
  });

  it('is symmetric', () => {
    const a = pointNorthKm(4);
    expect(haversineKm(OUTLET, a)).toBeCloseTo(haversineKm(a, OUTLET), 6);
  });

  it('converts straight-line distance to a road estimate', () => {
    expect(estimateRoadDistanceKm(10)).toBeCloseTo(13, 5);
  });

  it('converts distance and speed into travel minutes', () => {
    // 10 km at 18 km/h = 33.3 min -> 34
    expect(estimateTravelMinutes(10, 18)).toBe(34);
    expect(estimateTravelMinutes(0, 18)).toBe(0);
    expect(estimateTravelMinutes(10, 0)).toBe(0);
  });

  it('adds kitchen prep time to the travel time', () => {
    expect(estimateDeliveryMinutes({ distanceKm: 10, prepTimeMinutes: 25, avgSpeedKmh: 18 })).toBe(59);
  });

  it('rounds ETAs to five minutes for display', () => {
    expect(roundEtaForDisplay(59)).toBe(60);
    expect(roundEtaForDisplay(41)).toBe(40);
    expect(roundEtaForDisplay(1)).toBe(5);
  });

  it('formats ETAs for humans', () => {
    expect(formatEta(45)).toBe('~45 min');
    expect(formatEta(60)).toBe('~1 hr');
    expect(formatEta(65)).toBe('~1 hr 5 min');
  });

  it('parses coordinates from Google Maps links and bare pairs', () => {
    expect(parseCoordinates('https://www.google.com/maps/@17.7231,83.3012,15z')).toEqual(OUTLET);
    expect(parseCoordinates('https://maps.google.com/?q=17.7231,83.3012')).toEqual(OUTLET);
    expect(parseCoordinates('17.7231, 83.3012')).toEqual(OUTLET);
    expect(parseCoordinates('  17.7231 ,83.3012  ')).toEqual(OUTLET);
  });

  it('rejects unusable location input', () => {
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(parseCoordinates('999,999')).toBeNull();
  });

  it('validates coordinate ranges', () => {
    expect(isValidCoordinates(OUTLET)).toBe(true);
    expect(isValidCoordinates(null)).toBe(false);
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
  });
});

describe('delivery serviceability', () => {
  const base = {
    allowedPincodes: [] as Array<{ pincode: string }>,
    radiusKm: 20,
    outlet: OUTLET,
    prepTimeMinutes: 25,
    avgSpeedKmh: 18,
  };

  it('accepts a customer inside the radius and returns an ETA', () => {
    const result = checkDeliveryServiceability({
      ...base,
      coordinates: pointNorthKm(5),
      pincode: '530003',
    });

    expect(result.serviceable).toBe(true);
    expect(result.decidedBy).toBe('distance');
    expect(result.distanceKm).toBeGreaterThan(6);
    expect(result.etaMinutes).toBeGreaterThan(25);
  });

  it('rejects a customer outside the radius with a helpful message', () => {
    const result = checkDeliveryServiceability({
      ...base,
      coordinates: pointNorthKm(30),
      pincode: '530003',
    });

    expect(result.serviceable).toBe(false);
    expect(result.decidedBy).toBe('distance');
    expect(result.message).toMatch(/outside our 20 km delivery area/i);
    expect(result.message).toMatch(/Counter Pickup/i);
  });

  it('prefers exact distance over the pincode list', () => {
    // Pincode is NOT on the list, but the customer is well within the radius
    const result = checkDeliveryServiceability({
      ...base,
      allowedPincodes: [{ pincode: '999999' }],
      coordinates: pointNorthKm(2),
      pincode: '530003',
    });

    expect(result.serviceable).toBe(true);
    expect(result.decidedBy).toBe('distance');
  });

  it('falls back to the pincode list when no location is shared', () => {
    const allowed = checkDeliveryServiceability({
      ...base,
      allowedPincodes: [{ pincode: '530003' }],
      coordinates: null,
      pincode: '530003',
    });
    expect(allowed.serviceable).toBe(true);
    expect(allowed.decidedBy).toBe('pincode');
    expect(allowed.etaMinutes).toBeNull();

    const blocked = checkDeliveryServiceability({
      ...base,
      allowedPincodes: [{ pincode: '530003' }],
      coordinates: null,
      pincode: '110001',
    });
    expect(blocked.serviceable).toBe(false);
    expect(blocked.message).toMatch(/pincode 110001/);
  });

  it('stays open when nothing is configured at all', () => {
    const result = checkDeliveryServiceability({
      ...base,
      outlet: null,
      allowedPincodes: [],
      coordinates: null,
      pincode: null,
    });

    expect(result.serviceable).toBe(true);
    expect(result.decidedBy).toBe('unconfigured');
  });

  it('ignores a shared location when the outlet has not been set', () => {
    const result = checkDeliveryServiceability({
      ...base,
      outlet: null,
      allowedPincodes: [{ pincode: '530003' }],
      coordinates: pointNorthKm(50),
      pincode: '530003',
    });

    expect(result.decidedBy).toBe('pincode');
    expect(result.serviceable).toBe(true);
  });
});
