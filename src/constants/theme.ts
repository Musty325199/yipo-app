export interface ColorTokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentText: string;
  onAccent: string;
  paid: string;
  partPaid: string;
  unpaid: string;
}

export const LightColors: ColorTokens = {
  bg: '#F8FAF9',
  surface: '#FFFFFF',
  ink: '#0A1C16',
  muted: '#4E655B',
  line: '#E2E8E4',
  accent: '#F59E0B',
  accentText: '#B45309',
  onAccent: '#0A1C16',
  paid: '#10B981',
  partPaid: '#EA580C',
  unpaid: '#EF4444',
};

export const DarkColors: ColorTokens = {
  bg: '#081410',
  surface: '#0F221B',
  ink: '#F9FAFB',
  muted: '#8A9E95',
  line: '#1A3329',
  accent: '#FBBF24',
  accentText: '#FCD34D',
  onAccent: '#081410',
  paid: '#10B981',
  partPaid: '#FB923C',
  unpaid: '#F87171',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radii = {
  card: 14,
  pill: 999,
  sm: 8,
} as const;

export const Typography = {
  headingFont: 'BricolageGrotesque_700Bold',
  headingSemiBoldFont: 'BricolageGrotesque_600SemiBold',
  bodyFont: 'InstrumentSans_400Regular',
  bodyMediumFont: 'InstrumentSans_500Medium',
  bodySemiBoldFont: 'InstrumentSans_600SemiBold',
} as const;

export const MaxContentWidth = 640;

/**
 * Format an integer naira amount with commas and currency symbol.
 * Money is always stored as whole integers (naira), never floats.
 * Example: 20000 -> "₦20,000"
 */
export function formatNaira(amount: number): string {
  const integerAmount = Math.round(amount);
  return `₦${integerAmount.toLocaleString('en-NG')}`;
}
