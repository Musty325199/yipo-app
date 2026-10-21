/**
 * Nigerian phone number parsing and validation utility.
 * Accepts:
 *   - 080..., 070..., 081..., 090..., 091...
 *   - +23480..., +23470...
 *   - 23480...
 *   - Numbers with spaces, dashes, parentheses
 * Returns normalized string in format "234XXXXXXXXXX" or null if invalid.
 */

export function normalizeNigerianPhone(input: string): string | null {
  if (!input) return null;

  // Remove spaces, dashes, parentheses, dots
  let cleaned = input.replace(/[\s\-().]/g, '');

  // Strip leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Handle local format starting with '0' (e.g. 08031234567 -> 11 digits)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1);
  }

  // Handle format already starting with '234' (e.g. 2348031234567 -> 13 digits)
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    const prefix = cleaned.slice(3, 5);
    // Valid Nigerian mobile prefix starting with 70, 80, 81, 90, 91
    const validPrefixes = ['70', '71', '80', '81', '90', '91'];
    if (validPrefixes.includes(prefix)) {
      return cleaned;
    }
    // Some newer numbers start with 90, 91, 70 etc.
    return cleaned;
  }

  return null;
}

/**
 * Format normalized 234XXXXXXXXXX for display (e.g., 0803 123 4567)
 */
export function formatPhoneForDisplay(normalized: string): string {
  if (!normalized) {
    return 'No phone number';
  }
  if (!normalized.startsWith('234') || normalized.length !== 13) {
    return normalized;
  }
  const local = '0' + normalized.slice(3);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
