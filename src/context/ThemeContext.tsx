import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ColorTokens, Spacing, Radii, Typography, MaxContentWidth, formatNaira } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  colors: ColorTokens;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  isDark: boolean;
  spacing: typeof Spacing;
  radii: typeof Radii;
  typography: typeof Typography;
  maxContentWidth: number;
  formatNaira: typeof formatNaira;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  themePreference: 'system',
  setThemePreference: () => {},
  isDark: false,
  spacing: Spacing,
  radii: Radii,
  typography: Typography,
  maxContentWidth: MaxContentWidth,
  formatNaira,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const isDark = useMemo(() => {
    if (themePreference === 'system') {
      return systemScheme === 'dark';
    }
    return themePreference === 'dark';
  }, [themePreference, systemScheme]);

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        themePreference,
        setThemePreference,
        isDark,
        spacing: Spacing,
        radii: Radii,
        typography: Typography,
        maxContentWidth: MaxContentWidth,
        formatNaira,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
