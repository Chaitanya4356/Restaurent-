import { describe, it, expect } from 'vitest';
import { calculateStoreStatus } from '../opening-hours';

describe('calculateStoreStatus - IST Operating Hours & Cutoff Logic', () => {
  // Helper to construct a Date that corresponds to a specific hour/minute in Asia/Kolkata
  // Asia/Kolkata is UTC+5:30 (330 minutes ahead of UTC)
  function createIstDate(year: number, monthIndex: number, day: number, istHour: number, istMinute: number): Date {
    // Convert IST to UTC: UTC = IST - 5 hours 30 mins
    const utcDate = new Date(Date.UTC(year, monthIndex, day, istHour, istMinute, 0));
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() - 330);
    return utcDate;
  }

  it('marks restaurant closed before 07:00 AM IST', () => {
    // 06:15 AM IST
    const date = createIstDate(2026, 9, 20, 6, 15);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(false);
    expect(status.canAcceptOrders).toBe(false);
    expect(status.badgeVariant).toBe('closed');
    expect(status.statusText).toContain('Opens at 7:00 AM');
    expect(status.nextOpenTime).toBe('7:00 AM');
  });

  it('marks restaurant open and accepting orders during lunch hours (13:30 IST)', () => {
    // 01:30 PM IST
    const date = createIstDate(2026, 9, 20, 13, 30);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(true);
    expect(status.canAcceptOrders).toBe(true);
    expect(status.badgeVariant).toBe('open');
    expect(status.statusText).toContain('Accepting Orders until 10:40 PM');
  });

  it('shows closing-soon badge within 45 minutes of cutoff (e.g. 22:15 IST)', () => {
    // 22:15 IST is 25 mins before cutoff (22:40)
    const date = createIstDate(2026, 9, 20, 22, 15);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(true);
    expect(status.canAcceptOrders).toBe(true);
    expect(status.badgeVariant).toBe('closing-soon');
    expect(status.statusText).toContain('Last orders in 25 mins (until 10:40 PM)');
  });

  it('stops accepting online orders at the 20-minute cutoff (22:40 IST to 23:00 IST)', () => {
    // 22:45 IST: Kitchen is closed for new orders, but restaurant is open for dining
    const date = createIstDate(2026, 9, 20, 22, 45);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(true);
    expect(status.canAcceptOrders).toBe(false);
    expect(status.badgeVariant).toBe('closing-soon');
    expect(status.statusText).toBe('Open for dining • Kitchen closed for new online orders');
  });

  it('marks restaurant completely closed after 23:00 IST', () => {
    // 23:15 IST
    const date = createIstDate(2026, 9, 20, 23, 15);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(false);
    expect(status.canAcceptOrders).toBe(false);
    expect(status.badgeVariant).toBe('closed');
    expect(status.statusText).toContain('Opens tomorrow at 7:00 AM');
  });

  it('marks restaurant closed past midnight (01:00 AM IST)', () => {
    // 01:00 AM IST
    const date = createIstDate(2026, 9, 20, 1, 0);
    const status = calculateStoreStatus(true, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(false);
    expect(status.canAcceptOrders).toBe(false);
    expect(status.badgeVariant).toBe('closed');
  });

  it('respects emergency master switch isAcceptingOrders = false even during open hours', () => {
    // 12:00 PM IST (normally peak lunch hours)
    const date = createIstDate(2026, 9, 20, 12, 0);
    const status = calculateStoreStatus(false, '07:00:00', '23:00:00', 20, date);

    expect(status.isOpen).toBe(false);
    expect(status.canAcceptOrders).toBe(false);
    expect(status.badgeVariant).toBe('closed');
    expect(status.statusText).toBe('Currently not taking orders');
  });
});
