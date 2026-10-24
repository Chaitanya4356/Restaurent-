/**
 * Deterministic IST date/time formatting.
 *
 * Built from `formatToParts` rather than a single locale string so the server
 * and the browser always render identical text (no hydration mismatches).
 */
function istParts(iso: string): {
  weekday: string;
  day: string;
  month: string;
  hour: number;
  minute: number;
} | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: get('weekday'),
    day: get('day'),
    month: get('month'),
    hour: Number.parseInt(get('hour'), 10),
    minute: Number.parseInt(get('minute'), 10),
  };
}

function to12Hour(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** "Tue, 24 Oct · 7:10 PM" (IST) */
export function formatIstDateTime(iso: string): string {
  const parts = istParts(iso);
  if (!parts) return '';

  return `${parts.weekday}, ${parts.day} ${parts.month} · ${to12Hour(parts.hour, parts.minute)}`;
}

/** "7:10 PM" (IST) */
export function formatIstTime(iso: string): string {
  const parts = istParts(iso);
  if (!parts) return '';

  return to12Hour(parts.hour, parts.minute);
}

/** "Tue, 24 Oct" (IST) */
export function formatIstDate(iso: string): string {
  const parts = istParts(iso);
  if (!parts) return '';

  return `${parts.weekday}, ${parts.day} ${parts.month}`;
}
