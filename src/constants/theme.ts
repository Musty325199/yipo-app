export interface ColorTokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  paid: string;
  unpaid: string;
}

export const LightColors: ColorTokens = {
  bg: '#F4EEE0',
  surface: '#FFFFFF',
  ink: '#10241E',
  muted: '#5E6B64',
  line: '#E3DAC6',
  accent: '#F0B429',
  paid: '#2FA36B',
  unpaid: '#E4572E',
};

export const DarkColors: ColorTokens = {
  bg: '#0C1A16',
  surface: '#14271F',
  ink: '#F4EEE0',
  muted: '#9AA89F',
  line: '#213A30',
  accent: '#F0B429',
  paid: '#3DBE80',
  unpaid: '#F26B45',
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
