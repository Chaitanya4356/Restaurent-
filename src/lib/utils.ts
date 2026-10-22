import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional CSS class names with tailwind-merge to prevent collisions.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Postgres `time` value (e.g. "07:00:00") into a 12-hour label
 * ("7:00 AM"). Deterministic - no locale/timezone surprises between server
 * and client renders.
 */
export function formatTimeTo12h(time: string): string {
  const [rawHour = '0', rawMinute = '0'] = time.split(':');
  const hour = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Returns the "HH:MM:SS" time `minutes` before `time`, wrapping within a day.
 * Used to derive the online-order cutoff from closing time + cutoff buffer.
 */
export function minusMinutesFromTime(time: string, minutes: number): string {
  const [rawHour = '0', rawMinute = '0'] = time.split(':');
  const totalMinutes =
    (Number.parseInt(rawHour, 10) * 60 + Number.parseInt(rawMinute, 10) - minutes + 1440) % 1440;

  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minute = String(totalMinutes % 60).padStart(2, '0');

  return `${hour}:${minute}:00`;
}

/**
 * Formats integer paise into Indian Rupee (INR) display string.
 * Example: 24000 paise -> "₹240" or "₹240.50"
 */
export function formatPaiseToRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(rupees);
}
