import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { getAppSetting, setAppSetting } from './security';
import { useTheme } from '@/context/ThemeContext';

const PLUS_UNLOCKED_KEY = 'plus_unlocked';

/**
 * Check if Yípo Plus features are unlocked.
 * Defaults to true for launch edition.
 */
export async function isPlusUnlocked(): Promise<boolean> {
  const val = await getAppSetting(PLUS_UNLOCKED_KEY, 'true');
  return val !== 'false';
}

/**
 * Update Yípo Plus unlocked status in local settings.
 */
export async function setPlusUnlocked(unlocked: boolean): Promise<void> {
  await setAppSetting(PLUS_UNLOCKED_KEY, unlocked ? 'true' : 'false');
}

/**
 * Hook to access and toggle Plus status reactively.
 */
export function usePlus() {
  const [isPlus, setIsPlus] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const unlocked = await isPlusUnlocked();
    setIsPlus(unlocked);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const unlocked = await isPlusUnlocked();
      if (isMounted) {
        setIsPlus(unlocked);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePlus = async () => {
    const nextVal = !isPlus;
    await setPlusUnlocked(nextVal);
    setIsPlus(nextVal);
  };

  const setPlus = async (unlocked: boolean) => {
    await setPlusUnlocked(unlocked);
    setIsPlus(unlocked);
  };

  return { isPlus, setPlus, togglePlus, loading, refresh };
}

interface PlusBadgeProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Subtle [ PLUS ] badge adhering to theme palette and typography tokens.
 * Zero emojis, clean stroke / pill layout with high contrast.
 */
export function PlusBadge({ style }: PlusBadgeProps) {
  const { colors, typography, radii, spacing, isDark } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
          borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
          borderRadius: radii.pill,
          paddingHorizontal: spacing.xs + 2,
          paddingVertical: 2,
        },
        style,
      ]}>
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.accentText,
            fontFamily: typography.headingSemiBoldFont,
          },
        ]}>
        PLUS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
