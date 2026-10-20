export interface StoreStatus {
  isOpen: boolean;
  canAcceptOrders: boolean;
  statusText: string;
  badgeVariant: 'open' | 'closing-soon' | 'closed';
  nextOpenTime?: string;
}

/**
 * Calculates current restaurant open/closed status strictly in Asia/Kolkata timezone.
 * 
 * Rules:
 * - Opening time: 07:00:00 IST
 * - Closing time: 23:00:00 IST
 * - Order cutoff: 20 minutes before closing (22:40:00 IST)
 * - Master override: is_accepting_orders boolean
 */
export function calculateStoreStatus(
  isAcceptingOrders: boolean = true,
  openingTimeStr: string = '07:00:00',
  closingTimeStr: string = '23:00:00',
  cutoffMinutes: number = 20,
  referenceDate: Date = new Date()
): StoreStatus {
  if (!isAcceptingOrders) {
    return {
      isOpen: false,
      canAcceptOrders: false,
      statusText: 'Currently not taking orders',
      badgeVariant: 'closed',
    };
  }

  // Convert referenceDate to Asia/Kolkata time parts
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const currentMinutesFromMidnight = hour * 60 + minute;

  const [openHour, openMin] = openingTimeStr.split(':').map(Number);
  const [closeHour, closeMin] = closingTimeStr.split(':').map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  const cutoffMinutesFromMidnight = closeMinutes - cutoffMinutes;

  // Case 1: Before opening hours
  if (currentMinutesFromMidnight < openMinutes) {
    return {
      isOpen: false,
      canAcceptOrders: false,
      statusText: `Closed • Opens at 7:00 AM`,
      badgeVariant: 'closed',
      nextOpenTime: '07:00 AM',
    };
  }

  // Case 2: Past closing hours
  if (currentMinutesFromMidnight >= closeMinutes) {
    return {
      isOpen: false,
      canAcceptOrders: false,
      statusText: `Closed • Opens tomorrow at 7:00 AM`,
      badgeVariant: 'closed',
      nextOpenTime: '07:00 AM',
    };
  }

  // Case 3: Kitchen order cutoff period (22:40 to 23:00)
  if (currentMinutesFromMidnight >= cutoffMinutesFromMidnight) {
    return {
      isOpen: true,
      canAcceptOrders: false,
      statusText: 'Open for dining • Kitchen closed for new online orders',
      badgeVariant: 'closing-soon',
    };
  }

  // Case 4: Open and actively accepting online orders
  const minutesUntilCutoff = cutoffMinutesFromMidnight - currentMinutesFromMidnight;
  if (minutesUntilCutoff <= 45) {
    return {
      isOpen: true,
      canAcceptOrders: true,
      statusText: `Open • Last orders in ${minutesUntilCutoff} mins (until 10:40 PM)`,
      badgeVariant: 'closing-soon',
    };
  }

  return {
    isOpen: true,
    canAcceptOrders: true,
    statusText: 'Open Now • Accepting Orders until 10:40 PM',
    badgeVariant: 'open',
  };
}
