/**
 * Date utilities with strict Africa/Lagos timezone support.
 * All dates are stored as ISO 8601 strings in SQLite.
 */

const LAGOS_TIMEZONE = 'Africa/Lagos';

export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Format an ISO string to a human readable date in Africa/Lagos timezone.
 * Example: "24 Oct 2026"
 */
export function formatLagosDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: LAGOS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO string with time in Africa/Lagos timezone.
 * Example: "24 Oct 2026, 2:30 PM"
 */
export function formatLagosDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: LAGOS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Calculate subsequent due dates starting from a start date.
 */
export function calculateDueDates(
  startDateISO: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  totalRounds: number
): string[] {
  const dates: string[] = [];
  const start = new Date(startDateISO);

  for (let i = 0; i < totalRounds; i++) {
    const d = new Date(start);
    if (frequency === 'daily') {
      d.setDate(d.getDate() + i);
    } else if (frequency === 'weekly') {
      d.setDate(d.getDate() + i * 7);
    } else if (frequency === 'monthly') {
      d.setMonth(d.getMonth() + i);
    }
    dates.push(d.toISOString());
  }

  return dates;
}
